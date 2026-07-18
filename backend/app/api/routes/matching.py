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
from app.matching.explanations import (
    build_match_explanation_evidence,
    with_explanation_text,
    with_skill_gap_summary,
)
from app.matching.hybrid import (
    HybridMatchResult,
    rank_freelancers_for_gig_hybrid,
    rank_gigs_for_freelancer_hybrid,
)
from app.matching.keyword import (
    KeywordMatchResult,
    rank_freelancers_for_gig,
    rank_gigs_for_freelancer,
)
from app.matching.semantic import (
    EmbeddingProvider,
    SemanticRankingUnavailableError,
    SentenceTransformerEmbeddingProvider,
)
from app.marketplace.ranking import (
    RankingMetadata,
    RankingMode,
    SemanticStatus,
    SemanticUnavailableReason,
)

router = APIRouter()
RankedResult = HybridMatchResult | KeywordMatchResult


class RankingContext(BaseModel):
    ranking_mode: RankingMode
    semantic_status: SemanticStatus
    semantic_unavailable_reason: SemanticUnavailableReason | None = None


class RecommendedGigItem(BaseModel):
    gig_id: str
    title: str | None
    category: str | None
    status: str | None
    rank: int
    ranking_mode: RankingMode
    ranking_score: float
    semantic_status: SemanticStatus
    semantic_unavailable_reason: SemanticUnavailableReason | None
    hybrid_score: float | None
    keyword_score: float
    semantic_score: float | None
    explanation: dict


class RecommendedFreelancerItem(BaseModel):
    freelancer_id: str
    headline: str | None
    primary_role: str | None
    rank: int
    ranking_mode: RankingMode
    ranking_score: float
    semantic_status: SemanticStatus
    semantic_unavailable_reason: SemanticUnavailableReason | None
    hybrid_score: float | None
    keyword_score: float
    semantic_score: float | None
    explanation: dict


class RecommendedGigsEnvelope(BaseModel):
    ranking_context: RankingContext
    items: list[RecommendedGigItem]
    count: int
    limit: int


class RecommendedFreelancersEnvelope(BaseModel):
    ranking_context: RankingContext
    items: list[RecommendedFreelancerItem]
    count: int
    limit: int


def get_auth_verifier() -> AuthVerifier:
    return SupabaseAuthVerifier()


def get_matching_repository() -> MatchingRepository:
    return SupabaseMatchingRepository()


def get_embedding_provider() -> EmbeddingProvider:
    if not settings.embedding_model_name:
        raise SemanticRankingUnavailableError(
            SemanticUnavailableReason.EMBEDDING_PROVIDER_NOT_CONFIGURED
        )
    return SentenceTransformerEmbeddingProvider(settings.embedding_model_name)


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
    except _MATCHING_ERROR_TYPES as error:
        raise _matching_http_exception(error) from error

    context, ranked_results = _rank_gigs_with_fallback(
        data.freelancer,
        list(data.candidate_gigs),
        embedding_provider_factory,
    )
    gigs_by_id = {gig.gig_id: gig for gig in data.candidate_gigs}
    items = [
        _serialize_gig_result(result, data.freelancer, gigs_by_id[result.candidate_id], context)
        for result in ranked_results[:limit]
        if result.candidate_id in gigs_by_id
    ]
    return RecommendedGigsEnvelope(ranking_context=context, items=items, count=len(items), limit=limit)


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
    except _MATCHING_ERROR_TYPES as error:
        raise _matching_http_exception(error) from error

    context, ranked_results = _rank_freelancers_with_fallback(
        data.gig,
        list(data.candidate_freelancers),
        embedding_provider_factory,
    )
    freelancers_by_id = {freelancer.freelancer_id: freelancer for freelancer in data.candidate_freelancers}
    items = [
        _serialize_freelancer_result(result, freelancers_by_id[result.candidate_id], data.gig, context)
        for result in ranked_results[:limit]
        if result.candidate_id in freelancers_by_id
    ]
    return RecommendedFreelancersEnvelope(ranking_context=context, items=items, count=len(items), limit=limit)


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


def _rank_gigs_with_fallback(
    freelancer: FreelancerMatchProfile,
    gigs: list[GigMatchProfile],
    provider_factory: Callable[[], EmbeddingProvider],
) -> tuple[RankingContext, list[RankedResult]]:
    try:
        provider = provider_factory()
        ranked: list[RankedResult] = rank_gigs_for_freelancer_hybrid(freelancer, gigs, provider)
    except SemanticRankingUnavailableError as error:
        ranked = list(rank_gigs_for_freelancer(freelancer, gigs))
        return _fallback_context(error.reason), ranked
    return _hybrid_context(), ranked


def _rank_freelancers_with_fallback(
    gig: GigMatchProfile,
    freelancers: list[FreelancerMatchProfile],
    provider_factory: Callable[[], EmbeddingProvider],
) -> tuple[RankingContext, list[RankedResult]]:
    try:
        provider = provider_factory()
        ranked: list[RankedResult] = rank_freelancers_for_gig_hybrid(gig, freelancers, provider)
    except SemanticRankingUnavailableError as error:
        ranked = list(rank_freelancers_for_gig(gig, freelancers))
        return _fallback_context(error.reason), ranked
    return _hybrid_context(), ranked


