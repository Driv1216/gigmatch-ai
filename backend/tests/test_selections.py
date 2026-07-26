from __future__ import annotations

import asyncio
import unittest
from copy import deepcopy
from typing import Any

from app.api.routes import selections as selection_routes
from app.main import app
from app.marketplace.data_access import MarketplaceWriteError
from app.marketplace.selection_contracts import (
    CancelSelectionRequest,
    RequestRevisedSelectionTerms,
    SendSelectionRequest,
)
from tests.test_applications import request_json
from tests.test_matching_data_access import FakeAuthVerifier

REQUEST_ID = "11111111-1111-4111-8111-111111111111"
TOKEN = "t" * 64


class FakeSelectionRepository:
    def __init__(self) -> None:
        self.users = {
            "client-1": {"id": "client-1", "role": "client"},
            "freelancer-1": {"id": "freelancer-1", "role": "freelancer"},
            "admin-1": {"id": "admin-1", "role": "admin"},
        }
        self.calls: list[tuple[str, dict[str, Any]]] = []
        self.error: MarketplaceWriteError | None = None
        self.result: dict[str, Any] | None = None

    def get_user_profile(self, user_id: str) -> dict[str, Any] | None:
        return self.users.get(user_id)

    def call_selection(self, function_name: str, payload: dict[str, Any]) -> dict[str, Any]:
        self.calls.append((function_name, deepcopy(payload)))
        if self.error is not None:
            raise self.error
        if self.result is not None:
            return deepcopy(self.result)
        if function_name == "selection_get_context":
            return {
                "application_id": payload["p_application_id"],
                "viewer_role": "client",
                "can_send": True,
                "send_token": TOKEN,
                "blockers": [],
            }
        if function_name == "selection_list_requests":
            return {"application_id": payload["p_application_id"], "items": []}
        if function_name == "selection_get_request":
            return {
                "selection_request_id": payload["p_selection_request_id"],
                "status": "pending",
                "response_token": TOKEN,
            }
        return {
            "selection_request_id": payload.get("p_selection_request_id", "request-1"),
            "status": "pending",
            "idempotent_replay": False,
        }


class SelectionContractTests(unittest.TestCase):
    def test_send_duration_and_unknown_fields_are_strict(self) -> None:
        with self.assertRaises(ValueError):
            SendSelectionRequest.model_validate({
                "duration_hours": 36,
                "send_token": TOKEN,
                "request_id": REQUEST_ID,
            })
        with self.assertRaises(ValueError):
            SendSelectionRequest.model_validate({
                "duration_hours": 48,
                "send_token": TOKEN,
                "request_id": REQUEST_ID,
                "gig_version_id": "browser-authority",
            })

    def test_structured_other_reason_and_revision_categories_are_strict(self) -> None:
        with self.assertRaises(ValueError):
            CancelSelectionRequest.model_validate({
                "management_token": TOKEN,
                "request_id": REQUEST_ID,
                "reason_code": "other",
            })
        with self.assertRaises(ValueError):
            RequestRevisedSelectionTerms.model_validate({
                "response_token": TOKEN,
                "request_id": REQUEST_ID,
                "change_categories": ["scope", "scope"],
            })


class SelectionRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repo = FakeSelectionRepository()
        self.auth = FakeAuthVerifier("client-1")
        app.dependency_overrides[selection_routes.get_auth_verifier] = lambda: self.auth
        app.dependency_overrides[selection_routes.get_selection_repository] = lambda: self.repo

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    def request(
        self, method: str, path: str, body: dict[str, Any] | None = None
    ) -> tuple[int, Any]:
        return asyncio.run(request_json(method, path, body))

    def test_reads_use_verified_identity_and_exact_rpc(self) -> None:
        cases = (
            ("GET", "/applications/application-1/selection-context", "selection_get_context"),
            ("GET", "/selection-requests/request-1", "selection_get_request"),
            (
                "GET",
                "/applications/application-1/selection-requests",
                "selection_list_requests",
            ),
        )
        for method, path, expected in cases:
            with self.subTest(path=path):
                self.repo.calls.clear()
                status, _ = self.request(method, path)
                self.assertEqual(status, 200)
                name, payload = self.repo.calls[-1]
                self.assertEqual(name, expected)
                self.assertEqual(payload["p_acting_user_id"], "client-1")

    def test_authentication_and_participant_role_fail_closed(self) -> None:
        status, body = asyncio.run(
            request_json("GET", "/applications/application-1/selection-context", auth=False)
        )
        self.assertEqual((status, body["detail"]), (401, "authentication_required"))
        self.auth.user_id = "admin-1"
        status, body = self.request(
            "GET", "/applications/application-1/selection-context"
        )
        self.assertEqual((status, body["detail"]), (403, "selection_action_not_allowed"))

    def test_send_forwards_only_narrow_browser_contract_and_trusted_actor(self) -> None:
        status, _ = self.request(
            "POST",
            "/applications/application-1/selection-requests",
            {
                "duration_hours": 48,
                "send_token": TOKEN,
                "request_id": REQUEST_ID,
                "commercial_acknowledged": True,
            },
        )
        self.assertEqual(status, 200)
        name, payload = self.repo.calls[-1]
        self.assertEqual(name, "selection_send_request")
        self.assertEqual(payload["p_acting_user_id"], "client-1")
        self.assertEqual(payload["p_duration_hours"], 48)
        for forbidden in (
            "p_gig_version_id",
            "p_application_version_id",
            "p_expires_at",
            "p_client_user_id",
            "p_snapshot",
        ):
            self.assertNotIn(forbidden, payload)

    def test_cancel_uses_structured_reason_and_management_token(self) -> None:
        status, _ = self.request(
            "POST",
            "/selection-requests/request-1/cancel",
            {
                "management_token": TOKEN,
                "request_id": REQUEST_ID,
                "reason_code": "terms_require_review",
                "detail": "Need one internal review.",
            },
        )
        self.assertEqual(status, 200)
        name, payload = self.repo.calls[-1]
        self.assertEqual(name, "selection_cancel_request")
        self.assertEqual(payload["p_reason_code"], "terms_require_review")
        self.assertEqual(payload["p_expected_management_token"], TOKEN)

    def test_each_freelancer_route_derives_one_response_action(self) -> None:
        self.auth.user_id = "freelancer-1"
        cases = (
            (
                "/selection-requests/request-1/accept",
                {"response_token": TOKEN, "request_id": REQUEST_ID,
                 "exact_terms_confirmed": True},
                "accept",
            ),
            (
                "/selection-requests/request-1/decline-remain-interested",
                {"response_token": TOKEN, "request_id": REQUEST_ID},
                "decline_remain_interested",
            ),
            (
                "/selection-requests/request-1/decline-withdraw",
                {"response_token": TOKEN, "request_id": REQUEST_ID,
                 "reason_code": "no_longer_available"},
                "decline_withdraw",
            ),
            (
                "/selection-requests/request-1/request-revised-terms",
                {"response_token": TOKEN, "request_id": REQUEST_ID,
                 "change_categories": ["scope", "timeline"]},
                "request_revised_terms",
            ),
        )
        for path, body, expected_action in cases:
            with self.subTest(path=path):
                self.repo.calls.clear()
                status, _ = self.request("POST", path, body)
                self.assertEqual(status, 200)
                name, payload = self.repo.calls[-1]
                self.assertEqual(name, "selection_respond_request")
                self.assertEqual(payload["p_action"], expected_action)
                self.assertEqual(payload["p_acting_user_id"], "freelancer-1")

    def test_exact_acceptance_confirmation_is_required_before_rpc(self) -> None:
        self.auth.user_id = "freelancer-1"
        status, _ = self.request(
            "POST",
            "/selection-requests/request-1/accept",
            {
                "response_token": TOKEN,
                "request_id": REQUEST_ID,
                "exact_terms_confirmed": False,
            },
        )
        self.assertEqual(status, 422)
        self.assertEqual(self.repo.calls, [])

    def test_expiry_result_commits_projection_then_maps_to_stable_conflict(self) -> None:
        self.repo.result = {
            "selection_request_id": "request-1",
            "status": "expired",
            "code": "selection_request_expired",
        }
        status, body = self.request(
            "POST",
            "/selection-requests/request-1/cancel",
            {
                "management_token": TOKEN,
                "request_id": REQUEST_ID,
                "reason_code": "client_withdrew_request",
            },
        )
        self.assertEqual((status, body["detail"]), (409, "selection_request_expired"))

    def test_database_errors_are_sanitized_to_stable_codes(self) -> None:
        cases = (
            ("M7G_SELECTION_REQUEST_NOT_FOUND internal", 404, "selection_request_not_found"),
            ("M7G_STALE_SELECTION_RESPONSE hash", 409, "stale_selection_response"),
            ("M7G_IDEMPOTENCY_CONFLICT private", 409, "idempotency_conflict"),
            (
                "M7G_UNCHANGED_SELECTION_RESEND_BLOCKED",
                409,
                "unchanged_selection_resend_blocked",
            ),
        )
        self.auth.user_id = "freelancer-1"
        for marker, expected_status, expected_detail in cases:
            with self.subTest(marker=marker):
                self.repo.error = MarketplaceWriteError(marker)
                status, body = self.request(
                    "GET", "/selection-requests/request-1"
                )
                self.assertEqual((status, body["detail"]), (expected_status, expected_detail))
                self.assertNotIn("M7G", str(body))

    def test_different_key_resolved_response_returns_only_safe_current_summary(self) -> None:
        self.auth.user_id = "freelancer-1"
        self.repo.error = MarketplaceWriteError(
            "M7G_SELECTION_RESPONSE_ALREADY_RESOLVED",
            detail=(
                '{"selection_request_id":"request-1","gig_id":"gig-1",'
                '"application_id":"application-1","status":"accepted",'
                '"engagement_id":"engagement-1","engagement_status":"confirmed",'
                '"accepted_terms_snapshot":{"secret":"must-not-leak"}}'
            ),
        )
        status, body = self.request("GET", "/selection-requests/request-1")
        self.assertEqual(status, 409)
        self.assertEqual(body["detail"]["code"], "selection_response_already_resolved")
        self.assertEqual(
            body["detail"]["current"],
            {
                "selection_request_id": "request-1",
                "gig_id": "gig-1",
                "application_id": "application-1",
                "status": "accepted",
                "engagement_id": "engagement-1",
                "engagement_status": "confirmed",
            },
        )
        self.assertNotIn("accepted_terms_snapshot", str(body))

    def test_unmapped_database_error_does_not_leak(self) -> None:
        self.repo.error = MarketplaceWriteError(
            "raw SQL function private.confirm_selection_request_core failed"
        )
        status, body = self.request("GET", "/selection-requests/request-1")
        self.assertEqual((status, body["detail"]), (500, "selection_write_failed"))
        self.assertNotIn("private", str(body))


if __name__ == "__main__":
    unittest.main()
