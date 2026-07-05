"""Backend Supabase auth verification helpers."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Protocol
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.config import settings


class MissingTokenError(Exception):
    """Raised when a request does not include a usable bearer token."""


class InvalidTokenError(Exception):
    """Raised when token verification fails closed."""


@dataclass(frozen=True)
class VerifiedAuthUser:
    """Verified authenticated user identity from Supabase Auth."""

    user_id: str
    claims: dict[str, Any]


class AuthVerifier(Protocol):
    """Dependency-injectable auth verifier interface."""

    def verify_token(self, token: str) -> VerifiedAuthUser:
        """Verify a bearer token and return the trusted authenticated user id."""


class SupabaseAuthVerifier:
    """Verify Supabase access tokens through Supabase Auth.

    This avoids unverified JWT decoding and fails closed if Supabase settings are
    missing, the token is invalid, or the auth service cannot verify the token.
    """

    def __init__(self, supabase_url: str | None = None, publishable_key: str | None = None) -> None:
        self.supabase_url = (supabase_url if supabase_url is not None else settings.supabase_url).rstrip("/")
        self.publishable_key = publishable_key if publishable_key is not None else settings.supabase_publishable_key

    def verify_token(self, token: str) -> VerifiedAuthUser:
        if not token:
            raise MissingTokenError("Missing bearer token.")
        if not self.supabase_url or not self.publishable_key:
            raise InvalidTokenError("Supabase auth verification is not configured.")

        request = Request(
            f"{self.supabase_url}/auth/v1/user",
            headers={
                "apikey": self.publishable_key,
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
            method="GET",
        )

        try:
            with urlopen(request, timeout=10) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
            raise InvalidTokenError("Supabase access token could not be verified.") from error

        user_id = payload.get("id")
        if not isinstance(user_id, str) or not user_id:
            raise InvalidTokenError("Verified auth payload did not include a user id.")

        return VerifiedAuthUser(user_id=user_id, claims=payload)


def extract_bearer_token(authorization_header: str | None) -> str:
    """Extract a bearer token from an Authorization header."""

    if not authorization_header:
        raise MissingTokenError("Missing Authorization header.")

    parts = authorization_header.strip().split()
    if len(parts) != 2 or parts[0].casefold() != "bearer" or not parts[1]:
        raise InvalidTokenError("Authorization header must be in the format 'Bearer <token>'.")

    return parts[1]


def verify_supabase_jwt(token: str) -> dict[str, Any]:
    """Verify a Supabase access token and return verified claims."""

    return SupabaseAuthVerifier().verify_token(token).claims


def get_current_user_id(authorization_header: str | None) -> str:
    """Extract and verify the authenticated Supabase user id."""

    token = extract_bearer_token(authorization_header)
    return SupabaseAuthVerifier().verify_token(token).user_id
