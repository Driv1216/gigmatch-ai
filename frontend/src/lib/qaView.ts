import type { QaMessage, QaMode, QaThread } from "./qaContracts";

const SAFETY_CODES = new Set([
  "contact_information_not_allowed",
  "external_communication_request_not_allowed",
  "credential_request_not_allowed",
  "financial_identifier_not_allowed",
  "message_safety_violation",
]);

export function qaModeLabel(mode: QaMode): string {
  return {
    initial_clarification: "Initial clarification",
    initial_response_only: "Response only",
    advanced_discussion: "Advanced structured discussion",
    read_only: "Read-only history",
  }[mode];
}

export function qaErrorMessage(error: unknown): string {
  const code = errorCode(error);
  if (SAFETY_CODES.has(code)) {
    return "Contact, credential, or financial identifiers cannot be shared before an engagement. Edit the message and keep the discussion on GigMatch.";
  }
  const messages: Record<string, string> = {
    qa_rate_limit_exceeded: retryAfter(error)
      ? `Message limit reached. Try again in about ${retryAfter(error)} seconds. Your draft is preserved.`
      : "Message limit reached. Please wait before trying again. Your draft is preserved.",
    initial_question_limit_reached: "The two initial clarification turns are already used. Advance the applicant for further discussion.",
    pre_advance_discussion_stopped: "The freelancer stopped further pre-advancement discussion.",
    question_already_resolved: "That question already has an answer or decline response.",
    qa_thread_read_only: "The application or gig state changed. This Q&A is now read-only.",
    idempotency_conflict: "This retry key was already used for different content. Review the latest thread before retrying.",
    revision_request_already_open: "One proposal-revision request is already open.",
    revision_request_not_actionable: "That proposal-revision request is no longer actionable.",
    revision_request_superseded: "The proposal or gig terms changed, so this request was superseded.",
    stale_application_version: "The proposal changed. Review the current version before continuing.",
    stale_gig_version: "The gig terms changed. Review the current terms before continuing.",
    pending_selection_blocks_revision: "A pending selection request blocks proposal revision.",
  };
  return messages[code] ?? "Unable to update structured Q&A. Review the current state and try again.";
}

export function chronologicalMessages(messages: QaMessage[]): QaMessage[] {
  return [...messages].sort((a, b) => a.sequence_number - b.sequence_number);
}

export function qaPanelState(
  loading: boolean,
  thread: QaThread | null,
): "loading" | "error" | "empty" | "ready" {
  if (loading) return "loading";
  if (!thread) return "error";
  return thread.messages.length ? "ready" : "empty";
}

export function qaCanCompose(thread: QaThread): boolean {
  return thread.permissions.ask_initial_question ||
    thread.permissions.send_advanced_question ||
    thread.permissions.send_clarification;
}

export function requiresAuthoritativeRefresh(error: unknown): boolean {
  return [
    "initial_question_limit_reached",
    "pre_advance_discussion_stopped",
    "question_already_resolved",
    "qa_thread_read_only",
    "idempotency_conflict",
    "revision_request_already_open",
    "revision_request_not_actionable",
    "revision_request_superseded",
    "stale_application_version",
    "stale_gig_version",
  ].includes(errorCode(error));
}

export function likelySensitiveContent(value: string): boolean {
  return [
    /[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/i,
    /(?:^|\D)\+?\d[\d ()-]{8,}\d(?:\D|$)/,
    /https?:\/\/|www\./i,
    /\b(?:whatsapp|telegram|discord|signal)\s*(?:me|at|:|@)/i,
    /\b(?:move|continue|contact|message|reach)\W+(?:me\s+)?(?:off[- ]platform|outside\s+gigmatch)\b/i,
    /\b(?:send|share|provide|tell|give|enter)\b[^.!?]{0,40}\b(?:password|passcode|otp|one[- ]time password|api key|access token|secret key|private key)\b/i,
    /(?:^|[^\w-])sk-[\w-]{16,}/i,
    /\b(?:send|share|provide|enter)\b[^.!?]{0,40}\b(?:bank account|account number|routing number|ifsc|upi id|payment identifier)\b/i,
    /[\w._-]+@[A-Za-z]{2,15}\s*(?:upi|pay)\b/i,
  ].some((pattern) => pattern.test(value));
}

function errorCode(error: unknown): string {
  return error instanceof Error && "code" in error ? String(error.code) : "qa_service_unavailable";
}

function retryAfter(error: unknown): number | null {
  if (!(error instanceof Error) || !("retryAfter" in error)) return null;
  const value = Number(error.retryAfter);
  return Number.isFinite(value) && value > 0 ? value : null;
}
