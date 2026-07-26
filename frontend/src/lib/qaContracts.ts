export type QaMode =
  | "initial_clarification"
  | "initial_response_only"
  | "advanced_discussion"
  | "read_only";

export type QaPermissions = {
  ask_initial_question: boolean;
  send_advanced_question: boolean;
  send_clarification: boolean;
  answer_question: boolean;
  decline_question: boolean;
  correct_own_message: boolean;
  report_message: boolean;
  stop_pre_advancement: boolean;
  create_revision_request: boolean;
  respond_to_revision_request: boolean;
};

export type QaMessage = {
  id: string;
  sequence_number: number;
  sender_role: "client" | "freelancer";
  is_mine: boolean;
  message_kind: "initial_question" | "question" | "answer" | "clarification" | "decline" | "correction";
  topic: string | null;
  other_topic_detail: string | null;
  body: string | null;
  in_reply_to_message_id: string | null;
  corrects_message_id: string | null;
  decline_reason_code: string | null;
  decline_reason_detail: string | null;
  created_at: string;
  reported_by_viewer: boolean;
};

export type RevisionRequest = {
  id: string;
  requested_application_version_id: string;
  requested_material_gig_version_id: string;
  reason_code: string;
  reason_detail: string | null;
  status: "open" | "fulfilled" | "declined" | "superseded" | "closed_by_stage_change" | "closed_by_gig_state";
  created_at: string;
  terminal_at: string | null;
  response_application_version_id: string | null;
  response_reason_code: string | null;
  response_reason_detail: string | null;
};

export type QaThread = {
  application_id: string;
  gig_id: string;
  current_application_stage: string;
  current_application_version_id: string;
  current_material_gig_version_id: string;
  application_version_token: string;
  viewer_role: "client" | "freelancer";
  mode: QaMode;
  permissions: QaPermissions;
  initial_question_allowance: { used: number; remaining: number; limit: number };
  pre_advance_discussion_stopped: boolean;
  pending_question_count: number;
  pending_question_count_for_other_participant: number;
  qa_requires_attention: boolean;
  open_revision_request: RevisionRequest | null;
  revision_history: RevisionRequest[];
  latest_qa_activity_at: string | null;
  messages: QaMessage[];
  pagination: { has_more: boolean; before_sequence: number | null; limit: number };
  blockers: string[];
  proposal_authority_notice: string;
};

export type QaIndicator = {
  pending_question_count: number;
  awaiting_other_participant_response_count: number;
  open_revision_request_count: number;
  qa_requires_attention: boolean;
  latest_qa_activity_at: string | null;
};

export function isQaThread(value: unknown): value is QaThread {
  if (!isRecord(value) || typeof value.application_id !== "string" ||
    !["client", "freelancer"].includes(String(value.viewer_role)) ||
    !["initial_clarification", "initial_response_only", "advanced_discussion", "read_only"]
      .includes(String(value.mode)) ||
    !isRecord(value.permissions) || !isRecord(value.initial_question_allowance) ||
    !Array.isArray(value.messages) || !value.messages.every(isQaMessage) ||
    !Array.isArray(value.revision_history) || !value.revision_history.every(isRevision) ||
    !isRecord(value.pagination)) return false;
  return value.open_revision_request === null || isRevision(value.open_revision_request);
}

export function isQaIndicator(value: unknown): value is QaIndicator {
  return isRecord(value) &&
    typeof value.pending_question_count === "number" &&
    typeof value.awaiting_other_participant_response_count === "number" &&
    typeof value.open_revision_request_count === "number" &&
    typeof value.qa_requires_attention === "boolean";
}

function isQaMessage(value: unknown): value is QaMessage {
  return isRecord(value) && typeof value.id === "string" &&
    typeof value.sequence_number === "number" &&
    typeof value.message_kind === "string" &&
    typeof value.is_mine === "boolean" &&
    typeof value.created_at === "string";
}

function isRevision(value: unknown): value is RevisionRequest {
  return isRecord(value) && typeof value.id === "string" &&
    typeof value.status === "string" &&
    typeof value.requested_application_version_id === "string" &&
    typeof value.requested_material_gig_version_id === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
