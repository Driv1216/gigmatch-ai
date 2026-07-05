import inspect
import sys
import unittest
from typing import Any

from app.core.auth import InvalidTokenError, MissingTokenError, SupabaseAuthVerifier, VerifiedAuthUser
from app.matching import data_access
from app.matching.contracts import FreelancerMatchProfile, GigMatchProfile
from app.matching.data_access import (
    ForbiddenRoleError,
    MissingProfileError,
    ResourceNotFoundError,
    ResourceOwnershipError,
    UnsupportedRoleError,
    authenticate_matching_request,
    prepare_client_gig_matching_data,
    prepare_client_owned_gig_profiles,
    prepare_freelancer_matching_data,
)


class FakeAuthVerifier:
    def __init__(self, user_id: str = "user-1", *, fail: bool = False, claims: dict[str, Any] | None = None) -> None:
        self.user_id = user_id
        self.fail = fail
        self.claims = claims or {}
        self.seen_tokens: list[str] = []

    def verify_token(self, token: str) -> VerifiedAuthUser:
        self.seen_tokens.append(token)
        if self.fail:
            raise InvalidTokenError("Invalid test token.")
        return VerifiedAuthUser(user_id=self.user_id, claims=self.claims)


class FakeMatchingRepository:
    def __init__(self) -> None:
        self.user_profiles: dict[str, dict[str, Any]] = {}
        self.freelancer_profiles: dict[str, dict[str, Any]] = {}
        self.resume_parses: dict[str, list[dict[str, Any]]] = {}
        self.gigs_by_id: dict[str, dict[str, Any]] = {}
        self.gig_parses: dict[str, list[dict[str, Any]]] = {}
        self.matchable_freelancers: list[dict[str, Any]] = []
        self.calls: list[tuple[str, str]] = []

    def get_user_profile(self, user_id: str) -> dict[str, Any] | None:
        self.calls.append(("get_user_profile", user_id))
        return self.user_profiles.get(user_id)

    def get_freelancer_profile(self, user_id: str) -> dict[str, Any] | None:
        self.calls.append(("get_freelancer_profile", user_id))
        return self.freelancer_profiles.get(user_id)

    def list_resume_parses_for_user(self, user_id: str) -> list[dict[str, Any]]:
        self.calls.append(("list_resume_parses_for_user", user_id))
        return list(self.resume_parses.get(user_id, []))

    def list_open_gigs(self) -> list[dict[str, Any]]:
        self.calls.append(("list_open_gigs", ""))
        return [gig for gig in self.gigs_by_id.values() if gig.get("status") == "open"]

    def list_gig_parses_for_gig(self, gig_id: str) -> list[dict[str, Any]]:
        self.calls.append(("list_gig_parses_for_gig", gig_id))
        return list(self.gig_parses.get(gig_id, []))

    def get_gig_by_id(self, gig_id: str) -> dict[str, Any] | None:
        self.calls.append(("get_gig_by_id", gig_id))
        return self.gigs_by_id.get(gig_id)

    def list_gigs_for_client(self, client_id: str) -> list[dict[str, Any]]:
        self.calls.append(("list_gigs_for_client", client_id))
        return [gig for gig in self.gigs_by_id.values() if gig.get("client_id") == client_id]

    def list_matchable_freelancer_profiles(self) -> list[dict[str, Any]]:
        self.calls.append(("list_matchable_freelancer_profiles", ""))
        return list(self.matchable_freelancers)


