"""Explicit Supabase reads for sanitized marketplace discovery and detail."""

from __future__ import annotations

import json
from typing import Any, Protocol
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.config import settings

GIG_SELECT = (
    "id,client_id,status,opportunity_lifecycle,application_intake,operational_state,"
    "current_gig_version_id,current_material_gig_version_id,created_at,updated_at"
)
VERSION_SELECT = (
    "id,gig_id,version_number,version_kind,terms_contract_version,snapshot_schema_version,"
    "terms_snapshot,changed_fields,created_at"
)


class MarketplaceReadRepository(Protocol):
    def get_user_profile(self, user_id: str) -> dict[str, Any] | None: ...

    def list_marketplace_gigs(self) -> list[dict[str, Any]]: ...

    def get_marketplace_gig(self, gig_id: str) -> dict[str, Any] | None: ...

    def list_owner_gigs(self, owner_id: str) -> list[dict[str, Any]]: ...

    def get_owner_gig(self, gig_id: str, owner_id: str) -> dict[str, Any] | None: ...

    def call_gig_management(self, function_name: str, payload: dict[str, Any]) -> dict[str, Any]: ...


class MarketplaceWriteError(RuntimeError):
    def __init__(self, message: str, *, detail: str | None = None) -> None:
        super().__init__(message)
        self.detail = detail


