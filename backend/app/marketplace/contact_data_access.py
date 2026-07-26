"""Backend-only RPC boundary for secure contact exchange."""

from __future__ import annotations

from typing import Any, Protocol

from app.marketplace.data_access import (
    MarketplaceWriteError,
    SupabaseMarketplaceReadRepository,
)


class ContactRepository(Protocol):
    def get_user_profile(self, user_id: str) -> dict[str, Any] | None: ...

    def call_contact(
        self, function_name: str, payload: dict[str, Any]
    ) -> dict[str, Any]: ...


class SupabaseContactRepository(SupabaseMarketplaceReadRepository):
    def call_contact(
        self, function_name: str, payload: dict[str, Any]
    ) -> dict[str, Any]:
        return self.call_gig_management(function_name, payload)


__all__ = [
    "ContactRepository",
    "MarketplaceWriteError",
    "SupabaseContactRepository",
]
