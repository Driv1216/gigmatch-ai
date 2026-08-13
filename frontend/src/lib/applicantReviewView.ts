import type { ApplicantStatus, ApplicantView } from "./applicantReviewContracts";

export type ApplicantInboxState = "loading" | "empty_active" | "empty_history" | "error" | "ready";

export function applicantInboxState(
  loading: boolean,
  error: string | null,
  count: number,
  status: ApplicantStatus,
): ApplicantInboxState {
  if (loading) return "loading";
  if (error) return "error";
  if (count) return "ready";
  return status === "active" ? "empty_active" : "empty_history";
}

export function validApplicantViews(status: ApplicantStatus, reviewActionsReady = false): ApplicantView[] {
  if (status !== "active") return ["newest", "best_match"];
  return reviewActionsReady
    ? ["best_match", "newest", "internal_shortlist", "advanced"]
    : ["best_match", "newest", "advanced"];
}

export function applicantScorePresentation(suitability: {
  ranking_status: string;
  ranking_score: number | null;
  match_label: string | null;
}): { label: string; score: string | null } {
  if (suitability.ranking_status !== "available" || suitability.ranking_score === null) {
    return { label: "Suitability unavailable", score: null };
  }
  return {
    label: suitability.match_label ?? "Calculated match",
    score: `${Math.round(suitability.ranking_score * 100)}%`,
  };
}

export function applicantRankingModeLabel(mode: string | null): string {
  if (mode === "hybrid") return "Hybrid keyword + semantic evidence";
  if (mode === "keyword_fallback") return "Keyword-only fallback evidence";
  return "No ranking mode available";
}

export function applicantRankingUnavailableMessage(reason: string | null): string {
  if (reason === "matching_input_unavailable") {
    return "Current supported matching input is unavailable. This applicant remains in the complete review pool.";
  }
  return reason
    ? `Suitability evidence is unavailable (${reason.replace(/_/g, " ")}).`
    : "Current suitability evidence is unavailable.";
}

export function applicantActionBlockerMessage(code: string): string {
  const messages: Record<string, string> = {
    gig_read_only: "The gig is read-only for applicant-review mutations.",
    application_terminal: "This application is in a terminal stage.",
    pending_selection_blocks_review_action: "An effective selection request blocks Return to Review and Not Selected.",
    gig_paused_for_stage_decisions: "The gig is paused. Private shortlist organization may continue, but applicant-visible stage decisions are blocked.",
  };
  return messages[code] ?? code.replace(/_/g, " ");
}

export function applicantReviewErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const code = "code" in error ? String(error.code) : "";
    const messages: Record<string, string> = {
      applicant_review_not_found: "This applicant review could not be found.",
      authentication_required: "Sign in again to review applicants.",
      client_role_required: "Applicant review is available to client accounts.",
      stale_review_action: "The applicant or gig changed. Review the refreshed state before trying again.",
      shortlist_capacity_reached: "The internal shortlist is at its configured capacity.",
      advancement_capacity_reached: "The active advancement limit has been reached.",
      pending_selection_blocks_review_action: "An effective selection request blocks this review action.",
      review_action_not_allowed: "This review action is no longer allowed in the current state.",
      invalid_not_selected_decision: "Complete the required structured Not Selected decision fields.",
      invalid_reopen_decision: "Choose a valid reopen reason and explanation.",
    };
    return messages[code] ?? error.message;
  }
  return "Applicant review is unavailable right now.";
}

export function shouldRefreshApplicantReviewAfterError(code: string): boolean {
  return [
    "stale_review_action",
    "shortlist_capacity_reached",
    "advancement_capacity_reached",
    "pending_selection_blocks_review_action",
    "review_action_not_allowed",
  ].includes(code);
}

export function notSelectedDecisionReady(input: {
  stage: string;
  reason: string;
  otherExplanation: string;
  feedback: string;
  finalConfirmed: boolean;
}): boolean {
  if (input.reason === "other" && !input.otherExplanation.trim()) return false;
  if (input.stage === "advanced" && (!input.feedback.trim() || !input.finalConfirmed)) return false;
  return true;
}

export function reopenDecisionReady(reason: string, explanation: string): boolean {
  return reason !== "other" || Boolean(explanation.trim());
}

export function formatReviewDate(value: unknown): string {
  if (typeof value !== "string" || !value) return "Unavailable";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Unavailable" : date.toLocaleString();
}
