import assert from "node:assert/strict";
import test from "node:test";

import { isQaIndicator, isQaThread } from "../src/lib/qaContracts.ts";
import {
  chronologicalMessages,
  likelySensitiveContent,
  qaCanCompose,
  qaErrorMessage,
  qaModeLabel,
  qaPanelState,
  requiresAuthoritativeRefresh,
} from "../src/lib/qaView.ts";

const permissions = {
  ask_initial_question: true,
  send_advanced_question: false,
  send_clarification: false,
  answer_question: false,
  decline_question: false,
  correct_own_message: true,
  report_message: true,
  stop_pre_advancement: false,
  create_revision_request: false,
  respond_to_revision_request: false,
};
const message = {
  id: "message-1",
  sequence_number: 1,
  sender_role: "client",
  is_mine: true,
  message_kind: "initial_question",
  topic: "timeline",
  other_topic_detail: null,
  body: "Could you confirm the timeline?",
  in_reply_to_message_id: null,
  corrects_message_id: null,
  decline_reason_code: null,
  decline_reason_detail: null,
  created_at: "2026-07-25T00:00:00Z",
  reported_by_viewer: false,
};
const thread = {
  application_id: "application-1",
  gig_id: "gig-1",
  current_application_stage: "under_review",
  current_application_version_id: "version-1",
  current_material_gig_version_id: "gig-version-1",
  application_version_token: "t".repeat(64),
  viewer_role: "client",
  mode: "initial_clarification",
  permissions,
  initial_question_allowance: { used: 1, remaining: 1, limit: 2 },
  pre_advance_discussion_stopped: false,
  pending_question_count: 0,
  pending_question_count_for_other_participant: 1,
  qa_requires_attention: false,
  open_revision_request: null,
  revision_history: [],
  latest_qa_activity_at: "2026-07-25T00:00:00Z",
  messages: [message],
  pagination: { has_more: false, before_sequence: null, limit: 30 },
  blockers: [],
  proposal_authority_notice: "Messages do not change the official proposal.",
};

test("thread runtime contract covers empty/write/read-only modes without internal fields", () => {
  assert.equal(isQaThread(thread), true);
  assert.equal(isQaThread({ ...thread, mode: "casual_chat" }), false);
  assert.equal(isQaThread({ ...thread, messages: [{ ...message, sequence_number: "1" }] }), false);
  assert.equal("request_fingerprint" in thread, false);
  assert.equal(qaModeLabel("initial_clarification"), "Initial clarification");
  assert.equal(qaModeLabel("initial_response_only"), "Response only");
  assert.equal(qaModeLabel("advanced_discussion"), "Advanced structured discussion");
  assert.equal(qaModeLabel("read_only"), "Read-only history");
});

test("panel view states cover loading, error, empty, and ready rendering", () => {
  assert.equal(qaPanelState(true, null), "loading");
  assert.equal(qaPanelState(false, null), "error");
  assert.equal(qaPanelState(false, { ...thread, messages: [] }), "empty");
  assert.equal(qaPanelState(false, thread), "ready");
});

test("mode permissions expose only real composer states", () => {
  assert.equal(qaCanCompose(thread), true);
  assert.equal(qaCanCompose({
    ...thread,
    mode: "initial_response_only",
    permissions: {
      ...permissions,
      ask_initial_question: false,
      correct_own_message: false,
      answer_question: true,
      decline_question: true,
    },
  }), false);
  assert.equal(qaCanCompose({
    ...thread,
    mode: "advanced_discussion",
    permissions: {
      ...permissions,
      ask_initial_question: false,
      send_advanced_question: true,
      send_clarification: true,
    },
  }), true);
  assert.equal(qaCanCompose({
    ...thread,
    mode: "read_only",
    permissions: Object.fromEntries(
      Object.keys(permissions).map((key) => [key, key === "report_message"]),
    ),
  }), false);
});

test("cursor pages render in deterministic chronological order", () => {
  const ordered = chronologicalMessages([
    { ...message, id: "m3", sequence_number: 3 },
    { ...message, id: "m1", sequence_number: 1 },
    { ...message, id: "m2", sequence_number: 2 },
  ]);
  assert.deepEqual(ordered.map((item) => item.sequence_number), [1, 2, 3]);
});

test("initial allowance and response indicators are explicit and not read receipts", () => {
  assert.deepEqual(thread.initial_question_allowance, { used: 1, remaining: 1, limit: 2 });
  const indicator = {
    pending_question_count: 2,
    awaiting_other_participant_response_count: 0,
    open_revision_request_count: 1,
    qa_requires_attention: true,
    latest_qa_activity_at: "2026-07-25T00:00:00Z",
  };
  assert.equal(isQaIndicator(indicator), true);
  assert.equal("unread_count" in indicator, false);
  assert.equal("seen" in indicator, false);
});

test("safety warning catches high-confidence contact and credential patterns", () => {
  assert.equal(likelySensitiveContent("email me at buyer@example.com"), true);
  assert.equal(likelySensitiveContent("Call me on +1 (415) 555-0101"), true);
  assert.equal(likelySensitiveContent("https://outside.example"), true);
  assert.equal(likelySensitiveContent("Telegram me at @outside"), true);
  assert.equal(likelySensitiveContent("Please share the OTP"), true);
  assert.equal(likelySensitiveContent("Send your bank account number"), true);
  assert.equal(likelySensitiveContent("Discuss API token authentication"), false);
  assert.equal(likelySensitiveContent("How should an email service retry delivery?"), false);
});

test("rate limit, safety, stale, and idempotency errors preserve usable guidance", () => {
  const rate = Object.assign(new Error("rate"), {
    code: "qa_rate_limit_exceeded",
    retryAfter: 73,
  });
  assert.match(qaErrorMessage(rate), /73 seconds/);
  const safety = Object.assign(new Error("safety"), {
    code: "credential_request_not_allowed",
  });
  assert.match(qaErrorMessage(safety), /cannot be shared/i);
  assert.equal(
    requiresAuthoritativeRefresh(Object.assign(new Error("stale"), {
      code: "stale_application_version",
    })),
    true,
  );
  assert.equal(
    requiresAuthoritativeRefresh(Object.assign(new Error("rate"), {
      code: "qa_rate_limit_exceeded",
    })),
    false,
  );
  const conflict = Object.assign(new Error("conflict"), {
    code: "idempotency_conflict",
  });
  assert.match(qaErrorMessage(conflict), /retry key/i);
  assert.equal(requiresAuthoritativeRefresh(conflict), true);
});

test("revision lifecycle remains exact-version and distinguishes terminal outcomes", () => {
  const request = {
    id: "revision-1",
    requested_application_version_id: "version-1",
    requested_material_gig_version_id: "gig-version-1",
    reason_code: "revise_timeline",
    reason_detail: null,
    status: "open",
    created_at: "2026-07-25T00:00:00Z",
    terminal_at: null,
    response_application_version_id: null,
    response_reason_code: null,
    response_reason_detail: null,
  };
  assert.equal(isQaThread({
    ...thread,
    mode: "advanced_discussion",
    open_revision_request: request,
    revision_history: [request],
  }), true);
  assert.equal(thread.current_application_version_id, request.requested_application_version_id);
  assert.equal(request.response_application_version_id, null);
  for (const status of [
    "fulfilled",
    "declined",
    "superseded",
    "closed_by_stage_change",
    "closed_by_gig_state",
  ]) {
    assert.equal(isQaThread({
      ...thread,
      open_revision_request: null,
      revision_history: [{ ...request, status }],
    }), true);
  }
});
