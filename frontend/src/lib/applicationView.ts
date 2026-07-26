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
