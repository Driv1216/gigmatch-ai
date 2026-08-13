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

const QA_MODES: QaMode[] = [
  "initial_clarification",
  "initial_response_only",
  "advanced_discussion",
  "read_only",
];

const MESSAGE_KINDS: QaMessage["message_kind"][] = [
  "initial_question",
  "question",
  "answer",
  "clarification",
  "decline",
  "correction",
];

const REVISION_STATUSES: RevisionRequest["status"][] = [
  "open",
  "fulfilled",
  "declined",
  "superseded",
  "closed_by_stage_change",
  "closed_by_gig_state",
];

const PERMISSION_KEYS: Array<keyof QaPermissions> = [
  "ask_initial_question",
  "send_advanced_question",
  "send_clarification",
  "answer_question",
  "decline_question",
  "correct_own_message",
  "report_message",
  "stop_pre_advancement",
  "create_revision_request",
  "respond_to_revision_request",
];

export function isQaThread(value: unknown): value is QaThread {
  if (!isRecord(value) || !nonEmptyString(value.application_id) ||
    !nonEmptyString(value.gig_id) || !nonEmptyString(value.current_application_stage) ||
    !nonEmptyString(value.current_application_version_id) ||
    !nonEmptyString(value.current_material_gig_version_id) ||
    !nonEmptyString(value.application_version_token) ||
    !["client", "freelancer"].includes(String(value.viewer_role)) ||
    !QA_MODES.includes(value.mode as QaMode) || !isPermissions(value.permissions) ||
    !isAllowance(value.initial_question_allowance) ||
    typeof value.pre_advance_discussion_stopped !== "boolean" ||
    !nonNegativeInteger(value.pending_question_count) ||
    !nonNegativeInteger(value.pending_question_count_for_other_participant) ||
    typeof value.qa_requires_attention !== "boolean" ||
    !Array.isArray(value.messages) || !value.messages.every(isQaMessage) ||
    !Array.isArray(value.revision_history) || !value.revision_history.every(isRevision) ||
    !isPagination(value.pagination) || !stringArray(value.blockers) ||
    typeof value.proposal_authority_notice !== "string" ||
    !(value.latest_qa_activity_at === null || typeof value.latest_qa_activity_at === "string")) return false;
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
  return isRecord(value) && nonEmptyString(value.id) &&
    positiveInteger(value.sequence_number) &&
    ["client", "freelancer"].includes(String(value.sender_role)) &&
    MESSAGE_KINDS.includes(value.message_kind as QaMessage["message_kind"]) &&
    typeof value.is_mine === "boolean" && typeof value.created_at === "string" &&
    nullableString(value.topic) && nullableString(value.other_topic_detail) &&
    nullableString(value.body) && nullableString(value.in_reply_to_message_id) &&
    nullableString(value.corrects_message_id) && nullableString(value.decline_reason_code) &&
    nullableString(value.decline_reason_detail) && typeof value.reported_by_viewer === "boolean";
}

function isRevision(value: unknown): value is RevisionRequest {
  return isRecord(value) && nonEmptyString(value.id) &&
    REVISION_STATUSES.includes(value.status as RevisionRequest["status"]) &&
    nonEmptyString(value.requested_application_version_id) &&
    nonEmptyString(value.requested_material_gig_version_id) &&
    nonEmptyString(value.reason_code) && typeof value.created_at === "string" &&
    nullableString(value.reason_detail) && nullableString(value.terminal_at) &&
    nullableString(value.response_application_version_id) &&
    nullableString(value.response_reason_code) && nullableString(value.response_reason_detail);
}

function isPermissions(value: unknown): value is QaPermissions {
  return isRecord(value) && PERMISSION_KEYS.every((key) => typeof value[key] === "boolean");
}

function isAllowance(value: unknown): value is QaThread["initial_question_allowance"] {
  return isRecord(value) && nonNegativeInteger(value.used) && nonNegativeInteger(value.remaining) &&
    nonNegativeInteger(value.limit) && value.used + value.remaining === value.limit;
}

function isPagination(value: unknown): value is QaThread["pagination"] {
  return isRecord(value) && typeof value.has_more === "boolean" &&
    (value.before_sequence === null || positiveInteger(value.before_sequence)) &&
    positiveInteger(value.limit);
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function positiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
