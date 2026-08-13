import type { ManagedGig } from "./gigManagement";

export function isManagedGigEnvelope(value: unknown): value is { items: ManagedGig[] } {
  return isRecord(value) && Array.isArray(value.items) && value.items.every(isManagedGig);
}

export function isManagedGig(value: unknown): value is ManagedGig {
  if (!isRecord(value)) return false;
  return typeof value.gig_id === "string"
    && isRecord(value.terms)
    && ["draft", "active", "filled", "cancelled"].includes(String(value.lifecycle))
    && ["accepting", "closed"].includes(String(value.intake))
    && ["active", "paused"].includes(String(value.operations))
    && ["draft", "open", "paused", "closed_to_new_applications", "filled", "cancelled"].includes(String(value.product_state))
    && typeof value.accepting_applications === "boolean"
    && ["future", "expired_or_missing"].includes(String(value.deadline_status))
    && Number.isInteger(value.terms_contract_version)
    && typeof value.upgrade_required === "boolean"
    && typeof value.current_display_version_id === "string"
    && Number.isInteger(value.current_display_version_number)
    && typeof value.current_material_version_id === "string"
    && Number.isInteger(value.current_material_version_number)
    && typeof value.optimistic_concurrency_token === "string"
    && isStringArray(value.allowed_actions)
    && isStringArray(value.blocking_reason_codes)
    && Number.isInteger(value.active_application_count)
    && typeof value.effectively_active_selection_request === "boolean"
    && isRecord(value.latest_material_change_summary)
    && ["none", "current", "cancelled_not_reopened"].includes(String(value.engagement_state));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
