"""Stable internal matching contracts for normalized entities and explanations."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Literal


@dataclass(frozen=True)
class NormalizedSkill:
    """A skill with a display value, comparison value, and source lineage."""

    display_name: str
    normalized_name: str
    category: str | None
    sources: tuple[str, ...]


@dataclass(frozen=True)
class FreelancerMatchProfile:
    """Normalized freelancer data used by later matching milestones."""

    freelancer_id: str
    display_name: str | None
    headline: str | None
    bio: str | None
    primary_role: str | None
    experience_level: str | None
    categories: tuple[str, ...]
    skills: tuple[NormalizedSkill, ...]
    tools: tuple[str, ...]
    project_domain_text: tuple[str, ...]
    source_metadata: dict[str, tuple[str, ...]]


@dataclass(frozen=True)
class GigMatchProfile:
    """Normalized gig data used by later matching milestones."""

    gig_id: str
    client_id: str | None
    title: str | None
    description: str | None
    category: str | None
    required_skills: tuple[NormalizedSkill, ...]
    preferred_skills: tuple[NormalizedSkill, ...]
    combined_skills: tuple[NormalizedSkill, ...]
    difficulty_level: str | None
    seniority_needed: str | None
    deliverables: tuple[str, ...]
    status: str | None
    source_metadata: dict[str, tuple[str, ...]]


class ExplanationReasonCode(str, Enum):
    """Deterministic, evidence-backed reason codes for future explanations."""

    REQUIRED_SKILL_MATCH = "required_skill_match"
    PREFERRED_SKILL_MATCH = "preferred_skill_match"
    MISSING_REQUIRED_SKILL = "missing_required_skill"
    MISSING_PREFERRED_SKILL = "missing_preferred_skill"
    HIGH_SEMANTIC_SIMILARITY = "high_semantic_similarity"
    LOW_SEMANTIC_SIMILARITY = "low_semantic_similarity"
    CATEGORY_ALIGNMENT = "category_alignment"
    SENIORITY_ALIGNMENT = "seniority_alignment"
    KEYWORD_SCORE_SUPPORT = "keyword_score_support"
    SEMANTIC_SCORE_SUPPORT = "semantic_score_support"
    HYBRID_SCORE_SUPPORT = "hybrid_score_support"


class SkillGapSeverity(str, Enum):
    """Small deterministic severity vocabulary for future skill-gap summaries."""

    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass(frozen=True)
class SkillEvidence:
    """Safe skill-level evidence derived from normalized matching data."""

    skill_name: str
    normalized_name: str | None = None
    category: str | None = None


@dataclass(frozen=True)
class ExplanationReason:
    """A neutral reason code with optional compact evidence references."""

    code: ExplanationReasonCode
    skill_names: tuple[str, ...] = ()
    score_name: str | None = None
    score_value: float | None = None


@dataclass(frozen=True)
class ScoreExplanation:
    """Safe compact score evidence for explaining an existing ranked match."""

    hybrid_score: float | None = None
    keyword_score: float | None = None
    semantic_score: float | None = None
    keyword_weight: float | None = None
    semantic_weight: float | None = None
    required_skill_coverage: float | None = None
    preferred_skill_coverage: float | None = None
    category_alignment: float | None = None
    missing_required_skill_penalty: float | None = None


@dataclass(frozen=True)
class SkillGapSummary:
    """Neutral skill match and gap shape for either matching direction."""

    severity: SkillGapSeverity = SkillGapSeverity.NONE
    matched_required_skills: tuple[SkillEvidence, ...] = ()
    matched_preferred_skills: tuple[SkillEvidence, ...] = ()
    missing_required_skills: tuple[SkillEvidence, ...] = ()
    missing_preferred_skills: tuple[SkillEvidence, ...] = ()
    focus_skills: tuple[SkillEvidence, ...] = ()


@dataclass(frozen=True)
class MatchExplanation:
    """Serializable explanation shell for an already-ranked match."""

    subject_id: str | None = None
    subject_type: Literal["freelancer", "gig"] | None = None
    candidate_id: str | None = None
    candidate_type: Literal["freelancer", "gig"] | None = None
    rank: int | None = None
    reasons: tuple[ExplanationReason, ...] = ()
    score: ScoreExplanation = field(default_factory=ScoreExplanation)
    skill_gap: SkillGapSummary = field(default_factory=SkillGapSummary)
