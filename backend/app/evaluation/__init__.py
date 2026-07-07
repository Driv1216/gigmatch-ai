"""Internal evaluation fixture contracts and loaders."""

from app.evaluation.fixtures import (
    EvaluationFixtureValidationError,
    load_evaluation_fixture_file,
    load_seeded_evaluation_fixtures,
    validate_evaluation_fixture,
)
from app.evaluation.metrics import (
    MetricResult,
    average_precision,
    mean_average_precision,
    ndcg_at_k,
    precision_at_k,
    recall_at_k,
)
from app.evaluation.runner import (
    EvaluationStrategy,
    EvaluationSummary,
    QueryEvaluationComparison,
    RankedEvaluationCandidate,
    RankingComparisonRow,
    StrategyEvaluationResult,
    evaluate_query,
    run_evaluation,
)
from app.evaluation.contracts import (
    EvaluationFixture,
    EvaluationLabelSource,
    EvaluationQuery,
    EvaluationQueryType,
    RelevanceJudgment,
    RelevanceLabel,
)

__all__ = [
    "EvaluationFixture",
    "EvaluationFixtureValidationError",
    "EvaluationLabelSource",
    "EvaluationQuery",
    "EvaluationQueryType",
    "EvaluationStrategy",
    "EvaluationSummary",
    "MetricResult",
    "QueryEvaluationComparison",
    "RankedEvaluationCandidate",
    "RankingComparisonRow",
    "RelevanceJudgment",
    "RelevanceLabel",
    "StrategyEvaluationResult",
    "average_precision",
    "evaluate_query",
    "load_evaluation_fixture_file",
    "load_seeded_evaluation_fixtures",
    "mean_average_precision",
    "ndcg_at_k",
    "precision_at_k",
    "recall_at_k",
    "run_evaluation",
    "validate_evaluation_fixture",
]
