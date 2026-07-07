import asyncio
import json
import sys
import unittest
from typing import Any
from unittest.mock import patch
from urllib.parse import urlsplit

from app.api.routes import matching as matching_routes
from app.main import app
from app.matching.data_access import (
    AuthContext,
    ClientGigMatchingData,
    ForbiddenRoleError,
    FreelancerMatchingData,
    MissingProfileError,
    ResourceNotFoundError,
    ResourceOwnershipError,
    UnsupportedRoleError,
)
from app.matching.semantic import DeterministicFakeEmbeddingProvider
from tests.test_matching_data_access import FakeAuthVerifier, make_repo

FORBIDDEN_EXPLANATION_FRAGMENTS = (
    "raw_resume_text",
    "raw_gig_description",
    "parsed_json",
    "email",
    "auth",
    "supabase",
    "service_role",
    "debug",
    "trace",
    "embedding_text",
    "embedding_vector",
    "provider_name",
    "database_row",
)
UNSAFE_EXPLANATION_FRAGMENTS = (
    "you are missing",
    "candidate is missing",
    "best",
    "perfect",
    "reliable",
    "guaranteed",
    "fair",
    "unbiased",
    "likely to succeed",
)


def get_json(path: str, headers: dict[str, str] | None = None) -> tuple[int, dict[str, Any]]:
    return asyncio.run(_get_json(path, headers or {}))


async def _get_json(path: str, headers: dict[str, str]) -> tuple[int, dict[str, Any]]:
    parsed = urlsplit(path)
    events: list[dict[str, Any]] = []
    request_sent = False
    request_headers = [(b"host", b"testserver")]
    request_headers.extend((key.lower().encode("ascii"), value.encode("utf-8")) for key, value in headers.items())

    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "GET",
        "scheme": "http",
        "path": parsed.path,
        "raw_path": parsed.path.encode("utf-8"),
        "query_string": parsed.query.encode("utf-8"),
        "headers": request_headers,
        "client": ("testclient", 50000),
        "server": ("testserver", 80),
    }

    async def receive() -> dict[str, Any]:
        nonlocal request_sent
        if not request_sent:
            request_sent = True
            return {"type": "http.request", "body": b"", "more_body": False}
        return {"type": "http.disconnect"}

    async def send(message: dict[str, Any]) -> None:
        events.append(message)

    await app(scope, receive, send)

    status = next(event["status"] for event in events if event["type"] == "http.response.start")
    response_body = b"".join(
        event.get("body", b"") for event in events if event["type"] == "http.response.body"
    )
    return status, json.loads(response_body.decode("utf-8"))


class MatchingRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repo = make_repo()
        self.auth_verifier = FakeAuthVerifier("freelancer-1")
        app.dependency_overrides[matching_routes.get_auth_verifier] = lambda: self.auth_verifier
        app.dependency_overrides[matching_routes.get_matching_repository] = lambda: self.repo
        app.dependency_overrides[matching_routes.get_embedding_provider_factory] = (
            lambda: lambda: DeterministicFakeEmbeddingProvider()
        )

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    def test_recommended_gigs_returns_compact_hybrid_envelope_for_freelancer(self):
        status, data = get_json("/matching/recommended-gigs", {"authorization": "Bearer token"})

        self.assertEqual(status, 200)
        self.assertEqual(data["ranking_method"], "hybrid")
        self.assertEqual(data["limit"], 10)
        self.assertEqual(data["count"], len(data["items"]))
        self.assertGreater(data["count"], 0)
        self.assertEqual([item["rank"] for item in data["items"]], list(range(1, data["count"] + 1)))
        self.assertEqual(
            set(data["items"][0]),
            {
                "gig_id",
                "title",
                "category",
                "status",
                "rank",
                "hybrid_score",
                "keyword_score",
                "semantic_score",
                "explanation",
            },
        )
        self.assert_recommendation_item_has_safe_explanation(data["items"][0], "freelancer", "gig")
        public_json = json.dumps(data)
        self.assertNotIn("description", public_json)
        self.assertNotIn("client_id", public_json)
        self.assertNotIn("embedding_text", public_json)

    def test_recommended_gigs_limit_is_respected(self):
        status, data = get_json("/matching/recommended-gigs?limit=1", {"authorization": "Bearer token"})

        self.assertEqual(status, 200)
        self.assertEqual(data["limit"], 1)
        self.assertEqual(data["count"], 1)
        self.assertEqual(len(data["items"]), 1)

    def test_recommended_gigs_rejects_invalid_limit(self):
        status, data = get_json("/matching/recommended-gigs?limit=0", {"authorization": "Bearer token"})

        self.assertEqual(status, 422)
        self.assertIn("detail", data)

    def test_matching_routes_are_registered(self):
        paths = {getattr(route, "path", "") for route in app.routes}

        self.assertIn("/matching/recommended-gigs", paths)
        self.assertIn("/matching/gigs/{gig_id}/recommended-freelancers", paths)

    def test_auth_failure_happens_before_embedding_provider_configuration(self):
        provider_calls: list[str] = []

        def provider_factory():
            provider_calls.append("called")
            raise AssertionError("Embedding provider should not load before auth succeeds.")

        app.dependency_overrides[matching_routes.get_embedding_provider_factory] = lambda: provider_factory

        status, data = get_json("/matching/recommended-gigs")

        self.assertEqual(status, 401)
        self.assertEqual(provider_calls, [])
        self.assertNotIn("embedding", json.dumps(data).lower())

    def test_recommended_gigs_requires_valid_freelancer_auth(self):
        status, _ = get_json("/matching/recommended-gigs")
        self.assertEqual(status, 401)

        self.auth_verifier = FakeAuthVerifier("freelancer-1", fail=True)
        status, _ = get_json("/matching/recommended-gigs", {"authorization": "Bearer bad"})
        self.assertEqual(status, 401)

        self.auth_verifier = FakeAuthVerifier("client-1")
        status, _ = get_json("/matching/recommended-gigs", {"authorization": "Bearer token"})
        self.assertEqual(status, 403)

        self.auth_verifier = FakeAuthVerifier("admin-1")
        status, _ = get_json("/matching/recommended-gigs", {"authorization": "Bearer token"})
        self.assertEqual(status, 403)

    def test_recommended_gigs_calls_data_access_and_hybrid_ranker(self):
        prepared_data = FreelancerMatchingData(
            auth_context=AuthContext(user_id="freelancer-1", role="freelancer"),
            freelancer=matching_routes.prepare_freelancer_matching_data(
                "Bearer token",
                FakeAuthVerifier("freelancer-1"),
                self.repo,
            ).freelancer,
            candidate_gigs=(),
        )

        with patch.object(
            matching_routes,
            "prepare_freelancer_matching_data",
            return_value=prepared_data,
        ) as prepare_mock, patch.object(
            matching_routes,
            "rank_gigs_for_freelancer_hybrid",
            return_value=[],
        ) as rank_mock:
            status, data = get_json("/matching/recommended-gigs", {"authorization": "Bearer token"})

        self.assertEqual(status, 200)
        self.assertEqual(data["items"], [])
        prepare_mock.assert_called_once_with("Bearer token", self.auth_verifier, self.repo)
        rank_mock.assert_called_once()

    def test_recommended_freelancers_returns_compact_hybrid_envelope_for_client_gig(self):
        self.auth_verifier = FakeAuthVerifier("client-1")

        status, data = get_json(
            "/matching/gigs/gig-1/recommended-freelancers",
            {"authorization": "Bearer token"},
        )

        self.assertEqual(status, 200)
        self.assertEqual(data["ranking_method"], "hybrid")
        self.assertEqual(data["limit"], 10)
        self.assertEqual(data["count"], len(data["items"]))
        self.assertGreater(data["count"], 0)
        self.assertEqual([item["rank"] for item in data["items"]], list(range(1, data["count"] + 1)))
        self.assertEqual(
            set(data["items"][0]),
            {
                "freelancer_id",
                "headline",
                "primary_role",
                "rank",
                "hybrid_score",
                "keyword_score",
                "semantic_score",
                "explanation",
            },
        )
        self.assert_recommendation_item_has_safe_explanation(data["items"][0], "gig", "freelancer")
        public_json = json.dumps(data)
        self.assertNotIn("raw_resume_text", public_json)
        self.assertNotIn("bio", public_json)
        self.assertNotIn("project_links", public_json)
        self.assertNotIn("embedding_text", public_json)

    def test_recommended_freelancers_limit_is_respected(self):
        self.auth_verifier = FakeAuthVerifier("client-1")

        status, data = get_json(
            "/matching/gigs/gig-1/recommended-freelancers?limit=1",
            {"authorization": "Bearer token"},
        )

        self.assertEqual(status, 200)
        self.assertEqual(data["limit"], 1)
        self.assertEqual(data["count"], 1)
        self.assertEqual(len(data["items"]), 1)

    def test_recommended_freelancers_rejects_invalid_limit(self):
        self.auth_verifier = FakeAuthVerifier("client-1")

        status, data = get_json(
            "/matching/gigs/gig-1/recommended-freelancers?limit=51",
            {"authorization": "Bearer token"},
        )

        self.assertEqual(status, 422)
        self.assertIn("detail", data)

    def test_empty_candidate_lists_return_safe_empty_envelopes(self):
        freelancer_data = matching_routes.prepare_freelancer_matching_data(
            "Bearer token",
            FakeAuthVerifier("freelancer-1"),
            self.repo,
        )
        empty_freelancer_data = FreelancerMatchingData(
            auth_context=freelancer_data.auth_context,
            freelancer=freelancer_data.freelancer,
            candidate_gigs=(),
        )

        self.auth_verifier = FakeAuthVerifier("client-1")
        client_data = matching_routes.prepare_client_gig_matching_data(
            "Bearer token",
            "gig-1",
            FakeAuthVerifier("client-1"),
            self.repo,
        )
        empty_client_data = ClientGigMatchingData(
            auth_context=client_data.auth_context,
            gig=client_data.gig,
            candidate_freelancers=(),
        )

        with patch.object(
            matching_routes,
            "prepare_freelancer_matching_data",
            return_value=empty_freelancer_data,
        ):
            status, data = get_json("/matching/recommended-gigs", {"authorization": "Bearer token"})

        self.assertEqual(status, 200)
        self.assertEqual(data, {"items": [], "count": 0, "limit": 10, "ranking_method": "hybrid"})

        with patch.object(
            matching_routes,
            "prepare_client_gig_matching_data",
            return_value=empty_client_data,
        ):
            status, data = get_json(
                "/matching/gigs/gig-1/recommended-freelancers",
                {"authorization": "Bearer token"},
            )

        self.assertEqual(status, 200)
        self.assertEqual(data, {"items": [], "count": 0, "limit": 10, "ranking_method": "hybrid"})

    def test_recommended_gig_explanation_is_deterministic_and_scores_are_unchanged(self):
        status, first = get_json("/matching/recommended-gigs", {"authorization": "Bearer token"})
        status_again, second = get_json("/matching/recommended-gigs", {"authorization": "Bearer token"})

        self.assertEqual(status, 200)
        self.assertEqual(status_again, 200)
        self.assertEqual(
            [(item["gig_id"], item["rank"], item["hybrid_score"], item["keyword_score"], item["semantic_score"]) for item in first["items"]],
            [(item["gig_id"], item["rank"], item["hybrid_score"], item["keyword_score"], item["semantic_score"]) for item in second["items"]],
        )
        self.assertEqual(first["items"][0]["explanation"], second["items"][0]["explanation"])
        explanation = first["items"][0]["explanation"]
        self.assertIn("summary", explanation)
        self.assertIn("score", explanation)
        self.assertIn("skill_gap", explanation)
        self.assertEqual(explanation["score"]["hybrid_score"], first["items"][0]["hybrid_score"])
        self.assertEqual(explanation["score"]["keyword_score"], first["items"][0]["keyword_score"])
        self.assertEqual(explanation["score"]["semantic_score"], first["items"][0]["semantic_score"])

    def test_recommended_freelancer_explanation_includes_skill_gap_summary(self):
        self.auth_verifier = FakeAuthVerifier("client-1")

        status, data = get_json(
            "/matching/gigs/gig-1/recommended-freelancers",
            {"authorization": "Bearer token"},
        )

        self.assertEqual(status, 200)
        explanation = data["items"][0]["explanation"]
        self.assertIsInstance(explanation["summary"], str)
        self.assertIn(explanation["skill_gap"]["severity"], {"none", "low", "medium", "high"})
        self.assertIn("matched_required_skills", explanation["skill_gap"])
        self.assertIn("missing_required_skills", explanation["skill_gap"])
        self.assertIn("focus_skills", explanation["skill_gap"])

    def test_recommended_freelancers_requires_valid_client_auth_and_owned_gig(self):
        status, _ = get_json("/matching/gigs/gig-1/recommended-freelancers")
        self.assertEqual(status, 401)

        self.auth_verifier = FakeAuthVerifier("client-1", fail=True)
        status, _ = get_json(
            "/matching/gigs/gig-1/recommended-freelancers",
            {"authorization": "Bearer bad"},
        )
        self.assertEqual(status, 401)

        self.auth_verifier = FakeAuthVerifier("freelancer-1")
        status, _ = get_json(
            "/matching/gigs/gig-1/recommended-freelancers",
            {"authorization": "Bearer token"},
        )
        self.assertEqual(status, 403)

        self.auth_verifier = FakeAuthVerifier("admin-1")
        status, _ = get_json(
            "/matching/gigs/gig-1/recommended-freelancers",
            {"authorization": "Bearer token"},
        )
        self.assertEqual(status, 403)

        self.auth_verifier = FakeAuthVerifier("client-1")
        status, _ = get_json(
            "/matching/gigs/gig-2/recommended-freelancers",
            {"authorization": "Bearer token"},
        )
        self.assertEqual(status, 403)

        status, _ = get_json(
            "/matching/gigs/missing-gig/recommended-freelancers",
            {"authorization": "Bearer token"},
        )
        self.assertEqual(status, 404)

    def test_recommended_freelancers_calls_data_access_and_hybrid_ranker(self):
        self.auth_verifier = FakeAuthVerifier("client-1")
        prepared_data = matching_routes.prepare_client_gig_matching_data(
            "Bearer token",
            "gig-1",
            FakeAuthVerifier("client-1"),
            self.repo,
        )
        prepared_data = ClientGigMatchingData(
            auth_context=prepared_data.auth_context,
            gig=prepared_data.gig,
            candidate_freelancers=(),
        )

        with patch.object(
            matching_routes,
            "prepare_client_gig_matching_data",
            return_value=prepared_data,
        ) as prepare_mock, patch.object(
            matching_routes,
            "rank_freelancers_for_gig_hybrid",
            return_value=[],
        ) as rank_mock:
            status, data = get_json(
                "/matching/gigs/gig-1/recommended-freelancers",
                {"authorization": "Bearer token"},
            )

        self.assertEqual(status, 200)
        self.assertEqual(data["items"], [])
        prepare_mock.assert_called_once_with("Bearer token", "gig-1", self.auth_verifier, self.repo)
        rank_mock.assert_called_once()

    def test_data_access_error_mapping_is_stable(self):
        cases = [
            (MissingProfileError("missing profile"), 403),
            (UnsupportedRoleError("unsupported role"), 403),
            (ForbiddenRoleError("forbidden role"), 403),
            (ResourceOwnershipError("wrong owner"), 403),
            (ResourceNotFoundError("missing resource"), 404),
        ]

        for error, expected_status in cases:
            with self.subTest(error=error.__class__.__name__), patch.object(
                matching_routes,
                "prepare_freelancer_matching_data",
                side_effect=error,
            ):
                status, data = get_json("/matching/recommended-gigs", {"authorization": "Bearer token"})

            self.assertEqual(status, expected_status)
            self.assertEqual(data["detail"], str(error))

    def test_service_role_details_do_not_leak_in_error_payloads(self):
        sensitive_text = "sensitive_service_key_should_not_appear"

        with patch.object(
            matching_routes,
            "prepare_freelancer_matching_data",
            side_effect=ForbiddenRoleError("forbidden"),
        ):
            status, data = get_json("/matching/recommended-gigs", {"authorization": "Bearer token"})

        self.assertEqual(status, 403)
        self.assertNotIn(sensitive_text, json.dumps(data))
        self.assertNotIn("service", json.dumps(data).lower())

    def test_routes_use_fakes_without_loading_live_model_or_supabase(self):
        status, _ = get_json("/matching/recommended-gigs", {"authorization": "Bearer token"})

        self.assertEqual(status, 200)
        self.assertGreater(len(self.repo.calls), 0)
        self.assertNotIn("sentence_transformers", sys.modules)

    def assert_recommendation_item_has_safe_explanation(
        self,
        item: dict[str, Any],
        subject_type: str,
        candidate_type: str,
    ) -> None:
        explanation = item["explanation"]

        self.assertIsInstance(explanation["summary"], str)
        self.assertEqual(explanation["subject_type"], subject_type)
        self.assertEqual(explanation["candidate_type"], candidate_type)
        self.assertEqual(explanation["rank"], item["rank"])
        self.assertEqual(explanation["score"]["hybrid_score"], item["hybrid_score"])
        self.assertEqual(explanation["score"]["keyword_score"], item["keyword_score"])
        self.assertEqual(explanation["score"]["semantic_score"], item["semantic_score"])
        self.assertIn("severity", explanation["skill_gap"])
        self.assertIn("reasons", explanation)

        public_json = json.dumps(explanation).lower()
        for fragment in FORBIDDEN_EXPLANATION_FRAGMENTS + UNSAFE_EXPLANATION_FRAGMENTS:
            with self.subTest(fragment=fragment):
                self.assertNotIn(fragment, public_json)


if __name__ == "__main__":
    unittest.main()
