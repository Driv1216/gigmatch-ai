import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { isApplicantDetail, isApplicantListEnvelope } from "../src/lib/applicantReviewContracts.ts";
import {
  applicantInboxState,
  applicantActionBlockerMessage,
  applicantRankingModeLabel,
  applicantRankingUnavailableMessage,
  applicantReviewErrorMessage,
  applicantScorePresentation,
  notSelectedDecisionReady,
  reopenDecisionReady,
  shouldRefreshApplicantReviewAfterError,
  validApplicantViews,
} from "../src/lib/applicantReviewView.ts";
import { participantStageFiveOwnsPath } from "../src/lib/participantNavigation.ts";

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
    { label: "Suitability unavailable", score: null },
  );
  assert.deepEqual(applicantScorePresentation(suitability), { label: "Strong Match", score: "84%" });
  assert.match(applicantRankingUnavailableMessage("matching_input_unavailable"), /remains in the complete review pool/i);
  assert.equal(applicantRankingModeLabel(null), "No ranking mode available");
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
  assert.equal(shouldRefreshApplicantReviewAfterError("review_action_not_allowed"), true);
  assert.equal(shouldRefreshApplicantReviewAfterError("pending_selection_blocks_review_action"), true);
  assert.match(applicantActionBlockerMessage("pending_selection_blocks_review_action"), /effective selection request/i);
});

test("Stage 5 route ownership is exact across every near-collision", () => {
  for (const pathname of [
    "/gigs/g1/applicants",
    "/gigs/g1/applicants/a1",
  ]) assert.equal(participantStageFiveOwnsPath(pathname), true, pathname);

  for (const pathname of [
    "/gigs",
    "/gigs/new",
    "/gigs/manage",
    "/gigs/g1",
    "/gigs/g1/apply",
    "/gigs/g1/edit",
    "/gigs/g1/parse",
    "/gigs/g1/applicants/",
    "/gigs/g1/applicants/a1/extra",
    "/gigs/g1/applicants-extra",
    "/applications",
    "/applications/a1",
    "/applications/a1/edit",
    "/engagements",
    "/engagements/e1",
  ]) assert.equal(participantStageFiveOwnsPath(pathname), false, pathname);
});

test("applicant inbox keeps authoritative status and ordering vocabularies", () => {
  const source = read("../src/pages/ApplicantInboxPage.tsx");
  const api = read("../src/lib/applicantReview.ts");
  for (const label of ["Best Match", "Newest", "Internal Shortlist", "Advanced", "Not Selected", "Withdrawn", "Closed history", "All records"]) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /data\.items\.map/);
  assert.match(source, /Every real application remains in this register/);
  assert.match(source, /The complete active applicant pool is unchanged/);
  assert.match(api, /view: options\.view/);
  assert.match(api, /status: options\.status/);
  assert.doesNotMatch(source, /sort\s*\(/);
});

test("ranking presentation keeps unavailable, keyword fallback, and hybrid evidence honest", () => {
  const inbox = read("../src/pages/ApplicantInboxPage.tsx");
  const detail = read("../src/pages/ClientApplicantDetailPage.tsx");
  assert.match(inbox, /ranking_mode === "keyword_fallback"/);
  assert.match(inbox, /no hybrid or semantic score is implied/i);
  assert.match(detail, /ranking_mode === "hybrid"[^]*Semantic evidence/);
  assert.match(detail, /ranking_mode === "hybrid"[^]*Combined evidence/);
  assert.match(detail, /ranking_status === "available"/);
  assert.doesNotMatch(read("../src/lib/applicantReviewView.ts"), /proposal|price|budget/i);
});

test("commercial proposal stays separate from current suitability and reuses sanitized Stage 4 snapshots", () => {
  const source = read("../src/pages/ClientApplicantDetailPage.tsx");
  assert.match(source, /Current suitability/);
  assert.match(source, /Current commercial proposal/);
  assert.match(source, /Client review decision/);
  assert.match(source, /ApplicationProposalSnapshot/);
  assert.match(source, /ApplicationVersionReference/);
  assert.match(source, /Price does not affect suitability/);
  assert.doesNotMatch(source, /JSON\.stringify/);
});

test("private shortlist and participant-visible stage decisions remain independent token domains", () => {
  const detail = read("../src/pages/ClientApplicantDetailPage.tsx");
  const api = read("../src/lib/applicantReview.ts");
  assert.match(detail, /Client-private organization/);
  assert.match(detail, /Applicant-visible review stage/);
  assert.match(detail, /shortlist_action_token/);
  assert.match(detail, /review_decision_action_token/);
  assert.match(api, /shortlist_action_token: shortlistActionToken/);
  assert.match(api, /review_decision_action_token: token/);
  assert.doesNotMatch(detail, /Under Review[^]*→[^]*Shortlisted[^]*→[^]*Advanced/i);
});

