from collections.abc import Callable
from typing import Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Path, Query
from pydantic import BaseModel

from app.config import settings
from app.core.auth import (
    AuthVerifier,
    InvalidTokenError,
    MissingTokenError,
    SupabaseAuthVerifier,
)
from app.matching.contracts import FreelancerMatchProfile, GigMatchProfile
from app.matching.data_access import (
    ForbiddenRoleError,
    MatchingRepository,
    MissingProfileError,
    ResourceNotFoundError,
    ResourceOwnershipError,
    SupabaseMatchingRepository,
    UnsupportedRoleError,
    prepare_client_gig_matching_data,
    prepare_freelancer_matching_data,
)
from app.matching.hybrid import (
    HybridMatchResult,
    rank_freelancers_for_gig_hybrid,
    rank_gigs_for_freelancer_hybrid,
)
from app.matching.semantic import EmbeddingProvider, SentenceTransformerEmbeddingProvider

router = APIRouter()


class RecommendedGigItem(BaseModel):
    gig_id: str
    title: str | None
    category: str | None
    status: str | None
    rank: int
    hybrid_score: float
    keyword_score: float
    semantic_score: float


class RecommendedFreelancerItem(BaseModel):
    freelancer_id: str
    headline: str | None
    primary_role: str | None
    rank: int
    hybrid_score: float
    keyword_score: float
    semantic_score: float


class RecommendedGigsEnvelope(BaseModel):
    items: list[RecommendedGigItem]
    count: int
    limit: int
    ranking_method: Literal["hybrid"]


class RecommendedFreelancersEnvelope(BaseModel):
    items: list[RecommendedFreelancerItem]
    count: int
    limit: int
    ranking_method: Literal["hybrid"]


def get_auth_verifier() -> AuthVerifier:
    return SupabaseAuthVerifier()


def get_matching_repository() -> MatchingRepository:
    return SupabaseMatchingRepository()


def get_embedding_provider() -> EmbeddingProvider:
    if not settings.embedding_model_name:
        raise HTTPException(status_code=503, detail="Matching embedding provider is not configured.")
    try:
        return SentenceTransformerEmbeddingProvider(settings.embedding_model_name)
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


def get_embedding_provider_factory() -> Callable[[], EmbeddingProvider]:
    return get_embedding_provider


@router.get("")
def matching_status() -> dict[str, str]:
    return {"module": "matching", "status": "ready"}


@router.get("/recommended-gigs", response_model=RecommendedGigsEnvelope)
def recommended_gigs(
    limit: int = Query(default=10, ge=1, le=50),
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: MatchingRepository = Depends(get_matching_repository),
    embedding_provider_factory: Callable[[], EmbeddingProvider] = Depends(get_embedding_provider_factory),
) -> RecommendedGigsEnvelope:
    try:
        data = prepare_freelancer_matching_data(authorization, auth_verifier, repository)
        embedding_provider = embedding_provider_factory()
        ranked_results = rank_gigs_for_freelancer_hybrid(
            data.freelancer,
            list(data.candidate_gigs),
            embedding_provider,
        )
    except _MATCHING_ERROR_TYPES as error:
        raise _matching_http_exception(error) from error

    gigs_by_id = {gig.gig_id: gig for gig in data.candidate_gigs}
    items = [
        _serialize_gig_result(result, gigs_by_id[result.candidate_id])
        for result in ranked_results[:limit]
        if result.candidate_id in gigs_by_id
    ]
    return RecommendedGigsEnvelope(items=items, count=len(items), limit=limit, ranking_method="hybrid")


@router.get("/gigs/{gig_id}/recommended-freelancers", response_model=RecommendedFreelancersEnvelope)
def recommended_freelancers_for_gig(
    gig_id: str = Path(..., min_length=1),
    limit: int = Query(default=10, ge=1, le=50),
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: MatchingRepository = Depends(get_matching_repository),
    embedding_provider_factory: Callable[[], EmbeddingProvider] = Depends(get_embedding_provider_factory),
) -> RecommendedFreelancersEnvelope:
    try:
        data = prepare_client_gig_matching_data(authorization, gig_id, auth_verifier, repository)
        embedding_provider = embedding_provider_factory()
        ranked_results = rank_freelancers_for_gig_hybrid(
            data.gig,
            list(data.candidate_freelancers),
            embedding_provider,
        )
    except _MATCHING_ERROR_TYPES as error:
        raise _matching_http_exception(error) from error

    freelancers_by_id = {freelancer.freelancer_id: freelancer for freelancer in data.candidate_freelancers}
    items = [
        _serialize_freelancer_result(result, freelancers_by_id[result.candidate_id])
        for result in ranked_results[:limit]
        if result.candidate_id in freelancers_by_id
    ]
    return RecommendedFreelancersEnvelope(items=items, count=len(items), limit=limit, ranking_method="hybrid")


_MATCHING_ERROR_TYPES = (
    MissingTokenError,
    InvalidTokenError,
    MissingProfileError,
    UnsupportedRoleError,
    ForbiddenRoleError,
    ResourceOwnershipError,
    ResourceNotFoundError,
)


def _matching_http_exception(error: Exception) -> HTTPException:
    if isinstance(error, (MissingTokenError, InvalidTokenError)):
        return HTTPException(status_code=401, detail=str(error))
    if isinstance(error, ResourceNotFoundError):
        return HTTPException(status_code=404, detail=str(error))
    return HTTPException(status_code=403, detail=str(error))


def _serialize_gig_result(result: HybridMatchResult, gig: GigMatchProfile) -> RecommendedGigItem:
    return RecommendedGigItem(
        gig_id=gig.gig_id,
        title=gig.title,
        category=gig.category,
        status=gig.status,
        rank=result.rank,
        hybrid_score=result.hybrid_score,
        keyword_score=result.keyword_score,
        semantic_score=result.semantic_score,
    )


def _serialize_freelancer_result(
    result: HybridMatchResult,
    freelancer: FreelancerMatchProfile,
) -> RecommendedFreelancerItem:
    return RecommendedFreelancerItem(
        freelancer_id=freelancer.freelancer_id,
        headline=freelancer.headline,
        primary_role=freelancer.primary_role,
        rank=result.rank,
        hybrid_score=result.hybrid_score,
        keyword_score=result.keyword_score,
        semantic_score=result.semantic_score,
    )
