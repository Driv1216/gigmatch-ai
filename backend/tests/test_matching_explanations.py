import json
import unittest
from dataclasses import asdict

from app.matching import (
    ExplanationReason,
    ExplanationReasonCode,
    HybridMatchResult,
    MatchExplanation,
    SemanticScoreBreakdown,
    ScoreExplanation,
    SkillEvidence,
    SkillGapSeverity,
    SkillGapSummary,
    build_freelancer_match_profile,
    build_explanation_text,
    build_gig_match_profile,
    build_match_explanation_evidence,
    build_skill_gap_summary,
    score_keyword_match,
    with_explanation_text,
    with_skill_gap_summary,
)


FORBIDDEN_PRIVACY_FRAGMENTS = (
    "raw_resume_text",
    "raw_gig_description",
    "parsed_json",
    "email",
    "auth",
    "supabase",
    "service_role",
    "debug",
    "trace",
    "embedding_text",
    "embedding_vector",
    "provider_name",
    "database_row",
)
UNSAFE_EXPLANATION_FRAGMENTS = (
    "best",
    "perfect",
    "fair",
    "unbiased",
    "reliable",
    "guaranteed",
    "likely to succeed",
    "you are missing",
    "candidate is missing",
)


class MatchingExplanationEvidenceTests(unittest.TestCase):
    def test_identifies_required_and_preferred_skill_evidence(self):
        freelancer = build_freelancer_match_profile(
            {"user_id": "freelancer-1", "skills": ["React", "Docker"]}
        )
        gig = build_gig_match_profile(
            {
                "id": "gig-1",
                "required_skills": ["React", "FastAPI"],
                "preferred_skills": ["Docker", "Kubernetes"],
            }
        )
        result = make_hybrid_result(freelancer, gig, candidate_id="gig-1", candidate_type="gig")

        explanation = build_match_explanation_evidence(
            freelancer=freelancer,
            gig=gig,
            result=result,
            subject_type="freelancer",
        )

        self.assertEqual(_skill_names(explanation.skill_gap.matched_required_skills), ["React"])
        self.assertEqual(_skill_names(explanation.skill_gap.matched_preferred_skills), ["Docker"])
        self.assertEqual(_skill_names(explanation.skill_gap.missing_required_skills), ["FastAPI"])
        self.assertEqual(_skill_names(explanation.skill_gap.missing_preferred_skills), ["Kubernetes"])
        self.assertEqual(explanation.skill_gap.severity, SkillGapSeverity.NONE)
        self.assertEqual(explanation.skill_gap.focus_skills, ())

    def test_copies_compact_score_evidence_from_existing_result(self):
        freelancer = build_freelancer_match_profile(
            {"user_id": "freelancer-2", "tech_categories": ["frontend"], "skills": ["React"]}
        )
        gig = build_gig_match_profile(
            {"id": "gig-2", "tech_category": "frontend", "required_skills": ["React"]}
        )
        result = make_hybrid_result(
            freelancer,
            gig,
            candidate_id="gig-2",
            candidate_type="gig",
            hybrid_score=0.77,
            semantic_score=0.75,
        )

        explanation = build_match_explanation_evidence(
            freelancer=freelancer,
            gig=gig,
            result=result,
            subject_type="freelancer",
        )

        self.assertEqual(explanation.score.hybrid_score, 0.77)
        self.assertEqual(explanation.score.keyword_score, result.keyword_score)
        self.assertEqual(explanation.score.semantic_score, 0.75)
        self.assertEqual(explanation.score.keyword_weight, result.keyword_weight)
        self.assertEqual(explanation.score.semantic_weight, result.semantic_weight)
        self.assertEqual(explanation.score.required_skill_coverage, 1.0)
        self.assertEqual(explanation.score.preferred_skill_coverage, 0.0)
        self.assertEqual(explanation.score.category_alignment, 1.0)
        self.assertEqual(explanation.score.missing_required_skill_penalty, 0.0)

    def test_reason_codes_are_attached_only_when_supported_by_evidence(self):
        freelancer = build_freelancer_match_profile(
            {"user_id": "freelancer-3", "tech_categories": ["backend"], "skills": ["React"]}
        )
        gig = build_gig_match_profile(
            {
                "id": "gig-3",
                "tech_category": "frontend",
                "required_skills": ["Python"],
                "preferred_skills": ["Docker"],
            }
        )
        result = make_hybrid_result(freelancer, gig, candidate_id="gig-3", candidate_type="gig")

        explanation = build_match_explanation_evidence(
            freelancer=freelancer,
            gig=gig,
            result=result,
            subject_type="freelancer",
        )
        codes = [reason.code for reason in explanation.reasons]

        self.assertIn(ExplanationReasonCode.MISSING_REQUIRED_SKILL, codes)
        self.assertIn(ExplanationReasonCode.MISSING_PREFERRED_SKILL, codes)
        self.assertIn(ExplanationReasonCode.KEYWORD_SCORE_SUPPORT, codes)
        self.assertIn(ExplanationReasonCode.SEMANTIC_SCORE_SUPPORT, codes)
        self.assertIn(ExplanationReasonCode.HYBRID_SCORE_SUPPORT, codes)
        self.assertNotIn(ExplanationReasonCode.REQUIRED_SKILL_MATCH, codes)
        self.assertNotIn(ExplanationReasonCode.PREFERRED_SKILL_MATCH, codes)
        self.assertNotIn(ExplanationReasonCode.CATEGORY_ALIGNMENT, codes)
        self.assertNotIn(ExplanationReasonCode.SENIORITY_ALIGNMENT, codes)
        self.assertNotIn(ExplanationReasonCode.HIGH_SEMANTIC_SIMILARITY, codes)
        self.assertNotIn(ExplanationReasonCode.LOW_SEMANTIC_SIMILARITY, codes)

    def test_category_alignment_reason_is_added_only_for_positive_existing_breakdown(self):
        aligned_freelancer = build_freelancer_match_profile(
            {"user_id": "freelancer-4", "tech_categories": ["frontend"], "skills": ["React"]}
        )
        unaligned_freelancer = build_freelancer_match_profile(
            {"user_id": "freelancer-5", "tech_categories": ["backend"], "skills": ["React"]}
        )
        gig = build_gig_match_profile(
            {"id": "gig-4", "tech_category": "frontend", "required_skills": ["React"]}
        )

        aligned = build_match_explanation_evidence(
            freelancer=aligned_freelancer,
            gig=gig,
            result=make_hybrid_result(aligned_freelancer, gig, candidate_id="gig-4", candidate_type="gig"),
            subject_type="freelancer",
        )
        unaligned = build_match_explanation_evidence(
            freelancer=unaligned_freelancer,
            gig=gig,
            result=make_hybrid_result(unaligned_freelancer, gig, candidate_id="gig-4", candidate_type="gig"),
            subject_type="freelancer",
        )

        self.assertIn(ExplanationReasonCode.CATEGORY_ALIGNMENT, [reason.code for reason in aligned.reasons])
        self.assertNotIn(ExplanationReasonCode.CATEGORY_ALIGNMENT, [reason.code for reason in unaligned.reasons])

    def test_empty_skills_produce_safe_empty_evidence(self):
        freelancer = build_freelancer_match_profile({"user_id": "freelancer-6", "skills": []})
        gig = build_gig_match_profile({"id": "gig-6", "required_skills": [], "preferred_skills": []})
        result = make_hybrid_result(freelancer, gig, candidate_id="gig-6", candidate_type="gig")

        explanation = build_match_explanation_evidence(
            freelancer=freelancer,
            gig=gig,
            result=result,
            subject_type="freelancer",
        )

        self.assertEqual(explanation.skill_gap.matched_required_skills, ())
        self.assertEqual(explanation.skill_gap.matched_preferred_skills, ())
        self.assertEqual(explanation.skill_gap.missing_required_skills, ())
        self.assertEqual(explanation.skill_gap.missing_preferred_skills, ())
        self.assertEqual(explanation.skill_gap.severity, SkillGapSeverity.NONE)
        self.assertEqual(explanation.skill_gap.focus_skills, ())

    def test_builder_output_is_neutral_for_both_matching_directions(self):
        freelancer = build_freelancer_match_profile({"user_id": "freelancer-7", "skills": ["Python"]})
        gig = build_gig_match_profile({"id": "gig-7", "required_skills": ["Python"]})

        freelancer_to_gig = build_match_explanation_evidence(
            freelancer=freelancer,
            gig=gig,
            result=make_hybrid_result(freelancer, gig, candidate_id="gig-7", candidate_type="gig", rank=2),
            subject_type="freelancer",
        )
        gig_to_freelancer = build_match_explanation_evidence(
            freelancer=freelancer,
            gig=gig,
            result=make_hybrid_result(
                freelancer,
                gig,
                candidate_id="freelancer-7",
                candidate_type="freelancer",
                rank=3,
            ),
            subject_type="gig",
        )

        self.assertEqual(freelancer_to_gig.subject_id, "freelancer-7")
        self.assertEqual(freelancer_to_gig.subject_type, "freelancer")
        self.assertEqual(freelancer_to_gig.candidate_id, "gig-7")
        self.assertEqual(freelancer_to_gig.candidate_type, "gig")
        self.assertEqual(gig_to_freelancer.subject_id, "gig-7")
        self.assertEqual(gig_to_freelancer.subject_type, "gig")
        self.assertEqual(gig_to_freelancer.candidate_id, "freelancer-7")
        self.assertEqual(gig_to_freelancer.candidate_type, "freelancer")
        self.assertNotIn("you", json.dumps(_json_round_trip(freelancer_to_gig)).lower())
        self.assertNotIn("candidate is missing", json.dumps(_json_round_trip(gig_to_freelancer)).lower())

    def test_serialized_output_does_not_include_forbidden_private_fields(self):
        freelancer = build_freelancer_match_profile({"user_id": "freelancer-8", "skills": ["Python"]})
        gig = build_gig_match_profile({"id": "gig-8", "required_skills": ["Python"]})
        result = make_hybrid_result(freelancer, gig, candidate_id="gig-8", candidate_type="gig")

        explanation = build_match_explanation_evidence(
            freelancer=freelancer,
            gig=gig,
            result=result,
            subject_type="freelancer",
        )
        payload = json.dumps(_json_round_trip(explanation)).lower()

        for fragment in FORBIDDEN_PRIVACY_FRAGMENTS:
            with self.subTest(fragment=fragment):
                self.assertNotIn(fragment, payload)

    def test_builder_does_not_mutate_inputs(self):
        freelancer = build_freelancer_match_profile({"user_id": "freelancer-9", "skills": ["Python"]})
        gig = build_gig_match_profile({"id": "gig-9", "required_skills": ["Python"], "preferred_skills": ["Docker"]})
        result = make_hybrid_result(freelancer, gig, candidate_id="gig-9", candidate_type="gig")
        before = (asdict(freelancer), asdict(gig), asdict(result))

        build_match_explanation_evidence(
            freelancer=freelancer,
            gig=gig,
            result=result,
            subject_type="freelancer",
        )

        self.assertEqual(before, (asdict(freelancer), asdict(gig), asdict(result)))


