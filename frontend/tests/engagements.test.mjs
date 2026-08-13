import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  containsForbiddenOrdinaryField,
  isEngagement,
  isEngagementList,
  isEngagementTimeline,
  isReconsiderationContext,
  isReconsiderationInvitation,
} from "../src/lib/engagementContracts.ts";
import {
  engagementCollection,
  EngagementOperationRegistry,
  engagementStatusCopy,
  isTerminalEngagement,
  lifecycleActionPresentation,
  reconsiderationStatusConsequence,
} from "../src/lib/engagementView.ts";
import { resolveApplicationEditRouteMode } from "../src/lib/applicationEditMode.ts";
import { participantStageEightOwnsPath } from "../src/lib/participantNavigation.ts";

const engagement = {
  engagement_id: "engagement-1",
  gig_id: "gig-1",
  application_id: "application-1",
  selection_request_id: "selection-1",
  viewer_role: "client",
  status: "completion_pending",
  lifecycle_version: 4,
  confirmed_at: "2026-07-25T12:00:00Z",
  gig: { id: "gig-1", title: "Build API", status: "filled" },
  client: { user_id: "client-1", display_name: "Client" },
  freelancer: { user_id: "freelancer-1", display_name: "Freelancer" },
  accepted_terms: {
    accepted_terms_contract_version: 2,
    application_version_id: "application-version-3",
    application_version_number: 3,
    gig_version_id: "gig-version-2",
    gig_version_number: 2,
    client_payment_terms: { payment_structure: "fixed_price" },
    freelancer_proposal: { mode: "exact_total" },
    timeline: { mode: "exact" },
    availability: { available_from: "2026-08-01" },
    included_work: ["API"],
    excluded_work: ["Hosting"],
    assumptions: ["Access"],
    estimate_change_factors: ["Scope"],
    scope_notes: "Production handoff included.",
  },
  action_token: "a".repeat(64),
  allowed_actions: ["confirm_completion", "reject_completion", "request_cancellation"],
  reopened: false,
  disclaimers: ["Platform record, not a legal contract.", "No payment guarantee."],
};

const invitation = {
  invitation_id: "invitation-1",
  reopening_id: "reopening-1",
  source_engagement_id: "engagement-1",
  application_id: "application-1",
  gig_id: "gig-1",
  viewer_role: "freelancer",
  status: "pending",
  reason_code: "failed_engagement_reopened",
  created_at: "2026-07-26T12:00:00Z",
  invited_application_version_id: "application-version-1",
  invited_material_gig_version_id: "gig-version-2",
  current_application_stage: "not_selected",
  current_application_version_id: "application-version-1",
  current_material_gig_version_id: "gig-version-2",
  action_token: "i".repeat(64),
  allowed_actions: ["reaffirm", "submit_update", "decline"],
  previous_proposal: { proposal: { mode: "exact_total" } },
  current_gig_terms: { payment_structure: "fixed_price" },
  gig: { id: "gig-1", title: "Build API", status: "closed_to_new_applications" },
};

test("engagement contract accepts only the seven states and normalized accepted terms", () => {
  assert.equal(isEngagement(engagement), true);
  assert.equal(isEngagement({ ...engagement, status: "disputed" }), false);
  assert.equal(isEngagement({ ...engagement, allowed_actions: ["force_complete"] }), false);
  assert.equal(isEngagement({ ...engagement, accepted_terms: { ...engagement.accepted_terms, accepted_terms_contract_version: 3 } }), false);
});

test("ordinary engagement DTOs recursively reject raw snapshots and sensitive internals", () => {
  for (const unsafe of [
    { ...engagement, accepted_terms_snapshot: { private: true } },
    { ...engagement, accepted_terms: { ...engagement.accepted_terms, nested: { contact_value: "secret" } } },
    { ...engagement, debug: { operation_fingerprint: "internal" } },
    { ...engagement, material: { ciphertext: "encrypted", nonce: "nonce" } },
  ]) {
    assert.equal(containsForbiddenOrdinaryField(unsafe), true);
    assert.equal(isEngagement(unsafe), false);
  }
});

test("engagement list count is coherent and terminal grouping follows server status", () => {
  const items = [engagement, { ...engagement, engagement_id: "completed", status: "completed" }, { ...engagement, engagement_id: "cancelled", status: "cancelled" }];
  assert.equal(isEngagementList({ items, count: 3 }), true);
  assert.equal(isEngagementList({ items, count: 2 }), false);
  assert.deepEqual(engagementCollection(items).active.map((item) => item.engagement_id), ["engagement-1"]);
  assert.deepEqual(engagementCollection(items).historical.map((item) => item.engagement_id), ["completed", "cancelled"]);
  assert.equal(isTerminalEngagement("completed"), true);
  assert.equal(isTerminalEngagement("cancellation_pending"), false);
});

