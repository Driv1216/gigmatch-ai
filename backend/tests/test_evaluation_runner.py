import unittest

from app.evaluation import (
    EvaluationStrategy,
    load_seeded_evaluation_fixtures,
    run_evaluation,
    validate_evaluation_fixture,
)
from app.matching import DeterministicFakeEmbeddingProvider


class EvaluationRunnerTests(unittest.TestCase):
    def test_runner_evaluates_seeded_fixtures_for_both_query_directions(self):
        fixtures = load_seeded_evaluation_fixtures()
        provider = DeterministicFakeEmbeddingProvider(dimensions=8)

        summary = run_evaluation(fixtures, top_ks=(1, 3), embedding_provider=provider)

        self.assertEqual(summary.fixture_ids, ("seeded_matching_eval_001",))
        self.assertEqual(summary.query_count, 2)
        self.assertEqual(summary.candidate_count, 6)
        self.assertEqual(summary.judgment_count, 6)
        self.assertEqual(summary.top_ks, (1, 3))
        self.assertEqual(
            {result.query_type.value for result in summary.query_results},
            {"freelancer_to_gigs", "gig_to_freelancers"},
        )

        for query_result in summary.query_results:
            self.assertEqual(set(query_result.strategy_results), set(EvaluationStrategy))
            self.assertEqual(query_result.candidate_count, 3)
            self.assertEqual(query_result.judgment_count, 3)
            self.assertTrue(query_result.is_complete_judgment_set)
            self.assertEqual(len(query_result.ranking_comparison_rows), 3)
            self.assertEqual(query_result.limitations, ())

            fixture_candidate_ids = {row.candidate_id for row in query_result.ranking_comparison_rows}
            for strategy in EvaluationStrategy:
                strategy_result = query_result.strategy_results[strategy]
                self.assertEqual(strategy_result.strategy, strategy)
                self.assertEqual(set(strategy_result.ranked_candidate_ids), fixture_candidate_ids)
                self.assertEqual(len(strategy_result.ranked_candidate_ids), 3)
                self.assertEqual(len(strategy_result.ranked_candidate_ids), len(set(strategy_result.ranked_candidate_ids)))
                self.assertEqual([candidate.rank for candidate in strategy_result.ranked_candidates], [1, 2, 3])
                self.assertEqual(strategy_result.limitations, ())

    def test_runner_calculates_query_metrics_for_each_strategy(self):
        fixtures = load_seeded_evaluation_fixtures()
        summary = run_evaluation(
            fixtures,
            top_ks=(1, 2),
            embedding_provider=DeterministicFakeEmbeddingProvider(dimensions=8),
        )

        for query_result in summary.query_results:
            for strategy_result in query_result.strategy_results.values():
                metric_keys = {(metric.metric_name, metric.k) for metric in strategy_result.metrics}
                self.assertEqual(
                    metric_keys,
                    {
                        ("precision_at_k", 1),
                        ("recall_at_k", 1),
                        ("ndcg_at_k", 1),
                        ("precision_at_k", 2),
                        ("recall_at_k", 2),
                        ("ndcg_at_k", 2),
                        ("average_precision", None),
                    },
                )
                self.assertTrue(all(metric.is_available for metric in strategy_result.metrics))
                self.assertEqual(strategy_result.unavailable_metric_reasons, {})

    def test_runner_builds_rank_comparison_rows_across_strategies(self):
        fixtures = load_seeded_evaluation_fixtures()
        summary = run_evaluation(
            fixtures,
            top_ks=(1,),
            embedding_provider=DeterministicFakeEmbeddingProvider(dimensions=8),
        )

        for query_result in summary.query_results:
            for row in query_result.ranking_comparison_rows:
                self.assertEqual(set(row.ranks_by_strategy), {"keyword", "semantic", "hybrid"})
                self.assertTrue(all(isinstance(rank, int) for rank in row.ranks_by_strategy.values()))
                self.assertTrue(all(1 <= rank <= query_result.candidate_count for rank in row.ranks_by_strategy.values()))

    def test_runner_aggregate_metrics_average_available_query_values(self):
        fixtures = load_seeded_evaluation_fixtures()
        summary = run_evaluation(
            fixtures,
            top_ks=(1, 3),
            embedding_provider=DeterministicFakeEmbeddingProvider(dimensions=8),
        )

        self.assertEqual(set(summary.aggregate_results), set(EvaluationStrategy))
        for strategy in EvaluationStrategy:
            aggregate_metrics = summary.aggregate_results[strategy]
            metric_keys = {(metric.metric_name, metric.k) for metric in aggregate_metrics}
            self.assertEqual(
                metric_keys,
                {
                    ("mean_precision_at_k", 1),
                    ("mean_recall_at_k", 1),
                    ("mean_ndcg_at_k", 1),
                    ("mean_precision_at_k", 3),
                    ("mean_recall_at_k", 3),
                    ("mean_ndcg_at_k", 3),
                    ("mean_average_precision", None),
                },
            )
            self.assertTrue(all(metric.is_available for metric in aggregate_metrics))
            for metric in aggregate_metrics:
                self.assertEqual(metric.details["included_query_count"], 2)
                self.assertEqual(metric.details["excluded_query_count"], 0)

    def test_runner_aggregate_metrics_do_not_treat_unavailable_values_as_zero(self):
        fixture = validate_evaluation_fixture(_incomplete_fixture())
        summary = run_evaluation(
            [fixture],
            top_ks=(1,),
            embedding_provider=DeterministicFakeEmbeddingProvider(dimensions=8),
        )

        keyword_metrics = {
            (metric.metric_name, metric.k): metric
            for metric in summary.aggregate_results[EvaluationStrategy.KEYWORD]
        }

        precision = keyword_metrics[("mean_precision_at_k", 1)]
        recall = keyword_metrics[("mean_recall_at_k", 1)]
        map_result = keyword_metrics[("mean_average_precision", None)]

        self.assertTrue(precision.is_available)
        self.assertEqual(precision.details["included_query_count"], 1)
        self.assertEqual(precision.details["excluded_query_count"], 0)
        self.assertFalse(recall.is_available)
        self.assertIsNone(recall.value)
        self.assertEqual(recall.details["included_query_count"], 0)
        self.assertEqual(recall.details["excluded_query_count"], 1)
        self.assertFalse(map_result.is_available)
        self.assertEqual(map_result.details["included_query_count"], 0)
        self.assertEqual(map_result.details["excluded_query_count"], 1)

    def test_runner_requires_positive_top_ks(self):
        fixtures = load_seeded_evaluation_fixtures()
        provider = DeterministicFakeEmbeddingProvider(dimensions=8)

        with self.assertRaisesRegex(ValueError, "At least one"):
            run_evaluation(fixtures, top_ks=(), embedding_provider=provider)
        with self.assertRaisesRegex(ValueError, "positive integers"):
            run_evaluation(fixtures, top_ks=(1, 0), embedding_provider=provider)


def _incomplete_fixture():
    return {
        "fixture_id": "incomplete-fixture",
        "description": "Incomplete fixture for aggregate availability tests.",
        "queries": [
            {
                "query_id": "incomplete-query",
                "query_type": "freelancer_to_gigs",
                "query_entity": {
                    "user_id": "freelancer-incomplete",
                    "headline": "Python backend developer",
                    "tech_categories": ["backend"],
                    "skills": ["Python"],
                },
                "candidate_entities": [
                    {
                        "id": "gig-python",
                        "title": "Python backend work",
                        "tech_category": "backend",
                        "required_skills": ["Python"],
                        "status": "open",
                    },
                    {
                        "id": "gig-react",
                        "title": "React UI work",
                        "tech_category": "frontend",
                        "required_skills": ["React"],
                        "status": "open",
                    },
                ],
                "judgments": [
                    {
                        "candidate_id": "gig-python",
                        "relevance_label": 2,
                        "label_source": "seeded_fixture",
                    }
                ],
                "is_complete_judgment_set": False,
            }
        ],
    }


if __name__ == "__main__":
    unittest.main()
