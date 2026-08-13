export type ApplicationViewState = "loading" | "empty" | "error" | "ready";

export function applicationCollectionState(loading: boolean, error: string | null, count: number): ApplicationViewState {
  if (loading) return "loading";
  if (error) return "error";
  return count ? "ready" : "empty";
}

export function contextAction(context: { can_apply: boolean; blocker: string | null; existing_application_id: string | null }) {
  if (context.can_apply) return { label: "Apply now", destination: "apply" };
  if (context.blocker === "application_already_exists" && context.existing_application_id) {
    return { label: "View your application", destination: `/applications/${encodeURIComponent(context.existing_application_id)}` };
  }
  return { label: blockerMessage(context.blocker), destination: null };
}

type GigApplicationContext = {
  can_apply: boolean;
  blocker: string | null;
  existing_application_id: string | null;
};

export type GigApplicationPanel =
  | { kind: "hidden" }
  | { kind: "loading"; label: string }
  | { kind: "error"; label: string }
  | { kind: "action"; label: string; destination: "apply" | string }
  | { kind: "blocker"; label: string };

export function gigApplicationPanel(
  role: string | null,
  state: "idle" | "loading" | "ready" | "error",
  context: GigApplicationContext | null,
): GigApplicationPanel {
  if (role !== "freelancer") return { kind: "hidden" };
  if (state === "loading" || state === "idle") {
    return { kind: "loading", label: "Confirming application availability with the marketplace…" };
  }
  if (state === "error" || !context) {
    return { kind: "error", label: "Application availability could not be confirmed. No application action is available until the current context loads." };
  }
  const action = contextAction(context);
  return action.destination
    ? { kind: "action", label: action.label, destination: action.destination }
    : { kind: "blocker", label: action.label };
}

export function applicationSubmissionErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    stale_gig_terms: "The gig terms changed. Review the refreshed terms before submitting again; your form draft is preserved.",
    application_already_exists: "You already have an application for this gig.",
    application_deadline_passed: "The application deadline has passed.",
    invalid_financial_proposal: "The proposal does not satisfy the published financial terms.",
  };
  return messages[code] ?? code.replace(/_/g, " ");
}

export function applicationRecordErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    authentication_required: "Your session is no longer available. Sign in again to review this application.",
    freelancer_profile_required: "This account does not have the freelancer marketplace profile required to load application records.",
    application_not_found: "This application is not available to your account.",
    stale_application_version: "The application changed while this action was open. The authoritative record has been reloaded; review it before trying again.",
    stale_gig_terms: "The material gig terms changed while this draft was open. Your draft is preserved; review the refreshed terms before trying again.",
    gig_terms_changed_again: "The gig changed again while this response was open. Your draft is preserved; review the refreshed comparison before trying again.",
    application_edit_not_allowed: "The current application stage no longer permits an ordinary edit.",
    response_to_updated_gig_required: "Respond to the changed material gig terms before making an ordinary edit.",
    no_updated_gig_response_required: "The application already answers the current material gig terms.",
    existing_proposal_incompatible_with_updated_terms: "The existing proposal is incompatible with the changed terms. Submit a complete updated proposal instead.",
    pending_selection_blocks_application_withdrawal: "An effective selection request currently blocks withdrawal.",
    application_withdrawal_not_allowed: "Withdrawal is not available in the current application state.",
    reapplication_not_allowed: "Material-change reapplication is no longer available for this application.",
    invalid_financial_proposal: "The proposal does not satisfy the current authoritative financial terms.",
    application_service_unavailable: "The application service is unavailable. No change was made.",
  };
  return messages[code] ?? code.replace(/_/g, " ");
}

export function applicationVersionOriginLabel(origin: string): string {
  const labels: Record<string, string> = {
    initial_submission: "Initial submission",
    freelancer_edit: "Freelancer edit",
    gig_change_terms_reaffirmed: "Changed terms reaffirmed",
    gig_change_proposal_updated: "Proposal updated for changed terms",
    gig_change_reapplication: "Material-change reapplication",
    reconsideration: "Reconsideration proposal",
    qa_revision: "Q&A proposal revision",
    proposal_revision: "Proposal revision",
  };
  return labels[origin] ?? statusLabel(origin);
}

export function applicationBlockerMessage(code: string): string {
  const messages: Record<string, string> = {
    pending_selection_blocks_application_withdrawal: "An effective selection request blocks withdrawal.",
    response_to_updated_gig_required: "A response to current material gig terms is required.",
    application_terminal: "This application belongs to a terminal gig record.",
  };
  return messages[code] ?? statusLabel(code);
}

export function formatApplicationTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Time unavailable";
  return parsed.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function proposalContractVersion(application: Record<string, unknown>): number | null {
  const value = application.proposal;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const version = (value as Record<string, unknown>).proposal_contract_version;
  return typeof version === "number" && version > 0 ? version : null;
}

