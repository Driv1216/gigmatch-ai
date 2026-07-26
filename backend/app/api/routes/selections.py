"""Participant-safe selection request reads and strict service-only mutations."""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException

from app.core.auth import (
    AuthVerifier,
    InvalidTokenError,
    MissingTokenError,
    SupabaseAuthVerifier,
    extract_bearer_token,
)
from app.marketplace.selection_contracts import (
    AcceptSelectionRequest,
    CancelSelectionRequest,
    DeclineRemainInterestedRequest,
    DeclineWithdrawRequest,
    RequestRevisedSelectionTerms,
    SendSelectionRequest,
)
from app.marketplace.selection_data_access import (
    MarketplaceWriteError,
    SelectionRepository,
    SupabaseSelectionRepository,
)

router = APIRouter()


def get_auth_verifier() -> AuthVerifier:
    return SupabaseAuthVerifier()


def get_selection_repository() -> SelectionRepository:
    return SupabaseSelectionRepository()


@router.get("/applications/{application_id}/selection-context", response_model=dict[str, Any])
def get_selection_context(
    application_id: str,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: SelectionRepository = Depends(get_selection_repository),
) -> dict[str, Any]:
    actor_id = _identity(authorization, auth_verifier, repository)
    return _call(
        repository,
        "selection_get_context",
        {"p_application_id": application_id, "p_acting_user_id": actor_id},
    )


@router.get("/selection-requests/{request_id}", response_model=dict[str, Any])
def get_selection_request(
    request_id: str,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: SelectionRepository = Depends(get_selection_repository),
) -> dict[str, Any]:
    actor_id = _identity(authorization, auth_verifier, repository)
    return _call(
        repository,
        "selection_get_request",
        {"p_selection_request_id": request_id, "p_acting_user_id": actor_id},
    )


@router.get(
    "/applications/{application_id}/selection-requests",
    response_model=dict[str, Any],
)
def list_selection_requests(
    application_id: str,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: SelectionRepository = Depends(get_selection_repository),
) -> dict[str, Any]:
    actor_id = _identity(authorization, auth_verifier, repository)
    return _call(
        repository,
        "selection_list_requests",
        {"p_application_id": application_id, "p_acting_user_id": actor_id},
    )


@router.post(
    "/applications/{application_id}/selection-requests",
    response_model=dict[str, Any],
)
def send_selection_request(
    application_id: str,
    body: SendSelectionRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: SelectionRepository = Depends(get_selection_repository),
) -> dict[str, Any]:
    actor_id = _identity(authorization, auth_verifier, repository)
    return _result(
        _call(
            repository,
            "selection_send_request",
            {
                "p_application_id": application_id,
                "p_acting_user_id": actor_id,
                "p_duration_hours": body.duration_hours,
                "p_expected_send_token": body.send_token,
                "p_request_id": str(body.request_id),
                "p_commercial_acknowledged": body.commercial_acknowledged,
            },
        )
    )


@router.post("/selection-requests/{request_id}/cancel", response_model=dict[str, Any])
def cancel_selection_request(
    request_id: str,
    body: CancelSelectionRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: SelectionRepository = Depends(get_selection_repository),
) -> dict[str, Any]:
    actor_id = _identity(authorization, auth_verifier, repository)
    return _result(
        _call(
            repository,
            "selection_cancel_request",
            {
                "p_selection_request_id": request_id,
                "p_acting_user_id": actor_id,
                "p_expected_management_token": body.management_token,
                "p_request_id": str(body.request_id),
                "p_reason_code": body.reason_code,
                "p_detail": body.detail,
            },
        )
    )


@router.post("/selection-requests/{request_id}/accept", response_model=dict[str, Any])
def accept_selection_request(
    request_id: str,
    body: AcceptSelectionRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: SelectionRepository = Depends(get_selection_repository),
) -> dict[str, Any]:
    return _respond(
        request_id, "accept", body, authorization, auth_verifier, repository,
        exact_terms_confirmed=True,
    )


@router.post(
    "/selection-requests/{request_id}/decline-remain-interested",
    response_model=dict[str, Any],
)
def decline_selection_remain_interested(
    request_id: str,
    body: DeclineRemainInterestedRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: SelectionRepository = Depends(get_selection_repository),
) -> dict[str, Any]:
    return _respond(
        request_id, "decline_remain_interested", body, authorization,
        auth_verifier, repository, detail=body.detail,
    )


@router.post(
    "/selection-requests/{request_id}/decline-withdraw",
    response_model=dict[str, Any],
)
def decline_selection_and_withdraw(
    request_id: str,
    body: DeclineWithdrawRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: SelectionRepository = Depends(get_selection_repository),
) -> dict[str, Any]:
    return _respond(
        request_id, "decline_withdraw", body, authorization, auth_verifier, repository,
        withdrawal_reason_code=body.reason_code, detail=body.detail,
    )


@router.post(
    "/selection-requests/{request_id}/request-revised-terms",
    response_model=dict[str, Any],
)
def request_revised_selection_terms(
    request_id: str,
    body: RequestRevisedSelectionTerms,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: SelectionRepository = Depends(get_selection_repository),
) -> dict[str, Any]:
    return _respond(
        request_id, "request_revised_terms", body, authorization, auth_verifier, repository,
        detail=body.detail, change_categories=body.change_categories,
    )


