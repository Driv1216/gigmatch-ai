"""Backend-only application reads and narrow transactional RPC calls."""

from __future__ import annotations

import hashlib
from typing import Any, Protocol

from app.marketplace.data_access import MarketplaceWriteError, SupabaseMarketplaceReadRepository


APPLICATION_SELECT = (
    "id,gig_id,freelancer_profile_id,stage,current_version_id,submitted_at,last_updated_at,"
    "stage_changed_at,stage_reason_origin,stage_reason_code,stage_reason_payload"
)
APPLICATION_VERSION_SELECT = (
    "id,application_id,gig_id,version_number,gig_version_id,origin,proposal_contract_version,"
    "snapshot_schema_version,cover_note,proposal_snapshot,timeline_snapshot,availability_snapshot,"
    "scope_snapshot,scope_notes,payment_structure,currency,created_at"
)


class ApplicationRepository(Protocol):
    def get_user_profile(self, user_id: str) -> dict[str, Any] | None: ...

    def get_freelancer_profile(self, user_id: str) -> dict[str, Any] | None: ...

    def get_application_context(self, gig_id: str, freelancer_profile_id: str) -> dict[str, Any] | None: ...

    def get_gig_terms_for_token(self, gig_id: str, terms_token: str) -> dict[str, Any] | None: ...

    def list_freelancer_applications(self, freelancer_profile_id: str) -> list[dict[str, Any]]: ...

    def get_freelancer_application(
        self, application_id: str, freelancer_profile_id: str
    ) -> dict[str, Any] | None: ...

    def call_application_mutation(self, function_name: str, payload: dict[str, Any]) -> dict[str, Any]: ...


