from __future__ import annotations

import asyncio
import unittest
from copy import deepcopy
from typing import Any

from app.api.routes import qa as qa_routes
from app.main import app
from app.marketplace.data_access import MarketplaceWriteError
from app.marketplace.qa import build_thread_dto, thread_mode
from app.marketplace.qa_contracts import CreateRevisionRequest, InitialQuestionRequest
from app.marketplace.qa_safety import message_safety_code
from tests.test_applications import fixed_application, request_json
from tests.test_matching_data_access import FakeAuthVerifier


def qa_application(*, viewer_role: str = "client", stage: str = "under_review") -> dict[str, Any]:
    viewer_id = "client-1" if viewer_role == "client" else "freelancer-1"
    return {
        "id": "application-1",
        "gig_id": "gig-1",
        "freelancer_profile_id": "profile-1",
        "freelancer_user_id": "freelancer-1",
        "viewer_user_id": viewer_id,
        "viewer_role": viewer_role,
        "stage": stage,
        "current_version_id": "application-version-1",
        "gig": {
            "id": "gig-1",
            "client_id": "client-1",
            "opportunity_lifecycle": "active",
            "application_intake": "closed",
            "operational_state": "active",
            "current_material_gig_version_id": "gig-version-1",
        },
        "thread": None,
        "messages": [],
        "revisions": [],
        "reported_message_ids": [],
        "versions": [],
        "current_version": None,
        "message_limit": 30,
    }


class FakeQaRepository:
    def __init__(self) -> None:
        self.application = qa_application()
        self.users = {
            "client-1": {"id": "client-1", "role": "client"},
            "other-client": {"id": "other-client", "role": "client"},
            "freelancer-1": {"id": "freelancer-1", "role": "freelancer"},
            "other-freelancer": {"id": "other-freelancer", "role": "freelancer"},
            "admin-1": {"id": "admin-1", "role": "admin"},
        }
        self.calls: list[tuple[str, dict[str, Any]]] = []
        self.error: MarketplaceWriteError | None = None

    def get_user_profile(self, user_id: str) -> dict[str, Any] | None:
        return self.users.get(user_id)

    def get_participant_thread(
        self,
        application_id: str,
        user_id: str,
        *,
        before_sequence: int | None = None,
        limit: int = 30,
    ) -> dict[str, Any] | None:
        if application_id != "application-1" or user_id not in ("client-1", "freelancer-1"):
            return None
        value = deepcopy(self.application)
        value["viewer_user_id"] = user_id
        value["viewer_role"] = "client" if user_id == "client-1" else "freelancer"
        value["message_limit"] = limit
        if before_sequence is not None:
            value["messages"] = [
                row for row in value["messages"] if row["sequence_number"] < before_sequence
            ]
        return value

    def call_qa_mutation(self, function_name: str, payload: dict[str, Any]) -> dict[str, Any]:
        self.calls.append((function_name, deepcopy(payload)))
        if self.error:
            raise self.error
        if function_name == "qa_stop_pre_advancement":
            self.application["thread"] = {
                "application_id": "application-1",
                "initial_client_turn_count": 0,
                "pre_advance_stopped_at": "2026-07-25T10:00:00+00:00",
                "full_discussion_unlocked_at": None,
                "updated_at": "2026-07-25T10:00:00+00:00",
            }
        return {"code": "ok"}


