from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Path, Query
from pydantic import BaseModel, ConfigDict, Field

from app.core.auth import AuthVerifier, InvalidTokenError, MissingTokenError, SupabaseAuthVerifier
from app.matching.data_access import (
    MissingProfileError,
    UnsupportedRoleError,
    authenticate_matching_request,
)
from app.marketplace.data_access import MarketplaceReadRepository, MarketplaceWriteError, SupabaseMarketplaceReadRepository
from app.marketplace.discovery import (
    availability_reason,
    has_supported_application_contract,
    is_discoverable_and_application_ready,
    parse_application_deadline,
    published_snapshot,
)
from app.marketplace.gigs import GigProductState
from app.marketplace.gig_management import GigManagementValidationError, canonical_complete_snapshot
from app.marketplace.payments import PaymentStructure
from app.marketplace.reasons import GigCancellationReason, GigPauseReason, IntakeClosureReason

router = APIRouter()


class StrictResponseModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SafeClientSummary(StrictResponseModel):
    display_name: str
    company_name: str | None = None
    company_summary: str | None = None
    industry: str | None = None


class StructuredRange(StrictResponseModel):
    minimum: float | None = None
    maximum: float | None = None
    unit: str | None = None


class DurationSummary(StrictResponseModel):
    mode: str | None = None
    unit: str | None = None
    exact_value: float | None = None
    minimum: float | None = None
    maximum: float | None = None


class PaymentSummary(StrictResponseModel):
    payment_structure: PaymentStructure
    currency: str
    budget: StructuredRange | None = None
    budget_flexibility: str | None = None
    hourly_rate: StructuredRange | None = None
    weekly_commitment: StructuredRange | None = None
    engagement_duration: DurationSummary | None = None
    guidance_type: str | None = None
    guidance_range: StructuredRange | None = None
    maximum_budget: float | None = None
    no_estimate_explanation: str | None = None
    preferred_proposal_form: str | None = None


class GigSummary(StrictResponseModel):
    gig_id: str
    title: str
    published_summary: str
    category: str
    product_state: GigProductState
    required_skills: list[str]
    preferred_skills: list[str]
    experience_requirement: str
    work_mode: str
    location_requirement: str | None
    payment: PaymentSummary
    application_deadline: str
    published_at: str
    accepting_applications: bool
    client: SafeClientSummary


class GigDetail(GigSummary):
    response_kind: Literal["detail"] = "detail"
    description: str
    deliverables: list[str]
    expected_weekly_commitment: StructuredRange | None
    expected_duration: DurationSummary | None
    project_deadline: str | None
    availability_reason: str
    material_updated_at: str


class GigTombstone(StrictResponseModel):
    response_kind: Literal["tombstone"] = "tombstone"
    gig_id: str
    title: str
    product_state: GigProductState
    message: str


