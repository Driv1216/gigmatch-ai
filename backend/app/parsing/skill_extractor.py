"""Deterministic skill extraction backed by a curated taxonomy."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.parsing.text_normalizer import normalize_lookup_term, normalize_text

_TAXONOMY_PATH = Path(__file__).with_name("skills_taxonomy.json")
_SKILL_BOUNDARY = r"[a-z0-9+#]"


@dataclass(frozen=True)
class SkillEntry:
    canonical: str
    aliases: tuple[str, ...]
    category: str


@dataclass(frozen=True)
class SkillMatch:
    start: int
    end: int
    canonical: str
    category: str
    matched_term: str
    taxonomy_index: int


def _alias_pattern(alias: str) -> re.Pattern[str]:
    escaped = re.escape(alias)
    escaped = re.sub(r"\\\s+", r"\\s+", escaped)
    return re.compile(rf"(?<!{_SKILL_BOUNDARY}){escaped}(?!{_SKILL_BOUNDARY})")


@lru_cache(maxsize=1)
def load_taxonomy() -> tuple[SkillEntry, ...]:
    """Load and validate the local skills taxonomy."""

    with _TAXONOMY_PATH.open(encoding="utf-8") as taxonomy_file:
        raw_entries = json.load(taxonomy_file)

    entries: list[SkillEntry] = []
    for raw_entry in raw_entries:
        canonical = str(raw_entry["canonical"]).strip()
        category = str(raw_entry["category"]).strip()
        aliases = tuple(
            dict.fromkeys(
                normalize_lookup_term(alias)
                for alias in raw_entry.get("aliases", [])
                if normalize_lookup_term(alias)
            )
        )

        if not canonical or not category or not aliases:
            raise ValueError("Each skill taxonomy entry needs canonical, category, and aliases")

        entries.append(SkillEntry(canonical=canonical, aliases=aliases, category=category))

    return tuple(entries)


@lru_cache(maxsize=1)
def _compiled_aliases() -> tuple[tuple[re.Pattern[str], SkillEntry, str, int], ...]:
    compiled: list[tuple[re.Pattern[str], SkillEntry, str, int]] = []
    for taxonomy_index, entry in enumerate(load_taxonomy()):
        for alias in sorted(entry.aliases, key=len, reverse=True):
            compiled.append((_alias_pattern(alias), entry, alias, taxonomy_index))
    return tuple(compiled)


def _spans_overlap(left: SkillMatch, right: SkillMatch) -> bool:
    return left.start < right.end and right.start < left.end


def _collect_matches(normalized_text: str) -> list[SkillMatch]:
    candidates: list[SkillMatch] = []
    for pattern, entry, alias, taxonomy_index in _compiled_aliases():
        for match in pattern.finditer(normalized_text):
            candidates.append(
                SkillMatch(
                    start=match.start(),
                    end=match.end(),
                    canonical=entry.canonical,
                    category=entry.category,
                    matched_term=alias,
                    taxonomy_index=taxonomy_index,
                )
            )

    candidates.sort(key=lambda item: (item.start, -(item.end - item.start), item.taxonomy_index))

    accepted: list[SkillMatch] = []
    for candidate in candidates:
        if any(_spans_overlap(candidate, existing) for existing in accepted):
            continue
        accepted.append(candidate)

    return accepted


def extract_skills(text: str) -> dict[str, Any]:
    """Extract known technical skills from raw text using taxonomy aliases."""

    normalized_text = normalize_text(text)
    result: dict[str, Any] = {
        "skills": [],
        "categories": [],
        "matched_terms": [],
        "unmatched_keywords": [],
        "confidence": "deterministic",
    }

    if not normalized_text:
        return result

    seen_skills: set[str] = set()
    seen_categories: set[str] = set()
    seen_matched_terms: set[str] = set()

    for match in _collect_matches(normalized_text):
        if match.canonical not in seen_skills:
            result["skills"].append(match.canonical)
            seen_skills.add(match.canonical)

            if match.category not in seen_categories:
                result["categories"].append(match.category)
                seen_categories.add(match.category)

        if match.matched_term not in seen_matched_terms:
            result["matched_terms"].append(match.matched_term)
            seen_matched_terms.add(match.matched_term)

    return result
