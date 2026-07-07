import type {
  EvaluationStrategy,
  EvaluationSummary,
  MetricResult,
  QueryEvaluationComparison,
  RankedEvaluationCandidate,
  RankingComparisonRow,
  StrategyEvaluationResult,
} from "./evaluationTypes";
import { EVALUATION_STRATEGIES } from "./evaluationTypes";
import { supabase } from "./supabaseClient";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

export class EvaluationApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "EvaluationApiError";
    this.status = status;
  }
}

type EvaluationRequestOptions = {
  topKs?: number[];
};

export async function fetchEvaluationSummary(options: EvaluationRequestOptions = {}): Promise<EvaluationSummary> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new EvaluationApiError("Sign in again to load evaluation results.", 401);
  }

  const url = new URL(`${apiBaseUrl}/evaluation/matching`);
  for (const topK of options.topKs ?? []) {
    url.searchParams.append("top_k", String(topK));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      Accept: "application/json",
    },
  });

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new EvaluationApiError(
      messageFromApiError(data, "We could not load the evaluation summary right now."),
      response.status,
    );
  }

  if (!isEvaluationSummary(data)) {
    throw new Error("The evaluation API returned an unexpected response.");
  }

  return data;
}

function messageFromApiError(data: unknown, fallback: string) {
  if (!isRecord(data) || !("detail" in data)) {
    return fallback;
  }

  return typeof data.detail === "string" ? data.detail : fallback;
}

function isEvaluationSummary(value: unknown): value is EvaluationSummary {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isStringArray(value.fixture_ids) &&
    typeof value.query_count === "number" &&
    typeof value.candidate_count === "number" &&
    typeof value.judgment_count === "number" &&
    isNumberArray(value.top_ks) &&
    Array.isArray(value.query_results) &&
    value.query_results.every(isQueryEvaluationComparison) &&
    isAggregateResults(value.aggregate_results) &&
    isStringArray(value.limitations) &&
    (value.generated_from === undefined || typeof value.generated_from === "string")
  );
}

function isQueryEvaluationComparison(value: unknown): value is QueryEvaluationComparison {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.fixture_id === "string" &&
    typeof value.query_id === "string" &&
    (value.query_type === "freelancer_to_gigs" || value.query_type === "gig_to_freelancers") &&
    typeof value.candidate_count === "number" &&
    typeof value.judgment_count === "number" &&
    typeof value.is_complete_judgment_set === "boolean" &&
    isStrategyResults(value.strategy_results) &&
    Array.isArray(value.ranking_comparison_rows) &&
    value.ranking_comparison_rows.every(isRankingComparisonRow) &&
    isStringArray(value.limitations)
  );
}

function isStrategyResults(value: unknown): value is Partial<Record<EvaluationStrategy, StrategyEvaluationResult>> {
  if (!isRecord(value)) {
    return false;
  }

  return EVALUATION_STRATEGIES.every((strategy) => {
    const strategyResult = value[strategy];
    return strategyResult === undefined || isStrategyEvaluationResult(strategyResult);
  });
}

function isStrategyEvaluationResult(value: unknown): value is StrategyEvaluationResult {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isEvaluationStrategy(value.strategy) &&
    isStringArray(value.ranked_candidate_ids) &&
    Array.isArray(value.ranked_candidates) &&
    value.ranked_candidates.every(isRankedEvaluationCandidate) &&
    Array.isArray(value.metrics) &&
    value.metrics.every(isMetricResult) &&
    isStringRecord(value.unavailable_metric_reasons) &&
    isStringArray(value.limitations)
  );
}

function isRankedEvaluationCandidate(value: unknown): value is RankedEvaluationCandidate {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.candidate_id === "string" &&
    typeof value.rank === "number" &&
    typeof value.score === "number" &&
    isEvaluationStrategy(value.strategy) &&
    (value.score_breakdown === undefined || value.score_breakdown === null || isRecord(value.score_breakdown))
  );
}

function isMetricResult(value: unknown): value is MetricResult {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.metric_name === "string" &&
    (typeof value.value === "number" || value.value === null) &&
    typeof value.is_available === "boolean" &&
    (value.reason === undefined || value.reason === null || typeof value.reason === "string") &&
    (value.k === undefined || value.k === null || typeof value.k === "number") &&
    (value.details === undefined || value.details === null || isRecord(value.details))
  );
}

function isRankingComparisonRow(value: unknown): value is RankingComparisonRow {
  if (!isRecord(value) || typeof value.candidate_id !== "string" || !isRecord(value.ranks_by_strategy)) {
    return false;
  }

  const ranksByStrategy = value.ranks_by_strategy;
  return EVALUATION_STRATEGIES.every((strategy) => {
    const rank = ranksByStrategy[strategy];
    return rank === undefined || rank === null || typeof rank === "number";
  });
}

function isAggregateResults(value: unknown): value is Partial<Record<EvaluationStrategy, MetricResult[]>> {
  if (!isRecord(value)) {
    return false;
  }

  return EVALUATION_STRATEGIES.every((strategy) => {
    const metrics = value[strategy];
    return metrics === undefined || (Array.isArray(metrics) && metrics.every(isMetricResult));
  });
}

function isEvaluationStrategy(value: unknown): value is EvaluationStrategy {
  return EVALUATION_STRATEGIES.includes(value as EvaluationStrategy);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === "number");
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every((item) => typeof item === "string");
}
