"""Central production semantic-provider and hybrid-configuration construction."""

from __future__ import annotations

from collections.abc import Callable
from threading import Lock

from app.config import settings
from app.matching.hybrid import HybridRankingConfig
from app.matching.semantic import (
    EmbeddingInputPolicy,
    EmbeddingProvider,
    SemanticRankingUnavailableError,
    SentenceTransformerEmbeddingProvider,
)
from app.marketplace.ranking import SemanticUnavailableReason


_provider_lock = Lock()
_providers: dict[tuple[str, str, EmbeddingInputPolicy, str | None, bool], EmbeddingProvider] = {}


def get_production_embedding_provider() -> EmbeddingProvider:
    """Return the immutable process-level provider for the configured model."""

    model_name = settings.embedding_model_name.strip()
    revision = settings.embedding_model_revision.strip()
    if not model_name or not revision:
        raise SemanticRankingUnavailableError(
            SemanticUnavailableReason.EMBEDDING_PROVIDER_NOT_CONFIGURED
        )
    try:
        input_policy = EmbeddingInputPolicy(settings.embedding_input_policy.strip())
    except ValueError as error:
        raise SemanticRankingUnavailableError(
            SemanticUnavailableReason.EMBEDDING_PROVIDER_NOT_CONFIGURED,
            "Configured embedding input policy is unsupported.",
        ) from error

    key = (
        model_name,
        revision,
        input_policy,
        settings.embedding_cache_folder,
        settings.embedding_local_files_only,
    )
    with _provider_lock:
        provider = _providers.get(key)
        if provider is None:
            provider = SentenceTransformerEmbeddingProvider(
                model_name,
                revision=revision,
                input_policy=input_policy,
                cache_folder=settings.embedding_cache_folder,
                local_files_only=settings.embedding_local_files_only,
            )
            _providers[key] = provider
        return provider


def get_embedding_provider_factory() -> Callable[[], EmbeddingProvider]:
    """FastAPI dependency returning the centralized lazy provider factory."""

    return get_production_embedding_provider


def get_production_hybrid_config() -> HybridRankingConfig:
    """Return the validated product weighting from backend settings."""

    try:
        return HybridRankingConfig(
            keyword_weight=settings.hybrid_keyword_weight,
            semantic_weight=settings.hybrid_semantic_weight,
        )
    except ValueError as error:
        raise SemanticRankingUnavailableError(
            SemanticUnavailableReason.EMBEDDING_PROVIDER_NOT_CONFIGURED,
            "Configured hybrid ranking weights are invalid.",
        ) from error


def _clear_production_embedding_provider_cache() -> None:
    """Reset process-local instances for isolated tests only."""

    with _provider_lock:
        _providers.clear()


__all__ = [
    "get_embedding_provider_factory",
    "get_production_embedding_provider",
    "get_production_hybrid_config",
]
