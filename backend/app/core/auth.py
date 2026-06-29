"""Future Supabase JWT verification helpers.

The backend does not trust frontend-submitted roles. Real API authorization will
verify Supabase JWTs server-side before protected business logic is added.
"""

from typing import Any


def verify_supabase_jwt(_token: str) -> dict[str, Any]:
    """TODO: Verify a Supabase access token using the project's JWT/JWKS setup."""
    raise NotImplementedError("Supabase JWT verification is planned for a future milestone.")


def get_current_user_id(_authorization_header: str | None) -> str:
    """TODO: Extract and verify the current Supabase user id from Authorization."""
    raise NotImplementedError("Backend auth dependencies are planned for a future milestone.")
