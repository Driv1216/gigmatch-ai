import math
import os
import unittest

from app.api.routes.matching import _rank_gigs_with_fallback
from app.matching.builders import build_freelancer_match_profile, build_gig_match_profile
from app.matching.provider import (
    get_production_embedding_provider,
    get_production_hybrid_config,
)
from app.matching.semantic import (
    EmbeddingInputPolicy,
    SemanticRankingUnavailableError,
    SentenceTransformerEmbeddingProvider,
)
from app.matching.semantic_ranker import (
    rank_freelancers_for_gig_semantic,
    rank_gigs_for_freelancer_semantic,
)
from app.matching.hybrid import (
    rank_freelancers_for_gig_hybrid,
    rank_gigs_for_freelancer_hybrid,
)
from app.marketplace.ranking import (
    RankingMode,
    SemanticUnavailableReason,
)


@unittest.skipUnless(
    os.getenv("RUN_REAL_MODEL_SMOKE") == "1",
    "Set RUN_REAL_MODEL_SMOKE=1 for the opt-in real-model integration smoke test.",
)
class RealSemanticModelSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.provider = get_production_embedding_provider()
        cls.config = get_production_hybrid_config()

    def test_selected_model_revision_policy_and_vectors(self) -> None:
        provider = self.provider
        self.assertIsInstance(provider, SentenceTransformerEmbeddingProvider)
        self.assertEqual(provider.model_name, "intfloat/e5-small-v2")
        self.assertEqual(provider.revision, "ffb93f3bd4047442299a41ebb6fa998a38507c52")
        self.assertEqual(provider.input_policy, EmbeddingInputPolicy.E5_RETRIEVAL)
        self.assertEqual(provider.device, "cpu")
        self.assertFalse(provider.trust_remote_code)
        self.assertIs(provider, get_production_embedding_provider())

        prepared = [
            provider.prepare_query_text("Backend engineer with Python and FastAPI"),
            provider.prepare_candidate_text("Build a Python FastAPI service"),
            provider.prepare_candidate_text("Create a watercolor logo"),
        ]
        self.assertTrue(prepared[0].startswith("query: "))
        self.assertTrue(all(text.startswith("passage: ") for text in prepared[1:]))
        vectors = provider.encode_batch(prepared)

        self.assertEqual(len(vectors), 3)
        self.assertEqual({len(vector) for vector in vectors}, {384})
        self.assertEqual(provider.observed_dimension, 384)
        self.assertTrue(
            all(vector and all(math.isfinite(value) for value in vector) for vector in vectors)
        )

    def test_real_semantic_and_hybrid_ranking_execute_in_both_directions(self) -> None:
        freelancer = build_freelancer_match_profile(
            {
                "user_id": "smoke-freelancer-query",
                "primary_role": "Backend API engineer",
                "tech_categories": ["backend"],
                "skills": ["Python", "FastAPI", "PostgreSQL"],
                "bio": "Builds production REST services and database-backed APIs.",
            }
        )
        related_gig = build_gig_match_profile(
            {
                "id": "smoke-related-gig",
                "title": "Python API implementation",
                "tech_category": "backend",
                "required_skills": ["Python", "FastAPI"],
                "description": "Implement a database-backed REST service.",
            }
        )
        unrelated_gig = build_gig_match_profile(
            {
                "id": "smoke-unrelated-gig",
                "title": "Brand illustration",
                "tech_category": "design",
                "required_skills": ["Illustrator"],
                "description": "Create hand-drawn campaign artwork.",
            }
        )
        semantic_gigs = rank_gigs_for_freelancer_semantic(
            freelancer, [unrelated_gig, related_gig], self.provider
        )
        hybrid_gigs = rank_gigs_for_freelancer_hybrid(
            freelancer, [unrelated_gig, related_gig], self.provider, self.config
        )
        self.assertEqual(semantic_gigs[0].candidate_id, related_gig.gig_id)
        self.assertEqual(hybrid_gigs[0].candidate_id, related_gig.gig_id)

        gig = build_gig_match_profile(
            {
                "id": "smoke-gig-query",
                "title": "NLP model evaluation",
                "tech_category": "machine learning",
                "required_skills": ["Python", "NLP"],
                "description": "Evaluate text classification models and error cases.",
            }
        )
        related_freelancer = build_freelancer_match_profile(
            {
                "user_id": "smoke-related-freelancer",
                "primary_role": "Machine learning engineer",
                "tech_categories": ["machine learning"],
                "skills": ["Python", "NLP"],
                "bio": "Evaluates language models and text classifiers.",
            }
        )
        unrelated_freelancer = build_freelancer_match_profile(
            {
                "user_id": "smoke-unrelated-freelancer",
                "primary_role": "Mobile visual designer",
                "tech_categories": ["design"],
                "skills": ["Figma"],
                "bio": "Designs mobile icons and visual systems.",
            }
        )
        semantic_freelancers = rank_freelancers_for_gig_semantic(
            gig, [unrelated_freelancer, related_freelancer], self.provider
        )
        hybrid_freelancers = rank_freelancers_for_gig_hybrid(
            gig,
            [unrelated_freelancer, related_freelancer],
            self.provider,
            self.config,
        )
        self.assertEqual(
            semantic_freelancers[0].candidate_id, related_freelancer.freelancer_id
        )
        self.assertEqual(
            hybrid_freelancers[0].candidate_id, related_freelancer.freelancer_id
        )
        self.assertTrue(
            all(result.keyword_weight == 0.75 for result in hybrid_gigs + hybrid_freelancers)
        )
        self.assertTrue(
            all(result.semantic_weight == 0.25 for result in hybrid_gigs + hybrid_freelancers)
        )

    def test_provider_failure_maps_to_existing_keyword_fallback(self) -> None:
        freelancer = build_freelancer_match_profile(
            {"user_id": "smoke-fallback", "skills": ["Python"]}
        )
        gig = build_gig_match_profile(
            {"id": "smoke-fallback-gig", "required_skills": ["Python"]}
        )

        def failed_provider():
            raise SemanticRankingUnavailableError(
                SemanticUnavailableReason.EMBEDDING_GENERATION_FAILED
            )

        context, results = _rank_gigs_with_fallback(
            freelancer, [gig], failed_provider, self.config
        )

        self.assertEqual(context.ranking_mode, RankingMode.KEYWORD_FALLBACK)
        self.assertEqual(
            context.semantic_unavailable_reason,
            SemanticUnavailableReason.EMBEDDING_GENERATION_FAILED,
        )
        self.assertEqual(results[0].candidate_id, gig.gig_id)


if __name__ == "__main__":
    unittest.main()