test("review decisions use one narrow accessible dialog with exact current structured reasons", () => {
  const dialog = read("../src/components/ApplicantReviewDialog.tsx");
  for (const reason of [
    "required_skills_mismatch",
    "experience_level_mismatch",
    "proposal_exceeded_budget",
    "timeline_or_availability_mismatch",
    "stronger_overall_match",
    "gig_requirements_changed",
    "other",
  ]) assert.match(dialog, new RegExp(reason));
  assert.doesNotMatch(dialog, /another_applicant_selected/);
  assert.match(dialog, /<dialog/);
  assert.match(dialog, /showModal\(\)/);
  assert.match(dialog, /event\.key === "Escape"/);
  assert.match(dialog, /returnFocusRef\.current\?\.focus/);
  assert.match(dialog, /Advanced decisions require at least one meaningful feedback point/);
  assert.match(dialog, /final Not Selected decision/);
  assert.match(dialog, /does not claim to AI-moderate/);
  assert.doesNotMatch(dialog, /window\.(prompt|confirm)/);
});

test("controlled conflicts refetch authority without clearing the mounted decision form", () => {
  const detail = read("../src/pages/ClientApplicantDetailPage.tsx");
  const dialog = read("../src/components/ApplicantReviewDialog.tsx");
  assert.match(detail, /shouldRefreshApplicantReviewAfterError/);
  assert.match(detail, /await load\(\)\.catch/);
  assert.match(dialog, /Your inputs remain here while the authoritative record is refreshed/);
  assert.match(dialog, /stillAuthorized/);
  assert.doesNotMatch(detail, /silentRetry|setTimeout\([^]*submitDialog/);
});

test("Reopen Application remains 7E authority and never restores shortlist in React", () => {
  const detail = read("../src/pages/ClientApplicantDetailPage.tsx");
  const dialog = read("../src/components/ApplicantReviewDialog.tsx");
  assert.match(detail, /Reopen Application/);
  assert.match(detail, /shortlist state was not restored/);
  assert.match(dialog, /not a reconsideration invitation or failed-engagement Gig Reopening/);
  const reopenBranch = detail.slice(detail.indexOf("return runMutation(\n      () => reopenApplicant"), detail.indexOf("\n  return ("));
  assert.doesNotMatch(reopenBranch, /setApplicantShortlist/);
});

test("participant review history excludes private organization and historical versions exclude current scores", () => {
  const detail = read("../src/pages/ClientApplicantDetailPage.tsx");
  assert.match(detail, /Participant-visible events only/);
  assert.match(detail, /Private shortlist activity is intentionally absent/);
  assert.match(detail, /Current suitability is deliberately not attached to any historical application version/);
  assert.match(detail, /answeredGigVersion=\{version\.answered_gig_version_number\}/);
});

test("Stage 6, Stage 7 selection, and first-class Stage 8 reconsideration stay separate", () => {
  const detail = read("../src/pages/ClientApplicantDetailPage.tsx");
  assert.match(detail, /stage-six-page-region is-client/);
  assert.match(detail, /<StructuredQaPanel/);
  assert.match(detail, /data-later-stage="selection"/);
  assert.match(detail, /<SelectionPanel/);
  assert.match(detail, /data-later-stage="reconsideration"/);
  assert.match(detail, /<ReconsiderationPanel/);
  assert.match(detail, /Stage 7 \+ Stage 8 distinct authorities/);
  assert.match(detail, /separate sibling records/);
  assert.match(detail, /first-class Stage 8 workflow/);
});

test("Stage 5 preserves freelancer privacy, lazy client protection, and token non-persistence", () => {
  const app = read("../src/App.tsx");
  const stageFive = [
    read("../src/pages/ApplicantInboxPage.tsx"),
    read("../src/pages/ClientApplicantDetailPage.tsx"),
    read("../src/components/ApplicantReviewContextRail.tsx"),
    read("../src/components/ApplicantReviewDialog.tsx"),
    read("../src/lib/applicantReview.ts"),
  ].join("\n");
  const stageFour = [read("../src/pages/MyApplicationsPage.tsx"), read("../src/pages/ApplicationDetailPage.tsx")].join("\n");
  assert.match(app, /const ApplicantInboxPage = lazy/);
  assert.match(app, /const ClientApplicantDetailPage = lazy/);
  assert.match(app, /path="\/gigs\/:gigId\/applicants"[^]*allowedRole="client"/);
  assert.match(app, /path="\/gigs\/:gigId\/applicants\/:applicationId"[^]*allowedRole="client"/);
  assert.doesNotMatch(stageFour, /shortlist_action_token|review_decision_action_token|Internal Shortlist/);
  assert.doesNotMatch(stageFive, /localStorage|sessionStorage|document\.cookie|console\.(log|debug)/);
});

function read(relative) {
  return readFileSync(new URL(relative, import.meta.url), "utf8");
}

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
