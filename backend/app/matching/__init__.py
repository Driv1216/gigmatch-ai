"""Internal matching contracts, builders, and scoring/preparation utilities."""

from app.matching.builders import build_freelancer_match_profile, build_gig_match_profile
from app.matching.contracts import FreelancerMatchProfile, GigMatchProfile, NormalizedSkill
from app.matching.hybrid import (
    HybridMatchResult,
    HybridRankingConfig,
    HybridScoreBreakdown,
    combine_hybrid_score,
    rank_freelancers_for_gig_hybrid,
    rank_gigs_for_freelancer_hybrid,
    score_hybrid_match,
)
from app.matching.keyword import (
    KeywordMatchResult,
    KeywordScoreBreakdown,
    rank_freelancers_for_gig,
    rank_gigs_for_freelancer,
    score_keyword_match,
)
from app.matching.semantic import (
    DeterministicFakeEmbeddingProvider,
    EmbeddingProvider,
    SentenceTransformerEmbeddingProvider,
    build_freelancer_embedding_text,
    build_gig_embedding_text,
    cosine_similarity,
)
from app.matching.semantic_ranker import (
    SemanticMatchResult,
    SemanticScoreBreakdown,
    rank_freelancers_for_gig_semantic,
    rank_gigs_for_freelancer_semantic,
    score_semantic_match,
)

__all__ = [
    "FreelancerMatchProfile",
    "GigMatchProfile",
    "HybridMatchResult",
    "HybridRankingConfig",
    "HybridScoreBreakdown",
    "KeywordMatchResult",
    "KeywordScoreBreakdown",
    "NormalizedSkill",
    "SemanticMatchResult",
    "SemanticScoreBreakdown",
    "DeterministicFakeEmbeddingProvider",
    "EmbeddingProvider",
    "SentenceTransformerEmbeddingProvider",
    "build_freelancer_match_profile",
    "build_freelancer_embedding_text",
    "build_gig_match_profile",
    "build_gig_embedding_text",
    "combine_hybrid_score",
    "cosine_similarity",
    "rank_freelancers_for_gig",
    "rank_freelancers_for_gig_hybrid",
    "rank_freelancers_for_gig_semantic",
    "rank_gigs_for_freelancer",
    "rank_gigs_for_freelancer_hybrid",
    "rank_gigs_for_freelancer_semantic",
    "score_hybrid_match",
    "score_keyword_match",
    "score_semantic_match",
]
