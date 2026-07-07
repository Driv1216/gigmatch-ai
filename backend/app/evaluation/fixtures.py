"""Load and validate matching evaluation fixtures."""

from __future__ import annotations

import json
from collections.abc import Iterable, Mapping
from pathlib import Path
from typing import Any

from app.evaluation.contracts import (
    EvaluationEntity,
    EvaluationFixture,
    EvaluationLabelSource,
    EvaluationQuery,
    EvaluationQueryType,
    RelevanceJudgment,
    RelevanceLabel,
)
from app.matching.builders import build_freelancer_match_profile, build_gig_match_profile
from app.matching.contracts import FreelancerMatchProfile, GigMatchProfile

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures"


class EvaluationFixtureValidationError(ValueError):
    """Raised when an evaluation fixture cannot be safely loaded."""


def load_seeded_evaluation_fixtures(fixture_dir: Path | str = FIXTURE_DIR) -> tuple[EvaluationFixture, ...]:
    """Load all seeded evaluation fixture files from a directory."""

    directory = Path(fixture_dir)
    fixture_paths = sorted(directory.glob("*.json"))
    fixtures = tuple(load_evaluation_fixture_file(path) for path in fixture_paths)
    _validate_unique_fixture_ids(fixtures)
    return fixtures


def load_evaluation_fixture_file(path: Path | str) -> EvaluationFixture:
    """Load one evaluation fixture JSON file and validate its contract."""

    fixture_path = Path(path)
    try:
        raw_fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise EvaluationFixtureValidationError(f"{fixture_path.name}: invalid JSON: {exc}") from exc

    return validate_evaluation_fixture(raw_fixture, source_name=fixture_path.name)


def validate_evaluation_fixture(raw_fixture: Mapping[str, Any], source_name: str = "evaluation fixture") -> EvaluationFixture:
    """Validate and normalize a raw fixture dictionary."""

    if not isinstance(raw_fixture, Mapping):
        raise EvaluationFixtureValidationError(f"{source_name}: fixture must be an object")

    fixture_id = _required_non_empty_text(raw_fixture.get("fixture_id"), f"{source_name}: fixture_id")
    description = _optional_text(raw_fixture.get("description"), f"{source_name}: description")
    raw_queries = raw_fixture.get("queries")
    if not isinstance(raw_queries, list) or not raw_queries:
        raise EvaluationFixtureValidationError(f"{source_name}: fixture must contain at least one query")

    queries: list[EvaluationQuery] = []
    seen_query_ids: set[str] = set()
    for index, raw_query in enumerate(raw_queries):
        query = _parse_query(raw_query, source_name=f"{source_name}: queries[{index}]")
        if query.query_id in seen_query_ids:
            raise EvaluationFixtureValidationError(
                f"{source_name}: duplicate query_id {query.query_id!r} within fixture {fixture_id!r}"
            )
        seen_query_ids.add(query.query_id)
        queries.append(query)

    return EvaluationFixture(
        fixture_id=fixture_id,
        description=description,
        queries=tuple(queries),
    )


def _parse_query(raw_query: Any, source_name: str) -> EvaluationQuery:
    if not isinstance(raw_query, Mapping):
        raise EvaluationFixtureValidationError(f"{source_name}: query must be an object")

    query_id = _required_non_empty_text(raw_query.get("query_id"), f"{source_name}: query_id")
    query_type = _parse_query_type(raw_query.get("query_type"), f"{source_name}: query_type")
    is_complete_judgment_set = _required_bool(
        raw_query.get("is_complete_judgment_set"),
        f"{source_name}: is_complete_judgment_set",
    )
    notes = _optional_text(raw_query.get("notes"), f"{source_name}: notes")

    query_entity = _build_query_entity(
        query_type,
        raw_query.get("query_entity"),
        f"{source_name}: query_entity",
    )
    candidate_entities = _build_candidate_entities(
        query_type,
        raw_query.get("candidate_entities"),
        f"{source_name}: candidate_entities",
    )
    candidate_ids = [_entity_id(candidate) for candidate in candidate_entities]
    _validate_unique_values(candidate_ids, f"{source_name}: duplicate candidate_id")

    judgments = _parse_judgments(raw_query.get("judgments"), f"{source_name}: judgments")
    _validate_judgments(query_id, candidate_ids, judgments, is_complete_judgment_set, source_name)

    return EvaluationQuery(
        query_id=query_id,
        query_type=query_type,
        query_entity=query_entity,
        candidate_entities=candidate_entities,
        judgments=judgments,
        is_complete_judgment_set=is_complete_judgment_set,
        notes=notes,
    )


def _build_query_entity(query_type: EvaluationQueryType, raw_entity: Any, source_name: str) -> EvaluationEntity:
    if not isinstance(raw_entity, Mapping):
        raise EvaluationFixtureValidationError(f"{source_name}: query_entity must be an object")

    entity = (
        build_freelancer_match_profile(raw_entity)
        if query_type == EvaluationQueryType.FREELANCER_TO_GIGS
        else build_gig_match_profile(raw_entity)
    )
    entity_id = _entity_id(entity)
    if not entity_id:
        raise EvaluationFixtureValidationError(f"{source_name}: normalized query entity id must be non-empty")
    return entity


