import hashlib
import io
import json
import tempfile
import unittest
from contextlib import redirect_stderr
from dataclasses import replace
from pathlib import Path

from app.evaluation.benchmark import (
    BENCHMARK_PATH,
    LOCK_PATH,
    REQUIRED_SCENARIO_TAGS,
    fixture_for_split,
    load_benchmark_lock,
    load_frozen_benchmark,
    sha256_json,
    validate_semantic_benchmark,
)
from app.evaluation.contracts import BenchmarkSplit, EvaluationQueryType
from app.evaluation.fixtures import EvaluationFixtureValidationError
from app.evaluation.semantic_benchmark import (
    _build_parser,
    decision_sha256,
    _evaluate_model_fixture,
    _load_and_validate_decision,
    _load_model_manifest,
    _verify_inputs,
    _weight_sweep,
)
from app.matching import (
    DeterministicFakeEmbeddingProvider,
    rank_freelancers_for_gig_semantic,
    rank_gigs_for_freelancer_semantic,
)


class SemanticBenchmarkTests(unittest.TestCase):
    def test_frozen_fixture_matches_locked_counts_splits_and_checksum(self):
        fixture = load_frozen_benchmark()
        lock = load_benchmark_lock()

        self.assertEqual(len(fixture.queries), 24)
        self.assertEqual(sum(len(query.judgments) for query in fixture.queries), 120)
        self.assertEqual(sha256_json(), lock["fixture_sha256"])
        selection = fixture_for_split(fixture, BenchmarkSplit.SELECTION)
        holdout = fixture_for_split(fixture, BenchmarkSplit.HOLDOUT)
        self.assertEqual(len(selection.queries), 16)
        self.assertEqual(len(holdout.queries), 8)
        self.assertEqual(
            sum(query.query_type is EvaluationQueryType.FREELANCER_TO_GIGS for query in selection.queries),
            8,
        )
        self.assertEqual(
            sum(query.query_type is EvaluationQueryType.FREELANCER_TO_GIGS for query in holdout.queries),
            4,
        )
        covered = {tag for query in fixture.queries for judgment in query.judgments for tag in judgment.scenario_tags}
        self.assertTrue(REQUIRED_SCENARIO_TAGS <= covered)

    def test_fixture_checksum_rejects_silent_rewrite(self):
        raw = json.loads(BENCHMARK_PATH.read_text(encoding="utf-8"))
        raw["description"] = "silently rewritten"
        with tempfile.TemporaryDirectory() as directory:
            changed = Path(directory) / "changed.json"
            changed.write_text(json.dumps(raw), encoding="utf-8")
            self.assertNotEqual(sha256_json(changed), load_benchmark_lock()["fixture_sha256"])

    def test_lock_rejects_query_moved_across_splits(self):
        fixture = load_frozen_benchmark()
        moved = replace(fixture.queries[0], split=BenchmarkSplit.HOLDOUT)
        altered = replace(fixture, queries=(moved, *fixture.queries[1:]))

        with self.assertRaises(EvaluationFixtureValidationError):
            validate_semantic_benchmark(altered, load_benchmark_lock())

    def test_evaluation_metadata_never_enters_canonical_or_provider_text(self):
        fixture = load_frozen_benchmark()
        query = fixture.queries[0]
        provider = CapturingProvider()
        if query.query_type is EvaluationQueryType.FREELANCER_TO_GIGS:
            rank_gigs_for_freelancer_semantic(query.query_entity, list(query.candidate_entities), provider)
        else:
            rank_freelancers_for_gig_semantic(query.query_entity, list(query.candidate_entities), provider)

        encoded = "\n".join(provider.texts)
        for judgment in query.judgments:
            self.assertNotIn(judgment.case_id, encoded)
            self.assertNotIn(judgment.rationale, encoded)
            for tag in judgment.scenario_tags:
                self.assertNotIn(tag, encoded)
        self.assertNotIn(query.split.value, encoded)

    def test_model_free_verify_locks_four_revisions_and_weight_sweep(self):
        fixture, manifest, dependency_sha = _verify_inputs()

        self.assertEqual(len(fixture.queries), 24)
        self.assertEqual(len(manifest["models"]), 4)
        self.assertTrue(all(len(model["revision"]) == 40 for model in manifest["models"]))
        self.assertEqual(len(manifest["weight_sweep"]), 8)
        self.assertEqual(len(dependency_sha), 64)

    def test_holdout_rejects_unsigned_or_mismatched_decision(self):
        manifest = _load_model_manifest()
        with tempfile.TemporaryDirectory() as directory:
            decision_path = Path(directory) / "decision.json"
            decision_path.write_text(
                json.dumps(
                    {
                        "schema_version": 1,
                        "status": "frozen",
                        "benchmark_sha256": sha256_json(),
                        "dependency_lock_sha256": "wrong",
                        "selected_configuration": manifest["models"][0],
                    }
                ),
                encoding="utf-8",
            )
            with self.assertRaisesRegex(ValueError, "dependency-lock"):
                _load_and_validate_decision(decision_path, manifest, "expected")

    def test_holdout_rejects_weight_outside_frozen_sweep(self):
        _, manifest, dependency_sha = _verify_inputs()
        model = manifest["models"][0]
        decision = {
            "schema_version": 1,
            "status": "frozen",
            "benchmark_sha256": sha256_json(),
            "benchmark_lock_sha256": _file_sha256(LOCK_PATH),
            "model_manifest_sha256": _file_sha256(Path(__file__).parents[1] / "app/evaluation/benchmarks/semantic_model_candidates_v1.json"),
            "dependency_lock_sha256": dependency_sha,
            "selection_results_sha256": "0" * 64,
            "selection_metrics": {"mean_ndcg_at_k@3": 1.0},
            "rationale": "Controlled invalid-weight gate test.",
            "rejected_alternatives": [],
            "holdout_reselection_prohibited": True,
            "selected_configuration": {
                **model,
                "keyword_weight": 0.9,
                "semantic_weight": 0.1,
            },
        }
        decision["decision_sha256"] = decision_sha256(decision)
        with tempfile.TemporaryDirectory() as directory:
            decision_path = Path(directory) / "decision.json"
            decision_path.write_text(json.dumps(decision), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "outside the predefined sweep"):
                _load_and_validate_decision(decision_path, manifest, dependency_sha)

    def test_selection_matrix_encodes_each_query_pool_once_per_model(self):
        fixture = fixture_for_split(load_frozen_benchmark(), BenchmarkSplit.SELECTION)
        provider = CountingProvider()

        result = _evaluate_model_fixture(fixture, provider, _weight_sweep(_load_model_manifest()))

        self.assertEqual(provider.batch_count, 16)
        self.assertEqual(len(result["hybrid_by_weight"]), 8)
        self.assertIn("mean_average_precision", result["semantic_only"]["aggregate_metrics"])
        self.assertIn("mean_graded_pairwise_inversion_rate", result["semantic_only"]["aggregate_metrics"])

    def test_holdout_cli_has_no_model_or_weight_override(self):
        parser = _build_parser()
        with redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit):
                parser.parse_args(
                    [
                        "holdout",
                        "--decision",
                        "decision.json",
                        "--output",
                        "out",
                        "--cache-dir",
                        "cache",
                        "--model-id",
                        "forbidden",
                    ]
                )


class CapturingProvider(DeterministicFakeEmbeddingProvider):
    def __init__(self):
        super().__init__(dimensions=4)
        self.texts = []

    def encode_batch(self, texts):
        self.texts.extend(texts)
        return super().encode_batch(texts)


class CountingProvider(DeterministicFakeEmbeddingProvider):
    def __init__(self):
        super().__init__(dimensions=8)
        self.batch_count = 0

    def encode_batch(self, texts):
        self.batch_count += 1
        return super().encode_batch(texts)


def _file_sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


if __name__ == "__main__":
    unittest.main()
