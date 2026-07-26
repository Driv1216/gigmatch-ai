from __future__ import annotations

import hashlib
import math
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any, Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, ConfigDict

from app.core.auth import AuthVerifier, InvalidTokenError, MissingTokenError, SupabaseAuthVerifier
from app.marketplace.application_contracts import (
    ApplicationSnapshotInput,
    ApplicationVersionRequest,
    GigChangeReaffirmRequest,
    GigChangeUpdateRequest,
    ReapplyApplicationRequest,
    SubmitApplicationRequest,
    WithdrawApplicationRequest,
)
from app.marketplace.application_data_access import (
    ApplicationRepository,
    MarketplaceWriteError,
    SupabaseApplicationRepository,
)
from app.marketplace.discovery import has_supported_application_contract, parse_application_deadline
from app.marketplace.qa import qa_indicator_from_summary
from app.matching.data_access import MissingProfileError, UnsupportedRoleError, authenticate_matching_request


router = APIRouter()


class StrictResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ApplicationContextResponse(StrictResponse):
    gig_id: str
    can_apply: bool
    blocker: str | None
    existing_application_id: str | None
    gig: dict[str, Any]
    client: dict[str, Any]
    material_terms: dict[str, Any]
    payment_structure: str
    currency: str
    required_proposal_fields: list[str]
    application_deadline: str
    material_gig_version_number: int
    material_terms_token: str | None


class PaginationResponse(StrictResponse):
    page: int
    page_size: int
    total_items: int
    total_pages: int


class ApplicationListResponse(StrictResponse):
    items: list[dict[str, Any]]
    pagination: PaginationResponse


class VersionListResponse(StrictResponse):
    items: list[dict[str, Any]]
    pagination: PaginationResponse


def get_auth_verifier() -> AuthVerifier:
    return SupabaseAuthVerifier()


def get_application_repository() -> ApplicationRepository:
    return SupabaseApplicationRepository()


@router.get("/gigs/{gig_id}/application-context", response_model=ApplicationContextResponse)
def get_application_context(
    gig_id: str,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: ApplicationRepository = Depends(get_application_repository),
) -> ApplicationContextResponse:
    _, profile_id = _freelancer_identity(authorization, auth_verifier, repository)
    record = repository.get_application_context(gig_id, profile_id)
    if record is None or record.get("opportunity_lifecycle") == "draft" or not has_supported_application_contract(record):
        raise HTTPException(status_code=404, detail="gig_not_found")
    material = _material_version(record)
    snapshot = _snapshot(material)
    deadline = parse_application_deadline(snapshot.get("application_deadline"))
    if deadline is None:
        raise HTTPException(status_code=404, detail="gig_not_found")
    blocker: str | None = None
    lifecycle = record.get("opportunity_lifecycle")
    if lifecycle == "filled":
        blocker = "gig_filled"
    elif lifecycle == "cancelled":
        blocker = "gig_cancelled"
    elif record.get("operational_state") == "paused":
        blocker = "gig_paused"
    elif record.get("application_intake") != "accepting":
        blocker = "applications_closed"
    elif deadline <= datetime.now(timezone.utc):
        blocker = "application_deadline_passed"
    elif isinstance(record.get("existing_application"), dict):
        blocker = "application_already_exists"
    terms_token = _terms_token(str(record["id"]), str(material["id"])) if blocker is None else None
    return ApplicationContextResponse(
        gig_id=str(record["id"]),
        can_apply=blocker is None,
        blocker=blocker,
        existing_application_id=(
            str(record["existing_application"]["id"])
            if isinstance(record.get("existing_application"), dict)
            else None
        ),
        gig=_safe_gig_summary(snapshot, str(record.get("status") or "")),
        client=_safe_client(record),
        material_terms=_safe_terms(snapshot),
        payment_structure=str(snapshot["payment_structure"]),
        currency=str(snapshot["currency"]),
        required_proposal_fields=_required_fields(str(snapshot["payment_structure"])),
        application_deadline=deadline.isoformat(),
        material_gig_version_number=int(material.get("version_number") or 0),
        material_terms_token=terms_token,
    )


