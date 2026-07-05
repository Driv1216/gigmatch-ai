"""Auth-safe matching data access and normalization for future matching APIs."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Protocol
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.config import settings
from app.core.auth import (
    AuthVerifier,
    InvalidTokenError,
    MissingTokenError,
    VerifiedAuthUser,
    extract_bearer_token,
)
from app.matching.builders import build_freelancer_match_profile, build_gig_match_profile
from app.matching.contracts import FreelancerMatchProfile, GigMatchProfile

VALID_MATCHING_ROLES = {"freelancer", "client", "admin"}
PARSE_STATUS_PRIORITY = {"reviewed": 2, "parsed": 1}


class MissingProfileError(Exception):
    """Raised when the authenticated user has no trusted user profile."""


class UnsupportedRoleError(Exception):
    """Raised when a user profile role is not supported by matching access."""


class ForbiddenRoleError(Exception):
    """Raised when a valid role uses the wrong matching access path."""


class ResourceNotFoundError(Exception):
    """Raised when an owned or requested resource does not exist."""


class ResourceOwnershipError(Exception):
    """Raised when a user attempts to access another user's resource."""


@dataclass(frozen=True)
class AuthContext:
    """Trusted authenticated user context for matching data access."""

    user_id: str
    role: str


@dataclass(frozen=True)
class FreelancerMatchingData:
    """Normalized inputs for future freelancer-to-gig matching APIs."""

    auth_context: AuthContext
    freelancer: FreelancerMatchProfile
    candidate_gigs: tuple[GigMatchProfile, ...]


@dataclass(frozen=True)
class ClientGigMatchingData:
    """Normalized inputs for future client-gig-to-freelancer matching APIs."""

    auth_context: AuthContext
    gig: GigMatchProfile
    candidate_freelancers: tuple[FreelancerMatchProfile, ...]


@dataclass(frozen=True)
class ClientOwnedGigsData:
    """Normalized owned client gigs for future matching API selection flows."""

    auth_context: AuthContext
    gigs: tuple[GigMatchProfile, ...]


class MatchingRepository(Protocol):
    """Read-only repository interface used by matching data access."""

    def get_user_profile(self, user_id: str) -> dict[str, Any] | None:
        """Return the trusted user profile for an authenticated user id."""

    def get_freelancer_profile(self, user_id: str) -> dict[str, Any] | None:
        """Return a freelancer profile owned by user_id."""

    def list_resume_parses_for_user(self, user_id: str) -> list[dict[str, Any]]:
        """Return saved resume parse rows owned by user_id."""

    def list_open_gigs(self) -> list[dict[str, Any]]:
        """Return open gig rows eligible for freelancer matching preparation."""

    def list_gig_parses_for_gig(self, gig_id: str) -> list[dict[str, Any]]:
        """Return saved gig parse rows for a gig."""

    def get_gig_by_id(self, gig_id: str) -> dict[str, Any] | None:
        """Return one gig row by id."""

    def list_gigs_for_client(self, client_id: str) -> list[dict[str, Any]]:
        """Return gig rows owned by a client."""

    def list_matchable_freelancer_profiles(self) -> list[dict[str, Any]]:
        """Return freelancer profile rows needed to build matchable candidates."""