class PaginationMetadata(StrictResponseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int


class GigDiscoveryEnvelope(StrictResponseModel):
    items: list[GigSummary]
    pagination: PaginationMetadata


class SnapshotMutationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_current_gig_version_id: str
    snapshot: dict[str, Any]


class PublishedEditRequest(SnapshotMutationRequest):
    confirm_material_effects: bool = False
    preview_fingerprint: str | None = None


class ReasonActionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reason: str
    explanation: str | None = None


class CancellationActionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reason: GigCancellationReason
    applicant_facing_explanation: str = Field(min_length=1)
    closes_active_records_confirmed: bool
    other_explanation: str | None = None


class OwnerGigManagement(StrictResponseModel):
    gig_id: str
    terms: dict[str, Any]
    lifecycle: str
    intake: str
    operations: str
    product_state: str
    accepting_applications: bool
    deadline_status: str
    terms_contract_version: int
    upgrade_required: bool
    current_display_version_id: str
    current_display_version_number: int
    current_material_version_id: str
    current_material_version_number: int
    optimistic_concurrency_token: str
    allowed_actions: list[str]
    blocking_reason_codes: list[str]
    active_application_count: int
    effectively_active_selection_request: bool
    latest_material_change_summary: dict[str, Any]


class OwnerGigEnvelope(StrictResponseModel):
    items: list[OwnerGigManagement]


def get_auth_verifier() -> AuthVerifier:
    return SupabaseAuthVerifier()


def get_marketplace_repository() -> MarketplaceReadRepository:
    return SupabaseMarketplaceReadRepository()


@router.get("", response_model=GigDiscoveryEnvelope)
def list_open_gigs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: MarketplaceReadRepository = Depends(get_marketplace_repository),
) -> GigDiscoveryEnvelope:
    _authenticate(authorization, auth_verifier, repository)
    now = datetime.now(timezone.utc)
    eligible = [
        record for record in repository.list_marketplace_gigs()
        if is_discoverable_and_application_ready(record, now)
    ]
    eligible.sort(key=_discovery_sort_key, reverse=True)

    total_items = len(eligible)
    total_pages = math.ceil(total_items / page_size) if total_items else 0
    offset = (page - 1) * page_size
    items = [_gig_summary(record, now) for record in eligible[offset : offset + page_size]]
    return GigDiscoveryEnvelope(
        items=items,
        pagination=PaginationMetadata(
            page=page,
            page_size=page_size,
            total_items=total_items,
            total_pages=total_pages,
        ),
    )


@router.get("/manage", response_model=OwnerGigEnvelope)
def list_managed_gigs(
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: MarketplaceReadRepository = Depends(get_marketplace_repository),
) -> OwnerGigEnvelope:
    user_id = _client_user(authorization, auth_verifier, repository)
    now = datetime.now(timezone.utc)
    try:
        records = repository.list_owner_gigs(user_id)
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail="gig_management_unavailable") from error
    return OwnerGigEnvelope(items=[_owner_management(row, now) for row in records])


@router.get("/{gig_id}/manage", response_model=OwnerGigManagement)
def get_managed_gig(
    gig_id: str,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: MarketplaceReadRepository = Depends(get_marketplace_repository),
) -> OwnerGigManagement:
    user_id = _client_user(authorization, auth_verifier, repository)
    try:
        record = repository.get_owner_gig(gig_id, user_id)
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail="gig_management_unavailable") from error
    if record is None:
        raise HTTPException(status_code=404, detail="not_gig_owner")
    return _owner_management(record, datetime.now(timezone.utc))


@router.post("/{gig_id}/publish")
def publish_managed_gig(gig_id: str, body: SnapshotMutationRequest, authorization: str | None = Header(default=None), auth_verifier: AuthVerifier = Depends(get_auth_verifier), repository: MarketplaceReadRepository = Depends(get_marketplace_repository)) -> dict[str, Any]:
    return _snapshot_rpc("manage_gig_publish", gig_id, body, authorization, auth_verifier, repository)


@router.post("/{gig_id}/upgrade")
def upgrade_managed_gig(gig_id: str, body: SnapshotMutationRequest, authorization: str | None = Header(default=None), auth_verifier: AuthVerifier = Depends(get_auth_verifier), repository: MarketplaceReadRepository = Depends(get_marketplace_repository)) -> dict[str, Any]:
    return _snapshot_rpc("manage_gig_upgrade", gig_id, body, authorization, auth_verifier, repository)


@router.post("/{gig_id}/edits/preview")
def preview_managed_gig_edit(gig_id: str, body: SnapshotMutationRequest, authorization: str | None = Header(default=None), auth_verifier: AuthVerifier = Depends(get_auth_verifier), repository: MarketplaceReadRepository = Depends(get_marketplace_repository)) -> dict[str, Any]:
    return _snapshot_rpc("preview_gig_edit", gig_id, body, authorization, auth_verifier, repository)


