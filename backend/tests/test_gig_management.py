from __future__ import annotations

import asyncio
import json
import unittest
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlsplit

from app.api.routes import gigs as gig_routes
from app.main import app
from app.marketplace.data_access import MarketplaceWriteError
from app.marketplace.gig_management import (
    GigManagementValidationError,
    canonical_complete_snapshot,
    changed_fields,
    material_changed_fields,
    require_future_application_deadline,
)
from app.marketplace.reasons import IntakeClosureDetail, IntakeClosureReason
from tests.test_gig_discovery import make_gig
from tests.test_matching_data_access import FakeAuthVerifier


def snapshot() -> dict[str, Any]:
    return {
        "payment_structure": "fixed_price",
        "currency": "usd",
        "title": "API Build",
        "description": "Build a production API.",
        "scope": {"tech_category": "Backend"},
        "client_payment": {
            "payment_structure": "fixed_price",
            "currency": "USD",
            "budget": {"minimum": 1000, "maximum": 2000},
            "flexibility": "negotiable",
        },
        "required_skills": ["FastAPI", "PostgreSQL"],
        "preferred_skills": ["Docker"],
        "experience_requirement": "mid",
        "difficulty_level": "intermediate",
        "work_mode": "remote",
        "location_requirements": None,
        "weekly_commitment": None,
        "expected_duration": None,
        "application_deadline": "2099-12-01T12:00:00+05:30",
        "project_deadline": "2100-01-01T12:00:00+05:30",
        "deliverables": ["API", "Tests"],
        "assumptions": [],
    }


class GigTermsTests(unittest.TestCase):
    def test_complete_contract_is_normalized_and_deadlines_are_utc(self) -> None:
        result = canonical_complete_snapshot(snapshot())
        self.assertEqual(result["terms_contract_version"], 1)
        self.assertEqual(result["currency"], "USD")
        self.assertEqual(result["application_deadline"], "2099-12-01T06:30:00+00:00")
        require_future_application_deadline(result, datetime(2026, 7, 18, tzinfo=timezone.utc))

    def test_naive_deadline_and_incomplete_payment_fail_closed(self) -> None:
        candidate = snapshot()
        candidate["application_deadline"] = "2099-12-01T12:00:00"
        with self.assertRaisesRegex(GigManagementValidationError, "timezone-aware"):
            canonical_complete_snapshot(candidate)
        candidate = snapshot()
        candidate["client_payment"].pop("budget")
        with self.assertRaises(GigManagementValidationError):
            canonical_complete_snapshot(candidate)

    def test_deadline_equal_to_authoritative_now_is_not_future(self) -> None:
        candidate = canonical_complete_snapshot(snapshot())
        exact = datetime.fromisoformat(candidate["application_deadline"])
        with self.assertRaisesRegex(GigManagementValidationError, "future"):
            require_future_application_deadline(candidate, exact)

    def test_skill_order_is_noop_case_only_title_is_minor_and_budget_is_material(self) -> None:
        previous = canonical_complete_snapshot(snapshot())
        reordered = snapshot()
        reordered["required_skills"] = ["PostgreSQL", "FastAPI"]
        self.assertEqual(changed_fields(previous, canonical_complete_snapshot(reordered)), [])
        case_only = deepcopy(previous)
        case_only["title"] = "API BUILD"
        self.assertEqual(material_changed_fields(previous, case_only), [])
        self.assertEqual(changed_fields(previous, case_only), ["title"])
        budget = deepcopy(previous)
        budget["client_payment"]["budget"]["maximum"] = 2500
        self.assertIn("client_payment", material_changed_fields(previous, budget))

    def test_intake_other_requires_explanation(self) -> None:
        with self.assertRaises(ValueError):
            IntakeClosureDetail(IntakeClosureReason.OTHER)
        IntakeClosureDetail(IntakeClosureReason.OTHER, "Reviewing the role.")


class FakeManagementRepository:
    def __init__(self) -> None:
        record = make_gig("managed")
        record["current_version"]["version_number"] = 2
        record["current_version"]["changed_fields"] = ["client_payment"]
        record["current_material_version"] = record["current_version"]
        record["active_application_count"] = 3
        record["selection_requests"] = [{"gig_id": "managed", "status": "pending", "expires_at": "2099-01-01T00:00:00+00:00"}]
        self.record = record
        self.calls: list[tuple[str, dict[str, Any]]] = []
        self.error: MarketplaceWriteError | None = None
        self.profiles = {"client-1": {"id": "client-1", "role": "client"}, "freelancer-1": {"id": "freelancer-1", "role": "freelancer"}}

    def get_user_profile(self, user_id: str) -> dict[str, Any] | None:
        return self.profiles.get(user_id)

    def list_owner_gigs(self, owner_id: str) -> list[dict[str, Any]]:
        return [self.record] if owner_id == "client-1" else []

    def get_owner_gig(self, gig_id: str, owner_id: str) -> dict[str, Any] | None:
        return self.record if gig_id == "managed" and owner_id == "client-1" else None

    def call_gig_management(self, function_name: str, payload: dict[str, Any]) -> dict[str, Any]:
        self.calls.append((function_name, payload))
        if self.error:
            raise self.error
        return {"code": "ready"}


