import math
import unittest

from app.evaluation import (
    EvaluationLabelSource,
    MetricResult,
    RelevanceJudgment,
    RelevanceLabel,
    average_precision,
    mean_average_precision,
    ndcg_at_k,
    precision_at_k,
    recall_at_k,
)


class EvaluationMetricTests(unittest.TestCase):
    def test_precision_at_k_counts_relevant_judged_top_k_candidates(self):
        result = precision_at_k(
            ["candidate-a", "candidate-b", "candidate-c"],
            _judgments({"candidate-a": 2, "candidate-b": 0, "candidate-c": 1}),
            k=2,
        )

        self.assertAvailable(result, "precision_at_k", 0.5, k=2)
        self.assertEqual(result.details["evaluated_count"], 2)
        self.assertEqual(result.details["relevant_retrieved_count"], 1)

    def test_precision_at_k_rejects_unjudged_top_k_candidates(self):
        result = precision_at_k(
            ["candidate-a", "candidate-unjudged"],
            _judgments({"candidate-a": 2}),
            k=2,
        )

        self.assertUnavailable(result, "unjudged")
        self.assertEqual(result.details["unjudged_candidate_ids"], ["candidate-unjudged"])

    def test_precision_at_k_rejects_empty_ranking_and_invalid_k(self):
        empty_result = precision_at_k([], _judgments({"candidate-a": 2}), k=1)
        invalid_k_result = precision_at_k(["candidate-a"], _judgments({"candidate-a": 2}), k=0)

        self.assertUnavailable(empty_result, "empty")
        self.assertUnavailable(invalid_k_result, "positive integer")

    def test_precision_at_k_accepts_mapping_judgments(self):
        result = precision_at_k(["candidate-a", "candidate-b"], {"candidate-a": 1, "candidate-b": 2}, k=2)

        self.assertAvailable(result, "precision_at_k", 1.0, k=2)

    def test_precision_at_k_rejects_invalid_relevance_scale(self):
        result = precision_at_k(["candidate-a"], {"candidate-a": 3}, k=1)

        self.assertUnavailable(result, "0, 1, 2")

    def test_metric_helpers_reject_duplicate_ranked_candidate_ids(self):
        result = precision_at_k(["candidate-a", "candidate-a"], {"candidate-a": 2}, k=2)

        self.assertUnavailable(result, "unique")
        self.assertEqual(result.details["duplicate_candidate_ids"], ["candidate-a"])

    def test_recall_at_k_requires_complete_judgment_set(self):
        result = recall_at_k(
            ["candidate-a"],
            _judgments({"candidate-a": 2, "candidate-b": 1}),
            is_complete_judgment_set=False,
            k=1,
        )

        self.assertUnavailable(result, "incomplete")

    def test_recall_at_k_counts_known_relevant_candidates(self):
        result = recall_at_k(
            ["candidate-a", "candidate-c", "candidate-b"],
            _judgments({"candidate-a": 2, "candidate-b": 1, "candidate-c": 0}),
            is_complete_judgment_set=True,
            k=2,
        )

        self.assertAvailable(result, "recall_at_k", 0.5, k=2)
        self.assertEqual(result.details["relevant_count"], 2)
        self.assertEqual(result.details["relevant_retrieved_count"], 1)

    def test_recall_at_k_is_unavailable_when_no_relevant_candidates_exist(self):
        result = recall_at_k(
            ["candidate-a", "candidate-b"],
            _judgments({"candidate-a": 0, "candidate-b": 0}),
            is_complete_judgment_set=True,
            k=2,
        )

        self.assertUnavailable(result, "no relevant")

    def test_ndcg_at_k_uses_graded_relevance(self):
        result = ndcg_at_k(
            ["candidate-b", "candidate-a", "candidate-c"],
            _judgments({"candidate-a": 2, "candidate-b": 1, "candidate-c": 0}),
            k=3,
        )

        dcg = 1 / math.log2(2) + 3 / math.log2(3) + 0 / math.log2(4)
        idcg = 3 / math.log2(2) + 1 / math.log2(3) + 0 / math.log2(4)
        self.assertAvailable(result, "ndcg_at_k", dcg / idcg, k=3)
        self.assertEqual(result.details["idcg_zero"], False)

    def test_ndcg_at_k_returns_zero_when_idcg_is_zero(self):
        result = ndcg_at_k(
            ["candidate-a", "candidate-b"],
            _judgments({"candidate-a": 0, "candidate-b": 0}),
            k=2,
        )

        self.assertAvailable(result, "ndcg_at_k", 0.0, k=2)
        self.assertEqual(result.details["idcg_zero"], True)

    def test_ndcg_at_k_rejects_unjudged_top_k_candidates(self):
        result = ndcg_at_k(
            ["candidate-a", "candidate-b"],
            _judgments({"candidate-a": 2}),
            k=2,
        )

        self.assertUnavailable(result, "unjudged")

    def test_average_precision_requires_complete_judgment_set(self):
        result = average_precision(
            ["candidate-a", "candidate-b"],
            _judgments({"candidate-a": 2, "candidate-b": 1}),
            is_complete_judgment_set=False,
        )

        self.assertUnavailable(result, "incomplete")

    def test_average_precision_for_one_query_uses_binary_relevance(self):
        result = average_precision(
            ["candidate-a", "candidate-b", "candidate-c"],
            _judgments({"candidate-a": 0, "candidate-b": 2, "candidate-c": 1}),
            is_complete_judgment_set=True,
        )

        expected = ((1 / 2) + (2 / 3)) / 2
        self.assertAvailable(result, "average_precision", expected)
        self.assertEqual(result.details["relevant_count"], 2)
        self.assertEqual(result.details["relevant_retrieved_count"], 2)

    def test_average_precision_can_be_truncated_to_top_k(self):
        result = average_precision(
            ["candidate-a", "candidate-b", "candidate-c"],
            _judgments({"candidate-a": 0, "candidate-b": 2, "candidate-c": 1}),
            is_complete_judgment_set=True,
            k=2,
        )

        self.assertAvailable(result, "average_precision", 0.25, k=2)
        self.assertEqual(result.details["evaluated_count"], 2)
        self.assertEqual(result.details["relevant_count"], 2)

    def test_average_precision_is_unavailable_when_no_relevant_candidates_exist(self):
        result = average_precision(
            ["candidate-a", "candidate-b"],
            _judgments({"candidate-a": 0, "candidate-b": 0}),
            is_complete_judgment_set=True,
        )

        self.assertUnavailable(result, "no relevant")

    def test_average_precision_rejects_unjudged_evaluated_candidates(self):
        result = average_precision(
            ["candidate-a", "candidate-unjudged"],
            _judgments({"candidate-a": 2}),
            is_complete_judgment_set=True,
        )

        self.assertUnavailable(result, "unjudged")

    def test_mean_average_precision_averages_valid_ap_values(self):
        first = average_precision(
            ["candidate-a", "candidate-b"],
            _judgments({"candidate-a": 2, "candidate-b": 0}),
            is_complete_judgment_set=True,
        )
        second = average_precision(
            ["candidate-c", "candidate-d"],
            _judgments({"candidate-c": 0, "candidate-d": 1}),
            is_complete_judgment_set=True,
        )

        result = mean_average_precision([first, second])

        self.assertAvailable(result, "mean_average_precision", 0.75)
        self.assertEqual(result.details["query_count"], 2)

    def test_mean_average_precision_requires_multiple_valid_ap_results(self):
        single = MetricResult(
            metric_name="average_precision",
            value=1.0,
            is_available=True,
            details={"is_complete_judgment_set": True, "relevant_count": 1},
        )
        invalid = MetricResult(
            metric_name="average_precision",
            value=None,
            is_available=False,
            reason="Average Precision is unavailable.",
            details={"is_complete_judgment_set": False},
        )

        self.assertUnavailable(mean_average_precision([single]), "at least two")
        self.assertUnavailable(mean_average_precision([single, invalid]), "available AP")

    def assertAvailable(self, result, metric_name, expected_value, k=None):
        self.assertEqual(result.metric_name, metric_name)
        self.assertTrue(result.is_available)
        self.assertIsNone(result.reason)
        self.assertEqual(result.k, k)
        self.assertAlmostEqual(result.value, expected_value)

    def assertUnavailable(self, result, reason_fragment):
        self.assertFalse(result.is_available)
        self.assertIsNone(result.value)
        self.assertIn(reason_fragment, result.reason)


def _judgments(labels_by_candidate_id):
    return tuple(
        RelevanceJudgment(
            candidate_id=candidate_id,
            relevance_label=RelevanceLabel(relevance_label),
            label_source=EvaluationLabelSource.SEEDED_FIXTURE,
        )
        for candidate_id, relevance_label in labels_by_candidate_id.items()
    )


if __name__ == "__main__":
    unittest.main()
