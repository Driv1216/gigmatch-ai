from __future__ import annotations

import asyncio
import json
import unittest
from copy import deepcopy
from typing import Any
from urllib.parse import urlsplit

from app.api.routes import applications as application_routes
from app.main import app
from app.marketplace.application_contracts import ApplicationSnapshotInput
from app.marketplace.data_access import MarketplaceWriteError
from tests.test_gig_discovery import make_gig
from tests.test_matching_data_access import FakeAuthVerifier


def fixed_application(total: str = "1500.00") -> dict[str, Any]:
    return {
        "cover_note": "I can deliver the complete API.",
        "proposal": {"payment_structure": "fixed_price", "mode": "exact_total", "exact_total": total},
        "timeline": {"mode": "exact", "unit": "weeks", "exact_value": "4"},
        "availability": {"available_from": "2098-01-01"},
        "scope": {
            "included_work": ["API"], "excluded_work": ["Hosting"],
            "assumptions": ["Access"], "estimate_change_factors": ["Scope changes"],
        },
    }


def hourly_application() -> dict[str, Any]:
    value = fixed_application()
    value["proposal"] = {
        "payment_structure": "hourly", "requested_hourly_rate": "50.25",
        "weekly_availability_hours": {"minimum": "20", "maximum": "30"},
        "available_from": "2098-01-01", "rate_flexibility": "negotiable",
    }
    value["availability"]["weekly_hours"] = {"minimum": "20", "maximum": "30"}
    return value


def open_application() -> dict[str, Any]:
    value = fixed_application()
    value["proposal"] = {
        "payment_structure": "open_to_proposals", "mode": "phased_estimate",
        "phases": [{"name": "Build", "amount": "1200.50", "duration": {
            "mode": "exact", "unit": "weeks", "exact_value": "3"
        }}],
    }
    return value


def application_record(gig: dict[str, Any] | None = None) -> dict[str, Any]:
    gig = gig or make_gig("application-gig")
    gig["current_version"]["version_number"] = 2
    gig["current_material_version"] = gig["current_version"]
    answered = deepcopy(gig["current_version"])
    answered["version_number"] = 1
    answered["id"] = "gig-version-1"
    version_one = {
        "id": "application-version-1", "application_id": "application-1", "gig_id": gig["id"],
        "version_number": 1, "gig_version_id": answered["id"], "origin": "initial_submission",
        "cover_note": "Original cover note", "proposal_snapshot": {
            "proposal_contract_version": 1, "snapshot_schema_version": 1,
            "payment_structure": "fixed_price", "currency": "INR", "mode": "exact_total", "exact_total": 60000,
        },
        "timeline_snapshot": {"mode": "exact", "unit": "weeks", "exact_value": 4},
        "availability_snapshot": {"available_from": "2098-01-01"},
        "scope_snapshot": {"included_work": ["API"], "excluded_work": ["Hosting"],
                           "assumptions": ["Access"], "estimate_change_factors": ["Scope"]},
        "scope_notes": "Historical delivery note",
        "created_at": "2026-07-20T00:00:00+00:00", "answered_gig_version": answered,
    }
    version_two = deepcopy(version_one)
    version_two.update({"id": "application-version-2", "version_number": 2, "origin": "freelancer_edit",
                        "cover_note": "Current cover note", "created_at": "2026-07-20T01:00:00+00:00"})
    return {
        "id": "application-1", "gig_id": gig["id"], "freelancer_profile_id": "profile-1",
        "stage": "under_review", "current_version_id": "application-version-2",
        "submitted_at": "2026-07-20T00:00:00+00:00", "last_updated_at": "2026-07-20T01:00:00+00:00",
        "stage_reason_origin": None, "stage_reason_code": None, "stage_reason_payload": None,
        "versions": [version_one, version_two], "current_version": version_two,
        "selection_requests": [], "gig": gig,
    }


class FakeApplicationRepository:
    def __init__(self) -> None:
        self.gig = make_gig("application-gig")
        self.gig["current_material_version"]["version_number"] = 2
        self.gig["existing_application"] = None
        self.application = application_record(self.gig)
        self.calls: list[tuple[str, dict[str, Any]]] = []
        self.profile_reads = 0
        self.user_profiles = {
            "freelancer-1": {"id": "freelancer-1", "role": "freelancer"},
            "client-1": {"id": "client-1", "role": "client"},
            "missing-freelancer": {"id": "missing-freelancer", "role": "freelancer"},
        }
        self.error: MarketplaceWriteError | None = None

    def get_user_profile(self, user_id: str) -> dict[str, Any] | None:
        self.profile_reads += 1
        return self.user_profiles.get(user_id)

    def get_freelancer_profile(self, user_id: str) -> dict[str, Any] | None:
        return {"id": "profile-1", "user_id": user_id} if user_id == "freelancer-1" else None

    def get_application_context(self, gig_id: str, freelancer_profile_id: str) -> dict[str, Any] | None:
        return self.gig if gig_id == self.gig["id"] and freelancer_profile_id == "profile-1" else None

    def get_gig_terms_for_token(self, gig_id: str, terms_token: str) -> dict[str, Any] | None:
        return self.gig["current_material_version"] if gig_id == self.gig["id"] and terms_token == "t" * 64 else None

    def list_freelancer_applications(self, freelancer_profile_id: str) -> list[dict[str, Any]]:
        return [self.application] if freelancer_profile_id == "profile-1" else []

    def get_freelancer_application(self, application_id: str, freelancer_profile_id: str) -> dict[str, Any] | None:
        return self.application if application_id == "application-1" and freelancer_profile_id == "profile-1" else None

    def call_application_mutation(self, function_name: str, payload: dict[str, Any]) -> dict[str, Any]:
        self.calls.append((function_name, payload))
        if self.error:
            raise self.error
        return {"code": "ok", "application_id": "application-1", "idempotent_replay": True}


