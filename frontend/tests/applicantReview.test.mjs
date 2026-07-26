import assert from "node:assert/strict";
import test from "node:test";

import { isApplicantDetail, isApplicantListEnvelope } from "../src/lib/applicantReviewContracts.ts";
import {
  applicantInboxState,
  applicantReviewErrorMessage,
  applicantScorePresentation,
  notSelectedDecisionReady,
  reopenDecisionReady,
  shouldRefreshApplicantReviewAfterError,
  validApplicantViews,
} from "../src/lib/applicantReviewView.ts";

const suitability = {
  evidence_label: "Current AI-assisted suitability evidence",
  ranking_status: "available",
  ranking_mode: "hybrid",
  ranking_score: 0.84,
  keyword_score: 0.8,
  semantic_score: 0.89,
  hybrid_score: 0.84,
  match_label: "Strong Match",
  ranking_unavailable_reason: null,
  strongest_matching_evidence: "Python",
  explanation: {},
  ranking_generated_at: "2026-07-24T00:00:00Z",
};
const card = {
  application_id: "a1",
  freelancer: { display_name: "Applicant" },
  stage: "under_review",
  submitted_at: "2026-07-24T00:00:00Z",
  stage_changed_at: "2026-07-24T00:00:00Z",
  suitability,
  commercial: {},
  review_state: { is_shortlisted: false, shortlisted_at: null, review_state_version: 0 },
  allowed_actions: [],
  action_blockers: [],
  shortlist_action_token: "s".repeat(64),
  review_decision_action_token: "d".repeat(64),
};
const pagination = { page: 1, page_size: 20, total_items: 1, total_pages: 1 };
const envelope = {
  gig: { gig_id: "g1" },
  counts: { active: 1 },
  ranking_context: { ranking_mode: "hybrid", semantic_status: "available", semantic_unavailable_reason: null },
  ranking_generated_at: "2026-07-24T00:00:00Z",
  items: [card],
  pagination,
};

test("applicant inbox exposes loading, active empty, terminal empty, error, and ready states", () => {
  assert.equal(applicantInboxState(true, null, 0, "active"), "loading");
  assert.equal(applicantInboxState(false, null, 0, "active"), "empty_active");
  assert.equal(applicantInboxState(false, null, 0, "withdrawn"), "empty_history");
  assert.equal(applicantInboxState(false, "offline", 0, "active"), "error");
  assert.equal(applicantInboxState(false, null, 1, "active"), "ready");
});

test("Gate 7E-1 view model hides internal shortlist until review actions are ready", () => {
  assert.deepEqual(validApplicantViews("active"), ["best_match", "newest", "advanced"]);
  assert.deepEqual(validApplicantViews("active", true), ["best_match", "newest", "internal_shortlist", "advanced"]);
  assert.deepEqual(validApplicantViews("not_selected", true), ["newest", "best_match"]);
});

test("unrankable applicants never receive a fake zero score", () => {
  assert.deepEqual(
    applicantScorePresentation({ ranking_status: "unavailable", ranking_score: null, match_label: null }),
    { label: "Match score unavailable", score: null },
  );
  assert.deepEqual(applicantScorePresentation(suitability), { label: "Strong Match", score: "84%" });
});

test("list and detail runtime contracts require current evidence and separate action tokens", () => {
  assert.equal(isApplicantListEnvelope(envelope), true);
  assert.equal(isApplicantListEnvelope({ ...envelope, items: [{ ...card, shortlist_action_token: null }] }), false);
  const detail = {
    ...card,
    gig: {},
    current_application_version_id: "v1",
    current_application_version_number: 1,
    current_application: {},
    commercial_proposal: {},
    answered_gig_version: {},
    current_material_gig_version: {},
    material_change_comparison: [],
    response_to_updated_gig_required: false,
    review_history: [],
    application_version_count: 1,
    version_history: { items: [], pagination: { ...pagination, total_items: 0, total_pages: 0 } },
    ranking_context: envelope.ranking_context,
    ranking_generated_at: envelope.ranking_generated_at,
  };
  assert.equal(isApplicantDetail(detail), true);
  assert.equal(isApplicantDetail({ ...detail, review_decision_action_token: 3 }), false);
});

test("review conflict messages preserve refresh and retry behavior", () => {
  const error = Object.assign(new Error("stale review action"), { code: "stale_review_action" });
  assert.equal(
    applicantReviewErrorMessage(error),
    "The applicant or gig changed. Review the refreshed state before trying again.",
  );
  assert.equal(shouldRefreshApplicantReviewAfterError("stale_review_action"), true);
  assert.equal(shouldRefreshApplicantReviewAfterError("shortlist_capacity_reached"), true);
  assert.equal(shouldRefreshApplicantReviewAfterError("review_action_not_allowed"), false);
});

test("decision readiness mirrors the structured client confirmation requirements", () => {
  assert.equal(notSelectedDecisionReady({
    stage: "under_review",
    reason: "stronger_overall_match",
    otherExplanation: "",
    feedback: "",
    finalConfirmed: false,
  }), true);
  assert.equal(notSelectedDecisionReady({
    stage: "advanced",
    reason: "stronger_overall_match",
    otherExplanation: "",
    feedback: "",
    finalConfirmed: true,
  }), false);
  assert.equal(notSelectedDecisionReady({
    stage: "advanced",
    reason: "stronger_overall_match",
    otherExplanation: "",
    feedback: "Relevant experience was less aligned.",
    finalConfirmed: true,
  }), true);
  assert.equal(notSelectedDecisionReady({
    stage: "under_review",
    reason: "other",
    otherExplanation: " ",
    feedback: "",
    finalConfirmed: false,
  }), false);
  assert.equal(reopenDecisionReady("client_reconsideration", ""), true);
  assert.equal(reopenDecisionReady("other", " "), false);
  assert.equal(reopenDecisionReady("other", "Requirements changed."), true);
});
