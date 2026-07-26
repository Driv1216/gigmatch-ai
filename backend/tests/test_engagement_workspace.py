from __future__ import annotations

import asyncio
import unittest
from copy import deepcopy
from typing import Any

from app.api.routes import engagements as engagement_routes
from app.main import app
from app.marketplace.data_access import MarketplaceWriteError
from app.marketplace.engagement_contracts import (
    CancellationRequest,
    CreateReconsiderationInvitation,
    EngagementActionRequest,
)
from tests.test_applications import request_json
from tests.test_matching_data_access import FakeAuthVerifier

REQUEST_ID = "11111111-1111-4111-8111-111111111111"
TOKEN = "t" * 64


class FakeEngagementRepository:
    def __init__(self) -> None:
        self.users = {
            "client-1": {"id": "client-1", "role": "client"},
            "freelancer-1": {"id": "freelancer-1", "role": "freelancer"},
            "admin-1": {"id": "admin-1", "role": "admin"},
        }
        self.calls: list[tuple[str, dict[str, Any]]] = []
        self.error: MarketplaceWriteError | None = None

    def get_user_profile(self, user_id: str) -> dict[str, Any] | None:
        return self.users.get(user_id)

    def call_engagement(self, function_name: str, payload: dict[str, Any]) -> dict[str, Any]:
        self.calls.append((function_name, deepcopy(payload)))
        if self.error is not None:
            raise self.error
        if function_name == "engagement_list":
            return {"items": [], "count": 0}
        if function_name == "engagement_timeline":
            return {"engagement_id": payload["p_engagement_id"], "items": []}
        if function_name.startswith("reconsideration"):
            return {"invitation_id": payload.get("p_invitation_id", "invitation-1")}
        return {
            "engagement_id": payload.get("p_engagement_id", "engagement-1"),
            "status": "confirmed",
            "allowed_actions": ["prepare_kickoff"],
        }


class EngagementContractTests(unittest.TestCase):
    def test_action_contract_rejects_browser_authority(self) -> None:
        with self.assertRaises(ValueError):
            EngagementActionRequest.model_validate({
                "action_token": TOKEN,
                "request_id": REQUEST_ID,
                "acting_user_id": "browser-controlled",
            })

    def test_cancellation_and_invitation_other_require_explanation(self) -> None:
        with self.assertRaises(ValueError):
            CancellationRequest.model_validate({
                "action_token": TOKEN,
                "request_id": REQUEST_ID,
                "reason_code": "other",
            })
        with self.assertRaises(ValueError):
            CreateReconsiderationInvitation.model_validate({
                "action_token": TOKEN,
                "request_id": REQUEST_ID,
                "reason_code": "other",
            })


class EngagementRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repo = FakeEngagementRepository()
        self.auth = FakeAuthVerifier("client-1")
        app.dependency_overrides[engagement_routes.get_auth_verifier] = lambda: self.auth
        app.dependency_overrides[engagement_routes.get_engagement_repository] = lambda: self.repo

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    def request(
        self, method: str, path: str, body: dict[str, Any] | None = None
    ) -> tuple[int, Any]:
        return asyncio.run(request_json(method, path, body))

    def test_engagement_reads_use_verified_actor_and_focused_rpcs(self) -> None:
        cases = (
            ("/engagements", "engagement_list"),
            ("/engagements/engagement-1", "engagement_get"),
            ("/engagements/engagement-1/timeline", "engagement_timeline"),
        )
        for path, expected in cases:
            with self.subTest(path=path):
                self.repo.calls.clear()
                status, _ = self.request("GET", path)
                self.assertEqual(status, 200)
                name, payload = self.repo.calls[-1]
                self.assertEqual(name, expected)
                self.assertEqual(payload["p_acting_user_id"], "client-1")

    def test_each_lifecycle_route_derives_one_strict_action(self) -> None:
        cases = (
            ("prepare-kickoff", "prepare_kickoff"),
            ("start-work", "start_work"),
            ("completion/request", "request_completion"),
            ("completion/confirm", "confirm_completion"),
            ("completion/reject", "reject_completion"),
            ("cancellation/withdraw", "withdraw_cancellation"),
            ("cancellation/acknowledge", "acknowledge_cancellation"),
        )
        for suffix, action in cases:
            with self.subTest(action=action):
                self.repo.calls.clear()
                status, _ = self.request(
                    "POST",
                    f"/engagements/engagement-1/{suffix}",
                    {"action_token": TOKEN, "request_id": REQUEST_ID},
                )
                self.assertEqual(status, 200)
                name, payload = self.repo.calls[-1]
                self.assertEqual(name, "engagement_transition")
                self.assertEqual(payload["p_action"], action)
                self.assertNotIn("p_status", payload)
                self.assertNotIn("p_lifecycle_version", payload)

    def test_cancellation_forwards_only_structured_reason(self) -> None:
        status, _ = self.request(
            "POST",
            "/engagements/engagement-1/cancellation/request",
            {
                "action_token": TOKEN,
                "request_id": REQUEST_ID,
                "reason_code": "mutual_decision",
                "explanation": "Both participants agreed.",
            },
        )
        self.assertEqual(status, 200)
        _, payload = self.repo.calls[-1]
        self.assertEqual(payload["p_action"], "request_cancellation")
        self.assertEqual(payload["p_reason_code"], "mutual_decision")

    def test_reconsideration_routes_have_explicit_capabilities(self) -> None:
        cases = (
            ("GET", "/applications/application-1/reconsideration-context", None,
             "reconsideration_get_context"),
            ("GET", "/reconsideration-invitations/invitation-1", None,
             "reconsideration_get_invitation"),
            ("POST", "/reconsideration-invitations/invitation-1/reaffirm",
             {"action_token": TOKEN, "request_id": REQUEST_ID},
             "reconsideration_respond_invitation"),
            ("POST", "/reconsideration-invitations/invitation-1/decline",
             {"action_token": TOKEN, "request_id": REQUEST_ID},
             "reconsideration_respond_invitation"),
        )
        for method, path, body, expected in cases:
            with self.subTest(path=path):
                self.repo.calls.clear()
                status, _ = self.request(method, path, body)
                self.assertEqual(status, 200)
                self.assertEqual(self.repo.calls[-1][0], expected)

    def test_auth_and_database_markers_fail_closed(self) -> None:
        status, body = asyncio.run(request_json("GET", "/engagements", auth=False))
        self.assertEqual((status, body["detail"]), (401, "authentication_required"))
        self.auth.user_id = "admin-1"
        status, body = self.request("GET", "/engagements")
        self.assertEqual((status, body["detail"]), (403, "engagement_action_not_allowed"))
        self.auth.user_id = "client-1"
        self.repo.error = MarketplaceWriteError("M7H_ENGAGEMENT_NOT_FOUND internal")
        status, body = self.request("GET", "/engagements/guessed")
        self.assertEqual((status, body["detail"]), (404, "engagement_not_found"))


if __name__ == "__main__":
    unittest.main()
