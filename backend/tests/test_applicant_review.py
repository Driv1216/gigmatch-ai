from __future__ import annotations

import asyncio
import unittest
from copy import deepcopy
from typing import Any

from app.api.routes import applicant_review as review_routes
from app.config import settings
from app.main import app
from app.matching.semantic import (
    DeterministicFakeEmbeddingProvider,
    SemanticRankingUnavailableError,
)
from app.marketplace.applicant_review import build_applicant_detail, build_applicant_list
from app.marketplace.applicant_review_contracts import (
    NotSelectedReviewRequest,
    ReopenReviewRequest,
)
from app.marketplace.applicant_review_data_access import MarketplaceWriteError
from app.marketplace.ranking import SemanticUnavailableReason
from tests.test_applications import request_json
from tests.test_gig_discovery import make_gig
from tests.test_matching_data_access import FakeAuthVerifier
from tests.test_matching_routes import get_json


def application(
    application_id: str,
    *,
    gig: dict[str, Any],
    stage: str = "under_review",
    submitted: str = "2026-07-20T10:00:00+00:00",
    skills: list[str] | None = None,
    total: int = 1000,
    stale: bool = False,
) -> dict[str, Any]:
    answered = deepcopy(gig["current_material_version"])
    answered["id"] = f"answered-{application_id}" if stale else gig["current_material_version"]["id"]
    answered["version_number"] = 1 if stale else 2
    current = {
        "id": f"version-{application_id}",
        "application_id": application_id,
        "gig_id": gig["id"],
        "version_number": 2,
        "gig_version_id": answered["id"],
        "origin": "freelancer_edit",
        "cover_note": f"Cover note {application_id}",
        "proposal_snapshot": {
            "proposal_contract_version": 1,
            "snapshot_schema_version": 1,
            "payment_structure": "fixed_price",
            "currency": "INR",
            "mode": "exact_total",
            "exact_total": total,
        },
        "timeline_snapshot": {"mode": "exact", "unit": "weeks", "exact_value": 4},
        "availability_snapshot": {"available_from": "2098-01-01"},
        "scope_snapshot": {
            "included_work": ["API"],
            "excluded_work": ["Hosting"],
            "assumptions": ["Access"],
            "estimate_change_factors": ["Scope"],
        },
        "scope_notes": "Safe scope note",
        "created_at": submitted,
        "answered_gig_version": answered,
    }
    terminal_reason = stage if stage not in ("under_review", "advanced") else None
    return {
        "id": application_id,
        "gig_id": gig["id"],
        "freelancer_profile_id": f"profile-{application_id}",
        "stage": stage,
        "current_version_id": current["id"],
        "submitted_at": submitted,
        "last_updated_at": submitted,
        "stage_changed_at": submitted,
        "stage_reason_origin": "client_decision" if stage == "not_selected" else None,
        "stage_reason_code": "stronger_overall_match" if stage == "not_selected" else terminal_reason,
        "stage_reason_payload": {} if terminal_reason else None,
        "versions": [current],
        "current_version": current,
        "freelancer_profile": {
            "id": f"profile-{application_id}",
            "user_id": f"user-{application_id}",
            "headline": "Backend engineer" if skills else None,
            "bio": "Production API specialist" if skills else None,
            "location": "India",
            "experience_level": "advanced",
            "primary_role": "Backend engineer" if skills else None,
            "tech_categories": ["Backend"] if skills else [],
            "skills": skills or [],
            "tools": [],
            "project_links": [],
            "availability": "available",
            "preferred_gig_type": "long_term",
        },
        "safe_user_profile": {"id": f"user-{application_id}", "full_name": f"Applicant {application_id}"},
        "resume_parse": None,
        "review_state": None,
        "selection_requests": [],
        "review_history": [],
        "gig": gig,
    }