def _build_candidate_entities(query_type: EvaluationQueryType, raw_candidates: Any, source_name: str) -> tuple[EvaluationEntity, ...]:
    if not isinstance(raw_candidates, list) or not raw_candidates:
        raise EvaluationFixtureValidationError(f"{source_name}: query must contain at least one candidate")

    candidates: list[EvaluationEntity] = []
    for index, raw_candidate in enumerate(raw_candidates):
        if not isinstance(raw_candidate, Mapping):
            raise EvaluationFixtureValidationError(f"{source_name}[{index}]: candidate must be an object")

        candidate = (
            build_gig_match_profile(raw_candidate)
            if query_type == EvaluationQueryType.FREELANCER_TO_GIGS
            else build_freelancer_match_profile(raw_candidate)
        )
        if not _entity_id(candidate):
            raise EvaluationFixtureValidationError(f"{source_name}[{index}]: normalized candidate id must be non-empty")
        candidates.append(candidate)

    return tuple(candidates)


def _parse_judgments(raw_judgments: Any, source_name: str) -> tuple[RelevanceJudgment, ...]:
    if not isinstance(raw_judgments, list) or not raw_judgments:
        raise EvaluationFixtureValidationError(f"{source_name}: query must contain at least one judgment")

    judgments: list[RelevanceJudgment] = []
    for index, raw_judgment in enumerate(raw_judgments):
        judgment_source = f"{source_name}[{index}]"
        if not isinstance(raw_judgment, Mapping):
            raise EvaluationFixtureValidationError(f"{judgment_source}: judgment must be an object")

        judgments.append(
            RelevanceJudgment(
                candidate_id=_required_non_empty_text(raw_judgment.get("candidate_id"), f"{judgment_source}: candidate_id"),
                relevance_label=_parse_relevance_label(raw_judgment.get("relevance_label"), f"{judgment_source}: relevance_label"),
                label_source=_parse_label_source(raw_judgment.get("label_source"), f"{judgment_source}: label_source"),
                notes=_optional_text(raw_judgment.get("notes"), f"{judgment_source}: notes"),
            )
        )

    return tuple(judgments)


def _validate_judgments(
    query_id: str,
    candidate_ids: list[str],
    judgments: tuple[RelevanceJudgment, ...],
    is_complete_judgment_set: bool,
    source_name: str,
) -> None:
    candidate_id_set = set(candidate_ids)
    judgment_candidate_ids = [judgment.candidate_id for judgment in judgments]
    _validate_unique_values(judgment_candidate_ids, f"{source_name}: duplicate judgment for candidate_id")

    for judgment in judgments:
        if judgment.candidate_id not in candidate_id_set:
            raise EvaluationFixtureValidationError(
                f"{source_name}: judgment candidate_id {judgment.candidate_id!r} is not in candidate pool for query {query_id!r}"
            )

    if is_complete_judgment_set and set(judgment_candidate_ids) != candidate_id_set:
        missing = sorted(candidate_id_set - set(judgment_candidate_ids))
        raise EvaluationFixtureValidationError(
            f"{source_name}: complete judgment set is missing candidate judgments: {', '.join(missing)}"
        )


def _validate_unique_fixture_ids(fixtures: Iterable[EvaluationFixture]) -> None:
    seen_fixture_ids: set[str] = set()
    for fixture in fixtures:
        if fixture.fixture_id in seen_fixture_ids:
            raise EvaluationFixtureValidationError(f"duplicate fixture_id {fixture.fixture_id!r} across seeded fixture files")
        seen_fixture_ids.add(fixture.fixture_id)


def _parse_query_type(value: Any, source_name: str) -> EvaluationQueryType:
    try:
        return EvaluationQueryType(value)
    except (TypeError, ValueError) as exc:
        allowed = ", ".join(item.value for item in EvaluationQueryType)
        raise EvaluationFixtureValidationError(f"{source_name}: must be one of: {allowed}") from exc


def _parse_relevance_label(value: Any, source_name: str) -> RelevanceLabel:
    if isinstance(value, bool):
        raise EvaluationFixtureValidationError(f"{source_name}: must be 0, 1, or 2")
    try:
        return RelevanceLabel(value)
    except (TypeError, ValueError) as exc:
        raise EvaluationFixtureValidationError(f"{source_name}: must be 0, 1, or 2") from exc


def _parse_label_source(value: Any, source_name: str) -> EvaluationLabelSource:
    try:
        return EvaluationLabelSource(value)
    except (TypeError, ValueError) as exc:
        allowed = ", ".join(item.value for item in EvaluationLabelSource)
        raise EvaluationFixtureValidationError(f"{source_name}: must be one of: {allowed}") from exc


def _required_non_empty_text(value: Any, source_name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise EvaluationFixtureValidationError(f"{source_name}: must be a non-empty string")
    return value.strip()


def _optional_text(value: Any, source_name: str) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise EvaluationFixtureValidationError(f"{source_name}: must be a string when provided")
    normalized = value.strip()
    return normalized or None


def _required_bool(value: Any, source_name: str) -> bool:
    if not isinstance(value, bool):
        raise EvaluationFixtureValidationError(f"{source_name}: must be true or false")
    return value


def _validate_unique_values(values: list[str], message_prefix: str) -> None:
    seen: set[str] = set()
    for value in values:
        if value in seen:
            raise EvaluationFixtureValidationError(f"{message_prefix} {value!r}")
        seen.add(value)


def _entity_id(entity: EvaluationEntity) -> str:
    if isinstance(entity, FreelancerMatchProfile):
        return entity.freelancer_id
    if isinstance(entity, GigMatchProfile):
        return entity.gig_id
    return ""
