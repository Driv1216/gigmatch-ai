import json
import re
import unittest
from dataclasses import asdict

from app.matching import (
    ExplanationReason,
    ExplanationReasonCode,
    MatchExplanation,
    ScoreExplanation,
    SkillEvidence,
    SkillGapSeverity,
    SkillGapSummary,
)


FORBIDDEN_PRIVACY_FRAGMENTS = (
    "raw_resume_text",
    "raw_gig_description",
    "raw_parse",
    "parsed_json",
    "email",
    "auth",
    "supabase",
    "service_role",
    "private",
    "debug",
    "trace",
    "embedding_vector",
    "vector",
    "database_row",
)


class MatchingExplanationContractTests(unittest.TestCase):
    def test_reason_code_enum_values_serialize_safely(self):
        values = [code.value for code in ExplanationReasonCode]

        self.assertIn("required_skill_match", values)
        self.assertIn("missing_required_skill", values)
        self.assertIn("hybrid_score_support", values)
        self.assertNotIn("best_match", values)
        self.assertNotIn("guaranteed_fit", values)
        self.assertTrue(all(re.fullmatch(r"[a-z]+(_[a-z]+)*", value) for value in values))
        self.assertEqual(json.loads(json.dumps({"codes": list(ExplanationReasonCode)})), {"codes": values})

    def test_skill_evidence_objects_serialize_safely(self):
        evidence = SkillEvidence(
            skill_name="FastAPI",
            normalized_name="fastapi",
            category="backend",
        )

        self.assertEqual(
            _json_round_trip(evidence),
            {
                "skill_name": "FastAPI",
                "normalized_name": "fastapi",
                "category": "backend",
            },
        )

    def test_skill_gap_summary_objects_serialize_safely(self):
        summary = SkillGapSummary(
            severity=SkillGapSeverity.MEDIUM,
            matched_required_skills=(SkillEvidence("Python", "python", "backend"),),
            matched_preferred_skills=(SkillEvidence("Docker", "docker", "devops"),),
            missing_required_skills=(SkillEvidence("PostgreSQL", "postgresql", "database"),),
            missing_preferred_skills=(SkillEvidence("Kubernetes", "kubernetes", "devops"),),
            focus_skills=(SkillEvidence("PostgreSQL", "postgresql", "database"),),
        )

        data = _json_round_trip(summary)

        self.assertEqual(data["severity"], "medium")
        self.assertEqual(data["matched_required_skills"][0]["skill_name"], "Python")
        self.assertEqual(data["missing_required_skills"][0]["skill_name"], "PostgreSQL")
        self.assertEqual(data["focus_skills"][0]["skill_name"], "PostgreSQL")

    def test_match_explanation_objects_serialize_safely(self):
        explanation = MatchExplanation(
            subject_id="freelancer-1",
            subject_type="freelancer",
            candidate_id="gig-1",
            candidate_type="gig",
            rank=1,
            reasons=(
                ExplanationReason(
                    code=ExplanationReasonCode.REQUIRED_SKILL_MATCH,
                    skill_names=("Python",),
                ),
                ExplanationReason(
                    code=ExplanationReasonCode.HYBRID_SCORE_SUPPORT,
                    score_name="hybrid_score",
                    score_value=0.92,
                ),
            ),
            score=ScoreExplanation(
                hybrid_score=0.92,
                keyword_score=0.85,
                semantic_score=1.0,
                keyword_weight=0.55,
                semantic_weight=0.45,
                required_skill_coverage=1.0,
                preferred_skill_coverage=0.5,
                category_alignment=1.0,
                missing_required_skill_penalty=0.0,
            ),
            skill_gap=SkillGapSummary(
                severity=SkillGapSeverity.LOW,
                matched_required_skills=(SkillEvidence("Python", "python", "backend"),),
                missing_preferred_skills=(SkillEvidence("Docker", "docker", "devops"),),
                focus_skills=(SkillEvidence("Docker", "docker", "devops"),),
            ),
        )

        data = _json_round_trip(explanation)

        self.assertEqual(data["subject_type"], "freelancer")
        self.assertEqual(data["candidate_type"], "gig")
        self.assertEqual(data["reasons"][0]["code"], "required_skill_match")
        self.assertEqual(data["score"]["hybrid_score"], 0.92)
        self.assertEqual(data["skill_gap"]["severity"], "low")

    def test_empty_default_explanation_object_is_safe(self):
        data = _json_round_trip(MatchExplanation())

        self.assertIsNone(data["subject_id"])
        self.assertIsNone(data["candidate_id"])
        self.assertEqual(data["reasons"], [])
        self.assertIsNone(data["score"]["hybrid_score"])
        self.assertEqual(data["skill_gap"]["severity"], "none")
        self.assertEqual(data["skill_gap"]["focus_skills"], [])

    def test_serialized_output_has_no_forbidden_private_fields(self):
        explanation = MatchExplanation(
            subject_id="gig-1",
            subject_type="gig",
            candidate_id="freelancer-1",
            candidate_type="freelancer",
            reasons=(
                ExplanationReason(
                    code=ExplanationReasonCode.SEMANTIC_SCORE_SUPPORT,
                    score_name="semantic_score",
                    score_value=0.81,
                ),
            ),
            score=ScoreExplanation(keyword_score=0.7, semantic_score=0.81, hybrid_score=0.7495),
            skill_gap=SkillGapSummary(
                severity=SkillGapSeverity.HIGH,
                missing_required_skills=(SkillEvidence("TypeScript", "typescript", "frontend"),),
                focus_skills=(SkillEvidence("TypeScript", "typescript", "frontend"),),
            ),
        )

        payload = json.dumps(_json_round_trip(explanation)).lower()

        for fragment in FORBIDDEN_PRIVACY_FRAGMENTS:
            with self.subTest(fragment=fragment):
                self.assertNotIn(fragment, payload)

    def test_contract_supports_both_matching_directions_neutrally(self):
        freelancer_to_gig = MatchExplanation(
            subject_id="freelancer-1",
            subject_type="freelancer",
            candidate_id="gig-1",
            candidate_type="gig",
            reasons=(ExplanationReason(ExplanationReasonCode.PREFERRED_SKILL_MATCH, ("React",)),),
        )
        gig_to_freelancer = MatchExplanation(
            subject_id="gig-1",
            subject_type="gig",
            candidate_id="freelancer-1",
            candidate_type="freelancer",
            reasons=(ExplanationReason(ExplanationReasonCode.MISSING_PREFERRED_SKILL, ("React",)),),
        )

        freelancer_data = _json_round_trip(freelancer_to_gig)
        gig_data = _json_round_trip(gig_to_freelancer)

        self.assertEqual(set(freelancer_data), set(gig_data))
        self.assertEqual(freelancer_data["subject_type"], "freelancer")
        self.assertEqual(freelancer_data["candidate_type"], "gig")
        self.assertEqual(gig_data["subject_type"], "gig")
        self.assertEqual(gig_data["candidate_type"], "freelancer")
        self.assertNotIn("you", json.dumps(freelancer_data).lower())
        self.assertNotIn("you", json.dumps(gig_data).lower())


def _json_round_trip(value):
    return json.loads(json.dumps(asdict(value)))


if __name__ == "__main__":
    unittest.main()
