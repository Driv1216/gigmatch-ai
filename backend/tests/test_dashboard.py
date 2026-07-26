from __future__ import annotations

import asyncio
import json
import unittest
from copy import deepcopy
from typing import Any
from urllib.parse import urlsplit

from app.api.routes import dashboard as dashboard_routes
from app.main import app
from app.marketplace.dashboard_contracts import (
    ClientDashboardResponse,
    FreelancerDashboardResponse,
    assert_dashboard_payload_safe,
)
from app.marketplace.data_access import MarketplaceWriteError
from tests.test_matching_data_access import FakeAuthVerifier


UUIDS = {
    "application": "11111111-1111-4111-8111-111111111111",
    "engagement": "22222222-2222-4222-8222-222222222222",
    "gig": "33333333-3333-4333-8333-333333333333",
    "selection": "44444444-4444-4444-8444-444444444444",
}
NOW = "2026-07-26T12:00:00+00:00"


def collection(items: list[dict[str, Any]], total: int | None = None) -> dict[str, Any]:
    resolved_total = len(items) if total is None else total
    return {
        "items": items,
        "total": resolved_total,
        "limit": 6,
        "has_more": resolved_total > 6,
    }


def engagement_preview() -> dict[str, Any]:
    return {
        "engagement_id": UUIDS["engagement"],
        "gig_id": UUIDS["gig"],
        "application_id": UUIDS["application"],
        "gig_title": "Workflow dashboard",
        "status": "completion_pending",
        "lifecycle_version": 3,
        "confirmed_at": NOW,
        "latest_activity_at": NOW,
        "response_required": True,
    }


def freelancer_payload() -> dict[str, Any]:
    attention = [{
        "action_kind": "selection_response_required",
        "resource_id": UUIDS["selection"],
        "application_id": UUIDS["application"],
        "gig_id": UUIDS["gig"],
        "gig_title": "Workflow dashboard",
        "deadline_at": "2026-07-27T12:00:00+00:00",
        "latest_activity_at": NOW,
    }]
    application = {
        "application_id": UUIDS["application"],
        "gig_id": UUIDS["gig"],
        "gig_title": "Workflow dashboard",
        "stage": "advanced",
        "application_version_number": 2,
        "updated_gig_response_required": False,
        "qa_action_count": 0,
        "has_effective_selection_request": True,
        "last_updated_at": NOW,
    }
    return {
        "authoritative_now": NOW,
        "summary": {
            "total_applications": 1,
            "under_review_applications": 0,
            "advanced_applications": 1,
            "response_required_applications": 1,
            "effective_selection_requests": 1,
            "active_engagements": 1,
        },
        "attention": {
            "items": attention,
            "attention_action_count": 1,
            "attention_resource_count": 1,
            "limit": 8,
            "has_more": False,
        },
        "recent_applications": collection([application]),
        "active_engagements": collection([engagement_preview()]),
    }


def client_payload() -> dict[str, Any]:
    gig = {
        "gig_id": UUIDS["gig"],
        "gig_title": "Workflow dashboard",
        "product_state": "open",
        "opportunity_lifecycle": "active",
        "application_intake": "accepting",
        "operational_state": "active",
        "under_review_count": 1,
        "advanced_count": 1,
        "internal_shortlist_count": 1,
        "client_qa_action_count": 0,
        "has_effective_selection_request": True,
        "latest_application_activity_at": NOW,
    }
    selection = {
        "selection_request_id": UUIDS["selection"],
        "application_id": UUIDS["application"],
        "gig_id": UUIDS["gig"],
        "gig_title": "Workflow dashboard",
        "created_at": NOW,
        "expires_at": "2026-07-27T12:00:00+00:00",
    }
    return {
        "authoritative_now": NOW,
        "summary": {
            "active_owned_gigs": 1,
            "active_applications": 2,
            "under_review_applications": 1,
            "advanced_applications": 1,
            "shortlisted_applications": 1,
            "effective_selection_requests": 1,
            "active_engagements": 1,
        },
        "attention": {
            "items": [],
            "attention_action_count": 0,
            "attention_resource_count": 0,
            "limit": 8,
            "has_more": False,
        },
        "gig_review_overview": collection([gig]),
        "pending_selection_requests": {
            "items": [selection],
            "total": 1,
            "limit": 5,
            "has_more": False,
        },
        "active_engagements": collection([engagement_preview()]),
    }