@router.post("/gigs/{gig_id}/applications", response_model=dict[str, Any])
def submit_application(
    gig_id: str,
    body: SubmitApplicationRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: ApplicationRepository = Depends(get_application_repository),
) -> dict[str, Any]:
    user_id, profile_id = _freelancer_identity(authorization, auth_verifier, repository)
    reviewed_terms = repository.get_gig_terms_for_token(gig_id, body.expected_material_terms_token)
    if reviewed_terms is None:
        raise HTTPException(status_code=409, detail="stale_gig_terms")
    snapshot = _snapshot(reviewed_terms)
    result = _call(
        repository,
        "submit_application",
        {
            "p_gig_id": gig_id,
            "p_acting_user_id": user_id,
            "p_submission_request_id": str(body.submission_request_id),
            "p_expected_material_terms_token": body.expected_material_terms_token,
            "p_snapshot": body.application.canonical_payload(currency=str(snapshot.get("currency") or "")),
        },
    )
    application = repository.get_freelancer_application(str(result["application_id"]), profile_id)
    if application is None:
        raise HTTPException(status_code=500, detail="application_write_failed")
    return {**_application_detail(application), "idempotent_replay": bool(result.get("idempotent_replay"))}


@router.get("/applications", response_model=ApplicationListResponse)
def list_applications(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: ApplicationRepository = Depends(get_application_repository),
) -> ApplicationListResponse:
    _, profile_id = _freelancer_identity(authorization, auth_verifier, repository)
    records = repository.list_freelancer_applications(profile_id)
    records.sort(key=lambda row: (str(row.get("last_updated_at") or ""), str(row.get("id") or "")), reverse=True)
    total = len(records)
    offset = (page - 1) * page_size
    return ApplicationListResponse(
        items=[_application_summary(row) for row in records[offset : offset + page_size]],
        pagination=PaginationResponse(
            page=page,
            page_size=page_size,
            total_items=total,
            total_pages=math.ceil(total / page_size) if total else 0,
        ),
    )


@router.get("/applications/{application_id}", response_model=dict[str, Any])
def get_application(
    application_id: str,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: ApplicationRepository = Depends(get_application_repository),
) -> dict[str, Any]:
    _, profile_id = _freelancer_identity(authorization, auth_verifier, repository)
    application = repository.get_freelancer_application(application_id, profile_id)
    if application is None:
        raise HTTPException(status_code=404, detail="application_not_found")
    return _application_detail(application)


@router.get("/applications/{application_id}/versions", response_model=VersionListResponse)
def list_application_versions(
    application_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: ApplicationRepository = Depends(get_application_repository),
) -> VersionListResponse:
    _, profile_id = _freelancer_identity(authorization, auth_verifier, repository)
    application = repository.get_freelancer_application(application_id, profile_id)
    if application is None:
        raise HTTPException(status_code=404, detail="application_not_found")
    versions = sorted(application.get("versions", []), key=lambda row: (int(row.get("version_number") or 0), str(row.get("id"))), reverse=True)
    total = len(versions)
    offset = (page - 1) * page_size
    return VersionListResponse(
        items=[_version_dto(application_id, version) for version in versions[offset : offset + page_size]],
        pagination=PaginationResponse(page=page, page_size=page_size, total_items=total,
                                      total_pages=math.ceil(total / page_size) if total else 0),
    )


@router.post("/applications/{application_id}/versions", response_model=dict[str, Any])
def create_application_version(
    application_id: str,
    body: ApplicationVersionRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: ApplicationRepository = Depends(get_application_repository),
) -> dict[str, Any]:
    user_id, profile_id, application = _owned_application(
        application_id, authorization, auth_verifier, repository
    )
    currency = _current_currency(application)
    _call(repository, "create_application_version", {
        "p_application_id": application_id, "p_acting_user_id": user_id,
        "p_expected_application_version_token": body.expected_application_version_token,
        "p_snapshot": body.application.canonical_payload(currency=currency),
    })
    return _reload_detail(repository, application_id, profile_id)


@router.post("/applications/{application_id}/gig-change/reaffirm", response_model=dict[str, Any])
def reaffirm_application(
    application_id: str,
    body: GigChangeReaffirmRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: ApplicationRepository = Depends(get_application_repository),
) -> dict[str, Any]:
    user_id, profile_id, _ = _owned_application(application_id, authorization, auth_verifier, repository)
    _call(repository, "respond_to_application_gig_change", {
        "p_application_id": application_id, "p_acting_user_id": user_id, "p_action": "reaffirm",
        "p_expected_application_version_token": body.expected_application_version_token,
        "p_expected_material_terms_token": body.expected_material_terms_token, "p_snapshot": None,
    })
    return _reload_detail(repository, application_id, profile_id)


