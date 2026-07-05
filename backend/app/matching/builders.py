"""Pure builders for internal matching profiles.

These functions normalize already-loaded profile, gig, and parse-shaped data.
They do not query Supabase, write data, call route handlers, generate
embeddings, or compute match scores.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from functools import lru_cache
from typing import Any

from app.matching.contracts import FreelancerMatchProfile, GigMatchProfile, NormalizedSkill
from app.parsing.skill_extractor import load_taxonomy
from app.parsing.text_normalizer import normalize_lookup_term

STRUCTURED_PROFILE_SOURCE = "structured_profile"
RESUME_PARSE_SOURCE = "resume_parse"
STRUCTURED_GIG_SOURCE = "structured_gig"
GIG_PARSE_SOURCE = "gig_parse"


def build_freelancer_match_profile(
    freelancer_profile: Any | None = None,
    resume_parse: Any | None = None,
) -> FreelancerMatchProfile:
    """Build a normalized freelancer matching object from loaded records."""

    source_metadata: dict[str, tuple[str, ...]] = {}

    freelancer_id = _first_text(
        (
            _field(freelancer_profile, "user_id"),
            _field(freelancer_profile, "freelancer_id"),
            _field(freelancer_profile, "id"),
            _field(resume_parse, "user_id"),
            _parse_field(resume_parse, "user_id"),
        )
    )

    display_name, display_name_sources = _prefer_structured_text(
        freelancer_profile,
        ("display_name", "full_name", "name"),
        resume_parse,
        ("display_name", "full_name", "name"),
    )
    _record_sources(source_metadata, "display_name", display_name_sources)

    headline, headline_sources = _prefer_structured_text(
        freelancer_profile,
        ("headline", "title"),
        resume_parse,
        ("headline", "title"),
    )
    _record_sources(source_metadata, "headline", headline_sources)

    bio, bio_sources = _prefer_structured_text(
        freelancer_profile,
        ("bio", "summary", "about"),
        resume_parse,
        ("bio", "summary", "about"),
    )
    _record_sources(source_metadata, "bio", bio_sources)

    primary_role, primary_role_sources = _prefer_structured_text(
        freelancer_profile,
        ("primary_role", "role"),
        resume_parse,
        ("primary_role", "role"),
    )
    _record_sources(source_metadata, "primary_role", primary_role_sources)

    experience_level, experience_sources = _prefer_structured_text(
        freelancer_profile,
        ("experience_level", "seniority_level"),
        resume_parse,
        ("experience_level", "seniority_level", "seniority"),
    )
    _record_sources(source_metadata, "experience_level", experience_sources)

    categories, category_sources = _merge_clean_values(
        (
            (STRUCTURED_PROFILE_SOURCE, _field(freelancer_profile, "tech_categories")),
            (STRUCTURED_PROFILE_SOURCE, _field(freelancer_profile, "categories")),
            (RESUME_PARSE_SOURCE, _field(resume_parse, "categories")),
            (RESUME_PARSE_SOURCE, _parse_field(resume_parse, "categories")),
        )
    )
    _record_sources(source_metadata, "categories", category_sources)

    skills = _merge_skills(
        (
            (STRUCTURED_PROFILE_SOURCE, _field(freelancer_profile, "skills")),
            (RESUME_PARSE_SOURCE, _field(resume_parse, "skills")),
            (RESUME_PARSE_SOURCE, _parse_field(resume_parse, "skills")),
        )
    )
    _record_sources(source_metadata, "skills", _sources_from_skills(skills))

    tools, tool_sources = _merge_clean_values(
        (
            (STRUCTURED_PROFILE_SOURCE, _field(freelancer_profile, "tools")),
            (RESUME_PARSE_SOURCE, _field(resume_parse, "tools")),
            (RESUME_PARSE_SOURCE, _parse_field(resume_parse, "tools")),
        )
    )
    _record_sources(source_metadata, "tools", tool_sources)

    project_domain_text, project_sources = _merge_clean_values(
        (
            (STRUCTURED_PROFILE_SOURCE, _field(freelancer_profile, "project_links")),
            (STRUCTURED_PROFILE_SOURCE, _field(freelancer_profile, "projects")),
            (RESUME_PARSE_SOURCE, _parse_field(resume_parse, "project_links")),
            (RESUME_PARSE_SOURCE, _parse_field(resume_parse, "projects")),
            (RESUME_PARSE_SOURCE, _parse_field(resume_parse, "project_text")),
            (RESUME_PARSE_SOURCE, _parse_field(resume_parse, "domain_text")),
        )
    )
    _record_sources(source_metadata, "project_domain_text", project_sources)

    return FreelancerMatchProfile(
        freelancer_id=freelancer_id or "",
        display_name=display_name,
        headline=headline,
        bio=bio,
        primary_role=primary_role,
        experience_level=experience_level,
        categories=categories,
        skills=skills,
        tools=tools,
        project_domain_text=project_domain_text,
        source_metadata=source_metadata,
    )


def build_gig_match_profile(
    gig: Any | None = None,
    gig_parse: Any | None = None,
) -> GigMatchProfile:
    """Build a normalized gig matching object from loaded records."""

    source_metadata: dict[str, tuple[str, ...]] = {}

    gig_id = _first_text((_field(gig, "id"), _field(gig, "gig_id"), _field(gig_parse, "gig_id")))

    client_id = _first_text((_field(gig, "client_id"), _parse_field(gig_parse, "client_id")))

    title, title_sources = _prefer_structured_text(
        gig,
        ("title",),
        gig_parse,
        ("title",),
        structured_source=STRUCTURED_GIG_SOURCE,
        parse_source=GIG_PARSE_SOURCE,
    )
    _record_sources(source_metadata, "title", title_sources)

    description, description_sources = _prefer_structured_text(
        gig,
        ("description",),
        gig_parse,
        ("description", "summary"),
        structured_source=STRUCTURED_GIG_SOURCE,
        parse_source=GIG_PARSE_SOURCE,
    )
    _record_sources(source_metadata, "description", description_sources)

    category, category_sources = _prefer_structured_text(
        gig,
        ("tech_category", "category"),
        gig_parse,
        ("tech_category", "category"),
        structured_source=STRUCTURED_GIG_SOURCE,
        parse_source=GIG_PARSE_SOURCE,
    )
    _record_sources(source_metadata, "category", category_sources)

    required_skills = _merge_skills(
        (
            (STRUCTURED_GIG_SOURCE, _field(gig, "required_skills")),
            (GIG_PARSE_SOURCE, _field(gig_parse, "required_skills")),
            (GIG_PARSE_SOURCE, _parse_field(gig_parse, "required_skills")),
        )
    )
    _record_sources(source_metadata, "required_skills", _sources_from_skills(required_skills))

    preferred_skills = _merge_skills(
        (
            (STRUCTURED_GIG_SOURCE, _field(gig, "preferred_skills")),
            (GIG_PARSE_SOURCE, _field(gig_parse, "preferred_skills")),
            (GIG_PARSE_SOURCE, _parse_field(gig_parse, "preferred_skills")),
        )
    )
    _record_sources(source_metadata, "preferred_skills", _sources_from_skills(preferred_skills))

    combined_skills = _merge_skill_groups(required_skills, preferred_skills)
    _record_sources(source_metadata, "combined_skills", _sources_from_skills(combined_skills))

    difficulty_level, difficulty_sources = _prefer_structured_text(
        gig,
        ("difficulty_level",),
        gig_parse,
        ("difficulty_level", "difficulty"),
        structured_source=STRUCTURED_GIG_SOURCE,
        parse_source=GIG_PARSE_SOURCE,
    )
    _record_sources(source_metadata, "difficulty_level", difficulty_sources)

    seniority_needed, seniority_sources = _prefer_structured_text(
        gig,
        ("seniority_needed", "seniority_level"),
        gig_parse,
        ("seniority_needed", "seniority_level", "seniority"),
        structured_source=STRUCTURED_GIG_SOURCE,
        parse_source=GIG_PARSE_SOURCE,
    )
    _record_sources(source_metadata, "seniority_needed", seniority_sources)

    deliverables, deliverable_sources = _merge_clean_values(
        (
            (STRUCTURED_GIG_SOURCE, _field(gig, "deliverables")),
            (GIG_PARSE_SOURCE, _field(gig_parse, "deliverables")),
            (GIG_PARSE_SOURCE, _parse_field(gig_parse, "deliverables")),
        )
    )
    _record_sources(source_metadata, "deliverables", deliverable_sources)

    status, status_sources = _prefer_structured_text(
        gig,
        ("status",),
        gig_parse,
        ("status",),
        structured_source=STRUCTURED_GIG_SOURCE,
        parse_source=GIG_PARSE_SOURCE,
    )
    _record_sources(source_metadata, "status", status_sources)

    return GigMatchProfile(
        gig_id=gig_id or "",
        client_id=client_id,
        title=title,
        description=description,
        category=category,
        required_skills=required_skills,
        preferred_skills=preferred_skills,
        combined_skills=combined_skills,
        difficulty_level=difficulty_level,
        seniority_needed=seniority_needed,
        deliverables=deliverables,
        status=status,
        source_metadata=source_metadata,
    )


def _field(record: Any | None, key: str) -> Any | None:
    if record is None:
        return None

    if isinstance(record, Mapping):
        return record.get(key)

    return getattr(record, key, None)


def _parse_field(record: Any | None, key: str) -> Any | None:
    direct_value = _field(record, key)
    if _has_value(direct_value):
        return direct_value

    parsed_json = _field(record, "parsed_json")
    if isinstance(parsed_json, Mapping):
        return parsed_json.get(key)

    return None


def _has_value(value: Any | None) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(_clean_text(value))
    if isinstance(value, Iterable) and not isinstance(value, (str, bytes, Mapping)):
        return any(_has_value(item) for item in value)
    return True


def _clean_text(value: Any | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, Mapping):
        return None

    text = value if isinstance(value, str) else str(value)
    cleaned = " ".join(text.split())
    return cleaned or None


def _first_text(values: Iterable[Any | None]) -> str | None:
    for value in values:
        cleaned = _clean_text(value)
        if cleaned:
            return cleaned
    return None


def _as_values(value: Any | None) -> tuple[Any, ...]:
    if value is None:
        return ()
    if isinstance(value, str):
        return tuple(part for part in value.replace(";", ",").split(","))
    if isinstance(value, Mapping):
        return ()
    if isinstance(value, Iterable) and not isinstance(value, bytes):
        return tuple(value)
    return (value,)


def _prefer_structured_text(
    structured_record: Any | None,
    structured_keys: tuple[str, ...],
    parse_record: Any | None,
    parse_keys: tuple[str, ...],
    *,
    structured_source: str = STRUCTURED_PROFILE_SOURCE,
    parse_source: str = RESUME_PARSE_SOURCE,
) -> tuple[str | None, tuple[str, ...]]:
    for key in structured_keys:
        value = _clean_text(_field(structured_record, key))
        if value:
            return value, (structured_source,)

    for key in parse_keys:
        value = _clean_text(_parse_field(parse_record, key))
        if value:
            return value, (parse_source,)

    return None, ()


def _merge_clean_values(groups: Iterable[tuple[str, Any | None]]) -> tuple[tuple[str, ...], tuple[str, ...]]:
    values_by_normalized: dict[str, str] = {}
    sources: list[str] = []

    for source, raw_values in groups:
        added_from_source = False
        for raw_value in _as_values(raw_values):
            value = _clean_text(raw_value)
            if not value:
                continue

            normalized = normalize_lookup_term(value)
            if not normalized:
                continue

            values_by_normalized.setdefault(normalized, value)
            added_from_source = True

        if added_from_source and source not in sources:
            sources.append(source)

    return tuple(values_by_normalized.values()), tuple(sources)


@lru_cache(maxsize=1)
def _skill_lookup() -> dict[str, tuple[str, str]]:
    lookup: dict[str, tuple[str, str]] = {}
    for entry in load_taxonomy():
        lookup[normalize_lookup_term(entry.canonical)] = (entry.canonical, entry.category)
        for alias in entry.aliases:
            lookup[alias] = (entry.canonical, entry.category)
    return lookup


def _normalize_skill(raw_value: Any | None, source: str) -> NormalizedSkill | None:
    cleaned = _clean_text(raw_value)
    if not cleaned:
        return None

    lookup_key = normalize_lookup_term(cleaned)
    if not lookup_key:
        return None

    canonical = _skill_lookup().get(lookup_key)
    if canonical:
        display_name, category = canonical
        normalized_name = normalize_lookup_term(display_name)
    else:
        display_name = cleaned
        category = None
        normalized_name = lookup_key

    return NormalizedSkill(
        display_name=display_name,
        normalized_name=normalized_name,
        category=category,
        sources=(source,),
    )


def _merge_skills(groups: Iterable[tuple[str, Any | None]]) -> tuple[NormalizedSkill, ...]:
    skills_by_normalized: dict[str, NormalizedSkill] = {}

    for source, raw_values in groups:
        for raw_value in _as_values(raw_values):
            skill = _normalize_skill(raw_value, source)
            if skill is None:
                continue

            existing = skills_by_normalized.get(skill.normalized_name)
            if existing is None:
                skills_by_normalized[skill.normalized_name] = skill
                continue

            sources = existing.sources
            if source not in sources:
                sources = (*sources, source)

            skills_by_normalized[skill.normalized_name] = NormalizedSkill(
                display_name=existing.display_name,
                normalized_name=existing.normalized_name,
                category=existing.category or skill.category,
                sources=sources,
            )

    return tuple(skills_by_normalized.values())


def _merge_skill_groups(*skill_groups: Iterable[NormalizedSkill]) -> tuple[NormalizedSkill, ...]:
    skills_by_normalized: dict[str, NormalizedSkill] = {}

    for skill_group in skill_groups:
        for skill in skill_group:
            existing = skills_by_normalized.get(skill.normalized_name)
            if existing is None:
                skills_by_normalized[skill.normalized_name] = skill
                continue

            sources = existing.sources
            for source in skill.sources:
                if source not in sources:
                    sources = (*sources, source)

            skills_by_normalized[skill.normalized_name] = NormalizedSkill(
                display_name=existing.display_name,
                normalized_name=existing.normalized_name,
                category=existing.category or skill.category,
                sources=sources,
            )

    return tuple(skills_by_normalized.values())


def _sources_from_skills(skills: Iterable[NormalizedSkill]) -> tuple[str, ...]:
    sources: list[str] = []
    for skill in skills:
        for source in skill.sources:
            if source not in sources:
                sources.append(source)
    return tuple(sources)


def _record_sources(
    source_metadata: dict[str, tuple[str, ...]],
    field_name: str,
    sources: tuple[str, ...],
) -> None:
    if sources:
        source_metadata[field_name] = sources
