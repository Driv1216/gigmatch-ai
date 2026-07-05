"""Semantic preparation utilities for normalized matching profiles.

Milestone 4C builds stable embedding text and provider interfaces only. It
does not rank candidates, persist vectors, or expose routes.
"""

from __future__ import annotations

import hashlib
import math
from typing import Protocol

from app.matching.contracts import FreelancerMatchProfile, GigMatchProfile, NormalizedSkill
from app.parsing.text_normalizer import normalize_lookup_term


class EmbeddingProvider(Protocol):
    """Interface for providers that encode text into embedding vectors."""

    def encode(self, text: str) -> list[float]:
        """Encode one text value into a numeric vector."""

    def encode_batch(self, texts: list[str]) -> list[list[float]]:
        """Encode multiple text values into numeric vectors."""


class DeterministicFakeEmbeddingProvider:
    """Stable fake embedding provider for tests and local deterministic fixtures."""

    def __init__(self, dimensions: int = 8) -> None:
        if dimensions <= 0:
            raise ValueError("Embedding dimensions must be greater than zero.")
        self.dimensions = dimensions

    def encode(self, text: str) -> list[float]:
        seed = text.encode("utf-8")
        values: list[float] = []
        counter = 0

        while len(values) < self.dimensions:
            digest = hashlib.sha256(seed + counter.to_bytes(4, "big")).digest()
            for offset in range(0, len(digest), 4):
                if len(values) >= self.dimensions:
                    break
                integer = int.from_bytes(digest[offset : offset + 4], "big")
                values.append((integer / 0xFFFFFFFF) * 2.0 - 1.0)
            counter += 1

        return values

    def encode_batch(self, texts: list[str]) -> list[list[float]]:
        return [self.encode(text) for text in texts]


class SentenceTransformerEmbeddingProvider:
    """Optional sentence-transformers wrapper loaded only when instantiated."""

    def __init__(self, model_name: str) -> None:
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError as error:
            raise RuntimeError(
                "sentence-transformers is not installed. Install it before using "
                "SentenceTransformerEmbeddingProvider, or use another EmbeddingProvider."
            ) from error

        self.model_name = model_name
        self._model = SentenceTransformer(model_name)

    def encode(self, text: str) -> list[float]:
        vector = self._model.encode(text)
        return _vector_to_list(vector)

    def encode_batch(self, texts: list[str]) -> list[list[float]]:
        vectors = self._model.encode(texts)
        return [_vector_to_list(vector) for vector in vectors]


def build_freelancer_embedding_text(freelancer: FreelancerMatchProfile) -> str:
    """Build stable human-readable embedding text for a freelancer profile."""

    sections = [
        _section("Role", freelancer.primary_role),
        _section("Headline", freelancer.headline),
        _section("Experience level", freelancer.experience_level),
        _section("Categories", _join_values(freelancer.categories)),
        _section("Skills", _join_skills(freelancer.skills)),
        _section("Tools", _join_values(freelancer.tools)),
        _section("Profile", freelancer.bio),
        _section("Project/domain text", _join_values(freelancer.project_domain_text)),
    ]
    return "\n".join(section for section in sections if section)


def build_gig_embedding_text(gig: GigMatchProfile) -> str:
    """Build stable human-readable embedding text for a gig profile."""

    sections = [
        _section("Gig", gig.title),
        _section("Category", gig.category),
        _section("Required skills", _join_skills(gig.required_skills)),
        _section("Preferred skills", _join_skills(gig.preferred_skills)),
        _section("Difficulty", gig.difficulty_level),
        _section("Seniority", gig.seniority_needed),
        _section("Deliverables", _join_values(gig.deliverables)),
        _section("Description", gig.description),
    ]
    return "\n".join(section for section in sections if section)


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Return raw cosine similarity for same-dimension vectors."""

    if len(vec_a) != len(vec_b):
        raise ValueError("Vectors must have the same dimension for cosine similarity.")

    if not vec_a:
        raise ValueError("Vectors must not be empty for cosine similarity.")

    norm_a = math.sqrt(sum(value * value for value in vec_a))
    norm_b = math.sqrt(sum(value * value for value in vec_b))

    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0

    dot_product = sum(left * right for left, right in zip(vec_a, vec_b))
    return dot_product / (norm_a * norm_b)


def _section(label: str, value: str | None) -> str | None:
    cleaned = _clean_text(value)
    if not cleaned:
        return None
    punctuation = "" if cleaned.endswith((".", "!", "?")) else "."
    return f"{label}: {cleaned}{punctuation}"


def _join_skills(skills: tuple[NormalizedSkill, ...]) -> str | None:
    return _join_values(skill.display_name for skill in _dedupe_skills(skills))


def _dedupe_skills(skills: tuple[NormalizedSkill, ...]) -> tuple[NormalizedSkill, ...]:
    deduped: dict[str, NormalizedSkill] = {}
    for skill in skills:
        normalized_name = normalize_lookup_term(skill.normalized_name or skill.display_name)
        if normalized_name:
            deduped.setdefault(normalized_name, skill)
    return tuple(deduped.values())


def _join_values(values: object) -> str | None:
    deduped: dict[str, str] = {}
    if isinstance(values, str):
        iterable = (values,)
    else:
        try:
            iterable = tuple(values)  # type: ignore[arg-type]
        except TypeError:
            iterable = (values,)

    for value in iterable:
        cleaned = _clean_text(value)
        if not cleaned:
            continue

        normalized = normalize_lookup_term(cleaned)
        if normalized:
            deduped.setdefault(normalized, cleaned)

    if not deduped:
        return None
    return ", ".join(deduped.values())


def _clean_text(value: object) -> str | None:
    if value is None or isinstance(value, (dict, list, tuple, set)):
        return None

    cleaned = " ".join(str(value).split())
    return cleaned or None


def _vector_to_list(vector: object) -> list[float]:
    if hasattr(vector, "tolist"):
        vector = vector.tolist()
    return [float(value) for value in vector]  # type: ignore[union-attr]