@router.post("/applications/{application_id}/gig-change/update", response_model=dict[str, Any])
def update_for_gig_change(
    application_id: str,
    body: GigChangeUpdateRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: ApplicationRepository = Depends(get_application_repository),
) -> dict[str, Any]:
    user_id, profile_id, application = _owned_application(application_id, authorization, auth_verifier, repository)
    _call(repository, "respond_to_application_gig_change", {
        "p_application_id": application_id, "p_acting_user_id": user_id, "p_action": "update",
        "p_expected_application_version_token": body.expected_application_version_token,
        "p_expected_material_terms_token": body.expected_material_terms_token,
        "p_snapshot": body.application.canonical_payload(currency=_current_currency(application)),
    })
    return _reload_detail(repository, application_id, profile_id)


@router.post("/applications/{application_id}/withdraw", response_model=dict[str, Any])
def withdraw_application(
    application_id: str,
    body: WithdrawApplicationRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: ApplicationRepository = Depends(get_application_repository),
) -> dict[str, Any]:
    user_id, profile_id, _ = _owned_application(application_id, authorization, auth_verifier, repository)
    _call(repository, "withdraw_application", {
        "p_application_id": application_id, "p_acting_user_id": user_id,
        "p_expected_application_version_token": body.expected_application_version_token,
        "p_reason_code": body.reason.value, "p_explanation": body.explanation,
    })
    return _reload_detail(repository, application_id, profile_id)


@router.post("/applications/{application_id}/reapply-after-gig-change", response_model=dict[str, Any])
def reapply_after_gig_change(
    application_id: str,
    body: ReapplyApplicationRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: ApplicationRepository = Depends(get_application_repository),
) -> dict[str, Any]:
    user_id, profile_id, application = _owned_application(application_id, authorization, auth_verifier, repository)
    _call(repository, "reapply_application_after_gig_change", {
        "p_application_id": application_id, "p_acting_user_id": user_id,
        "p_expected_application_version_token": body.expected_application_version_token,
        "p_expected_material_terms_token": body.expected_material_terms_token,
        "p_snapshot": body.application.canonical_payload(currency=_current_currency(application)),
    })
    return _reload_detail(repository, application_id, profile_id)


def _freelancer_identity(
    authorization: str | None, auth_verifier: AuthVerifier, repository: ApplicationRepository
) -> tuple[str, str]:
    try:
        context = authenticate_matching_request(authorization, auth_verifier, repository)  # type: ignore[arg-type]
    except (MissingTokenError, InvalidTokenError) as error:
        raise HTTPException(status_code=401, detail=str(error)) from error
    except (MissingProfileError, UnsupportedRoleError) as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    if context.role != "freelancer":
        raise HTTPException(status_code=403, detail="freelancer_role_required")
    profile = repository.get_freelancer_profile(context.user_id)
    if not profile:
        raise HTTPException(status_code=403, detail="freelancer_profile_required")
    return context.user_id, str(profile["id"])


def _owned_application(
    application_id: str,
    authorization: str | None,
    auth_verifier: AuthVerifier,
    repository: ApplicationRepository,
) -> tuple[str, str, dict[str, Any]]:
    user_id, profile_id = _freelancer_identity(authorization, auth_verifier, repository)
    application = repository.get_freelancer_application(application_id, profile_id)
    if application is None:
        raise HTTPException(status_code=404, detail="application_not_found")
    return user_id, profile_id, application


def _call(repository: ApplicationRepository, function_name: str, payload: dict[str, Any]) -> dict[str, Any]:
    try:
        return repository.call_application_mutation(function_name, payload)
    except MarketplaceWriteError as error:
        code = _error_code(str(error))
        status = 422 if code in {"invalid_financial_proposal", "application_withdrawal_not_allowed"} else 409
        if code == "application_not_found":
            status = 404
        raise HTTPException(status_code=status, detail=code) from error
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail="application_service_unavailable") from error


