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
  dashboardHeaderContext,
  dashboardViewState,
} from "../src/lib/dashboardView.ts";
import {
  filterParticipantDestinations,
  participantDestinations,
  participantPrimaryNavigation,
  participantShellOwnsPath,
  participantStageThreeOwnsPath,
  participantStageTwoOwnsPath,
  resolveParticipantShortcut,
} from "../src/lib/participantNavigation.ts";

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

test("dashboard header context uses only real attention action and resource counts", () => {
  assert.deepEqual(
    dashboardHeaderContext("freelancer", "ready", freelancerDashboard()),
    {
      eyebrow: "Freelancer dashboard",
      title: "1 response action",
      detail: "Across 1 workflow resource.",
    },
  );
  assert.deepEqual(
    dashboardHeaderContext("client", "empty", clientDashboard()),
    {
      eyebrow: "Client dashboard",
      title: "0 response actions",
      detail: "Across 0 workflow resources.",
    },
  );
  assert.doesNotMatch(JSON.stringify(dashboardHeaderContext("client", "loading", null)), /\b0\b/);
  assert.doesNotMatch(JSON.stringify(dashboardHeaderContext("client", "error", null)), /\b0\b/);
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
    participantPrimaryNavigation("freelancer").map((item) => item.label),
    ["Dashboard", "Find Gigs", "Applications", "Engagements"],
  );
  assert.deepEqual(
    participantPrimaryNavigation("client").map((item) => item.label),
    ["Dashboard", "Manage Gigs", "Engagements", "Create Gig"],
  );
});

test("participant command filtering is finite, role-aware, and route-only", () => {
  assert.deepEqual(
    filterParticipantDestinations("freelancer", "proposal submissions")
      .map((item) => item.to),
    ["/applications"],
  );
  assert.deepEqual(
    filterParticipantDestinations("client", "new gig").map((item) => item.to),
    ["/gigs/new"],
  );
  assert.equal(
    participantDestinations("freelancer").some((item) => item.to === "/gigs/manage"),
    false,
  );
  assert.equal(
    participantDestinations("client").some((item) => item.to === "/applications"),
    false,
  );
  for (const role of ["freelancer", "client"]) {
    for (const destination of participantDestinations(role)) {
      assert.match(destination.to, /^\//);
      assert.notEqual(destination.to, "/login");
      assert.equal("action" in destination, false);
      assert.equal("loader" in destination, false);
    }
  }
});

test("participant shell path ownership excludes public, auth, admin, and unknown routes", () => {
  for (const pathname of [
    "/dashboard/freelancer",
    "/dashboard/client",
    "/gigs",
    "/gigs/123/applicants",
    "/applications/123/edit",
    "/engagements/123",
    "/profile/resume-parse",
  ]) {
    assert.equal(participantShellOwnsPath(pathname), true, pathname);
  }
  for (const pathname of [
    "/", "/login", "/signup", "/dashboard/admin", "/unknown",
    "/gigs/123/unknown", "/gigs/123/apply/extra",
    "/applications/123/history", "/applications/123/edit/extra",
    "/engagements/123/extra", "/profile/freelancer/extra",
  ]) {
    assert.equal(participantShellOwnsPath(pathname), false, pathname);
  }
});

test("Stage 2 shell emergence is limited to discovery, detail, and submission routes", () => {
  assert.equal(participantStageTwoOwnsPath("/gigs"), true);
  assert.equal(participantStageTwoOwnsPath("/gigs/gig-1"), true);
  assert.equal(participantStageTwoOwnsPath("/gigs/gig-1/apply"), true);
  assert.equal(participantStageTwoOwnsPath("/gigs/new"), false);
  assert.equal(participantStageTwoOwnsPath("/gigs/manage"), false);
  assert.equal(participantStageTwoOwnsPath("/gigs/gig-1/edit"), false);
  assert.equal(participantStageTwoOwnsPath("/gigs/gig-1/applicants"), false);
});

test("Stage 3 shell emergence owns only creation, management, and canonical editing", () => {
  for (const pathname of ["/gigs/new", "/gigs/manage", "/gigs/gig-1/edit"]) {
    assert.equal(participantStageThreeOwnsPath(pathname), true, pathname);
  }
  for (const pathname of [
    "/gigs",
    "/gigs/gig-1",
    "/gigs/gig-1/parse",
    "/gigs/gig-1/applicants",
    "/gigs/gig-1/applicants/application-1",
    "/gigs/gig-1/apply",
    "/gigs/new/edit",
    "/gigs/manage/edit",
  ]) {
    assert.equal(participantStageThreeOwnsPath(pathname), false, pathname);
  }
});

test("participant command keyboard rules respect editable controls, modifiers, dialogs, and Escape", () => {
  const shortcut = (overrides = {}) => resolveParticipantShortcut({
    key: "/",
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    editableTarget: false,
    dialogOwnsKeyboard: false,
    commandOpen: false,
    ...overrides,
  });
  assert.equal(shortcut(), "open");
  assert.equal(shortcut({ editableTarget: true }), null);
  assert.equal(shortcut({ ctrlKey: true }), null);
  assert.equal(shortcut({ dialogOwnsKeyboard: true }), null);
  assert.equal(shortcut({ key: "k", metaKey: true }), "open");
  assert.equal(shortcut({ key: "k", ctrlKey: true, editableTarget: true }), "open");
  assert.equal(shortcut({ key: "k", metaKey: true, dialogOwnsKeyboard: true }), null);
  assert.equal(shortcut({ key: "Escape", commandOpen: true }), "close");
  assert.equal(shortcut({ key: "Escape", commandOpen: false }), null);
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

test("Stage 1 shell sources contain no concept import, role switching, persistence, or action tokens", () => {
  const participantShellSource = readFileSync(new URL("../src/components/ParticipantShell.tsx", import.meta.url), "utf8");
  const appLayoutSource = readFileSync(new URL("../src/components/AppLayout.tsx", import.meta.url), "utf8");
  const source = [
    participantShellSource,
    appLayoutSource,
    readFileSync(new URL("../src/components/ParticipantCommandSurface.tsx", import.meta.url), "utf8"),
    readFileSync(new URL("../src/lib/participantNavigation.ts", import.meta.url), "utf8"),
  ].join("\n");
  assert.doesNotMatch(
    source,
    /concepts-gpt-2|switchRole|action_token|localStorage|sessionStorage|active record/i,
  );
  assert.doesNotMatch(participantShellSource, /is-legacy|switchboard-legacy-boundary/);
  assert.doesNotMatch(appLayoutSource, /Navbar/);
});
