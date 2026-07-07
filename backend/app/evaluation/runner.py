"""Backend-only evaluation runner for comparing matching ranking strategies."""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from enum import Enum
from typing import Any

from app.evaluation.contracts import EvaluationFixture, EvaluationQuery, EvaluationQueryType
from app.evaluation.metrics import (
    MetricResult,
    average_precision,
    mean_average_precision,
    ndcg_at_k,
    precision_at_k,
    recall_at_k,
)
from app.matching import (
    EmbeddingProvider,
    FreelancerMatchProfile,
    GigMatchProfile,
    HybridMatchResult,
    KeywordMatchResult,
    SemanticMatchResult,
    rank_freelancers_for_gig,
    rank_freelancers_for_gig_hybrid,
    rank_freelancers_for_gig_semantic,
    rank_gigs_for_freelancer,
    rank_gigs_for_freelancer_hybrid,
    rank_gigs_for_freelancer_semantic,
)


class EvaluationStrategy(str, Enum):
    """Ranking strategies compared by the evaluation runner."""

    KEYWORD = "keyword"
    SEMANTIC = "semantic"
    HYBRID = "hybrid"


@dataclass(frozen=True)
class RankedEvaluationCandidate:
    """One ranked candidate in an evaluation strategy result."""

    candidate_id: str
    rank: int
    score: float
    strategy: EvaluationStrategy
    score_breakdown: dict[str, Any] | None = None


@dataclass(frozen=True)
class StrategyEvaluationResult:
    """Evaluation output for one strategy on one query."""

    strategy: EvaluationStrategy
    ranked_candidate_ids: tuple[str, ...]
    ranked_candidates: tuple[RankedEvaluationCandidate, ...]
    metrics: tuple[MetricResult, ...]
    unavailable_metric_reasons: dict[str, str]
    limitations: tuple[str, ...] = ()


@dataclass(frozen=True)
class RankingComparisonRow:
    """Ranks for one candidate across all evaluated strategies."""

    candidate_id: str
    ranks_by_strategy: dict[str, int | None]


@dataclass(frozen=True)
class QueryEvaluationComparison:
    """Comparison output for one fixture query."""

    fixture_id: str
    query_id: str
    query_type: EvaluationQueryType
    candidate_count: int
    judgment_count: int
    is_complete_judgment_set: bool
    strategy_results: dict[EvaluationStrategy, StrategyEvaluationResult]
    ranking_comparison_rows: tuple[RankingComparisonRow, ...]
    limitations: tuple[str, ...] = ()


@dataclass(frozen=True)
class EvaluationSummary:
    """Full backend evaluation summary across one or more fixtures."""

    fixture_ids: tuple[str, ...]
    query_count: int
    candidate_count: int
    judgment_count: int
    top_ks: tuple[int, ...]
    query_results: tuple[QueryEvaluationComparison, ...]
    aggregate_results: dict[EvaluationStrategy, tuple[MetricResult, ...]]
    limitations: tuple[str, ...]


def run_evaluation(
    fixtures: Iterable[EvaluationFixture],
    *,
    top_ks: Iterable[int] = (1, 3),
    embedding_provider: EmbeddingProvider,
) -> EvaluationSummary:
    """Run keyword, semantic, and hybrid rankings over fixture query pools."""

    fixture_list = tuple(fixtures)
    normalized_top_ks = _normalize_top_ks(top_ks)
    query_results: list[QueryEvaluationComparison] = []

    for fixture in fixture_list:
        for query in fixture.queries:
            query_results.append(
                evaluate_query(
                    fixture_id=fixture.fixture_id,
                    query=query,
                    top_ks=normalized_top_ks,
                    embedding_provider=embedding_provider,
                )
            )

    aggregate_results = {
        strategy: _aggregate_strategy_metrics(query_results, strategy, normalized_top_ks)
        for strategy in EvaluationStrategy
    }

    return EvaluationSummary(
        fixture_ids=tuple(fixture.fixture_id for fixture in fixture_list),
        query_count=len(query_results),
        candidate_count=sum(result.candidate_count for result in query_results),
        judgment_count=sum(result.judgment_count for result in query_results),
        top_ks=normalized_top_ks,
        query_results=tuple(query_results),
        aggregate_results=aggregate_results,
        limitations=(
            "Seeded fixtures are small local/demo evaluation data, not production-scale benchmarks.",
            "Semantic and hybrid results depend on the injected embedding provider.",
            "Aggregate metric averages include only query-level metrics that are available and report included/excluded counts.",
            "This runner does not call FastAPI matching routes or create improvement claims.",
        ),
    )