async def request_json(method: str, path: str, body: dict[str, Any] | None = None, *, auth: bool = True) -> tuple[int, Any]:
    parsed = urlsplit(path)
    raw = json.dumps(body).encode() if body is not None else b""
    headers = [(b"host", b"test"), (b"content-type", b"application/json")]
    if auth:
        headers.append((b"authorization", b"Bearer token"))
    events: list[dict[str, Any]] = []
    sent = False
    scope = {"type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1", "method": method,
             "scheme": "http", "path": parsed.path, "raw_path": parsed.path.encode(),
             "query_string": parsed.query.encode(), "headers": headers, "client": ("test", 1), "server": ("test", 80)}

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


class ApplicationContractTests(unittest.TestCase):
    def test_fixed_hourly_and_open_contracts_use_decimal_without_float_validation(self) -> None:
        fixed = ApplicationSnapshotInput.model_validate(fixed_application("1500.10"))
        hourly = ApplicationSnapshotInput.model_validate(hourly_application())
        opened = ApplicationSnapshotInput.model_validate(open_application())
        self.assertEqual(str(fixed.proposal.exact_total), "1500.10")
        self.assertEqual(str(hourly.proposal.requested_hourly_rate), "50.25")
        self.assertEqual(str(opened.proposal.phases[0].amount), "1200.50")

    def test_open_scope_and_variant_are_strict(self) -> None:
        invalid = open_application()
        invalid["scope"]["estimate_change_factors"] = []
        with self.assertRaises(ValueError):
            ApplicationSnapshotInput.model_validate(invalid)
        invalid = open_application()
        invalid["proposal"]["hourly_rate"] = "10"
        with self.assertRaises(ValueError):
            ApplicationSnapshotInput.model_validate(invalid)


class ApplicationRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repo = FakeApplicationRepository()
        self.auth = FakeAuthVerifier("freelancer-1")
        app.dependency_overrides[application_routes.get_auth_verifier] = lambda: self.auth
        app.dependency_overrides[application_routes.get_application_repository] = lambda: self.repo

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    def test_authentication_happens_before_repository_access(self) -> None:
        status, _ = asyncio.run(request_json("GET", "/applications", auth=False))
        self.assertEqual(status, 401)
        self.assertEqual(self.repo.profile_reads, 0)

    def test_wrong_role_and_missing_freelancer_profile_fail_closed(self) -> None:
        self.auth = FakeAuthVerifier("client-1")
        status, data = asyncio.run(request_json("GET", "/applications"))
        self.assertEqual((status, data["detail"]), (403, "freelancer_role_required"))
        self.auth = FakeAuthVerifier("missing-freelancer")
        status, data = asyncio.run(request_json("GET", "/applications"))
        self.assertEqual((status, data["detail"]), (403, "freelancer_profile_required"))

    def test_application_context_state_matrix_and_non_actionable_tokens(self) -> None:
        status, eligible = asyncio.run(request_json("GET", "/gigs/application-gig/application-context"))
        self.assertEqual(status, 200)
        self.assertTrue(eligible["can_apply"])
        self.assertIsNotNone(eligible["material_terms_token"])
        for state, blocker in (("paused", "gig_paused"), ("closed_to_new_applications", "applications_closed"),
                               ("filled", "gig_filled"), ("cancelled", "gig_cancelled")):
            replacement = make_gig("application-gig", state=state)
            replacement["current_material_version"]["version_number"] = 2
            replacement["existing_application"] = None
            self.repo.gig = replacement
            status, data = asyncio.run(request_json("GET", "/gigs/application-gig/application-context"))
            self.assertEqual((status, data["blocker"]), (200, blocker))
            self.assertIsNone(data["material_terms_token"])

    def test_existing_history_and_expired_deadline_block_context(self) -> None:
        self.repo.gig["existing_application"] = {"id": "application-1"}
        status, data = asyncio.run(request_json("GET", "/gigs/application-gig/application-context"))
        self.assertEqual((status, data["blocker"], data["existing_application_id"]),
                         (200, "application_already_exists", "application-1"))
        self.repo.gig = make_gig("application-gig", deadline="2020-01-01T00:00:00+00:00")
        self.repo.gig["existing_application"] = None
        status, data = asyncio.run(request_json("GET", "/gigs/application-gig/application-context"))
        self.assertEqual((status, data["blocker"]), (200, "application_deadline_passed"))

    def test_submission_derives_currency_and_actor_and_returns_current_safe_state(self) -> None:
        status, data = asyncio.run(request_json("POST", "/gigs/application-gig/applications", {
            "submission_request_id": "11111111-1111-4111-8111-111111111111",
            "expected_material_terms_token": "t" * 64, "application": fixed_application(),
        }))
        self.assertEqual(status, 200)
        self.assertTrue(data["idempotent_replay"])
        name, payload = self.repo.calls[-1]
        self.assertEqual(name, "submit_application")
        self.assertEqual(payload["p_acting_user_id"], "freelancer-1")
        self.assertEqual(payload["p_snapshot"]["proposal"]["currency"], "INR")
        self.assertNotIn("freelancer_id", payload)

    def test_unknown_fields_are_rejected_before_rpc(self) -> None:
        body = {"submission_request_id": "11111111-1111-4111-8111-111111111111",
                "expected_material_terms_token": "t" * 64, "application": fixed_application(), "stage": "advanced"}
        status, _ = asyncio.run(request_json("POST", "/gigs/application-gig/applications", body))
        self.assertEqual(status, 422)
        self.assertEqual(self.repo.calls, [])

    def test_cross_user_ids_are_non_enumerating(self) -> None:
        status, data = asyncio.run(request_json("GET", "/applications/other-application"))
        self.assertEqual((status, data["detail"]), (404, "application_not_found"))
        status, data = asyncio.run(request_json("POST", "/applications/other-application/withdraw", {
            "expected_application_version_token": "v" * 64, "reason": "no_longer_available"
        }))
        self.assertEqual((status, data["detail"]), (404, "application_not_found"))

    def test_list_detail_and_history_are_deterministic_and_sanitized(self) -> None:
        status, listing = asyncio.run(request_json("GET", "/applications?page=1&page_size=20"))
        self.assertEqual(status, 200)
        self.assertEqual(listing["items"][0]["application_id"], "application-1")
        status, detail = asyncio.run(request_json("GET", "/applications/application-1"))
        self.assertEqual(status, 200)
        self.assertEqual(detail["version_history_count"], 2)
        self.assertEqual(detail["current_application"]["scope_notes"], "Historical delivery note")
        self.assertNotIn("private_note", json.dumps(detail["current_material_terms"]))
        status, history = asyncio.run(request_json("GET", "/applications/application-1/versions"))
        self.assertEqual([row["version_number"] for row in history["items"]], [2, 1])
        serialized = json.dumps({"listing": listing, "detail": detail, "history": history}).lower()
        for forbidden in ("freelancer_profile_id", "created_by_user_id", "selection_requests", "raw_resume",
                          "embedding", "auth_metadata", "service_role", "current_version_id"):
            self.assertNotIn(forbidden, serialized)

    def test_edit_reaffirm_update_withdraw_and_reapply_use_narrow_rpcs(self) -> None:
        calls = (
            ("POST", "/applications/application-1/versions", {
                "expected_application_version_token": "v" * 64, "application": fixed_application()
            }, "create_application_version"),
            ("POST", "/applications/application-1/gig-change/reaffirm", {
                "expected_application_version_token": "v" * 64, "expected_material_terms_token": "t" * 64
            }, "respond_to_application_gig_change"),
            ("POST", "/applications/application-1/gig-change/update", {
                "expected_application_version_token": "v" * 64, "expected_material_terms_token": "t" * 64,
                "application": fixed_application()
            }, "respond_to_application_gig_change"),
            ("POST", "/applications/application-1/withdraw", {
                "expected_application_version_token": "v" * 64, "reason": "gig_changed_materially"
            }, "withdraw_application"),
            ("POST", "/applications/application-1/reapply-after-gig-change", {
                "expected_application_version_token": "v" * 64, "expected_material_terms_token": "t" * 64,
                "application": fixed_application()
            }, "reapply_application_after_gig_change"),
        )
        for method, path, body, expected in calls:
            with self.subTest(path=path):
                status, _ = asyncio.run(request_json(method, path, body))
                self.assertEqual(status, 200)
                self.assertEqual(self.repo.calls[-1][0], expected)

    def test_stable_database_error_mapping_never_leaks_raw_sql(self) -> None:
        self.repo.error = MarketplaceWriteError("duplicate detail M7D_IDEMPOTENCY_KEY_REUSED internal SQL")
        status, data = asyncio.run(request_json("POST", "/gigs/application-gig/applications", {
            "submission_request_id": "11111111-1111-4111-8111-111111111111",
            "expected_material_terms_token": "t" * 64, "application": fixed_application(),
        }))
        self.assertEqual((status, data["detail"]), (409, "idempotency_key_reused"))
        self.assertNotIn("SQL", json.dumps(data))


if __name__ == "__main__":
    unittest.main()