def make_repo() -> FakeMatchingRepository:
    repo = FakeMatchingRepository()
    repo.user_profiles = {
        "freelancer-1": {"id": "freelancer-1", "role": "freelancer"},
        "client-1": {"id": "client-1", "role": "client"},
        "client-2": {"id": "client-2", "role": "client"},
        "admin-1": {"id": "admin-1", "role": "admin"},
    }
    repo.freelancer_profiles["freelancer-1"] = {
        "id": "freelancer-profile-1",
        "user_id": "freelancer-1",
        "headline": "React developer",
        "bio": "Builds dashboards",
        "primary_role": "Frontend Developer",
        "experience_level": "intermediate",
        "tech_categories": ["frontend"],
        "skills": ["React"],
        "tools": ["Figma"],
        "project_links": ["Portfolio"],
        "email": "private@example.com",
    }
    repo.gigs_by_id = {
        "gig-1": {
            "id": "gig-1",
            "client_id": "client-1",
            "title": "Build React dashboard",
            "description": "Need React dashboard",
            "tech_category": "frontend",
            "required_skills": ["React"],
            "preferred_skills": [],
            "difficulty_level": "intermediate",
            "seniority_needed": "junior",
            "deliverables": ["dashboard"],
            "status": "open",
            "updated_at": "2026-07-04T12:00:00+00:00",
        },
        "gig-2": {
            "id": "gig-2",
            "client_id": "client-2",
            "title": "Other client gig",
            "description": "Private gig",
            "tech_category": "backend",
            "required_skills": ["FastAPI"],
            "preferred_skills": [],
            "deliverables": [],
            "status": "open",
        },
        "gig-closed": {
            "id": "gig-closed",
            "client_id": "client-1",
            "title": "Closed gig",
            "description": "Closed",
            "tech_category": "frontend",
            "required_skills": ["React"],
            "preferred_skills": [],
            "deliverables": [],
            "status": "closed",
        },
    }
    repo.matchable_freelancers = [
        repo.freelancer_profiles["freelancer-1"],
        {
            "id": "freelancer-profile-2",
            "user_id": "freelancer-2",
            "headline": "Backend developer",
            "bio": "Builds APIs",
            "primary_role": "Backend Developer",
            "experience_level": "advanced",
            "tech_categories": ["backend"],
            "skills": ["FastAPI"],
            "tools": [],
            "project_links": [],
            "raw_resume_text": "must not leak",
        },
    ]
    return repo


