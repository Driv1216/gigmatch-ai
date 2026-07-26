"""Participant-safe Engagement Workspace and reconsideration routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException

from app.core.auth import (
    AuthVerifier,
    InvalidTokenError,
    MissingTokenError,
    SupabaseAuthVerifier,
    extract_bearer_token,
)
from app.marketplace.engagement_contracts import (
    CancellationRequest,
    CreateReconsiderationInvitation,
    EngagementActionRequest,
    ReconsiderationActionRequest,
    ReconsiderationUpdateRequest,
    ReopenGigRequest,
)
from app.marketplace.engagement_data_access import (
    EngagementRepository,
    MarketplaceWriteError,
    SupabaseEngagementRepository,
)

router = APIRouter()


def get_auth_verifier() -> AuthVerifier:
    return SupabaseAuthVerifier()


def get_engagement_repository() -> EngagementRepository:
    return SupabaseEngagementRepository()


@router.get("/engagements", response_model=dict[str, Any])
def list_engagements(
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: EngagementRepository = Depends(get_engagement_repository),
) -> dict[str, Any]:
    return _call(repository, "engagement_list", {
        "p_acting_user_id": _identity(authorization, auth_verifier, repository)
    })


@router.get("/engagements/{engagement_id}", response_model=dict[str, Any])
def get_engagement(
    engagement_id: str,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: EngagementRepository = Depends(get_engagement_repository),
) -> dict[str, Any]:
    return _engagement_read(
        repository, "engagement_get", engagement_id,
        _identity(authorization, auth_verifier, repository),
    )


@router.get("/engagements/{engagement_id}/timeline", response_model=dict[str, Any])
def get_engagement_timeline(
    engagement_id: str,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: EngagementRepository = Depends(get_engagement_repository),
) -> dict[str, Any]:
    return _engagement_read(
        repository, "engagement_timeline", engagement_id,
        _identity(authorization, auth_verifier, repository),
    )


def _lifecycle_route(action: str):
    def endpoint(
        engagement_id: str,
        body: EngagementActionRequest,
        authorization: str | None = Header(default=None),
        auth_verifier: AuthVerifier = Depends(get_auth_verifier),
        repository: EngagementRepository = Depends(get_engagement_repository),
    ) -> dict[str, Any]:
        actor = _identity(authorization, auth_verifier, repository)
        return _call(repository, "engagement_transition", {
            "p_engagement_id": engagement_id,
            "p_acting_user_id": actor,
            "p_action": action,
            "p_expected_action_token": body.action_token,
            "p_request_id": str(body.request_id),
            "p_reason_code": None,
            "p_explanation": None,
        })

    return endpoint


router.post("/engagements/{engagement_id}/prepare-kickoff", response_model=dict[str, Any])(
    _lifecycle_route("prepare_kickoff")
)
router.post("/engagements/{engagement_id}/start-work", response_model=dict[str, Any])(
    _lifecycle_route("start_work")
)
router.post("/engagements/{engagement_id}/completion/request", response_model=dict[str, Any])(
    _lifecycle_route("request_completion")
)
router.post("/engagements/{engagement_id}/completion/confirm", response_model=dict[str, Any])(
    _lifecycle_route("confirm_completion")
)
router.post("/engagements/{engagement_id}/completion/reject", response_model=dict[str, Any])(
    _lifecycle_route("reject_completion")
)
router.post("/engagements/{engagement_id}/cancellation/withdraw", response_model=dict[str, Any])(
    _lifecycle_route("withdraw_cancellation")
)
router.post("/engagements/{engagement_id}/cancellation/acknowledge", response_model=dict[str, Any])(
    _lifecycle_route("acknowledge_cancellation")
)


@router.post("/engagements/{engagement_id}/cancellation/request", response_model=dict[str, Any])
def request_cancellation(
    engagement_id: str,
    body: CancellationRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: EngagementRepository = Depends(get_engagement_repository),
) -> dict[str, Any]:
    actor = _identity(authorization, auth_verifier, repository)
    return _call(repository, "engagement_transition", {
        "p_engagement_id": engagement_id,
        "p_acting_user_id": actor,
        "p_action": "request_cancellation",
        "p_expected_action_token": body.action_token,
        "p_request_id": str(body.request_id),
        "p_reason_code": body.reason_code,
        "p_explanation": body.explanation,
    })


@router.post("/engagements/{engagement_id}/reopen-gig", response_model=dict[str, Any])
def reopen_gig(
    engagement_id: str,
    body: ReopenGigRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: EngagementRepository = Depends(get_engagement_repository),
) -> dict[str, Any]:
    actor = _identity(authorization, auth_verifier, repository)
    return _call(repository, "engagement_reopen_gig", {
        "p_engagement_id": engagement_id,
        "p_acting_user_id": actor,
        "p_expected_reopening_token": body.reopening_token,
        "p_request_id": str(body.request_id),
    })


@router.get("/applications/{application_id}/reconsideration-context", response_model=dict[str, Any])
def reconsideration_context(
    application_id: str,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: EngagementRepository = Depends(get_engagement_repository),
) -> dict[str, Any]:
    actor = _identity(authorization, auth_verifier, repository)
    return _call(repository, "reconsideration_get_context", {
        "p_application_id": application_id, "p_acting_user_id": actor,
    })


@router.get("/reconsideration-invitations/{invitation_id}", response_model=dict[str, Any])
def get_reconsideration_invitation(
    invitation_id: str,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: EngagementRepository = Depends(get_engagement_repository),
) -> dict[str, Any]:
    actor = _identity(authorization, auth_verifier, repository)
    return _call(repository, "reconsideration_get_invitation", {
        "p_invitation_id": invitation_id, "p_acting_user_id": actor,
    })


@router.post("/applications/{application_id}/reconsideration-invitations", response_model=dict[str, Any])
def create_reconsideration_invitation(
    application_id: str,
    body: CreateReconsiderationInvitation,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: EngagementRepository = Depends(get_engagement_repository),
) -> dict[str, Any]:
    actor = _identity(authorization, auth_verifier, repository)
    return _call(repository, "reconsideration_create_invitation", {
        "p_application_id": application_id,
        "p_acting_user_id": actor,
        "p_expected_action_token": body.action_token,
        "p_request_id": str(body.request_id),
        "p_reason_code": body.reason_code,
        "p_explanation": body.explanation,
    })


@router.post("/reconsideration-invitations/{invitation_id}/cancel", response_model=dict[str, Any])
def cancel_reconsideration_invitation(
    invitation_id: str,
    body: ReconsiderationActionRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: EngagementRepository = Depends(get_engagement_repository),
) -> dict[str, Any]:
    return _invitation_action(
        invitation_id, "reconsideration_cancel_invitation", body,
        authorization, auth_verifier, repository,
    )


def _response_route(action: str):
    def endpoint(
        invitation_id: str,
        body: ReconsiderationActionRequest,
        authorization: str | None = Header(default=None),
        auth_verifier: AuthVerifier = Depends(get_auth_verifier),
        repository: EngagementRepository = Depends(get_engagement_repository),
    ) -> dict[str, Any]:
        actor = _identity(authorization, auth_verifier, repository)
        return _call(repository, "reconsideration_respond_invitation", {
            "p_invitation_id": invitation_id,
            "p_acting_user_id": actor,
            "p_action": action,
            "p_expected_action_token": body.action_token,
            "p_request_id": str(body.request_id),
            "p_snapshot": None,
        })

    return endpoint


router.post("/reconsideration-invitations/{invitation_id}/reaffirm", response_model=dict[str, Any])(
    _response_route("reaffirm")
)
router.post("/reconsideration-invitations/{invitation_id}/decline", response_model=dict[str, Any])(
    _response_route("decline")
)


@router.post("/reconsideration-invitations/{invitation_id}/submit-update", response_model=dict[str, Any])
def submit_reconsideration_update(
    invitation_id: str,
    body: ReconsiderationUpdateRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: EngagementRepository = Depends(get_engagement_repository),
) -> dict[str, Any]:
    actor = _identity(authorization, auth_verifier, repository)
    return _call(repository, "reconsideration_respond_invitation", {
        "p_invitation_id": invitation_id,
        "p_acting_user_id": actor,
        "p_action": "submit_update",
        "p_expected_action_token": body.action_token,
        "p_request_id": str(body.request_id),
        "p_snapshot": body.snapshot,
    })


def _invitation_action(
    invitation_id: str,
    function_name: str,
    body: ReconsiderationActionRequest,
    authorization: str | None,
    auth_verifier: AuthVerifier,
    repository: EngagementRepository,
) -> dict[str, Any]:
    actor = _identity(authorization, auth_verifier, repository)
    return _call(repository, function_name, {
        "p_invitation_id": invitation_id,
        "p_acting_user_id": actor,
        "p_expected_action_token": body.action_token,
        "p_request_id": str(body.request_id),
    })


def _engagement_read(
    repository: EngagementRepository,
    function_name: str,
    engagement_id: str,
    actor: str,
) -> dict[str, Any]:
    return _call(repository, function_name, {
        "p_engagement_id": engagement_id, "p_acting_user_id": actor,
    })


def _identity(
    authorization: str | None,
    auth_verifier: AuthVerifier,
    repository: EngagementRepository,
) -> str:
    try:
        token = extract_bearer_token(authorization)
        user_id = auth_verifier.verify_token(token).user_id
    except (MissingTokenError, InvalidTokenError) as error:
        raise HTTPException(status_code=401, detail="authentication_required") from error
    profile = repository.get_user_profile(user_id)
    if profile is None or profile.get("role") not in ("client", "freelancer"):
        raise HTTPException(status_code=403, detail="engagement_action_not_allowed")
    return user_id


def _call(
    repository: EngagementRepository,
    function_name: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    try:
        return repository.call_engagement(function_name, payload)
    except MarketplaceWriteError as error:
        message = str(error)
        mappings = (
            ("M7H_ENGAGEMENT_NOT_FOUND", 404, "engagement_not_found"),
            ("M7H_RECONSIDERATION_NOT_FOUND", 404, "reconsideration_not_found"),
            ("M7H_STALE_ENGAGEMENT_ACTION", 409, "stale_engagement_action"),
            ("M7H_STALE_REOPENING_ACTION", 409, "stale_reopening_action"),
            ("M7H_STALE_RECONSIDERATION_ACTION", 409, "stale_reconsideration_action"),
            ("M7H_INVALID_ENGAGEMENT_TRANSITION", 409, "invalid_engagement_transition"),
            ("M7H_SELF_RESOLUTION_NOT_ALLOWED", 409, "self_resolution_not_allowed"),
            ("M7H_SELF_ACKNOWLEDGEMENT_NOT_ALLOWED", 409, "self_acknowledgement_not_allowed"),
            ("M7H_GIG_REOPEN_NOT_ALLOWED", 409, "gig_reopen_not_allowed"),
            ("M7H_RECONSIDERATION_NOT_ALLOWED", 409, "reconsideration_not_allowed"),
            ("M7H_RECONSIDERATION_UPDATE_REQUIRED", 409, "reconsideration_update_required"),
            ("M7H_INVALID_CANCELLATION_REASON", 422, "invalid_cancellation_reason"),
            ("M7H_IDEMPOTENCY_CONFLICT", 409, "idempotency_conflict"),
        )
        for marker, status, detail in mappings:
            if marker in message:
                raise HTTPException(status_code=status, detail=detail) from error
        raise HTTPException(status_code=500, detail="engagement_write_failed") from error
