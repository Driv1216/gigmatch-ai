"""Pure structured Q&A mode, permission, pagination, and DTO derivation."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def build_thread_dto(application: dict[str, Any]) -> dict[str, Any]:
    """Build the participant-safe thread DTO from one bounded aggregate."""

    viewer_id = str(application.get("viewer_user_id") or "")
    viewer_role = str(application.get("viewer_role") or "")
    gig = application.get("gig") if isinstance(application.get("gig"), dict) else {}
    thread = application.get("thread") if isinstance(application.get("thread"), dict) else {}
    raw_messages = application.get("messages") if isinstance(application.get("messages"), list) else []
    limit = int(application.get("message_limit") or 30)
    has_more = len(raw_messages) > limit
    page_rows = raw_messages[:limit]
    messages = [_message_dto(row, viewer_id, application) for row in page_rows if isinstance(row, dict)]
    revisions = [
        _revision_dto(row)
        for row in application.get("revisions", [])
        if isinstance(row, dict)
    ]
    open_revision = next((row for row in revisions if row["status"] == "open"), None)
    mode, blockers = thread_mode(application)
    permissions = thread_permissions(
        mode=mode,
        viewer_role=viewer_role,
        stopped=bool(thread.get("pre_advance_stopped_at")),
        allowance_used=int(thread.get("initial_client_turn_count") or 0),
        has_open_revision=open_revision is not None,
    )
    raw_summary = application.get("message_summary")
    summary_source = raw_summary if isinstance(raw_summary, list) else raw_messages
    all_rows = [row for row in summary_source if isinstance(row, dict)]
    unresolved = _unresolved_questions(all_rows)
    pending_for_viewer = sum(
        1 for row in unresolved if str(row.get("sender_user_id")) != viewer_id
    )
    pending_for_other = sum(
        1 for row in unresolved if str(row.get("sender_user_id")) == viewer_id
    )
    latest_candidates = [
        str(value)
        for value in (
            thread.get("updated_at"),
            *(row.get("created_at") for row in all_rows),
            *(row.get("created_at") for row in revisions),
            *(row.get("terminal_at") for row in revisions),
        )
        if value
    ]
    allowance_used = int(thread.get("initial_client_turn_count") or 0)
    return {
        "application_id": str(application.get("id")),
        "gig_id": str(application.get("gig_id")),
        "current_application_stage": str(application.get("stage")),
        "current_application_version_id": str(application.get("current_version_id")),
        "current_material_gig_version_id": str(gig.get("current_material_gig_version_id")),
        "application_version_token": _version_token(application),
        "viewer_role": viewer_role,
        "mode": mode,
        "permissions": permissions,
        "initial_question_allowance": {
            "used": allowance_used,
            "remaining": max(0, 2 - allowance_used),
            "limit": 2,
        },
        "pre_advance_discussion_stopped": bool(thread.get("pre_advance_stopped_at")),
        "pending_question_count": pending_for_viewer,
        "pending_question_count_for_other_participant": pending_for_other,
        "qa_requires_attention": pending_for_viewer > 0 or (
            viewer_role == "freelancer" and open_revision is not None
        ),
        "open_revision_request": open_revision,
        "revision_history": revisions,
        "latest_qa_activity_at": max(
            latest_candidates, key=_timestamp, default=None
        ),
        "messages": messages,
        "pagination": {
            "has_more": has_more,
            "before_sequence": (
                min(int(row.get("sequence_number") or 0) for row in page_rows)
                if has_more and page_rows
                else None
            ),
            "limit": limit,
        },
        "blockers": blockers,
        "proposal_authority_notice": (
            "Messages do not change the official proposal. Submit a complete "
            "application version to change financial, scope, timeline, or availability terms."
        ),
    }


def thread_mode(application: dict[str, Any]) -> tuple[str, list[str]]:
    gig = application.get("gig") if isinstance(application.get("gig"), dict) else {}
    thread = application.get("thread") if isinstance(application.get("thread"), dict) else {}
    stage = str(application.get("stage") or "")
    blockers: list[str] = []
    if gig.get("opportunity_lifecycle") in ("filled", "cancelled", "draft"):
        blockers.append(f"gig_{gig.get('opportunity_lifecycle')}")
    if gig.get("operational_state") == "paused":
        blockers.append("gig_paused")
    if stage in ("confirmed", "not_selected", "withdrawn", "closed_gig_cancelled"):
        blockers.append(f"application_{stage}")
    if blockers:
        return "read_only", blockers
    if stage == "advanced":
        return "advanced_discussion", []
    if stage == "under_review" and thread.get("full_discussion_unlocked_at"):
        return "read_only", ["returned_to_general_review"]
    if stage == "under_review" and thread.get("pre_advance_stopped_at"):
        return "initial_response_only", ["pre_advance_discussion_stopped"]
    if stage == "under_review":
        return "initial_clarification", []
    return "read_only", ["application_state_not_writable"]


def thread_permissions(
    *,
    mode: str,
    viewer_role: str,
    stopped: bool,
    allowance_used: int,
    has_open_revision: bool,
) -> dict[str, bool]:
    initial = mode == "initial_clarification"
    response_only = mode == "initial_response_only"
    advanced = mode == "advanced_discussion"
    return {
        "ask_initial_question": viewer_role == "client" and initial and allowance_used < 2,
        "send_advanced_question": advanced,
        "send_clarification": advanced,
        "answer_question": advanced or (viewer_role == "freelancer" and (initial or response_only)),
        "decline_question": viewer_role == "freelancer" and (
            advanced or initial or response_only
        ),
        "correct_own_message": advanced or (
            initial
            and not stopped
            and (viewer_role == "freelancer" or allowance_used < 2)
        ),
        "report_message": True,
        "stop_pre_advancement": viewer_role == "freelancer" and initial,
        "create_revision_request": viewer_role == "client" and advanced and not has_open_revision,
        "respond_to_revision_request": viewer_role == "freelancer" and advanced and has_open_revision,
    }


def qa_indicator(application: dict[str, Any]) -> dict[str, Any]:
    dto = build_thread_dto(application)
    return {
        "pending_question_count": dto["pending_question_count"],
        "awaiting_other_participant_response_count": dto[
            "pending_question_count_for_other_participant"
        ],
        "open_revision_request_count": 1 if dto["open_revision_request"] else 0,
        "qa_requires_attention": dto["qa_requires_attention"],
        "latest_qa_activity_at": dto["latest_qa_activity_at"],
    }


def qa_indicator_from_summary(application: dict[str, Any]) -> dict[str, Any]:
    """Build compact dashboard indicators from batched summary-only rows."""

    source = (
        application.get("qa_summary_source")
        if isinstance(application.get("qa_summary_source"), dict)
        else {}
    )
    value = dict(application)
    value["thread"] = source.get("thread")
    value["messages"] = source.get("messages") or []
    value["message_summary"] = value["messages"]
    value["revisions"] = source.get("revisions") or []
    value["viewer_user_id"] = source.get("viewer_user_id")
    value["viewer_role"] = source.get("viewer_role")
    value["reported_message_ids"] = []
    value["message_limit"] = max(1, len(value["messages"]))
    return qa_indicator(value)


def _message_dto(
    row: dict[str, Any], viewer_id: str, application: dict[str, Any]
) -> dict[str, Any]:
    reported = set(application.get("reported_message_ids") or [])
    return {
        "id": str(row.get("id")),
        "sequence_number": int(row.get("sequence_number") or 0),
        "sender_role": row.get("sender_role"),
        "is_mine": str(row.get("sender_user_id")) == viewer_id,
        "message_kind": row.get("message_kind"),
        "topic": row.get("topic"),
        "other_topic_detail": row.get("other_topic_detail"),
        "body": row.get("body"),
        "in_reply_to_message_id": row.get("in_reply_to_message_id"),
        "corrects_message_id": row.get("corrects_message_id"),
        "decline_reason_code": row.get("decline_reason_code"),
        "decline_reason_detail": row.get("decline_reason_detail"),
        "created_at": row.get("created_at"),
        "reported_by_viewer": str(row.get("id")) in reported,
    }


def _revision_dto(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row.get("id")),
        "requested_application_version_id": str(row.get("requested_application_version_id")),
        "requested_material_gig_version_id": str(row.get("requested_material_gig_version_id")),
        "reason_code": row.get("reason_code"),
        "reason_detail": row.get("reason_detail"),
        "status": row.get("status"),
        "created_at": row.get("created_at"),
        "terminal_at": row.get("terminal_at"),
        "response_application_version_id": row.get("response_application_version_id"),
        "response_reason_code": row.get("response_reason_code"),
        "response_reason_detail": row.get("response_reason_detail"),
    }


def _unresolved_questions(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    resolved = {
        str(row.get("in_reply_to_message_id"))
        for row in rows
        if row.get("message_kind") in ("answer", "decline")
        and row.get("in_reply_to_message_id")
    }
    return [
        row
        for row in rows
        if row.get("message_kind") in ("initial_question", "question")
        and str(row.get("id")) not in resolved
    ]


def _version_token(application: dict[str, Any]) -> str:
    import hashlib

    return hashlib.sha256(
        f"{application.get('id')}:{application.get('current_version_id')}".encode()
    ).hexdigest()


def _timestamp(value: Any) -> datetime:
    try:
        result = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return result if result.tzinfo else result.replace(tzinfo=timezone.utc)
    except ValueError:
        return datetime.min.replace(tzinfo=timezone.utc)


__all__ = [
    "build_thread_dto",
    "qa_indicator",
    "qa_indicator_from_summary",
    "thread_mode",
    "thread_permissions",
]
