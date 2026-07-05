import inspect
import sys
import unittest

from app.matching import (
    SemanticMatchResult,
    SemanticScoreBreakdown,
    build_freelancer_match_profile,
    build_gig_match_profile,
    rank_freelancers_for_gig_semantic,
    rank_gigs_for_freelancer_semantic,
    score_semantic_match,
)
from app.matching import semantic_ranker


class ControlledEmbeddingProvider:
    model_name = "controlled-test"

    def __init__(self) -> None:
        self.encoded_texts: list[str] = []

    def encode(self, text: str) -> list[float]:
        self.encoded_texts.append(text)
        lowered = text.casefold()

        if "dimension mismatch freelancer" in lowered:
            return [1.0, 0.0, 0.0]
        if "dimension mismatch gig" in lowered:
            return [1.0, 0.0]
        if "empty vector" in lowered:
            return []
        if "zero vector" in lowered:
            return [0.0, 0.0]
        if "invalid vector" in lowered:
            return [1.0, "bad"]  # type: ignore[list-item]

        if "freelancer anchor x" in lowered or "gig exact x" in lowered:
            return [1.0, 0.0]
        if "gig similar x" in lowered:
            return [0.8, 0.6]
        if "gig opposite x" in lowered:
            return [-1.0, 0.0]

        if "gig anchor y" in lowered or "freelancer exact y" in lowered:
            return [0.0, 1.0]
        if "freelancer similar y" in lowered:
            return [0.6, 0.8]
        if "freelancer opposite y" in lowered:
            return [1.0, 0.0]

        if "equal score" in lowered:
            return [1.0, 0.0]

        return [0.0, 1.0]

    def encode_batch(self, texts: list[str]) -> list[list[float]]:
        return [self.encode(text) for text in texts]


