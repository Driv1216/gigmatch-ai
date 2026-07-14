"""Honest ranking-mode and semantic-fallback metadata contracts."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from app.marketplace.common import require_enum_member
from app.marketplace.errors import ContractValidationError


class RankingMode(str, Enum):
    HYBRID = "hybrid"
    SEMANTIC = "semantic"
    KEYWORD = "keyword"
    KEYWORD_FALLBACK = "keyword_fallback"


class SemanticStatus(str, Enum):
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    NOT_REQUESTED = "not_requested"


class SemanticUnavailableReason(str, Enum):
    EMBEDDING_PROVIDER_NOT_CONFIGURED = "embedding_provider_not_configured"
    EMBEDDING_PROVIDER_UNAVAILABLE = "embedding_provider_unavailable"
    EMBEDDING_GENERATION_FAILED = "embedding_generation_failed"
    INVALID_EMBEDDING_OUTPUT = "invalid_embedding_output"


class ApplicantSort(str, Enum):
    BEST_MATCH = "best_match"
    NEWEST = "newest"


class ApplicantView(str, Enum):
    ALL = "all"
    INTERNAL_SHORTLIST = "internal_shortlist"
    ADVANCED = "advanced"


@dataclass(frozen=True)
class RankingMetadata:
    ranking_mode: RankingMode
    semantic_status: SemanticStatus
    ranking_score: float
    keyword_score: float | None = None
    semantic_score: float | None = None
    hybrid_score: float | None = None
    semantic_unavailable_reason: SemanticUnavailableReason | None = None

    def __post_init__(self) -> None:
        require_enum_member(self.ranking_mode, RankingMode, "ranking mode")
        require_enum_member(self.semantic_status, SemanticStatus, "semantic status")
        if self.semantic_unavailable_reason is not None:
            require_enum_member(
                self.semantic_unavailable_reason,
                SemanticUnavailableReason,
                "semantic unavailable reason",
            )
        for label, score in (
            ("ranking_score", self.ranking_score),
            ("keyword_score", self.keyword_score),
            ("semantic_score", self.semantic_score),
            ("hybrid_score", self.hybrid_score),
        ):
            if score is not None and (isinstance(score, bool) or not isinstance(score, (int, float)) or not 0 <= score <= 1):
                raise ContractValidationError(f"{label} must be a score between 0 and 1.")

        if self.semantic_status is SemanticStatus.UNAVAILABLE:
            if self.semantic_unavailable_reason is None:
                raise ContractValidationError("Unavailable semantic status requires a safe reason code.")
        elif self.semantic_unavailable_reason is not None:
            raise ContractValidationError("Semantic unavailable reason requires unavailable semantic status.")

        if self.ranking_mode is RankingMode.HYBRID:
            if self.semantic_status is not SemanticStatus.AVAILABLE:
                raise ContractValidationError("Hybrid ranking requires available semantic scoring.")
            if self.keyword_score is None or self.semantic_score is None or self.hybrid_score is None:
                raise ContractValidationError("Hybrid ranking requires keyword, semantic, and hybrid scores.")
            if self.ranking_score != self.hybrid_score:
                raise ContractValidationError("Hybrid ranking score must equal the hybrid score.")
        elif self.ranking_mode is RankingMode.SEMANTIC:
            if self.semantic_status is not SemanticStatus.AVAILABLE or self.semantic_score is None:
                raise ContractValidationError("Semantic ranking requires an available semantic score.")
            if self.hybrid_score is not None:
                raise ContractValidationError("Semantic ranking cannot claim an uncalculated hybrid score.")
            if self.ranking_score != self.semantic_score:
                raise ContractValidationError("Semantic ranking score must equal the semantic score.")
        elif self.ranking_mode is RankingMode.KEYWORD:
            if self.keyword_score is None:
                raise ContractValidationError("Keyword ranking requires a keyword score.")
            if self.semantic_score is not None or self.hybrid_score is not None:
                raise ContractValidationError("Keyword ranking cannot include semantic or hybrid scores.")
            if self.ranking_score != self.keyword_score:
                raise ContractValidationError("Keyword ranking score must equal the keyword score.")
        elif self.ranking_mode is RankingMode.KEYWORD_FALLBACK:
            if self.semantic_status is not SemanticStatus.UNAVAILABLE:
                raise ContractValidationError("Keyword fallback requires unavailable semantic status.")
            if self.keyword_score is None or self.ranking_score != self.keyword_score:
                raise ContractValidationError("Keyword fallback ranking score must equal the keyword score.")
            if self.semantic_score is not None or self.hybrid_score is not None:
                raise ContractValidationError("Keyword fallback cannot include semantic or hybrid scores.")


@dataclass(frozen=True)
class ApplicantListQuery:
    """Sorting and filtering remain separate choices."""

    sort: ApplicantSort = ApplicantSort.BEST_MATCH
    view: ApplicantView = ApplicantView.ALL

    def __post_init__(self) -> None:
        require_enum_member(self.sort, ApplicantSort, "applicant sort")
        require_enum_member(self.view, ApplicantView, "applicant view")