class MatchingDataAccessTests(unittest.TestCase):
    def test_missing_bearer_token_is_rejected(self):
        with self.assertRaises(MissingTokenError):
            authenticate_matching_request(None, FakeAuthVerifier(), make_repo())

    def test_malformed_authorization_header_is_rejected(self):
        with self.assertRaises(InvalidTokenError):
            authenticate_matching_request("Token abc", FakeAuthVerifier(), make_repo())

    def test_invalid_token_is_rejected(self):
        with self.assertRaises(InvalidTokenError):
            authenticate_matching_request("Bearer bad", FakeAuthVerifier(fail=True), make_repo())

    def test_valid_token_extracts_authenticated_user_id(self):
        repo = make_repo()
        verifier = FakeAuthVerifier("freelancer-1")

        context = authenticate_matching_request("Bearer good-token", verifier, repo)

        self.assertEqual(context.user_id, "freelancer-1")
        self.assertEqual(context.role, "freelancer")
        self.assertEqual(verifier.seen_tokens, ["good-token"])

    def test_role_is_fetched_from_user_profiles_not_auth_claims(self):
        repo = make_repo()
        verifier = FakeAuthVerifier("freelancer-1", claims={"role": "admin"})

        context = authenticate_matching_request("Bearer token", verifier, repo)

        self.assertEqual(context.role, "freelancer")

    def test_missing_user_profile_row_is_rejected(self):
        with self.assertRaises(MissingProfileError):
            authenticate_matching_request("Bearer token", FakeAuthVerifier("missing-user"), make_repo())

    def test_unsupported_role_is_rejected(self):
        repo = make_repo()
        repo.user_profiles["weird-user"] = {"id": "weird-user", "role": "owner"}

        with self.assertRaises(UnsupportedRoleError):
            authenticate_matching_request("Bearer token", FakeAuthVerifier("weird-user"), repo)

    def test_admin_is_recognized_but_cannot_use_freelancer_or_client_paths(self):
        repo = make_repo()
        context = authenticate_matching_request("Bearer token", FakeAuthVerifier("admin-1"), repo)

        self.assertEqual(context.role, "admin")
        with self.assertRaises(ForbiddenRoleError):
            prepare_freelancer_matching_data("Bearer token", FakeAuthVerifier("admin-1"), repo)
        with self.assertRaises(ForbiddenRoleError):
            prepare_client_gig_matching_data("Bearer token", "gig-1", FakeAuthVerifier("admin-1"), repo)

    def test_freelancer_only_access_rejects_client_users(self):
        with self.assertRaises(ForbiddenRoleError):
            prepare_freelancer_matching_data("Bearer token", FakeAuthVerifier("client-1"), make_repo())

    def test_client_only_access_rejects_freelancer_users(self):
        with self.assertRaises(ForbiddenRoleError):
            prepare_client_gig_matching_data("Bearer token", "gig-1", FakeAuthVerifier("freelancer-1"), make_repo())

    def test_freelancer_profile_loading_uses_only_authenticated_user_id(self):
        repo = make_repo()

        prepare_freelancer_matching_data("Bearer token", FakeAuthVerifier("freelancer-1"), repo)

        self.assertIn(("get_freelancer_profile", "freelancer-1"), repo.calls)
        self.assertNotIn(("get_freelancer_profile", "client-1"), repo.calls)

    def test_client_owned_gig_loading_uses_only_authenticated_user_id(self):
        repo = make_repo()

        result = prepare_client_owned_gig_profiles("Bearer token", FakeAuthVerifier("client-1"), repo)

        self.assertIn(("list_gigs_for_client", "client-1"), repo.calls)
        self.assertEqual([gig.gig_id for gig in result.gigs], ["gig-1", "gig-closed"])
        self.assertTrue(all(gig.client_id == "client-1" for gig in result.gigs))

    def test_client_cannot_prepare_matching_data_for_another_clients_gig(self):
        with self.assertRaises(ResourceOwnershipError):
            prepare_client_gig_matching_data("Bearer token", "gig-2", FakeAuthVerifier("client-1"), make_repo())

    def test_missing_requested_gig_is_reported(self):
        with self.assertRaises(ResourceNotFoundError):
            prepare_client_gig_matching_data("Bearer token", "missing-gig", FakeAuthVerifier("client-1"), make_repo())

    def test_missing_resume_parse_does_not_crash_freelancer_normalization(self):
        result = prepare_freelancer_matching_data("Bearer token", FakeAuthVerifier("freelancer-1"), make_repo())

        self.assertIsInstance(result.freelancer, FreelancerMatchProfile)
        self.assertEqual(result.freelancer.freelancer_id, "freelancer-1")
        self.assertEqual([skill.display_name for skill in result.freelancer.skills], ["React"])

    def test_missing_gig_parse_does_not_crash_gig_normalization(self):
        result = prepare_client_gig_matching_data("Bearer token", "gig-1", FakeAuthVerifier("client-1"), make_repo())

        self.assertIsInstance(result.gig, GigMatchProfile)
        self.assertEqual(result.gig.gig_id, "gig-1")
        self.assertEqual([skill.display_name for skill in result.gig.required_skills], ["React"])

    def test_latest_reviewed_resume_parse_selection_uses_schema_status_and_timestamps(self):
        repo = make_repo()
        repo.resume_parses["freelancer-1"] = [
            {
                "id": "old-reviewed",
                "user_id": "freelancer-1",
                "status": "reviewed",
                "skills": ["FastAPI"],
                "categories": ["backend"],
                "updated_at": "2026-07-01T00:00:00+00:00",
            },
            {
                "id": "new-parsed",
                "user_id": "freelancer-1",
                "status": "parsed",
                "skills": ["Docker"],
                "categories": ["devops"],
                "updated_at": "2026-07-03T00:00:00+00:00",
            },
            {
                "id": "new-reviewed",
                "user_id": "freelancer-1",
                "status": "reviewed",
                "skills": ["TypeScript"],
                "categories": ["frontend"],
                "updated_at": "2026-07-02T00:00:00+00:00",
            },
            {
                "id": "failed",
                "user_id": "freelancer-1",
                "status": "failed",
                "skills": ["Python"],
                "updated_at": "2026-07-04T00:00:00+00:00",
            },
        ]

        result = prepare_freelancer_matching_data("Bearer token", FakeAuthVerifier("freelancer-1"), repo)

        self.assertEqual([skill.display_name for skill in result.freelancer.skills], ["React", "TypeScript"])

    def test_latest_reviewed_gig_parse_selection_uses_schema_status_and_timestamps(self):
        repo = make_repo()
        repo.gig_parses["gig-1"] = [
            {
                "id": "old-reviewed",
                "gig_id": "gig-1",
                "status": "reviewed",
                "required_skills": ["FastAPI"],
                "preferred_skills": [],
                "updated_at": "2026-07-01T00:00:00+00:00",
            },
            {
                "id": "new-reviewed",
                "gig_id": "gig-1",
                "status": "reviewed",
                "required_skills": ["TypeScript"],
                "preferred_skills": ["Figma"],
                "updated_at": "2026-07-03T00:00:00+00:00",
            },
        ]

        result = prepare_client_gig_matching_data("Bearer token", "gig-1", FakeAuthVerifier("client-1"), repo)

        self.assertEqual([skill.display_name for skill in result.gig.required_skills], ["React", "TypeScript"])
        self.assertEqual([skill.display_name for skill in result.gig.preferred_skills], ["Figma"])

    def test_rows_are_converted_into_freelancer_and_gig_match_profiles(self):
        freelancer_result = prepare_freelancer_matching_data("Bearer token", FakeAuthVerifier("freelancer-1"), make_repo())
        client_result = prepare_client_gig_matching_data("Bearer token", "gig-1", FakeAuthVerifier("client-1"), make_repo())

        self.assertIsInstance(freelancer_result.freelancer, FreelancerMatchProfile)
        self.assertTrue(all(isinstance(gig, GigMatchProfile) for gig in freelancer_result.candidate_gigs))
        self.assertIsInstance(client_result.gig, GigMatchProfile)
        self.assertTrue(
            all(isinstance(freelancer, FreelancerMatchProfile) for freelancer in client_result.candidate_freelancers)
        )

    def test_public_return_objects_do_not_expose_raw_private_database_data(self):
        repo = make_repo()
        repo.resume_parses["freelancer-1"] = [
            {
                "id": "resume-parse",
                "user_id": "freelancer-1",
                "status": "reviewed",
                "skills": ["React"],
                "extracted_text_preview": "raw resume preview",
                "raw_resume_text": "raw resume",
                "updated_at": "2026-07-01T00:00:00+00:00",
            }
        ]

        result = prepare_client_gig_matching_data("Bearer token", "gig-1", FakeAuthVerifier("client-1"), repo)
        public_text = repr(result)

        self.assertNotIn("raw resume", public_text)
        self.assertNotIn("raw resume preview", public_text)
        self.assertNotIn("private@example.com", public_text)
        self.assertNotIn("auth_metadata", public_text)
        self.assertFalse(hasattr(result.candidate_freelancers[0], "raw_resume_text"))

    def test_data_access_does_not_call_hybrid_ranker_or_load_real_models(self):
        source = inspect.getsource(data_access)

        self.assertNotIn("score_hybrid_match", source)
        self.assertNotIn("rank_gigs_for_freelancer_hybrid", source)
        self.assertNotIn("rank_freelancers_for_gig_hybrid", source)
        self.assertNotIn("sentence_transformers", sys.modules)

    def test_tests_use_fakes_and_do_not_call_live_supabase(self):
        repo = make_repo()

        prepare_freelancer_matching_data("Bearer token", FakeAuthVerifier("freelancer-1"), repo)

        self.assertGreater(len(repo.calls), 0)
        self.assertIsInstance(repo, FakeMatchingRepository)

    def test_supabase_auth_verifier_fails_closed_when_unconfigured(self):
        with self.assertRaises(InvalidTokenError):
            SupabaseAuthVerifier(supabase_url="", publishable_key="").verify_token("token")


if __name__ == "__main__":
    unittest.main()
