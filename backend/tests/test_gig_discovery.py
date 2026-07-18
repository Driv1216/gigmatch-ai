from __future__ import annotations

import json
import unittest
from copy import deepcopy
from typing import Any

from app.api.routes import gigs as gig_routes
from app.main import app
from tests.test_matching_data_access import FakeAuthVerifier
from tests.test_matching_routes import get_json


class FakeMarketplaceRepository:
    def __init__(self, records: list[dict[str, Any]] | None = None) -> None:
        self.records = records or []
        self.user_profiles = {
            "freelancer-1": {"id": "freelancer-1", "role": "freelancer"},
            "client-1": {"id": "client-1", "role": "client"},
        }

    def get_user_profile(self, user_id: str) -> dict[str, Any] | None:
        return self.user_profiles.get(user_id)

    def list_marketplace_gigs(self) -> list[dict[str, Any]]:
        return list(self.records)

    def get_marketplace_gig(self, gig_id: str) -> dict[str, Any] | None:
        return next((record for record in self.records if record.get("id") == gig_id), None)


def make_gig(
    gig_id: str,
    *,
    state: str = "open",
    deadline: str = "2099-12-31T23:59:59+00:00",
    contract_version: int = 1,
    published_at: str = "2026-07-18T10:00:00+00:00",
) -> dict[str, Any]:
    lifecycle, intake, operations = {
        "draft": ("draft", "closed", "active"),
        "open": ("active", "accepting", "active"),
        "paused": ("active", "accepting", "paused"),
        "closed_to_new_applications": ("active", "closed", "active"),
        "filled": ("filled", "closed", "active"),
        "cancelled": ("cancelled", "closed", "active"),
    }[state]
    version_id = f"version-{gig_id}"
    payment_structure = "fixed_price" if contract_version == 1 else "legacy_unspecified"
    currency = "INR" if contract_version == 1 else None
    snapshot = {
        "version_kind": "initial_product_version" if contract_version == 1 else "legacy_import",
        "terms_contract_version": contract_version,
        "snapshot_schema_version": 1,
        "payment_structure": payment_structure,
        "currency": currency,
        "title": f"Gig {gig_id}",
        "summary": "A safe published opportunity summary.",
        "description": "Build and verify a complete production feature for the approved client scope.",
        "scope": {"tech_category": "Backend"},
        "client_payment": {
            "payment_structure": payment_structure,
            "currency": currency,
            "budget_min": 50000,
            "budget_max": 75000,
            "private_note": "must not leak",
        },
        "required_skills": ["Python", "FastAPI"],
        "preferred_skills": ["PostgreSQL"],
        "experience_requirement": "mid",
        "difficulty_level": "intermediate",
        "work_mode": "remote",
        "location_requirements": "India timezone overlap",
        "weekly_commitment": {"minimum": 20, "maximum": 30, "unit": "hours"},
        "expected_duration": {"mode": "range", "minimum": 6, "maximum": 8, "unit": "weeks"},
        "application_deadline": deadline,
        "project_deadline": "2100-02-01T12:00:00+00:00",
        "deliverables": ["API", "Tests"],
        "raw_parser_input": "must not leak",
        "semantic_text": "must not leak",
        "embedding": [0.1, 0.2],
    }
    version = {
        "id": version_id,
        "gig_id": gig_id,
        "terms_contract_version": contract_version,
        "terms_snapshot": snapshot,
        "created_at": published_at,
    }
    return {
        "id": gig_id,
        "client_id": "client-1",
        "status": state,
        "opportunity_lifecycle": lifecycle,
        "application_intake": intake,
        "operational_state": operations,
        "current_gig_version_id": version_id,
        "current_material_gig_version_id": version_id,
        "current_version": version,
        "current_material_version": version,
        "created_at": "2026-07-01T00:00:00+00:00",
        "updated_at": published_at,
        "safe_client_profile": {
            "user_id": "client-1",
            "company_name": "Acme Labs",
            "industry": "Software",
            "bio": "A product engineering studio.",
            "phone": "+91 private",
        },
        "safe_client_user_profile": {
            "id": "client-1",
            "full_name": "Asha Client",
            "email": "private@example.test",
            "auth_metadata": {"provider": "email"},
        },
    }


class GigDiscoveryRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repo = FakeMarketplaceRepository([make_gig("open-1")])
        self.auth = FakeAuthVerifier("freelancer-1")
        app.dependency_overrides[gig_routes.get_auth_verifier] = lambda: self.auth
        app.dependency_overrides[gig_routes.get_marketplace_repository] = lambda: self.repo

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    def test_discovery_uses_one_application_ready_rule_for_every_exclusion(self):
        valid = make_gig("valid")
        expired = make_gig("expired", deadline="2020-01-01T00:00:00+00:00")
        legacy = make_gig("legacy", contract_version=0)
        missing_material = make_gig("missing-material")
        missing_material["current_material_version"] = None
        incomplete = make_gig("incomplete")
        incomplete["current_version"]["terms_snapshot"]["deliverables"] = []
        self.repo.records = [
            valid,
            make_gig("draft", state="draft"),
            make_gig("paused", state="paused"),
            make_gig("closed", state="closed_to_new_applications"),
            make_gig("filled", state="filled"),
            make_gig("cancelled", state="cancelled"),
            expired,
            legacy,
            missing_material,
            incomplete,
        ]

        status, data = get_json("/gigs", {"authorization": "Bearer token"})

        self.assertEqual(status, 200)
        self.assertEqual([item["gig_id"] for item in data["items"]], ["valid"])
        self.assertEqual(data["pagination"]["total_items"], 1)

    def test_pagination_is_stable_and_adjacent_pages_do_not_duplicate(self):
        self.repo.records = [
            make_gig("gig-a", published_at="2026-07-18T12:00:00+00:00"),
            make_gig("gig-c", published_at="2026-07-18T12:00:00+00:00"),
            make_gig("gig-b", published_at="2026-07-18T12:00:00+00:00"),
            make_gig("gig-old", published_at="2026-07-17T12:00:00+00:00"),
        ]

        status_one, page_one = get_json("/gigs?page=1&page_size=2", {"authorization": "Bearer token"})
        status_two, page_two = get_json("/gigs?page=2&page_size=2", {"authorization": "Bearer token"})

        self.assertEqual((status_one, status_two), (200, 200))
        ids_one = [item["gig_id"] for item in page_one["items"]]
        ids_two = [item["gig_id"] for item in page_two["items"]]
        self.assertEqual(ids_one, ["gig-c", "gig-b"])
        self.assertEqual(ids_two, ["gig-a", "gig-old"])
        self.assertTrue(set(ids_one).isdisjoint(ids_two))
        self.assertEqual(page_one["pagination"]["total_pages"], 2)

    def test_page_validation_and_empty_pagination_envelope(self):
        status, _ = get_json("/gigs?page=0", {"authorization": "Bearer token"})
        self.assertEqual(status, 422)
        status, _ = get_json("/gigs?page_size=51", {"authorization": "Bearer token"})
        self.assertEqual(status, 422)

        self.repo.records = []
        status, data = get_json("/gigs", {"authorization": "Bearer token"})
        self.assertEqual(status, 200)
        self.assertEqual(data["items"], [])
        self.assertEqual(
            data["pagination"],
            {"page": 1, "page_size": 20, "total_items": 0, "total_pages": 0},
        )

    def test_discovery_requires_authentication(self):
        status, _ = get_json("/gigs")
        self.assertEqual(status, 401)

    def test_open_detail_is_complete_explicit_and_sanitized(self):
        status, data = get_json("/gigs/open-1", {"authorization": "Bearer token"})

        self.assertEqual(status, 200)
        self.assertEqual(data["response_kind"], "detail")
        self.assertEqual(data["description"], "Build and verify a complete production feature for the approved client scope.")
        self.assertEqual(data["deliverables"], ["API", "Tests"])
        self.assertEqual(data["client"]["display_name"], "Asha Client")
        self.assertEqual(data["client"]["company_name"], "Acme Labs")
        self.assertTrue(data["accepting_applications"])
        self.assertEqual(data["availability_reason"], "accepting_applications")
        public = json.dumps(data).lower()
        for private_fragment in (
            "private@example.test",
            "+91 private",
            "auth_metadata",
            "raw_parser_input",
            "semantic_text",
            "embedding",
            "private_note",
            "current_gig_version_id",
        ):
            self.assertNotIn(private_fragment, public)

    def test_paused_and_closed_details_report_current_unavailable_state(self):
        self.repo.records = [
            make_gig("paused", state="paused"),
            make_gig("closed", state="closed_to_new_applications"),
        ]
        status, paused = get_json("/gigs/paused", {"authorization": "Bearer token"})
        self.assertEqual(status, 200)
        self.assertFalse(paused["accepting_applications"])
        self.assertEqual(paused["availability_reason"], "opportunity_paused")

        status, closed = get_json("/gigs/closed", {"authorization": "Bearer token"})
        self.assertEqual(status, 200)
        self.assertFalse(closed["accepting_applications"])
        self.assertEqual(closed["availability_reason"], "applications_closed")

    def test_expired_stored_open_state_recalculates_acceptance(self):
        self.repo.records = [make_gig("expired", deadline="2020-01-01T00:00:00+00:00")]
        status, data = get_json("/gigs/expired", {"authorization": "Bearer token"})
        self.assertEqual(status, 200)
        self.assertFalse(data["accepting_applications"])
        self.assertEqual(data["availability_reason"], "application_deadline_passed")

    def test_draft_is_non_enumerating_and_terminal_states_are_minimal_tombstones(self):
        self.repo.records = [
            make_gig("draft", state="draft"),
            make_gig("filled", state="filled"),
            make_gig("cancelled", state="cancelled"),
        ]
        status, _ = get_json("/gigs/draft", {"authorization": "Bearer token"})
        self.assertEqual(status, 404)

        for gig_id in ("filled", "cancelled"):
            status, data = get_json(f"/gigs/{gig_id}", {"authorization": "Bearer token"})
            self.assertEqual(status, 200)
            self.assertEqual(set(data), {"response_kind", "gig_id", "title", "product_state", "message"})
            self.assertNotIn("payment", data)
            self.assertNotIn("description", data)

    def test_stale_recommendation_link_reads_latest_state(self):
        recommended_record = make_gig("stale")
        self.repo.records = [recommended_record]
        status, first = get_json("/gigs/stale", {"authorization": "Bearer token"})
        self.assertEqual(status, 200)
        self.assertTrue(first["accepting_applications"])

        latest = deepcopy(recommended_record)
        latest["status"] = "paused"
        latest["operational_state"] = "paused"
        self.repo.records = [latest]
        status, current = get_json("/gigs/stale", {"authorization": "Bearer token"})
        self.assertEqual(status, 200)
        self.assertFalse(current["accepting_applications"])
        self.assertEqual(current["availability_reason"], "opportunity_paused")


if __name__ == "__main__":
    unittest.main()
