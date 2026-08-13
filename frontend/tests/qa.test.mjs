import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { resolveApplicationEditRouteMode, revisionEditPath } from "../src/lib/applicationEditMode.ts";
import { isQaIndicator, isQaThread } from "../src/lib/qaContracts.ts";
import {
  chronologicalMessages,
  likelySensitiveContent,
  messageRelationship,
  qaBlockerLabel,
  qaCanCompose,
  qaErrorMessage,
  qaModeDescription,
  qaModeLabel,
  qaPanelState,
  questionResolutionIds,
  requiresAuthoritativeRefresh,
  revisionConsequence,
  revisionStatusLabel,
} from "../src/lib/qaView.ts";

const panelSource = readFileSync(new URL("../src/components/StructuredQaPanel.tsx", import.meta.url), "utf8");
const editSource = readFileSync(new URL("../src/pages/EditApplicationPage.tsx", import.meta.url), "utf8");
const formSource = readFileSync(new URL("../src/components/ApplicationForm.tsx", import.meta.url), "utf8");
const applicationDetailSource = readFileSync(new URL("../src/pages/ApplicationDetailPage.tsx", import.meta.url), "utf8");
const applicantDetailSource = readFileSync(new URL("../src/pages/ClientApplicantDetailPage.tsx", import.meta.url), "utf8");

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