def _hybrid_context() -> RankingContext:
    return RankingContext(
        ranking_mode=RankingMode.HYBRID,
        semantic_status=SemanticStatus.AVAILABLE,
    )


def _fallback_context(reason: SemanticUnavailableReason) -> RankingContext:
    return RankingContext(
        ranking_mode=RankingMode.KEYWORD_FALLBACK,
        semantic_status=SemanticStatus.UNAVAILABLE,
        semantic_unavailable_reason=reason,
    )


def _metadata(result: RankedResult, context: RankingContext) -> RankingMetadata:
    if isinstance(result, HybridMatchResult):
        return RankingMetadata(
            ranking_mode=RankingMode.HYBRID,
            semantic_status=SemanticStatus.AVAILABLE,
            ranking_score=result.hybrid_score,
            keyword_score=result.keyword_score,
            semantic_score=result.semantic_score,
            hybrid_score=result.hybrid_score,
        )
    return RankingMetadata(
        ranking_mode=RankingMode.KEYWORD_FALLBACK,
        semantic_status=SemanticStatus.UNAVAILABLE,
        semantic_unavailable_reason=context.semantic_unavailable_reason,
        ranking_score=result.keyword_score,
        keyword_score=result.keyword_score,
    )


def _serialize_gig_result(
    result: RankedResult,
    freelancer: FreelancerMatchProfile,
    gig: GigMatchProfile,
    context: RankingContext,
) -> RecommendedGigItem:
    metadata = _metadata(result, context)
    return RecommendedGigItem(
        gig_id=gig.gig_id,
        title=gig.title,
        category=gig.category,
        status=gig.status,
        rank=result.rank,
        ranking_mode=metadata.ranking_mode,
        ranking_score=metadata.ranking_score,
        semantic_status=metadata.semantic_status,
        semantic_unavailable_reason=metadata.semantic_unavailable_reason,
        hybrid_score=metadata.hybrid_score,
        keyword_score=metadata.keyword_score or 0.0,
        semantic_score=metadata.semantic_score,
        explanation=_serialize_explanation(freelancer, gig, result, "freelancer"),
    )


def _serialize_freelancer_result(
    result: RankedResult,
    freelancer: FreelancerMatchProfile,
    gig: GigMatchProfile,
    context: RankingContext,
) -> RecommendedFreelancerItem:
    metadata = _metadata(result, context)
    return RecommendedFreelancerItem(
        freelancer_id=freelancer.freelancer_id,
        headline=freelancer.headline,
        primary_role=freelancer.primary_role,
        rank=result.rank,
        ranking_mode=metadata.ranking_mode,
        ranking_score=metadata.ranking_score,
        semantic_status=metadata.semantic_status,
        semantic_unavailable_reason=metadata.semantic_unavailable_reason,
        hybrid_score=metadata.hybrid_score,
        keyword_score=metadata.keyword_score or 0.0,
        semantic_score=metadata.semantic_score,
        explanation=_serialize_explanation(freelancer, gig, result, "gig"),
    )


def _serialize_explanation(
    freelancer: FreelancerMatchProfile,
    gig: GigMatchProfile,
    result: RankedResult,
    subject_type: Literal["freelancer", "gig"],
) -> dict:
    explanation = build_match_explanation_evidence(
        freelancer=freelancer,
        gig=gig,
        result=result,
        subject_type=subject_type,
    )
    explanation = with_skill_gap_summary(explanation)
    explanation = with_explanation_text(explanation)
    return {
        "summary": explanation.summary,
        "subject_id": explanation.subject_id,
        "subject_type": explanation.subject_type,
        "candidate_id": explanation.candidate_id,
        "candidate_type": explanation.candidate_type,
        "rank": explanation.rank,
        "reasons": [
            {
                "code": reason.code.value,
                "skill_names": list(reason.skill_names),
                "score_name": reason.score_name,
                "score_value": reason.score_value,
            }
            for reason in explanation.reasons
        ],
        "score": {
            "hybrid_score": explanation.score.hybrid_score,
            "keyword_score": explanation.score.keyword_score,
            "semantic_score": explanation.score.semantic_score,
            "keyword_weight": explanation.score.keyword_weight,
            "semantic_weight": explanation.score.semantic_weight,
            "required_skill_coverage": explanation.score.required_skill_coverage,
            "preferred_skill_coverage": explanation.score.preferred_skill_coverage,
            "category_alignment": explanation.score.category_alignment,
            "missing_required_skill_penalty": explanation.score.missing_required_skill_penalty,
        },
        "skill_gap": {
            "severity": explanation.skill_gap.severity.value,
            "matched_required_skills": _serialize_skill_evidence(explanation.skill_gap.matched_required_skills),
            "matched_preferred_skills": _serialize_skill_evidence(explanation.skill_gap.matched_preferred_skills),
            "missing_required_skills": _serialize_skill_evidence(explanation.skill_gap.missing_required_skills),
            "missing_preferred_skills": _serialize_skill_evidence(explanation.skill_gap.missing_preferred_skills),
            "focus_skills": _serialize_skill_evidence(explanation.skill_gap.focus_skills),
        },
    }


def _serialize_skill_evidence(skills) -> list[dict]:
    return [
        {
            "skill_name": skill.skill_name,
            "normalized_name": skill.normalized_name,
            "category": skill.category,
        }
        for skill in skills
    ]
