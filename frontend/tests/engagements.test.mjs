import assert from "node:assert/strict";
import test from "node:test";

import {
  isEngagement,
  isEngagementList,
  isEngagementTimeline,
  isReconsiderationInvitation,
} from "../src/lib/engagementContracts.ts";

const engagement = {
  engagement_id: "engagement-1",
  gig_id: "gig-1",
  application_id: "application-1",
  viewer_role: "client",
  status: "completion_pending",
  lifecycle_version: 4,
  confirmed_at: "2026-07-25T12:00:00Z",
  gig: { id: "gig-1", title: "Build API", status: "filled" },
  client: { user_id: "client-1", display_name: "Client" },
  freelancer: { user_id: "freelancer-1", display_name: "Freelancer" },
  accepted_terms: {
    accepted_terms_contract_version: 2,
    application_version_number: 3,
    gig_version_number: 2,
    client_payment_terms: { payment_structure: "fixed_price" },
    freelancer_proposal: { mode: "exact_total" },
    timeline: { mode: "exact" },
    availability: { available_from: "2026-08-01" },
    included_work: ["API"],
    excluded_work: ["Hosting"],
    assumptions: ["Access"],
    scope_notes: "Production handoff included.",
  },
  action_token: "a".repeat(64),
  allowed_actions: ["confirm_completion", "request_cancellation"],
  reopened: false,
  disclaimers: [
    "Platform record, not a legal contract.",
    "No payment guarantee.",
  ],
};

test("engagement accepts normalized snapshot versions without raw snapshot JSON", () => {
  assert.equal(isEngagement(engagement), true);
  assert.equal(isEngagement({ ...engagement, accepted_terms_snapshot: { secret: true } }), true);
  assert.equal(isEngagement({ ...engagement, status: "disputed" }), false);
});

test("engagement list preserves active and historical workspace items", () => {
  assert.equal(isEngagementList({ items: [engagement, { ...engagement, status: "cancelled" }], count: 2 }), true);
  assert.equal(isEngagementList({ items: [{ id: "raw-row" }], count: 1 }), false);
});

test("timeline requires deterministic reference events", () => {
  assert.equal(isEngagementTimeline({
    engagement_id: "engagement-1",
    items: [{
      event_id: "event-1",
      event_type: "engagement_completion_requested",
      actor_role: "client",
      status_from: "in_progress",
      status_to: "completion_pending",
      occurred_at: "2026-07-26T12:00:00Z",
    }],
  }), true);
});

test("reconsideration invitation exposes action boundaries and terms comparison", () => {
  assert.equal(isReconsiderationInvitation({
    invitation_id: "invitation-1",
    application_id: "application-1",
    gig_id: "gig-1",
    viewer_role: "freelancer",
    status: "pending",
    reason_code: "failed_engagement_reopened",
    action_token: "i".repeat(64),
    allowed_actions: ["reaffirm", "submit_update", "decline"],
    current_application_stage: "not_selected",
    previous_proposal: { proposal: { mode: "exact_total" } },
    current_gig_terms: { payment_structure: "fixed_price" },
    gig: { id: "gig-1", title: "Build API", status: "closed_to_new_applications" },
  }), true);
});
