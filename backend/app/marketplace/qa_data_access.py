"""Backend-only participant-safe Q&A reads and service RPC calls."""

from __future__ import annotations

from typing import Any, Protocol

from app.marketplace.application_data_access import APPLICATION_SELECT, APPLICATION_VERSION_SELECT
from app.marketplace.data_access import MarketplaceWriteError, SupabaseMarketplaceReadRepository

THREAD_SELECT = (
    "application_id,gig_id,next_message_sequence,initial_client_turn_count,"
    "pre_advance_stopped_at,full_discussion_unlocked_at,created_at,updated_at"
)
MESSAGE_SELECT = (
    "id,application_id,gig_id,sequence_number,sender_user_id,sender_role,message_kind,"
    "topic,other_topic_detail,body,in_reply_to_message_id,corrects_message_id,"
    "decline_reason_code,decline_reason_detail,created_at"
)
MESSAGE_SUMMARY_SELECT = (
    "id,application_id,sender_user_id,message_kind,in_reply_to_message_id,created_at"
)
REVISION_SELECT = (
    "id,application_id,gig_id,requested_application_version_id,"
    "requested_material_gig_version_id,created_by_user_id,reason_code,reason_detail,"
    "status,created_at,terminal_at,response_application_version_id,response_by_user_id,"
    "response_reason_code,response_reason_detail"
)


class QaRepository(Protocol):
    def get_user_profile(self, user_id: str) -> dict[str, Any] | None: ...

    def get_participant_thread(
        self,
        application_id: str,
        user_id: str,
        *,
        before_sequence: int | None = None,
        limit: int = 30,
    ) -> dict[str, Any] | None: ...

    def call_qa_mutation(self, function_name: str, payload: dict[str, Any]) -> dict[str, Any]: ...


class SupabaseQaRepository(SupabaseMarketplaceReadRepository):
    """Load one bounded application-specific Q&A aggregate."""

    def get_participant_thread(
        self,
        application_id: str,
        user_id: str,
        *,
        before_sequence: int | None = None,
        limit: int = 30,
    ) -> dict[str, Any] | None:
        applications = self._select(
            "applications",
            {"select": APPLICATION_SELECT, "id": f"eq.{application_id}", "limit": "1"},
        )
        if not applications:
            return None
        application = applications[0]
        gig_id = str(application.get("gig_id") or "")
        gigs = self._load_gig_records(
            {
                "select": (
                    "id,client_id,status,opportunity_lifecycle,application_intake,"
                    "operational_state,current_gig_version_id,"
                    "current_material_gig_version_id,created_at,updated_at"
                ),
                "id": f"eq.{gig_id}",
                "limit": "1",
            }
        )
        profiles = self._select(
            "freelancer_profiles",
            {
                "select": "id,user_id",
                "id": f"eq.{application.get('freelancer_profile_id')}",
                "limit": "1",
            },
        )
        if not gigs or not profiles:
            return None
        gig = gigs[0]
        freelancer_user_id = str(profiles[0].get("user_id") or "")
        if user_id == str(gig.get("client_id")):
            viewer_role = "client"
        elif user_id == freelancer_user_id:
            viewer_role = "freelancer"
        else:
            return None

        threads = self._select(
            "application_qa_threads",
            {"select": THREAD_SELECT, "application_id": f"eq.{application_id}", "limit": "1"},
        )
        query = {
            "select": MESSAGE_SELECT,
            "application_id": f"eq.{application_id}",
            "order": "sequence_number.desc",
            "limit": str(limit + 1),
        }
        if before_sequence is not None:
            query["sequence_number"] = f"lt.{before_sequence}"
        messages = self._select("application_qa_messages", query)
        message_summary = messages
        if before_sequence is not None or len(messages) > limit:
            message_summary = self._select(
                "application_qa_messages",
                {
                    "select": MESSAGE_SUMMARY_SELECT,
                    "application_id": f"eq.{application_id}",
                    "order": "sequence_number.desc",
                },
            )
        revisions = self._select(
            "application_revision_requests",
            {
                "select": REVISION_SELECT,
                "application_id": f"eq.{application_id}",
                "order": "created_at.desc,id.desc",
                "limit": "50",
            },
        )
        reports = self._select(
            "application_question_reports",
            {
                "select": "message_id",
                "application_id": f"eq.{application_id}",
                "reporter_user_id": f"eq.{user_id}",
            },
        )
        versions = self._select(
            "application_versions",
            {
                "select": APPLICATION_VERSION_SELECT,
                "application_id": f"eq.{application_id}",
                "order": "version_number.desc,id.desc",
            },
        )
        item = dict(application)
        item["gig"] = gig
        item["freelancer_user_id"] = freelancer_user_id
        item["viewer_user_id"] = user_id
        item["viewer_role"] = viewer_role
        item["thread"] = threads[0] if threads else None
        item["messages"] = messages
        item["message_summary"] = message_summary
        item["revisions"] = revisions
        item["reported_message_ids"] = [
            str(row["message_id"]) for row in reports if row.get("message_id")
        ]
        item["versions"] = versions
        item["current_version"] = next(
            (
                row
                for row in versions
                if str(row.get("id")) == str(application.get("current_version_id"))
            ),
            None,
        )
        item["message_limit"] = limit
        return item

    def call_qa_mutation(self, function_name: str, payload: dict[str, Any]) -> dict[str, Any]:
        return self.call_gig_management(function_name, payload)


__all__ = [
    "MarketplaceWriteError",
    "QaRepository",
    "SupabaseQaRepository",
]
