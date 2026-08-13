import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  participantShellOwnsPath,
  participantStageTenOwnsPath,
  participantStageTwoOwnsPath,
} from "../src/lib/participantNavigation.ts";
import { stageElevenOwnsPublicPath } from "../src/lib/publicNavigation.ts";
import {
  formatCountDetail,
  formatMetricName,
  formatMetricValue,
  formatQueryType,
  formatStrategyLabel,
} from "../src/lib/evaluationDisplay.ts";

const read = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8");
const appSource = read("../src/App.tsx");
const appLayoutSource = read("../src/components/AppLayout.tsx");
const protectedRouteSource = read("../src/components/ProtectedRoute.tsx");
const pageSource = read("../src/pages/AdminDashboardPage.tsx");
const apiSource = read("../src/lib/evaluation.ts");
const typeSource = read("../src/lib/evaluationTypes.ts");
const summarySource = read("../src/components/admin/evaluation/EvaluationSummaryCards.tsx");
const metricsSource = read("../src/components/admin/evaluation/MetricResultsPanel.tsx");
const querySource = read("../src/components/admin/evaluation/QueryComparisonSection.tsx");
const strategySource = read("../src/components/admin/evaluation/StrategyComparisonTable.tsx");
const rankingSource = read("../src/components/admin/evaluation/RankingComparisonTable.tsx");
const limitationsSource = read("../src/components/admin/evaluation/EvaluationLimitationsPanel.tsx");
const displaySources = [pageSource, summarySource, metricsSource, querySource, strategySource, rankingSource, limitationsSource].join("\n");
const backendRouteSource = read("../../backend/app/api/routes/evaluation.py");