export function blockerMessage(blocker: string | null): string {
  const messages: Record<string, string> = {
    gig_paused: "This gig is paused.", applications_closed: "Applications are closed.",
    application_deadline_passed: "The application deadline has passed.", gig_filled: "This gig is filled.",
    gig_cancelled: "This gig was cancelled.", application_already_exists: "You already applied to this gig.",
  };
  return messages[blocker ?? ""] ?? "This gig is not accepting applications.";
}

export function validateProposal(input: Record<string, unknown>, paymentStructure: string, postedMaximum?: number): string[] {
  const errors: string[] = [];
  const cover = String(input.cover_note ?? "").trim();
  if (!cover) errors.push("Cover note is required.");
  const included = lines(input.included_work);
  const excluded = lines(input.excluded_work);
  const assumptions = lines(input.assumptions);
  const factors = lines(input.estimate_change_factors);
  const positive = (value: unknown) => Number(value) > 0;
  if (!String(input.available_from ?? "")) errors.push("Available-from date is required.");
  if (input.timeline_mode === "exact" && !positive(input.timeline_exact)) errors.push("Enter a positive exact timeline.");
  if (input.timeline_mode === "range" && (!positive(input.timeline_minimum) || !positive(input.timeline_maximum) || Number(input.timeline_minimum) > Number(input.timeline_maximum))) {
    errors.push("Enter an ordered positive timeline range.");
  }
  if (paymentStructure === "fixed_price") {
    const mode = String(input.proposal_mode ?? "");
    if (mode === "exact_total" && !positive(input.exact_total)) errors.push("Enter a positive total.");
    if (mode === "total_range" && (!positive(input.minimum) || !positive(input.maximum) || Number(input.minimum) > Number(input.maximum))) {
      errors.push("Enter an ordered positive total range.");
    }
    const proposed = mode === "exact_total" ? Number(input.exact_total) : mode === "total_range" ? Number(input.maximum) : 0;
    if (postedMaximum && proposed > postedMaximum && !String(input.range_explanation ?? "").trim()) {
      errors.push("Explain why the proposal is above the posted budget.");
    }
  } else if (paymentStructure === "hourly") {
    if (!positive(input.hourly_rate)) errors.push("Enter a positive hourly rate.");
    if (!positive(input.weekly_minimum) || !positive(input.weekly_maximum) || Number(input.weekly_minimum) > Number(input.weekly_maximum)) {
      errors.push("Enter an ordered weekly availability range.");
    }
  } else {
    if (!included.length || !excluded.length || !assumptions.length || !factors.length) {
      errors.push("Open proposals require included work, excluded work, assumptions, and estimate-change factors.");
    }
    const mode = String(input.proposal_mode ?? "");
    if (mode === "estimated_fixed_price_range" && (!positive(input.minimum) || !positive(input.maximum) || Number(input.minimum) > Number(input.maximum))) errors.push("Enter an ordered fixed-price range.");
    if (mode === "proposed_hourly_rate" && !positive(input.hourly_rate)) errors.push("Enter a positive hourly rate.");
    if (mode === "phased_estimate" && (!positive(input.phase_amount) || !String(input.phase_name ?? "").trim())) errors.push("Enter one valid pricing phase.");
    if (mode === "initial_discovery_phase" && (!positive(input.discovery_amount) || !String(input.discovery_scope ?? "").trim())) errors.push("Enter discovery scope and amount.");
  }
  if (!included.length) errors.push("Included work is required.");
  return errors;
}

export function lines(value: unknown): string[] {
  return String(value ?? "").split("\n").map((item) => item.trim()).filter(Boolean);
}

export function statusLabel(stage: string): string {
  return stage.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function applicationClosureReason(reason: unknown): string | null {
  if (reason === "another_applicant_selected") {
    return "Another applicant was selected for this gig.";
  }
  if (reason === "gig_cancelled") {
    return "The client cancelled this gig.";
  }
  if (typeof reason !== "string" || !reason.trim()) {
    return null;
  }
  return statusLabel(reason);
}

export function canReaffirmApplication(detail: {
  response_to_updated_gig_required: boolean;
  compatibility: { can_reaffirm_existing_proposal: boolean };
  allowed_actions: string[];
}): boolean {
  return detail.response_to_updated_gig_required && detail.compatibility.can_reaffirm_existing_proposal &&
    detail.allowed_actions.includes("reaffirm_updated_gig_terms");
}

export function applicationEditMode(actions: string[], requested: string | null): "edit" | "update" | "reapply" | "unavailable" {
  if (requested === "update") return actions.includes("update_for_gig_change") ? "update" : "unavailable";
  if (requested === "reapply") return actions.includes("reapply_after_gig_change") ? "reapply" : "unavailable";
  return actions.includes("edit_application") ? "edit" : "unavailable";
}

export function sortVersions<T extends { version_number: number }>(items: T[]): T[] {
  return [...items].sort((left, right) => right.version_number - left.version_number);
}