def evaluate_query(
    *,
    fixture_id: str,
    query: EvaluationQuery,
    top_ks: Iterable[int],
    embedding_provider: EmbeddingProvider,
) -> QueryEvaluationComparison:
    """Evaluate all ranking strategies for one fixture query."""

    normalized_top_ks = _normalize_top_ks(top_ks)
    candidate_ids = _candidate_ids_for_query(query)
    strategy_results = {
        EvaluationStrategy.KEYWORD: _evaluate_strategy(
            EvaluationStrategy.KEYWORD,
            _rank_keyword(query),
            candidate_ids,
            query,
            normalized_top_ks,
        ),
        EvaluationStrategy.SEMANTIC: _evaluate_strategy(
            EvaluationStrategy.SEMANTIC,
            _rank_semantic(query, embedding_provider),
            candidate_ids,
            query,
            normalized_top_ks,
        ),
        EvaluationStrategy.HYBRID: _evaluate_strategy(
            EvaluationStrategy.HYBRID,
            _rank_hybrid(query, embedding_provider),
            candidate_ids,
            query,
            normalized_top_ks,
        ),
    }

    return QueryEvaluationComparison(
        fixture_id=fixture_id,
        query_id=query.query_id,
        query_type=query.query_type,
        candidate_count=len(candidate_ids),
        judgment_count=len(query.judgments),
        is_complete_judgment_set=query.is_complete_judgment_set,
        strategy_results=strategy_results,
        ranking_comparison_rows=_build_ranking_comparison_rows(candidate_ids, strategy_results),
        limitations=_query_limitations(strategy_results, candidate_ids),
    )


def _rank_keyword(query: EvaluationQuery) -> list[KeywordMatchResult]:
    if query.query_type == EvaluationQueryType.FREELANCER_TO_GIGS:
        return rank_gigs_for_freelancer(
            _freelancer_query_entity(query),
            list(_gig_candidate_entities(query)),
        )
    return rank_freelancers_for_gig(
        _gig_query_entity(query),
        list(_freelancer_candidate_entities(query)),
    )


def _rank_semantic(query: EvaluationQuery, provider: EmbeddingProvider) -> list[SemanticMatchResult]:
    if query.query_type == EvaluationQueryType.FREELANCER_TO_GIGS:
        return rank_gigs_for_freelancer_semantic(
            _freelancer_query_entity(query),
            list(_gig_candidate_entities(query)),
            provider,
        )
    return rank_freelancers_for_gig_semantic(
        _gig_query_entity(query),
        list(_freelancer_candidate_entities(query)),
        provider,
    )


def _rank_hybrid(query: EvaluationQuery, provider: EmbeddingProvider) -> list[HybridMatchResult]:
    if query.query_type == EvaluationQueryType.FREELANCER_TO_GIGS:
        return rank_gigs_for_freelancer_hybrid(
            _freelancer_query_entity(query),
            list(_gig_candidate_entities(query)),
            provider,
        )
    return rank_freelancers_for_gig_hybrid(
        _gig_query_entity(query),
        list(_freelancer_candidate_entities(query)),
        provider,
    )


def _evaluate_strategy(
    strategy: EvaluationStrategy,
    ranker_results: list[KeywordMatchResult] | list[SemanticMatchResult] | list[HybridMatchResult],
    expected_candidate_ids: tuple[str, ...],
    query: EvaluationQuery,
    top_ks: tuple[int, ...],
) -> StrategyEvaluationResult:
    ranked_candidates = tuple(_to_ranked_candidate(strategy, result) for result in ranker_results)
    ranked_candidate_ids = tuple(candidate.candidate_id for candidate in ranked_candidates)
    limitations = _ranking_limitations(strategy, expected_candidate_ids, ranked_candidate_ids)
    metrics = _calculate_strategy_metrics(ranked_candidate_ids, query, top_ks)

    return StrategyEvaluationResult(
        strategy=strategy,
        ranked_candidate_ids=ranked_candidate_ids,
        ranked_candidates=ranked_candidates,
        metrics=metrics,
        unavailable_metric_reasons={
            _metric_key(metric): metric.reason or "Metric unavailable."
            for metric in metrics
            if not metric.is_available
        },
        limitations=limitations,
    )


def _calculate_strategy_metrics(
    ranked_candidate_ids: tuple[str, ...],
    query: EvaluationQuery,
    top_ks: tuple[int, ...],
) -> tuple[MetricResult, ...]:
    metrics: list[MetricResult] = []
    for k in top_ks:
        metrics.extend(
            [
                precision_at_k(ranked_candidate_ids, query.judgments, k),
                recall_at_k(ranked_candidate_ids, query.judgments, query.is_complete_judgment_set, k),
                ndcg_at_k(ranked_candidate_ids, query.judgments, k),
            ]
        )
    metrics.append(
        average_precision(
            ranked_candidate_ids,
            query.judgments,
            query.is_complete_judgment_set,
        )
    )
    return tuple(metrics)


