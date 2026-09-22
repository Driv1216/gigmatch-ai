"""Frozen R1 semantic benchmark loading, validation, and checksum enforcement."""

from __future__ import annotations

import hashlib
import json
from dataclasses import replace
from pathlib import Path
from typing import Any

from app.evaluation.contracts import BenchmarkSplit, EvaluationFixture, EvaluationQueryType
from app.evaluation.fixtures import EvaluationFixtureValidationError, load_evaluation_fixture_file

BENCHMARK_DIR = Path(__file__).resolve().parent / "benchmarks"
BENCHMARK_PATH = BENCHMARK_DIR / "semantic_matching_benchmark_v1.json"
LOCK_PATH = BENCHMARK_DIR / "semantic_matching_benchmark_v1.lock.json"
MODEL_MANIFEST_PATH = BENCHMARK_DIR / "semantic_model_candidates_v1.json"

REQUIRED_SCENARIO_TAGS = frozenset(
    {
        "exact_alias",
        "synonyms",
        "framework_relationship",
        "backend_api_transfer",
        "cloud_relationship",
        "containerization_docker",
        "database_relationship",
        "frontend_framework",
        "ml_nlp",
        "seniority_mismatch",
        "java_javascript",
        "react_react_native",
        "sql_database_engineering",
        "python_scripting_ml",
        "aws_exposure_architecture",
        "generic_ai_demonstrated_ml",
        "docker_kubernetes",
        "frontend_backend_mismatch",
    }
)


