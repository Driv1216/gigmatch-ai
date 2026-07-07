export type EvaluationStrategy = "keyword" | "semantic" | "hybrid";

export type MetricResult = {
  metric_name: string;
  value: number | null;
  is_available: boolean;
  reason?: string | null;
  k?: number | null;
  details?: Record<string, unknown> | null;
};

export type RankedEvaluationCandidate = {
  candidate_id: string;
  rank: number;
  score: number;
  strategy: EvaluationStrategy;
  score_breakdown?: Record<string, unknown> | null;
};

export type StrategyEvaluationResult = {
  strategy: EvaluationStrategy;
  ranked_candidate_ids: string[];
  ranked_candidates: RankedEvaluationCandidate[];
  metrics: MetricResult[];
  unavailable_metric_reasons: Record<string, string>;
  limitations: string[];
};

export type RankingComparisonRow = {
  candidate_id: string;
  ranks_by_strategy: Partial<Record<EvaluationStrategy, number | null>>;
};

export type QueryEvaluationComparison = {
  fixture_id: string;
  query_id: string;
  query_type: "freelancer_to_gigs" | "gig_to_freelancers";
  candidate_count: number;
  judgment_count: number;
  is_complete_judgment_set: boolean;
  strategy_results: Partial<Record<EvaluationStrategy, StrategyEvaluationResult>>;
  ranking_comparison_rows: RankingComparisonRow[];
  limitations: string[];
};

export type EvaluationSummary = {
  fixture_ids: string[];
  query_count: number;
  candidate_count: number;
  judgment_count: number;
  top_ks: number[];
  query_results: QueryEvaluationComparison[];
  aggregate_results: Partial<Record<EvaluationStrategy, MetricResult[]>>;
  limitations: string[];
  generated_from?: string;
};

export const EVALUATION_STRATEGIES: EvaluationStrategy[] = ["keyword", "semantic", "hybrid"];