def _error_code(message: str) -> str:
    codes = {
        "M7D_FREELANCER_PROFILE_REQUIRED": "freelancer_profile_required",
        "M7D_APPLICATION_NOT_FOUND": "application_not_found",
        "M7D_GIG_NOT_APPLICATION_READY": "gig_not_application_ready",
        "M7D_APPLICATION_DEADLINE_PASSED": "application_deadline_passed",
        "M7D_APPLICATION_ALREADY_EXISTS": "application_already_exists",
        "M7D_IDEMPOTENCY_KEY_REUSED": "idempotency_key_reused",
        "M7D_STALE_GIG_TERMS": "stale_gig_terms",
        "M7D_STALE_APPLICATION_VERSION": "stale_application_version",
        "M7D_APPLICATION_EDIT_NOT_ALLOWED": "application_edit_not_allowed",
        "M7D_RESPONSE_TO_UPDATED_GIG_REQUIRED": "response_to_updated_gig_required",
        "M7D_NO_UPDATED_GIG_RESPONSE_REQUIRED": "no_updated_gig_response_required",
        "M7D_GIG_TERMS_CHANGED_AGAIN": "gig_terms_changed_again",
        "M7D_EXISTING_PROPOSAL_INCOMPATIBLE_WITH_UPDATED_TERMS": "existing_proposal_incompatible_with_updated_terms",
        "M7D_PENDING_SELECTION_BLOCKS_APPLICATION_WITHDRAWAL": "pending_selection_blocks_application_withdrawal",
        "M7D_APPLICATION_WITHDRAWAL_NOT_ALLOWED": "application_withdrawal_not_allowed",
        "M7D_REAPPLICATION_NOT_ALLOWED": "reapplication_not_allowed",
        "M7D_INVALID_FINANCIAL_PROPOSAL": "invalid_financial_proposal",
    }
    return next((code for marker, code in codes.items() if marker in message), "application_conflict")


def _reload_detail(repository: ApplicationRepository, application_id: str, profile_id: str) -> dict[str, Any]:
    application = repository.get_freelancer_application(application_id, profile_id)
    if application is None:
        raise HTTPException(status_code=500, detail="application_write_failed")
    return _application_detail(application)


def _material_version(gig: dict[str, Any]) -> dict[str, Any]:
    value = gig.get("current_material_version")
    return value if isinstance(value, dict) else {}


def _snapshot(version: dict[str, Any]) -> dict[str, Any]:
    value = version.get("terms_snapshot")
    return value if isinstance(value, dict) else {}


def _safe_gig_summary(snapshot: dict[str, Any], product_state: str) -> dict[str, Any]:
    return {
        "title": snapshot.get("title"), "summary": snapshot.get("summary") or snapshot.get("description"),
        "required_skills": _string_list(snapshot.get("required_skills")),
        "preferred_skills": _string_list(snapshot.get("preferred_skills")),
        "work_mode": snapshot.get("work_mode"), "product_state": product_state,
    }


def _safe_client(gig: dict[str, Any]) -> dict[str, Any]:
    client = gig.get("safe_client_profile") if isinstance(gig.get("safe_client_profile"), dict) else {}
    user = gig.get("safe_client_user_profile") if isinstance(gig.get("safe_client_user_profile"), dict) else {}
    return {
        "display_name": user.get("full_name") or client.get("company_name") or "Client",
        "company_name": client.get("company_name"), "industry": client.get("industry"),
        "company_summary": client.get("bio"),
    }


def _safe_terms(snapshot: dict[str, Any]) -> dict[str, Any]:
    keys = {
        "title", "description", "scope", "client_payment", "payment_structure", "currency",
        "required_skills", "preferred_skills", "experience_requirement", "work_mode",
        "location_requirements", "weekly_commitment", "expected_duration", "application_deadline",
        "project_deadline", "deliverables",
    }
    safe = {key: snapshot[key] for key in keys if key in snapshot}
    scope = safe.get("scope")
    if isinstance(scope, dict):
        safe["scope"] = {
            key: scope[key]
            for key in ("summary", "deliverables", "included_work", "excluded_work", "assumptions")
            if key in scope
        }
    payment = safe.get("client_payment")
    if isinstance(payment, dict):
        safe["client_payment"] = {
            key: payment[key]
            for key in ("budget", "hourly_rate", "guidance", "weekly_commitment", "engagement_duration")
            if key in payment
        }
    return safe


def _required_fields(structure: str) -> list[str]:
    common = ["cover_note", "timeline", "availability", "included_work", "excluded_work", "assumptions"]
    if structure == "fixed_price":
        return common + ["fixed_price_mode", "above_budget_explanation_when_required"]
    if structure == "hourly":
        return common + ["requested_hourly_rate", "weekly_availability", "available_from", "rate_flexibility"]
    return common + ["open_proposal_variant", "estimate_change_factors"]