def _respond(
    request_id: str,
    action: str,
    body: (
        AcceptSelectionRequest
        | DeclineRemainInterestedRequest
        | DeclineWithdrawRequest
        | RequestRevisedSelectionTerms
    ),
    authorization: str | None,
    auth_verifier: AuthVerifier,
    repository: SelectionRepository,
    *,
    exact_terms_confirmed: bool = False,
    withdrawal_reason_code: str | None = None,
    detail: str | None = None,
    change_categories: list[str] | None = None,
) -> dict[str, Any]:
    actor_id = _identity(authorization, auth_verifier, repository)
    return _result(
        _call(
            repository,
            "selection_respond_request",
            {
                "p_selection_request_id": request_id,
                "p_acting_user_id": actor_id,
                "p_action": action,
                "p_expected_response_token": body.response_token,
                "p_request_id": str(body.request_id),
                "p_exact_terms_confirmed": exact_terms_confirmed,
                "p_withdrawal_reason_code": withdrawal_reason_code,
                "p_reason_detail": detail,
                "p_change_categories": change_categories,
            },
        )
    )


def _identity(
    authorization: str | None,
    auth_verifier: AuthVerifier,
    repository: SelectionRepository,
) -> str:
    try:
        token = extract_bearer_token(authorization)
        user_id = auth_verifier.verify_token(token).user_id
    except (MissingTokenError, InvalidTokenError) as error:
        raise HTTPException(status_code=401, detail="authentication_required") from error
    profile = repository.get_user_profile(user_id)
    if profile is None or profile.get("role") not in ("client", "freelancer"):
        raise HTTPException(status_code=403, detail="selection_action_not_allowed")
    return user_id


def _call(
    repository: SelectionRepository,
    function_name: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    try:
        return repository.call_selection(function_name, payload)
    except MarketplaceWriteError as error:
        message = str(error)
        if "M7G_SELECTION_RESPONSE_ALREADY_RESOLVED" in message:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "selection_response_already_resolved",
                    "current": _resolved_response_summary(error.detail),
                },
            ) from error
        mappings = (
            ("M7G_SELECTION_REQUEST_NOT_FOUND", 404, "selection_request_not_found"),
            ("M7G_SELECTION_ACTION_NOT_ALLOWED", 409, "selection_action_not_allowed"),
            ("M7G_SELECTION_RESPONSE_NOT_ALLOWED", 409, "selection_response_not_allowed"),
            ("M7G_STALE_SELECTION_ACTION", 409, "stale_selection_action"),
            ("M7G_STALE_SELECTION_MANAGEMENT", 409, "stale_selection_management"),
            ("M7G_STALE_SELECTION_RESPONSE", 409, "stale_selection_response"),
            ("M7G_SELECTION_REQUEST_ALREADY_ACTIVE", 409, "selection_request_already_active"),
            ("M7G_SELECTION_REQUEST_EXPIRED", 409, "selection_request_expired"),
            ("M7G_SELECTION_REQUEST_NOT_PENDING", 409, "selection_request_not_pending"),
            ("M7G_SELECTION_TERMS_CHANGED", 409, "selection_terms_changed"),
            (
                "M7G_APPLICATION_RESPONSE_TO_GIG_REQUIRED",
                409,
                "application_response_to_gig_required",
            ),
            ("M7G_APPLICATION_NOT_ADVANCED", 409, "application_not_advanced"),
            ("M7G_PROPOSAL_NOT_SELECTION_READY", 409, "proposal_not_selection_ready"),
            (
                "M7G_REVISION_REQUEST_BLOCKS_SELECTION",
                409,
                "revision_request_blocks_selection",
            ),
            (
                "M7G_COMMERCIAL_ACKNOWLEDGEMENT_REQUIRED",
                422,
                "commercial_acknowledgement_required",
            ),
            (
                "M7G_UNCHANGED_SELECTION_RESEND_BLOCKED",
                409,
                "unchanged_selection_resend_blocked",
            ),
            ("M7G_INVALID_SELECTION_DECLINE", 422, "invalid_selection_decline"),
            (
                "M7G_INVALID_SELECTION_REVISION_REQUEST",
                422,
                "invalid_selection_revision_request",
            ),
            ("M7G_IDEMPOTENCY_CONFLICT", 409, "idempotency_conflict"),
            ("M7G_ENGAGEMENT_ALREADY_EXISTS", 409, "engagement_already_exists"),
            ("M7G_GIG_ALREADY_FILLED", 409, "gig_already_filled"),
        )
        for marker, status, detail in mappings:
            if marker in message:
                raise HTTPException(status_code=status, detail=detail) from error
        raise HTTPException(status_code=500, detail="selection_write_failed") from error


def _result(result: dict[str, Any]) -> dict[str, Any]:
    if result.get("status") == "expired":
        raise HTTPException(status_code=409, detail="selection_request_expired")
    return result


def _resolved_response_summary(detail: str | None) -> dict[str, Any] | None:
    if detail is None:
        return None
    try:
        value = json.loads(detail)
    except json.JSONDecodeError:
        return None
    if not isinstance(value, dict):
        return None
    allowed = (
        "selection_request_id",
        "gig_id",
        "application_id",
        "status",
        "decline_disposition",
        "terminal_at",
        "engagement_id",
        "engagement_status",
    )
    return {key: value[key] for key in allowed if key in value}


__all__ = [
    "get_auth_verifier",
    "get_selection_repository",
    "router",
]
