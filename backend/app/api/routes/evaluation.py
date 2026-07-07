from collections.abc import Callable
from dataclasses import asdict, is_dataclass
from enum import Enum
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query

from app.config import settings
from app.core.auth import AuthVerifier, InvalidTokenError, MissingTokenError, SupabaseAuthVerifier
from app.evaluation import load_seeded_evaluation_fixtures, run_evaluation
from app.matching.data_access import (
    ForbiddenRoleError,
    MatchingRepository,
    MissingProfileError,
    SupabaseMatchingRepository,
    UnsupportedRoleError,
    authenticate_matching_request,
)
from app.matching.semantic import EmbeddingProvider, SentenceTransformerEmbeddingProvider

router = APIRouter()


def get_auth_verifier() -> AuthVerifier:
    return SupabaseAuthVerifier()


def get_matching_repository() -> MatchingRepository:
    return SupabaseMatchingRepository()


def get_embedding_provider() -> EmbeddingProvider:
    if not settings.embedding_model_name:
        raise HTTPException(status_code=503, detail="Evaluation embedding provider is not configured.")
    try:
        return SentenceTransformerEmbeddingProvider(settings.embedding_model_name)
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


def get_embedding_provider_factory() -> Callable[[], EmbeddingProvider]:
    return get_embedding_provider


@router.get("")
def evaluation_status() -> dict[str, str]:
    return {"module": "evaluation", "status": "ready"}


@router.get("/matching")
def matching_evaluation_summary(
    top_k: list[str] | None = Query(default=None),
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: MatchingRepository = Depends(get_matching_repository),
    embedding_provider_factory: Callable[[], EmbeddingProvider] = Depends(get_embedding_provider_factory),
) -> dict[str, Any]:
    """Return seeded matching evaluation results for authenticated admins only."""

    try:
        auth_context = authenticate_matching_request(authorization, auth_verifier, repository)
        if auth_context.role != "admin":
            raise ForbiddenRoleError("Only admin users can access matching evaluation results.")
    except _EVALUATION_AUTH_ERROR_TYPES as error:
        raise _evaluation_http_exception(error) from error

    top_ks = _parse_top_ks(top_k)
    fixtures = load_seeded_evaluation_fixtures()
    embedding_provider = embedding_provider_factory()
    summary = run_evaluation(fixtures, top_ks=top_ks, embedding_provider=embedding_provider)
    payload = _to_jsonable(summary)
    payload["generated_from"] = "seeded_evaluation_fixtures"
    return payload


_EVALUATION_AUTH_ERROR_TYPES = (
    MissingTokenError,
    InvalidTokenError,
    MissingProfileError,
    UnsupportedRoleError,
    ForbiddenRoleError,
)


def _evaluation_http_exception(error: Exception) -> HTTPException:
    if isinstance(error, (MissingTokenError, InvalidTokenError)):
        return HTTPException(status_code=401, detail=str(error))
    return HTTPException(status_code=403, detail=str(error))


def _parse_top_ks(raw_values: list[str] | None) -> tuple[int, ...]:
    if not raw_values:
        return (1, 3)

    parsed_values: list[int] = []
    for raw_value in raw_values:
        try:
            parsed_value = int(raw_value)
        except (TypeError, ValueError) as error:
            raise HTTPException(status_code=400, detail="top_k values must be positive integers.") from error
        if parsed_value <= 0:
            raise HTTPException(status_code=400, detail="top_k values must be positive integers.")
        parsed_values.append(parsed_value)

    return tuple(dict.fromkeys(parsed_values))


def _to_jsonable(value: Any) -> Any:
    if isinstance(value, Enum):
        return value.value
    if is_dataclass(value) and not isinstance(value, type):
        return _to_jsonable(asdict(value))
    if isinstance(value, dict):
        return {
            _to_jsonable(key): _to_jsonable(item)
            for key, item in value.items()
        }
    if isinstance(value, tuple):
        return [_to_jsonable(item) for item in value]
    if isinstance(value, list):
        return [_to_jsonable(item) for item in value]
    return value