test("all four modes remain server-projected, including distinct Under Review histories", () => {
  const neverAdvanced = { ...thread, current_application_stage: "under_review", mode: "initial_clarification" };
  const returnedFromAdvanced = {
    ...thread,
    current_application_stage: "under_review",
    mode: "read_only",
    blockers: ["returned_to_general_review"],
    permissions: Object.fromEntries(Object.keys(permissions).map((key) => [key, key === "report_message"])),
  };
  assert.equal(isQaThread(neverAdvanced), true);
  assert.equal(isQaThread(returnedFromAdvanced), true);
  assert.match(qaModeDescription("initial_response_only"), /open questions/i);
  assert.match(qaModeDescription("read_only"), /report permission/i);
  assert.equal(qaBlockerLabel("returned_to_general_review"), "Returned to Under Review after prior advancement");
  assert.doesNotMatch(panelSource, /current_application_stage\s*===\s*["']advanced/);
});

test("permanent allowance is rendered from the DTO and corrections cannot reset it", () => {
  assert.equal(isQaThread({ ...thread, initial_question_allowance: { used: 1, remaining: 2, limit: 2 } }), false);
  assert.match(panelSource, /server-counted turns used across this application history/);
  assert.match(panelSource, /Eligible client corrections consume the same allowance/);
  assert.doesNotMatch(panelSource, /messages\.filter[^\n]*allowance/);
});

test("question resolution and append-only correction relationships use immutable references", () => {
  const answer = { ...message, id: "answer-1", sequence_number: 2, sender_role: "freelancer", is_mine: false, message_kind: "answer", in_reply_to_message_id: message.id };
  const correction = { ...message, id: "correction-1", sequence_number: 3, message_kind: "correction", corrects_message_id: message.id };
  assert.deepEqual([...questionResolutionIds([message, answer, correction])], [message.id]);
  assert.equal(messageRelationship(answer, [message, answer]), "Primary response to question #1");
  assert.equal(messageRelationship(correction, [message, correction]), "Append-only correction to message #1");
  assert.equal(messageRelationship({ ...answer, in_reply_to_message_id: "older" }, [answer]), "Primary response to question outside this loaded page");
  assert.doesNotMatch(panelSource, /Edit Message|Delete Message/);
});

test("private reports and stop-pre-advancement keep their exact limited consequences", () => {
  assert.match(panelSource, /original message remains visible/i);
  assert.match(panelSource, /does not alter ranking, application state, proposal truth/i);
  assert.match(panelSource, /does not withdraw the application, block the client, change suitability or proposal truth/i);
  assert.match(panelSource, /prevent later Advanced discussion/i);
  assert.match(panelSource, /permissions\.report_message/);
});

test("cursor and projected attention never become array-index sequence or unread state", () => {
  assert.match(panelSource, /sequence_number/);
  assert.match(panelSource, /pagination\.before_sequence/);
  assert.match(panelSource, /complete backend summary/);
  assert.match(panelSource, /pending responses—not unread messages/);
  assert.doesNotMatch(panelSource, /unread_count|markAsRead|read receipt/i);
});

test("safety, rate, stale, and transport failures preserve local drafts and logical request IDs", () => {
  for (const state of ["composerRequestId", "responseRequestId", "reportRequestId", "correctionRequestId", "revisionCreateRequestId", "revisionDeclineRequestId"]) {
    assert.match(panelSource, new RegExp(`request_id: ${state}`));
  }
  assert.match(panelSource, /setComposerRequestId\(newOperationId\(\)\)/);
  assert.doesNotMatch(panelSource, /catch[\s\S]{0,220}setDraft\(""\)/);
  assert.match(qaErrorMessage(Object.assign(new Error("rate"), { code: "qa_rate_limit_exceeded", retryAfter: 11 })), /draft is preserved/i);
  assert.equal(requiresAuthoritativeRefresh(Object.assign(new Error("selection"), { code: "pending_selection_blocks_revision" })), true);
});

test("proposal authority stays visibly separate from discussion and editable fields", () => {
  assert.match(panelSource, /Discussion does not modify the official proposal/);
  assert.match(panelSource, /complete validated proposal workflow/);
  assert.doesNotMatch(panelSource, /name=["'](?:price|budget|timeline|availability)["']/);
  assert.match(formSource, /switchboard-revision/);
  assert.match(formSource, /Discussion text is not copied into proposal fields/);
});

test("revision history distinguishes open, fulfilled, declined, superseded, and closure consequences", () => {
  const request = {
    id: "revision-1",
    requested_application_version_id: "version-1",
    requested_material_gig_version_id: "gig-version-1",
    reason_code: "revise_timeline",
    reason_detail: null,
    status: "fulfilled",
    created_at: "2026-07-25T00:00:00Z",
    terminal_at: "2026-07-26T00:00:00Z",
    response_application_version_id: "version-2",
    response_reason_code: null,
    response_reason_detail: null,
  };
  assert.equal(revisionStatusLabel("fulfilled"), "Updated proposal submitted");
  assert.match(revisionConsequence(request), /complete immutable proposal version/i);
  assert.match(revisionConsequence({ ...request, status: "declined" }), /No proposal version was created/i);
  assert.match(revisionConsequence({ ...request, status: "superseded" }), /non-actionable/i);
  assert.match(revisionConsequence({ ...request, status: "closed_by_stage_change" }), /historical request evidence remains/i);
});

test("revision query mode is exact and malformed combinations never fall through to ordinary edit", () => {
  assert.deepEqual(resolveApplicationEditRouteMode(new URLSearchParams()), { mode: "edit", revisionRequestId: null, invitationId: null });
  assert.deepEqual(resolveApplicationEditRouteMode(new URLSearchParams("mode=update")), { mode: "update", revisionRequestId: null, invitationId: null });
  assert.deepEqual(resolveApplicationEditRouteMode(new URLSearchParams("mode=reapply")), { mode: "reapply", revisionRequestId: null, invitationId: null });
  assert.deepEqual(resolveApplicationEditRouteMode(new URLSearchParams("revision_request_id=revision-1")), { mode: "revision", revisionRequestId: "revision-1", invitationId: null });
  assert.deepEqual(resolveApplicationEditRouteMode(new URLSearchParams("mode=revision&revisionRequestId=revision-1")), { mode: "revision", revisionRequestId: "revision-1", invitationId: null });
  assert.deepEqual(resolveApplicationEditRouteMode(new URLSearchParams("mode=reconsideration&invitationId=invite-1")), { mode: "reconsideration", revisionRequestId: null, invitationId: "invite-1" });
  for (const query of ["mode=revision", "revision_request_id=r&invitationId=i", "mode=update&revision_request_id=r", "invitationId=i", "mode=unknown"]) {
    assert.equal(resolveApplicationEditRouteMode(new URLSearchParams(query)).mode, "invalid");
  }
  assert.equal(revisionEditPath("application/1", "revision 1"), "/applications/application%2F1/edit?revision_request_id=revision%201");
});

test("revision submission uses only the linked endpoint, complete snapshot, and conflict-preserving refetch", () => {
  assert.match(editSource, /mode === "revision" && revisionRequestId/);
  assert.match(editSource, /submitRevisionUpdate\(applicationId, revisionRequestId/);
  assert.match(editSource, /snapshot: application/);
  assert.match(editSource, /Promise\.all\(\[/);
  assert.match(editSource, /setQa\(refreshedQa\)/);
  assert.match(editSource, /proposal_revision_response/);
  assert.doesNotMatch(editSource, /mode === "revision"[^\n]+editApplication/);
  assert.doesNotMatch(editSource, /mode === "revision"[^\n]+respondToReconsideration/);
});

test("Stage 6 stays first-class while Selection and Stage 8 Reconsideration remain distinct", () => {
  for (const source of [applicationDetailSource, applicantDetailSource]) {
    assert.match(source, /stage-six-page-region/);
    assert.match(source, /<StructuredQaPanel/);
    assert.match(source, /later-workflows/);
    assert.match(source, /<SelectionPanel/);
    assert.match(source, /<ReconsiderationPanel/);
    assert.match(source, /Selection and failed-engagement recovery/);
  }
});

test("Stage 6 adds no global token, request, Q&A, or draft persistence", () => {
  for (const source of [panelSource, editSource, formSource]) {
    assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/);
  }
  assert.doesNotMatch(panelSource, /action_token|shortlist_action_token|decision_action_token/);
});