@router.post("/{gig_id}/edits")
def edit_managed_gig(gig_id: str, body: PublishedEditRequest, authorization: str | None = Header(default=None), auth_verifier: AuthVerifier = Depends(get_auth_verifier), repository: MarketplaceReadRepository = Depends(get_marketplace_repository)) -> dict[str, Any]:
    return _snapshot_rpc("manage_gig_edit", gig_id, body, authorization, auth_verifier, repository)


@router.post("/{gig_id}/intake/close")
def close_managed_gig_intake(gig_id: str, body: ReasonActionRequest, authorization: str | None = Header(default=None), auth_verifier: AuthVerifier = Depends(get_auth_verifier), repository: MarketplaceReadRepository = Depends(get_marketplace_repository)) -> dict[str, Any]:
    try:
        reason = IntakeClosureReason(body.reason)
    except ValueError as error:
        raise HTTPException(status_code=422, detail="invalid_intake_closure") from error
    return _lifecycle_rpc(gig_id, "close_intake", reason.value, {"explanation": body.explanation}, authorization, auth_verifier, repository)


@router.post("/{gig_id}/intake/reopen")
def reopen_managed_gig_intake(gig_id: str, authorization: str | None = Header(default=None), auth_verifier: AuthVerifier = Depends(get_auth_verifier), repository: MarketplaceReadRepository = Depends(get_marketplace_repository)) -> dict[str, Any]:
    return _lifecycle_rpc(gig_id, "reopen_intake", None, {}, authorization, auth_verifier, repository)


@router.post("/{gig_id}/pause")
def pause_managed_gig(gig_id: str, body: ReasonActionRequest, authorization: str | None = Header(default=None), auth_verifier: AuthVerifier = Depends(get_auth_verifier), repository: MarketplaceReadRepository = Depends(get_marketplace_repository)) -> dict[str, Any]:
    try:
        reason = GigPauseReason(body.reason)
    except ValueError as error:
        raise HTTPException(status_code=422, detail="invalid_pause_reason") from error
    return _lifecycle_rpc(gig_id, "pause", reason.value, {"explanation": body.explanation}, authorization, auth_verifier, repository)


@router.post("/{gig_id}/resume")
def resume_managed_gig(gig_id: str, authorization: str | None = Header(default=None), auth_verifier: AuthVerifier = Depends(get_auth_verifier), repository: MarketplaceReadRepository = Depends(get_marketplace_repository)) -> dict[str, Any]:
    return _lifecycle_rpc(gig_id, "resume", None, {}, authorization, auth_verifier, repository)


@router.post("/{gig_id}/cancel")
def cancel_managed_gig(gig_id: str, body: CancellationActionRequest, authorization: str | None = Header(default=None), auth_verifier: AuthVerifier = Depends(get_auth_verifier), repository: MarketplaceReadRepository = Depends(get_marketplace_repository)) -> dict[str, Any]:
    detail = body.model_dump(mode="json", exclude={"reason"})
    return _lifecycle_rpc(gig_id, "cancel", body.reason.value, detail, authorization, auth_verifier, repository)


@router.get("/{gig_id}", response_model=GigDetail | GigTombstone)
def get_gig_detail(
    gig_id: str = Path(..., min_length=1),
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: MarketplaceReadRepository = Depends(get_marketplace_repository),
) -> GigDetail | GigTombstone:
    _authenticate(authorization, auth_verifier, repository)
    record = repository.get_marketplace_gig(gig_id)
    if record is None or record.get("opportunity_lifecycle") == "draft":
        raise HTTPException(status_code=404, detail="Gig was not found.")

    product_state = record.get("status")
    if product_state in ("filled", "cancelled"):
        snapshot = published_snapshot(record)
        return GigTombstone(
            gig_id=str(record.get("id")),
            title=_text(snapshot.get("title")) or "Opportunity",
            product_state=product_state,
            message="This opportunity is no longer available.",
        )

    if not has_supported_application_contract(record):
        raise HTTPException(status_code=404, detail="Gig was not found.")
    return _gig_detail(record, datetime.now(timezone.utc))