class SkillGapSummaryBuilderTests(unittest.TestCase):
    def test_no_missing_skills_produces_none_severity_and_empty_focus_skills(self):
        summary = build_skill_gap_summary(
            SkillGapSummary(
                matched_required_skills=(skill("Python"),),
                matched_preferred_skills=(skill("Docker"),),
            )
        )

        self.assertEqual(summary.severity, SkillGapSeverity.NONE)
        self.assertEqual(summary.focus_skills, ())

    def test_preferred_only_severity_rules_are_deterministic(self):
        one_preferred = build_skill_gap_summary(SkillGapSummary(missing_preferred_skills=(skill("Docker"),)))
        two_preferred = build_skill_gap_summary(
            SkillGapSummary(missing_preferred_skills=(skill("Docker"), skill("Kubernetes")))
        )
        three_preferred = build_skill_gap_summary(
            SkillGapSummary(missing_preferred_skills=(skill("Docker"), skill("Kubernetes"), skill("GraphQL")))
        )

        self.assertEqual(one_preferred.severity, SkillGapSeverity.LOW)
        self.assertEqual(two_preferred.severity, SkillGapSeverity.LOW)
        self.assertEqual(three_preferred.severity, SkillGapSeverity.MEDIUM)

    def test_required_missing_severity_rules_are_deterministic(self):
        one_required = build_skill_gap_summary(SkillGapSummary(missing_required_skills=(skill("Python"),)))
        two_required = build_skill_gap_summary(
            SkillGapSummary(missing_required_skills=(skill("Python"), skill("FastAPI")))
        )

        self.assertEqual(one_required.severity, SkillGapSeverity.MEDIUM)
        self.assertEqual(two_required.severity, SkillGapSeverity.HIGH)

    def test_focus_skills_prioritize_required_then_preferred_and_stay_compact(self):
        summary = build_skill_gap_summary(
            SkillGapSummary(
                missing_required_skills=(skill("Python"), skill("FastAPI"), skill("PostgreSQL")),
                missing_preferred_skills=(skill("Docker"), skill("Kubernetes"), skill("GraphQL")),
            )
        )

        self.assertEqual(_skill_names(summary.focus_skills), ["Python", "FastAPI", "PostgreSQL", "Docker", "Kubernetes"])

    def test_focus_skills_deduplicate_without_inventing_non_missing_skills(self):
        summary = build_skill_gap_summary(
            SkillGapSummary(
                matched_required_skills=(skill("React"),),
                missing_required_skills=(skill("Python"), skill("Python", normalized_name="python")),
                missing_preferred_skills=(skill("python", normalized_name="python"), skill("Docker")),
            )
        )

        self.assertEqual(_skill_names(summary.focus_skills), ["Python", "Docker"])
        self.assertNotIn("React", _skill_names(summary.focus_skills))

    def test_custom_focus_limit_is_supported_and_validated(self):
        skill_gap = SkillGapSummary(
            missing_required_skills=(skill("Python"), skill("FastAPI")),
            missing_preferred_skills=(skill("Docker"),),
        )

        self.assertEqual(_skill_names(build_skill_gap_summary(skill_gap, max_focus_skills=2).focus_skills), ["Python", "FastAPI"])
        self.assertEqual(build_skill_gap_summary(skill_gap, max_focus_skills=0).focus_skills, ())
        with self.assertRaisesRegex(ValueError, "must not be negative"):
            build_skill_gap_summary(skill_gap, max_focus_skills=-1)

    def test_summary_builder_preserves_evidence_and_does_not_mutate_input(self):
        raw = SkillGapSummary(
            matched_required_skills=(skill("React"),),
            missing_required_skills=(skill("Python"),),
            missing_preferred_skills=(skill("Docker"),),
        )
        before = asdict(raw)

        summary = build_skill_gap_summary(raw)

        self.assertEqual(asdict(raw), before)
        self.assertEqual(summary.matched_required_skills, raw.matched_required_skills)
        self.assertEqual(summary.missing_required_skills, raw.missing_required_skills)
        self.assertEqual(summary.missing_preferred_skills, raw.missing_preferred_skills)

    def test_with_skill_gap_summary_returns_neutral_copy_for_both_directions(self):
        freelancer = build_freelancer_match_profile({"user_id": "freelancer-10", "skills": ["React"]})
        gig = build_gig_match_profile({"id": "gig-10", "required_skills": ["React", "Python"]})
        freelancer_to_gig = build_match_explanation_evidence(
            freelancer=freelancer,
            gig=gig,
            result=make_hybrid_result(freelancer, gig, candidate_id="gig-10", candidate_type="gig"),
            subject_type="freelancer",
        )
        gig_to_freelancer = build_match_explanation_evidence(
            freelancer=freelancer,
            gig=gig,
            result=make_hybrid_result(freelancer, gig, candidate_id="freelancer-10", candidate_type="freelancer"),
            subject_type="gig",
        )

        summarized_freelancer = with_skill_gap_summary(freelancer_to_gig)
        summarized_gig = with_skill_gap_summary(gig_to_freelancer)

        self.assertEqual(freelancer_to_gig.skill_gap.severity, SkillGapSeverity.NONE)
        self.assertEqual(summarized_freelancer.skill_gap.severity, SkillGapSeverity.MEDIUM)
        self.assertEqual(summarized_gig.skill_gap.severity, SkillGapSeverity.MEDIUM)
        self.assertEqual(_skill_names(summarized_freelancer.skill_gap.focus_skills), ["Python"])
        self.assertEqual(_skill_names(summarized_gig.skill_gap.focus_skills), ["Python"])
        self.assertNotIn("you", json.dumps(_json_round_trip(summarized_freelancer)).lower())
        self.assertNotIn("bad freelancer", json.dumps(_json_round_trip(summarized_gig)).lower())

    def test_summary_output_serializes_safely_without_private_fields(self):
        raw = SkillGapSummary(
            missing_required_skills=(skill("Python"),),
            missing_preferred_skills=(skill("Docker"),),
        )

        payload = json.dumps(_json_round_trip(build_skill_gap_summary(raw))).lower()

        self.assertIn("medium", payload)
        for fragment in FORBIDDEN_PRIVACY_FRAGMENTS:
            with self.subTest(fragment=fragment):
                self.assertNotIn(fragment, payload)


