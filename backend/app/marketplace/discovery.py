"""Shared read-side gig discoverability and published-snapshot helpers."""

from __future__ import annotations

from datetime import date, datetime, time, timezone
from typing import Any

from app.marketplace.gigs import ApplicationIntake, OperationalState, OpportunityLifecycle

SUPPORTED_TERMS_CONTRACT_VERSION = 1
SUPPORTED_SNAPSHOT_SCHEMA_VERSION = 1
SUPPORTED_PAYMENT_STRUCTURES = {"fixed_price", "hourly", "open_to_proposals"}
SUPPORTED_WORK_MODES = {"remote", "hybrid", "onsite"}


def is_discoverable_and_application_ready(
    gig: dict[str, Any],
    now: datetime,
) -> bool:
    """Return the one authoritative 7C-A marketplace eligibility decision."""

    _require_aware_now(now)
    if gig.get("opportunity_lifecycle") != OpportunityLifecycle.ACTIVE.value:
        return False
    if gig.get("application_intake") != ApplicationIntake.ACCEPTING.value:
        return False
    if gig.get("operational_state") != OperationalState.ACTIVE.value:
        return False
    if gig.get("status") != "open":
        return False
    if not has_supported_application_contract(gig):
        return False

    snapshot = published_snapshot(gig)
    deadline = parse_application_deadline(snapshot.get("application_deadline"))
    return deadline is not None and deadline > now


def is_complete_published_snapshot(snapshot: Any) -> bool:
    """Validate the minimum supported, viewer-safe application contract."""

    if not isinstance(snapshot, dict):
        return False
    if snapshot.get("terms_contract_version") != SUPPORTED_TERMS_CONTRACT_VERSION:
        return False
    if snapshot.get("snapshot_schema_version") != SUPPORTED_SNAPSHOT_SCHEMA_VERSION:
        return False
    if not _non_empty_text(snapshot.get("title")) or not _non_empty_text(snapshot.get("description")):
        return False
    if not _category(snapshot):
        return False
    if not _string_list(snapshot.get("required_skills"), require_value=True):
        return False
    if not _string_list(snapshot.get("preferred_skills"), require_value=False):
        return False
    if not _string_list(snapshot.get("deliverables"), require_value=True):
        return False
    if not _non_empty_text(snapshot.get("experience_requirement")):
        return False
    if snapshot.get("work_mode") not in SUPPORTED_WORK_MODES:
        return False
    if parse_application_deadline(snapshot.get("application_deadline")) is None:
        return False

    payment_structure = snapshot.get("payment_structure")
    currency = snapshot.get("currency")
    client_payment = snapshot.get("client_payment")
    if payment_structure not in SUPPORTED_PAYMENT_STRUCTURES:
        return False
    if not isinstance(currency, str) or len(currency) != 3 or not currency.isalpha() or not currency.isupper():
        return False
    if not isinstance(client_payment, dict):
        return False
    if client_payment.get("payment_structure") != payment_structure:
        return False
    if client_payment.get("currency") != currency:
        return False
    if payment_structure == "fixed_price":
        return _valid_range(client_payment.get("budget")) or _valid_flat_range(
            client_payment, "budget_min", "budget_max"
        )
    if payment_structure == "hourly":
        rate_is_valid = _valid_range(client_payment.get("hourly_rate")) or _valid_flat_range(
            client_payment, "hourly_rate_min", "hourly_rate_max"
        )
        weekly_is_valid = _valid_range(
            client_payment.get("weekly_commitment_hours") or client_payment.get("weekly_commitment")
        )
        return rate_is_valid and weekly_is_valid and isinstance(client_payment.get("engagement_duration"), dict)

    guidance = client_payment.get("guidance")
    if not isinstance(guidance, dict):
        return False
    guidance_type = guidance.get("guidance_type")
    if guidance_type in ("indicative_budget_range", "expected_market_range"):
        guidance_value = guidance.get("budget") or guidance.get("market_range")
        guidance_is_valid = _valid_range(guidance_value)
    elif guidance_type == "maximum_budget_ceiling":
        guidance_is_valid = _positive_number(guidance.get("maximum"))
    elif guidance_type == "no_reliable_estimate":
        guidance_is_valid = _non_empty_text(guidance.get("explanation"))
    else:
        guidance_is_valid = False
    return guidance_is_valid and _non_empty_text(client_payment.get("preferred_proposal_form"))


def has_supported_application_contract(gig: dict[str, Any]) -> bool:
    """Require supported current display/material versions and complete terms."""

    return _has_supported_current_versions(gig) and is_complete_published_snapshot(published_snapshot(gig))


def published_snapshot(gig: dict[str, Any]) -> dict[str, Any]:
    version = gig.get("current_version")
    if not isinstance(version, dict):
        return {}
    snapshot = version.get("terms_snapshot")
    return snapshot if isinstance(snapshot, dict) else {}


def material_snapshot(gig: dict[str, Any]) -> dict[str, Any]:
    version = gig.get("current_material_version")
    if not isinstance(version, dict):
        return {}
    snapshot = version.get("terms_snapshot")
    return snapshot if isinstance(snapshot, dict) else {}