def _authenticate(
    authorization: str | None,
    auth_verifier: AuthVerifier,
    repository: MarketplaceReadRepository,
) -> None:
    try:
        authenticate_matching_request(authorization, auth_verifier, repository)  # type: ignore[arg-type]
    except (MissingTokenError, InvalidTokenError) as error:
        raise HTTPException(status_code=401, detail=str(error)) from error
    except (MissingProfileError, UnsupportedRoleError) as error:
        raise HTTPException(status_code=403, detail=str(error)) from error


def _client_user(authorization: str | None, auth_verifier: AuthVerifier, repository: MarketplaceReadRepository) -> str:
    try:
        context = authenticate_matching_request(authorization, auth_verifier, repository)  # type: ignore[arg-type]
    except (MissingTokenError, InvalidTokenError) as error:
        raise HTTPException(status_code=401, detail=str(error)) from error
    except (MissingProfileError, UnsupportedRoleError) as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    if context.role != "client":
        raise HTTPException(status_code=403, detail="client_role_required")
    return context.user_id


def _snapshot_rpc(function_name: str, gig_id: str, body: SnapshotMutationRequest, authorization: str | None, auth_verifier: AuthVerifier, repository: MarketplaceReadRepository) -> dict[str, Any]:
    user_id = _client_user(authorization, auth_verifier, repository)
    try:
        snapshot = canonical_complete_snapshot(body.snapshot)
    except GigManagementValidationError as error:
        raise HTTPException(status_code=422, detail=error.code) from error
    payload: dict[str, Any] = {
        "p_gig_id": gig_id,
        "p_acting_user_id": user_id,
        "p_expected_current_gig_version_id": body.expected_current_gig_version_id,
        "p_snapshot": snapshot,
    }
    if isinstance(body, PublishedEditRequest):
        payload["p_confirm_material_effects"] = body.confirm_material_effects
        payload["p_preview_fingerprint"] = body.preview_fingerprint
    return _call_management(repository, function_name, payload)


def _lifecycle_rpc(gig_id: str, action: str, reason: str | None, detail: dict[str, Any], authorization: str | None, auth_verifier: AuthVerifier, repository: MarketplaceReadRepository) -> dict[str, Any]:
    user_id = _client_user(authorization, auth_verifier, repository)
    return _call_management(repository, "manage_gig_lifecycle", {
        "p_gig_id": gig_id,
        "p_acting_user_id": user_id,
        "p_action": action,
        "p_reason_code": reason,
        "p_detail": detail,
    })


def _call_management(repository: MarketplaceReadRepository, function_name: str, payload: dict[str, Any]) -> dict[str, Any]:
    try:
        return repository.call_gig_management(function_name, payload)
    except MarketplaceWriteError as error:
        code = _write_error_code(str(error))
        status = 422 if code in {"invalid_terms_contract", "future_deadline_required", "invalid_intake_closure", "invalid_pause", "invalid_cancellation"} else 409
        if code == "not_gig_owner":
            status = 404
        detail: Any = code
        if code == "material_change_confirmation_required" and error.detail:
            try:
                detail = json.loads(error.detail)
            except json.JSONDecodeError:
                detail = code
        raise HTTPException(status_code=status, detail=detail) from error
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail="gig_management_unavailable") from error


