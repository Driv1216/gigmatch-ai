"""Contracts for small matching evaluation fixtures.

These contracts describe evaluation inputs and relevance labels only. They do
not calculate ranking metrics or call the matching rankers.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum, IntEnum

from app.matching.contracts import FreelancerMatchProfile, GigMatchProfile

EvaluationEntity = FreelancerMatchProfile | GigMatchProfile


class EvaluationQueryType(str, Enum):
    """Supported matching evaluation directions."""

    FREELANCER_TO_GIGS = "freelancer_to_gigs"
    GIG_TO_FREELANCERS = "gig_to_freelancers"


class RelevanceLabel(IntEnum):
    """Small ordinal relevance scale for explicit judgments."""

    NOT_RELEVANT = 0
    PARTIALLY_RELEVANT = 1
    STRONGLY_RELEVANT = 2


class EvaluationLabelSource(str, Enum):
    """Source vocabulary for evaluation judgments."""

    SEEDED_FIXTURE = "seeded_fixture"
    MANUAL_REVIEW = "manual_review"


@dataclass(frozen=True)
class RelevanceJudgment:
    """A relevance judgment for one candidate in one evaluation query."""

    candidate_id: str
    relevance_label: RelevanceLabel
    label_source: EvaluationLabelSource
    notes: str | None = None


@dataclass(frozen=True)
class EvaluationQuery:
    """A query, candidate pool, and explicit judgments for one direction."""

    query_id: str
    query_type: EvaluationQueryType
    query_entity: EvaluationEntity
    candidate_entities: tuple[EvaluationEntity, ...]
    judgments: tuple[RelevanceJudgment, ...]
    is_complete_judgment_set: bool
    notes: str | None = None


@dataclass(frozen=True)
class EvaluationFixture:
    """A named collection of matching evaluation queries."""

    fixture_id: str
    description: str | None
    queries: tuple[EvaluationQuery, ...]
