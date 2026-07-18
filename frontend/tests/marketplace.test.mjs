import assert from "node:assert/strict";
import test from "node:test";

import { isGigDetailResponse, isGigDiscoveryEnvelope } from "../src/lib/marketplaceContracts.ts";
import { isRecommendedGigsEnvelope } from "../src/lib/matchingContracts.ts";
import {
  availabilityMessage,
  collectionViewState,
  gigDetailPath,
  paginationState,
  rankingPresentation,
} from "../src/lib/marketplaceView.ts";

const client = {
  display_name: "Asha Client",
  company_name: "Acme Labs",
  company_summary: "Product studio",
  industry: "Software",
};
const payment = {
  payment_structure: "fixed_price",
  currency: "INR",
  budget: { minimum: 50000, maximum: 75000, unit: null },
  budget_flexibility: "slightly_flexible",
  hourly_rate: null,
  weekly_commitment: null,
  engagement_duration: null,
  guidance_type: null,
  guidance_range: null,
  maximum_budget: null,
  no_estimate_explanation: null,
  preferred_proposal_form: null,
};
const summary = {
  gig_id: "gig-1",
  title: "Build an API",
  published_summary: "Approved scope",
  category: "Backend",
  product_state: "open",
  required_skills: ["Python"],
  preferred_skills: ["PostgreSQL"],
  experience_requirement: "mid",
  work_mode: "remote",
  location_requirement: "India timezone overlap",
  payment,
  application_deadline: "2099-01-01T00:00:00+00:00",
  published_at: "2026-07-18T00:00:00+00:00",
  accepting_applications: true,
  client,
};

test("collection view states cover loading, empty, error, and ready rendering", () => {
  assert.equal(collectionViewState(true, null, 0), "loading");
  assert.equal(collectionViewState(false, null, 0), "empty");
  assert.equal(collectionViewState(false, "network error", 0), "error");
  assert.equal(collectionViewState(false, null, 2), "ready");
});

test("pagination controls reflect adjacent-page availability", () => {
  assert.deepEqual(paginationState(1, 3), { canGoPrevious: false, canGoNext: true });
  assert.deepEqual(paginationState(2, 3), { canGoPrevious: true, canGoNext: true });
  assert.deepEqual(paginationState(3, 3), { canGoPrevious: true, canGoNext: false });
});

test("recommendation navigation builds the real encoded gig-detail route", () => {
  assert.equal(gigDetailPath("gig/one"), "/gigs/gig%2Fone");
});

test("discovery and full detail envelopes parse safe client and gig fields", () => {
  assert.equal(isGigDiscoveryEnvelope({
    items: [summary],
    pagination: { page: 1, page_size: 20, total_items: 1, total_pages: 1 },
  }), true);
  assert.equal(isGigDetailResponse({
    ...summary,
    response_kind: "detail",
    description: "Complete published description",
    deliverables: ["API", "Tests"],
    expected_weekly_commitment: null,
    expected_duration: null,
    project_deadline: null,
    availability_reason: "accepting_applications",
    material_updated_at: "2026-07-18T00:00:00+00:00",
  }), true);
});

test("current unavailable state renders an explicit safe message", () => {
  assert.equal(
    availabilityMessage({ accepting_applications: false, availability_reason: "opportunity_paused" }),
    "This opportunity is paused and is not accepting applications right now.",
  );
  assert.equal(
    availabilityMessage({ accepting_applications: false, availability_reason: "applications_closed" }),
    "Applications are closed for this opportunity.",
  );
});

test("hybrid ranking presentation keeps hybrid and semantic scores visible", () => {
  assert.deepEqual(rankingPresentation({
    ranking_mode: "hybrid",
    semantic_status: "available",
    semantic_unavailable_reason: null,
  }), {
    label: "Hybrid ranking",
    message: "Recommendations combine keyword and semantic matching evidence.",
    showHybridScore: true,
    showSemanticScore: true,
  });
});

test("keyword fallback rendering explicitly suppresses semantic and hybrid scores", () => {
  const presentation = rankingPresentation({
    ranking_mode: "keyword_fallback",
    semantic_status: "unavailable",
    semantic_unavailable_reason: "embedding_provider_unavailable",
  });
  assert.equal(presentation.label, "Keyword ranking");
  assert.match(presentation.message, /semantic matching is temporarily unavailable/i);
  assert.equal(presentation.showHybridScore, false);
  assert.equal(presentation.showSemanticScore, false);
});

test("recommendation response-envelope parsing accepts honest fallback and rejects fabricated scores", () => {
  const fallback = {
    ranking_context: {
      ranking_mode: "keyword_fallback",
      semantic_status: "unavailable",
      semantic_unavailable_reason: "embedding_generation_failed",
    },
    items: [{
      gig_id: "gig-1",
      title: "Build API",
      category: "Backend",
      status: "open",
      rank: 1,
      ranking_mode: "keyword_fallback",
      ranking_score: 0.8,
      semantic_status: "unavailable",
      semantic_unavailable_reason: "embedding_generation_failed",
      hybrid_score: null,
      keyword_score: 0.8,
      semantic_score: null,
      explanation: {},
    }],
    count: 1,
    limit: 10,
  };
  assert.equal(isRecommendedGigsEnvelope(fallback), true);
  assert.equal(isRecommendedGigsEnvelope({
    ...fallback,
    items: [{ ...fallback.items[0], semantic_score: 0.9, hybrid_score: 0.85 }],
  }), false);
  assert.equal(isRecommendedGigsEnvelope({
    ...fallback,
    items: [{ ...fallback.items[0], ranking_mode: "hybrid" }],
  }), false);
});

test("route-level tombstone response parsing supports terminal detail links", () => {
  assert.equal(isGigDetailResponse({
    response_kind: "tombstone",
    gig_id: "gig-filled",
    title: "Filled opportunity",
    product_state: "filled",
    message: "This opportunity is no longer available.",
  }), true);
});
