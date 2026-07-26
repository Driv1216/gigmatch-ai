import assert from "node:assert/strict";
import test from "node:test";

import {
  isSelectionContext,
  isSelectionRequestDetail,
} from "../src/lib/selectionContracts.ts";

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
