"""Runtime semantic similarity scoring over normalized matching profiles."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from app.matching.contracts import FreelancerMatchProfile, GigMatchProfile
from app.matching.semantic import (
    EmbeddingProvider,
    build_freelancer_embedding_text,
    build_gig_embedding_text,
    cosine_similarity,
)


@dataclass(frozen=True)
class SemanticScoreBreakdown:
    """Internal semantic-score components for one freelancer/gig pair."""

    raw_cosine_similarity: float
    semantic_score: float
    freelancer_embedding_text: str
    gig_embedding_text: str
    vector_dimension: int
    provider_name: str


@dataclass(frozen=True)
class SemanticMatchResult:
    """Ranked internal semantic result for one candidate."""

    candidate_id: str
    candidate_type: Literal["gig", "freelancer"]
    semantic_score: float
    raw_cosine_similarity: float
    rank: int
    freelancer_embedding_text: str
    gig_embedding_text: str
    vector_dimension: int
    provider_name: str
    gig_status: str | None


def score_semantic_match(
    freelancer: FreelancerMatchProfile,
    gig: GigMatchProfile,
    provider: EmbeddingProvider,
) -> SemanticScoreBreakdown:
    """Score one freelancer/gig pair using provider embeddings and raw cosine."""

    freelancer_embedding_text = build_freelancer_embedding_text(freelancer)
    gig_embedding_text = build_gig_embedding_text(gig)
    freelancer_vector = _validate_vector(provider.encode(freelancer_embedding_text), "freelancer")
    gig_vector = _validate_vector(provider.encode(gig_embedding_text), "gig")
    raw_cosine_similarity = cosine_similarity(freelancer_vector, gig_vector)

    return SemanticScoreBreakdown(
        raw_cosine_similarity=raw_cosine_similarity,
        semantic_score=_normalize_cosine(raw_cosine_similarity),
        freelancer_embedding_text=freelancer_embedding_text,
        gig_embedding_text=gig_embedding_text,
        vector_dimension=len(freelancer_vector),
        provider_name=_provider_name(provider),
    )


def rank_gigs_for_freelancer_semantic(
    freelancer: FreelancerMatchProfile,
    gigs: list[GigMatchProfile],
    provider: EmbeddingProvider,
) -> list[SemanticMatchResult]:
    """Rank gig candidates for a freelancer without filtering by gig status."""

    results = [
        _result_from_breakdown(
            candidate_id=gig.gig_id,
            candidate_type="gig",
            breakdown=score_semantic_match(freelancer, gig, provider),
            gig_status=gig.status,
        )
        for gig in gigs
    ]
    return _rank_results(results)


def rank_freelancers_for_gig_semantic(
    gig: GigMatchProfile,
    freelancers: list[FreelancerMatchProfile],
    provider: EmbeddingProvider,
) -> list[SemanticMatchResult]:
    """Rank freelancer candidates for a gig using the same semantic score."""

    results = [
        _result_from_breakdown(
            candidate_id=freelancer.freelancer_id,
            candidate_type="freelancer",
            breakdown=score_semantic_match(freelancer, gig, provider),
            gig_status=gig.status,
        )
        for freelancer in freelancers
    ]
    return _rank_results(results)


def _normalize_cosine(raw_cosine_similarity: float) -> float:
    return min(1.0, max(0.0, (raw_cosine_similarity + 1.0) / 2.0))


def _validate_vector(vector: list[float], label: str) -> list[float]:
    if not isinstance(vector, list):
        raise ValueError(f"{label} embedding vector must be a list of numbers.")
    if not vector:
        raise ValueError(f"{label} embedding vector must not be empty.")

    validated: list[float] = []
    for value in vector:
        if not isinstance(value, (int, float)):
            raise ValueError(f"{label} embedding vector must contain only numbers.")
        validated.append(float(value))

    return validated


def _provider_name(provider: EmbeddingProvider) -> str:
    model_name = getattr(provider, "model_name", None)
    if isinstance(model_name, str) and model_name:
        return f"{provider.__class__.__name__}:{model_name}"
    return provider.__class__.__name__


def _result_from_breakdown(
    *,
    candidate_id: str,
    candidate_type: Literal["gig", "freelancer"],
    breakdown: SemanticScoreBreakdown,
    gig_status: str | None,
) -> SemanticMatchResult:
    return SemanticMatchResult(
        candidate_id=candidate_id,
        candidate_type=candidate_type,
        semantic_score=breakdown.semantic_score,
        raw_cosine_similarity=breakdown.raw_cosine_similarity,
        rank=0,
        freelancer_embedding_text=breakdown.freelancer_embedding_text,
        gig_embedding_text=breakdown.gig_embedding_text,
        vector_dimension=breakdown.vector_dimension,
        provider_name=breakdown.provider_name,
        gig_status=gig_status,
    )


def _rank_results(results: list[SemanticMatchResult]) -> list[SemanticMatchResult]:
    ranked = sorted(
        results,
        key=lambda result: (
            -result.semantic_score,
            -result.raw_cosine_similarity,
            result.candidate_id,
        ),
    )

    return [
        SemanticMatchResult(
            candidate_id=result.candidate_id,
            candidate_type=result.candidate_type,
            semantic_score=result.semantic_score,
            raw_cosine_similarity=result.raw_cosine_similarity,
            rank=index,
            freelancer_embedding_text=result.freelancer_embedding_text,
            gig_embedding_text=result.gig_embedding_text,
            vector_dimension=result.vector_dimension,
            provider_name=result.provider_name,
            gig_status=result.gig_status,
        )
        for index, result in enumerate(ranked, start=1)
    ]