class SupabaseMarketplaceReadRepository:
    """Backend-only explicit read repository; response DTOs remain the sanitizer."""

    def __init__(self, supabase_url: str | None = None, secret_key: str | None = None) -> None:
        self.supabase_url = (supabase_url if supabase_url is not None else settings.supabase_url).rstrip("/")
        self.secret_key = secret_key if secret_key is not None else settings.supabase_secret_key

    def get_user_profile(self, user_id: str) -> dict[str, Any] | None:
        rows = self._select(
            "user_profiles",
            {"select": "id,role", "id": f"eq.{user_id}", "limit": "1"},
        )
        return rows[0] if rows else None

    def list_marketplace_gigs(self) -> list[dict[str, Any]]:
        return self._load_gig_records(
            {
                "select": GIG_SELECT,
                "opportunity_lifecycle": "eq.active",
                "application_intake": "eq.accepting",
                "operational_state": "eq.active",
                "status": "eq.open",
            }
        )

    def get_marketplace_gig(self, gig_id: str) -> dict[str, Any] | None:
        records = self._load_gig_records({"select": GIG_SELECT, "id": f"eq.{gig_id}", "limit": "1"})
        return records[0] if records else None

    def list_owner_gigs(self, owner_id: str) -> list[dict[str, Any]]:
        return self._load_owner_records({"client_id": f"eq.{owner_id}", "order": "updated_at.desc"})

    def get_owner_gig(self, gig_id: str, owner_id: str) -> dict[str, Any] | None:
        records = self._load_owner_records({"id": f"eq.{gig_id}", "client_id": f"eq.{owner_id}", "limit": "1"})
        return records[0] if records else None

    def call_gig_management(self, function_name: str, payload: dict[str, Any]) -> dict[str, Any]:
        if not self.supabase_url or not self.secret_key:
            raise RuntimeError("Supabase marketplace repository is not configured.")
        request = Request(
            f"{self.supabase_url}/rest/v1/rpc/{function_name}",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "apikey": self.secret_key,
                "Authorization": f"Bearer {self.secret_key}",
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=15) as response:
                result = json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            try:
                body = json.loads(error.read().decode("utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError):
                body = {}
            raise MarketplaceWriteError(
                str(body.get("message") or "Gig management transaction failed."),
                detail=body.get("details") if isinstance(body.get("details"), str) else None,
            ) from error
        except (URLError, TimeoutError, json.JSONDecodeError) as error:
            raise RuntimeError("Supabase marketplace write failed.") from error
        if not isinstance(result, dict):
            raise RuntimeError("Supabase marketplace write returned an unexpected payload.")
        return result

    def _load_owner_records(self, filters: dict[str, str]) -> list[dict[str, Any]]:
        owner_select = (
            GIG_SELECT + ",title,description,tech_category,required_skills,preferred_skills,budget_min,budget_max,"
            "difficulty_level,seniority_needed,deliverables,work_mode,deadline"
        )
        gigs = self._load_gig_records({"select": owner_select, **filters})
        if not gigs:
            return []
        gig_ids = [str(gig["id"]) for gig in gigs]
        applications = self._select(
            "applications", {"select": "gig_id,stage", "gig_id": f"in.({','.join(gig_ids)})"}
        )
        requests = self._select(
            "selection_requests", {"select": "gig_id,status,expires_at", "gig_id": f"in.({','.join(gig_ids)})"}
        )
        for gig in gigs:
            gig_id = str(gig["id"])
            gig["active_application_count"] = sum(
                1 for row in applications if str(row.get("gig_id")) == gig_id and row.get("stage") in ("under_review", "advanced")
            )
            gig["selection_requests"] = [row for row in requests if str(row.get("gig_id")) == gig_id]
        return gigs

    def _load_gig_records(self, query: dict[str, str]) -> list[dict[str, Any]]:
        gigs = self._select("gigs", query)
        if not gigs:
            return []

        version_ids = sorted(
            {
                str(version_id)
                for gig in gigs
                for version_id in (gig.get("current_gig_version_id"), gig.get("current_material_gig_version_id"))
                if version_id
            }
        )
        client_ids = sorted({str(gig["client_id"]) for gig in gigs if gig.get("client_id")})
        versions = self._select(
            "gig_versions",
            {"select": VERSION_SELECT, "id": f"in.({','.join(version_ids)})"},
        ) if version_ids else []
        client_profiles = self._select(
            "client_profiles",
            {"select": "user_id,company_name,industry,bio", "user_id": f"in.({','.join(client_ids)})"},
        ) if client_ids else []
        user_profiles = self._select(
            "user_profiles",
            {"select": "id,full_name", "id": f"in.({','.join(client_ids)})"},
        ) if client_ids else []

        versions_by_id = {str(row.get("id")): row for row in versions if row.get("id")}
        clients_by_user = {str(row.get("user_id")): row for row in client_profiles if row.get("user_id")}
        users_by_id = {str(row.get("id")): row for row in user_profiles if row.get("id")}

        records: list[dict[str, Any]] = []
        for gig in gigs:
            client_id = str(gig.get("client_id") or "")
            record = dict(gig)
            record["current_version"] = versions_by_id.get(str(gig.get("current_gig_version_id") or ""))
            record["current_material_version"] = versions_by_id.get(
                str(gig.get("current_material_gig_version_id") or "")
            )
            record["safe_client_profile"] = clients_by_user.get(client_id)
            record["safe_client_user_profile"] = users_by_id.get(client_id)
            records.append(record)
        return records

    def _select(self, table: str, query: dict[str, str]) -> list[dict[str, Any]]:
        if not self.supabase_url or not self.secret_key:
            raise RuntimeError("Supabase marketplace repository is not configured.")
        request = Request(
            f"{self.supabase_url}/rest/v1/{table}?{urlencode(query)}",
            headers={
                "apikey": self.secret_key,
                "Authorization": f"Bearer {self.secret_key}",
                "Accept": "application/json",
            },
            method="GET",
        )
        try:
            with urlopen(request, timeout=10) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
            raise RuntimeError("Supabase marketplace read failed.") from error
        if not isinstance(payload, list):
            raise RuntimeError("Supabase marketplace read returned an unexpected payload.")
        return [row for row in payload if isinstance(row, dict)]


__all__ = ["MarketplaceReadRepository", "MarketplaceWriteError", "SupabaseMarketplaceReadRepository"]