test("timeline guard accepts only the engagement event allowlist and stable event ids", () => {
  const timeline = { engagement_id: "engagement-1", items: [{ event_id: "event-1", event_type: "engagement_completion_requested", actor_role: "client", status_from: "in_progress", status_to: "completion_pending", lifecycle_version: 4, occurred_at: "2026-07-26T12:00:00Z" }] };
  assert.equal(isEngagementTimeline(timeline), true);
  assert.equal(isEngagementTimeline({ ...timeline, items: [{ ...timeline.items[0], event_type: "qa_message_created" }] }), false);
  assert.equal(isEngagementTimeline({ ...timeline, items: [{ ...timeline.items[0], event_id: null }] }), false);
  assert.equal(isEngagementTimeline({ ...timeline, items: [timeline.items[0], timeline.items[0]] }), false);
});

test("lifecycle action copy preserves every exact action and consequence", () => {
  const actions = ["prepare_kickoff", "start_work", "request_completion", "confirm_completion", "reject_completion", "request_cancellation", "withdraw_cancellation", "acknowledge_cancellation", "reopen_gig"];
  assert.deepEqual(actions.map((action) => lifecycleActionPresentation(action).label), ["Prepare for Kickoff", "Mark Work Started", "Request Completion", "Confirm Completion", "Return to In Progress", "Request Cancellation", "Withdraw Cancellation Request", "Acknowledge Cancellation", "Reopen Gig · Keep Intake Closed"]);
  assert.match(lifecycleActionPresentation("confirm_completion").consequence, /does not verify work quality or payment/i);
  assert.match(lifecycleActionPresentation("reopen_gig").consequence, /historical winner stays Confirmed/i);
});

test("operation-local request ids reuse logical retries and rotate after settlement or input change", () => {
  let next = 0;
  const registry = new EngagementOperationRegistry(() => `request-${++next}`);
  const first = registry.get("request_cancellation", "engagement-1", { reason: "mutual" });
  assert.equal(registry.get("request_cancellation", "engagement-1", { reason: "mutual" }), first);
  assert.notEqual(registry.get("request_cancellation", "engagement-1", { reason: "other" }), first);
  registry.settle("request_cancellation", "engagement-1", { reason: "mutual" });
  assert.notEqual(registry.get("request_cancellation", "engagement-1", { reason: "mutual" }), first);
  registry.reset();
  assert.equal(next, 3);
});

test("terminal and cancellation status copy stays participant-reported and reopening-aware", () => {
  assert.match(engagementStatusCopy({ ...engagement, status: "completed" }), /participant-reported/i);
  assert.match(engagementStatusCopy({ ...engagement, status: "cancelled", reopened: false }), /ended before completion/i);
  assert.match(engagementStatusCopy({ ...engagement, status: "cancelled", reopened: true }), /gig was reopened separately/i);
});

test("reconsideration context and invitation contracts preserve exact lifecycle vocabularies", () => {
  assert.equal(isReconsiderationContext({ application_id: "application-1", gig_id: "gig-1", viewer_role: "client", eligible: true, blockers: [], pending_invitation_id: null, action_token: "c".repeat(64) }), true);
  assert.equal(isReconsiderationInvitation(invitation), true);
  assert.equal(isReconsiderationInvitation({ ...invitation, status: "expired" }), false);
  assert.equal(isReconsiderationInvitation({ ...invitation, allowed_actions: ["accept"] }), false);
});

test("all reconsideration terminal states explain whether application history changes", () => {
  assert.match(reconsiderationStatusConsequence("accepted"), /fresh immutable/i);
  assert.match(reconsiderationStatusConsequence("declined"), /unchanged/i);
  assert.match(reconsiderationStatusConsequence("cancelled"), /unchanged/i);
  assert.match(reconsiderationStatusConsequence("superseded"), /material gig or ordinary application-version change/i);
  assert.match(reconsiderationStatusConsequence("closed_by_gig_state"), /selection outcome/i);
});

test("application edit query modes fail closed across revision and reconsideration", () => {
  assert.equal(resolveApplicationEditRouteMode(new URLSearchParams("mode=reconsideration&invitationId=i1")).mode, "reconsideration");
  assert.equal(resolveApplicationEditRouteMode(new URLSearchParams("mode=reconsideration")).mode, "invalid");
  assert.equal(resolveApplicationEditRouteMode(new URLSearchParams("mode=reconsideration&invitationId=i1&revision_request_id=r1")).mode, "invalid");
  assert.equal(resolveApplicationEditRouteMode(new URLSearchParams("mode=revision&invitationId=i1")).mode, "invalid");
});

