"""Deterministic keyword baseline scoring for normalized matching profiles."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from app.matching.contracts import FreelancerMatchProfile, GigMatchProfile, NormalizedSkill
from app.parsing.text_normalizer import normalize_lookup_term

REQUIRED_SKILL_WEIGHT = 0.70
PREFERRED_SKILL_WEIGHT = 0.20
CATEGORY_ALIGNMENT_WEIGHT = 0.10
MISSING_REQUIRED_SKILL_PENALTY = 0.03
MAX_MISSING_REQUIRED_SKILL_PENALTY = 0.10


@dataclass(frozen=True)
class KeywordScoreBreakdown:
    """Internal keyword-score components for one freelancer/gig pair."""

    keyword_score: float
    required_skill_coverage: float
    preferred_skill_coverage: float
    category_alignment: float
    missing_required_skill_penalty: float
    matched_required_skills: tuple[str, ...]
    missing_required_skills: tuple[str, ...]
    matched_preferred_skills: tuple[str, ...]


@dataclass(frozen=True)
class KeywordMatchResult:
    """Ranked internal keyword-baseline result for one candidate."""

    candidate_id: str
    candidate_type: Literal["gig", "freelancer"]
    keyword_score: float
    rank: int
    required_skill_coverage: float
    preferred_skill_coverage: float
    category_alignment: float
    missing_required_skill_penalty: float
    missing_required_skills: tuple[str, ...]
    matched_required_skills: tuple[str, ...]
    matched_preferred_skills: tuple[str, ...]
    gig_status: str | None


def score_keyword_match(
    freelancer: FreelancerMatchProfile,
    gig: GigMatchProfile,
) -> KeywordScoreBreakdown:
    """Score one freelancer against one gig using normalized skill overlap only."""

    freelancer_skill_names = {skill.normalized_name for skill in freelancer.skills}

    matched_required_skills, missing_required_skills = _match_required_skills(
        gig.required_skills,
        freelancer_skill_names,
    )
    matched_preferred_skills = _match_skills(gig.preferred_skills, freelancer_skill_names)

    required_skill_coverage = _coverage(len(matched_required_skills), len(gig.required_skills))
    preferred_skill_coverage = _coverage(len(matched_preferred_skills), len(gig.preferred_skills))
    category_alignment = _category_alignment(freelancer, gig)
    missing_required_skill_penalty = min(
        MAX_MISSING_REQUIRED_SKILL_PENALTY,
        MISSING_REQUIRED_SKILL_PENALTY * len(missing_required_skills),
    )

    keyword_score = _clamp_score(
        (REQUIRED_SKILL_WEIGHT * required_skill_coverage)
        + (PREFERRED_SKILL_WEIGHT * preferred_skill_coverage)
        + (CATEGORY_ALIGNMENT_WEIGHT * category_alignment)
        - missing_required_skill_penalty
    )

    return KeywordScoreBreakdown(
        keyword_score=keyword_score,
        required_skill_coverage=required_skill_coverage,
        preferred_skill_coverage=preferred_skill_coverage,
        category_alignment=category_alignment,
        missing_required_skill_penalty=missing_required_skill_penalty,
        matched_required_skills=matched_required_skills,
        missing_required_skills=missing_required_skills,
        matched_preferred_skills=matched_preferred_skills,
    )


def rank_gigs_for_freelancer(
    freelancer: FreelancerMatchProfile,
    gigs: list[GigMatchProfile],
) -> list[KeywordMatchResult]:
    """Rank gig candidates for a freelancer without filtering by gig status."""

    results = [
        _result_from_breakdown(
            candidate_id=gig.gig_id,
            candidate_type="gig",
            breakdown=score_keyword_match(freelancer, gig),
            gig_status=gig.status,
        )
        for gig in gigs
    ]
    return _rank_results(results)


def rank_freelancers_for_gig(
    gig: GigMatchProfile,
    freelancers: list[FreelancerMatchProfile],
) -> list[KeywordMatchResult]:
    """Rank freelancer candidates for a gig using the same keyword score."""

    results = [
        _result_from_breakdown(
            candidate_id=freelancer.freelancer_id,
            candidate_type="freelancer",
            breakdown=score_keyword_match(freelancer, gig),
            gig_status=gig.status,
        )
        for freelancer in freelancers
    ]
    return _rank_results(results)


def _coverage(matched_count: int, total_count: int) -> float:
    # 4B treats an empty skill requirement as no keyword evidence, not as a
    # perfect match. Later APIs can decide whether such records are eligible.
    if total_count <= 0:
        return 0.0
    return matched_count / total_count


def _match_required_skills(
    required_skills: tuple[NormalizedSkill, ...],
    freelancer_skill_names: set[str],
) -> tuple[tuple[str, ...], tuple[str, ...]]:
    matched: list[str] = []
    missing: list[str] = []

    for skill in required_skills:
        if skill.normalized_name in freelancer_skill_names:
            matched.append(skill.display_name)
        else:
            missing.append(skill.display_name)

    return tuple(matched), tuple(missing)


def _match_skills(
    candidate_skills: tuple[NormalizedSkill, ...],
    freelancer_skill_names: set[str],
) -> tuple[str, ...]:
    return tuple(
        skill.display_name for skill in candidate_skills if skill.normalized_name in freelancer_skill_names
    )


def _category_alignment(freelancer: FreelancerMatchProfile, gig: GigMatchProfile) -> float:
    gig_category = normalize_lookup_term(gig.category or "")
    if not gig_category:
        return 0.0

    freelancer_categories = {normalize_lookup_term(category) for category in freelancer.categories}
    return 1.0 if gig_category in freelancer_categories else 0.0


def _clamp_score(score: float) -> float:
    return min(1.0, max(0.0, score))


def _result_from_breakdown(
    *,
    candidate_id: str,
    candidate_type: Literal["gig", "freelancer"],
    breakdown: KeywordScoreBreakdown,
    gig_status: str | None,
) -> KeywordMatchResult:
    return KeywordMatchResult(
        candidate_id=candidate_id,
        candidate_type=candidate_type,
        keyword_score=breakdown.keyword_score,
        rank=0,
        required_skill_coverage=breakdown.required_skill_coverage,
        preferred_skill_coverage=breakdown.preferred_skill_coverage,
        category_alignment=breakdown.category_alignment,
        missing_required_skill_penalty=breakdown.missing_required_skill_penalty,
        missing_required_skills=breakdown.missing_required_skills,
        matched_required_skills=breakdown.matched_required_skills,
        matched_preferred_skills=breakdown.matched_preferred_skills,
        gig_status=gig_status,
    )


def _rank_results(results: list[KeywordMatchResult]) -> list[KeywordMatchResult]:
    ranked = sorted(
        results,
        key=lambda result: (
            -result.keyword_score,
            -result.required_skill_coverage,
            -result.preferred_skill_coverage,
            result.candidate_id,
        ),
    )

    return [
        KeywordMatchResult(
            candidate_id=result.candidate_id,
            candidate_type=result.candidate_type,
            keyword_score=result.keyword_score,
            rank=index,
            required_skill_coverage=result.required_skill_coverage,
            preferred_skill_coverage=result.preferred_skill_coverage,
            category_alignment=result.category_alignment,
            missing_required_skill_penalty=result.missing_required_skill_penalty,
            missing_required_skills=result.missing_required_skills,
            matched_required_skills=result.matched_required_skills,
            matched_preferred_skills=result.matched_preferred_skills,
            gig_status=result.gig_status,
        )
        for index, result in enumerate(ranked, start=1)
    ]
