"""Application-specific structured Q&A and proposal-revision routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query

from app.config import settings
from app.core.auth import (
    AuthVerifier,
    InvalidTokenError,
    MissingTokenError,
    SupabaseAuthVerifier,
    extract_bearer_token,
)
from app.marketplace.qa import build_thread_dto
from app.marketplace.qa_contracts import (
    AdvancedQuestionRequest,
    AnswerRequest,
    ClarificationRequest,
    CorrectionRequest,
    CreateRevisionRequest,
    DeclineQuestionRequest,
    DeclineRevisionRequest,
    ReportMessageRequest,
    StopDiscussionRequest,
    SubmitRevisionUpdateRequest,
)
from app.marketplace.qa_data_access import (
    MarketplaceWriteError,
    QaRepository,
    SupabaseQaRepository,
)
from app.marketplace.qa_safety import message_safety_code

router = APIRouter()


def get_auth_verifier() -> AuthVerifier:
    return SupabaseAuthVerifier()


def get_qa_repository() -> QaRepository:
    return SupabaseQaRepository()


@router.get("/applications/{application_id}/qa", response_model=dict[str, Any])
def get_application_qa(
    application_id: str,
    before_sequence: int | None = Query(default=None, ge=2),
    limit: int = Query(default=30, ge=1, le=100),
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: QaRepository = Depends(get_qa_repository),
) -> dict[str, Any]:
    _, application = _participant_application(
        application_id,
        authorization,
        auth_verifier,
        repository,
        before_sequence=before_sequence,
        limit=limit,
    )
    return build_thread_dto(application)


@router.get("/applications/{application_id}/qa/messages", response_model=dict[str, Any])
def get_application_qa_messages(
    application_id: str,
    before_sequence: int | None = Query(default=None, ge=2),
    limit: int = Query(default=30, ge=1, le=100),
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: QaRepository = Depends(get_qa_repository),
) -> dict[str, Any]:
    return get_application_qa(
        application_id,
        before_sequence,
        limit,
        authorization,
        auth_verifier,
        repository,
    )


@router.post("/applications/{application_id}/qa/questions", response_model=dict[str, Any])
def ask_application_question(
    application_id: str,
    body: AdvancedQuestionRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: QaRepository = Depends(get_qa_repository),
) -> dict[str, Any]:
    actor_id, application = _participant_application(
        application_id, authorization, auth_verifier, repository
    )
    dto = build_thread_dto(application)
    operation = "initial_question" if dto["mode"] == "initial_clarification" else "question"
    if operation == "initial_question" and len(body.body) > 600:
        raise HTTPException(status_code=422, detail="invalid_question_response")
    _safe_message(body.body, body.other_topic_detail)
    _write_message(
        repository,
        application_id,
        actor_id,
        body.request_id,
        operation,
        topic=body.topic,
        other_topic_detail=body.other_topic_detail,
        body=body.body,
    )
    return _reload(repository, application_id, actor_id)


@router.post("/applications/{application_id}/qa/messages", response_model=dict[str, Any])
def add_application_clarification(
    application_id: str,
    body: ClarificationRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: QaRepository = Depends(get_qa_repository),
) -> dict[str, Any]:
    actor_id, _ = _participant_application(
        application_id, authorization, auth_verifier, repository
    )
    _safe_message(body.body, body.other_topic_detail)
    _write_message(
        repository,
        application_id,
        actor_id,
        body.request_id,
        "clarification",
        topic=body.topic,
        other_topic_detail=body.other_topic_detail,
        body=body.body,
    )
    return _reload(repository, application_id, actor_id)


@router.post(
    "/applications/{application_id}/qa/questions/{message_id}/answer",
    response_model=dict[str, Any],
)
def answer_application_question(
    application_id: str,
    message_id: str,
    body: AnswerRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: QaRepository = Depends(get_qa_repository),
) -> dict[str, Any]:
    actor_id, _ = _participant_application(
        application_id, authorization, auth_verifier, repository
    )
    _safe_message(body.body)
    _write_message(
        repository,
        application_id,
        actor_id,
        body.request_id,
        "answer",
        body=body.body,
        target_message_id=message_id,
    )
    return _reload(repository, application_id, actor_id)


@router.post(
    "/applications/{application_id}/qa/questions/{message_id}/decline",
    response_model=dict[str, Any],
)
def decline_application_question(
    application_id: str,
    message_id: str,
    body: DeclineQuestionRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: QaRepository = Depends(get_qa_repository),
) -> dict[str, Any]:
    actor_id, _ = _participant_application(
        application_id, authorization, auth_verifier, repository
    )
    _safe_message(body.note)
    _write_message(
        repository,
        application_id,
        actor_id,
        body.request_id,
        "decline",
        target_message_id=message_id,
        decline_reason_code=body.reason_code,
        decline_reason_detail=body.note,
    )
    return _reload(repository, application_id, actor_id)


@router.post(
    "/applications/{application_id}/qa/messages/{message_id}/correct",
    response_model=dict[str, Any],
)
def correct_application_message(
    application_id: str,
    message_id: str,
    body: CorrectionRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: QaRepository = Depends(get_qa_repository),
) -> dict[str, Any]:
    actor_id, _ = _participant_application(
        application_id, authorization, auth_verifier, repository
    )
    _safe_message(body.body)
    _write_message(
        repository,
        application_id,
        actor_id,
        body.request_id,
        "correction",
        body=body.body,
        target_message_id=message_id,
    )
    return _reload(repository, application_id, actor_id)


@router.post(
    "/applications/{application_id}/qa/messages/{message_id}/report",
    response_model=dict[str, Any],
)
def report_application_message(
    application_id: str,
    message_id: str,
    body: ReportMessageRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: QaRepository = Depends(get_qa_repository),
) -> dict[str, Any]:
    actor_id, _ = _participant_application(
        application_id, authorization, auth_verifier, repository
    )
    _call(
        repository,
        "qa_report_message",
        {
            "p_application_id": application_id,
            "p_acting_user_id": actor_id,
            "p_request_id": str(body.request_id),
            "p_message_id": message_id,
            "p_category": body.category,
            "p_detail": body.detail,
        },
    )
    return _reload(repository, application_id, actor_id)


@router.post(
    "/applications/{application_id}/qa/stop-pre-advancement",
    response_model=dict[str, Any],
)
def stop_pre_advancement_discussion(
    application_id: str,
    body: StopDiscussionRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: QaRepository = Depends(get_qa_repository),
) -> dict[str, Any]:
    actor_id, _ = _participant_application(
        application_id, authorization, auth_verifier, repository
    )
    _call(
        repository,
        "qa_stop_pre_advancement",
        {
            "p_application_id": application_id,
            "p_acting_user_id": actor_id,
            "p_request_id": str(body.request_id),
        },
    )
    return _reload(repository, application_id, actor_id)


@router.post("/applications/{application_id}/revision-requests", response_model=dict[str, Any])
def create_revision_request(
    application_id: str,
    body: CreateRevisionRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: QaRepository = Depends(get_qa_repository),
) -> dict[str, Any]:
    actor_id, _ = _participant_application(
        application_id, authorization, auth_verifier, repository
    )
    _call(
        repository,
        "revision_create_request",
        {
            "p_application_id": application_id,
            "p_acting_user_id": actor_id,
            "p_request_id": str(body.request_id),
            "p_reason_code": body.reason_code,
            "p_reason_detail": body.reason_detail,
            "p_expected_application_version_id": str(body.expected_application_version_id),
            "p_expected_material_gig_version_id": str(
                body.expected_material_gig_version_id
            ),
            "p_daily_limit": settings.qa_revision_daily_limit,
        },
    )
    return _reload(repository, application_id, actor_id)


@router.post(
    "/applications/{application_id}/revision-requests/{revision_request_id}/decline",
    response_model=dict[str, Any],
)
def decline_revision_request(
    application_id: str,
    revision_request_id: str,
    body: DeclineRevisionRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: QaRepository = Depends(get_qa_repository),
) -> dict[str, Any]:
    actor_id, _ = _participant_application(
        application_id, authorization, auth_verifier, repository
    )
    _call(
        repository,
        "revision_decline_request",
        {
            "p_application_id": application_id,
            "p_revision_request_id": revision_request_id,
            "p_acting_user_id": actor_id,
            "p_request_id": str(body.request_id),
            "p_reason_code": body.reason_code,
            "p_reason_detail": body.reason_detail,
        },
    )
    return _reload(repository, application_id, actor_id)


@router.post(
    "/applications/{application_id}/revision-requests/{revision_request_id}/submit-update",
    response_model=dict[str, Any],
)
def submit_revision_update(
    application_id: str,
    revision_request_id: str,
    body: SubmitRevisionUpdateRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: QaRepository = Depends(get_qa_repository),
) -> dict[str, Any]:
    actor_id, _ = _participant_application(
        application_id, authorization, auth_verifier, repository
    )
    _call(
        repository,
        "revision_submit_update",
        {
            "p_application_id": application_id,
            "p_revision_request_id": revision_request_id,
            "p_acting_user_id": actor_id,
            "p_request_id": str(body.request_id),
            "p_expected_application_version_token": body.expected_application_version_token,
            "p_snapshot": body.snapshot.model_dump(mode="json"),
        },
    )
    return _reload(repository, application_id, actor_id)


def _participant_application(
    application_id: str,
    authorization: str | None,
    auth_verifier: AuthVerifier,
    repository: QaRepository,
    *,
    before_sequence: int | None = None,
    limit: int | None = None,
) -> tuple[str, dict[str, Any]]:
    try:
        token = extract_bearer_token(authorization)
        actor_id = auth_verifier.verify_token(token).user_id
    except (MissingTokenError, InvalidTokenError) as error:
        raise HTTPException(status_code=401, detail="authentication_required") from error
    profile = repository.get_user_profile(actor_id)
    if profile is None or profile.get("role") not in ("client", "freelancer"):
        raise HTTPException(status_code=403, detail="qa_participant_role_required")
    application = repository.get_participant_thread(
        application_id,
        actor_id,
        before_sequence=before_sequence,
        limit=limit or settings.qa_message_page_size,
    )
    if application is None:
        raise HTTPException(status_code=404, detail="application_qa_not_found")
    return actor_id, application


def _write_message(
    repository: QaRepository,
    application_id: str,
    actor_id: str,
    request_id: Any,
    operation: str,
    *,
    topic: str | None = None,
    other_topic_detail: str | None = None,
    body: str | None = None,
    target_message_id: str | None = None,
    decline_reason_code: str | None = None,
    decline_reason_detail: str | None = None,
) -> None:
    _call(
        repository,
        "qa_write_message",
        {
            "p_application_id": application_id,
            "p_acting_user_id": actor_id,
            "p_request_id": str(request_id),
            "p_operation": operation,
            "p_topic": topic,
            "p_other_topic_detail": other_topic_detail,
            "p_body": body,
            "p_target_message_id": target_message_id,
            "p_decline_reason_code": decline_reason_code,
            "p_decline_reason_detail": decline_reason_detail,
            "p_burst_limit": settings.qa_message_burst_limit,
            "p_burst_minutes": settings.qa_message_burst_minutes,
            "p_daily_limit": settings.qa_message_daily_limit,
        },
    )


def _reload(repository: QaRepository, application_id: str, actor_id: str) -> dict[str, Any]:
    application = repository.get_participant_thread(
        application_id, actor_id, limit=settings.qa_message_page_size
    )
    if application is None:
        raise HTTPException(status_code=404, detail="application_qa_not_found")
    return build_thread_dto(application)


def _safe_message(*parts: str | None) -> None:
    code = message_safety_code(*parts)
    if code:
        raise HTTPException(status_code=422, detail=code)


def _call(repository: QaRepository, function_name: str, payload: dict[str, Any]) -> dict[str, Any]:
    try:
        return repository.call_qa_mutation(function_name, payload)
    except MarketplaceWriteError as error:
        marker = str(error)
        detail, status, headers = _public_error(marker)
        raise HTTPException(status_code=status, detail=detail, headers=headers) from error
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail="qa_service_unavailable") from error


def _public_error(marker: str) -> tuple[str, int, dict[str, str] | None]:
    if marker.startswith("M7F_QA_RATE_LIMITED:"):
        seconds = marker.partition(":")[2]
        retry_after = seconds if seconds.isdigit() else "60"
        return "qa_rate_limit_exceeded", 429, {"Retry-After": retry_after}
    if marker.startswith("M7F_MESSAGE_SAFETY:"):
        code = marker.partition(":")[2]
        allowed = {
            "contact_information_not_allowed",
            "external_communication_request_not_allowed",
            "credential_request_not_allowed",
            "financial_identifier_not_allowed",
        }
        return (code if code in allowed else "message_safety_violation"), 422, None
    mapping = {
        "M7F_APPLICATION_QA_NOT_FOUND": ("application_qa_not_found", 404),
        "M7F_QA_ACTION_NOT_ALLOWED": ("qa_action_not_allowed", 409),
        "M7F_QA_THREAD_READ_ONLY": ("qa_thread_read_only", 409),
        "M7F_INITIAL_QUESTION_LIMIT_REACHED": ("initial_question_limit_reached", 409),
        "M7F_PRE_ADVANCE_DISCUSSION_STOPPED": ("pre_advance_discussion_stopped", 409),
        "M7F_QUESTION_ALREADY_RESOLVED": ("question_already_resolved", 409),
        "M7F_INVALID_QUESTION_RESPONSE": ("invalid_question_response", 422),
        "M7F_INVALID_MESSAGE_REFERENCE": ("invalid_message_reference", 422),
        "M7F_IDEMPOTENCY_CONFLICT": ("idempotency_conflict", 409),
        "M7F_REVISION_ALREADY_OPEN": ("revision_request_already_open", 409),
        "M7F_REVISION_NOT_ACTIONABLE": ("revision_request_not_actionable", 409),
        "M7F_REVISION_SUPERSEDED": ("revision_request_superseded", 409),
        "M7F_STALE_APPLICATION_VERSION": ("stale_application_version", 409),
        "M7F_STALE_GIG_VERSION": ("stale_gig_version", 409),
        "M7F_PENDING_SELECTION_BLOCKS_REVISION": ("pending_selection_blocks_revision", 409),
        "M7F_INVALID_REVISION_RESPONSE": ("invalid_revision_response", 422),
    }
    detail, status = mapping.get(marker, ("qa_transaction_failed", 500))
    return detail, status, None


__all__ = ["router"]