class SemanticRankerTests(unittest.TestCase):
    def test_semantic_score_preserves_raw_cosine_and_normalized_score(self):
        provider = ControlledEmbeddingProvider()
        freelancer = build_freelancer_match_profile(
            {"user_id": "freelancer-1", "primary_role": "freelancer anchor x"}
        )
        gig = build_gig_match_profile({"id": "gig-1", "title": "gig similar x", "status": "open"})

        score = score_semantic_match(freelancer, gig, provider)

        self.assertAlmostEqual(score.raw_cosine_similarity, 0.8)
        self.assertAlmostEqual(score.semantic_score, 0.9)
        self.assertIn("Role: freelancer anchor x.", score.freelancer_embedding_text)
        self.assertIn("Gig: gig similar x.", score.gig_embedding_text)
        self.assertEqual(score.vector_dimension, 2)
        self.assertEqual(score.provider_name, "ControlledEmbeddingProvider:controlled-test")

    def test_identical_vectors_score_higher_than_dissimilar_vectors(self):
        provider = ControlledEmbeddingProvider()
        freelancer = build_freelancer_match_profile(
            {"user_id": "freelancer-2", "primary_role": "freelancer anchor x"}
        )
        exact_gig = build_gig_match_profile({"id": "gig-exact", "title": "gig exact x"})
        opposite_gig = build_gig_match_profile({"id": "gig-opposite", "title": "gig opposite x"})

        exact_score = score_semantic_match(freelancer, exact_gig, provider)
        opposite_score = score_semantic_match(freelancer, opposite_gig, provider)

        self.assertGreater(exact_score.semantic_score, opposite_score.semantic_score)
        self.assertEqual(exact_score.semantic_score, 1.0)
        self.assertEqual(opposite_score.semantic_score, 0.0)

    def test_semantic_score_normalization_is_clamped(self):
        self.assertEqual(semantic_ranker._normalize_cosine(2.0), 1.0)
        self.assertEqual(semantic_ranker._normalize_cosine(-2.0), 0.0)

    def test_freelancer_to_gigs_semantic_ranking_works_and_preserves_status(self):
        provider = ControlledEmbeddingProvider()
        freelancer = build_freelancer_match_profile(
            {"user_id": "freelancer-3", "primary_role": "freelancer anchor x"}
        )
        gigs = [
            build_gig_match_profile({"id": "gig-opposite", "title": "gig opposite x", "status": "draft"}),
            build_gig_match_profile({"id": "gig-similar", "title": "gig similar x", "status": "closed"}),
            build_gig_match_profile({"id": "gig-exact", "title": "gig exact x", "status": "open"}),
        ]

        results = rank_gigs_for_freelancer_semantic(freelancer, gigs, provider)

        self.assertEqual([result.candidate_id for result in results], ["gig-exact", "gig-similar", "gig-opposite"])
        self.assertEqual([result.rank for result in results], [1, 2, 3])
        self.assertEqual({result.candidate_id: result.gig_status for result in results}, {
            "gig-exact": "open",
            "gig-opposite": "draft",
            "gig-similar": "closed",
        })

    def test_gig_to_freelancers_semantic_ranking_works(self):
        provider = ControlledEmbeddingProvider()
        gig = build_gig_match_profile({"id": "gig-4", "title": "gig anchor y", "status": "open"})
        freelancers = [
            build_freelancer_match_profile({"user_id": "freelancer-opposite", "primary_role": "freelancer opposite y"}),
            build_freelancer_match_profile({"user_id": "freelancer-exact", "primary_role": "freelancer exact y"}),
            build_freelancer_match_profile({"user_id": "freelancer-similar", "primary_role": "freelancer similar y"}),
        ]

        results = rank_freelancers_for_gig_semantic(gig, freelancers, provider)

        self.assertEqual(
            [result.candidate_id for result in results],
            ["freelancer-exact", "freelancer-similar", "freelancer-opposite"],
        )
        self.assertEqual([result.candidate_type for result in results], ["freelancer", "freelancer", "freelancer"])
        self.assertTrue(all(result.gig_status == "open" for result in results))

    def test_candidate_ranking_is_deterministic_for_equal_scores(self):
        provider = ControlledEmbeddingProvider()
        freelancer = build_freelancer_match_profile(
            {"user_id": "freelancer-5", "primary_role": "equal score anchor"}
        )
        gigs = [
            build_gig_match_profile({"id": "gig-c", "title": "equal score c"}),
            build_gig_match_profile({"id": "gig-a", "title": "equal score a"}),
            build_gig_match_profile({"id": "gig-b", "title": "equal score b"}),
        ]

        results = rank_gigs_for_freelancer_semantic(freelancer, gigs, provider)

        self.assertEqual([result.candidate_id for result in results], ["gig-a", "gig-b", "gig-c"])
        self.assertEqual([result.rank for result in results], [1, 2, 3])

    def test_zero_vector_comparison_is_handled_safely(self):
        provider = ControlledEmbeddingProvider()
        freelancer = build_freelancer_match_profile(
            {"user_id": "freelancer-6", "primary_role": "zero vector freelancer"}
        )
        gig = build_gig_match_profile({"id": "gig-6", "title": "gig exact x"})

        score = score_semantic_match(freelancer, gig, provider)

        self.assertEqual(score.raw_cosine_similarity, 0.0)
        self.assertEqual(score.semantic_score, 0.5)

    def test_dimension_mismatch_is_handled_clearly(self):
        provider = ControlledEmbeddingProvider()
        freelancer = build_freelancer_match_profile(
            {"user_id": "freelancer-7", "primary_role": "dimension mismatch freelancer"}
        )
        gig = build_gig_match_profile({"id": "gig-7", "title": "dimension mismatch gig"})

        with self.assertRaisesRegex(ValueError, "same dimension"):
            score_semantic_match(freelancer, gig, provider)

    def test_empty_vectors_are_rejected_clearly(self):
        provider = ControlledEmbeddingProvider()
        freelancer = build_freelancer_match_profile(
            {"user_id": "freelancer-8", "primary_role": "empty vector freelancer"}
        )
        gig = build_gig_match_profile({"id": "gig-8", "title": "gig exact x"})

        with self.assertRaisesRegex(ValueError, "must not be empty"):
            score_semantic_match(freelancer, gig, provider)

    def test_provider_returning_invalid_vectors_is_rejected_clearly(self):
        provider = ControlledEmbeddingProvider()
        freelancer = build_freelancer_match_profile(
            {"user_id": "freelancer-9", "primary_role": "invalid vector freelancer"}
        )
        gig = build_gig_match_profile({"id": "gig-9", "title": "gig exact x"})

        with self.assertRaisesRegex(ValueError, "only numbers"):
            score_semantic_match(freelancer, gig, provider)

    def test_provider_is_injected_and_no_real_model_loads(self):
        provider = ControlledEmbeddingProvider()
        freelancer = build_freelancer_match_profile(
            {"user_id": "freelancer-10", "primary_role": "freelancer anchor x"}
        )
        gig = build_gig_match_profile({"id": "gig-10", "title": "gig exact x"})

        score_semantic_match(freelancer, gig, provider)

        self.assertEqual(len(provider.encoded_texts), 2)
        self.assertNotIn("sentence_transformers", sys.modules)

    def test_no_hybrid_api_or_supabase_behavior_is_introduced(self):
        forbidden_fragments = ("api", "hybrid", "explain", "explanation", "response")

        score_fields = {field.name for field in SemanticScoreBreakdown.__dataclass_fields__.values()}
        result_fields = {field.name for field in SemanticMatchResult.__dataclass_fields__.values()}
        for field_name in score_fields | result_fields:
            with self.subTest(field_name=field_name):
                self.assertFalse(any(fragment in field_name for fragment in forbidden_fragments))

        public_callables = {
            name
            for name, value in inspect.getmembers(semantic_ranker)
            if not name.startswith("_") and callable(value)
        }
        self.assertNotIn("rank_hybrid_matches", public_callables)
        self.assertNotIn("APIRouter", public_callables)
        self.assertNotIn("FastAPI", public_callables)

        source = inspect.getsource(semantic_ranker)
        self.assertNotIn("supabase", source.lower())
        self.assertNotIn(".insert(", source)
        self.assertNotIn(".update(", source)


if __name__ == "__main__":
    unittest.main()