def _write_error_code(message: str) -> str:
    codes = {
        "M7CB_NOT_GIG_OWNER": "not_gig_owner",
        "M7CB_INVALID_GIG_TRANSITION": "invalid_gig_transition",
        "M7CB_STALE_GIG_VERSION": "stale_gig_version",
        "M7CB_INVALID_TERMS_CONTRACT": "invalid_terms_contract",
        "M7CB_FUTURE_DEADLINE_REQUIRED": "future_deadline_required",
        "M7CB_LEGACY_DEPENDENCY_RECONCILIATION_REQUIRED": "legacy_dependency_reconciliation_required",
        "M7CB_NO_EFFECTIVE_CHANGE": "no_effective_change",
        "M7CB_MATERIAL_CHANGE_CONFIRMATION_REQUIRED": "material_change_confirmation_required",
        "M7CB_MATERIAL_CHANGE_CONSEQUENCES_CHANGED": "material_change_consequences_changed",
        "M7CB_INVALID_INTAKE_CLOSURE": "invalid_intake_closure",
        "M7CB_INVALID_PAUSE": "invalid_pause",
        "M7CB_PENDING_SELECTION_BLOCKS_PAUSE": "pending_selection_blocks_pause",
        "M7CB_INVALID_CANCELLATION": "invalid_cancellation",
    }
    return next((code for marker, code in codes.items() if marker in message), "gig_management_conflict")


def _owner_management(record: dict[str, Any], now: datetime) -> OwnerGigManagement:
    display = record.get("current_version") if isinstance(record.get("current_version"), dict) else {}
    material = record.get("current_material_version") if isinstance(record.get("current_material_version"), dict) else {}
    raw_snapshot = display.get("terms_snapshot") if isinstance(display.get("terms_snapshot"), dict) else {}
    safe_term_keys = {
        "version_kind", "terms_contract_version", "snapshot_schema_version", "payment_structure", "currency",
        "title", "summary", "description", "scope", "client_payment", "required_skills", "preferred_skills",
        "experience_requirement", "difficulty_level", "work_mode", "location_requirements", "weekly_commitment",
        "expected_duration", "application_deadline", "project_deadline", "deliverables", "assumptions",
    }
    snapshot = {key: raw_snapshot[key] for key in safe_term_keys if key in raw_snapshot}
    if isinstance(snapshot.get("client_payment"), dict):
        payment_keys = {"payment_structure", "currency", "budget", "flexibility", "budget_flexibility", "hourly_rate", "weekly_commitment_hours", "weekly_commitment", "engagement_duration", "guidance", "preferred_proposal_form"}
        payment = snapshot["client_payment"]
        snapshot["client_payment"] = {key: payment[key] for key in payment_keys if key in payment}
    if isinstance(snapshot.get("scope"), dict):
        scope_keys = {"tech_category", "category", "included_work", "excluded_work", "description"}
        scope = snapshot["scope"]
        snapshot["scope"] = {key: scope[key] for key in scope_keys if key in scope}
    deadline = parse_application_deadline(snapshot.get("application_deadline"))
    effective_request = any(
        request.get("status") == "pending"
        and (expiry := parse_application_deadline(request.get("expires_at"))) is not None
        and expiry > now
        for request in record.get("selection_requests", [])
        if isinstance(request, dict)
    )
    lifecycle = str(record.get("opportunity_lifecycle"))
    intake = str(record.get("application_intake"))
    operations = str(record.get("operational_state"))
    contract = int(material.get("terms_contract_version") or 0)
    actions: list[str] = []
    blocking: list[str] = []
    if lifecycle == "draft":
        actions.extend(["edit_draft", "publish"])
    elif lifecycle == "active" and contract == 0:
        actions.append("upgrade")
        blocking.append("unsupported_contract_upgrade_required")
    elif lifecycle == "active":
        actions.extend(["edit_published", "cancel"])
        actions.append("close_intake" if intake == "accepting" else "reopen_intake")
        actions.append("pause" if operations == "active" else "resume")
        if effective_request and "pause" in actions:
            blocking.append("pending_selection_blocks_pause")
        if intake == "closed" and (deadline is None or deadline <= now):
            blocking.append("future_deadline_required")
    accepting = lifecycle == "active" and intake == "accepting" and operations == "active" and deadline is not None and deadline > now and contract == 1
    return OwnerGigManagement(
        gig_id=str(record.get("id")), terms=snapshot,
        lifecycle=lifecycle, intake=intake, operations=operations, product_state=str(record.get("status")),
        accepting_applications=accepting,
        deadline_status="future" if deadline and deadline > now else "expired_or_missing",
        terms_contract_version=contract, upgrade_required=contract == 0,
        current_display_version_id=str(display.get("id") or record.get("current_gig_version_id")),
        current_display_version_number=int(display.get("version_number") or 0),
        current_material_version_id=str(material.get("id") or record.get("current_material_gig_version_id")),
        current_material_version_number=int(material.get("version_number") or 0),
        optimistic_concurrency_token=str(record.get("current_gig_version_id")),
        allowed_actions=actions, blocking_reason_codes=blocking,
        active_application_count=int(record.get("active_application_count") or 0),
        effectively_active_selection_request=effective_request,
        latest_material_change_summary={
            "version_id": material.get("id"), "version_number": material.get("version_number"),
            "changed_fields": material.get("changed_fields") or [], "created_at": material.get("created_at"),
        },
    )


