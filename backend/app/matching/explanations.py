"""Pure explanation evidence builders for existing matching results."""

from __future__ import annotations

from dataclasses import replace
from typing import Literal

from app.matching.contracts import (
    ExplanationReason,
    ExplanationReasonCode,
    FreelancerMatchProfile,
    GigMatchProfile,
    MatchExplanation,
    NormalizedSkill,
    ScoreExplanation,
    SkillEvidence,
    SkillGapSeverity,
    SkillGapSummary,
)
from app.matching.hybrid import HybridMatchResult

MatchSubjectType = Literal["freelancer", "gig"]
DEFAULT_MAX_FOCUS_SKILLS = 5


def build_match_explanation_evidence(
    *,
    freelancer: FreelancerMatchProfile,
    gig: GigMatchProfile,
    result: HybridMatchResult,
    subject_type: MatchSubjectType,
) -> MatchExplanation:
    """Build safe structured explanation evidence for an already-ranked match."""

    skill_gap = _build_skill_gap_summary(freelancer, gig)
    score = _build_score_explanation(result)

    return MatchExplanation(
        subject_id=_subject_id(freelancer, gig, subject_type),
        subject_type=subject_type,
        candidate_id=result.candidate_id,
        candidate_type=result.candidate_type,
        rank=result.rank,
        reasons=_build_reasons(skill_gap, score),
        score=score,
        skill_gap=skill_gap,
    )


def build_skill_gap_summary(
    skill_gap: SkillGapSummary,
    max_focus_skills: int = DEFAULT_MAX_FOCUS_SKILLS,
) -> SkillGapSummary:
    """Summarize raw missing-skill evidence without inventing new skills."""

    if max_focus_skills < 0:
        raise ValueError("max_focus_skills must not be negative.")

    return SkillGapSummary(
        severity=_gap_severity(
            missing_required_count=len(skill_gap.missing_required_skills),
            missing_preferred_count=len(skill_gap.missing_preferred_skills),
        ),
        matched_required_skills=skill_gap.matched_required_skills,
        matched_preferred_skills=skill_gap.matched_preferred_skills,
        missing_required_skills=skill_gap.missing_required_skills,
        missing_preferred_skills=skill_gap.missing_preferred_skills,
        focus_skills=_focus_skills(skill_gap, max_focus_skills),
    )


def with_skill_gap_summary(
    explanation: MatchExplanation,
    max_focus_skills: int = DEFAULT_MAX_FOCUS_SKILLS,
) -> MatchExplanation:
    """Return a copy of an explanation with summarized skill-gap evidence."""

    return replace(
        explanation,
        skill_gap=build_skill_gap_summary(explanation.skill_gap, max_focus_skills),
    )


def build_explanation_text(explanation: MatchExplanation) -> str:
    """Build short deterministic explanation text from structured evidence."""

    sentences: list[str] = []

    if explanation.skill_gap.matched_required_skills:
        sentences.append(
            f"Required skill matches: {_format_skill_list(explanation.skill_gap.matched_required_skills)}."
        )
    if explanation.skill_gap.matched_preferred_skills:
        sentences.append(
            f"Preferred skill matches: {_format_skill_list(explanation.skill_gap.matched_preferred_skills)}."
        )
    if explanation.skill_gap.missing_required_skills:
        sentences.append(
            f"Missing required skills: {_format_skill_list(explanation.skill_gap.missing_required_skills)}."
        )
    if explanation.skill_gap.missing_preferred_skills:
        sentences.append(
            f"Missing preferred skills: {_format_skill_list(explanation.skill_gap.missing_preferred_skills)}."
        )

    score_names = _available_score_names(explanation.score)
    if score_names:
        sentences.append(f"Score evidence available: {', '.join(score_names)}.")

    if explanation.skill_gap.severity != SkillGapSeverity.NONE:
        sentences.append(f"Skill-gap severity: {explanation.skill_gap.severity.value}.")
    if explanation.skill_gap.focus_skills:
        sentences.append(f"Focus skills: {_format_skill_list(explanation.skill_gap.focus_skills)}.")

    if _has_reason(explanation, ExplanationReasonCode.CATEGORY_ALIGNMENT):
        sentences.append("Category alignment evidence is available.")
    if _has_reason(explanation, ExplanationReasonCode.SENIORITY_ALIGNMENT):
        sentences.append("Seniority alignment evidence is available.")

    if not sentences:
        return "Limited explanation evidence is available for this match."
    return " ".join(sentences)


def with_explanation_text(explanation: MatchExplanation) -> MatchExplanation:
    """Return a copy of an explanation with deterministic summary text."""

    return replace(explanation, summary=build_explanation_text(explanation))


def _build_skill_gap_summary(
    freelancer: FreelancerMatchProfile,
    gig: GigMatchProfile,
) -> SkillGapSummary:
    freelancer_skill_names = {skill.normalized_name for skill in freelancer.skills}

    matched_required_skills, missing_required_skills = _partition_skills(
        gig.required_skills,
        freelancer_skill_names,
    )
    matched_preferred_skills, missing_preferred_skills = _partition_skills(
        gig.preferred_skills,
        freelancer_skill_names,
    )

    return SkillGapSummary(
        severity=SkillGapSeverity.NONE,
        matched_required_skills=matched_required_skills,
        matched_preferred_skills=matched_preferred_skills,
        missing_required_skills=missing_required_skills,
        missing_preferred_skills=missing_preferred_skills,
        focus_skills=(),
    )


