"""Pure ranking metric utilities for matching evaluation.

These helpers only calculate metrics from ranked candidate ids and explicit
relevance judgments. They do not run matching rankers, load routes, or compare
ranking methods.
"""

from __future__ import annotations

import math
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from typing import Any

from app.evaluation.contracts import RelevanceJudgment, RelevanceLabel

RelevanceInput = Iterable[RelevanceJudgment] | Mapping[str, RelevanceLabel | int]


@dataclass(frozen=True)
class MetricResult:
    """Result envelope for an evaluation metric calculation."""

    metric_name: str
    value: float | None
    is_available: bool
    reason: str | None = None
    k: int | None = None
    details: dict[str, Any] | None = None


def precision_at_k(
    ranked_candidate_ids: Iterable[str],
    judgments: RelevanceInput,
    k: int,
) -> MetricResult:
    """Calculate Precision@K when every evaluated top-K candidate is judged."""

    metric_name = "precision_at_k"
    context = _prepare_metric_context(ranked_candidate_ids, judgments, k, metric_name)
    if isinstance(context, MetricResult):
        return context

    top_ids = context.ranked_candidate_ids[:k]
    missing = _unjudged_candidate_ids(top_ids, context.relevance_by_candidate)
    if missing:
        return _unavailable(
            metric_name,
            "Precision@K is unavailable because top-K contains unjudged candidates.",
            k=k,
            details={"unjudged_candidate_ids": missing},
        )

    relevant_retrieved_count = sum(
        1 for candidate_id in top_ids if _is_binary_relevant(context.relevance_by_candidate[candidate_id])
    )
    value = relevant_retrieved_count / len(top_ids)
    return _available(
        metric_name,
        value,
        k=k,
        details={
            "evaluated_count": len(top_ids),
            "relevant_retrieved_count": relevant_retrieved_count,
            "judged_count": len(context.relevance_by_candidate),
        },
    )


def recall_at_k(
    ranked_candidate_ids: Iterable[str],
    judgments: RelevanceInput,
    is_complete_judgment_set: bool,
    k: int,
) -> MetricResult:
    """Calculate Recall@K only for complete judgment sets."""

    metric_name = "recall_at_k"
    if not is_complete_judgment_set:
        return _unavailable(
            metric_name,
            "Recall@K is unavailable because the judgment set is incomplete.",
            k=k,
            details={"is_complete_judgment_set": False},
        )

    context = _prepare_metric_context(ranked_candidate_ids, judgments, k, metric_name)
    if isinstance(context, MetricResult):
        return context

    top_ids = context.ranked_candidate_ids[:k]
    missing = _unjudged_candidate_ids(top_ids, context.relevance_by_candidate)
    if missing:
        return _unavailable(
            metric_name,
            "Recall@K is unavailable because top-K contains candidates outside the complete judgment set.",
            k=k,
            details={"unjudged_candidate_ids": missing, "is_complete_judgment_set": True},
        )

    relevant_ids = _relevant_candidate_ids(context.relevance_by_candidate)
    if not relevant_ids:
        return _unavailable(
            metric_name,
            "Recall@K is unavailable because there are no relevant candidates in the complete judgment set.",
            k=k,
            details={"is_complete_judgment_set": True, "relevant_count": 0},
        )

    relevant_retrieved_count = len(set(top_ids) & relevant_ids)
    value = relevant_retrieved_count / len(relevant_ids)
    return _available(
        metric_name,
        value,
        k=k,
        details={
            "evaluated_count": len(top_ids),
            "relevant_count": len(relevant_ids),
            "relevant_retrieved_count": relevant_retrieved_count,
            "is_complete_judgment_set": True,
        },
    )


def ndcg_at_k(
    ranked_candidate_ids: Iterable[str],
    judgments: RelevanceInput,
    k: int,
) -> MetricResult:
    """Calculate NDCG@K using the 0-2 graded relevance labels from 6A."""

    metric_name = "ndcg_at_k"
    context = _prepare_metric_context(ranked_candidate_ids, judgments, k, metric_name)
    if isinstance(context, MetricResult):
        return context

    top_ids = context.ranked_candidate_ids[:k]
    missing = _unjudged_candidate_ids(top_ids, context.relevance_by_candidate)
    if missing:
        return _unavailable(
            metric_name,
            "NDCG@K is unavailable because top-K contains unjudged candidates.",
            k=k,
            details={"unjudged_candidate_ids": missing},
        )

    ranked_relevance = [int(context.relevance_by_candidate[candidate_id]) for candidate_id in top_ids]
    ideal_relevance = sorted((int(label) for label in context.relevance_by_candidate.values()), reverse=True)[:k]

    dcg = _discounted_cumulative_gain(ranked_relevance)
    idcg = _discounted_cumulative_gain(ideal_relevance)
    if idcg == 0:
        return _available(
            metric_name,
            0.0,
            k=k,
            details={
                "evaluated_count": len(top_ids),
                "dcg": dcg,
                "idcg": idcg,
                "idcg_zero": True,
            },
        )

    return _available(
        metric_name,
        dcg / idcg,
        k=k,
        details={
            "evaluated_count": len(top_ids),
            "dcg": dcg,
            "idcg": idcg,
            "idcg_zero": False,
        },
    )