class ExplanationTextBuilderTests(unittest.TestCase):
    def test_generates_text_from_matched_and_missing_skills(self):
        explanation = MatchExplanation(
            skill_gap=SkillGapSummary(
                matched_required_skills=(skill("Python"),),
                matched_preferred_skills=(skill("Docker"),),
                missing_required_skills=(skill("PostgreSQL"),),
                missing_preferred_skills=(skill("Kubernetes"),),
            )
        )

        text = build_explanation_text(explanation)

        self.assertIn("Required skill matches: Python.", text)
        self.assertIn("Preferred skill matches: Docker.", text)
        self.assertIn("Missing required skills: PostgreSQL.", text)
        self.assertIn("Missing preferred skills: Kubernetes.", text)

    def test_mentions_score_evidence_only_when_scores_exist(self):
        without_scores = build_explanation_text(MatchExplanation())
        with_scores = build_explanation_text(
            MatchExplanation(
                score=ScoreExplanation(
                    hybrid_score=0.8,
                    keyword_score=0.7,
                    semantic_score=0.9,
                )
            )
        )

        self.assertNotIn("Score evidence available", without_scores)
        self.assertIn("Score evidence available: hybrid score, keyword score, semantic score.", with_scores)

    def test_mentions_skill_gap_severity_and_focus_skills_only_when_present(self):
        raw = SkillGapSummary(missing_required_skills=(skill("Python"),), missing_preferred_skills=(skill("Docker"),))
        summarized = MatchExplanation(skill_gap=build_skill_gap_summary(raw))
        empty = MatchExplanation(skill_gap=SkillGapSummary())

        text = build_explanation_text(summarized)
        empty_text = build_explanation_text(empty)

        self.assertIn("Skill-gap severity: medium.", text)
        self.assertIn("Focus skills: Python, Docker.", text)
        self.assertNotIn("Skill-gap severity", empty_text)
        self.assertNotIn("Focus skills", empty_text)

    def test_does_not_invent_category_or_seniority_alignment_when_absent(self):
        text = build_explanation_text(
            MatchExplanation(
                reasons=(ExplanationReason(ExplanationReasonCode.REQUIRED_SKILL_MATCH, ("Python",)),),
                skill_gap=SkillGapSummary(matched_required_skills=(skill("Python"),)),
            )
        )

        self.assertNotIn("Category alignment", text)
        self.assertNotIn("Seniority alignment", text)

    def test_renders_alignment_only_from_existing_reason_codes(self):
        text = build_explanation_text(
            MatchExplanation(
                reasons=(
                    ExplanationReason(
                        code=ExplanationReasonCode.CATEGORY_ALIGNMENT,
                        score_name="category_alignment",
                        score_value=1.0,
                    ),
                )
            )
        )

        self.assertIn("Category alignment evidence is available.", text)
        self.assertNotIn("Seniority alignment", text)

    def test_avoids_route_specific_wording_and_unsafe_claims(self):
        text = build_explanation_text(
            MatchExplanation(
                skill_gap=SkillGapSummary(
                    missing_required_skills=(skill("Python"),),
                    missing_preferred_skills=(skill("Docker"),),
                )
            )
        ).lower()

        for fragment in UNSAFE_EXPLANATION_FRAGMENTS:
            with self.subTest(fragment=fragment):
                self.assertNotIn(fragment, text)

    def test_handles_empty_evidence_safely(self):
        self.assertEqual(
            build_explanation_text(MatchExplanation()),
            "Limited explanation evidence is available for this match.",
        )

    def test_with_explanation_text_returns_copy_without_mutating_input(self):
        explanation = MatchExplanation(skill_gap=SkillGapSummary(matched_required_skills=(skill("Python"),)))
        before = asdict(explanation)

        with_text = with_explanation_text(explanation)

        self.assertEqual(asdict(explanation), before)
        self.assertIsNone(explanation.summary)
        self.assertEqual(with_text.summary, "Required skill matches: Python.")

    def test_serialized_text_output_excludes_private_fields(self):
        explanation = with_explanation_text(
            MatchExplanation(
                skill_gap=SkillGapSummary(matched_required_skills=(skill("Python"),)),
                score=ScoreExplanation(hybrid_score=0.8),
            )
        )
        payload = json.dumps(_json_round_trip(explanation)).lower()

        for fragment in FORBIDDEN_PRIVACY_FRAGMENTS:
            with self.subTest(fragment=fragment):
                self.assertNotIn(fragment, payload)


