import asyncio
import json
import unittest
from typing import Any
from unittest.mock import patch
from urllib.parse import urlsplit

from app.api.routes import evaluation as evaluation_routes
from app.evaluation import load_seeded_evaluation_fixtures, run_evaluation
from app.main import app
from app.matching.semantic import DeterministicFakeEmbeddingProvider
from tests.test_matching_data_access import FakeAuthVerifier, make_repo

FORBIDDEN_EVALUATION_RESPONSE_FRAGMENTS = (
    "raw_resume_text",
    "raw_gig_description",
    "email",
    "auth_metadata",
    "service_role",
    "service_key",
    "embedding_vector",
    "freelancer_embedding_text",
    "gig_embedding_text",
    "description:",
)

FORBIDDEN_EVALUATION_CLAIMS = (
    "hybrid_improvement_percent",
    "winner_strategy",
    "overall_accuracy",
    "production_accuracy",
    "fairness_score",
    "time_to_hire_reduction",
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


class EvaluationRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repo = make_repo()
        self.auth_verifier = FakeAuthVerifier("admin-1")
        self.provider_calls = 0
        app.dependency_overrides[evaluation_routes.get_auth_verifier] = lambda: self.auth_verifier
        app.dependency_overrides[evaluation_routes.get_matching_repository] = lambda: self.repo
        app.dependency_overrides[evaluation_routes.get_embedding_provider_factory] = lambda: self.provider_factory

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    def provider_factory(self):
        self.provider_calls += 1
        return DeterministicFakeEmbeddingProvider(dimensions=8)

    def test_admin_can_access_matching_evaluation_summary(self):
        status, data = get_json("/evaluation/matching", {"authorization": "Bearer token"})

        self.assertEqual(status, 200)
        self.assertEqual(data["generated_from"], "seeded_evaluation_fixtures")
        self.assertEqual(data["fixture_ids"], ["seeded_matching_eval_001"])
        self.assertEqual(data["query_count"], 2)
        self.assertEqual(data["candidate_count"], 6)
        self.assertEqual(data["judgment_count"], 6)
        self.assertEqual(data["top_ks"], [1, 3])
        self.assertEqual(set(data["aggregate_results"]), {"keyword", "semantic", "hybrid"})
        self.assertEqual(len(data["query_results"]), 2)
        self.assertEqual(self.provider_calls, 1)

        first_query = data["query_results"][0]
        self.assertIn("strategy_results", first_query)
        self.assertIn("ranking_comparison_rows", first_query)
        self.assertEqual(set(first_query["strategy_results"]), {"keyword", "semantic", "hybrid"})

    def test_route_accepts_repeated_top_k_values_and_deduplicates_them(self):
        status, data = get_json(
            "/evaluation/matching?top_k=1&top_k=3&top_k=1",
            {"authorization": "Bearer token"},
        )

        self.assertEqual(status, 200)
        self.assertEqual(data["top_ks"], [1, 3])

    def test_invalid_top_k_values_are_rejected(self):
        status, data = get_json("/evaluation/matching?top_k=0", {"authorization": "Bearer token"})

        self.assertEqual(status, 400)
        self.assertIn("positive integers", data["detail"])

        status, data = get_json("/evaluation/matching?top_k=abc", {"authorization": "Bearer token"})

        self.assertEqual(status, 400)
        self.assertIn("positive integers", data["detail"])

    def test_freelancer_and_client_users_are_denied(self):
        self.auth_verifier = FakeAuthVerifier("freelancer-1")
        status, _ = get_json("/evaluation/matching", {"authorization": "Bearer token"})
        self.assertEqual(status, 403)

        self.auth_verifier = FakeAuthVerifier("client-1")
        status, _ = get_json("/evaluation/matching", {"authorization": "Bearer token"})
        self.assertEqual(status, 403)

    def test_missing_and_invalid_auth_are_denied_before_provider_loads(self):
        status, data = get_json("/evaluation/matching")

        self.assertEqual(status, 401)
        self.assertEqual(self.provider_calls, 0)
        self.assertNotIn("embedding", json.dumps(data).lower())

        self.auth_verifier = FakeAuthVerifier("admin-1", fail=True)
        status, data = get_json("/evaluation/matching", {"authorization": "Bearer bad"})

        self.assertEqual(status, 401)
        self.assertEqual(self.provider_calls, 0)
        self.assertNotIn("embedding", json.dumps(data).lower())

    def test_endpoint_delegates_to_seeded_fixtures_and_6c_runner(self):
        fixtures = load_seeded_evaluation_fixtures()
        summary = run_evaluation(
            fixtures,
            top_ks=(1, 3),
            embedding_provider=DeterministicFakeEmbeddingProvider(dimensions=8),
        )

        with patch.object(evaluation_routes, "load_seeded_evaluation_fixtures", return_value=fixtures) as load_mock, patch.object(
            evaluation_routes,
            "run_evaluation",
            return_value=summary,
        ) as runner_mock:
            status, data = get_json("/evaluation/matching", {"authorization": "Bearer token"})

        self.assertEqual(status, 200)
        load_mock.assert_called_once_with()
        runner_mock.assert_called_once()
        runner_kwargs = runner_mock.call_args.kwargs
        self.assertEqual(runner_kwargs["top_ks"], (1, 3))
        self.assertIsInstance(runner_kwargs["embedding_provider"], DeterministicFakeEmbeddingProvider)
        self.assertIn("query_results", data)
        self.assertIn("aggregate_results", data)

    def test_route_uses_role_lookup_only_and_does_not_write_to_supabase(self):
        status, _ = get_json("/evaluation/matching", {"authorization": "Bearer token"})

        self.assertEqual(status, 200)
        self.assertEqual(self.repo.calls, [("get_user_profile", "admin-1")])

    def test_response_excludes_private_raw_fields_and_fake_claims(self):
        status, data = get_json("/evaluation/matching", {"authorization": "Bearer token"})

        self.assertEqual(status, 200)
        public_json = json.dumps(data).lower()
        for fragment in FORBIDDEN_EVALUATION_RESPONSE_FRAGMENTS + FORBIDDEN_EVALUATION_CLAIMS:
            with self.subTest(fragment=fragment):
                self.assertNotIn(fragment, public_json)

    def test_evaluation_route_is_registered(self):
        paths = {getattr(route, "path", "") for route in app.routes}

        self.assertIn("/evaluation/matching", paths)


if __name__ == "__main__":
    unittest.main()