class FakeApplicantReviewRepository:
    def __init__(self) -> None:
        self.gig = make_gig("review-gig")
        self.gig["current_version"]["version_number"] = 2
        self.gig["current_material_version"] = self.gig["current_version"]
        self.gig["current_material_version"]["version_number"] = 2
        self.applications = [
            application("ranked-newer", gig=self.gig, skills=["Python", "FastAPI"], submitted="2026-07-21T10:00:00+00:00"),
            application("unrankable", gig=self.gig, skills=[], submitted="2026-07-22T10:00:00+00:00"),
            application("stale", gig=self.gig, skills=["Python"], stale=True, submitted="2026-07-20T10:00:00+00:00"),
            application("terminal", gig=self.gig, skills=["Python", "FastAPI"], stage="not_selected", submitted="2026-07-19T10:00:00+00:00"),
        ]
        self.users = {
            "client-1": {"id": "client-1", "role": "client"},
            "freelancer-1": {"id": "freelancer-1", "role": "freelancer"},
        }
        self.calls: list[tuple[str, dict[str, Any]]] = []
        self.error: MarketplaceWriteError | None = None

    def get_user_profile(self, user_id: str) -> dict[str, Any] | None:
        return self.users.get(user_id)

    def get_owned_applicant_pool(self, gig_id: str, client_id: str) -> dict[str, Any] | None:
        if gig_id != self.gig["id"] or client_id != "client-1":
            return None
        return {"gig": self.gig, "applications": deepcopy(self.applications)}

    def get_owned_applicant(self, gig_id: str, application_id: str, client_id: str) -> dict[str, Any] | None:
        pool = self.get_owned_applicant_pool(gig_id, client_id)
        if pool is None:
            return None
        return next((row for row in pool["applications"] if row["id"] == application_id), None)

    def get_owned_review_application(
        self, application_id: str, client_id: str
    ) -> dict[str, Any] | None:
        if client_id != "client-1":
            return None
        row = next((item for item in self.applications if item["id"] == application_id), None)
        return deepcopy(row) if row else None

    def call_review_mutation(self, function_name: str, payload: dict[str, Any]) -> dict[str, Any]:
        self.calls.append((function_name, deepcopy(payload)))
        if self.error:
            raise self.error
        row = next(item for item in self.applications if item["id"] == payload["p_application_id"])
        if function_name == "review_set_shortlist":
            previous = row.get("review_state") or {}
            row["review_state"] = {
                "application_id": row["id"],
                "gig_id": row["gig_id"],
                "is_shortlisted": payload["p_shortlisted"],
                "shortlisted_at": "2026-07-24T12:00:00+00:00" if payload["p_shortlisted"] else None,
                "review_state_version": int(previous.get("review_state_version") or 0) + 1,
            }
        else:
            targets = {
                "advance": "advanced",
                "return": "under_review",
                "not_selected": "not_selected",
                "reopen": "under_review",
            }
            row["stage"] = targets[payload["p_action"]]
            row["stage_changed_at"] = "2026-07-24T12:00:00+00:00"
            if row["stage"] == "not_selected":
                row["stage_reason_code"] = payload["p_decision"]["primary_reason"]
            elif payload["p_action"] == "reopen":
                row["stage_reason_code"] = None
        return {"code": "ok", "application_id": row["id"]}


class ApplicantReviewReadTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repo = FakeApplicantReviewRepository()
        self.auth = FakeAuthVerifier("client-1")
        app.dependency_overrides[review_routes.get_auth_verifier] = lambda: self.auth
        app.dependency_overrides[review_routes.get_applicant_review_repository] = lambda: self.repo
        app.dependency_overrides[review_routes.get_embedding_provider_factory] = (
            lambda: lambda: DeterministicFakeEmbeddingProvider()
        )

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    def test_owned_pool_is_complete_and_best_match_orders_unrankable_last(self) -> None:
        status, body = get_json(
            "/gigs/review-gig/applicants?status=all&view=best_match",
            {"authorization": "Bearer token"},
        )
        self.assertEqual(status, 200)
        self.assertEqual(body["counts"], {
            "active": 3, "not_selected": 1, "withdrawn": 0, "closed": 0, "all": 4
        })
        self.assertEqual(len(body["items"]), 4)
        active_ids = [item["application_id"] for item in body["items"][:3]]
        self.assertIn("unrankable", active_ids)
        unavailable = next(item for item in body["items"] if item["application_id"] == "unrankable")
        self.assertEqual(unavailable["suitability"]["ranking_status"], "unavailable")
        self.assertIsNone(unavailable["suitability"]["ranking_score"])
        self.assertEqual(body["items"][-1]["application_id"], "terminal")

    def test_newest_does_not_drop_or_require_rankable_input(self) -> None:
        status, body = get_json(
            "/gigs/review-gig/applicants?status=active&view=newest",
            {"authorization": "Bearer token"},
        )
        self.assertEqual(status, 200)
        self.assertEqual([item["application_id"] for item in body["items"]], [
            "unrankable", "ranked-newer", "stale"
        ])

    def test_current_material_terms_rank_and_answered_terms_remain_historical(self) -> None:
        status, body = get_json(
            "/gigs/review-gig/applicants/stale",
            {"authorization": "Bearer token"},
        )
        self.assertEqual(status, 200)
        self.assertTrue(body["response_to_updated_gig_required"])
        self.assertEqual(body["answered_gig_version"]["version_number"], 1)
        self.assertEqual(body["current_material_gig_version"]["version_number"], 2)
        self.assertEqual(body["suitability"]["evidence_label"], "Current AI-assisted suitability evidence")

    def test_provider_failure_is_global_keyword_fallback(self) -> None:
        def unavailable() -> DeterministicFakeEmbeddingProvider:
            raise SemanticRankingUnavailableError(
                SemanticUnavailableReason.EMBEDDING_PROVIDER_UNAVAILABLE
            )

        result = build_applicant_list(
            {"gig": self.repo.gig, "applications": self.repo.applications},
            status="active",
            view="best_match",
            page=1,
            page_size=20,
            provider_factory=unavailable,
        )
        self.assertEqual(result["ranking_context"]["ranking_mode"], "keyword_fallback")
        scored = [item for item in result["items"] if item["suitability"]["ranking_status"] == "available"]
        self.assertTrue(scored)
        self.assertTrue(all(item["suitability"]["semantic_score"] is None for item in scored))
        self.assertTrue(all(item["suitability"]["hybrid_score"] is None for item in scored))

    def test_price_is_not_a_ranking_input(self) -> None:
        first = application("same-a", gig=self.repo.gig, skills=["Python"], total=100)
        second = application("same-b", gig=self.repo.gig, skills=["Python"], total=100000)
        result = build_applicant_list(
            {"gig": self.repo.gig, "applications": [first, second]},
            status="active",
            view="best_match",
            page=1,
            page_size=20,
            provider_factory=lambda: DeterministicFakeEmbeddingProvider(),
        )
        scores = {item["application_id"]: item["suitability"]["ranking_score"] for item in result["items"]}
        self.assertEqual(scores["same-a"], scores["same-b"])

    def test_detail_is_sanitized_and_history_is_bounded(self) -> None:
        detail = build_applicant_detail(
            self.repo.applications[0],
            provider_factory=lambda: DeterministicFakeEmbeddingProvider(),
            history_page_size=1,
        )
        serialized = str(detail).lower()
        for forbidden in ("email", "phone", "raw_resume", "parsed_json", "embedding", "service_role"):
            self.assertNotIn(forbidden, serialized)
        self.assertEqual(detail["version_history"]["pagination"]["page_size"], 1)
        self.assertNotIn("ranking_score", str(detail["version_history"]))

    def test_auth_role_and_non_enumerating_not_found(self) -> None:
        status, _ = get_json("/gigs/review-gig/applicants")
        self.assertEqual(status, 401)
        self.auth.user_id = "freelancer-1"
        status, _ = get_json("/gigs/review-gig/applicants", {"authorization": "Bearer token"})
        self.assertEqual(status, 403)
        self.auth.user_id = "client-1"
        for path in (
            "/gigs/other-gig/applicants",
            "/gigs/review-gig/applicants/missing",
            "/gigs/other-gig/applicants/ranked-newer",
        ):
            status, body = get_json(path, {"authorization": "Bearer token"})
            self.assertEqual((status, body["detail"]), (404, "applicant_review_not_found"))

    def test_invalid_terminal_view_combination_is_rejected(self) -> None:
        status, body = get_json(
            "/gigs/review-gig/applicants?status=withdrawn&view=advanced",
            {"authorization": "Bearer token"},
        )
        self.assertEqual((status, body["detail"]), (422, "invalid_applicant_view"))


