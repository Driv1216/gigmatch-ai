"""Canonical published-gig terms and 7C-B management contracts."""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any

from app.marketplace.discovery import is_complete_published_snapshot, parse_application_deadline
from app.marketplace.reasons import IntakeClosureReason


class GigManagementValidationError(ValueError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


MATERIAL_FIELDS = (
    "title",
    "description",
    "scope",
    "client_payment",
    "payment_structure",
    "currency",
    "required_skills",
    "preferred_skills",
    "experience_requirement",
    "difficulty_level",
    "work_mode",
    "location_requirements",
    "weekly_commitment",
    "expected_duration",
    "application_deadline",
    "project_deadline",
    "deliverables",
    "assumptions",
)


def canonical_complete_snapshot(value: dict[str, Any]) -> dict[str, Any]:
    """Return a complete normalized contract-one snapshot or fail closed."""

    if not isinstance(value, dict):
        raise GigManagementValidationError("invalid_terms_contract", "Gig terms must be an object.")
    snapshot = deepcopy(value)
    snapshot["terms_contract_version"] = 1
    snapshot["snapshot_schema_version"] = 1
    snapshot["version_kind"] = "initial_product_version"

    for key in ("title", "description", "experience_requirement", "work_mode", "currency"):
        snapshot[key] = _required_text(snapshot.get(key), key)
    snapshot["currency"] = snapshot["currency"].upper()
    snapshot["required_skills"] = _normalized_list(snapshot.get("required_skills"), "required_skills", True)
    snapshot["preferred_skills"] = _normalized_list(snapshot.get("preferred_skills", []), "preferred_skills", False)
    snapshot["deliverables"] = _normalized_list(snapshot.get("deliverables"), "deliverables", True)
    snapshot["assumptions"] = _normalized_list(snapshot.get("assumptions", []), "assumptions", False)

    scope = snapshot.get("scope")
    if not isinstance(scope, dict):
        raise GigManagementValidationError("invalid_terms_contract", "scope must be an object.")
    category = scope.get("tech_category") or scope.get("category")
    scope["tech_category"] = _required_text(category, "scope.tech_category")
    snapshot["scope"] = scope

    for key in ("application_deadline", "project_deadline"):
        raw = snapshot.get(key)
        if raw is None and key == "project_deadline":
            continue
        parsed = parse_application_deadline(raw)
        if parsed is None:
            raise GigManagementValidationError("invalid_aware_datetime", f"{key} must be timezone-aware.")
        snapshot[key] = parsed.astimezone(timezone.utc).isoformat()

    _validate_payment(snapshot)
    if not is_complete_published_snapshot(snapshot):
        raise GigManagementValidationError("invalid_terms_contract", "Complete supported marketplace terms are required.")
    return snapshot


def require_future_application_deadline(snapshot: dict[str, Any], now: datetime) -> None:
    if now.tzinfo is None or now.utcoffset() is None:
        raise ValueError("now must be timezone-aware")
    deadline = parse_application_deadline(snapshot.get("application_deadline"))
    if deadline is None or deadline <= now:
        raise GigManagementValidationError("future_deadline_required", "Application deadline must be in the future.")


def changed_fields(previous: dict[str, Any], candidate: dict[str, Any]) -> list[str]:
    fields: list[str] = []
    keys = sorted((set(previous) | set(candidate)) - {"version_kind", "terms_contract_version", "snapshot_schema_version"})
    for key in keys:
        if _display_value(previous.get(key)) != _display_value(candidate.get(key)):
            fields.append(key)
    return fields


def material_changed_fields(previous: dict[str, Any], candidate: dict[str, Any]) -> list[str]:
    return [
        key for key in MATERIAL_FIELDS
        if _material_value(key, previous.get(key)) != _material_value(key, candidate.get(key))
    ]


def _validate_payment(snapshot: dict[str, Any]) -> None:
    structure = snapshot.get("payment_structure")
    payment = snapshot.get("client_payment")
    if structure not in {"fixed_price", "hourly", "open_to_proposals"} or not isinstance(payment, dict):
        raise GigManagementValidationError("invalid_payment_terms", "Structured payment terms are required.")
    payment["payment_structure"] = structure
    payment["currency"] = snapshot["currency"]
    if structure == "fixed_price":
        _money_range(payment.get("budget"), "client_payment.budget")
        payment["flexibility"] = _required_text(payment.get("flexibility"), "client_payment.flexibility")
    elif structure == "hourly":
        _money_range(payment.get("hourly_rate"), "client_payment.hourly_rate")
        _decimal_range(payment.get("weekly_commitment_hours") or payment.get("weekly_commitment"), "weekly commitment")
        if not isinstance(payment.get("engagement_duration"), dict):
            raise GigManagementValidationError("invalid_payment_terms", "Hourly terms require engagement_duration.")
    else:
        guidance = payment.get("guidance")
        if not isinstance(guidance, dict) or guidance.get("guidance_type") not in {
            "indicative_budget_range", "maximum_budget_ceiling", "expected_market_range", "no_reliable_estimate"
        }:
            raise GigManagementValidationError("invalid_payment_terms", "Open terms require structured guidance.")
        payment["preferred_proposal_form"] = _required_text(
            payment.get("preferred_proposal_form"), "client_payment.preferred_proposal_form"
        )
    snapshot["client_payment"] = payment


def _money_range(value: Any, label: str) -> None:
    _decimal_range(value, label)


def _decimal_range(value: Any, label: str) -> None:
    if not isinstance(value, dict):
        raise GigManagementValidationError("invalid_payment_terms", f"{label} must be a range.")
    low = _decimal(value.get("minimum", value.get("min")), label)
    high = _decimal(value.get("maximum", value.get("max")), label)
    if low < 0 or high < low:
        raise GigManagementValidationError("invalid_payment_terms", f"{label} is invalid.")


def _decimal(value: Any, label: str) -> Decimal:
    if isinstance(value, bool):
        raise GigManagementValidationError("invalid_payment_terms", f"{label} must be numeric.")
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError):
        raise GigManagementValidationError("invalid_payment_terms", f"{label} must be numeric.") from None