def average_precision(
    ranked_candidate_ids: Iterable[str],
    judgments: RelevanceInput,
    is_complete_judgment_set: bool,
    k: int | None = None,
) -> MetricResult:
    """Calculate Average Precision for one query, optionally truncated to top-K."""

    metric_name = "average_precision"
    if not is_complete_judgment_set:
        return _unavailable(
            metric_name,
            "Average Precision is unavailable because the judgment set is incomplete.",
            k=k,
            details={"is_complete_judgment_set": False},
        )

    context = _prepare_metric_context(ranked_candidate_ids, judgments, k, metric_name)
    if isinstance(context, MetricResult):
        return context

    evaluated_ids = context.ranked_candidate_ids if k is None else context.ranked_candidate_ids[:k]
    missing = _unjudged_candidate_ids(evaluated_ids, context.relevance_by_candidate)
    if missing:
        return _unavailable(
            metric_name,
            "Average Precision is unavailable because the evaluated ranking contains unjudged candidates.",
            k=k,
            details={"unjudged_candidate_ids": missing, "is_complete_judgment_set": True},
        )

    relevant_ids = _relevant_candidate_ids(context.relevance_by_candidate)
    if not relevant_ids:
        return _unavailable(
            metric_name,
            "Average Precision is unavailable because there are no relevant candidates in the complete judgment set.",
            k=k,
            details={"is_complete_judgment_set": True, "relevant_count": 0},
        )

    hits = 0
    precision_sum = 0.0
    for position, candidate_id in enumerate(evaluated_ids, start=1):
        if candidate_id in relevant_ids:
            hits += 1
            precision_sum += hits / position

    return _available(
        metric_name,
        precision_sum / len(relevant_ids),
        k=k,
        details={
            "evaluated_count": len(evaluated_ids),
            "relevant_count": len(relevant_ids),
            "relevant_retrieved_count": hits,
            "is_complete_judgment_set": True,
        },
    )


def mean_average_precision(ap_results: Iterable[MetricResult]) -> MetricResult:
    """Calculate MAP from available query-level Average Precision results."""

    metric_name = "mean_average_precision"
    results = list(ap_results)
    if len(results) < 2:
        return _unavailable(
            metric_name,
            "MAP is unavailable because at least two query-level AP results are required.",
            details={"query_count": len(results)},
        )

    values: list[float] = []
    for index, result in enumerate(results):
        if result.metric_name != "average_precision":
            return _unavailable(
                metric_name,
                "MAP is unavailable because every input must be an Average Precision result.",
                details={"invalid_result_index": index, "metric_name": result.metric_name},
            )
        if not result.is_available or result.value is None:
            return _unavailable(
                metric_name,
                "MAP is unavailable because every included query must have an available AP value.",
                details={"invalid_result_index": index, "reason": result.reason},
            )
        details = result.details or {}
        relevant_count = details.get("relevant_count", 0)
        if not isinstance(relevant_count, int) or details.get("is_complete_judgment_set") is not True or relevant_count < 1:
            return _unavailable(
                metric_name,
                "MAP is unavailable because every included query must have complete judgments and at least one relevant candidate.",
                details={"invalid_result_index": index},
            )
        values.append(result.value)

    return _available(
        metric_name,
        sum(values) / len(values),
        details={"query_count": len(values)},
    )


@dataclass(frozen=True)
class _MetricContext:
    ranked_candidate_ids: list[str]
    relevance_by_candidate: dict[str, RelevanceLabel]


