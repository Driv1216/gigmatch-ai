import unittest
from dataclasses import fields

from app.matching import (
    KeywordMatchResult,
    KeywordScoreBreakdown,
    build_freelancer_match_profile,
    build_gig_match_profile,
    rank_freelancers_for_gig,
    rank_gigs_for_freelancer,
    score_keyword_match,
)


class KeywordMatchingTests(unittest.TestCase):
    def test_perfect_required_skill_match_scores_higher_than_partial_match(self):
        gig = build_gig_match_profile(
            {
                "id": "gig-a",
                "tech_category": "frontend",
                "required_skills": ["React", "TypeScript"],
                "preferred_skills": [],
                "status": "open",
            }
        )
        perfect = build_freelancer_match_profile(
            {"user_id": "freelancer-perfect", "tech_categories": ["frontend"], "skills": ["React", "TypeScript"]}
        )
        partial = build_freelancer_match_profile(
            {"user_id": "freelancer-partial", "tech_categories": ["frontend"], "skills": ["React"]}
        )

        perfect_score = score_keyword_match(perfect, gig)
        partial_score = score_keyword_match(partial, gig)

        self.assertGreater(perfect_score.keyword_score, partial_score.keyword_score)
        self.assertEqual(perfect_score.required_skill_coverage, 1.0)
        self.assertEqual(partial_score.required_skill_coverage, 0.5)
        self.assertEqual(partial_score.missing_required_skills, ("TypeScript",))

    def test_preferred_skills_improve_score_but_do_not_dominate_required_skills(self):
        gig = build_gig_match_profile(
            {
                "id": "gig-b",
                "required_skills": ["React", "TypeScript"],
                "preferred_skills": ["Figma", "Docker"],
            }
        )
        required_match = build_freelancer_match_profile(
            {"user_id": "freelancer-required", "skills": ["React", "TypeScript"]}
        )
        required_plus_preferred = build_freelancer_match_profile(
            {"user_id": "freelancer-required-preferred", "skills": ["React", "TypeScript", "Figma"]}
        )
        partial_plus_all_preferred = build_freelancer_match_profile(
            {"user_id": "freelancer-preferred", "skills": ["React", "Figma", "Docker"]}
        )

        required_score = score_keyword_match(required_match, gig)
        required_plus_preferred_score = score_keyword_match(required_plus_preferred, gig)
        partial_plus_all_preferred_score = score_keyword_match(partial_plus_all_preferred, gig)

        self.assertGreater(required_plus_preferred_score.keyword_score, required_score.keyword_score)
        self.assertGreater(required_score.keyword_score, partial_plus_all_preferred_score.keyword_score)
        self.assertEqual(required_plus_preferred_score.preferred_skill_coverage, 0.5)

    def test_missing_required_skills_reduce_score_with_bounded_penalty(self):
        gig = build_gig_match_profile(
            {"id": "gig-c", "required_skills": ["React", "TypeScript", "FastAPI", "PostgreSQL"]}
        )
        freelancer = build_freelancer_match_profile({"user_id": "freelancer-c", "skills": ["React"]})

        score = score_keyword_match(freelancer, gig)

        self.assertEqual(score.required_skill_coverage, 0.25)
        self.assertEqual(score.missing_required_skills, ("TypeScript", "FastAPI", "PostgreSQL"))
        self.assertAlmostEqual(score.missing_required_skill_penalty, 0.09)
        self.assertAlmostEqual(score.keyword_score, 0.085)

    def test_category_alignment_affects_score_slightly(self):
        gig = build_gig_match_profile(
            {"id": "gig-d", "tech_category": "frontend", "required_skills": ["React"]}
        )
        aligned = build_freelancer_match_profile(
            {"user_id": "freelancer-aligned", "tech_categories": ["Frontend"], "skills": ["React"]}
        )
        unaligned = build_freelancer_match_profile(
            {"user_id": "freelancer-unaligned", "tech_categories": ["backend"], "skills": ["React"]}
        )

        aligned_score = score_keyword_match(aligned, gig)
        unaligned_score = score_keyword_match(unaligned, gig)

        self.assertEqual(aligned_score.category_alignment, 1.0)
        self.assertEqual(unaligned_score.category_alignment, 0.0)
        self.assertAlmostEqual(aligned_score.keyword_score - unaligned_score.keyword_score, 0.10)

    def test_duplicate_case_different_skills_do_not_inflate_score(self):
        gig = build_gig_match_profile(
            {
                "id": "gig-e",
                "required_skills": ["React", "react.js", "REACT"],
                "preferred_skills": ["JS", "javascript"],
            }
        )
        freelancer = build_freelancer_match_profile(
            {"user_id": "freelancer-e", "skills": ["react", "React.js", "JavaScript", "JS"]}
        )

        score = score_keyword_match(freelancer, gig)

        self.assertEqual(score.required_skill_coverage, 1.0)
        self.assertEqual(score.preferred_skill_coverage, 1.0)
        self.assertEqual(score.matched_required_skills, ("React",))
        self.assertEqual(score.matched_preferred_skills, ("JavaScript",))

    def test_empty_required_and_preferred_skills_do_not_crash(self):
        gig = build_gig_match_profile(
            {
                "id": "gig-f",
                "tech_category": "frontend",
                "required_skills": [],
                "preferred_skills": [],
                "status": "draft",
            }
        )
        freelancer = build_freelancer_match_profile(
            {"user_id": "freelancer-f", "tech_categories": ["frontend"], "skills": ["React"]}
        )

        score = score_keyword_match(freelancer, gig)

        self.assertEqual(score.required_skill_coverage, 0.0)
        self.assertEqual(score.preferred_skill_coverage, 0.0)
        self.assertEqual(score.category_alignment, 1.0)
        self.assertAlmostEqual(score.keyword_score, 0.10)

    def test_candidate_ranking_is_deterministic(self):
        freelancer = build_freelancer_match_profile({"user_id": "freelancer-g", "skills": ["React"]})
        gigs = [
            build_gig_match_profile({"id": "gig-c", "required_skills": ["Python"]}),
            build_gig_match_profile({"id": "gig-a", "required_skills": ["Python"]}),
            build_gig_match_profile({"id": "gig-b", "required_skills": ["Python"]}),
        ]

        results = rank_gigs_for_freelancer(freelancer, gigs)

        self.assertEqual([result.candidate_id for result in results], ["gig-a", "gig-b", "gig-c"])
        self.assertEqual([result.rank for result in results], [1, 2, 3])
        self.assertTrue(all(result.keyword_score == 0.0 for result in results))

    def test_freelancer_to_gigs_ranking_works_and_preserves_status(self):
        freelancer = build_freelancer_match_profile(
            {"user_id": "freelancer-h", "tech_categories": ["frontend"], "skills": ["React", "TypeScript", "Figma"]}
        )
        gigs = [
            build_gig_match_profile(
                {
                    "id": "gig-closed",
                    "tech_category": "frontend",
                    "required_skills": ["React"],
                    "preferred_skills": ["Figma"],
                    "status": "closed",
                }
            ),
            build_gig_match_profile(
                {
                    "id": "gig-draft",
                    "tech_category": "backend",
                    "required_skills": ["FastAPI"],
                    "status": "draft",
                }
            ),
            build_gig_match_profile(
                {
                    "id": "gig-open",
                    "tech_category": "frontend",
                    "required_skills": ["React", "TypeScript"],
                    "preferred_skills": ["Figma"],
                    "status": "open",
                }
            ),
        ]

        results = rank_gigs_for_freelancer(freelancer, gigs)

        self.assertEqual([result.candidate_id for result in results], ["gig-closed", "gig-open", "gig-draft"])
        self.assertEqual({result.candidate_id: result.gig_status for result in results}, {
            "gig-closed": "closed",
            "gig-draft": "draft",
            "gig-open": "open",
        })

    def test_gig_to_freelancers_ranking_works(self):
        gig = build_gig_match_profile(
            {
                "id": "gig-i",
                "tech_category": "backend",
                "required_skills": ["Python", "FastAPI"],
                "preferred_skills": ["Docker"],
                "status": "open",
            }
        )
        freelancers = [
            build_freelancer_match_profile(
                {"user_id": "freelancer-mid", "tech_categories": ["backend"], "skills": ["Python"]}
            ),
            build_freelancer_match_profile(
                {"user_id": "freelancer-best", "tech_categories": ["backend"], "skills": ["Python", "FastAPI", "Docker"]}
            ),
            build_freelancer_match_profile(
                {"user_id": "freelancer-low", "tech_categories": ["frontend"], "skills": ["React"]}
            ),
        ]

        results = rank_freelancers_for_gig(gig, freelancers)

        self.assertEqual([result.candidate_id for result in results], ["freelancer-best", "freelancer-mid", "freelancer-low"])
        self.assertEqual([result.candidate_type for result in results], ["freelancer", "freelancer", "freelancer"])
        self.assertEqual(results[0].rank, 1)
        self.assertEqual(results[0].gig_status, "open")

    def test_no_semantic_embedding_api_or_explanation_fields_are_introduced(self):
        forbidden_fragments = (
            "api",
            "copy",
            "cosine",
            "embedding",
            "explain",
            "explanation",
            "hybrid",
            "message",
            "response",
            "semantic",
            "vector",
        )

        score_fields = {field.name for field in fields(KeywordScoreBreakdown)}
        result_fields = {field.name for field in fields(KeywordMatchResult)}

        for field_name in score_fields | result_fields:
            with self.subTest(field_name=field_name):
                self.assertFalse(any(fragment in field_name for fragment in forbidden_fragments))


if __name__ == "__main__":
    unittest.main()