def _terms_token(gig_id: str, version_id: str) -> str:
    return hashlib.sha256(f"{gig_id}:{version_id}".encode()).hexdigest()


def _version_token(application_id: str, version_id: str) -> str:
    return hashlib.sha256(f"{application_id}:{version_id}".encode()).hexdigest()


def _application_snapshot(version: dict[str, Any]) -> dict[str, Any]:
    return {
        "cover_note": version.get("cover_note"),
        "proposal": _safe_json(version.get("proposal_snapshot")),
        "timeline": _safe_json(version.get("timeline_snapshot")),
        "availability": _safe_json(version.get("availability_snapshot")),
        "scope": _safe_json(version.get("scope_snapshot")),
        "scope_notes": version.get("scope_notes"),
    }


def _version_dto(application_id: str, version: dict[str, Any]) -> dict[str, Any]:
    answered = version.get("answered_gig_version") if isinstance(version.get("answered_gig_version"), dict) else {}
    return {
        "version_token": _version_token(application_id, str(version.get("id"))),
        "version_number": int(version.get("version_number") or 0),
        "origin": version.get("origin"), "created_at": version.get("created_at"),
        "application": _application_snapshot(version),
        "answered_gig_version_number": int(answered.get("version_number") or 0),
        "answered_terms": _safe_terms(_snapshot(answered)),
    }


def _application_summary(application: dict[str, Any]) -> dict[str, Any]:
    gig = application.get("gig") if isinstance(application.get("gig"), dict) else {}
    current = application.get("current_version") if isinstance(application.get("current_version"), dict) else {}
    material = _material_version(gig)
    stale = bool(current and material and str(current.get("gig_version_id")) != str(material.get("id")))
    actions, blockers = _allowed_actions(application, stale)
    return {
        "application_id": str(application.get("id")),
        "gig": _safe_gig_summary(_snapshot(gig.get("current_version") or {}), str(gig.get("status") or "")),
        "client": _safe_client(gig), "stage": application.get("stage"),
        "submitted_at": application.get("submitted_at"), "updated_at": application.get("last_updated_at"),
        "current_version_number": int(current.get("version_number") or 0),
        "response_to_updated_gig_required": stale, "gig_product_state": gig.get("status"),
        "allowed_actions": actions, "blockers": blockers,
        "qa": qa_indicator_from_summary(application),
    }


def _application_detail(application: dict[str, Any]) -> dict[str, Any]:
    gig = application.get("gig") if isinstance(application.get("gig"), dict) else {}
    versions = sorted(application.get("versions", []), key=lambda row: int(row.get("version_number") or 0))
    current = application.get("current_version") if isinstance(application.get("current_version"), dict) else {}
    original = versions[0] if versions else {}
    material = _material_version(gig)
    answered = current.get("answered_gig_version") if isinstance(current.get("answered_gig_version"), dict) else {}
    stale = bool(current and material and str(current.get("gig_version_id")) != str(material.get("id")))
    can_reaffirm = stale and _can_reaffirm(current, _snapshot(material))
    actions, blockers = _allowed_actions(application, stale, can_reaffirm)
    return {
        "application_id": str(application.get("id")), "stage": application.get("stage"),
        "application_version_token": _version_token(str(application.get("id")), str(current.get("id"))),
        "current_application": _application_snapshot(current),
        "current_version_number": int(current.get("version_number") or 0),
        "original_submission": _application_snapshot(original),
        "answered_gig_version_number": int(answered.get("version_number") or 0),
        "current_material_gig_version_number": int(material.get("version_number") or 0),
        "current_material_terms": _safe_terms(_snapshot(material)),
        "response_to_updated_gig_required": stale,
        "material_terms_token": _terms_token(str(gig.get("id")), str(material.get("id"))) if stale else None,
        "gig_change_comparison": _comparison(_snapshot(answered), _snapshot(material)) if stale else [],
        "withdrawal_or_closure": {
            "reason_origin": application.get("stage_reason_origin"), "reason": application.get("stage_reason_code"),
            "detail": _safe_json(application.get("stage_reason_payload")),
        },
        "version_history_count": len(versions),
        "compatibility": {"can_reaffirm_existing_proposal": can_reaffirm},
        "allowed_actions": actions, "blockers": blockers,
        "gig": _safe_gig_summary(_snapshot(gig.get("current_version") or {}), str(gig.get("status") or "")),
        "client": _safe_client(gig),
        "qa": qa_indicator_from_summary(application),
    }


