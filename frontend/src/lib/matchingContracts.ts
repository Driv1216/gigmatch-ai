import type { MatchExplanation } from "./matchingExplanations";

export type RankingMode = "hybrid" | "semantic" | "keyword" | "keyword_fallback";
export type SemanticStatus = "available" | "unavailable" | "not_requested";
export type SemanticUnavailableReason =
  | "embedding_provider_not_configured"
  | "embedding_provider_unavailable"
  | "embedding_generation_failed"
  | "invalid_embedding_output";

export type RankingContext = {
  ranking_mode: RankingMode;
  semantic_status: SemanticStatus;
  semantic_unavailable_reason: SemanticUnavailableReason | null;
};

type RankedItem = {
  rank: number;
  ranking_mode: RankingMode;
  ranking_score: number;
  semantic_status: SemanticStatus;
  semantic_unavailable_reason: SemanticUnavailableReason | null;
  hybrid_score: number | null;
  keyword_score: number;
  semantic_score: number | null;
  explanation?: MatchExplanation | null;
};

export type RecommendedGigItem = RankedItem & {
  gig_id: string;
  title?: string | null;
  category?: string | null;
  status?: string | null;
};

export type RecommendedGigsEnvelope = {
  ranking_context: RankingContext;
  items: RecommendedGigItem[];
  count: number;
  limit: number;
};

export type RecommendedFreelancerItem = RankedItem & {
  freelancer_id: string;
  headline?: string | null;
  primary_role?: string | null;
};

export type RecommendedFreelancersEnvelope = {
  ranking_context: RankingContext;
  items: RecommendedFreelancerItem[];
  count: number;
  limit: number;
};

export function isRecommendedGigsEnvelope(value: unknown): value is RecommendedGigsEnvelope {
  if (!isRecord(value) || !isRankingContext(value.ranking_context) || !Array.isArray(value.items)) {
    return false;
  }
  const context = value.ranking_context;
  return value.items.every((item) => isRecommendedGigItem(item) && itemMatchesContext(item, context)) &&
    typeof value.count === "number" && typeof value.limit === "number";
}

export function isRecommendedFreelancersEnvelope(value: unknown): value is RecommendedFreelancersEnvelope {
  if (!isRecord(value) || !isRankingContext(value.ranking_context) || !Array.isArray(value.items)) {
    return false;
  }
  const context = value.ranking_context;
  return value.items.every((item) => isRecommendedFreelancerItem(item) && itemMatchesContext(item, context)) &&
    typeof value.count === "number" && typeof value.limit === "number";
}

export function isRankingContext(value: unknown): value is RankingContext {
  if (!isRecord(value) || !isRankingMode(value.ranking_mode) || !isSemanticStatus(value.semantic_status)) {
    return false;
  }
  if (value.semantic_unavailable_reason !== null && !isSemanticReason(value.semantic_unavailable_reason)) {
    return false;
  }
  return value.semantic_status === "unavailable"
    ? value.semantic_unavailable_reason !== null
    : value.semantic_unavailable_reason === null;
}

function isRecommendedGigItem(value: unknown): value is RecommendedGigItem {
  return isRecord(value) && typeof value.gig_id === "string" && isOptionalString(value.title) &&
    isOptionalString(value.category) && isOptionalString(value.status) && isRankedItem(value);
}

function isRecommendedFreelancerItem(value: unknown): value is RecommendedFreelancerItem {
  return isRecord(value) && typeof value.freelancer_id === "string" && isOptionalString(value.headline) &&
    isOptionalString(value.primary_role) && isRankedItem(value);
}

function isRankedItem(value: Record<string, unknown>): boolean {
  const hasBaseFields = (
    typeof value.rank === "number" &&
    isRankingMode(value.ranking_mode) &&
    typeof value.ranking_score === "number" &&
    isSemanticStatus(value.semantic_status) &&
    (value.semantic_unavailable_reason === null || isSemanticReason(value.semantic_unavailable_reason)) &&
    isNullableNumber(value.hybrid_score) &&
    typeof value.keyword_score === "number" &&
    isNullableNumber(value.semantic_score) &&
    (value.explanation === undefined || value.explanation === null || isRecord(value.explanation))
  );
  if (!hasBaseFields) return false;
  if (value.ranking_mode === "hybrid") {
    return value.semantic_status === "available" && typeof value.hybrid_score === "number" &&
      typeof value.semantic_score === "number" && value.ranking_score === value.hybrid_score;
  }
  if (value.ranking_mode === "semantic") {
    return value.semantic_status === "available" && typeof value.semantic_score === "number" &&
      value.hybrid_score === null && value.ranking_score === value.semantic_score;
  }
  if (value.ranking_mode === "keyword_fallback") {
    return value.semantic_status === "unavailable" && value.semantic_unavailable_reason !== null &&
      value.semantic_score === null && value.hybrid_score === null && value.ranking_score === value.keyword_score;
  }
  return value.semantic_score === null && value.hybrid_score === null && value.ranking_score === value.keyword_score;
}

function itemMatchesContext(item: RankedItem, context: RankingContext) {
  return item.ranking_mode === context.ranking_mode && item.semantic_status === context.semantic_status &&
    item.semantic_unavailable_reason === context.semantic_unavailable_reason;
}

function isRankingMode(value: unknown): value is RankingMode {
  return ["hybrid", "semantic", "keyword", "keyword_fallback"].includes(String(value));
}

function isSemanticStatus(value: unknown): value is SemanticStatus {
  return ["available", "unavailable", "not_requested"].includes(String(value));
}

function isSemanticReason(value: unknown): value is SemanticUnavailableReason {
  return [
    "embedding_provider_not_configured",
    "embedding_provider_unavailable",
    "embedding_generation_failed",
    "invalid_embedding_output",
  ].includes(String(value));
}

function isNullableNumber(value: unknown) {
  return value === null || typeof value === "number";
}

function isOptionalString(value: unknown) {
  return value === undefined || value === null || typeof value === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
