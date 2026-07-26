import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  hasForbiddenDashboardFields,
  isClientDashboard,
  isFreelancerDashboard,
} from "../src/lib/dashboardContracts.ts";
import {
  attentionDestination,
  compareAttention,
  dashboardNavigation,
  dashboardViewState,
} from "../src/lib/dashboardView.ts";

const ids = {
  application: "11111111-1111-4111-8111-111111111111",
  engagement: "22222222-2222-4222-8222-222222222222",
  gig: "33333333-3333-4333-8333-333333333333",
  selection: "44444444-4444-4444-8444-444444444444",
};
const now = "2026-07-26T12:00:00+00:00";

function preview(items, total = items.length, limit = 6) {
  return { items, total, limit, has_more: total > limit };
}

function engagement(status = "in_progress") {
  return {
    engagement_id: ids.engagement,
    gig_id: ids.gig,
    application_id: ids.application,
    gig_title: "Dashboard build",
    status,
    lifecycle_version: 2,
    confirmed_at: now,
    latest_activity_at: now,
    response_required: false,
  };
}

function attention(kind = "selection_response_required", deadline = null) {
  return {
    action_kind: kind,
    resource_id: kind === "engagement_response_required" ? ids.engagement : ids.selection,
    application_id: ids.application,
    gig_id: ids.gig,
    gig_title: "Dashboard build",
    deadline_at: deadline,
    latest_activity_at: now,
  };
}

function freelancerDashboard() {
  return {
    authoritative_now: now,
    summary: {
      total_applications: 1,
      under_review_applications: 0,
      advanced_applications: 1,
      response_required_applications: 1,
      effective_selection_requests: 1,
      active_engagements: 1,
    },
    attention: {
      items: [attention()],
      attention_action_count: 1,
      attention_resource_count: 1,
      limit: 8,
      has_more: false,
    },
    recent_applications: preview([{
      application_id: ids.application,
      gig_id: ids.gig,
      gig_title: "Dashboard build",
      stage: "advanced",
      application_version_number: 2,
      updated_gig_response_required: false,
      qa_action_count: 0,
      has_effective_selection_request: true,
      last_updated_at: now,
    }]),
    active_engagements: preview([engagement()]),
  };
}

function clientDashboard() {
  return {
    authoritative_now: now,
    summary: {
      active_owned_gigs: 1,
      active_applications: 1,
      under_review_applications: 0,
      advanced_applications: 1,
      shortlisted_applications: 1,
      effective_selection_requests: 1,
      active_engagements: 1,
    },
    attention: {
      items: [],
      attention_action_count: 0,
      attention_resource_count: 0,
      limit: 8,
      has_more: false,
    },
    gig_review_overview: preview([{
      gig_id: ids.gig,
      gig_title: "Dashboard build",
      product_state: "open",
      opportunity_lifecycle: "active",
      application_intake: "accepting",
      operational_state: "active",
      under_review_count: 0,
      advanced_count: 1,
      internal_shortlist_count: 1,
      client_qa_action_count: 0,
      has_effective_selection_request: true,
      latest_application_activity_at: now,
    }]),
    pending_selection_requests: preview([{
      selection_request_id: ids.selection,
      application_id: ids.application,
      gig_id: ids.gig,
      gig_title: "Dashboard build",
      created_at: now,
      expires_at: "2026-07-27T12:00:00+00:00",
    }], 1, 5),
    active_engagements: preview([engagement()]),
  };
}

test("strict role contracts accept safe coherent dashboards", () => {
  assert.equal(isFreelancerDashboard(freelancerDashboard()), true);
  assert.equal(isClientDashboard(clientDashboard()), true);
});

test("freelancer contract rejects shortlist and recursive sensitive data", () => {
  const shortlist = freelancerDashboard();
  shortlist.summary.shortlisted_applications = 1;
  assert.equal(isFreelancerDashboard(shortlist), false);
  assert.equal(hasForbiddenDashboardFields({ safe: [{ action_token: "secret" }] }), true);
  const contact = freelancerDashboard();
  contact.recent_applications.items[0].contact_mask = "a•••@example.test";
  assert.equal(isFreelancerDashboard(contact), false);
});

test("loading, error, onboarding empty, and ready states are pure", () => {
  assert.equal(dashboardViewState(true, null, null), "loading");
  assert.equal(dashboardViewState(false, "failed", null), "error");
  const empty = freelancerDashboard();
  for (const key of Object.keys(empty.summary)) empty.summary[key] = 0;
  empty.recent_applications = preview([]);
  empty.active_engagements = preview([]);
  empty.attention = { items: [], attention_action_count: 0, attention_resource_count: 0, limit: 8, has_more: false };
  assert.equal(dashboardViewState(false, null, empty), "empty");
  assert.equal(dashboardViewState(false, null, freelancerDashboard()), "ready");
});

test("attention ordering uses deadline then engagement and selection priority", () => {
  const laterDeadline = attention("qa_response_required", "2026-07-28T00:00:00Z");
  const earlierDeadline = attention("revision_request_response_required", "2026-07-27T00:00:00Z");
  const engagementAction = attention("engagement_response_required");
  const selectionAction = attention("selection_response_required");
  assert.deepEqual(
    [laterDeadline, selectionAction, engagementAction, earlierDeadline]
      .sort(compareAttention)
      .map((item) => item.action_kind),
    [
      "revision_request_response_required",
      "qa_response_required",
      "engagement_response_required",
      "selection_response_required",
    ],
  );
});

test("attention links target existing authoritative pages", () => {
  assert.equal(
    attentionDestination("freelancer", attention()),
    `/applications/${ids.application}`,
  );
  assert.equal(
    attentionDestination("client", attention("qa_response_required")),
    `/gigs/${ids.gig}/applicants/${ids.application}`,
  );
  assert.equal(
    attentionDestination("client", attention("engagement_response_required")),
    `/engagements/${ids.engagement}`,
  );
});

test("role navigation has the exact consolidated workflow order", () => {
  assert.deepEqual(
    dashboardNavigation("freelancer").map((item) => item.label),
    ["Dashboard", "Find Gigs", "My Applications", "Engagements"],
  );
  assert.deepEqual(
    dashboardNavigation("client").map((item) => item.label),
    ["Dashboard", "Manage Gigs", "Engagements", "Create Gig"],
  );
});

test("historical engagement statuses are rejected from active previews", () => {
  for (const status of ["completed", "cancelled"]) {
    const value = freelancerDashboard();
    value.active_engagements.items[0].status = status;
    assert.equal(isFreelancerDashboard(value), false);
  }
});

test("recommendation state is structurally independent from core dashboard", () => {
  const value = freelancerDashboard();
  assert.equal("recommendations" in value, false);
  assert.equal(isFreelancerDashboard(value), true);
});

test("dashboard copy makes no unread, unseen, or notification claims", () => {
  const source = [
    readFileSync(new URL("../src/pages/FreelancerDashboardPage.tsx", import.meta.url), "utf8"),
    readFileSync(new URL("../src/pages/ClientDashboardPage.tsx", import.meta.url), "utf8"),
  ].join("\n");
  assert.doesNotMatch(
    source,
    /\bunread\b|\bunseen\b|waiting for review|proposal needs review|recently viewed|\bnotification\b/i,
  );
});