def canonical_json_bytes(path: Path | str = BENCHMARK_PATH) -> bytes:
    """Return stable canonical bytes for a JSON artifact."""

    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    return json.dumps(raw, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def sha256_json(path: Path | str = BENCHMARK_PATH) -> str:
    return hashlib.sha256(canonical_json_bytes(path)).hexdigest()


def load_benchmark_lock(path: Path | str = LOCK_PATH) -> dict[str, Any]:
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise EvaluationFixtureValidationError("benchmark lock must be an object")
    return raw


def load_frozen_benchmark(
    fixture_path: Path | str = BENCHMARK_PATH,
    lock_path: Path | str = LOCK_PATH,
) -> EvaluationFixture:
    """Load benchmark v1 only when its contents and locked invariants match."""

    fixture = load_evaluation_fixture_file(fixture_path)
    lock = load_benchmark_lock(lock_path)
    checksum = sha256_json(fixture_path)
    if lock.get("fixture_sha256") != checksum:
        raise EvaluationFixtureValidationError("benchmark fixture checksum does not match the lock manifest")
    validate_semantic_benchmark(fixture, lock)
    return fixture


def validate_semantic_benchmark(fixture: EvaluationFixture, lock: dict[str, Any] | None = None) -> None:
    """Enforce R1 benchmark-v1 size, split, direction, metadata, and coverage."""

    if fixture.benchmark_version != "1":
        raise EvaluationFixtureValidationError("semantic benchmark must declare benchmark_version '1'")
    if len(fixture.queries) != 24:
        raise EvaluationFixtureValidationError("semantic benchmark v1 must contain exactly 24 queries")

    query_ids: dict[BenchmarkSplit, list[str]] = {split: [] for split in BenchmarkSplit}
    direction_counts = {
        split: {direction: 0 for direction in EvaluationQueryType}
        for split in BenchmarkSplit
    }
    case_ids: set[str] = set()
    seen_query_ids: set[str] = set()
    covered_tags: set[str] = set()
    covered_tags_by_split: dict[BenchmarkSplit, set[str]] = {split: set() for split in BenchmarkSplit}
    judgment_count = 0

    for query in fixture.queries:
        if query.query_id in seen_query_ids:
            raise EvaluationFixtureValidationError(f"duplicate benchmark query_id {query.query_id!r}")
        seen_query_ids.add(query.query_id)
        if query.split is None:
            raise EvaluationFixtureValidationError(f"query {query.query_id!r} is missing its locked split")
        if len(query.candidate_entities) != 5 or len(query.judgments) != 5:
            raise EvaluationFixtureValidationError(f"query {query.query_id!r} must have exactly five candidates and judgments")
        if not query.is_complete_judgment_set:
            raise EvaluationFixtureValidationError(f"query {query.query_id!r} must have complete judgments")
        query_ids[query.split].append(query.query_id)
        direction_counts[query.split][query.query_type] += 1
        if {int(judgment.relevance_label) for judgment in query.judgments} != {0, 1, 2}:
            raise EvaluationFixtureValidationError(
                f"query {query.query_id!r} must contain strong, partial, and hard-negative judgments"
            )

        for judgment in query.judgments:
            judgment_count += 1
            if not judgment.case_id or not judgment.rationale or not judgment.scenario_tags:
                raise EvaluationFixtureValidationError(
                    f"judgment for {judgment.candidate_id!r} must include case_id, rationale, and scenario_tags"
                )
            if judgment.case_id in case_ids:
                raise EvaluationFixtureValidationError(f"duplicate benchmark case_id {judgment.case_id!r}")
            case_ids.add(judgment.case_id)
            covered_tags.update(judgment.scenario_tags)
            covered_tags_by_split[query.split].update(judgment.scenario_tags)

    if judgment_count != 120:
        raise EvaluationFixtureValidationError("semantic benchmark v1 must contain exactly 120 judgments")
    if len(query_ids[BenchmarkSplit.SELECTION]) != 16 or len(query_ids[BenchmarkSplit.HOLDOUT]) != 8:
        raise EvaluationFixtureValidationError("semantic benchmark split must be 16 selection and 8 holdout queries")
    expected_directions = {
        BenchmarkSplit.SELECTION: 8,
        BenchmarkSplit.HOLDOUT: 4,
    }
    for split, expected in expected_directions.items():
        if any(count != expected for count in direction_counts[split].values()):
            raise EvaluationFixtureValidationError(
                f"{split.value} split must contain {expected} queries in each ranking direction"
            )
    missing_tags = sorted(REQUIRED_SCENARIO_TAGS - covered_tags)
    if missing_tags:
        raise EvaluationFixtureValidationError(f"semantic benchmark is missing scenario coverage: {', '.join(missing_tags)}")
    for split, split_tags in covered_tags_by_split.items():
        missing_split_tags = sorted(REQUIRED_SCENARIO_TAGS - split_tags)
        if missing_split_tags:
            raise EvaluationFixtureValidationError(
                f"{split.value} split is missing scenario coverage: {', '.join(missing_split_tags)}"
            )

    if lock is not None:
        _validate_lock(fixture, lock, query_ids, judgment_count)


def fixture_for_split(fixture: EvaluationFixture, split: BenchmarkSplit) -> EvaluationFixture:
    """Return an in-memory fixture containing only one locked query partition."""

    return replace(
        fixture,
        fixture_id=f"{fixture.fixture_id}:{split.value}",
        queries=tuple(query for query in fixture.queries if query.split is split),
    )


def _validate_lock(
    fixture: EvaluationFixture,
    lock: dict[str, Any],
    query_ids: dict[BenchmarkSplit, list[str]],
    judgment_count: int,
) -> None:
    expected = {
        "schema_version": 1,
        "benchmark_version": "1",
        "fixture_id": fixture.fixture_id,
        "query_count": len(fixture.queries),
        "judgment_count": judgment_count,
        "selection_query_ids": query_ids[BenchmarkSplit.SELECTION],
        "holdout_query_ids": query_ids[BenchmarkSplit.HOLDOUT],
        "direction_counts": {
            split.value: {
                direction.value: sum(
                    1
                    for query in fixture.queries
                    if query.split is split and query.query_type is direction
                )
                for direction in EvaluationQueryType
            }
            for split in BenchmarkSplit
        },
        "required_scenario_tags": sorted(REQUIRED_SCENARIO_TAGS),
    }
    for key, value in expected.items():
        if lock.get(key) != value:
            raise EvaluationFixtureValidationError(f"benchmark lock field {key!r} does not match the fixture")


__all__ = [
    "BENCHMARK_PATH",
    "LOCK_PATH",
    "MODEL_MANIFEST_PATH",
    "REQUIRED_SCENARIO_TAGS",
    "canonical_json_bytes",
    "fixture_for_split",
    "load_benchmark_lock",
    "load_frozen_benchmark",
    "sha256_json",
    "validate_semantic_benchmark",
]
