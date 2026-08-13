import type { QaMessage, QaMode, QaThread, RevisionRequest } from "./qaContracts";

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

export function qaModeDescription(mode: QaMode): string {
  return {
    initial_clarification: "The client may use the server-projected permanent pre-advancement allowance. The freelancer may resolve open questions.",
    initial_response_only: "New pre-advancement client turns are stopped. Existing open questions may still be answered or declined.",
    advanced_discussion: "Both participants may use the backend-authorized structured discussion actions.",
    read_only: "The immutable discussion remains available. Individual report permission can remain available independently.",
  }[mode];
}

export function qaBlockerLabel(code: string): string {
  const labels: Record<string, string> = {
    gig_filled: "Gig filled",
    gig_cancelled: "Gig cancelled",
    gig_draft: "Gig is a draft",
    gig_paused: "Gig paused",
    application_confirmed: "Application confirmed",
    application_not_selected: "Application Not Selected",
    application_withdrawn: "Application withdrawn",
    application_closed_gig_cancelled: "Application closed with cancelled gig",
    returned_to_general_review: "Returned to Under Review after prior advancement",
    pre_advance_discussion_stopped: "Further pre-advancement client turns stopped",
    application_state_not_writable: "Current application state is not writable",
  };
  return labels[code] ?? labelCode(code);
}

export function revisionStatusLabel(status: RevisionRequest["status"]): string {
  return {
    open: "Open",
    fulfilled: "Updated proposal submitted",
    declined: "Declined",
    superseded: "Superseded by newer authority",
    closed_by_stage_change: "Closed by application-stage change",
    closed_by_gig_state: "Closed by gig state",
  }[status];
}

export function revisionConsequence(request: RevisionRequest): string {
  if (request.status === "open") return "The existing proposal remains official until an authorized complete update succeeds.";
  if (request.status === "fulfilled") return "A complete immutable proposal version was created and linked as the revision response.";
  if (request.status === "declined") return "No proposal version was created; the prior proposal remains official.";
  if (request.status === "superseded") return "A proposal or material-gig change made this exact-version request non-actionable.";
  if (request.status === "closed_by_stage_change") return "The application left the required stage; historical request evidence remains.";
  return "The gig lifecycle made this request non-actionable; historical request evidence remains.";
}

export function questionResolutionIds(messages: QaMessage[]): Set<string> {
  return new Set(messages.flatMap((message) =>
    (message.message_kind === "answer" || message.message_kind === "decline") && message.in_reply_to_message_id
      ? [message.in_reply_to_message_id]
      : [],
  ));
}

export function messageRelationship(message: QaMessage, messages: QaMessage[]): string | null {
  const reference = message.in_reply_to_message_id ?? message.corrects_message_id;
  if (!reference) return null;
  const source = messages.find((candidate) => candidate.id === reference);
  const sequence = source?.sequence_number ? `#${source.sequence_number}` : "outside this loaded page";
  return message.in_reply_to_message_id
    ? `Primary response to question ${sequence}`
    : `Append-only correction to message ${sequence}`;
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
    qa_action_not_allowed: "That action is no longer authorized for the current participant or thread mode.",
    invalid_question_response: "Review the structured response requirements and try again. Your draft is preserved.",
    invalid_message_reference: "The referenced message is no longer actionable. The current history has been refreshed.",
    invalid_revision_response: "The complete proposal revision did not satisfy current authoritative requirements. Your draft is preserved.",
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
    "qa_action_not_allowed",
    "invalid_message_reference",
    "pending_selection_blocks_revision",
    "invalid_revision_response",
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

function labelCode(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
