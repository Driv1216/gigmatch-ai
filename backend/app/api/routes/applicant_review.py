"""Client-owned applicant inbox, detail, history, and review actions."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, ConfigDict

from app.config import settings
from app.core.auth import (
    AuthVerifier,
    InvalidTokenError,
    MissingTokenError,
    SupabaseAuthVerifier,
    extract_bearer_token,
)
from app.matching.semantic import (
    EmbeddingProvider,
    SemanticRankingUnavailableError,
    SentenceTransformerEmbeddingProvider,
)
from app.marketplace.applicant_review import (
    build_applicant_detail,
    build_applicant_list,
    build_version_history,
)
from app.marketplace.applicant_review_contracts import (
    ApplicantStatus,
    ApplicantView,
    NotSelectedReviewRequest,
    ReopenReviewRequest,
    ReviewDecisionRequest,
    ShortlistReviewRequest,
)
from app.marketplace.applicant_review_data_access import (
    ApplicantReviewRepository,
    MarketplaceWriteError,
    SupabaseApplicantReviewRepository,
)
from app.marketplace.ranking import SemanticUnavailableReason

router = APIRouter()


class StrictResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ApplicantListResponse(StrictResponse):
    gig: dict[str, Any]
    counts: dict[str, int]
    ranking_context: dict[str, Any]
    ranking_generated_at: str
    items: list[dict[str, Any]]
    pagination: dict[str, int]


class ApplicantVersionResponse(StrictResponse):
    items: list[dict[str, Any]]
    pagination: dict[str, int]


def get_auth_verifier() -> AuthVerifier:
    return SupabaseAuthVerifier()


def get_applicant_review_repository() -> ApplicantReviewRepository:
    return SupabaseApplicantReviewRepository()


def get_embedding_provider() -> EmbeddingProvider:
    if not settings.embedding_model_name:
        raise SemanticRankingUnavailableError(
            SemanticUnavailableReason.EMBEDDING_PROVIDER_NOT_CONFIGURED
        )
    return SentenceTransformerEmbeddingProvider(settings.embedding_model_name)


def get_embedding_provider_factory() -> Callable[[], EmbeddingProvider]:
    return get_embedding_provider


@router.get("/gigs/{gig_id}/applicants", response_model=ApplicantListResponse)
def list_gig_applicants(
    gig_id: str,
    view: ApplicantView = Query(default="best_match"),
    status: ApplicantStatus = Query(default="active"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: ApplicantReviewRepository = Depends(get_applicant_review_repository),
    provider_factory: Callable[[], EmbeddingProvider] = Depends(get_embedding_provider_factory),
) -> ApplicantListResponse:
    client_id = _client_identity(authorization, auth_verifier, repository)
    if view in ("internal_shortlist", "advanced") and status != "active":
        raise HTTPException(status_code=422, detail="invalid_applicant_view")
    pool = repository.get_owned_applicant_pool(gig_id, client_id)
    if pool is None or _draft(pool.get("gig")):
        raise HTTPException(status_code=404, detail="applicant_review_not_found")
    return ApplicantListResponse.model_validate(
        build_applicant_list(
            pool,
            status=status,
            view=view,
            page=page,
            page_size=page_size,
            provider_factory=provider_factory,
        )
    )


@router.get("/gigs/{gig_id}/applicants/{application_id}", response_model=dict[str, Any])
def get_gig_applicant(
    gig_id: str,
    application_id: str,
    history_page: int = Query(default=1, ge=1),
    history_page_size: int = Query(default=10, ge=1, le=50),
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: ApplicantReviewRepository = Depends(get_applicant_review_repository),
    provider_factory: Callable[[], EmbeddingProvider] = Depends(get_embedding_provider_factory),
) -> dict[str, Any]:
    client_id = _client_identity(authorization, auth_verifier, repository)
    application = repository.get_owned_applicant(gig_id, application_id, client_id)
    if application is None or _draft(application.get("gig")):
        raise HTTPException(status_code=404, detail="applicant_review_not_found")
    return build_applicant_detail(
        application,
        provider_factory=provider_factory,
        history_page=history_page,
        history_page_size=history_page_size,
    )


@router.get(
    "/gigs/{gig_id}/applicants/{application_id}/versions",
    response_model=ApplicantVersionResponse,
)
def list_gig_applicant_versions(
    gig_id: str,
    application_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: ApplicantReviewRepository = Depends(get_applicant_review_repository),
) -> ApplicantVersionResponse:
    client_id = _client_identity(authorization, auth_verifier, repository)
    application = repository.get_owned_applicant(gig_id, application_id, client_id)
    if application is None or _draft(application.get("gig")):
        raise HTTPException(status_code=404, detail="applicant_review_not_found")
    return ApplicantVersionResponse.model_validate(
        build_version_history(application, page=page, page_size=page_size)
    )


@router.post("/applications/{application_id}/review/shortlist", response_model=dict[str, Any])
def set_application_shortlist(
    application_id: str,
    body: ShortlistReviewRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: ApplicantReviewRepository = Depends(get_applicant_review_repository),
    provider_factory: Callable[[], EmbeddingProvider] = Depends(get_embedding_provider_factory),
) -> dict[str, Any]:
    client_id, application = _owned_review_application(
        application_id, authorization, auth_verifier, repository
    )
    _review_call(
        repository,
        "review_set_shortlist",
        {
            "p_application_id": application_id,
            "p_acting_user_id": client_id,
            "p_shortlisted": body.shortlisted,
            "p_expected_shortlist_action_token": body.shortlist_action_token,
            "p_shortlist_capacity": settings.applicant_shortlist_capacity,
        },
    )
    return _reload_review_detail(repository, application, client_id, provider_factory)


@router.post("/applications/{application_id}/review/advance", response_model=dict[str, Any])
def advance_application_review(
    application_id: str,
    body: ReviewDecisionRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: ApplicantReviewRepository = Depends(get_applicant_review_repository),
    provider_factory: Callable[[], EmbeddingProvider] = Depends(get_embedding_provider_factory),
) -> dict[str, Any]:
    return _transition(
        application_id, "advance", body, {}, authorization, auth_verifier, repository, provider_factory
    )


@router.post("/applications/{application_id}/review/return", response_model=dict[str, Any])
def return_application_review(
    application_id: str,
    body: ReviewDecisionRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: ApplicantReviewRepository = Depends(get_applicant_review_repository),
    provider_factory: Callable[[], EmbeddingProvider] = Depends(get_embedding_provider_factory),
) -> dict[str, Any]:
    return _transition(
        application_id, "return", body, {}, authorization, auth_verifier, repository, provider_factory
    )


@router.post("/applications/{application_id}/review/not-selected", response_model=dict[str, Any])
def mark_application_not_selected(
    application_id: str,
    body: NotSelectedReviewRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: ApplicantReviewRepository = Depends(get_applicant_review_repository),
    provider_factory: Callable[[], EmbeddingProvider] = Depends(get_embedding_provider_factory),
) -> dict[str, Any]:
    return _transition(
        application_id,
        "not_selected",
        body,
        body.model_dump(mode="json", exclude={"review_decision_action_token"}, exclude_none=True),
        authorization,
        auth_verifier,
        repository,
        provider_factory,
    )


@router.post("/applications/{application_id}/review/reopen", response_model=dict[str, Any])
def reopen_application_review(
    application_id: str,
    body: ReopenReviewRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: ApplicantReviewRepository = Depends(get_applicant_review_repository),
    provider_factory: Callable[[], EmbeddingProvider] = Depends(get_embedding_provider_factory),
) -> dict[str, Any]:
    return _transition(
        application_id,
        "reopen",
        body,
        body.model_dump(mode="json", exclude={"review_decision_action_token"}, exclude_none=True),
        authorization,
        auth_verifier,
        repository,
        provider_factory,
    )


def _client_identity(
    authorization: str | None,
    auth_verifier: AuthVerifier,
    repository: ApplicantReviewRepository,
) -> str:
    try:
        token = extract_bearer_token(authorization)
        user_id = auth_verifier.verify_token(token).user_id
    except (MissingTokenError, InvalidTokenError) as error:
        raise HTTPException(status_code=401, detail="authentication_required") from error
    profile = repository.get_user_profile(user_id)
    if profile is None or profile.get("role") != "client":
        raise HTTPException(status_code=403, detail="client_role_required")
    return user_id


def _owned_review_application(
    application_id: str,
    authorization: str | None,
    auth_verifier: AuthVerifier,
    repository: ApplicantReviewRepository,
) -> tuple[str, dict[str, Any]]:
    client_id = _client_identity(authorization, auth_verifier, repository)
    application = repository.get_owned_review_application(application_id, client_id)
    if application is None:
        raise HTTPException(status_code=404, detail="applicant_review_not_found")
    return client_id, application


def _transition(
    application_id: str,
    action: str,
    body: ReviewDecisionRequest,
    decision: dict[str, Any],
    authorization: str | None,
    auth_verifier: AuthVerifier,
    repository: ApplicantReviewRepository,
    provider_factory: Callable[[], EmbeddingProvider],
) -> dict[str, Any]:
    client_id, application = _owned_review_application(
        application_id, authorization, auth_verifier, repository
    )
    _review_call(
        repository,
        "review_transition_application",
        {
            "p_application_id": application_id,
            "p_acting_user_id": client_id,
            "p_action": action,
            "p_expected_review_decision_action_token": body.review_decision_action_token,
            "p_advancement_capacity": settings.applicant_advancement_capacity,
            "p_decision": decision,
        },
    )
    return _reload_review_detail(repository, application, client_id, provider_factory)


def _reload_review_detail(
    repository: ApplicantReviewRepository,
    previous: dict[str, Any],
    client_id: str,
    provider_factory: Callable[[], EmbeddingProvider],
) -> dict[str, Any]:
    current = repository.get_owned_review_application(str(previous.get("id")), client_id)
    if current is None:
        raise HTTPException(status_code=500, detail="applicant_review_write_failed")
    return build_applicant_detail(current, provider_factory=provider_factory)


def _review_call(
    repository: ApplicantReviewRepository,
    function_name: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    try:
        return repository.call_review_mutation(function_name, payload)
    except MarketplaceWriteError as error:
        message = str(error)
        mapping = (
            ("M7E_APPLICANT_REVIEW_NOT_FOUND", 404, "applicant_review_not_found"),
            ("M7E_STALE_REVIEW_ACTION", 409, "stale_review_action"),
            ("M7E_SHORTLIST_CAPACITY_REACHED", 409, "shortlist_capacity_reached"),
            ("M7E_ADVANCEMENT_CAPACITY_REACHED", 409, "advancement_capacity_reached"),
            ("M7E_PENDING_SELECTION_BLOCKS_REVIEW_ACTION", 409, "pending_selection_blocks_review_action"),
            ("M7E_INVALID_NOT_SELECTED_DECISION", 422, "invalid_not_selected_decision"),
            ("M7E_INVALID_REOPEN_DECISION", 422, "invalid_reopen_decision"),
            ("M7E_REVIEW_ACTION_NOT_ALLOWED", 409, "review_action_not_allowed"),
        )
        for marker, status, detail in mapping:
            if marker in message:
                raise HTTPException(status_code=status, detail=detail) from error
        raise HTTPException(status_code=500, detail="applicant_review_write_failed") from error


def _draft(value: Any) -> bool:
    return isinstance(value, dict) and value.get("opportunity_lifecycle") == "draft"


__all__ = [
    "get_applicant_review_repository",
    "get_auth_verifier",
    "get_embedding_provider_factory",
    "router",
]
