import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  isSelectionContext,
  isSelectionRequestDetail,
  isSelectionRequestHistory,
} from "../src/lib/selectionContracts.ts";
import {
  informationalRemaining,
  operationKey,
  SELECTION_DURATION_OPTIONS,
  selectionAuthorityLabels,
  selectionHistoryConsequence,
  SelectionOperationRegistry,
  versionBoundary,
} from "../src/lib/selectionView.ts";

const panelSource = readFileSync(new URL("../src/components/SelectionPanel.tsx", import.meta.url), "utf8");
const applicationPageSource = readFileSync(new URL("../src/pages/ApplicationDetailPage.tsx", import.meta.url), "utf8");
const applicantPageSource = readFileSync(new URL("../src/pages/ClientApplicantDetailPage.tsx", import.meta.url), "utf8");

const terms = {
  payment_structure: "fixed_price",
  currency: "INR",
  project_deadline: "2026-09-01T00:00:00Z",
};
const proposal = {
  payment_structure: "fixed_price",
  currency: "INR",
  mode: "exact_total",
  exact_total: 120000,
};
const context = {
  application_id: "application-1",
  gig_id: "gig-1",
  viewer_role: "client",
  application_stage: "advanced",
  application_version_id: "application-version-2",
  application_version_number: 2,
  material_gig_version_id: "gig-version-3",
  material_gig_version_number: 3,
  proposal,
  timeline: { mode: "exact", unit: "weeks", exact_value: 6 },
  availability: { available_from: "2026-08-01" },
  scope: { included_work: ["API"] },
  scope_notes: "Includes production handoff.",
  client_terms: terms,
  commercial_warning_code: null,
  commercial_acknowledgement_required: false,
  can_send: true,
  send_token: "s".repeat(64),
  blockers: [],
  active_request_id: null,
  latest_request_id: null,
  authoritative_now: "2026-07-25T12:00:00Z",
};
const request = {
  selection_request_id: "request-1",
  gig_id: "gig-1",
  application_id: "application-1",
  viewer_role: "freelancer",
  status: "pending",
  stored_status: "pending",
  created_at: "2026-07-25T12:00:00Z",
  expires_at: "2026-07-27T12:00:00Z",
  application_version_id: "application-version-2",
  application_version_number: 2,
  material_gig_version_id: "gig-version-3",
  material_gig_version_number: 3,
  proposal,
  timeline: context.timeline,
  availability: context.availability,
  scope: context.scope,
  scope_notes: context.scope_notes,
  client_terms: terms,
  response_token: "r".repeat(64),
  authoritative_now: "2026-07-25T12:00:00Z",
};

test("selection context requires exact application and material version numbers", () => {
  assert.equal(isSelectionContext(context), true);
  assert.equal(isSelectionContext({ ...context, application_version_number: "2" }), false);
  assert.equal(isSelectionContext({ ...context, material_gig_version_id: null }), false);
});

test("selection context separates viewer role and action token", () => {
  assert.equal(isSelectionContext({ ...context, viewer_role: "freelancer", send_token: null }), true);
  assert.equal(isSelectionContext({ ...context, viewer_role: "admin" }), false);
});

test("selection blockers are stable string codes rather than display HTML", () => {
  assert.equal(isSelectionContext({
    ...context,
    can_send: false,
    blockers: ["revision_request_blocks_selection", "proposal_not_selection_ready"],
  }), true);
  assert.equal(isSelectionContext({ ...context, blockers: [{ code: "unsafe" }] }), false);
});

test("request contract carries frozen terms, authoritative expiry, and response token", () => {
  assert.equal(isSelectionRequestDetail(request), true);
  assert.equal(isSelectionRequestDetail({ ...request, expires_at: 42 }), false);
  assert.equal(isSelectionRequestDetail({ ...request, proposal: "browser summary" }), false);
});

test("accepted request may expose only a minimal engagement summary", () => {
  assert.equal(isSelectionRequestDetail({
    ...request,
    status: "accepted",
    stored_status: "accepted",
    engagement: {
      engagement_id: "engagement-1",
      status: "confirmed",
      confirmed_at: "2026-07-25T12:30:00Z",
    },
  }), true);
});

test("selection pending remains separate from the application stage", () => {
  assert.deepEqual(selectionAuthorityLabels(context, request), {
    application: "Application · Advanced",
    request: "Selection request · Pending",
  });
  assert.match(panelSource, /Application and selection status/);
});

test("bound and current versions are never silently substituted", () => {
  assert.deepEqual(versionBoundary(2, 3, "Application"), {
    bound: "Application v2",
    current: "Current application is v3",
    changed: true,
  });
  assert.equal(versionBoundary(3, 3, "Material gig").changed, false);
  assert.match(panelSource, /Newer current terms are not substituted here/);
});