test("admin evaluation remains one lazy, persisted-role-protected route", () => {
  assert.match(appSource, /const AdminDashboardPage = lazy\(/);
  assert.match(appSource, /path="\/dashboard\/admin" element=\{<ProtectedRoute allowedRole="admin">/);
  assert.equal((appSource.match(/path="\/dashboard\/admin"/g) ?? []).length, 1);
  assert.match(protectedRouteSource, /dashboardPathForRole\(role\)/);
  assert.match(appLayoutSource, /location\.pathname === "\/dashboard\/admin"/);
  assert.doesNotMatch(appLayoutSource, /ParticipantShell[\s\S]{0,120}dashboard\/admin/);
  assert.equal(participantShellOwnsPath("/dashboard/admin"), false);
});

test("Stage 1 through 11 ownership remains unchanged", () => {
  assert.equal(participantShellOwnsPath("/dashboard/freelancer"), true);
  assert.equal(participantShellOwnsPath("/dashboard/client"), true);
  assert.equal(participantStageTwoOwnsPath("/gigs"), true);
  assert.equal(participantStageTenOwnsPath("/profile/resume-parse"), true);
  assert.equal(stageElevenOwnsPublicPath("/"), true);
  assert.equal(stageElevenOwnsPublicPath("/login"), true);
  assert.equal(stageElevenOwnsPublicPath("/signup"), true);
  assert.equal(stageElevenOwnsPublicPath("/dashboard/admin"), false);
});

test("the frontend requests and renders the real sanitized evaluation DTO", () => {
  assert.match(apiSource, /\/evaluation\/matching/);
  assert.match(apiSource, /isEvaluationSummary\(data\)/);
  for (const field of [
    "fixture_ids",
    "query_count",
    "candidate_count",
    "judgment_count",
    "top_ks",
    "query_results",
    "aggregate_results",
    "limitations",
  ]) {
    assert.match(typeSource, new RegExp(`\\b${field}\\b`));
    assert.match(pageSource + summarySource + metricsSource + querySource + limitationsSource, new RegExp(`summary\\.${field}`));
  }
  assert.match(backendRouteSource, /load_seeded_evaluation_fixtures\(\)/);
  assert.match(backendRouteSource, /run_evaluation\(/);
  assert.match(backendRouteSource, /payload\["generated_from"\] = "seeded_evaluation_fixtures"/);
});

test("seeded local/demo scope is explicit and production analytics are not claimed", () => {
  assert.match(pageSource, /small seeded local\/demo fixtures/i);
  assert.match(pageSource, /not production traffic/i);
  assert.match(pageSource, /production-scale benchmark/i);
  assert.match(summarySource, /Seeded evaluation run/);
  assert.doesNotMatch(displaySources, /success rate|improvement percentage|winner strategy|overall AI score|business KPI|fairness score|platform-wide performance|time to hire reduction/i);
});

test("metric formatting preserves backend availability rather than manufacturing zero", () => {
  assert.equal(formatMetricValue(null), "Unavailable");
  assert.equal(formatMetricValue(undefined), "Unavailable");
  assert.equal(formatMetricValue(0), "0.000");
  assert.equal(formatMetricValue(0.81256), "0.813");
  assert.equal(formatCountDetail(undefined), "Unavailable");
  assert.equal(formatCountDetail(0), "0");
  assert.equal(formatMetricName({ metric_name: "mean_precision_at_k", value: 0.5, is_available: true, k: 3 }), "Mean Precision At K@3");
  assert.match(metricsSource, /metric\.is_available \? formatMetricValue\(metric\.value\) : "Unavailable"/);
  assert.doesNotMatch(metricsSource + strategySource + rankingSource, /\?\? 0/);
});

test("strategy and query comparison preserve every backend row without winner logic", () => {
  assert.equal(formatStrategyLabel("keyword"), "Keyword");
  assert.equal(formatStrategyLabel("semantic"), "Semantic");
  assert.equal(formatStrategyLabel("hybrid"), "Hybrid");
  assert.equal(formatQueryType("freelancer_to_gigs"), "Freelancer to gigs");
  assert.match(querySource, /summary\.query_results\.map/);
  assert.match(strategySource, /EVALUATION_STRATEGIES\.map/);
  assert.match(rankingSource, /query\.ranking_comparison_rows\.map/);
  assert.match(rankingSource, /findCandidate\(query, strategy, row\.candidate_id\)/);
  assert.doesNotMatch(displaySources, /winner|best strategy|improvement|sort\(|toSorted\(|\.reduce\(|Math\.(?:max|min)/i);
});

test("backend and query limitations stay attached to the evidence", () => {
  assert.match(pageSource, /<EvaluationLimitationsPanel limitations=\{summary\.limitations\} \/>/);
  assert.match(limitationsSource, /limitations\.map/);
  assert.match(querySource, /query\.limitations\.map/);
  assert.doesNotMatch(pageSource, /\[\.\.\.summary\.limitations/);
});

test("admin rendering excludes private internals and adds no admin mutation product", () => {
  assert.doesNotMatch(
    displaySources,
    /raw_resume|raw_gig|parse_rows|embedding_vector|raw_semantic|auth_metadata|access_token|service_(?:role|key)|private_profile|contact_data|database internals/i,
  );
  assert.doesNotMatch(
    displaySources,
    /user management|role management|account suspension|model switching|weight tuning|retraining|fixture editing|label editing|moderation/i,
  );
  assert.doesNotMatch(pageSource, /supabase\.from|\.insert\(|\.update\(|\.delete\(|method:\s*["'](?:POST|PUT|PATCH|DELETE)/);
  assert.match(pageSource, /fetchEvaluationSummary\(\)/);
});

test("tables remain semantic, labelled, and responsive without a new dependency", () => {
  for (const source of [metricsSource, strategySource, rankingSource]) {
    assert.match(source, /<table/);
    assert.match(source, /<caption>/);
    assert.match(source, /admin-evaluation-table-wrap/);
  }
  assert.match(strategySource, /<th scope="row">/);
  assert.match(rankingSource, /<th scope="row">/);
});