class FakeDashboardRepository:
    def __init__(self) -> None:
        self.users = {
            "client-1": {"id": "client-1", "role": "client"},
            "freelancer-1": {"id": "freelancer-1", "role": "freelancer"},
            "empty-freelancer": {"id": "empty-freelancer", "role": "freelancer"},
        }
        self.calls: list[tuple[str, dict[str, Any]]] = []
        self.responses = {
            "dashboard_freelancer_get": freelancer_payload(),
            "dashboard_client_get": client_payload(),
        }
        self.error: Exception | None = None

    def get_user_profile(self, user_id: str) -> dict[str, Any] | None:
        return self.users.get(user_id)

    def call_dashboard(
        self, function_name: str, payload: dict[str, Any]
    ) -> dict[str, Any]:
        self.calls.append((function_name, deepcopy(payload)))
        if self.error is not None:
            raise self.error
        if payload["p_acting_user_id"] == "empty-freelancer":
            value = freelancer_payload()
            value["summary"] = {
                key: 0 for key in value["summary"]
            }
            value["attention"] = {
                "items": [],
                "attention_action_count": 0,
                "attention_resource_count": 0,
                "limit": 8,
                "has_more": False,
            }
            value["recent_applications"] = collection([])
            value["active_engagements"] = collection([])
            return value
        return deepcopy(self.responses[function_name])


async def request_with_headers(
    path: str, *, auth: bool = True
) -> tuple[int, dict[str, str], Any]:
    parsed = urlsplit(path)
    headers = [(b"host", b"test")]
    if auth:
        headers.append((b"authorization", b"Bearer token"))
    events: list[dict[str, Any]] = []
    sent = False
    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "GET",
        "scheme": "http",
        "path": parsed.path,
        "raw_path": parsed.path.encode(),
        "query_string": b"",
        "headers": headers,
        "client": ("test", 1),
        "server": ("test", 80),
    }

    async def receive() -> dict[str, Any]:
        nonlocal sent
        if not sent:
            sent = True
            return {"type": "http.request", "body": b"", "more_body": False}
        return {"type": "http.disconnect"}

    async def send(message: dict[str, Any]) -> None:
        events.append(message)

    await app(scope, receive, send)
    start = next(item for item in events if item["type"] == "http.response.start")
    body = b"".join(
        item.get("body", b"")
        for item in events
        if item["type"] == "http.response.body"
    )
    response_headers = {
        key.decode().lower(): value.decode()
        for key, value in start.get("headers", [])
    }
    return start["status"], response_headers, json.loads(body or b"null")


class DashboardContractTests(unittest.TestCase):
    def test_strict_contracts_accept_both_valid_roles(self) -> None:
        self.assertEqual(
            FreelancerDashboardResponse.model_validate(
                freelancer_payload()
            ).summary.total_applications,
            1,
        )
        self.assertEqual(
            ClientDashboardResponse.model_validate(
                client_payload()
            ).summary.shortlisted_applications,
            1,
        )

    def test_extra_and_incoherent_fields_fail_closed(self) -> None:
        extra = freelancer_payload()
        extra["summary"]["unread_count"] = 3
        with self.assertRaises(ValueError):
            FreelancerDashboardResponse.model_validate(extra)
        incoherent = freelancer_payload()
        incoherent["recent_applications"]["total"] = 0
        with self.assertRaises(ValueError):
            FreelancerDashboardResponse.model_validate(incoherent)

    def test_duplicate_action_and_resource_counts_are_distinct(self) -> None:
        value = freelancer_payload()
        value["attention"]["items"].append({
            **value["attention"]["items"][0],
            "action_kind": "qa_response_required",
            "resource_id": "55555555-5555-4555-8555-555555555555",
            "deadline_at": None,
        })
        value["attention"]["attention_action_count"] = 2
        parsed = FreelancerDashboardResponse.model_validate(value)
        self.assertEqual(parsed.attention.attention_action_count, 2)
        self.assertEqual(parsed.attention.attention_resource_count, 1)

    def test_recursive_sensitive_fields_are_rejected(self) -> None:
        for key in ("action_token", "contact_mask", "proposal_snapshot"):
            with self.subTest(key=key), self.assertRaises(ValueError):
                assert_dashboard_payload_safe({"safe": [{"nested": {key: "secret"}}]})


class DashboardRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repo = FakeDashboardRepository()
        self.auth = FakeAuthVerifier("freelancer-1")
        app.dependency_overrides[
            dashboard_routes.get_auth_verifier
        ] = lambda: self.auth
        app.dependency_overrides[
            dashboard_routes.get_dashboard_repository
        ] = lambda: self.repo

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    def request(self, path: str, *, auth: bool = True) -> tuple[int, dict[str, str], Any]:
        return asyncio.run(request_with_headers(path, auth=auth))

    def test_freelancer_dashboard_uses_one_focused_rpc(self) -> None:
        status, headers, body = self.request("/dashboard/freelancer")
        self.assertEqual(status, 200)
        self.assertEqual(body["summary"]["total_applications"], 1)
        self.assertEqual(
            self.repo.calls,
            [(
                "dashboard_freelancer_get",
                {"p_acting_user_id": "freelancer-1"},
            )],
        )
        self.assertEqual(headers["cache-control"], "no-store, private")
        self.assertEqual(headers["pragma"], "no-cache")

    def test_client_dashboard_uses_verified_client(self) -> None:
        self.auth.user_id = "client-1"
        status, _, body = self.request("/dashboard/client")
        self.assertEqual(status, 200)
        self.assertEqual(body["summary"]["shortlisted_applications"], 1)
        self.assertEqual(self.repo.calls[-1][0], "dashboard_client_get")

    def test_wrong_role_and_missing_auth_fail_closed_with_no_store(self) -> None:
        status, headers, body = self.request("/dashboard/client")
        self.assertEqual((status, body["detail"]), (403, "client_dashboard_not_allowed"))
        self.assertEqual(headers["cache-control"], "no-store, private")
        status, headers, body = self.request("/dashboard/freelancer", auth=False)
        self.assertEqual((status, body["detail"]), (401, "authentication_required"))
        self.assertEqual(headers["pragma"], "no-cache")

    def test_empty_account_is_a_valid_dashboard(self) -> None:
        self.auth.user_id = "empty-freelancer"
        status, _, body = self.request("/dashboard/freelancer")
        self.assertEqual(status, 200)
        self.assertEqual(body["summary"]["total_applications"], 0)
        self.assertEqual(body["recent_applications"]["items"], [])

    def test_invalid_and_sensitive_database_payloads_are_sanitized(self) -> None:
        invalid = freelancer_payload()
        invalid["attention"]["items"][0]["action_token"] = "secret"
        self.repo.responses["dashboard_freelancer_get"] = invalid
        status, _, body = self.request("/dashboard/freelancer")
        self.assertEqual((status, body["detail"]), (502, "dashboard_response_invalid"))
        self.assertNotIn("secret", json.dumps(body))

    def test_database_failures_are_sanitized(self) -> None:
        self.repo.error = MarketplaceWriteError(
            "database password=secret relation=private.contact_share_material"
        )
        status, headers, body = self.request("/dashboard/freelancer")
        self.assertEqual((status, body["detail"]), (503, "dashboard_unavailable"))
        self.assertNotIn("secret", json.dumps(body))
        self.assertEqual(headers["cache-control"], "no-store, private")

    def test_recommendations_are_not_part_of_core_dashboard_repository(self) -> None:
        self.request("/dashboard/freelancer")
        self.assertEqual(len(self.repo.calls), 1)
        self.assertNotIn("matching", self.repo.calls[0][0])


if __name__ == "__main__":
    unittest.main()