async def request_json(method: str, path: str, body: dict[str, Any] | None = None) -> tuple[int, Any]:
    parsed = urlsplit(path)
    raw = json.dumps(body).encode() if body is not None else b""
    events: list[dict[str, Any]] = []
    sent = False
    scope = {
        "type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1", "method": method,
        "scheme": "http", "path": parsed.path, "raw_path": parsed.path.encode(), "query_string": parsed.query.encode(),
        "headers": [(b"host", b"test"), (b"authorization", b"Bearer token"), (b"content-type", b"application/json")],
        "client": ("test", 1), "server": ("test", 80),
    }
    async def receive() -> dict[str, Any]:
        nonlocal sent
        if not sent:
            sent = True
            return {"type": "http.request", "body": raw, "more_body": False}
        return {"type": "http.disconnect"}
    async def send(message: dict[str, Any]) -> None:
        events.append(message)
    await app(scope, receive, send)
    status = next(event["status"] for event in events if event["type"] == "http.response.start")
    data = b"".join(event.get("body", b"") for event in events if event["type"] == "http.response.body")
    return status, json.loads(data or b"null")


class GigManagementRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repo = FakeManagementRepository()
        self.auth = FakeAuthVerifier("client-1")
        app.dependency_overrides[gig_routes.get_auth_verifier] = lambda: self.auth
        app.dependency_overrides[gig_routes.get_marketplace_repository] = lambda: self.repo

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    def test_owner_dto_exposes_state_tokens_counts_and_no_applicant_rows(self) -> None:
        status, data = asyncio.run(request_json("GET", "/gigs/managed/manage"))
        self.assertEqual(status, 200)
        self.assertEqual(data["optimistic_concurrency_token"], "version-managed")
        self.assertEqual(data["active_application_count"], 3)
        self.assertTrue(data["effectively_active_selection_request"])
        serialized = json.dumps(data)
        self.assertNotIn("freelancer_profile_id", serialized)
        self.assertNotIn("proposal_snapshot", serialized)
        self.assertNotIn("private_note", serialized)
        self.assertNotIn("raw_parser_input", serialized)

    def test_preview_derives_actor_and_canonical_contract(self) -> None:
        status, data = asyncio.run(request_json("POST", "/gigs/managed/edits/preview", {
            "expected_current_gig_version_id": "version-managed", "snapshot": snapshot()
        }))
        self.assertEqual((status, data), (200, {"code": "ready"}))
        name, payload = self.repo.calls[-1]
        self.assertEqual(name, "preview_gig_edit")
        self.assertEqual(payload["p_acting_user_id"], "client-1")
        self.assertEqual(payload["p_snapshot"]["terms_contract_version"], 1)

    def test_wrong_role_denied_before_rpc(self) -> None:
        self.auth = FakeAuthVerifier("freelancer-1")
        status, data = asyncio.run(request_json("POST", "/gigs/managed/resume"))
        self.assertEqual(status, 403)
        self.assertEqual(data["detail"], "client_role_required")
        self.assertEqual(self.repo.calls, [])

    def test_client_cannot_supply_materiality_or_changed_fields(self) -> None:
        status, _ = asyncio.run(request_json("POST", "/gigs/managed/edits", {
            "expected_current_gig_version_id": "version-managed", "snapshot": snapshot(),
            "is_material": False, "changed_fields": [],
        }))
        self.assertEqual(status, 422)
        self.assertEqual(self.repo.calls, [])

    def test_stale_and_material_preview_errors_are_stable(self) -> None:
        self.repo.error = MarketplaceWriteError("M7CB_STALE_GIG_VERSION")
        status, data = asyncio.run(request_json("POST", "/gigs/managed/edits", {
            "expected_current_gig_version_id": "old", "snapshot": snapshot()
        }))
        self.assertEqual((status, data["detail"]), (409, "stale_gig_version"))
        self.repo.error = MarketplaceWriteError(
            "M7CB_MATERIAL_CHANGE_CONFIRMATION_REQUIRED",
            detail='{"code":"material_change_confirmation_required","affected_application_count":3}',
        )
        status, data = asyncio.run(request_json("POST", "/gigs/managed/edits", {
            "expected_current_gig_version_id": "version-managed", "snapshot": snapshot()
        }))
        self.assertEqual(status, 409)
        self.assertEqual(data["detail"]["affected_application_count"], 3)

    def test_cancel_uses_structured_existing_reason_contract(self) -> None:
        status, _ = asyncio.run(request_json("POST", "/gigs/managed/cancel", {
            "reason": "business_priorities_changed",
            "applicant_facing_explanation": "The opportunity has been cancelled.",
            "closes_active_records_confirmed": True,
        }))
        self.assertEqual(status, 200)
        _, payload = self.repo.calls[-1]
        self.assertNotIn("actor_id", payload["p_detail"])
        self.assertEqual(payload["p_reason_code"], "business_priorities_changed")


if __name__ == "__main__":
    unittest.main()