class SupabaseMatchingRepository:
    """Read-only Supabase REST repository for matching preparation.

    This class uses the backend secret key because 4F-A needs server-side reads
    that are broader than a single user's RLS view, such as open gigs and
    matchable freelancer candidates. Public preparation functions still enforce
    authenticated user id, role, status, and ownership checks before returning
    normalized data.
    """

    def __init__(self, supabase_url: str | None = None, secret_key: str | None = None) -> None:
        self.supabase_url = (supabase_url if supabase_url is not None else settings.supabase_url).rstrip("/")
        self.secret_key = secret_key if secret_key is not None else settings.supabase_secret_key

    def get_user_profile(self, user_id: str) -> dict[str, Any] | None:
        return _single_or_none(
            self._select(
                "user_profiles",
                {
                    "select": "id,role",
                    "id": f"eq.{user_id}",
                    "limit": "1",
                },
            )
        )

    def get_freelancer_profile(self, user_id: str) -> dict[str, Any] | None:
        return _single_or_none(
            self._select(
                "freelancer_profiles",
                {
                    "select": (
                        "id,user_id,headline,bio,experience_level,primary_role,"
                        "tech_categories,skills,tools,project_links"
                    ),
                    "user_id": f"eq.{user_id}",
                    "limit": "1",
                },
            )
        )

    def list_resume_parses_for_user(self, user_id: str) -> list[dict[str, Any]]:
        return self._select(
            "resume_parses",
            {
                "select": (
                    "id,user_id,status,parser_version,parsed_json,skills,categories,"
                    "matched_terms,unmatched_keywords,confidence,created_at,updated_at"
                ),
                "user_id": f"eq.{user_id}",
                "status": "in.(reviewed,parsed)",
                "order": "updated_at.desc",
            },
        )

    def list_open_gigs(self) -> list[dict[str, Any]]:
        return self._select(
            "gigs",
            {
                "select": (
                    "id,client_id,title,description,tech_category,required_skills,"
                    "preferred_skills,difficulty_level,seniority_needed,deliverables,status,"
                    "created_at,updated_at"
                ),
                "status": "eq.open",
                "order": "updated_at.desc",
            },
        )

    def list_gig_parses_for_gig(self, gig_id: str) -> list[dict[str, Any]]:
        return self._select(
            "gig_parses",
            {
                "select": (
                    "id,gig_id,status,parser_version,parsed_json,required_skills,"
                    "preferred_skills,categories,matched_terms,unmatched_keywords,"
                    "confidence,seniority_level,deliverables,created_at,updated_at"
                ),
                "gig_id": f"eq.{gig_id}",
                "status": "in.(reviewed,parsed)",
                "order": "updated_at.desc",
            },
        )

    def get_gig_by_id(self, gig_id: str) -> dict[str, Any] | None:
        return _single_or_none(
            self._select(
                "gigs",
                {
                    "select": (
                        "id,client_id,title,description,tech_category,required_skills,"
                        "preferred_skills,difficulty_level,seniority_needed,deliverables,status,"
                        "created_at,updated_at"
                    ),
                    "id": f"eq.{gig_id}",
                    "limit": "1",
                },
            )
        )

    def list_gigs_for_client(self, client_id: str) -> list[dict[str, Any]]:
        return self._select(
            "gigs",
            {
                "select": (
                    "id,client_id,title,description,tech_category,required_skills,"
                    "preferred_skills,difficulty_level,seniority_needed,deliverables,status,"
                    "created_at,updated_at"
                ),
                "client_id": f"eq.{client_id}",
                "order": "updated_at.desc",
            },
        )

    def list_matchable_freelancer_profiles(self) -> list[dict[str, Any]]:
        return self._select(
            "freelancer_profiles",
            {
                "select": (
                    "id,user_id,headline,bio,experience_level,primary_role,"
                    "tech_categories,skills,tools,project_links"
                ),
                "order": "updated_at.desc",
            },
        )

    def _select(self, table: str, query: dict[str, str]) -> list[dict[str, Any]]:
        if not self.supabase_url or not self.secret_key:
            raise RuntimeError("Supabase matching repository is not configured.")

        request = Request(
            f"{self.supabase_url}/rest/v1/{table}?{urlencode(query)}",
            headers={
                "apikey": self.secret_key,
                "Authorization": f"Bearer {self.secret_key}",
                "Accept": "application/json",
            },
            method="GET",
        )

        try:
            with urlopen(request, timeout=10) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
            raise RuntimeError("Supabase matching read failed.") from error

        if not isinstance(payload, list):
            raise RuntimeError("Supabase matching read returned an unexpected payload.")

        return [row for row in payload if isinstance(row, dict)]


def authenticate_matching_request(
    authorization_header: str | None,
    auth_verifier: AuthVerifier,
    repository: MatchingRepository,
) -> AuthContext:
    """Verify auth and load the trusted database role for matching access."""

    token = extract_bearer_token(authorization_header)
    verified_user = auth_verifier.verify_token(token)
    user_profile = repository.get_user_profile(verified_user.user_id)

    if user_profile is None:
        raise MissingProfileError("Authenticated user does not have a user profile.")

    role = user_profile.get("role")
    if role not in VALID_MATCHING_ROLES:
        raise UnsupportedRoleError("Authenticated user has an unsupported role.")

    return AuthContext(user_id=verified_user.user_id, role=str(role))


