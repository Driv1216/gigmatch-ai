export type ManagementActionState = {
  canPublish: boolean;
  canUpgrade: boolean;
  canEdit: boolean;
  canCloseIntake: boolean;
  canReopenIntake: boolean;
  canPause: boolean;
  canResume: boolean;
  canCancel: boolean;
  pendingSelectionWarning: boolean;
};

export function managementActionState(allowedActions: string[], blockingReasonCodes: string[]): ManagementActionState {
  const has = (action: string) => allowedActions.includes(action);
  return {
    canPublish: has("publish"), canUpgrade: has("upgrade"), canEdit: has("edit_published") || has("edit_draft"),
    canCloseIntake: has("close_intake"), canReopenIntake: has("reopen_intake") && !blockingReasonCodes.includes("future_deadline_required"),
    canPause: has("pause") && !blockingReasonCodes.includes("pending_selection_blocks_pause"),
    canResume: has("resume"), canCancel: has("cancel"),
    pendingSelectionWarning: blockingReasonCodes.includes("pending_selection_blocks_pause"),
  };
}

export function stableManagementErrorMessage(code: string): string {
  return {
    stale_gig_version: "This gig changed in another tab. Reload it before saving again.",
    material_change_confirmation_required: "Review and confirm the updated applicant consequences.",
    material_change_consequences_changed: "Consequences changed while you were reviewing. Review the refreshed counts.",
    pending_selection_blocks_pause: "An unexpired selection request must end before this gig can be paused.",
    future_deadline_required: "Set a future application deadline before continuing.",
    unsupported_contract_upgrade_required: "Complete the supported terms to upgrade this legacy gig.",
    legacy_dependency_reconciliation_required: "This legacy gig has marketplace history that requires reconciliation before upgrade.",
    no_effective_change: "No effective change was detected.",
    invalid_gig_transition: "This action is no longer available for the gig's current state.",
    invalid_terms_contract: "Complete supported gig terms are required before this action can continue.",
    invalid_aware_datetime: "Application and project deadlines must include a valid timezone.",
    invalid_payment_terms: "Complete supported payment terms are required.",
    invalid_intake_closure: "Choose a valid structured reason before closing application intake.",
    invalid_pause: "Choose a valid structured reason before pausing this gig.",
    invalid_pause_reason: "Choose a valid structured reason before pausing this gig.",
    invalid_cancellation: "Complete the cancellation reason, applicant explanation, and explicit confirmation.",
    not_gig_owner: "This owned gig record was not found.",
    gig_management_unavailable: "Gig management is temporarily unavailable. Try again without changing your draft.",
    invalid_owner_gig_response: "The gig management response could not be verified. No action was taken.",
  }[code] ?? "We could not complete this gig action. Reload and try again.";
}

export function materialConfirmationText(changedFields: string[], affectedCount: number, selectionEffect: string): string {
  return `${changedFields.join(", ")} · ${affectedCount} active application${affectedCount === 1 ? "" : "s"} · ${selectionEffect.replace(/_/g, " ")}`;
}

export const LATER_MILESTONE_CONTROLS = ["submit_application", "advance_applicant", "send_selection_request", "accept_selection", "decline_selection"] as const;

export function versionRelationship(displayVersion: number, materialVersion: number): "aligned" | "display_only_correction" {
  return displayVersion === materialVersion ? "aligned" : "display_only_correction";
}

export function latestMaterialChangedFields(summary: Record<string, unknown>): string[] {
  return Array.isArray(summary.changed_fields)
    ? summary.changed_fields.filter((value): value is string => typeof value === "string")
    : [];
}
