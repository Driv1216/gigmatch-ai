"""Locked R1 semantic benchmark command-line runner.

The selection command evaluates the complete candidate matrix only on the
selection split. The holdout command accepts no model or weight overrides and
requires a checksummed selection decision created after selection review.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import platform
import resource
import subprocess
import sys
import time
from dataclasses import replace
from pathlib import Path
from typing import Any

from app.evaluation.benchmark import (
    LOCK_PATH,
    MODEL_MANIFEST_PATH,
    fixture_for_split,
    load_frozen_benchmark,
    sha256_json,
)
from app.evaluation.contracts import BenchmarkSplit, EvaluationFixture, EvaluationQuery, EvaluationQueryType
from app.evaluation.fixtures import EvaluationFixtureValidationError
from app.evaluation.metrics import (
    MetricResult,
    average_precision,
    graded_pairwise_inversion_rate,
    ndcg_at_k,
    precision_at_k,
    recall_at_k,
)
from app.matching import (
    EmbeddingInputPolicy,
    FreelancerMatchProfile,
    GigMatchProfile,
    SentenceTransformerEmbeddingProvider,
    combine_hybrid_score,
    rank_freelancers_for_gig,
    rank_freelancers_for_gig_semantic,
    rank_gigs_for_freelancer,
    rank_gigs_for_freelancer_semantic,
)

SCHEMA_VERSION = 1
TOP_KS = (1, 3, 5)
RECALL_KS = (3, 5)
DEFAULT_REQUIREMENTS_PATH = Path(__file__).resolve().parents[2] / "requirements-semantic-benchmark.lock"


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)
    try:
        if args.command == "verify":
            _verify_inputs()
            print(f"benchmark_sha256={sha256_json()}")
            return 0
        if args.command == "selection":
            return _run_selection(args)
        if args.command == "selection-worker":
            return _run_selection_worker(args)
        if args.command == "holdout":
            return _run_holdout(args)
    except (EvaluationFixtureValidationError, ValueError, OSError, json.JSONDecodeError) as error:
        parser.exit(2, f"semantic-r1: {error}\n")
    parser.error("unknown command")
    return 2


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run the locked R1 semantic benchmark")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("verify", help="verify frozen fixture and manifests without loading a model")

    selection = subparsers.add_parser("selection", help="run the four-model matrix on selection only")
    selection.add_argument("--output", required=True, type=Path)
    selection.add_argument("--cache-dir", required=True, type=Path)

    worker = subparsers.add_parser("selection-worker", help=argparse.SUPPRESS)
    worker.add_argument("--model-id", required=True)
    worker.add_argument("--output", required=True, type=Path)
    worker.add_argument("--cache-dir", required=True, type=Path)

    holdout = subparsers.add_parser("holdout", help="run one frozen configuration on holdout once")
    holdout.add_argument("--decision", required=True, type=Path)
    holdout.add_argument("--output", required=True, type=Path)
    holdout.add_argument("--cache-dir", required=True, type=Path)
    return parser


def _verify_inputs() -> tuple[EvaluationFixture, dict[str, Any], str]:
    fixture = load_frozen_benchmark()
    manifest = _load_model_manifest()
    dependency_sha = _sha256_file(DEFAULT_REQUIREMENTS_PATH)
    if manifest.get("schema_version") != SCHEMA_VERSION:
        raise ValueError("model manifest schema_version must be 1")
    execution = manifest.get("execution")
    if execution != {"device": "cpu", "trust_remote_code": False}:
        raise ValueError("model manifest must lock CPU execution with trust_remote_code=false")
    models = manifest.get("models")
    if not isinstance(models, list) or len(models) != 4:
        raise ValueError("model manifest must contain exactly four candidates")
    seen: set[str] = set()
    for model in models:
        if not isinstance(model, dict):
            raise ValueError("each model manifest entry must be an object")
        model_id = model.get("model_id")
        revision = model.get("revision")
        policy = model.get("input_policy")
        if not isinstance(model_id, str) or not model_id or model_id in seen:
            raise ValueError("model ids must be non-empty and unique")
        if not isinstance(revision, str) or len(revision) != 40:
            raise ValueError(f"model {model_id!r} must pin a full 40-character revision")
        EmbeddingInputPolicy(policy)
        seen.add(model_id)
    _weight_sweep(manifest)
    return fixture, manifest, dependency_sha


def _run_selection(args: argparse.Namespace) -> int:
    fixture, manifest, dependency_sha = _verify_inputs()
    output = _prepare_new_output_directory(args.output)
    cache_dir = args.cache_dir.resolve()
    cache_dir.mkdir(parents=True, exist_ok=True)

    selection_fixture = fixture_for_split(fixture, BenchmarkSplit.SELECTION)
    keyword = _evaluate_keyword_fixture(selection_fixture)
    _write_json(output / "keyword-baseline.json", _artifact_envelope("selection", dependency_sha, keyword))

    worker_files: list[Path] = []
    for index, model in enumerate(manifest["models"], start=1):
        worker_path = output / f"model-{index}.json"
        command = [
            sys.executable,
            "-m",
            "app.evaluation.semantic_benchmark",
            "selection-worker",
            "--model-id",
            model["model_id"],
            "--output",
            str(worker_path),
            "--cache-dir",
            str(cache_dir),
        ]
        completed = subprocess.run(command, check=False)
        if completed.returncode != 0:
            raise RuntimeError(f"selection worker failed for {model['model_id']!r} with exit code {completed.returncode}")
        worker_files.append(worker_path)

    model_results = [_read_json(path) for path in worker_files]
    result = _artifact_envelope(
        "selection",
        dependency_sha,
        {
            "query_count": len(selection_fixture.queries),
            "judgment_count": sum(len(query.judgments) for query in selection_fixture.queries),
            "keyword_baseline": keyword,
            "model_results": model_results,
        },
    )
    _write_json(output / "selection-results.json", result)
    _write_json(output / "environment.json", _environment_manifest(dependency_sha))
    _write_checksums(output)
    return 0


def _run_selection_worker(args: argparse.Namespace) -> int:
    fixture, manifest, dependency_sha = _verify_inputs()
    model = _model_entry(manifest, args.model_id)
    started_rss = _peak_rss_bytes()
    started = time.perf_counter()
    try:
        provider = SentenceTransformerEmbeddingProvider(
            model["model_id"],
            revision=model["revision"],
            input_policy=EmbeddingInputPolicy(model["input_policy"]),
            cache_folder=str(args.cache_dir.resolve()),
        )
        load_seconds = time.perf_counter() - started
        selection_fixture = fixture_for_split(fixture, BenchmarkSplit.SELECTION)
        measurements = _runtime_measurements(provider, selection_fixture, args.cache_dir, started_rss, load_seconds)
        evaluation = _evaluate_model_fixture(selection_fixture, provider, _weight_sweep(manifest))
        payload: dict[str, Any] = {
            "status": "ok",
            "model": model,
            "runtime": measurements,
            "evaluation": evaluation,
        }
    except Exception as error:  # preserve provider/model failure evidence for selection rejection
        payload = {
            "status": "failed",
            "model": model,
            "failure_type": type(error).__name__,
            "failure_message": str(error),
            "runtime": {
                "cold_load_seconds": time.perf_counter() - started,
                "peak_rss_bytes": _peak_rss_bytes(),
            },
        }
    _write_json(args.output, _artifact_envelope("selection", dependency_sha, payload))
    return 0


def _run_holdout(args: argparse.Namespace) -> int:
    fixture, manifest, dependency_sha = _verify_inputs()
    decision = _load_and_validate_decision(args.decision, manifest, dependency_sha)
    output = _prepare_new_output_directory(args.output)
    selected = decision["selected_configuration"]
    model = _model_entry(manifest, selected["model_id"])
    provider = SentenceTransformerEmbeddingProvider(
        model["model_id"],
        revision=model["revision"],
        input_policy=EmbeddingInputPolicy(model["input_policy"]),
        cache_folder=str(args.cache_dir.resolve()),
        local_files_only=True,
    )
    holdout_fixture = fixture_for_split(fixture, BenchmarkSplit.HOLDOUT)
    keyword = _evaluate_keyword_fixture(holdout_fixture)
    evaluation = _evaluate_model_fixture(
        holdout_fixture,
        provider,
        ((float(selected["keyword_weight"]), float(selected["semantic_weight"])),),
    )
    result = _artifact_envelope(
        "holdout",
        dependency_sha,
        {
            "decision_sha256": decision["decision_sha256"],
            "query_count": len(holdout_fixture.queries),
            "judgment_count": sum(len(query.judgments) for query in holdout_fixture.queries),
            "keyword_baseline": keyword,
            "selected_model_result": evaluation,
        },
    )
    _write_json(output / "holdout-results.json", result)
    _write_json(output / "environment.json", _environment_manifest(dependency_sha))
    _write_checksums(output)
    return 0


def _evaluate_keyword_fixture(fixture: EvaluationFixture) -> dict[str, Any]:
    query_results = []
    for query in fixture.queries:
        ranked = _keyword_ranking(query)
        query_results.append(_query_result(query, [(item.candidate_id, item.keyword_score) for item in ranked]))
    return {"aggregate_metrics": _aggregate_metrics(query_results), "queries": query_results}


def _evaluate_model_fixture(
    fixture: EvaluationFixture,
    provider: SentenceTransformerEmbeddingProvider,
    weights: tuple[tuple[float, float], ...],
) -> dict[str, Any]:
    semantic_queries: list[dict[str, Any]] = []
    hybrid_queries: dict[str, list[dict[str, Any]]] = {_weight_key(*pair): [] for pair in weights}
    failure_analysis: list[dict[str, Any]] = []

    for query in fixture.queries:
        keyword = _keyword_ranking(query)
        semantic = _semantic_ranking(query, provider)
        keyword_scores = {item.candidate_id: item.keyword_score for item in keyword}
        semantic_scores = {item.candidate_id: item.semantic_score for item in semantic}
        semantic_result = _query_result(query, [(item.candidate_id, item.semantic_score) for item in semantic])
        semantic_components = {item.candidate_id: item for item in semantic}
        for candidate in semantic_result["ranked_candidates"]:
            component = semantic_components[candidate["candidate_id"]]
            candidate["semantic_score"] = component.semantic_score
            candidate["raw_cosine_similarity"] = component.raw_cosine_similarity
            candidate["vector_dimension"] = component.vector_dimension
        semantic_queries.append(semantic_result)

        keyword_ranks = {item.candidate_id: item.rank for item in keyword}
        semantic_ranks = {item.candidate_id: item.rank for item in semantic}
        keyword_result = _query_result(
            query,
            [(item.candidate_id, item.keyword_score) for item in keyword],
        )
        failures = _failure_flags(
            query,
            keyword_ranks,
            semantic_ranks,
            keyword_result,
            semantic_result,
            strategy="semantic_only",
        )
        if failures:
            failure_analysis.extend(failures)

        for keyword_weight, semantic_weight in weights:
            combined = [
                (
                    candidate_id,
                    combine_hybrid_score(
                        keyword_scores[candidate_id],
                        semantic_scores[candidate_id],
                        _hybrid_config(keyword_weight, semantic_weight),
                    ),
                    keyword_scores[candidate_id],
                    semantic_scores[candidate_id],
                )
                for candidate_id in keyword_scores
            ]
            combined.sort(key=lambda row: (-row[1], -row[2], -row[3], row[0]))
            weight_key = _weight_key(keyword_weight, semantic_weight)
            hybrid_result = _query_result(
                query,
                [(candidate_id, score) for candidate_id, score, _, _ in combined],
            )
            for candidate in hybrid_result["ranked_candidates"]:
                candidate_id = candidate["candidate_id"]
                candidate["hybrid_score"] = candidate["score"]
                candidate["keyword_score"] = keyword_scores[candidate_id]
                candidate["semantic_score"] = semantic_scores[candidate_id]
            hybrid_queries[weight_key].append(hybrid_result)
            hybrid_ranks = {
                candidate_id: rank
                for rank, (candidate_id, _, _, _) in enumerate(combined, start=1)
            }
            failure_analysis.extend(
                _failure_flags(
                    query,
                    keyword_ranks,
                    hybrid_ranks,
                    keyword_result,
                    hybrid_result,
                    strategy=weight_key,
                )
            )

    return {
        "semantic_only": {
            "aggregate_metrics": _aggregate_metrics(semantic_queries),
            "queries": semantic_queries,
        },
        "hybrid_by_weight": {
            key: {"aggregate_metrics": _aggregate_metrics(results), "queries": results}
            for key, results in hybrid_queries.items()
        },
        "failure_analysis": failure_analysis,
    }


def _query_result(query: EvaluationQuery, scored_ids: list[tuple[str, float]]) -> dict[str, Any]:
    ranked_ids = [candidate_id for candidate_id, _ in scored_ids]
    labels = {judgment.candidate_id: int(judgment.relevance_label) for judgment in query.judgments}
    metrics = _metric_bundle(ranked_ids, query)
    return {
        "query_id": query.query_id,
        "query_type": query.query_type.value,
        "ranked_candidates": [
            {
                "candidate_id": candidate_id,
                "rank": index,
                "score": score,
                "relevance_label": labels[candidate_id],
            }
            for index, (candidate_id, score) in enumerate(scored_ids, start=1)
        ],
        "metrics": metrics,
    }


def _metric_bundle(ranked_ids: list[str], query: EvaluationQuery) -> dict[str, Any]:
    results: list[MetricResult] = []
    for k in TOP_KS:
        results.append(precision_at_k(ranked_ids, query.judgments, k))
        results.append(ndcg_at_k(ranked_ids, query.judgments, k))
    for k in RECALL_KS:
        results.append(recall_at_k(ranked_ids, query.judgments, query.is_complete_judgment_set, k))
    results.append(average_precision(ranked_ids, query.judgments, query.is_complete_judgment_set))
    results.append(graded_pairwise_inversion_rate(ranked_ids, query.judgments))
    return {_metric_key(result): _metric_json(result) for result in results}


def _aggregate_metrics(query_results: list[dict[str, Any]]) -> dict[str, Any]:
    metric_keys = tuple(query_results[0]["metrics"]) if query_results else ()
    aggregate: dict[str, Any] = {}
    for key in metric_keys:
        values = [query["metrics"][key]["value"] for query in query_results if query["metrics"][key]["available"]]
        aggregate_key = _aggregate_metric_key(key)
        aggregate[aggregate_key] = {
            "value": sum(values) / len(values) if values else None,
            "available": bool(values),
            "included_query_count": len(values),
            "total_query_count": len(query_results),
        }
    return aggregate


def _aggregate_metric_key(query_metric_key: str) -> str:
    if query_metric_key == "average_precision":
        return "mean_average_precision"
    if query_metric_key == "graded_pairwise_inversion_rate":
        return "mean_graded_pairwise_inversion_rate"
    return f"mean_{query_metric_key}"


def _failure_flags(
    query: EvaluationQuery,
    keyword_ranks: dict[str, int],
    compared_ranks: dict[str, int],
    keyword_result: dict[str, Any],
    semantic_result: dict[str, Any],
    *,
    strategy: str,
) -> list[dict[str, Any]]:
    labels = {judgment.candidate_id: int(judgment.relevance_label) for judgment in query.judgments}
    tags = {judgment.candidate_id: set(judgment.scenario_tags) for judgment in query.judgments}
    flags: list[dict[str, Any]] = []
    for candidate_id in keyword_ranks:
        rank_delta = compared_ranks[candidate_id] - keyword_ranks[candidate_id]
        reasons: list[str] = []
        if abs(rank_delta) >= 2:
            reasons.append("rank_delta_at_least_2")
        if labels[candidate_id] == 0 and compared_ranks[candidate_id] == 1:
            reasons.append("label_0_ranked_first")
        if "exact_alias" in tags[candidate_id] and rank_delta >= 2:
            reasons.append("semantic_loss_of_exact_skill_evidence")
        if labels[candidate_id] == 0 and tags[candidate_id] & {"seniority_mismatch", "frontend_backend_mismatch"}:
            if compared_ranks[candidate_id] < keyword_ranks[candidate_id]:
                reasons.append("seniority_or_domain_inversion")
        if reasons:
            flags.append(
                {
                    "query_id": query.query_id,
                    "strategy": strategy,
                    "candidate_id": candidate_id,
                    "reasons": reasons,
                }
            )
    ordered = [candidate["candidate_id"] for candidate in semantic_result["ranked_candidates"]]
    for lower_index, lower_id in enumerate(ordered):
        if labels[lower_id] != 0:
            continue
        higher_twos = [candidate_id for candidate_id in ordered[lower_index + 1 :] if labels[candidate_id] == 2]
        for higher_id in higher_twos:
            flags.append(
                {
                    "query_id": query.query_id,
                    "strategy": strategy,
                    "candidate_id": lower_id,
                    "higher_relevance_candidate_id": higher_id,
                    "reasons": ["label_0_above_label_2"],
                }
            )
    keyword_ndcg3 = keyword_result["metrics"]["ndcg_at_k@3"]["value"]
    semantic_ndcg3 = semantic_result["metrics"]["ndcg_at_k@3"]["value"]
    if keyword_ndcg3 is not None and semantic_ndcg3 is not None and abs(semantic_ndcg3 - keyword_ndcg3) >= 0.15:
        flags.append(
            {
                "query_id": query.query_id,
                "strategy": strategy,
                "reasons": ["ndcg_at_3_delta_at_least_0.15"],
                "keyword_ndcg_at_3": keyword_ndcg3,
                "semantic_ndcg_at_3": semantic_ndcg3,
                "delta": semantic_ndcg3 - keyword_ndcg3,
            }
        )
    return flags


def _keyword_ranking(query: EvaluationQuery) -> list[Any]:
    if query.query_type is EvaluationQueryType.FREELANCER_TO_GIGS:
        return rank_gigs_for_freelancer(_freelancer(query.query_entity), [_gig(item) for item in query.candidate_entities])
    return rank_freelancers_for_gig(_gig(query.query_entity), [_freelancer(item) for item in query.candidate_entities])


def _semantic_ranking(query: EvaluationQuery, provider: SentenceTransformerEmbeddingProvider) -> list[Any]:
    if query.query_type is EvaluationQueryType.FREELANCER_TO_GIGS:
        return rank_gigs_for_freelancer_semantic(
            _freelancer(query.query_entity),
            [_gig(item) for item in query.candidate_entities],
            provider,
        )
    return rank_freelancers_for_gig_semantic(
        _gig(query.query_entity),
        [_freelancer(item) for item in query.candidate_entities],
        provider,
    )


def _runtime_measurements(
    provider: SentenceTransformerEmbeddingProvider,
    fixture: EvaluationFixture,
    cache_dir: Path,
    baseline_rss: int,
    cold_load_seconds: float,
) -> dict[str, Any]:
    first_query = fixture.queries[0]
    canonical_query, canonical_candidates = _canonical_texts(first_query)
    prepared_query = provider.prepare_query_text(canonical_query)
    prepared_candidates = [provider.prepare_candidate_text(text) for text in canonical_candidates]
    single_seconds = _time_call(lambda: provider.encode(prepared_query), repeats=3)
    batch_seconds = _time_call(lambda: provider.encode_batch([prepared_query, *prepared_candidates]), repeats=3)
    observed_vectors = provider.encode_batch([prepared_query, prepared_candidates[0]])
    ranking_10 = _time_call(lambda: _semantic_ranking(_expanded_query(first_query, 10), provider), repeats=1)
    ranking_50 = _time_call(lambda: _semantic_ranking(_expanded_query(first_query, 50), provider), repeats=1)
    return {
        "cold_load_seconds": cold_load_seconds,
        "observed_dimension": len(observed_vectors[0]),
        "warm_single_encode_seconds_mean": single_seconds,
        "warm_query_plus_5_batch_seconds_mean": batch_seconds,
        "ranking_10_candidates_seconds": ranking_10,
        "ranking_50_candidates_seconds": ranking_50,
        "baseline_rss_bytes": baseline_rss,
        "peak_rss_bytes": _peak_rss_bytes(),
        "model_cache_bytes": _model_cache_size(cache_dir, provider.model_name),
    }


def _canonical_texts(query: EvaluationQuery) -> tuple[str, list[str]]:
    from app.matching import build_freelancer_embedding_text, build_gig_embedding_text

    if query.query_type is EvaluationQueryType.FREELANCER_TO_GIGS:
        return (
            build_freelancer_embedding_text(_freelancer(query.query_entity)),
            [build_gig_embedding_text(_gig(item)) for item in query.candidate_entities],
        )
    return (
        build_gig_embedding_text(_gig(query.query_entity)),
        [build_freelancer_embedding_text(_freelancer(item)) for item in query.candidate_entities],
    )


def _expanded_query(query: EvaluationQuery, count: int) -> EvaluationQuery:
    expanded = []
    for index in range(count):
        source = query.candidate_entities[index % len(query.candidate_entities)]
        if isinstance(source, GigMatchProfile):
            expanded.append(replace(source, gig_id=f"{source.gig_id}-runtime-{index}"))
        else:
            expanded.append(replace(source, freelancer_id=f"{source.freelancer_id}-runtime-{index}"))
    return replace(query, candidate_entities=tuple(expanded), judgments=(), is_complete_judgment_set=False)


def _load_and_validate_decision(path: Path, manifest: dict[str, Any], dependency_sha: str) -> dict[str, Any]:
    decision = _read_json(path)
    if decision.get("schema_version") != SCHEMA_VERSION or decision.get("status") != "frozen":
        raise ValueError("holdout requires a schema-v1 frozen selection decision")
    if decision.get("benchmark_sha256") != sha256_json():
        raise ValueError("decision benchmark checksum does not match frozen benchmark v1")
    if decision.get("dependency_lock_sha256") != dependency_sha:
        raise ValueError("decision dependency-lock checksum does not match")
    if decision.get("benchmark_lock_sha256") != _sha256_file(LOCK_PATH):
        raise ValueError("decision benchmark-lock checksum does not match")
    if decision.get("model_manifest_sha256") != _sha256_file(MODEL_MANIFEST_PATH):
        raise ValueError("decision model-manifest checksum does not match")
    if not _is_sha256(decision.get("selection_results_sha256")):
        raise ValueError("decision must identify the reviewed selection-results checksum")
    if not isinstance(decision.get("selection_metrics"), dict) or not decision["selection_metrics"]:
        raise ValueError("decision must preserve the selection metrics used for selection")
    if not isinstance(decision.get("rationale"), str) or not decision["rationale"].strip():
        raise ValueError("decision must include a non-empty selection rationale")
    if not isinstance(decision.get("rejected_alternatives"), list):
        raise ValueError("decision must record rejected alternatives")
    if decision.get("holdout_reselection_prohibited") is not True:
        raise ValueError("decision must explicitly prohibit reselection from holdout")
    supplied_sha = decision.get("decision_sha256")
    calculated_sha = decision_sha256(decision)
    if supplied_sha != calculated_sha:
        raise ValueError("decision checksum is invalid")
    selected = decision.get("selected_configuration")
    if not isinstance(selected, dict):
        raise ValueError("decision must contain exactly one selected_configuration")
    model = _model_entry(manifest, selected.get("model_id"))
    for key in ("revision", "input_policy"):
        if selected.get(key) != model[key]:
            raise ValueError(f"decision selected {key} does not match the locked model manifest")
    pair = (float(selected.get("keyword_weight")), float(selected.get("semantic_weight")))
    if pair not in _weight_sweep(manifest):
        raise ValueError("decision selected weight is outside the predefined sweep")
    return decision


def decision_sha256(decision: dict[str, Any]) -> str:
    """Calculate a decision checksum without its self-referential field."""

    unsigned = {key: value for key, value in decision.items() if key != "decision_sha256"}
    return hashlib.sha256(_canonical_bytes(unsigned)).hexdigest()


def _artifact_envelope(split: str, dependency_sha: str, payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "benchmark_version": "1",
        "benchmark_sha256": sha256_json(),
        "benchmark_lock_sha256": _sha256_file(LOCK_PATH),
        "model_manifest_sha256": _sha256_file(MODEL_MANIFEST_PATH),
        "dependency_lock_sha256": dependency_sha,
        "split": split,
        "payload": payload,
    }


def _environment_manifest(dependency_sha: str) -> dict[str, Any]:
    packages = {}
    for name in ("sentence-transformers", "transformers", "huggingface-hub", "torch", "numpy"):
        try:
            packages[name] = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            packages[name] = None
    return {
        "python": sys.version,
        "platform": platform.platform(),
        "machine": platform.machine(),
        "processor": platform.processor(),
        "packages": packages,
        "dependency_lock_sha256": dependency_sha,
    }


def _load_model_manifest() -> dict[str, Any]:
    return _read_json(MODEL_MANIFEST_PATH)


def _model_entry(manifest: dict[str, Any], model_id: object) -> dict[str, Any]:
    matches = [model for model in manifest["models"] if model["model_id"] == model_id]
    if len(matches) != 1:
        raise ValueError(f"model {model_id!r} is not exactly one locked candidate")
    return matches[0]


def _weight_sweep(manifest: dict[str, Any]) -> tuple[tuple[float, float], ...]:
    raw = manifest.get("weight_sweep")
    if not isinstance(raw, list):
        raise ValueError("model manifest weight_sweep must be an array")
    weights = tuple((float(pair[0]), float(pair[1])) for pair in raw if isinstance(pair, list) and len(pair) == 2)
    expected = ((1.0, 0.0), (0.75, 0.25), (0.65, 0.35), (0.55, 0.45), (0.5, 0.5), (0.4, 0.6), (0.25, 0.75), (0.0, 1.0))
    if weights != expected:
        raise ValueError("model manifest weight_sweep does not match the locked R1 sweep")
    return weights


def _hybrid_config(keyword_weight: float, semantic_weight: float) -> Any:
    from app.matching import HybridRankingConfig

    return HybridRankingConfig(keyword_weight=keyword_weight, semantic_weight=semantic_weight)


def _metric_key(metric: MetricResult) -> str:
    return metric.metric_name if metric.k is None else f"{metric.metric_name}@{metric.k}"


def _metric_json(metric: MetricResult) -> dict[str, Any]:
    return {
        "value": metric.value,
        "available": metric.is_available,
        "reason": metric.reason,
        "details": metric.details,
    }


def _weight_key(keyword_weight: float, semantic_weight: float) -> str:
    return f"keyword_{keyword_weight:.2f}_semantic_{semantic_weight:.2f}"


def _freelancer(value: object) -> FreelancerMatchProfile:
    if not isinstance(value, FreelancerMatchProfile):
        raise TypeError("benchmark entity type does not match freelancer direction")
    return value


def _gig(value: object) -> GigMatchProfile:
    if not isinstance(value, GigMatchProfile):
        raise TypeError("benchmark entity type does not match gig direction")
    return value


def _time_call(function: Any, *, repeats: int) -> float:
    timings = []
    for _ in range(repeats):
        started = time.perf_counter()
        function()
        timings.append(time.perf_counter() - started)
    return sum(timings) / len(timings)


def _peak_rss_bytes() -> int:
    value = int(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss)
    return value if sys.platform == "darwin" else value * 1024


def _directory_size(path: Path) -> int:
    total = 0
    seen_files: set[tuple[int, int]] = set()
    for item in path.rglob("*"):
        if not item.is_file():
            continue
        stat = item.stat()
        identity = (stat.st_dev, stat.st_ino)
        if identity in seen_files:
            continue
        seen_files.add(identity)
        total += stat.st_size
    return total


def _model_cache_size(cache_dir: Path, model_id: str) -> int:
    model_root = cache_dir / f"models--{model_id.replace('/', '--')}"
    return _directory_size(model_root) if model_root.exists() else _directory_size(cache_dir)


def _prepare_new_output_directory(path: Path) -> Path:
    resolved = path.resolve()
    if resolved.exists() and any(resolved.iterdir()):
        raise ValueError(f"output directory must be absent or empty: {resolved}")
    resolved.mkdir(parents=True, exist_ok=True)
    return resolved


def _write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True, ensure_ascii=False) + "\n", encoding="utf-8")


def _read_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"JSON artifact must contain an object: {path}")
    return value


def _write_checksums(output: Path) -> None:
    lines = [
        f"{_sha256_file(path)}  {path.relative_to(output)}"
        for path in sorted(output.rglob("*"))
        if path.is_file() and path.name != "checksums.sha256"
    ]
    (output / "checksums.sha256").write_text("\n".join(lines) + "\n", encoding="utf-8")


def _sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _canonical_bytes(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def _is_sha256(value: object) -> bool:
    if not isinstance(value, str) or len(value) != 64:
        return False
    return all(character in "0123456789abcdef" for character in value)


if __name__ == "__main__":
    raise SystemExit(main())
