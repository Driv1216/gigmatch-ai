import inspect
import sys
import unittest

from app.matching import (
    HybridMatchResult,
    HybridRankingConfig,
    HybridScoreBreakdown,
    build_freelancer_match_profile,
    build_gig_match_profile,
    combine_hybrid_score,
    rank_freelancers_for_gig_hybrid,
    rank_gigs_for_freelancer_hybrid,
    score_hybrid_match,
)
from app.matching import hybrid


class ControlledEmbeddingProvider:
    model_name = "controlled-hybrid-test"

    def __init__(self) -> None:
        self.encoded_texts: list[str] = []

    def encode(self, text: str) -> list[float]:
        self.encoded_texts.append(text)
        lowered = text.casefold()

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

        return [0.0, 1.0]

    def encode_batch(self, texts: list[str]) -> list[list[float]]:
        return [self.encode(text) for text in texts]


class HybridMatchingTests(unittest.TestCase):
    def test_default_hybrid_score_combines_keyword_and_semantic_scores(self):
        provider = ControlledEmbeddingProvider()
        freelancer = build_freelancer_match_profile(
            {
                "user_id": "freelancer-1",
                "primary_role": "freelancer anchor x",
                "tech_categories": ["frontend"],
                "skills": ["React"],
            }
        )
        gig = build_gig_match_profile(
            {
                "id": "gig-1",
                "title": "gig similar x",
                "tech_category": "frontend",
                "required_skills": ["React"],
            }
        )

        score = score_hybrid_match(freelancer, gig, provider)

        self.assertAlmostEqual(score.keyword_score, 0.8)
        self.assertAlmostEqual(score.semantic_score, 0.9)
        self.assertAlmostEqual(score.hybrid_score, (0.55 * 0.8) + (0.45 * 0.9))
        self.assertAlmostEqual(score.keyword_weight, 0.55)
        self.assertAlmostEqual(score.semantic_weight, 0.45)

    def test_custom_weights_are_supported_and_normalized(self):
        provider = ControlledEmbeddingProvider()
        freelancer = build_freelancer_match_profile(
            {
                "user_id": "freelancer-2",
                "primary_role": "freelancer anchor x",
                "tech_categories": ["frontend"],
                "skills": ["React"],
            }
        )
        gig = build_gig_match_profile(
            {
                "id": "gig-2",
                "title": "gig similar x",
                "tech_category": "frontend",
                "required_skills": ["React"],
            }
        )

        score = score_hybrid_match(
            freelancer,
            gig,
            provider,
            HybridRankingConfig(keyword_weight=1.0, semantic_weight=3.0),
        )

        self.assertAlmostEqual(score.keyword_weight, 0.25)
        self.assertAlmostEqual(score.semantic_weight, 0.75)
        self.assertAlmostEqual(score.hybrid_score, (0.25 * 0.8) + (0.75 * 0.9))

    def test_invalid_negative_weights_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "must not be negative"):
            HybridRankingConfig(keyword_weight=-0.1, semantic_weight=1.0)

        with self.assertRaisesRegex(ValueError, "must not be negative"):
            HybridRankingConfig(keyword_weight=1.0, semantic_weight=-0.1)

    def test_zero_total_weight_config_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "positive total"):
            HybridRankingConfig(keyword_weight=0.0, semantic_weight=0.0)

    def test_final_hybrid_scores_are_clamped(self):
        self.assertEqual(combine_hybrid_score(2.0, 2.0), 1.0)
        self.assertEqual(combine_hybrid_score(-1.0, -1.0), 0.0)

    def test_empty_candidate_list_returns_empty_results(self):
        provider = ControlledEmbeddingProvider()
        freelancer = build_freelancer_match_profile({"user_id": "freelancer-3", "skills": ["React"]})
        gig = build_gig_match_profile({"id": "gig-3", "required_skills": ["React"]})

        self.assertEqual(rank_gigs_for_freelancer_hybrid(freelancer, [], provider), [])
        self.assertEqual(rank_freelancers_for_gig_hybrid(gig, [], provider), [])

    def test_freelancer_to_gigs_hybrid_ranking_works(self):
        provider = ControlledEmbeddingProvider()
        freelancer = build_freelancer_match_profile(
            {
                "user_id": "freelancer-4",
                "primary_role": "freelancer anchor x",
                "tech_categories": ["frontend"],
                "skills": ["React", "Figma"],
            }
        )
        gigs = [
            build_gig_match_profile(
                {
                    "id": "gig-low",
                    "title": "gig opposite x",
                    "tech_category": "backend",
                    "required_skills": ["Python"],
                    "status": "draft",
                }
            ),
            build_gig_match_profile(
                {
                    "id": "gig-mid",
                    "title": "gig similar x",
                    "tech_category": "frontend",
                    "required_skills": ["React"],
                    "status": "closed",
                }
            ),
            build_gig_match_profile(
                {
                    "id": "gig-high",
                    "title": "gig exact x",
                    "tech_category": "frontend",
                    "required_skills": ["React"],
                    "preferred_skills": ["Figma"],
                    "status": "open",
                }
            ),
        ]

        results = rank_gigs_for_freelancer_hybrid(freelancer, gigs, provider)

        self.assertEqual([result.candidate_id for result in results], ["gig-high", "gig-mid", "gig-low"])
        self.assertEqual([result.rank for result in results], [1, 2, 3])
        self.assertEqual({result.candidate_id: result.gig_status for result in results}, {
            "gig-high": "open",
            "gig-low": "draft",
            "gig-mid": "closed",
        })

    def test_gig_to_freelancers_hybrid_ranking_works(self):
        provider = ControlledEmbeddingProvider()
        gig = build_gig_match_profile(
            {
                "id": "gig-5",
                "title": "gig anchor y",
                "tech_category": "backend",
                "required_skills": ["Python"],
                "status": "open",
            }
        )
        freelancers = [
            build_freelancer_match_profile(
                {"user_id": "freelancer-opposite", "primary_role": "freelancer opposite y"}
            ),
            build_freelancer_match_profile(
                {
                    "user_id": "freelancer-exact",
                    "primary_role": "freelancer exact y",
                    "tech_categories": ["backend"],
                    "skills": ["Python"],
                }
            ),
            build_freelancer_match_profile(
                {
                    "user_id": "freelancer-similar",
                    "primary_role": "freelancer similar y",
                    "tech_categories": ["backend"],
                    "skills": ["Python"],
                }
            ),
        ]

        results = rank_freelancers_for_gig_hybrid(gig, freelancers, provider)

        self.assertEqual(
            [result.candidate_id for result in results],
            ["freelancer-exact", "freelancer-similar", "freelancer-opposite"],
        )
        self.assertEqual([result.candidate_type for result in results], ["freelancer", "freelancer", "freelancer"])
        self.assertTrue(all(result.gig_status == "open" for result in results))

    def test_tie_breaking_is_deterministic_by_keyword_then_semantic_then_id(self):
        provider = ControlledEmbeddingProvider()
        freelancer = build_freelancer_match_profile(
            {
                "user_id": "freelancer-6",
                "primary_role": "freelancer anchor x",
                "tech_categories": ["frontend"],
                "skills": ["React", "Figma"],
            }
        )
        gigs = [
            build_gig_match_profile(
                {
                    "id": "gig-semantic-heavy",
                    "title": "gig exact x",
                    "tech_category": "backend",
                    "required_skills": ["Python"],
                }
            ),
            build_gig_match_profile(
                {
                    "id": "gig-keyword-heavy",
                    "title": "gig opposite x",
                    "tech_category": "frontend",
                    "required_skills": ["React"],
                    "preferred_skills": ["Figma"],
                }
            ),
            build_gig_match_profile(
                {
                    "id": "gig-c",
                    "title": "gig opposite x",
                    "tech_category": "backend",
                    "required_skills": ["Python"],
                }
            ),
            build_gig_match_profile(
                {
                    "id": "gig-a",
                    "title": "gig opposite x",
                    "tech_category": "backend",
                    "required_skills": ["Python"],
                }
            ),
        ]

        results = rank_gigs_for_freelancer_hybrid(
            freelancer,
            gigs,
            provider,
            HybridRankingConfig(keyword_weight=0.5, semantic_weight=0.5),
        )

        self.assertEqual(
            [result.candidate_id for result in results],
            ["gig-keyword-heavy", "gig-semantic-heavy", "gig-a", "gig-c"],
        )
        self.assertGreater(results[0].keyword_score, results[1].keyword_score)
        self.assertGreater(results[1].semantic_score, results[0].semantic_score)

    def test_semantic_tie_breaker_is_used_when_hybrid_and_keyword_scores_match(self):
        provider = ControlledEmbeddingProvider()
        freelancer = build_freelancer_match_profile(
            {"user_id": "freelancer-7", "primary_role": "freelancer anchor x", "skills": ["React"]}
        )
        gigs = [
            build_gig_match_profile({"id": "gig-low-semantic", "title": "gig opposite x", "required_skills": ["React"]}),
            build_gig_match_profile({"id": "gig-high-semantic", "title": "gig exact x", "required_skills": ["React"]}),
        ]

        results = rank_gigs_for_freelancer_hybrid(
            freelancer,
            gigs,
            provider,
            HybridRankingConfig(keyword_weight=1.0, semantic_weight=0.0),
        )

        self.assertEqual([result.candidate_id for result in results], ["gig-high-semantic", "gig-low-semantic"])
        self.assertEqual(results[0].hybrid_score, results[1].hybrid_score)
        self.assertEqual(results[0].keyword_score, results[1].keyword_score)
        self.assertGreater(results[0].semantic_score, results[1].semantic_score)

    def test_keyword_and_semantic_scores_and_breakdowns_are_preserved(self):
        provider = ControlledEmbeddingProvider()
        freelancer = build_freelancer_match_profile(
            {
                "user_id": "freelancer-8",
                "primary_role": "freelancer anchor x",
                "tech_categories": ["frontend"],
                "skills": ["React"],
            }
        )
        gig = build_gig_match_profile(
            {
                "id": "gig-8",
                "title": "gig similar x",
                "tech_category": "frontend",
                "required_skills": ["React", "TypeScript"],
            }
        )

        result = rank_gigs_for_freelancer_hybrid(freelancer, [gig], provider)[0]

        self.assertAlmostEqual(result.keyword_score, result.keyword_breakdown.keyword_score)
        self.assertAlmostEqual(result.semantic_score, result.semantic_breakdown.semantic_score)
        self.assertEqual(result.keyword_breakdown.matched_required_skills, ("React",))
        self.assertEqual(result.keyword_breakdown.missing_required_skills, ("TypeScript",))
        self.assertEqual(result.semantic_breakdown.provider_name, "ControlledEmbeddingProvider:controlled-hybrid-test")
        self.assertIn("Role: freelancer anchor x.", result.semantic_breakdown.freelancer_embedding_text)
        self.assertIn("Gig: gig similar x.", result.semantic_breakdown.gig_embedding_text)

    def test_provider_is_injected_and_no_real_model_loads(self):
        provider = ControlledEmbeddingProvider()
        freelancer = build_freelancer_match_profile(
            {"user_id": "freelancer-9", "primary_role": "freelancer anchor x"}
        )
        gig = build_gig_match_profile({"id": "gig-9", "title": "gig exact x"})

        score_hybrid_match(freelancer, gig, provider)

        self.assertEqual(len(provider.encoded_texts), 2)
        self.assertNotIn("sentence_transformers", sys.modules)

    def test_no_api_supabase_explanation_or_evaluation_behavior_is_introduced(self):
        forbidden_fragments = ("api", "explain", "explanation", "response", "precision", "recall", "ndcg", "map")

        score_fields = {field.name for field in HybridScoreBreakdown.__dataclass_fields__.values()}
        result_fields = {field.name for field in HybridMatchResult.__dataclass_fields__.values()}
        for field_name in score_fields | result_fields:
            with self.subTest(field_name=field_name):
                self.assertFalse(any(fragment in field_name.casefold() for fragment in forbidden_fragments))

        public_callables = {
            name
            for name, value in inspect.getmembers(hybrid)
            if not name.startswith("_") and callable(value)
        }
        self.assertNotIn("APIRouter", public_callables)
        self.assertNotIn("FastAPI", public_callables)

        source = inspect.getsource(hybrid)
        self.assertNotIn("supabase", source.casefold())
        self.assertNotIn(".insert(", source)
        self.assertNotIn(".update(", source)


if __name__ == "__main__":
    unittest.main()