def _gig_summary(record: dict[str, Any], now: datetime) -> GigSummary:
    snapshot = published_snapshot(record)
    description = _long_text(snapshot.get("description")) or ""
    version = record.get("current_material_version")
    published_at = _text(version.get("created_at")) if isinstance(version, dict) else None
    return GigSummary(
        gig_id=str(record.get("id")),
        title=_text(snapshot.get("title")) or "Opportunity",
        published_summary=_published_summary(snapshot, description),
        category=_snapshot_category(snapshot),
        product_state=str(record.get("status")),
        required_skills=_string_list(snapshot.get("required_skills")),
        preferred_skills=_string_list(snapshot.get("preferred_skills")),
        experience_requirement=_text(snapshot.get("experience_requirement")) or "Not specified",
        work_mode=_text(snapshot.get("work_mode")) or "Not specified",
        location_requirement=_text(snapshot.get("location_requirements")),
        payment=_payment_summary(snapshot),
        application_deadline=_text(snapshot.get("application_deadline")) or "",
        published_at=published_at or _text(record.get("created_at")) or "",
        accepting_applications=is_discoverable_and_application_ready(record, now),
        client=_safe_client(record),
    )


def _gig_detail(record: dict[str, Any], now: datetime) -> GigDetail:
    snapshot = published_snapshot(record)
    summary = _gig_summary(record, now)
    material_version = record.get("current_material_version")
    material_updated_at = _text(material_version.get("created_at")) if isinstance(material_version, dict) else None
    return GigDetail(
        **summary.model_dump(),
        description=_long_text(snapshot.get("description")) or "",
        deliverables=_string_list(snapshot.get("deliverables")),
        expected_weekly_commitment=_range_summary(snapshot.get("weekly_commitment")),
        expected_duration=_duration_summary(snapshot.get("expected_duration") or snapshot.get("engagement_duration")),
        project_deadline=_text(snapshot.get("project_deadline")),
        availability_reason=availability_reason(record, now),
        material_updated_at=material_updated_at or summary.published_at,
    )


def _safe_client(record: dict[str, Any]) -> SafeClientSummary:
    client = record.get("safe_client_profile")
    user = record.get("safe_client_user_profile")
    client = client if isinstance(client, dict) else {}
    user = user if isinstance(user, dict) else {}
    company_name = _text(client.get("company_name"))
    display_name = _text(user.get("full_name")) or company_name or "Client"
    return SafeClientSummary(
        display_name=display_name,
        company_name=company_name,
        company_summary=_text(client.get("bio")),
        industry=_text(client.get("industry")),
    )