def make_hybrid_result(
    freelancer,
    gig,
    *,
    candidate_id: str,
    candidate_type: str,
    rank: int = 1,
    hybrid_score: float = 0.5,
    semantic_score: float = 0.5,
) -> HybridMatchResult:
    keyword_breakdown = score_keyword_match(freelancer, gig)
    return HybridMatchResult(
        candidate_id=candidate_id,
        candidate_type=candidate_type,
        hybrid_score=hybrid_score,
        keyword_score=keyword_breakdown.keyword_score,
        semantic_score=semantic_score,
        rank=rank,
        keyword_weight=0.55,
        semantic_weight=0.45,
        keyword_breakdown=keyword_breakdown,
        semantic_breakdown=SemanticScoreBreakdown(
            raw_cosine_similarity=0.0,
            semantic_score=semantic_score,
            freelancer_embedding_text="raw_resume_text should remain private",
            gig_embedding_text="raw_gig_description should remain private",
            vector_dimension=2,
            provider_name="private-provider",
        ),
        gig_status=gig.status,
    )


def _skill_names(skills):
    return [skill.skill_name for skill in skills]


def skill(name: str, normalized_name: str | None = None) -> SkillEvidence:
    return SkillEvidence(
        skill_name=name,
        normalized_name=normalized_name or name.casefold(),
        category="backend",
    )


def _json_round_trip(value):
    return json.loads(json.dumps(asdict(value)))


if __name__ == "__main__":
    unittest.main()
