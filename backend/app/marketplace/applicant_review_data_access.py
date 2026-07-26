"""Backend-only normalized applicant-pool reads and review RPC calls."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Protocol

from app.marketplace.application_data_access import APPLICATION_SELECT, APPLICATION_VERSION_SELECT
from app.marketplace.data_access import MarketplaceWriteError, SupabaseMarketplaceReadRepository

REVIEW_STATE_SELECT = (
    "application_id,gig_id,is_shortlisted,shortlisted_at,shortlisted_by_user_id,"
    "review_state_version,updated_at,updated_by_user_id"
)


class ApplicantReviewRepository(Protocol):
    def get_user_profile(self, user_id: str) -> dict[str, Any] | None: ...

    def get_owned_applicant_pool(self, gig_id: str, client_id: str) -> dict[str, Any] | None: ...

    def get_owned_applicant(
        self, gig_id: str, application_id: str, client_id: str
    ) -> dict[str, Any] | None: ...

    def get_owned_review_application(
        self, application_id: str, client_id: str
    ) -> dict[str, Any] | None: ...

    def call_review_mutation(self, function_name: str, payload: dict[str, Any]) -> dict[str, Any]: ...


class SupabaseApplicantReviewRepository(SupabaseMarketplaceReadRepository):
    """Construct one consistent, batched projection for an owned gig's applicants."""

    def get_owned_applicant_pool(self, gig_id: str, client_id: str) -> dict[str, Any] | None:
        gig = self.get_owner_gig(gig_id, client_id)
        if gig is None:
            return None
        applications = self._select(
            "applications",
            {
                "select": APPLICATION_SELECT,
                "gig_id": f"eq.{gig_id}",
                "order": "submitted_at.desc,id.asc",
            },
        )
        return self._hydrate_pool(gig, applications, include_history=False)

    def get_owned_applicant(
        self, gig_id: str, application_id: str, client_id: str
    ) -> dict[str, Any] | None:
        gig = self.get_owner_gig(gig_id, client_id)
        if gig is None:
            return None
        applications = self._select(
            "applications",
            {
                "select": APPLICATION_SELECT,
                "id": f"eq.{application_id}",
                "gig_id": f"eq.{gig_id}",
                "limit": "1",
            },
        )
        if not applications:
            return None
        pool = self._hydrate_pool(gig, applications, include_history=True)
        return pool["applications"][0] if pool["applications"] else None

    def get_owned_review_application(
        self, application_id: str, client_id: str
    ) -> dict[str, Any] | None:
        rows = self._select(
            "applications",
            {"select": "id,gig_id", "id": f"eq.{application_id}", "limit": "1"},
        )
        if not rows or not rows[0].get("gig_id"):
            return None
        return self.get_owned_applicant(str(rows[0]["gig_id"]), application_id, client_id)

    def call_review_mutation(self, function_name: str, payload: dict[str, Any]) -> dict[str, Any]:
        return self.call_gig_management(function_name, payload)

    def _hydrate_pool(
        self,
        gig: dict[str, Any],
        applications: list[dict[str, Any]],
        *,
        include_history: bool,
    ) -> dict[str, Any]:
        if not applications:
            return {"gig": gig, "applications": []}

        application_ids = [str(row["id"]) for row in applications]
        current_version_ids = [str(row["current_version_id"]) for row in applications]
        version_query = {
            "select": APPLICATION_VERSION_SELECT,
            "application_id": f"in.({','.join(application_ids)})",
            "order": "version_number.asc,id.asc",
        } if include_history else {
            "select": APPLICATION_VERSION_SELECT,
            "id": f"in.({','.join(current_version_ids)})",
        }
        versions = self._select("application_versions", version_query)
        answered_ids = sorted({str(row["gig_version_id"]) for row in versions if row.get("gig_version_id")})
        answered_versions = self._select(
            "gig_versions",
            {
                "select": (
                    "id,gig_id,version_number,version_kind,terms_contract_version,"
                    "terms_snapshot,changed_fields,created_at"
                ),
                "id": f"in.({','.join(answered_ids)})",
            },
        ) if answered_ids else []

        freelancer_ids = sorted({str(row["freelancer_profile_id"]) for row in applications})
        profiles = self._select(
            "freelancer_profiles",
            {
                "select": (
                    "id,user_id,headline,bio,location,experience_level,primary_role,"
                    "tech_categories,skills,tools,project_links,availability,preferred_gig_type"
                ),
                "id": f"in.({','.join(freelancer_ids)})",
            },
        )
        user_ids = sorted({str(row["user_id"]) for row in profiles if row.get("user_id")})
        users = self._select(
            "user_profiles",
            {"select": "id,full_name", "id": f"in.({','.join(user_ids)})"},
        ) if user_ids else []
        parses = self._select(
            "resume_parses",
            {
                "select": (
                    "id,user_id,status,parser_version,parsed_json,skills,categories,"
                    "matched_terms,unmatched_keywords,confidence,created_at,updated_at"
                ),
                "user_id": f"in.({','.join(user_ids)})",
                "status": "in.(reviewed,parsed)",
                "order": "updated_at.desc",
            },
        ) if user_ids else []
        review_states = self._select(
            "application_review_states",
            {
                "select": REVIEW_STATE_SELECT,
                "application_id": f"in.({','.join(application_ids)})",
            },
        )
        qa_threads = self._select(
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
        requests = self._select(
            "selection_requests",
            {
                "select": "id,application_id,status,expires_at",
                "application_id": f"in.({','.join(application_ids)})",
                "status": "eq.pending",
            },
        )
        events = self._select(
            "marketplace_events",
            {
                "select": (
                    "id,event_type,visibility,actor_type,application_id,reason_origin,"
                    "reason_code,event_payload,occurred_at"
                ),
                "application_id": f"in.({','.join(application_ids)})",
                "visibility": "eq.participants",
                "order": "occurred_at.desc,id.desc",
            },
        ) if include_history else []

        versions_by_application: dict[str, list[dict[str, Any]]] = {}
        answered_by_id = {str(row["id"]): row for row in answered_versions}
        for version in versions:
            hydrated = dict(version)
            hydrated["answered_gig_version"] = answered_by_id.get(str(version.get("gig_version_id")))
            versions_by_application.setdefault(str(version.get("application_id")), []).append(hydrated)
        profiles_by_id = {str(row["id"]): row for row in profiles}
        users_by_id = {str(row["id"]): row for row in users}
        states_by_application = {str(row["application_id"]): row for row in review_states}
        qa_threads_by_application = {
            str(row.get("application_id")): row for row in qa_threads
        }
        qa_messages_by_application: dict[str, list[dict[str, Any]]] = {}
        revisions_by_application: dict[str, list[dict[str, Any]]] = {}
        requests_by_application: dict[str, list[dict[str, Any]]] = {}
        events_by_application: dict[str, list[dict[str, Any]]] = {}
        parses_by_user: dict[str, list[dict[str, Any]]] = {}
        for row in requests:
            requests_by_application.setdefault(str(row.get("application_id")), []).append(row)
        for row in events:
            events_by_application.setdefault(str(row.get("application_id")), []).append(row)
        for row in parses:
            parses_by_user.setdefault(str(row.get("user_id")), []).append(row)
        for row in qa_messages:
            qa_messages_by_application.setdefault(str(row.get("application_id")), []).append(row)
        for row in revisions:
            revisions_by_application.setdefault(str(row.get("application_id")), []).append(row)

        result: list[dict[str, Any]] = []
        for application in applications:
            application_id = str(application["id"])
            profile = profiles_by_id.get(str(application.get("freelancer_profile_id")))
            user_id = str(profile.get("user_id")) if profile and profile.get("user_id") else ""
            hydrated = dict(application)
            hydrated["gig"] = gig
            hydrated["versions"] = versions_by_application.get(application_id, [])
            hydrated["current_version"] = next(
                (
                    row
                    for row in hydrated["versions"]
                    if str(row.get("id")) == str(application.get("current_version_id"))
                ),
                None,
            )
            hydrated["freelancer_profile"] = profile
            hydrated["safe_user_profile"] = users_by_id.get(user_id)
            hydrated["resume_parse"] = _latest_parse(parses_by_user.get(user_id, []))
            hydrated["review_state"] = states_by_application.get(application_id)
            hydrated["selection_requests"] = requests_by_application.get(application_id, [])
            hydrated["review_history"] = events_by_application.get(application_id, [])
            hydrated["qa_summary_source"] = {
                "thread": qa_threads_by_application.get(application_id),
                "messages": qa_messages_by_application.get(application_id, []),
                "revisions": revisions_by_application.get(application_id, []),
                "viewer_user_id": str(gig.get("client_id") or ""),
                "viewer_role": "client",
            }
            result.append(hydrated)
        return {"gig": gig, "applications": result}


def _latest_parse(rows: list[dict[str, Any]]) -> dict[str, Any] | None:
    priority = {"reviewed": 2, "parsed": 1}
    candidates = [row for row in rows if row.get("status") in priority]
    if not candidates:
        return None

    def key(row: dict[str, Any]) -> tuple[int, datetime]:
        value = row.get("updated_at") or row.get("created_at")
        try:
            timestamp = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
            if timestamp.tzinfo is None:
                timestamp = timestamp.replace(tzinfo=timezone.utc)
        except ValueError:
            timestamp = datetime.min.replace(tzinfo=timezone.utc)
        return priority.get(str(row.get("status")), 0), timestamp

    return max(candidates, key=key)


__all__ = [
    "ApplicantReviewRepository",
    "MarketplaceWriteError",
    "SupabaseApplicantReviewRepository",
]
