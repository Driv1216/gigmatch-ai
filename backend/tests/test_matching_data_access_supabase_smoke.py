"""Opt-in Supabase smoke tests for the 4F-A matching data access layer.

These tests intentionally do not run during the normal unit suite. They require
real Supabase credentials in environment variables and make network calls.
"""

from __future__ import annotations

import json
import os
import unittest
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.config import settings
from app.core.auth import SupabaseAuthVerifier
from app.matching.data_access import (
    ResourceOwnershipError,
    SupabaseMatchingRepository,
    prepare_client_gig_matching_data,
    prepare_client_owned_gig_profiles,
    prepare_freelancer_matching_data,
)


def _require_smoke_enabled() -> None:
    if os.getenv("RUN_SUPABASE_SMOKE") != "1":
        raise unittest.SkipTest("Set RUN_SUPABASE_SMOKE=1 to run real Supabase smoke tests.")


def _required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise unittest.SkipTest(f"Missing required smoke-test env var: {name}")
    return value


def _login(email: str, password: str) -> str:
    if not settings.supabase_url or not settings.supabase_publishable_key:
        raise unittest.SkipTest("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be configured.")

    body = json.dumps({"email": email, "password": password}).encode("utf-8")
    request = Request(
        f"{settings.supabase_url.rstrip('/')}/auth/v1/token?grant_type=password",
        data=body,
        headers={
            "apikey": settings.supabase_publishable_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=15) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
        raise AssertionError("Supabase smoke login failed.") from error

    access_token = payload.get("access_token")
    if not isinstance(access_token, str) or not access_token:
        raise AssertionError("Supabase smoke login did not return an access token.")

    return access_token


class SupabaseMatchingDataAccessSmokeTests(unittest.TestCase):
    def setUp(self) -> None:
        _require_smoke_enabled()
        self.freelancer_email = _required_env("SUPABASE_SMOKE_FREELANCER_EMAIL")
        self.freelancer_password = _required_env("SUPABASE_SMOKE_FREELANCER_PASSWORD")
        self.client_email = _required_env("SUPABASE_SMOKE_CLIENT_EMAIL")
        self.client_password = _required_env("SUPABASE_SMOKE_CLIENT_PASSWORD")
        self.auth_verifier = SupabaseAuthVerifier()
        self.repository = SupabaseMatchingRepository()

    def test_logged_in_freelancer_loads_own_matching_prep_data(self):
        token = _login(self.freelancer_email, self.freelancer_password)

        result = prepare_freelancer_matching_data(
            f"Bearer {token}",
            self.auth_verifier,
            self.repository,
        )

        self.assertEqual(result.auth_context.role, "freelancer")
        self.assertEqual(result.auth_context.user_id, result.freelancer.freelancer_id)
        self.assertGreaterEqual(len(result.candidate_gigs), 0)

    def test_logged_in_client_loads_own_gig_prep_data(self):
        token = _login(self.client_email, self.client_password)

        result = prepare_client_owned_gig_profiles(
            f"Bearer {token}",
            self.auth_verifier,
            self.repository,
        )

        self.assertEqual(result.auth_context.role, "client")
        self.assertTrue(result.gigs, "Smoke client must own at least one gig fixture.")
        self.assertTrue(all(gig.client_id == result.auth_context.user_id for gig in result.gigs))

    def test_logged_in_client_is_rejected_for_another_clients_gig(self):
        token = _login(self.client_email, self.client_password)
        client_gigs = prepare_client_owned_gig_profiles(
            f"Bearer {token}",
            self.auth_verifier,
            self.repository,
        )
        other_gig_id = os.getenv("SUPABASE_SMOKE_OTHER_CLIENT_GIG_ID")

        if not other_gig_id:
            other_gig_id = next(
                (
                    str(gig["id"])
                    for gig in self.repository.list_open_gigs()
                    if gig.get("client_id") != client_gigs.auth_context.user_id
                ),
                "",
            )

        if not other_gig_id:
            raise unittest.SkipTest(
                "No other-client gig fixture found. Set SUPABASE_SMOKE_OTHER_CLIENT_GIG_ID."
            )

        with self.assertRaises(ResourceOwnershipError):
            prepare_client_gig_matching_data(
                f"Bearer {token}",
                other_gig_id,
                self.auth_verifier,
                self.repository,
            )


if __name__ == "__main__":
    unittest.main()