def _allowed_actions(
    application: dict[str, Any], stale: bool, can_reaffirm: bool | None = None
) -> tuple[list[str], list[str]]:
    stage = application.get("stage")
    gig = application.get("gig") if isinstance(application.get("gig"), dict) else {}
    terminal_gig = gig.get("opportunity_lifecycle") in ("filled", "cancelled")
    effective_request = _has_effective_request(application)
    actions: list[str] = []
    blockers: list[str] = []
    if stage in ("under_review", "advanced") and not terminal_gig:
        if stale:
            if can_reaffirm is not False:
                actions.append("reaffirm_updated_gig_terms")
            actions.append("update_for_gig_change")
        else:
            actions.append("edit_application")
        if not effective_request:
            actions.append("withdraw_application")
        else:
            blockers.append("pending_selection_blocks_application_withdrawal")
    elif stage == "withdrawn" and stale and _gig_is_application_ready(gig):
        actions.append("reapply_after_gig_change")
    if stale:
        blockers.append("response_to_updated_gig_required")
    if terminal_gig:
        blockers.append("application_terminal")
    return actions, blockers


def _has_effective_request(application: dict[str, Any]) -> bool:
    now = datetime.now(timezone.utc)
    return any(
        request.get("status") == "pending"
        and (expiry := parse_application_deadline(request.get("expires_at"))) is not None
        and expiry > now
        for request in application.get("selection_requests", [])
        if isinstance(request, dict)
    )


def _gig_is_application_ready(gig: dict[str, Any]) -> bool:
    material = _material_version(gig)
    deadline = parse_application_deadline(_snapshot(material).get("application_deadline"))
    return bool(
        gig.get("opportunity_lifecycle") == "active"
        and gig.get("application_intake") == "accepting"
        and gig.get("operational_state") == "active"
        and deadline and deadline > datetime.now(timezone.utc)
    )


def _can_reaffirm(version: dict[str, Any], new_terms: dict[str, Any]) -> bool:
    proposal = version.get("proposal_snapshot") if isinstance(version.get("proposal_snapshot"), dict) else {}
    if proposal.get("payment_structure") != new_terms.get("payment_structure") or proposal.get("currency") != new_terms.get("currency"):
        return False
    try:
        if proposal.get("payment_structure") == "fixed_price":
            maximum = Decimal(str(new_terms["client_payment"]["budget"]["maximum"]))
            proposed = maximum
            if proposal.get("mode") == "exact_total":
                proposed = Decimal(str(proposal["exact_total"]))
            elif proposal.get("mode") == "total_range":
                proposed = Decimal(str(proposal["total_range"]["maximum"]))
            if proposed > maximum and not str(proposal.get("above_budget_explanation") or "").strip():
                return False
    except (KeyError, TypeError, InvalidOperation):
        return False
    scope = version.get("scope_snapshot") if isinstance(version.get("scope_snapshot"), dict) else {}
    if proposal.get("payment_structure") == "open_to_proposals" and not all(
        scope.get(key) for key in ("included_work", "excluded_work", "assumptions", "estimate_change_factors")
    ):
        return False
    return True


def _comparison(before: dict[str, Any], after: dict[str, Any]) -> list[dict[str, Any]]:
    fields = (
        "payment_structure", "currency", "client_payment", "required_skills", "preferred_skills", "scope",
        "deliverables", "experience_requirement", "work_mode", "location_requirements", "weekly_commitment",
        "application_deadline", "project_deadline",
    )
    return [
        {"field": field, "before": before.get(field), "after": after.get(field)}
        for field in fields if before.get(field) != after.get(field)
    ]


def _current_currency(application: dict[str, Any]) -> str:
    gig = application.get("gig") if isinstance(application.get("gig"), dict) else {}
    currency = _snapshot(_material_version(gig)).get("currency")
    if not isinstance(currency, str):
        raise HTTPException(status_code=409, detail="unsupported_gig_contract")
    return currency


def _safe_json(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _string_list(value: Any) -> list[str]:
    return [item for item in value if isinstance(item, str)] if isinstance(value, list) else []


__all__ = ["get_application_repository", "get_auth_verifier", "router"]
