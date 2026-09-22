import json
import unittest
from pathlib import Path
from unittest.mock import patch

from app.config import settings
from app.matching import provider as provider_module
from app.matching.semantic import EmbeddingInputPolicy, SemanticRankingUnavailableError
from app.marketplace.ranking import SemanticUnavailableReason


class ProductionSemanticProviderTests(unittest.TestCase):
    def setUp(self) -> None:
        provider_module._clear_production_embedding_provider_cache()

    def tearDown(self) -> None:
        provider_module._clear_production_embedding_provider_cache()

    def test_selected_provider_is_pinned_and_reused_once_per_process(self) -> None:
        sentinel = object()
        with patch.object(
            provider_module,
            "SentenceTransformerEmbeddingProvider",
            return_value=sentinel,
        ) as constructor:
            first = provider_module.get_production_embedding_provider()
            second = provider_module.get_production_embedding_provider()

        self.assertIs(first, sentinel)
        self.assertIs(second, sentinel)
        constructor.assert_called_once_with(
            "intfloat/e5-small-v2",
            revision="ffb93f3bd4047442299a41ebb6fa998a38507c52",
            input_policy=EmbeddingInputPolicy.E5_RETRIEVAL,
            cache_folder=settings.embedding_cache_folder,
            local_files_only=settings.embedding_local_files_only,
        )

    def test_invalid_or_incomplete_provider_configuration_is_sanitized(self) -> None:
        with patch.object(settings, "embedding_input_policy", "unsupported"):
            with self.assertRaises(SemanticRankingUnavailableError) as context:
                provider_module.get_production_embedding_provider()
        self.assertEqual(
            context.exception.reason,
            SemanticUnavailableReason.EMBEDDING_PROVIDER_NOT_CONFIGURED,
        )

        with patch.object(settings, "embedding_model_revision", ""):
            with self.assertRaises(SemanticRankingUnavailableError) as context:
                provider_module.get_production_embedding_provider()
        self.assertEqual(
            context.exception.reason,
            SemanticUnavailableReason.EMBEDDING_PROVIDER_NOT_CONFIGURED,
        )

    def test_production_hybrid_config_is_selected_product_weight(self) -> None:
        config = provider_module.get_production_hybrid_config()

        self.assertEqual(config.normalized_keyword_weight, 0.75)
        self.assertEqual(config.normalized_semantic_weight, 0.25)

    def test_documented_configuration_matches_runtime_without_rewriting_frozen_decision(self) -> None:
        repo_root = Path(__file__).resolve().parents[2]
        production = json.loads(
            (repo_root / "docs/evaluation/semantic-r1/production-configuration.json").read_text(
                encoding="utf-8"
            )
        )
        decision = json.loads(
            (repo_root / "docs/evaluation/semantic-r1/selection-decision.json").read_text(
                encoding="utf-8"
            )
        )
        configured = production["production_configuration"]

        self.assertEqual(configured["model_id"], settings.embedding_model_name)
        self.assertEqual(configured["revision"], settings.embedding_model_revision)
        self.assertEqual(configured["input_policy"], settings.embedding_input_policy)
        self.assertEqual(configured["keyword_weight"], settings.hybrid_keyword_weight)
        self.assertEqual(configured["semantic_weight"], settings.hybrid_semantic_weight)
        self.assertEqual(production["benchmark_sha256"], decision["benchmark_sha256"])
        self.assertEqual(
            production["selection_decision_sha256"], decision["decision_sha256"]
        )
        self.assertEqual(decision["selected_configuration"]["keyword_weight"], 1.0)
        self.assertEqual(decision["selected_configuration"]["semantic_weight"], 0.0)
        self.assertIn("not a claim", production["decision_basis"].lower())


if __name__ == "__main__":
    unittest.main()