def _aggregate_strategy_metrics(
    query_results: tuple[QueryEvaluationComparison, ...] | list[QueryEvaluationComparison],
    strategy: EvaluationStrategy,
    top_ks: tuple[int, ...],
) -> tuple[MetricResult, ...]:
    strategy_query_results = [result.strategy_results[strategy] for result in query_results]
    aggregate_metrics: list[MetricResult] = []

    for k in top_ks:
        for metric_name in ("precision_at_k", "recall_at_k", "ndcg_at_k"):
            aggregate_metrics.append(
                _average_available_metric(
                    strategy_query_results,
                    source_metric_name=metric_name,
                    aggregate_metric_name=f"mean_{metric_name}",
                    k=k,
                )
            )

    valid_ap_results = [
        metric
        for result in strategy_query_results
        for metric in result.metrics
        if metric.metric_name == "average_precision" and metric.is_available and metric.value is not None
    ]
    map_result = mean_average_precision(valid_ap_results)
    aggregate_metrics.append(
        MetricResult(
            metric_name=map_result.metric_name,
            value=map_result.value,
            is_available=map_result.is_available,
            reason=map_result.reason,
            k=map_result.k,
            details={
                **(map_result.details or {}),
                "included_query_count": len(valid_ap_results),
                "excluded_query_count": len(strategy_query_results) - len(valid_ap_results),
                "total_query_count": len(strategy_query_results),
            },
        )
    )
    return tuple(aggregate_metrics)


def _average_available_metric(
    strategy_results: list[StrategyEvaluationResult],
    *,
    source_metric_name: str,
    aggregate_metric_name: str,
    k: int,
) -> MetricResult:
    matching_metrics = [
        metric
        for result in strategy_results
        for metric in result.metrics
        if metric.metric_name == source_metric_name and metric.k == k
    ]
    available_metrics = [metric for metric in matching_metrics if metric.is_available and metric.value is not None]

    details = {
        "included_query_count": len(available_metrics),
        "excluded_query_count": len(matching_metrics) - len(available_metrics),
        "total_query_count": len(matching_metrics),
    }
    if not available_metrics:
        return MetricResult(
            metric_name=aggregate_metric_name,
            value=None,
            is_available=False,
            reason=f"{aggregate_metric_name} is unavailable because no query-level {source_metric_name} values are available.",
            k=k,
            details=details,
        )

    return MetricResult(
        metric_name=aggregate_metric_name,
        value=sum(metric.value for metric in available_metrics if metric.value is not None) / len(available_metrics),
        is_available=True,
        reason=None,
        k=k,
        details=details,
    )


def _to_ranked_candidate(
    strategy: EvaluationStrategy,
    result: KeywordMatchResult | SemanticMatchResult | HybridMatchResult,
) -> RankedEvaluationCandidate:
    if isinstance(result, KeywordMatchResult):
        return RankedEvaluationCandidate(
            candidate_id=result.candidate_id,
            rank=result.rank,
            score=result.keyword_score,
            strategy=strategy,
            score_breakdown={
                "keyword_score": result.keyword_score,
                "required_skill_coverage": result.required_skill_coverage,
                "preferred_skill_coverage": result.preferred_skill_coverage,
                "category_alignment": result.category_alignment,
                "missing_required_skill_penalty": result.missing_required_skill_penalty,
            },
        )
    if isinstance(result, SemanticMatchResult):
        return RankedEvaluationCandidate(
            candidate_id=result.candidate_id,
            rank=result.rank,
            score=result.semantic_score,
            strategy=strategy,
            score_breakdown={
                "semantic_score": result.semantic_score,
                "raw_cosine_similarity": result.raw_cosine_similarity,
                "vector_dimension": result.vector_dimension,
                "provider_name": result.provider_name,
            },
        )
    return RankedEvaluationCandidate(
        candidate_id=result.candidate_id,
        rank=result.rank,
        score=result.hybrid_score,
        strategy=strategy,
        score_breakdown={
            "hybrid_score": result.hybrid_score,
            "keyword_score": result.keyword_score,
            "semantic_score": result.semantic_score,
            "keyword_weight": result.keyword_weight,
            "semantic_weight": result.semantic_weight,
        },
    )


