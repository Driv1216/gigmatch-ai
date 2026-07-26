"""Personalized, read-only workflow dashboard endpoints."""

from __future__ import annotations

from typing import Any, Literal, TypeVar

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from pydantic import BaseModel, ValidationError

from app.core.auth import (
    AuthVerifier,
    InvalidTokenError,
    MissingTokenError,
    SupabaseAuthVerifier,
    extract_bearer_token,
)
from app.marketplace.dashboard_contracts import (
    ClientDashboardResponse,
    FreelancerDashboardResponse,
    assert_dashboard_payload_safe,
)
from app.marketplace.dashboard_data_access import (
    DashboardRepository,
    MarketplaceWriteError,
    SupabaseDashboardRepository,
)


router = APIRouter()
DashboardModel = TypeVar("DashboardModel", bound=BaseModel)


def get_auth_verifier() -> AuthVerifier:
    return SupabaseAuthVerifier()


def get_dashboard_repository() -> DashboardRepository:
    return SupabaseDashboardRepository()


@router.get(
    "/dashboard/freelancer",
    response_model=FreelancerDashboardResponse,
)
def get_freelancer_dashboard(
    response: Response,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: DashboardRepository = Depends(get_dashboard_repository),
) -> FreelancerDashboardResponse:
    _set_no_store(response)
    actor = _identity("freelancer", authorization, auth_verifier, repository)
    return _dashboard(
        repository,
        "dashboard_freelancer_get",
        actor,
        FreelancerDashboardResponse,
    )


@router.get(
    "/dashboard/client",
    response_model=ClientDashboardResponse,
)
def get_client_dashboard(
    response: Response,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: DashboardRepository = Depends(get_dashboard_repository),
) -> ClientDashboardResponse:
    _set_no_store(response)
    actor = _identity("client", authorization, auth_verifier, repository)
    return _dashboard(
        repository,
        "dashboard_client_get",
        actor,
        ClientDashboardResponse,
    )


def _identity(
    required_role: Literal["client", "freelancer"],
    authorization: str | None,
    auth_verifier: AuthVerifier,
    repository: DashboardRepository,
) -> str:
    try:
        token = extract_bearer_token(authorization)
        user_id = auth_verifier.verify_token(token).user_id
    except (MissingTokenError, InvalidTokenError) as error:
        raise HTTPException(
            status_code=401,
            detail="authentication_required",
            headers=_no_store_headers(),
        ) from error
    profile = repository.get_user_profile(user_id)
    if profile is None or profile.get("role") != required_role:
        raise HTTPException(
            status_code=403,
            detail=f"{required_role}_dashboard_not_allowed",
            headers=_no_store_headers(),
        )
    return user_id


def _dashboard(
    repository: DashboardRepository,
    function_name: str,
    actor: str,
    model: type[DashboardModel],
) -> DashboardModel:
    try:
        payload = repository.call_dashboard(
            function_name,
            {"p_acting_user_id": actor},
        )
        assert_dashboard_payload_safe(payload)
        return model.model_validate(payload)
    except (ValidationError, ValueError, TypeError) as error:
        raise HTTPException(
            status_code=502,
            detail="dashboard_response_invalid",
            headers=_no_store_headers(),
        ) from error
    except MarketplaceWriteError as error:
        marker = str(error)
        if "M7J_" in marker and "NOT_ALLOWED" in marker:
            raise HTTPException(
                status_code=403,
                detail="dashboard_not_allowed",
                headers=_no_store_headers(),
            ) from error
        raise HTTPException(
            status_code=503,
            detail="dashboard_unavailable",
            headers=_no_store_headers(),
        ) from error
    except RuntimeError as error:
        raise HTTPException(
            status_code=503,
            detail="dashboard_unavailable",
            headers=_no_store_headers(),
        ) from error


def _set_no_store(response: Response) -> None:
    for key, value in _no_store_headers().items():
        response.headers[key] = value


def _no_store_headers() -> dict[str, str]:
    return {
        "Cache-Control": "no-store, private",
        "Pragma": "no-cache",
    }


__all__ = [
    "get_auth_verifier",
    "get_dashboard_repository",
    "router",
]
