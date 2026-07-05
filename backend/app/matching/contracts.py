"""Stable internal matching contracts for normalized entities."""

from __future__ import annotations

from dataclasses import dataclass


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