test("selection history accepts all terminal projections and preserves exact consequences", () => {
  const statuses = [
    ["pending", undefined, "Awaiting"],
    ["accepted", undefined, "engagement confirmed"],
    ["declined", "remain_interested", "remains Advanced"],
    ["declined", "withdraw_completely", "withdrawn"],
    ["cancelled", undefined, "application unchanged"],
    ["expired", undefined, "server authority"],
    ["invalidated", undefined, "material version change"],
    ["revision_requested", undefined, "remains Advanced"],
  ];
  for (const [status, disposition, expected] of statuses) {
    const item = {
      selection_request_id: `request-${status}`,
      status,
      created_at: "2026-07-25T12:00:00Z",
      expires_at: "2026-07-27T12:00:00Z",
      application_version_id: "internal-application-version",
      material_gig_version_id: "internal-gig-version",
      ...(disposition ? { decline_disposition: disposition } : {}),
    };
    assert.match(selectionHistoryConsequence(item), new RegExp(expected, "i"));
  }
  assert.equal(isSelectionRequestHistory({
    application_id: "application-1",
    items: [],
    authoritative_now: "2026-07-25T12:00:00Z",
  }), true);
});

test("the countdown uses authoritative time plus elapsed duration, never browser wall-clock authority", () => {
  assert.deepEqual(
    informationalRemaining("2026-07-25T14:00:00Z", "2026-07-25T12:00:00Z", 30 * 60_000),
    { reached: false, label: "1h 30m remaining (informational)" },
  );
  assert.equal(
    informationalRemaining("2026-07-25T12:00:00Z", "2026-07-25T12:00:00Z", 0).reached,
    true,
  );
  assert.doesNotMatch(panelSource, /Date\.now\(/);
  assert.match(panelSource, /Checking authoritative request status/);
});

test("deadline choices are exactly 24, 48, and 72 hours with a 48-hour UI default", () => {
  assert.deepEqual(SELECTION_DURATION_OPTIONS, [24, 48, 72]);
  assert.match(panelSource, /useState\(48\)/);
  assert.match(panelSource, /48 \? " · default"/);
});

test("one logical mutation reuses its UUID and a settled or changed operation gets a fresh UUID", () => {
  let index = 0;
  const registry = new SelectionOperationRegistry(() => `operation-${++index}`);
  const firstKey = operationKey("send", "application-1", { duration: 48, acknowledged: false });
  const sameKey = operationKey("send", "application-1", { acknowledged: false, duration: 48 });
  const changedKey = operationKey("send", "application-1", { duration: 72, acknowledged: false });
  assert.equal(registry.get(firstKey), "operation-1");
  assert.equal(registry.get(sameKey), "operation-1");
  assert.equal(registry.get(changedKey), "operation-2");
  registry.settle(firstKey);
  assert.equal(registry.get(firstKey), "operation-3");
  registry.reset();
  assert.equal(registry.get(changedKey), "operation-4");
});

test("send, management, and response tokens stay separate and component-local", () => {
  assert.equal(isSelectionContext({ ...context, send_token: null }), true);
  assert.equal(isSelectionRequestDetail({ ...request, management_token: "m".repeat(64), response_token: "r".repeat(64) }), true);
  assert.equal(isSelectionRequestDetail({ ...request, management_token: 42 }), false);
  assert.doesNotMatch(panelSource, /localStorage|sessionStorage|URLSearchParams|createContext/);
  assert.match(panelSource, /context\.send_token/);
  assert.match(panelSource, /request\.management_token/);
  assert.match(panelSource, /request\.response_token/);
});

test("all four freelancer choices communicate their exact separate semantics", () => {
  for (const label of [
    "Accept Exact Terms",
    "Decline while Remaining Interested",
    "Decline and Withdraw Completely",
    "Request Revised Terms",
  ]) assert.match(panelSource, new RegExp(label));
  assert.match(panelSource, /No Stage 6 revision request, editor route, or proposal version is created/);
  assert.match(panelSource, /no separate withdrawal is sent/);
  assert.match(panelSource, /Nothing in the surrounding page changes until the server confirms/);
});

test("client cancellation and resend blockers retain server-authoritative consequences", () => {
  assert.match(panelSource, /Request becomes Cancelled/);
  assert.match(panelSource, /Application remains Advanced/);
  assert.match(panelSource, /unchanged_selection_resend_blocked/);
  assert.match(panelSource, /revision_request_blocks_selection/);
});

test("history uses safe ordinals and never renders raw request or version identifiers", () => {
  assert.match(panelSource, /Request \{ordinal\}/);
  assert.doesNotMatch(panelSource, />\{item\.selection_request_id\}</);
  assert.doesNotMatch(panelSource, />\{detail\.application_version_id\}</);
  assert.doesNotMatch(panelSource, /JSON\.stringify/);
});

test("host pages refresh Stage 5, Stage 6, selection, and contained reconsideration authority", () => {
  for (const source of [applicationPageSource, applicantPageSource]) {
    assert.match(source, /refreshWorkflowAuthorities/);
    assert.match(source, /authorityRefreshKey=\{authorityRefreshKey\}/);
    assert.match(source, /StructuredQaPanel/);
    assert.match(source, /ReconsiderationPanel/);
  }
  assert.match(applicantPageSource, /Stage 7 \+ Stage 8 distinct authorities/);
});

test("selection remains route-local and absent from the global command mutation surface", () => {
  assert.doesNotMatch(panelSource, /ParticipantCommandSurface|dispatch\(|Redux|createContext/);
  assert.match(panelSource, /applicationId/);
});

test("source includes native dialog, time semantics, accessible announcements, and responsive widths", () => {
  assert.match(panelSource, /<dialog/);
  assert.match(panelSource, /<time dateTime=/);
  assert.match(panelSource, /aria-live="polite"/);
  assert.match(panelSource, /aria-labelledby=/);
  assert.match(panelSource, /onCancel=/);
});