def _prepare_metric_context(
    ranked_candidate_ids: Iterable[str],
    judgments: RelevanceInput,
    k: int | None,
    metric_name: str,
) -> _MetricContext | MetricResult:
    k_error = _validate_k(k, metric_name)
    if k_error is not None:
        return k_error

    ranking = list(ranked_candidate_ids)
    if not ranking:
        return _unavailable(metric_name, f"{_display_name(metric_name)} is unavailable because the ranked candidate list is empty.", k=k)

    duplicate_ranked_ids = _duplicate_values(ranking)
    if duplicate_ranked_ids:
        return _unavailable(
            metric_name,
            f"{_display_name(metric_name)} is unavailable because ranked candidate ids must be unique.",
            k=k,
            details={"duplicate_candidate_ids": duplicate_ranked_ids},
        )

    relevance_by_candidate, reason = _normalize_judgments(judgments)
    if reason is not None:
        return _unavailable(metric_name, reason, k=k)

    return _MetricContext(ranked_candidate_ids=ranking, relevance_by_candidate=relevance_by_candidate)


def _validate_k(k: int | None, metric_name: str) -> MetricResult | None:
    if k is None:
        return None
    if isinstance(k, bool) or not isinstance(k, int) or k <= 0:
        return _unavailable(metric_name, f"{_display_name(metric_name)} is unavailable because k must be a positive integer.", k=k)
    return None


def _normalize_judgments(judgments: RelevanceInput) -> tuple[dict[str, RelevanceLabel], str | None]:
    relevance_by_candidate: dict[str, RelevanceLabel] = {}

    if isinstance(judgments, Mapping):
        raw_items = judgments.items()
    else:
        raw_items = ((judgment.candidate_id, judgment.relevance_label) for judgment in judgments)

    for candidate_id, raw_label in raw_items:
        if not isinstance(candidate_id, str) or not candidate_id.strip():
            return {}, "Metric is unavailable because every judgment candidate_id must be a non-empty string."
        normalized_candidate_id = candidate_id.strip()
        if normalized_candidate_id in relevance_by_candidate:
            return {}, "Metric is unavailable because judgments contain duplicate candidate ids."

        label = _normalize_relevance_label(raw_label)
        if label is None:
            return {}, "Metric is unavailable because relevance labels must use the 0, 1, 2 evaluation scale."
        relevance_by_candidate[normalized_candidate_id] = label

    if not relevance_by_candidate:
        return {}, "Metric is unavailable because at least one relevance judgment is required."
    return relevance_by_candidate, None


def _normalize_relevance_label(value: RelevanceLabel | int) -> RelevanceLabel | None:
    if isinstance(value, bool):
        return None
    try:
        return RelevanceLabel(value)
    except (TypeError, ValueError):
        return None


def _unjudged_candidate_ids(candidate_ids: Iterable[str], relevance_by_candidate: Mapping[str, RelevanceLabel]) -> list[str]:
    return [candidate_id for candidate_id in candidate_ids if candidate_id not in relevance_by_candidate]


def _relevant_candidate_ids(relevance_by_candidate: Mapping[str, RelevanceLabel]) -> set[str]:
    return {
        candidate_id
        for candidate_id, relevance_label in relevance_by_candidate.items()
        if _is_binary_relevant(relevance_label)
    }


def _is_binary_relevant(relevance_label: RelevanceLabel) -> bool:
    return int(relevance_label) >= int(RelevanceLabel.PARTIALLY_RELEVANT)


def _discounted_cumulative_gain(relevance_labels: Iterable[int]) -> float:
    return sum(((2**relevance_label) - 1) / math.log2(position + 1) for position, relevance_label in enumerate(relevance_labels, start=1))


def _duplicate_values(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    duplicates: list[str] = []
    for value in values:
        if value in seen and value not in duplicates:
            duplicates.append(value)
        seen.add(value)
    return duplicates


def _available(metric_name: str, value: float, k: int | None = None, details: dict[str, Any] | None = None) -> MetricResult:
    return MetricResult(
        metric_name=metric_name,
        value=value,
        is_available=True,
        reason=None,
        k=k,
        details=details,
    )


def _unavailable(
    metric_name: str,
    reason: str,
    k: int | None = None,
    details: dict[str, Any] | None = None,
) -> MetricResult:
    return MetricResult(
        metric_name=metric_name,
        value=None,
        is_available=False,
        reason=reason,
        k=k,
        details=details,
    )


def _display_name(metric_name: str) -> str:
    return {
        "precision_at_k": "Precision@K",
        "recall_at_k": "Recall@K",
        "ndcg_at_k": "NDCG@K",
        "average_precision": "Average Precision",
        "mean_average_precision": "MAP",
    }.get(metric_name, "Metric")
