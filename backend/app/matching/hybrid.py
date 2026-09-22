"""Pure hybrid ranking over keyword and semantic matching scores."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from app.matching.contracts import FreelancerMatchProfile, GigMatchProfile
from app.matching.keyword import KeywordScoreBreakdown, score_keyword_match
from app.matching.semantic import EmbeddingProvider
from app.matching.semantic_ranker import (
    SemanticMatchResult,
    SemanticRankingDirection,
    SemanticScoreBreakdown,
    rank_freelancers_for_gig_semantic,
    rank_gigs_for_freelancer_semantic,
    score_semantic_match,
)

DEFAULT_KEYWORD_WEIGHT = 0.75
DEFAULT_SEMANTIC_WEIGHT = 0.25


@dataclass(frozen=True)
class HybridRankingConfig:
    """Weights used to combine keyword and semantic scores."""

    keyword_weight: float = DEFAULT_KEYWORD_WEIGHT
    semantic_weight: float = DEFAULT_SEMANTIC_WEIGHT

    def __post_init__(self) -> None:
        if self.keyword_weight < 0.0 or self.semantic_weight < 0.0:
            raise ValueError("Hybrid ranking weights must not be negative.")
        if self.keyword_weight + self.semantic_weight <= 0.0:
            raise ValueError("Hybrid ranking weights must have a positive total.")

    @property
    def normalized_keyword_weight(self) -> float:
        return self.keyword_weight / (self.keyword_weight + self.semantic_weight)

    @property
    def normalized_semantic_weight(self) -> float:
        return self.semantic_weight / (self.keyword_weight + self.semantic_weight)


@dataclass(frozen=True)
class HybridScoreBreakdown:
    """Internal hybrid-score components for one freelancer/gig pair."""

    hybrid_score: float
    keyword_score: float
    semantic_score: float
    keyword_weight: float
    semantic_weight: float
    keyword_breakdown: KeywordScoreBreakdown
    semantic_breakdown: SemanticScoreBreakdown


@dataclass(frozen=True)
class HybridMatchResult:
    """Ranked internal hybrid result for one candidate."""

    candidate_id: str
    candidate_type: Literal["gig", "freelancer"]
    hybrid_score: float
    keyword_score: float
    semantic_score: float
    rank: int
    keyword_weight: float
    semantic_weight: float
    keyword_breakdown: KeywordScoreBreakdown
    semantic_breakdown: SemanticScoreBreakdown
    gig_status: str | None


def score_hybrid_match(
    freelancer: FreelancerMatchProfile,
    gig: GigMatchProfile,
    provider: EmbeddingProvider,
    config: HybridRankingConfig | None = None,
    direction: SemanticRankingDirection = SemanticRankingDirection.FREELANCER_TO_GIGS,
) -> HybridScoreBreakdown:
    """Score one freelancer/gig pair by combining keyword and semantic scores."""

    resolved_config = config or HybridRankingConfig()
    keyword_breakdown = score_keyword_match(freelancer, gig)
    semantic_breakdown = score_semantic_match(freelancer, gig, provider, direction)

    return HybridScoreBreakdown(
        hybrid_score=combine_hybrid_score(
            keyword_breakdown.keyword_score,
            semantic_breakdown.semantic_score,
            resolved_config,
        ),
        keyword_score=keyword_breakdown.keyword_score,
        semantic_score=semantic_breakdown.semantic_score,
        keyword_weight=resolved_config.normalized_keyword_weight,
        semantic_weight=resolved_config.normalized_semantic_weight,
        keyword_breakdown=keyword_breakdown,
        semantic_breakdown=semantic_breakdown,
    )


def rank_gigs_for_freelancer_hybrid(
    freelancer: FreelancerMatchProfile,
    gigs: list[GigMatchProfile],
    provider: EmbeddingProvider,
    config: HybridRankingConfig | None = None,
) -> list[HybridMatchResult]:
    """Rank gig candidates for a freelancer without filtering by gig status."""

    resolved_config = config or HybridRankingConfig()
    semantic_by_id = {
        result.candidate_id: result
        for result in rank_gigs_for_freelancer_semantic(freelancer, gigs, provider)
    }
    results = [
        _result_from_components(
            candidate_id=gig.gig_id,
            candidate_type="gig",
            keyword_breakdown=score_keyword_match(freelancer, gig),
            semantic_result=semantic_by_id[gig.gig_id],
            config=resolved_config,
            gig_status=gig.status,
        )
        for gig in gigs
    ]
    return _rank_results(results)


def rank_freelancers_for_gig_hybrid(
    gig: GigMatchProfile,
    freelancers: list[FreelancerMatchProfile],
    provider: EmbeddingProvider,
    config: HybridRankingConfig | None = None,
) -> list[HybridMatchResult]:
    """Rank freelancer candidates for a gig using the same hybrid score."""

    resolved_config = config or HybridRankingConfig()
    semantic_by_id = {
        result.candidate_id: result
        for result in rank_freelancers_for_gig_semantic(gig, freelancers, provider)
    }
    results = [
        _result_from_components(
            candidate_id=freelancer.freelancer_id,
            candidate_type="freelancer",
            keyword_breakdown=score_keyword_match(freelancer, gig),
            semantic_result=semantic_by_id[freelancer.freelancer_id],
            config=resolved_config,
            gig_status=gig.status,
        )
        for freelancer in freelancers
    ]
    return _rank_results(results)


def combine_hybrid_score(
    keyword_score: float,
    semantic_score: float,
    config: HybridRankingConfig | None = None,
) -> float:
    """Combine normalized keyword and semantic scores into a clamped hybrid score."""

    resolved_config = config or HybridRankingConfig()
    return round(
        _clamp_score(
            (resolved_config.normalized_keyword_weight * keyword_score)
            + (resolved_config.normalized_semantic_weight * semantic_score)
        ),
        12,
    )


def _clamp_score(score: float) -> float:
    return min(1.0, max(0.0, score))


def _result_from_breakdown(
    *,
    candidate_id: str,
    candidate_type: Literal["gig", "freelancer"],
    breakdown: HybridScoreBreakdown,
    gig_status: str | None,
) -> HybridMatchResult:
    return HybridMatchResult(
        candidate_id=candidate_id,
        candidate_type=candidate_type,
        hybrid_score=breakdown.hybrid_score,
        keyword_score=breakdown.keyword_score,
        semantic_score=breakdown.semantic_score,
        rank=0,
        keyword_weight=breakdown.keyword_weight,
        semantic_weight=breakdown.semantic_weight,
        keyword_breakdown=breakdown.keyword_breakdown,
        semantic_breakdown=breakdown.semantic_breakdown,
        gig_status=gig_status,
    )


def _result_from_components(
    *,
    candidate_id: str,
    candidate_type: Literal["gig", "freelancer"],
    keyword_breakdown: KeywordScoreBreakdown,
    semantic_result: SemanticMatchResult,
    config: HybridRankingConfig,
    gig_status: str | None,
) -> HybridMatchResult:
    semantic_breakdown = SemanticScoreBreakdown(
        raw_cosine_similarity=semantic_result.raw_cosine_similarity,
        semantic_score=semantic_result.semantic_score,
        freelancer_embedding_text=semantic_result.freelancer_embedding_text,
        gig_embedding_text=semantic_result.gig_embedding_text,
        vector_dimension=semantic_result.vector_dimension,
        provider_name=semantic_result.provider_name,
    )
    return HybridMatchResult(
        candidate_id=candidate_id,
        candidate_type=candidate_type,
        hybrid_score=combine_hybrid_score(
            keyword_breakdown.keyword_score,
            semantic_result.semantic_score,
            config,
        ),
        keyword_score=keyword_breakdown.keyword_score,
        semantic_score=semantic_result.semantic_score,
        rank=0,
        keyword_weight=config.normalized_keyword_weight,
        semantic_weight=config.normalized_semantic_weight,
        keyword_breakdown=keyword_breakdown,
        semantic_breakdown=semantic_breakdown,
        gig_status=gig_status,
    )


def _rank_results(results: list[HybridMatchResult]) -> list[HybridMatchResult]:
    ranked = sorted(
        results,
        key=lambda result: (
            -result.hybrid_score,
            -result.keyword_score,
            -result.semantic_score,
            result.candidate_id,
        ),
    )

    return [
        HybridMatchResult(
            candidate_id=result.candidate_id,
            candidate_type=result.candidate_type,
            hybrid_score=result.hybrid_score,
            keyword_score=result.keyword_score,
            semantic_score=result.semantic_score,
            rank=index,
            keyword_weight=result.keyword_weight,
            semantic_weight=result.semantic_weight,
            keyword_breakdown=result.keyword_breakdown,
            semantic_breakdown=result.semantic_breakdown,
            gig_status=result.gig_status,
        )
        for index, result in enumerate(ranked, start=1)
    ]