class QaPureTests(unittest.TestCase):
    def test_never_advanced_and_returned_to_review_are_distinct(self) -> None:
        never = qa_application()
        self.assertEqual(thread_mode(never), ("initial_clarification", []))
        returned = qa_application()
        returned["thread"] = {"full_discussion_unlocked_at": "2026-07-25T00:00:00+00:00"}
        self.assertEqual(thread_mode(returned), ("read_only", ["returned_to_general_review"]))

    def test_paused_is_read_only_but_intake_closed_is_not(self) -> None:
        active = qa_application()
        self.assertEqual(thread_mode(active)[0], "initial_clarification")
        active["gig"]["operational_state"] = "paused"
        self.assertEqual(thread_mode(active), ("read_only", ["gig_paused"]))

    def test_cursor_page_is_deterministic_and_private_report_state_is_viewer_only(self) -> None:
        value = qa_application()
        value["message_limit"] = 2
        value["reported_message_ids"] = ["m2"]
        value["messages"] = [
            {
                "id": "m3", "sequence_number": 3, "sender_user_id": "freelancer-1",
                "sender_role": "freelancer", "message_kind": "answer", "body": "Answer",
                "in_reply_to_message_id": "m2", "created_at": "2026-07-25T03:00:00+00:00",
            },
            {
                "id": "m2", "sequence_number": 2, "sender_user_id": "freelancer-1",
                "sender_role": "freelancer", "message_kind": "question", "topic": "timeline",
                "body": "Question two", "created_at": "2026-07-25T02:00:00+00:00",
            },
            {
                "id": "m1", "sequence_number": 1, "sender_user_id": "client-1",
                "sender_role": "client", "message_kind": "initial_question", "topic": "budget",
                "body": "Question one", "created_at": "2026-07-25T01:00:00+00:00",
            },
        ]
        dto = build_thread_dto(value)
        self.assertEqual([row["sequence_number"] for row in dto["messages"]], [3, 2])
        self.assertTrue(dto["pagination"]["has_more"])
        self.assertEqual(dto["pagination"]["before_sequence"], 2)
        self.assertTrue(dto["messages"][1]["reported_by_viewer"])
        self.assertNotIn("request_fingerprint", str(dto))

    def test_pending_counts_are_action_indicators_not_read_receipts(self) -> None:
        value = qa_application(viewer_role="freelancer")
        value["messages"] = [{
            "id": "m1", "sequence_number": 1, "sender_user_id": "client-1",
            "sender_role": "client", "message_kind": "initial_question",
            "topic": "timeline", "body": "Confirm timeline",
            "created_at": "2026-07-25T01:00:00+00:00",
        }]
        dto = build_thread_dto(value)
        self.assertEqual(dto["pending_question_count"], 1)
        self.assertTrue(dto["qa_requires_attention"])
        self.assertNotIn("unread", dto)
        self.assertNotIn("seen", dto)

    def test_full_summary_keeps_paginated_pending_counts_and_latest_revision_exact(self) -> None:
        value = qa_application()
        value["message_limit"] = 2
        value["messages"] = [
            {
                "id": "m5", "sequence_number": 5, "sender_user_id": "freelancer-1",
                "sender_role": "freelancer", "message_kind": "answer", "body": "Answer",
                "in_reply_to_message_id": "m1", "created_at": "2026-07-25T05:00:00+00:00",
            },
            {
                "id": "m4", "sequence_number": 4, "sender_user_id": "client-1",
                "sender_role": "client", "message_kind": "clarification", "topic": "timeline",
                "body": "Context", "created_at": "2026-07-25T04:00:00+00:00",
            },
            {
                "id": "m3", "sequence_number": 3, "sender_user_id": "client-1",
                "sender_role": "client", "message_kind": "correction", "body": "Correction",
                "corrects_message_id": "m2", "created_at": "2026-07-25T03:00:00+00:00",
            },
        ]
        value["message_summary"] = [
            *value["messages"],
            {
                "id": "m1", "sender_user_id": "client-1",
                "message_kind": "initial_question", "in_reply_to_message_id": None,
                "created_at": "2026-07-25T01:00:00+00:00",
            },
        ]
        value["revisions"] = [{
            "id": "r1", "requested_application_version_id": "application-version-1",
            "requested_material_gig_version_id": "gig-version-1",
            "reason_code": "revise_timeline", "reason_detail": None,
            "status": "declined", "created_at": "2026-07-25T02:00:00+00:00",
            "terminal_at": "2026-07-25T06:00:00+00:00",
            "response_application_version_id": None,
            "response_reason_code": "timeline_stands", "response_reason_detail": None,
        }]
        dto = build_thread_dto(value)
        self.assertEqual(dto["pending_question_count"], 0)
        self.assertEqual(dto["pending_question_count_for_other_participant"], 0)
        self.assertEqual(dto["latest_qa_activity_at"], "2026-07-25T06:00:00+00:00")
        self.assertEqual([row["sequence_number"] for row in dto["messages"]], [5, 4])

    def test_client_correction_turn_is_hidden_when_allowance_is_exhausted(self) -> None:
        client = qa_application()
        client["thread"] = {"initial_client_turn_count": 2}
        self.assertFalse(build_thread_dto(client)["permissions"]["correct_own_message"])
        freelancer = qa_application(viewer_role="freelancer")
        freelancer["thread"] = {"initial_client_turn_count": 2}
        self.assertTrue(build_thread_dto(freelancer)["permissions"]["correct_own_message"])

    def test_safety_is_high_confidence_without_blocking_technical_terms(self) -> None:
        self.assertEqual(
            message_safety_code("Email me at buyer@example.com"),
            "contact_information_not_allowed",
        )
        self.assertEqual(
            message_safety_code("Please share the OTP and access token"),
            "credential_request_not_allowed",
        )
        self.assertIsNone(
            message_safety_code("Which API token authentication design would you use?")
        )

    def test_strict_contracts_reject_unknown_and_require_other_detail(self) -> None:
        with self.assertRaises(ValueError):
            InitialQuestionRequest.model_validate({
                "request_id": "95e99453-7d9a-4c75-9f71-1a8ab5c44ba1",
                "topic": "timeline",
                "body": "Please confirm the timeline.",
                "sender_role": "client",
            })
        with self.assertRaises(ValueError):
            CreateRevisionRequest.model_validate({
                "request_id": "95e99453-7d9a-4c75-9f71-1a8ab5c44ba1",
                "reason_code": "other",
                "expected_application_version_id": "95e99453-7d9a-4c75-9f71-1a8ab5c44ba2",
                "expected_material_gig_version_id": "95e99453-7d9a-4c75-9f71-1a8ab5c44ba3",
            })


class QaRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repo = FakeQaRepository()
        self.auth = FakeAuthVerifier("client-1")
        app.dependency_overrides[qa_routes.get_auth_verifier] = lambda: self.auth
        app.dependency_overrides[qa_routes.get_qa_repository] = lambda: self.repo

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    def request(self, method: str, path: str, body: dict[str, Any] | None = None) -> tuple[int, Any]:
        return asyncio.run(request_json(method, path, body))

    def test_participant_read_and_non_enumerating_cross_user(self) -> None:
        status, body = self.request("GET", "/applications/application-1/qa")
        self.assertEqual(status, 200)
        self.assertEqual(body["mode"], "initial_clarification")
        self.auth.user_id = "missing-user"
        status, body = self.request("GET", "/applications/application-1/qa")
        self.assertEqual(status, 403)
        self.assertEqual(body["detail"], "qa_participant_role_required")
        for actor_id in ("other-client", "other-freelancer"):
            with self.subTest(actor_id=actor_id):
                self.auth.user_id = actor_id
                status, body = self.request("GET", "/applications/application-1/qa")
                self.assertEqual(status, 404)
                self.assertEqual(body["detail"], "application_qa_not_found")

    def test_wrong_trusted_role_is_forbidden(self) -> None:
        self.auth.user_id = "admin-1"
        status, body = self.request("GET", "/applications/application-1/qa")
        self.assertEqual(status, 403)
        self.assertEqual(body["detail"], "qa_participant_role_required")

    def test_initial_question_derives_operation_and_trusted_rate_policy(self) -> None:
        status, _ = self.request("POST", "/applications/application-1/qa/questions", {
            "request_id": "95e99453-7d9a-4c75-9f71-1a8ab5c44ba1",
            "topic": "timeline",
            "body": "Could you confirm the delivery timeline?",
        })
        self.assertEqual(status, 200)
        name, payload = self.repo.calls[-1]
        self.assertEqual(name, "qa_write_message")
        self.assertEqual(payload["p_operation"], "initial_question")
        self.assertEqual(payload["p_acting_user_id"], "client-1")
        self.assertEqual(payload["p_burst_limit"], 8)
        self.assertNotIn("sender_role", payload)

    def test_initial_question_enforces_the_narrower_body_limit_before_rpc(self) -> None:
        status, body = self.request("POST", "/applications/application-1/qa/questions", {
            "request_id": "95e99453-7d9a-4c75-9f71-1a8ab5c44ba1",
            "topic": "timeline",
            "body": "x" * 601,
        })
        self.assertEqual(status, 422)
        self.assertEqual(body["detail"], "invalid_question_response")
        self.assertEqual(self.repo.calls, [])

    def test_separate_structured_routes_derive_each_narrow_rpc_operation(self) -> None:
        request_id = "95e99453-7d9a-4c75-9f71-1a8ab5c44ba1"
        cases = [
            (
                "POST", "/applications/application-1/qa/messages",
                {"request_id": request_id, "topic": "timeline", "body": "Timeline context."},
                "qa_write_message", "clarification",
            ),
            (
                "POST", "/applications/application-1/qa/questions/question-1/answer",
                {"request_id": request_id, "body": "Four weeks."},
                "qa_write_message", "answer",
            ),
            (
                "POST", "/applications/application-1/qa/questions/question-1/decline",
                {"request_id": request_id, "reason_code": "insufficient_context"},
                "qa_write_message", "decline",
            ),
            (
                "POST", "/applications/application-1/qa/messages/message-1/correct",
                {"request_id": request_id, "body": "Corrected context."},
                "qa_write_message", "correction",
            ),
            (
                "POST", "/applications/application-1/qa/messages/message-1/report",
                {"request_id": request_id, "category": "spam"},
                "qa_report_message", None,
            ),
            (
                "POST", "/applications/application-1/revision-requests/revision-1/decline",
                {"request_id": request_id, "reason_code": "request_unclear"},
                "revision_decline_request", None,
            ),
        ]
        for method, path, payload, expected_rpc, expected_operation in cases:
            with self.subTest(path=path):
                self.repo.calls.clear()
                status, _ = self.request(method, path, payload)
                self.assertEqual(status, 200)
                rpc, rpc_payload = self.repo.calls[-1]
                self.assertEqual(rpc, expected_rpc)
                self.assertEqual(rpc_payload["p_acting_user_id"], "client-1")
                if expected_operation:
                    self.assertEqual(rpc_payload["p_operation"], expected_operation)

    def test_frontend_safety_code_prevents_rpc_and_preserves_stable_error(self) -> None:
        status, body = self.request("POST", "/applications/application-1/qa/questions", {
            "request_id": "95e99453-7d9a-4c75-9f71-1a8ab5c44ba1",
            "topic": "timeline",
            "body": "Please email me at buyer@example.com.",
        })
        self.assertEqual(status, 422)
        self.assertEqual(body["detail"], "contact_information_not_allowed")
        self.assertEqual(self.repo.calls, [])

    def test_freelancer_stop_uses_verified_identity_and_reloads_response_only(self) -> None:
        self.auth.user_id = "freelancer-1"
        status, body = self.request(
            "POST",
            "/applications/application-1/qa/stop-pre-advancement",
            {"request_id": "95e99453-7d9a-4c75-9f71-1a8ab5c44ba1"},
        )
        self.assertEqual(status, 200)
        self.assertEqual(body["mode"], "initial_response_only")
        self.assertEqual(self.repo.calls[-1][1]["p_acting_user_id"], "freelancer-1")

    def test_rate_limit_maps_retry_after_without_raw_database_error(self) -> None:
        self.repo.error = MarketplaceWriteError("M7F_QA_RATE_LIMITED:73")
        status, body = self.request("POST", "/applications/application-1/qa/questions", {
            "request_id": "95e99453-7d9a-4c75-9f71-1a8ab5c44ba1",
            "topic": "timeline",
            "body": "Could you confirm the delivery timeline?",
        })
        self.assertEqual(status, 429)
        self.assertEqual(body["detail"], "qa_rate_limit_exceeded")
        self.assertNotIn("M7F", str(body))

    def test_revision_creation_binds_exact_versions_and_policy(self) -> None:
        self.repo.application["stage"] = "advanced"
        self.repo.application["thread"] = {
            "full_discussion_unlocked_at": "2026-07-25T00:00:00+00:00",
            "initial_client_turn_count": 1,
        }
        status, _ = self.request("POST", "/applications/application-1/revision-requests", {
            "request_id": "95e99453-7d9a-4c75-9f71-1a8ab5c44ba1",
            "reason_code": "revise_timeline",
            "expected_application_version_id": "95e99453-7d9a-4c75-9f71-1a8ab5c44ba2",
            "expected_material_gig_version_id": "95e99453-7d9a-4c75-9f71-1a8ab5c44ba3",
        })
        self.assertEqual(status, 200)
        name, payload = self.repo.calls[-1]
        self.assertEqual(name, "revision_create_request")
        self.assertEqual(payload["p_daily_limit"], 3)
        self.assertEqual(
            payload["p_expected_application_version_id"],
            "95e99453-7d9a-4c75-9f71-1a8ab5c44ba2",
        )

    def test_linked_revision_update_sends_complete_snapshot(self) -> None:
        self.auth.user_id = "freelancer-1"
        status, _ = self.request(
            "POST",
            "/applications/application-1/revision-requests/revision-1/submit-update",
            {
                "request_id": "95e99453-7d9a-4c75-9f71-1a8ab5c44ba1",
                "expected_application_version_token": "t" * 64,
                "snapshot": fixed_application(),
            },
        )
        self.assertEqual(status, 200)
        name, payload = self.repo.calls[-1]
        self.assertEqual(name, "revision_submit_update")
        self.assertEqual(payload["p_revision_request_id"], "revision-1")
        self.assertIn("proposal", payload["p_snapshot"])

    def test_idempotency_conflict_is_sanitized(self) -> None:
        self.repo.error = MarketplaceWriteError("M7F_IDEMPOTENCY_CONFLICT")
        status, body = self.request("POST", "/applications/application-1/qa/questions", {
            "request_id": "95e99453-7d9a-4c75-9f71-1a8ab5c44ba1",
            "topic": "timeline",
            "body": "Could you confirm the delivery timeline?",
        })
        self.assertEqual(status, 409)
        self.assertEqual(body["detail"], "idempotency_conflict")


if __name__ == "__main__":
    unittest.main()
