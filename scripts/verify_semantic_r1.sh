#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
backend_dir="$repo_dir/backend"
frontend_dir="$repo_dir/frontend"
python313="$repo_dir/.venv-r1-semantic/bin/python"
python314_env="$repo_dir/.venv-r1-semantic-314"
model_cache="$repo_dir/.r1-model-cache"
status_before="$(mktemp -t semantic-r1-status-before.XXXXXX)"
status_after="$(mktemp -t semantic-r1-status-after.XXXXXX)"

cleanup() {
  rm -f "$status_before" "$status_after"
}
trap cleanup EXIT

if [[ ! -x "$python313" ]]; then
  echo "Missing controlled Python 3.13 environment: $python313" >&2
  echo "Run the completed Handoff 1 benchmark setup before Handoff 2 verification." >&2
  exit 1
fi
if [[ ! -d "$model_cache" ]]; then
  echo "Missing externally populated R1 model cache: $model_cache" >&2
  exit 1
fi

git -C "$repo_dir" status --porcelain=v1 --untracked-files=all > "$status_before"

echo "[R1] Verifying frozen selection and holdout artifact checksums"
(
  cd "$repo_dir/docs/evaluation/semantic-r1/raw/selection-antigravity"
  shasum -a 256 -c checksums.sha256
)
(
  cd "$repo_dir/docs/evaluation/semantic-r1/raw/holdout-antigravity"
  shasum -a 256 -c checksums.sha256
)

export EMBEDDING_MODEL_NAME="intfloat/e5-small-v2"
export EMBEDDING_MODEL_REVISION="ffb93f3bd4047442299a41ebb6fa998a38507c52"
export EMBEDDING_INPUT_POLICY="e5_retrieval"
export EMBEDDING_CACHE_FOLDER="$model_cache"
export EMBEDDING_LOCAL_FILES_ONLY="true"
export HYBRID_KEYWORD_WEIGHT="0.75"
export HYBRID_SEMANTIC_WEIGHT="0.25"
export PYTHONDONTWRITEBYTECODE="1"

echo "[R1] Verifying benchmark lock, production configuration, and focused model-free contracts"
(
  cd "$backend_dir"
  "$python313" -m app.evaluation.semantic_benchmark verify
  "$python313" -m unittest -v \
    tests.test_semantic_benchmark \
    tests.test_semantic_provider \
    tests.test_semantic_matching \
    tests.test_semantic_ranker \
    tests.test_keyword_matching \
    tests.test_hybrid_matching \
    tests.test_matching_builders \
    tests.test_matching_explanations \
    tests.test_matching_data_access \
    tests.test_matching_routes \
    tests.test_applicant_review \
    tests.test_evaluation_fixtures \
    tests.test_evaluation_metrics \
    tests.test_evaluation_runner \
    tests.test_evaluation_routes
)

echo "[R1] Running opt-in real E5 integration smoke on controlled Python 3.13"
(
  cd "$backend_dir"
  RUN_REAL_MODEL_SMOKE=1 "$python313" -m unittest -v tests.test_real_semantic_model_smoke
)

echo "[R1] Running full backend discovery and compile checks"
(
  cd "$backend_dir"
  "$python313" -m unittest discover -s tests -v
  "$python313" -m compileall -q app tests
)

if command -v python3.14 >/dev/null 2>&1; then
  echo "[R1] Attempting selected-stack compatibility verification on Python 3.14"
  if [[ ! -x "$python314_env/bin/python" ]]; then
    python3.14 -m venv "$python314_env"
  fi
  if "$python314_env/bin/python" -m pip install --disable-pip-version-check -r "$backend_dir/requirements.txt"; then
    (
      cd "$backend_dir"
      RUN_REAL_MODEL_SMOKE=1 "$python314_env/bin/python" -m unittest -v \
        tests.test_semantic_provider \
        tests.test_real_semantic_model_smoke
    )
    echo "[R1] Python 3.14 selected-stack compatibility: verified"
  else
    echo "[R1] Python 3.14 selected-stack compatibility: currently unverified (dependencies not installable)" >&2
  fi
else
  echo "[R1] Python 3.14 selected-stack compatibility: currently unverified (interpreter unavailable)"
fi

echo "[R1] Running frontend unchanged-contract regressions"
(
  cd "$frontend_dir"
  npm test
  npm run lint
  npm run build
)

echo "[R1] Checking whitespace and ensuring verification did not rewrite tracked/source artifacts"
git -C "$repo_dir" diff --check
git -C "$repo_dir" status --porcelain=v1 --untracked-files=all > "$status_after"
if ! cmp -s "$status_before" "$status_after"; then
  echo "Verification changed repository-visible files; inspect the status delta." >&2
  diff -u "$status_before" "$status_after" >&2 || true
  exit 1
fi

echo "[R1] PASS: semantic production integration verification completed without repository changes"
