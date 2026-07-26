"""Backend-only service RPC boundary for selection reads and mutations."""

from __future__ import annotations

from typing import Any, Protocol

from app.marketplace.data_access import (
    MarketplaceWriteError,
    SupabaseMarketplaceReadRepository,
)


class SelectionRepository(Protocol):
    def get_user_profile(self, user_id: str) -> dict[str, Any] | None: ...

    def call_selection(self, function_name: str, payload: dict[str, Any]) -> dict[str, Any]: ...


class SupabaseSelectionRepository(SupabaseMarketplaceReadRepository):
    def call_selection(self, function_name: str, payload: dict[str, Any]) -> dict[str, Any]:
        return self.call_gig_management(function_name, payload)


__all__ = [
    "MarketplaceWriteError",
    "SelectionRepository",
    "SupabaseSelectionRepository",
]