class SupabaseApplicationRepository(SupabaseMarketplaceReadRepository):
    def get_freelancer_profile(self, user_id: str) -> dict[str, Any] | None:
        rows = self._select(
            "freelancer_profiles",
            {"select": "id,user_id", "user_id": f"eq.{user_id}", "limit": "1"},
        )
        return rows[0] if rows else None

    def get_application_context(self, gig_id: str, freelancer_profile_id: str) -> dict[str, Any] | None:
        gig = self.get_marketplace_gig(gig_id)
        if gig is None:
            return None
        applications = self._select(
            "applications",
            {
                "select": "id,stage,current_version_id",
                "gig_id": f"eq.{gig_id}",
                "freelancer_profile_id": f"eq.{freelancer_profile_id}",
                "limit": "1",
            },
        )
        result = dict(gig)
        result["existing_application"] = applications[0] if applications else None
        return result

    def get_gig_terms_for_token(self, gig_id: str, terms_token: str) -> dict[str, Any] | None:
        versions = self._select(
            "gig_versions",
            {"select": "id,gig_id,version_number,terms_contract_version,terms_snapshot", "gig_id": f"eq.{gig_id}"},
        )
        return next(
            (
                version
                for version in versions
                if _terms_token(str(version.get("gig_id")), str(version.get("id"))) == terms_token
            ),
            None,
        )

    def list_freelancer_applications(self, freelancer_profile_id: str) -> list[dict[str, Any]]:
        applications = self._select(
            "applications",
            {
                "select": APPLICATION_SELECT,
                "freelancer_profile_id": f"eq.{freelancer_profile_id}",
                "order": "last_updated_at.desc,id.desc",
            },
        )
        return self._hydrate_applications(applications)

    def get_freelancer_application(
        self, application_id: str, freelancer_profile_id: str
    ) -> dict[str, Any] | None:
        applications = self._select(
            "applications",
            {
                "select": APPLICATION_SELECT,
                "id": f"eq.{application_id}",
                "freelancer_profile_id": f"eq.{freelancer_profile_id}",
                "limit": "1",
            },
        )
        hydrated = self._hydrate_applications(applications)
        return hydrated[0] if hydrated else None

    def call_application_mutation(self, function_name: str, payload: dict[str, Any]) -> dict[str, Any]:
        return self.call_gig_management(function_name, payload)

    def _hydrate_applications(self, applications: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not applications:
            return []
        application_ids = [str(row["id"]) for row in applications]
        gig_ids = sorted({str(row["gig_id"]) for row in applications})
        versions = self._select(
            "application_versions",
            {
                "select": APPLICATION_VERSION_SELECT,
                "application_id": f"in.({','.join(application_ids)})",
                "order": "version_number.asc,id.asc",
            },
        )
        answered_version_ids = sorted({str(row["gig_version_id"]) for row in versions})
        answered_gig_versions = self._select(
            "gig_versions",
            {
                "select": "id,gig_id,version_number,terms_contract_version,terms_snapshot,changed_fields,created_at",
                "id": f"in.({','.join(answered_version_ids)})",
            },
        ) if answered_version_ids else []
        requests = self._select(
            "selection_requests",
            {
                "select": "id,application_id,status,expires_at",
                "application_id": f"in.({','.join(application_ids)})",
                "status": "eq.pending",
            },
        )
        threads = self._select(
            "application_qa_threads",
            {
                "select": (
                    "application_id,initial_client_turn_count,pre_advance_stopped_at,"
                    "full_discussion_unlocked_at,updated_at"
                ),
                "application_id": f"in.({','.join(application_ids)})",
            },
        )
        qa_messages = self._select(
            "application_qa_messages",
            {
                "select": (
                    "id,application_id,sender_user_id,message_kind,"
                    "in_reply_to_message_id,created_at"
                ),
                "application_id": f"in.({','.join(application_ids)})",
            },
        )
        revisions = self._select(
            "application_revision_requests",
            {
                "select": "id,application_id,status,created_at",
                "application_id": f"in.({','.join(application_ids)})",
            },
        )
        freelancer_profile_ids = sorted({
            str(row["freelancer_profile_id"])
            for row in applications if row.get("freelancer_profile_id")
        })
        freelancer_profiles = self._select(
            "freelancer_profiles",
            {
                "select": "id,user_id",
                "id": f"in.({','.join(freelancer_profile_ids)})",
            },
        ) if freelancer_profile_ids else []
        gigs = self._load_gig_records(
            {"select": "id,client_id,status,opportunity_lifecycle,application_intake,operational_state,current_gig_version_id,current_material_gig_version_id,created_at,updated_at", "id": f"in.({','.join(gig_ids)})"}
        )
        versions_by_application: dict[str, list[dict[str, Any]]] = {}
        for version in versions:
            versions_by_application.setdefault(str(version.get("application_id")), []).append(version)
        requests_by_application: dict[str, list[dict[str, Any]]] = {}
        for request in requests:
            requests_by_application.setdefault(str(request.get("application_id")), []).append(request)
        gigs_by_id = {str(gig.get("id")): gig for gig in gigs}
        answered_by_id = {str(version.get("id")): version for version in answered_gig_versions}
        threads_by_application = {
            str(row.get("application_id")): row for row in threads
        }
        messages_by_application: dict[str, list[dict[str, Any]]] = {}
        revisions_by_application: dict[str, list[dict[str, Any]]] = {}
        for row in qa_messages:
            messages_by_application.setdefault(str(row.get("application_id")), []).append(row)
        for row in revisions:
            revisions_by_application.setdefault(str(row.get("application_id")), []).append(row)
        users_by_freelancer_profile = {
            str(row.get("id")): str(row.get("user_id"))
            for row in freelancer_profiles if row.get("id") and row.get("user_id")
        }
        result: list[dict[str, Any]] = []
        for application in applications:
            application_id = str(application.get("id"))
            item = dict(application)
            item["versions"] = versions_by_application.get(application_id, [])
            for version in item["versions"]:
                version["answered_gig_version"] = answered_by_id.get(str(version.get("gig_version_id")))
            item["current_version"] = next(
                (
                    version
                    for version in item["versions"]
                    if str(version.get("id")) == str(application.get("current_version_id"))
                ),
                None,
            )
            item["selection_requests"] = requests_by_application.get(application_id, [])
            item["gig"] = gigs_by_id.get(str(application.get("gig_id")))
            item["qa_summary_source"] = {
                "thread": threads_by_application.get(application_id),
                "messages": messages_by_application.get(application_id, []),
                "revisions": revisions_by_application.get(application_id, []),
                "viewer_user_id": users_by_freelancer_profile.get(
                    str(application.get("freelancer_profile_id")), ""
                ),
                "viewer_role": "freelancer",
            }
            result.append(item)
        return result


__all__ = [
    "ApplicationRepository",
    "MarketplaceWriteError",
    "SupabaseApplicationRepository",
]


def _terms_token(gig_id: str, version_id: str) -> str:
    return hashlib.sha256(f"{gig_id}:{version_id}".encode()).hexdigest()