class ApplicantReviewContractTests(unittest.TestCase):
    def test_not_selected_contract_rejects_reserved_duplicate_and_unexplained_other(self) -> None:
        base = {"review_decision_action_token": "d" * 64, "feedback_points": []}
        invalid = (
            {**base, "primary_reason": "another_applicant_selected"},
            {**base, "primary_reason": "other"},
            {
                **base,
                "primary_reason": "stronger_overall_match",
                "additional_reasons": ["stronger_overall_match"],
            },
        )
        for payload in invalid:
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                NotSelectedReviewRequest.model_validate(payload)

    def test_review_text_is_trimmed_and_control_characters_are_rejected(self) -> None:
        request = NotSelectedReviewRequest.model_validate(
            {
                "review_decision_action_token": "d" * 64,
                "primary_reason": "other",
                "other_explanation": "  Role-specific explanation  ",
                "feedback_points": ["  Strong API fundamentals  "],
            }
        )
        self.assertEqual(request.other_explanation, "Role-specific explanation")
        self.assertEqual(request.feedback_points, ["Strong API fundamentals"])
        with self.assertRaises(ValueError):
            ReopenReviewRequest.model_validate(
                {
                    "review_decision_action_token": "d" * 64,
                    "reason": "other",
                    "explanation": "Unsafe\u0001text",
                }
            )


class ApplicantReviewMutationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repo = FakeApplicantReviewRepository()
        self.auth = FakeAuthVerifier("client-1")
        app.dependency_overrides[review_routes.get_auth_verifier] = lambda: self.auth
        app.dependency_overrides[review_routes.get_applicant_review_repository] = lambda: self.repo
        app.dependency_overrides[review_routes.get_embedding_provider_factory] = (
            lambda: lambda: DeterministicFakeEmbeddingProvider()
        )

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    def post(self, path: str, body: dict[str, Any]) -> tuple[int, Any]:
        return asyncio.run(request_json("POST", path, body))

    def token(self, application_id: str, key: str) -> str:
        status, body = get_json(
            f"/gigs/review-gig/applicants/{application_id}",
            {"authorization": "Bearer token"},
        )
        self.assertEqual(status, 200)
        return str(body[key])

    def test_shortlist_uses_separate_token_and_server_capacity(self) -> None:
        shortlist_token = self.token("ranked-newer", "shortlist_action_token")
        decision_token = self.token("ranked-newer", "review_decision_action_token")
        self.assertNotEqual(shortlist_token, decision_token)
        status, body = self.post(
            "/applications/ranked-newer/review/shortlist",
            {"shortlisted": True, "shortlist_action_token": shortlist_token},
        )
        self.assertEqual(status, 200)
        self.assertTrue(body["review_state"]["is_shortlisted"])
        function, payload = self.repo.calls[-1]
        self.assertEqual(function, "review_set_shortlist")
        self.assertEqual(payload["p_shortlist_capacity"], settings.applicant_shortlist_capacity)
        self.assertNotIn("client_id", payload)

    def test_advance_return_not_selected_and_reopen_preserve_structured_decisions(self) -> None:
        status, advanced = self.post(
            "/applications/ranked-newer/review/advance",
            {"review_decision_action_token": self.token("ranked-newer", "review_decision_action_token")},
        )
        self.assertEqual((status, advanced["stage"]), (200, "advanced"))
        self.assertEqual(self.repo.calls[-1][1]["p_advancement_capacity"], settings.applicant_advancement_capacity)

        status, returned = self.post(
            "/applications/ranked-newer/review/return",
            {"review_decision_action_token": self.token("ranked-newer", "review_decision_action_token")},
        )
        self.assertEqual((status, returned["stage"]), (200, "under_review"))

        decision = {
            "review_decision_action_token": self.token("ranked-newer", "review_decision_action_token"),
            "primary_reason": "stronger_overall_match",
            "additional_reasons": ["timeline_or_availability_mismatch"],
            "feedback_points": [],
            "respectful_note": "Thank you for the thoughtful proposal.",
        }
        status, rejected = self.post("/applications/ranked-newer/review/not-selected", decision)
        self.assertEqual((status, rejected["stage"]), (200, "not_selected"))
        self.assertEqual(
            self.repo.calls[-1][1]["p_decision"]["primary_reason"],
            "stronger_overall_match",
        )

        status, reopened = self.post(
            "/applications/ranked-newer/review/reopen",
            {
                "review_decision_action_token": self.token(
                    "ranked-newer", "review_decision_action_token"
                ),
                "reason": "client_reconsideration",
            },
        )
        self.assertEqual((status, reopened["stage"]), (200, "under_review"))

    def test_advanced_not_selected_requires_feedback_and_confirmation_at_the_database_boundary(self) -> None:
        row = next(item for item in self.repo.applications if item["id"] == "ranked-newer")
        row["stage"] = "advanced"
        status, _ = self.post(
            "/applications/ranked-newer/review/not-selected",
            {
                "review_decision_action_token": self.token(
                    "ranked-newer", "review_decision_action_token"
                ),
                "primary_reason": "stronger_overall_match",
                "feedback_points": [],
                "final_decision_confirmed": False,
            },
        )
        self.assertEqual(status, 200)
        self.assertEqual(self.repo.calls[-1][1]["p_decision"]["final_decision_confirmed"], False)

    def test_stable_database_markers_map_to_public_errors(self) -> None:
        cases = (
            ("M7E_STALE_REVIEW_ACTION", 409, "stale_review_action"),
            ("M7E_SHORTLIST_CAPACITY_REACHED", 409, "shortlist_capacity_reached"),
            ("M7E_ADVANCEMENT_CAPACITY_REACHED", 409, "advancement_capacity_reached"),
            (
                "M7E_PENDING_SELECTION_BLOCKS_REVIEW_ACTION",
                409,
                "pending_selection_blocks_review_action",
            ),
            ("M7E_REVIEW_ACTION_NOT_ALLOWED", 409, "review_action_not_allowed"),
        )
        for marker, expected_status, expected_detail in cases:
            with self.subTest(marker=marker):
                self.repo.error = MarketplaceWriteError(marker)
                status, body = self.post(
                    "/applications/ranked-newer/review/advance",
                    {
                        "review_decision_action_token": self.token(
                            "ranked-newer", "review_decision_action_token"
                        )
                    },
                )
                self.assertEqual((status, body["detail"]), (expected_status, expected_detail))

    def test_cross_client_and_malformed_payloads_fail_before_mutation(self) -> None:
        self.auth.user_id = "freelancer-1"
        status, body = self.post(
            "/applications/ranked-newer/review/advance",
            {"review_decision_action_token": "d" * 64},
        )
        self.assertEqual((status, body["detail"]), (403, "client_role_required"))
        self.auth.user_id = "client-1"
        status, _ = self.post(
            "/applications/ranked-newer/review/shortlist",
            {
                "shortlisted": True,
                "shortlist_action_token": "s" * 64,
                "p_shortlist_capacity": 100,
            },
        )
        self.assertEqual(status, 422)
        self.assertEqual(self.repo.calls, [])


if __name__ == "__main__":
    unittest.main()