def _build_ranking_comparison_rows(
    candidate_ids: tuple[str, ...],
    strategy_results: Mapping[EvaluationStrategy, StrategyEvaluationResult],
) -> tuple[RankingComparisonRow, ...]:
    rows: list[RankingComparisonRow] = []
    for candidate_id in candidate_ids:
        rows.append(
            RankingComparisonRow(
                candidate_id=candidate_id,
                ranks_by_strategy={
                    strategy.value: _rank_for_candidate(candidate_id, result.ranked_candidates)
                    for strategy, result in strategy_results.items()
                },
            )
        )
    return tuple(rows)


def _rank_for_candidate(candidate_id: str, candidates: tuple[RankedEvaluationCandidate, ...]) -> int | None:
    for candidate in candidates:
        if candidate.candidate_id == candidate_id:
            return candidate.rank
    return None


def _ranking_limitations(
    strategy: EvaluationStrategy,
    expected_candidate_ids: tuple[str, ...],
    ranked_candidate_ids: tuple[str, ...],
) -> tuple[str, ...]:
    limitations: list[str] = []
    duplicates = _duplicate_values(ranked_candidate_ids)
    if duplicates:
        limitations.append(
            f"{strategy.value} ranking returned duplicate candidate ids: {', '.join(duplicates)}."
        )

    expected = set(expected_candidate_ids)
    ranked = set(ranked_candidate_ids)
    missing = sorted(expected - ranked)
    extra = sorted(ranked - expected)
    if missing:
        limitations.append(
            f"{strategy.value} ranking did not return fixture candidates: {', '.join(missing)}."
        )
    if extra:
        limitations.append(
            f"{strategy.value} ranking returned candidates outside the fixture pool: {', '.join(extra)}."
        )
    return tuple(limitations)


def _query_limitations(
    strategy_results: Mapping[EvaluationStrategy, StrategyEvaluationResult],
    candidate_ids: tuple[str, ...],
) -> tuple[str, ...]:
    limitations: list[str] = []
    for result in strategy_results.values():
        limitations.extend(result.limitations)
        if len(result.ranked_candidate_ids) != len(candidate_ids):
            limitations.append(
                f"{result.strategy.value} ranking returned {len(result.ranked_candidate_ids)} of {len(candidate_ids)} fixture candidates."
            )
    return tuple(dict.fromkeys(limitations))


def _candidate_ids_for_query(query: EvaluationQuery) -> tuple[str, ...]:
    if query.query_type == EvaluationQueryType.FREELANCER_TO_GIGS:
        return tuple(candidate.gig_id for candidate in _gig_candidate_entities(query))
    return tuple(candidate.freelancer_id for candidate in _freelancer_candidate_entities(query))


def _freelancer_query_entity(query: EvaluationQuery) -> FreelancerMatchProfile:
    if not isinstance(query.query_entity, FreelancerMatchProfile):
        raise TypeError(f"Query {query.query_id!r} expected a freelancer query entity.")
    return query.query_entity


def _gig_query_entity(query: EvaluationQuery) -> GigMatchProfile:
    if not isinstance(query.query_entity, GigMatchProfile):
        raise TypeError(f"Query {query.query_id!r} expected a gig query entity.")
    return query.query_entity


def _gig_candidate_entities(query: EvaluationQuery) -> tuple[GigMatchProfile, ...]:
    candidates = tuple(query.candidate_entities)
    if not all(isinstance(candidate, GigMatchProfile) for candidate in candidates):
        raise TypeError(f"Query {query.query_id!r} expected gig candidate entities.")
    return candidates  # type: ignore[return-value]


def _freelancer_candidate_entities(query: EvaluationQuery) -> tuple[FreelancerMatchProfile, ...]:
    candidates = tuple(query.candidate_entities)
    if not all(isinstance(candidate, FreelancerMatchProfile) for candidate in candidates):
        raise TypeError(f"Query {query.query_id!r} expected freelancer candidate entities.")
    return candidates  # type: ignore[return-value]


def _normalize_top_ks(top_ks: Iterable[int]) -> tuple[int, ...]:
    normalized = tuple(dict.fromkeys(top_ks))
    if not normalized:
        raise ValueError("At least one top-K value is required.")
    invalid = [k for k in normalized if isinstance(k, bool) or not isinstance(k, int) or k <= 0]
    if invalid:
        raise ValueError("Top-K values must be positive integers.")
    return normalized


def _duplicate_values(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    duplicates: list[str] = []
    for value in values:
        if value in seen and value not in duplicates:
            duplicates.append(value)
        seen.add(value)
    return duplicates


def _metric_key(metric: MetricResult) -> str:
    if metric.k is None:
        return metric.metric_name
    return f"{metric.metric_name}@{metric.k}"