def _gap_severity(
    *,
    missing_required_count: int,
    missing_preferred_count: int,
) -> SkillGapSeverity:
    if missing_required_count >= 2:
        return SkillGapSeverity.HIGH
    if missing_required_count == 1:
        return SkillGapSeverity.MEDIUM
    if missing_preferred_count >= 3:
        return SkillGapSeverity.MEDIUM
    if missing_preferred_count >= 1:
        return SkillGapSeverity.LOW
    return SkillGapSeverity.NONE


def _focus_skills(
    skill_gap: SkillGapSummary,
    max_focus_skills: int,
) -> tuple[SkillEvidence, ...]:
    if max_focus_skills <= 0:
        return ()

    focus: list[SkillEvidence] = []
    seen: set[str] = set()

    for skill in skill_gap.missing_required_skills + skill_gap.missing_preferred_skills:
        key = _skill_identity(skill)
        if key in seen:
            continue
        focus.append(skill)
        seen.add(key)
        if len(focus) >= max_focus_skills:
            break

    return tuple(focus)


def _skill_identity(skill: SkillEvidence) -> str:
    if skill.normalized_name:
        return skill.normalized_name
    return skill.skill_name.casefold()


def _available_score_names(score: ScoreExplanation) -> tuple[str, ...]:
    names: list[str] = []
    if score.hybrid_score is not None:
        names.append("hybrid score")
    if score.keyword_score is not None:
        names.append("keyword score")
    if score.semantic_score is not None:
        names.append("semantic score")
    return tuple(names)


def _format_skill_list(skills: tuple[SkillEvidence, ...]) -> str:
    return ", ".join(skill.skill_name for skill in skills)


def _has_reason(explanation: MatchExplanation, code: ExplanationReasonCode) -> bool:
    return any(reason.code == code for reason in explanation.reasons)


def _build_score_explanation(result: HybridMatchResult) -> ScoreExplanation:
    return ScoreExplanation(
        hybrid_score=result.hybrid_score,
        keyword_score=result.keyword_score,
        semantic_score=result.semantic_score,
        keyword_weight=result.keyword_weight,
        semantic_weight=result.semantic_weight,
        required_skill_coverage=result.keyword_breakdown.required_skill_coverage,
        preferred_skill_coverage=result.keyword_breakdown.preferred_skill_coverage,
        category_alignment=result.keyword_breakdown.category_alignment,
        missing_required_skill_penalty=result.keyword_breakdown.missing_required_skill_penalty,
    )


def _build_reasons(
    skill_gap: SkillGapSummary,
    score: ScoreExplanation,
) -> tuple[ExplanationReason, ...]:
    reasons: list[ExplanationReason] = []

    if skill_gap.matched_required_skills:
        reasons.append(
            ExplanationReason(
                code=ExplanationReasonCode.REQUIRED_SKILL_MATCH,
                skill_names=_skill_names(skill_gap.matched_required_skills),
            )
        )
    if skill_gap.matched_preferred_skills:
        reasons.append(
            ExplanationReason(
                code=ExplanationReasonCode.PREFERRED_SKILL_MATCH,
                skill_names=_skill_names(skill_gap.matched_preferred_skills),
            )
        )
    if skill_gap.missing_required_skills:
        reasons.append(
            ExplanationReason(
                code=ExplanationReasonCode.MISSING_REQUIRED_SKILL,
                skill_names=_skill_names(skill_gap.missing_required_skills),
            )
        )
    if skill_gap.missing_preferred_skills:
        reasons.append(
            ExplanationReason(
                code=ExplanationReasonCode.MISSING_PREFERRED_SKILL,
                skill_names=_skill_names(skill_gap.missing_preferred_skills),
            )
        )

    if score.keyword_score is not None:
        reasons.append(
            ExplanationReason(
                code=ExplanationReasonCode.KEYWORD_SCORE_SUPPORT,
                score_name="keyword_score",
                score_value=score.keyword_score,
            )
        )
    if score.semantic_score is not None:
        reasons.append(
            ExplanationReason(
                code=ExplanationReasonCode.SEMANTIC_SCORE_SUPPORT,
                score_name="semantic_score",
                score_value=score.semantic_score,
            )
        )
    if score.hybrid_score is not None:
        reasons.append(
            ExplanationReason(
                code=ExplanationReasonCode.HYBRID_SCORE_SUPPORT,
                score_name="hybrid_score",
                score_value=score.hybrid_score,
            )
        )
    if score.category_alignment is not None and score.category_alignment > 0.0:
        reasons.append(
            ExplanationReason(
                code=ExplanationReasonCode.CATEGORY_ALIGNMENT,
                score_name="category_alignment",
                score_value=score.category_alignment,
            )
        )

    return tuple(reasons)


def _partition_skills(
    skills: tuple[NormalizedSkill, ...],
    freelancer_skill_names: set[str],
) -> tuple[tuple[SkillEvidence, ...], tuple[SkillEvidence, ...]]:
    matched: list[SkillEvidence] = []
    missing: list[SkillEvidence] = []

    for skill in skills:
        evidence = _skill_evidence(skill)
        if skill.normalized_name in freelancer_skill_names:
            matched.append(evidence)
        else:
            missing.append(evidence)

    return tuple(matched), tuple(missing)


def _skill_evidence(skill: NormalizedSkill) -> SkillEvidence:
    return SkillEvidence(
        skill_name=skill.display_name,
        normalized_name=skill.normalized_name,
        category=skill.category,
    )


def _skill_names(skills: tuple[SkillEvidence, ...]) -> tuple[str, ...]:
    return tuple(skill.skill_name for skill in skills)


def _subject_id(
    freelancer: FreelancerMatchProfile,
    gig: GigMatchProfile,
    subject_type: MatchSubjectType,
) -> str:
    if subject_type == "freelancer":
        return freelancer.freelancer_id
    return gig.gig_id