def prepare_freelancer_matching_data(
    authorization_header: str | None,
    auth_verifier: AuthVerifier,
    repository: MatchingRepository,
) -> FreelancerMatchingData:
    """Prepare normalized freelancer and open gig inputs for future matching APIs."""

    auth_context = authenticate_matching_request(authorization_header, auth_verifier, repository)
    _require_role(auth_context, "freelancer")

    profile_row = repository.get_freelancer_profile(auth_context.user_id)
    if profile_row is None:
        raise MissingProfileError("Authenticated freelancer does not have a freelancer profile.")

    resume_parse = _latest_available_parse(repository.list_resume_parses_for_user(auth_context.user_id))
    freelancer = build_freelancer_match_profile(profile_row, resume_parse)

    candidate_gigs = tuple(
        build_gig_match_profile(gig_row, _latest_available_parse(repository.list_gig_parses_for_gig(str(gig_row["id"]))))
        for gig_row in repository.list_open_gigs()
        if gig_row.get("status") == "open" and gig_row.get("id")
    )

    return FreelancerMatchingData(
        auth_context=auth_context,
        freelancer=freelancer,
        candidate_gigs=candidate_gigs,
    )


def prepare_client_owned_gig_profiles(
    authorization_header: str | None,
    auth_verifier: AuthVerifier,
    repository: MatchingRepository,
) -> ClientOwnedGigsData:
    """Prepare normalized owned client gigs for future matching route selection."""

    auth_context = authenticate_matching_request(authorization_header, auth_verifier, repository)
    _require_role(auth_context, "client")

    gigs = tuple(
        build_gig_match_profile(gig_row, _latest_available_parse(repository.list_gig_parses_for_gig(str(gig_row["id"]))))
        for gig_row in repository.list_gigs_for_client(auth_context.user_id)
        if gig_row.get("client_id") == auth_context.user_id and gig_row.get("id")
    )
    return ClientOwnedGigsData(auth_context=auth_context, gigs=gigs)


def prepare_client_gig_matching_data(
    authorization_header: str | None,
    gig_id: str,
    auth_verifier: AuthVerifier,
    repository: MatchingRepository,
) -> ClientGigMatchingData:
    """Prepare normalized gig and freelancer inputs for future client matching APIs."""

    auth_context = authenticate_matching_request(authorization_header, auth_verifier, repository)
    _require_role(auth_context, "client")

    gig_row = repository.get_gig_by_id(gig_id)
    if gig_row is None:
        raise ResourceNotFoundError("Requested gig was not found.")
    if gig_row.get("client_id") != auth_context.user_id:
        raise ResourceOwnershipError("Requested gig is not owned by the authenticated client.")

    gig = build_gig_match_profile(gig_row, _latest_available_parse(repository.list_gig_parses_for_gig(gig_id)))
    candidate_freelancers = tuple(
        build_freelancer_match_profile(
            freelancer_row,
            _latest_available_parse(repository.list_resume_parses_for_user(str(freelancer_row["user_id"]))),
        )
        for freelancer_row in repository.list_matchable_freelancer_profiles()
        if freelancer_row.get("user_id")
    )

    return ClientGigMatchingData(
        auth_context=auth_context,
        gig=gig,
        candidate_freelancers=candidate_freelancers,
    )


def _require_role(auth_context: AuthContext, required_role: str) -> None:
    if auth_context.role != required_role:
        raise ForbiddenRoleError(f"{auth_context.role} users cannot use the {required_role} matching access path.")


def _latest_available_parse(rows: list[dict[str, Any]]) -> dict[str, Any] | None:
    candidates = [row for row in rows if row.get("status") in PARSE_STATUS_PRIORITY]
    if not candidates:
        return None

    return max(
        candidates,
        key=lambda row: (
            PARSE_STATUS_PRIORITY.get(str(row.get("status")), 0),
            _timestamp_value(row.get("updated_at")) or _timestamp_value(row.get("created_at")),
        ),
    )


def _timestamp_value(value: Any) -> datetime:
    if not isinstance(value, str) or not value:
        return datetime.min.replace(tzinfo=timezone.utc)

    normalized = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return datetime.min.replace(tzinfo=timezone.utc)

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed


def _single_or_none(rows: list[dict[str, Any]]) -> dict[str, Any] | None:
    return rows[0] if rows else None


__all__ = [
    "AuthContext",
    "AuthVerifier",
    "ClientGigMatchingData",
    "ClientOwnedGigsData",
    "ForbiddenRoleError",
    "FreelancerMatchingData",
    "InvalidTokenError",
    "MatchingRepository",
    "MissingProfileError",
    "MissingTokenError",
    "ResourceNotFoundError",
    "ResourceOwnershipError",
    "SupabaseMatchingRepository",
    "UnsupportedRoleError",
    "VerifiedAuthUser",
    "authenticate_matching_request",
    "prepare_client_gig_matching_data",
    "prepare_client_owned_gig_profiles",
    "prepare_freelancer_matching_data",
]