def _required_text(value: Any, label: str) -> str:
    if not isinstance(value, str) or not (cleaned := value.replace("\r\n", "\n").replace("\r", "\n").strip()):
        raise GigManagementValidationError("invalid_terms_contract", f"{label} is required.")
    return cleaned


def _normalized_list(value: Any, label: str, required: bool) -> list[str]:
    if not isinstance(value, list):
        raise GigManagementValidationError("invalid_terms_contract", f"{label} must be a list.")
    by_key: dict[str, str] = {}
    for item in value:
        cleaned = _required_text(item, label)
        by_key.setdefault(" ".join(cleaned.split()).casefold(), " ".join(cleaned.split()))
    result = [by_key[key] for key in sorted(by_key)]
    if required and not result:
        raise GigManagementValidationError("invalid_terms_contract", f"{label} is required.")
    return result


def _display_value(value: Any) -> Any:
    if isinstance(value, str):
        return value.replace("\r\n", "\n").replace("\r", "\n").strip()
    if isinstance(value, list):
        return [_display_value(item) for item in value]
    if isinstance(value, dict):
        return {key: _display_value(value[key]) for key in sorted(value)}
    return value


def _material_value(key: str, value: Any) -> Any:
    if key in {"title", "description"} and isinstance(value, str):
        return " ".join(value.split()).casefold()
    if key in {"required_skills", "preferred_skills", "deliverables", "assumptions"} and isinstance(value, list):
        return sorted({" ".join(str(item).split()).casefold() for item in value})
    if isinstance(value, str):
        return " ".join(value.split()).casefold()
    if isinstance(value, list):
        return [_material_value(key, item) for item in value]
    if isinstance(value, dict):
        return {name: _material_value(name, value[name]) for name in sorted(value)}
    if isinstance(value, (int, float, Decimal)) and not isinstance(value, bool):
        return Decimal(str(value)).normalize()
    return value


__all__ = [
    "GigManagementValidationError",
    "IntakeClosureReason",
    "MATERIAL_FIELDS",
    "canonical_complete_snapshot",
    "changed_fields",
    "material_changed_fields",
    "require_future_application_deadline",
]