test("Stage 8 owns only canonical engagement paths", () => {
  assert.equal(participantStageEightOwnsPath("/engagements"), true);
  assert.equal(participantStageEightOwnsPath("/engagements/e1"), true);
  assert.equal(participantStageEightOwnsPath("/engagements/"), false);
  assert.equal(participantStageEightOwnsPath("/engagements/e1/history"), false);
  assert.equal(participantStageEightOwnsPath("/engagements-extra"), false);
  assert.equal(participantStageEightOwnsPath("/applications/a1"), false);
});

test("workspace renders only allowed actions, waits for authority, and isolates contact plaintext", () => {
  const source = readFileSync(new URL("../src/pages/EngagementWorkspacePage.tsx", import.meta.url), "utf8");
  assert.match(source, /engagement\.allowed_actions\.map/);
  assert.match(source, /await transitionEngagement/);
  assert.match(source, /await load\(\)/);
  assert.doesNotMatch(source, /setEngagement\(await transitionEngagement/);
  assert.doesNotMatch(source, /window\.(confirm|prompt)/);
  assert.match(source, /SecureContactExchange key=\{`\$\{engagementId\}:\$\{contactAuthorityKey\}`\}/);
  assert.doesNotMatch(source, /(localStorage|sessionStorage|contact_value)/);
});

test("workspace preserves exact accepted ordinals, lifecycle-only timeline, and no project-management claims", () => {
  const source = readFileSync(new URL("../src/pages/EngagementWorkspacePage.tsx", import.meta.url), "utf8");
  assert.match(source, /Application v\{terms\.application_version_number\} accepted against Gig v\{terms\.gig_version_number\}/);
  assert.match(source, /Accepted snapshot contract v/);
  assert.match(source, /Estimate-change factors/);
  assert.match(source, /Selection, Q&amp;A, review, proposal revisions, contact activity/);
  assert.doesNotMatch(source, /(task board|timesheet|deliverable management|escrow)/i);
  assert.doesNotMatch(source, /JSON\.stringify/);
});

test("failed-engagement reopening is a dedicated dialog and stays distinct from intake reopening", () => {
  const workspace = readFileSync(new URL("../src/pages/EngagementWorkspacePage.tsx", import.meta.url), "utf8");
  const dialog = readFileSync(new URL("../src/components/EngagementActionDialog.tsx", import.meta.url), "utf8");
  const manage = readFileSync(new URL("../src/pages/ManageGigsPage.tsx", import.meta.url), "utf8");
  assert.match(workspace, /reopenEngagementGig/);
  assert.match(dialog, /failed-engagement Gig Reopening/);
  assert.match(dialog, /historical Confirmed application remain unchanged/);
  assert.match(dialog, /application intake still Closed/);
  assert.match(manage, /ordinary intake controls do not/);
  assert.doesNotMatch(manage, /onAction\("reopen_gig"\)/);
});

test("reconsideration controls use server actions, narrow dialogs, and component-local request ids", () => {
  const source = readFileSync(new URL("../src/components/ReconsiderationPanel.tsx", import.meta.url), "utf8");
  const dialog = readFileSync(new URL("../src/components/ReconsiderationActionDialog.tsx", import.meta.url), "utf8");
  assert.match(source, /invitation\.allowed_actions\.includes\("reaffirm"\)/);
  assert.match(source, /invitation\.allowed_actions\.includes\("submit_update"\)/);
  assert.match(source, /new EngagementOperationRegistry/);
  assert.match(source, /value instanceof EngagementApiError && value\.status === 409/);
  assert.doesNotMatch(source, /window\.(confirm|prompt)/);
  assert.doesNotMatch(source, /(localStorage|sessionStorage)/);
  assert.match(dialog, /A fresh immutable application version with origin Reconsideration/);
  assert.match(dialog, /application stage, proposal pointer, and history remain unchanged/);
});

test("updated reconsideration proposal uses only its exact endpoint and a stable logical retry id", () => {
  const source = readFileSync(new URL("../src/pages/EditApplicationPage.tsx", import.meta.url), "utf8");
  assert.match(source, /mode === "reconsideration" && invitation/);
  assert.match(source, /request_id: reconsiderationSubmitRequestId/);
  assert.match(source, /const presentation = .*"switchboard-reconsideration"/);
  assert.match(source, /fresh immutable application version/);
  assert.doesNotMatch(source, /mode === "reconsideration"[^\n]+editApplication/);
  assert.doesNotMatch(source, /mode === "revision"[^\n]+respondToReconsideration/);
});

test("engagement routes remain lazy and protected for both participant roles", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(source, /const EngagementListPage = lazy/);
  assert.match(source, /const EngagementWorkspacePage = lazy/);
  assert.match(source, /path="\/engagements"[\s\S]*allowedRoles=\{\["freelancer", "client"\]\}/);
  assert.match(source, /path="\/engagements\/:engagementId"[\s\S]*allowedRoles=\{\["freelancer", "client"\]\}/);
});