def _payment_summary(snapshot: dict[str, Any]) -> PaymentSummary:
    payment = snapshot.get("client_payment")
    payment = payment if isinstance(payment, dict) else {}
    structure = str(snapshot.get("payment_structure"))
    currency = str(snapshot.get("currency"))
    budget = _range_summary(payment.get("budget")) or _range_from_fields(payment, "budget_min", "budget_max")
    hourly = _range_summary(payment.get("hourly_rate")) or _range_from_fields(
        payment, "hourly_rate_min", "hourly_rate_max"
    )
    weekly = _range_summary(payment.get("weekly_commitment_hours")) or _range_summary(
        payment.get("weekly_commitment")
    )
    guidance = payment.get("guidance")
    guidance = guidance if isinstance(guidance, dict) else payment
    guidance_range = _range_summary(guidance.get("budget") or guidance.get("market_range"))
    return PaymentSummary(
        payment_structure=PaymentStructure(structure),
        currency=currency,
        budget=budget,
        budget_flexibility=_text(payment.get("flexibility") or payment.get("budget_flexibility")),
        hourly_rate=hourly,
        weekly_commitment=weekly,
        engagement_duration=_duration_summary(payment.get("engagement_duration")),
        guidance_type=_text(guidance.get("guidance_type")),
        guidance_range=guidance_range,
        maximum_budget=_number(guidance.get("maximum")),
        no_estimate_explanation=_text(guidance.get("explanation")),
        preferred_proposal_form=_text(payment.get("preferred_proposal_form")),
    )


def _published_summary(snapshot: dict[str, Any], description: str) -> str:
    approved = _text(snapshot.get("summary") or snapshot.get("short_summary"))
    if approved:
        return approved
    if len(description) <= 240:
        return description
    return f"{description[:237].rstrip()}..."


def _snapshot_category(snapshot: dict[str, Any]) -> str:
    direct = _text(snapshot.get("tech_category") or snapshot.get("category"))
    scope = snapshot.get("scope")
    if direct:
        return direct
    if isinstance(scope, dict):
        return _text(scope.get("tech_category") or scope.get("category")) or "Other"
    return "Other"


def _range_summary(value: Any) -> StructuredRange | None:
    if not isinstance(value, dict):
        return None
    minimum = _number(value.get("minimum") if "minimum" in value else value.get("min"))
    maximum = _number(value.get("maximum") if "maximum" in value else value.get("max"))
    if minimum is None and maximum is None:
        return None
    return StructuredRange(minimum=minimum, maximum=maximum, unit=_text(value.get("unit")))


def _range_from_fields(value: dict[str, Any], minimum_key: str, maximum_key: str) -> StructuredRange | None:
    minimum = _number(value.get(minimum_key))
    maximum = _number(value.get(maximum_key))
    if minimum is None and maximum is None:
        return None
    return StructuredRange(minimum=minimum, maximum=maximum)


def _duration_summary(value: Any) -> DurationSummary | None:
    if not isinstance(value, dict):
        return None
    result = DurationSummary(
        mode=_text(value.get("mode")),
        unit=_text(value.get("unit")),
        exact_value=_number(value.get("exact_value")),
        minimum=_number(value.get("minimum") if "minimum" in value else value.get("min")),
        maximum=_number(value.get("maximum") if "maximum" in value else value.get("max")),
    )
    return result if any(item is not None for item in result.model_dump().values()) else None


def _number(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return float(value)


def _text(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    cleaned = " ".join(value.split())
    return cleaned or None


def _long_text(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    cleaned = value.replace("\r\n", "\n").replace("\r", "\n").strip()
    return cleaned or None


def _string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [cleaned for item in value if (cleaned := _text(item))]


def _discovery_sort_key(record: dict[str, Any]) -> tuple[str, str]:
    version = record.get("current_material_version")
    published_at = _text(version.get("created_at")) if isinstance(version, dict) else None
    return (published_at or _text(record.get("created_at")) or "", str(record.get("id") or ""))


__all__ = [
    "GigDetail",
    "GigDiscoveryEnvelope",
    "GigSummary",
    "GigTombstone",
    "get_auth_verifier",
    "get_marketplace_repository",
]