def parse_application_deadline(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    normalized = value.strip().replace("Z", "+00:00")
    try:
        if "T" not in normalized and " " not in normalized:
            parsed_date = date.fromisoformat(normalized)
            return datetime.combine(parsed_date, time.max, tzinfo=timezone.utc)
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return None
    return parsed.astimezone(timezone.utc)


def availability_reason(gig: dict[str, Any], now: datetime) -> str:
    """Return a stable viewer-safe reason for current application availability."""

    _require_aware_now(now)
    lifecycle = gig.get("opportunity_lifecycle")
    if lifecycle in (OpportunityLifecycle.FILLED.value, OpportunityLifecycle.CANCELLED.value):
        return "opportunity_no_longer_available"
    if lifecycle == OpportunityLifecycle.DRAFT.value:
        return "opportunity_not_published"
    if gig.get("operational_state") == OperationalState.PAUSED.value:
        return "opportunity_paused"
    if gig.get("application_intake") == ApplicationIntake.CLOSED.value:
        return "applications_closed"
    if not has_supported_application_contract(gig):
        return "opportunity_not_application_ready"
    deadline = parse_application_deadline(published_snapshot(gig).get("application_deadline"))
    if deadline is None or deadline <= now:
        return "application_deadline_passed"
    return "accepting_applications"


def gig_row_for_matching(gig: dict[str, Any]) -> dict[str, Any]:
    """Project explicit published fields into the existing matching builder shape."""

    snapshot = published_snapshot(gig)
    return {
        "id": gig.get("id"),
        "client_id": gig.get("client_id"),
        "title": snapshot.get("title"),
        "description": snapshot.get("description"),
        "tech_category": _category(snapshot),
        "required_skills": snapshot.get("required_skills", []),
        "preferred_skills": snapshot.get("preferred_skills", []),
        "difficulty_level": snapshot.get("difficulty_level"),
        "seniority_needed": snapshot.get("experience_requirement"),
        "deliverables": snapshot.get("deliverables", []),
        "status": gig.get("status"),
        "created_at": gig.get("created_at"),
        "updated_at": gig.get("updated_at"),
    }


def _has_supported_current_versions(gig: dict[str, Any]) -> bool:
    current_id = gig.get("current_gig_version_id")
    material_id = gig.get("current_material_gig_version_id")
    current = gig.get("current_version")
    material = gig.get("current_material_version")
    if not isinstance(current_id, str) or not isinstance(material_id, str):
        return False
    if not isinstance(current, dict) or not isinstance(material, dict):
        return False
    if current.get("id") != current_id or material.get("id") != material_id:
        return False
    if current.get("gig_id") != gig.get("id") or material.get("gig_id") != gig.get("id"):
        return False
    if current.get("terms_contract_version") != SUPPORTED_TERMS_CONTRACT_VERSION:
        return False
    if material.get("terms_contract_version") != SUPPORTED_TERMS_CONTRACT_VERSION:
        return False
    return is_complete_published_snapshot(material_snapshot(gig))


def _category(snapshot: dict[str, Any]) -> str | None:
    direct = snapshot.get("tech_category") or snapshot.get("category")
    if _non_empty_text(direct):
        return str(direct).strip()
    scope = snapshot.get("scope")
    if isinstance(scope, dict):
        nested = scope.get("tech_category") or scope.get("category")
        if _non_empty_text(nested):
            return str(nested).strip()
    return None


def _non_empty_text(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _string_list(value: Any, *, require_value: bool) -> bool:
    if not isinstance(value, list):
        return False
    if require_value and not value:
        return False
    return all(_non_empty_text(item) for item in value)


def _valid_range(value: Any) -> bool:
    if not isinstance(value, dict):
        return False
    minimum = value.get("minimum") if "minimum" in value else value.get("min")
    maximum = value.get("maximum") if "maximum" in value else value.get("max")
    return _ordered_positive_range(minimum, maximum)


def _valid_flat_range(value: dict[str, Any], minimum_key: str, maximum_key: str) -> bool:
    return _ordered_positive_range(value.get(minimum_key), value.get(maximum_key))


def _ordered_positive_range(minimum: Any, maximum: Any) -> bool:
    if not _positive_number(minimum) or not _positive_number(maximum):
        return False
    return float(minimum) <= float(maximum)


def _positive_number(value: Any) -> bool:
    return not isinstance(value, bool) and isinstance(value, (int, float)) and value > 0


def _require_aware_now(now: datetime) -> None:
    if not isinstance(now, datetime) or now.tzinfo is None or now.utcoffset() is None:
        raise ValueError("Discoverability requires an authoritative timezone-aware server time.")


__all__ = [
    "availability_reason",
    "gig_row_for_matching",
    "has_supported_application_contract",
    "is_complete_published_snapshot",
    "is_discoverable_and_application_ready",
    "material_snapshot",
    "parse_application_deadline",
    "published_snapshot",
]
