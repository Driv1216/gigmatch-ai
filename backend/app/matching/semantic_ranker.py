"""Runtime semantic similarity scoring over normalized matching profiles."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
import math
from typing import Literal

from app.matching.contracts import FreelancerMatchProfile, GigMatchProfile
from app.matching.semantic import (
    EmbeddingProvider,
    InvalidEmbeddingOutputError,
    SemanticRankingUnavailableError,
    build_freelancer_embedding_text,
    build_gig_embedding_text,
    cosine_similarity,
)
from app.marketplace.ranking import SemanticUnavailableReason


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


class SemanticRankingDirection(str, Enum):
    """Which entity is the active query for provider input preparation."""

    FREELANCER_TO_GIGS = "freelancer_to_gigs"
    GIG_TO_FREELANCERS = "gig_to_freelancers"


def score_semantic_match(
    freelancer: FreelancerMatchProfile,
    gig: GigMatchProfile,
    provider: EmbeddingProvider,
    direction: SemanticRankingDirection = SemanticRankingDirection.FREELANCER_TO_GIGS,
) -> SemanticScoreBreakdown:
    """Score one freelancer/gig pair with direction-aware provider preparation."""

    freelancer_embedding_text = build_freelancer_embedding_text(freelancer)
    gig_embedding_text = build_gig_embedding_text(gig)
    if direction is SemanticRankingDirection.FREELANCER_TO_GIGS:
        query_text, candidate_text = freelancer_embedding_text, gig_embedding_text
    else:
        query_text, candidate_text = gig_embedding_text, freelancer_embedding_text
    vectors = _encode_prepared_batch(provider, query_text, [candidate_text])
    return _breakdown_from_vectors(
        freelancer_embedding_text=freelancer_embedding_text,
        gig_embedding_text=gig_embedding_text,
        freelancer_vector=vectors[0] if direction is SemanticRankingDirection.FREELANCER_TO_GIGS else vectors[1],
        gig_vector=vectors[1] if direction is SemanticRankingDirection.FREELANCER_TO_GIGS else vectors[0],
        provider=provider,
    )


def rank_gigs_for_freelancer_semantic(
    freelancer: FreelancerMatchProfile,
    gigs: list[GigMatchProfile],
    provider: EmbeddingProvider,
) -> list[SemanticMatchResult]:
    """Rank gig candidates for a freelancer without filtering by gig status."""

    if not gigs:
        return []
    freelancer_text = build_freelancer_embedding_text(freelancer)
    gig_texts = [build_gig_embedding_text(gig) for gig in gigs]
    vectors = _encode_prepared_batch(provider, freelancer_text, gig_texts)
    results = []
    for index, gig in enumerate(gigs, start=1):
        breakdown = _breakdown_from_vectors(
            freelancer_embedding_text=freelancer_text,
            gig_embedding_text=gig_texts[index - 1],
            freelancer_vector=vectors[0],
            gig_vector=vectors[index],
            provider=provider,
        )
        results.append(
            _result_from_breakdown(
                candidate_id=gig.gig_id,
                candidate_type="gig",
                breakdown=breakdown,
                gig_status=gig.status,
            )
        )
    return _rank_results(results)


def rank_freelancers_for_gig_semantic(
    gig: GigMatchProfile,
    freelancers: list[FreelancerMatchProfile],
    provider: EmbeddingProvider,
) -> list[SemanticMatchResult]:
    """Rank freelancer candidates for a gig using the same semantic score."""

    if not freelancers:
        return []
    gig_text = build_gig_embedding_text(gig)
    freelancer_texts = [build_freelancer_embedding_text(freelancer) for freelancer in freelancers]
    vectors = _encode_prepared_batch(provider, gig_text, freelancer_texts)
    results = []
    for index, freelancer in enumerate(freelancers, start=1):
        breakdown = _breakdown_from_vectors(
            freelancer_embedding_text=freelancer_texts[index - 1],
            gig_embedding_text=gig_text,
            freelancer_vector=vectors[index],
            gig_vector=vectors[0],
            provider=provider,
        )
        results.append(
            _result_from_breakdown(
                candidate_id=freelancer.freelancer_id,
                candidate_type="freelancer",
                breakdown=breakdown,
                gig_status=gig.status,
            )
        )
    return _rank_results(results)


def _normalize_cosine(raw_cosine_similarity: float) -> float:
    return min(1.0, max(0.0, (raw_cosine_similarity + 1.0) / 2.0))


def _validate_vector(vector: list[float], label: str) -> list[float]:
    if not isinstance(vector, list):
        raise InvalidEmbeddingOutputError(
            SemanticUnavailableReason.INVALID_EMBEDDING_OUTPUT,
            f"{label} embedding vector must be a list of numbers.",
        )
    if not vector:
        raise InvalidEmbeddingOutputError(
            SemanticUnavailableReason.INVALID_EMBEDDING_OUTPUT,
            f"{label} embedding vector must not be empty.",
        )

    validated: list[float] = []
    for value in vector:
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise InvalidEmbeddingOutputError(
                SemanticUnavailableReason.INVALID_EMBEDDING_OUTPUT,
                f"{label} embedding vector must contain only numbers.",
            )
        numeric = float(value)
        if not math.isfinite(numeric):
            raise InvalidEmbeddingOutputError(
                SemanticUnavailableReason.INVALID_EMBEDDING_OUTPUT,
                f"{label} embedding vector must contain only finite numbers.",
            )
        validated.append(numeric)

    return validated


def _encode_prepared_batch(
    provider: EmbeddingProvider,
    query_text: str,
    candidate_texts: list[str],
) -> list[list[float]]:
    prepared = [_prepare_text(provider, query_text, is_query=True)] + [
        _prepare_text(provider, text, is_query=False) for text in candidate_texts
    ]
    try:
        vectors = provider.encode_batch(prepared)
    except SemanticRankingUnavailableError:
        raise
    except (OSError, RuntimeError, TimeoutError) as error:
        raise SemanticRankingUnavailableError(
            SemanticUnavailableReason.EMBEDDING_GENERATION_FAILED
        ) from error
    except (TypeError, ValueError) as error:
        raise InvalidEmbeddingOutputError(
            SemanticUnavailableReason.INVALID_EMBEDDING_OUTPUT
        ) from error

    if not isinstance(vectors, list) or len(vectors) != len(prepared):
        raise InvalidEmbeddingOutputError(
            SemanticUnavailableReason.INVALID_EMBEDDING_OUTPUT,
            f"Embedding batch returned {len(vectors) if isinstance(vectors, list) else 'invalid'} vectors for {len(prepared)} texts.",
        )
    validated = [_validate_vector(vector, f"batch[{index}]") for index, vector in enumerate(vectors)]
    dimensions = {len(vector) for vector in validated}
    if len(dimensions) != 1:
        raise InvalidEmbeddingOutputError(
            SemanticUnavailableReason.INVALID_EMBEDDING_OUTPUT,
            "Vectors must have the same dimension for cosine similarity.",
        )
    return validated


def _prepare_text(provider: EmbeddingProvider, text: str, *, is_query: bool) -> str:
    method_name = "prepare_query_text" if is_query else "prepare_candidate_text"
    prepare = getattr(provider, method_name, None)
    return prepare(text) if callable(prepare) else text


def _breakdown_from_vectors(
    *,
    freelancer_embedding_text: str,
    gig_embedding_text: str,
    freelancer_vector: list[float],
    gig_vector: list[float],
    provider: EmbeddingProvider,
) -> SemanticScoreBreakdown:
    raw_cosine_similarity = cosine_similarity(freelancer_vector, gig_vector)
    return SemanticScoreBreakdown(
        raw_cosine_similarity=raw_cosine_similarity,
        semantic_score=_normalize_cosine(raw_cosine_similarity),
        freelancer_embedding_text=freelancer_embedding_text,
        gig_embedding_text=gig_embedding_text,
        vector_dimension=len(freelancer_vector),
        provider_name=_provider_name(provider),
    )


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
