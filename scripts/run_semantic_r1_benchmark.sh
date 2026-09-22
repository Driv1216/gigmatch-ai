#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 selection --output DIR | holdout --decision FILE --output DIR" >&2
  exit 2
}

if [[ $# -lt 3 ]]; then
  usage
fi

phase="$1"
shift
decision=""
output=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --decision)
      [[ $# -ge 2 ]] || usage
      decision="$2"
      shift 2
      ;;
    --output)
      [[ $# -ge 2 ]] || usage
      output="$2"
      shift 2
      ;;
    *)
      usage
      ;;
  esac
done

if [[ "$phase" != "selection" && "$phase" != "holdout" ]]; then
  usage
fi
if [[ -z "$output" ]]; then
  usage
fi
if [[ "$phase" == "selection" && -n "$decision" ]]; then
  echo "Selection does not accept a decision artifact." >&2
  exit 2
fi
if [[ "$phase" == "holdout" && -z "$decision" ]]; then
  echo "Holdout requires --decision and accepts no model or weight overrides." >&2
  exit 2
fi

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
backend_dir="$repo_dir/backend"
venv_dir="$repo_dir/.venv-r1-semantic"
cache_dir="$repo_dir/.r1-model-cache"
python_bin="$venv_dir/bin/python"

if ! command -v python3.13 >/dev/null 2>&1; then
  echo "Python 3.13 is required for the controlled R1 benchmark runtime." >&2
  exit 1
fi

# Verify the frozen fixture with Python's standard library before installing
# dependencies or allowing any model repository access.
python3.13 - "$backend_dir/app/evaluation/benchmarks/semantic_matching_benchmark_v1.json" \
  "$backend_dir/app/evaluation/benchmarks/semantic_matching_benchmark_v1.lock.json" <<'PY'
import hashlib
import json
import pathlib
import sys

fixture_path = pathlib.Path(sys.argv[1])
lock_path = pathlib.Path(sys.argv[2])
fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
lock = json.loads(lock_path.read_text(encoding="utf-8"))
canonical = json.dumps(fixture, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
checksum = hashlib.sha256(canonical).hexdigest()
if checksum != lock.get("fixture_sha256"):
    raise SystemExit("Frozen benchmark v1 checksum mismatch; refusing benchmark execution.")
print(f"benchmark_sha256={checksum}")
PY

if [[ ! -x "$python_bin" ]]; then
  python3.13 -m venv "$venv_dir"
fi

output_path="$repo_dir/$output"
run_log="$(mktemp -t semantic-r1-run.XXXXXX)"
set +e
{
  "$python_bin" -m pip install --disable-pip-version-check --require-hashes \
    -r "$backend_dir/requirements-semantic-benchmark.lock"

  mkdir -p "$cache_dir"
  cd "$backend_dir"

  # This model-free gate runs before SentenceTransformer is instantiated, so a
  # fixture, lock, candidate revision, policy, or weight mismatch fails closed.
  "$python_bin" -m app.evaluation.semantic_benchmark verify

  if [[ "$phase" == "selection" ]]; then
    "$python_bin" -m app.evaluation.semantic_benchmark selection \
      --output "$output_path" \
      --cache-dir "$cache_dir"
  else
    "$python_bin" -m app.evaluation.semantic_benchmark holdout \
      --decision "$repo_dir/$decision" \
      --output "$output_path" \
      --cache-dir "$cache_dir"
  fi
} 2>&1 | tee "$run_log"
run_status=${PIPESTATUS[0]}
set -e

if [[ $run_status -ne 0 ]]; then
  echo "R1 $phase failed; captured log remains at $run_log" >&2
  exit "$run_status"
fi

mv "$run_log" "$output_path/run.log"
(
  cd "$output_path"
  shasum -a 256 run.log >> checksums.sha256
)
echo "R1 $phase artifacts written to $output_path"
