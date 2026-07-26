"""Participant-safe Secure Contact Exchange routes."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Response

from app.config import settings
from app.core.auth import (
    AuthVerifier,
    InvalidTokenError,
    MissingTokenError,
    SupabaseAuthVerifier,
    extract_bearer_token,
)
from app.marketplace.contact_contracts import (
    ContactActionRequest,
    ContactReportRequest,
    ContactRevealRequest,
    ContactShareRequest,
)
from app.marketplace.contact_crypto import (
    ContactCipher,
    ContactCryptoConfigurationError,
    ContactDecryptionError,
)
from app.marketplace.contact_data_access import (
    ContactRepository,
    MarketplaceWriteError,
    SupabaseContactRepository,
)

router = APIRouter()

FORBIDDEN_ORDINARY_KEYS = frozenset(
    {
        "value",
        "email",
        "phone",
        "url",
        "ciphertext",
        "nonce",
        "key_id",
        "source_digest",
        "canonical_value_fingerprint",
        "material_kind",
        "sharer_user_id",
        "recipient_user_id",
        "audit_id",
    }
)


def get_auth_verifier() -> AuthVerifier:
    return SupabaseAuthVerifier()


def get_contact_repository() -> ContactRepository:
    return SupabaseContactRepository()


def get_contact_cipher_provider() -> Callable[[], ContactCipher]:
    return ContactCipher.from_settings


@router.get("/engagements/{engagement_id}/contact-exchange", response_model=dict[str, Any])
def get_contact_exchange(
    engagement_id: str,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: ContactRepository = Depends(get_contact_repository),
) -> dict[str, Any]:
    actor = _identity(authorization, auth_verifier, repository)
    return _ordinary_call(repository, "contact_exchange_get", {
        "p_engagement_id": engagement_id,
        "p_acting_user_id": actor,
    })


@router.post("/engagements/{engagement_id}/contact-shares", response_model=dict[str, Any])
def share_contact(
    engagement_id: str,
    body: ContactShareRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: ContactRepository = Depends(get_contact_repository),
    cipher_provider: Callable[[], ContactCipher] = Depends(get_contact_cipher_provider),
) -> dict[str, Any]:
    actor = _identity(authorization, auth_verifier, repository)
    share_id = str(uuid4())
    payload: dict[str, Any] = {
        "p_engagement_id": engagement_id,
        "p_acting_user_id": actor,
        "p_method": body.method,
        "p_expected_action_token": body.share_action_token,
        "p_request_id": str(body.request_id),
        "p_share_id": share_id,
        "p_ciphertext": None,
        "p_nonce": None,
        "p_key_id": None,
        "p_value_fingerprint": None,
        "p_masked_value": None,
    }
    if body.value is not None:
        context = _raw_call(repository, "contact_share_encryption_context", {
            "p_engagement_id": engagement_id,
            "p_acting_user_id": actor,
        })
        try:
            protected = cipher_provider().protect(
                body.value,
                share_id=share_id,
                engagement_id=_required_string(context, "engagement_id"),
                sharer_user_id=_required_string(context, "sharer_user_id"),
                recipient_user_id=_required_string(context, "recipient_user_id"),
                method=body.method,
            )
        except ContactCryptoConfigurationError as error:
            raise HTTPException(
                status_code=503, detail="contact_exchange_unavailable"
            ) from error
        payload.update({
            "p_ciphertext": protected.ciphertext,
            "p_nonce": protected.nonce,
            "p_key_id": protected.key_id,
            "p_value_fingerprint": protected.canonical_fingerprint,
            "p_masked_value": protected.masked_value,
        })
    return _ordinary_call(repository, "contact_share_create", payload)


@router.post("/contact-shares/{share_id}/revoke", response_model=dict[str, Any])
def revoke_contact(
    share_id: str,
    body: ContactActionRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: ContactRepository = Depends(get_contact_repository),
) -> dict[str, Any]:
    actor = _identity(authorization, auth_verifier, repository)
    return _ordinary_call(repository, "contact_share_revoke", {
        "p_share_id": share_id,
        "p_acting_user_id": actor,
        "p_expected_action_token": body.action_token,
        "p_request_id": str(body.request_id),
    })


@router.post("/contact-shares/{share_id}/reveal", response_model=dict[str, Any])
def reveal_contact(
    share_id: str,
    body: ContactRevealRequest,
    response: Response,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: ContactRepository = Depends(get_contact_repository),
    cipher_provider: Callable[[], ContactCipher] = Depends(get_contact_cipher_provider),
) -> dict[str, Any]:
    _set_no_store(response)
    actor = _identity(authorization, auth_verifier, repository)
    result = _raw_call(repository, "contact_share_reveal", {
        "p_share_id": share_id,
        "p_acting_user_id": actor,
        "p_reveal_action_token": body.reveal_action_token,
        "p_request_id": str(body.request_id),
        "p_rate_limit": settings.contact_reveal_rate_limit,
        "p_rate_window_minutes": settings.contact_reveal_rate_window_minutes,
    }, no_store=True)
    if result.get("authorised") is not True:
        code = result.get("denial_code")
        if code == "contact_source_invalidated":
            raise HTTPException(
                status_code=409,
                detail="contact_source_invalidated",
                headers=_no_store_headers(),
            )
        if code == "contact_reveal_rate_limited":
            retry = result.get("retry_after_seconds")
            headers = _no_store_headers()
            headers["Retry-After"] = str(retry if isinstance(retry, int) else 1)
            raise HTTPException(
                status_code=429,
                detail="contact_reveal_rate_limited",
                headers=headers,
            )
        raise HTTPException(
            status_code=409,
            detail="contact_reveal_not_allowed",
            headers=_no_store_headers(),
        )

    method = _required_string(result, "method")
    material_kind = _required_string(result, "material_kind")
    if material_kind == "auth_plaintext":
        value = _required_string(result, "value")
    elif material_kind == "encrypted_url":
        try:
            value = cipher_provider().reveal(
                ciphertext=_required_string(result, "ciphertext"),
                nonce=_required_string(result, "nonce"),
                key_id=_required_string(result, "key_id"),
                share_id=_required_string(result, "share_id"),
                engagement_id=_required_string(result, "engagement_id"),
                sharer_user_id=_required_string(result, "sharer_user_id"),
                recipient_user_id=_required_string(result, "recipient_user_id"),
                method=method,
            )
        except (ContactCryptoConfigurationError, ContactDecryptionError) as error:
            raise HTTPException(
                status_code=500,
                detail="contact_reveal_failed",
                headers=_no_store_headers(),
            ) from error
    else:
        raise HTTPException(
            status_code=500,
            detail="contact_reveal_failed",
            headers=_no_store_headers(),
        )
    return {
        "share_id": _required_string(result, "share_id"),
        "method": method,
        "value": value,
        "ownership_verification": _required_string(
            result, "ownership_verification"
        ),
        **(
            {"whatsapp_availability": result["whatsapp_availability"]}
            if result.get("whatsapp_availability") == "self_declared"
            else {}
        ),
        "authorised_at": _required_string(result, "authorised_at"),
        "audit_reused": result.get("audit_replay") is True,
    }


@router.post("/engagements/{engagement_id}/contact-block", response_model=dict[str, Any])
def block_contact(
    engagement_id: str,
    body: ContactActionRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: ContactRepository = Depends(get_contact_repository),
) -> dict[str, Any]:
    actor = _identity(authorization, auth_verifier, repository)
    return _ordinary_call(repository, "engagement_contact_block", {
        "p_engagement_id": engagement_id,
        "p_acting_user_id": actor,
        "p_expected_action_token": body.action_token,
        "p_request_id": str(body.request_id),
    })


@router.post("/engagements/{engagement_id}/contact-reports", response_model=dict[str, Any])
def report_contact(
    engagement_id: str,
    body: ContactReportRequest,
    authorization: str | None = Header(default=None),
    auth_verifier: AuthVerifier = Depends(get_auth_verifier),
    repository: ContactRepository = Depends(get_contact_repository),
) -> dict[str, Any]:
    actor = _identity(authorization, auth_verifier, repository)
    return _ordinary_call(repository, "engagement_contact_report", {
        "p_engagement_id": engagement_id,
        "p_acting_user_id": actor,
        "p_expected_action_token": body.report_action_token,
        "p_request_id": str(body.request_id),
        "p_category": body.category,
        "p_detail": body.detail,
    })


def assert_ordinary_contact_payload_safe(value: Any) -> None:
    if isinstance(value, dict):
        for key, item in value.items():
            if key.casefold() in FORBIDDEN_ORDINARY_KEYS:
                raise ValueError("Unsafe contact material in ordinary response.")
            assert_ordinary_contact_payload_safe(item)
    elif isinstance(value, list):
        for item in value:
            assert_ordinary_contact_payload_safe(item)


def _ordinary_call(
    repository: ContactRepository,
    function_name: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    result = _raw_call(repository, function_name, payload)
    try:
        assert_ordinary_contact_payload_safe(result)
    except ValueError as error:
        raise HTTPException(
            status_code=500, detail="contact_exchange_response_invalid"
        ) from error
    return result


def _raw_call(
    repository: ContactRepository,
    function_name: str,
    payload: dict[str, Any],
    *,
    no_store: bool = False,
) -> dict[str, Any]:
    try:
        return repository.call_contact(function_name, payload)
    except MarketplaceWriteError as error:
        message = str(error)
        mappings = (
            ("M7I_CONTACT_EXCHANGE_NOT_FOUND", 404, "contact_exchange_not_found"),
            ("M7I_STALE_CONTACT_ACTION", 409, "stale_contact_action"),
            ("M7I_CONTACT_EXCHANGE_UNAVAILABLE", 409, "contact_exchange_unavailable"),
            ("M7I_CONTACT_EXCHANGE_BLOCKED", 409, "contact_exchange_blocked"),
            ("M7I_CONTACT_ALREADY_SHARED", 409, "contact_already_shared"),
            ("M7I_CONTACT_SHARE_NOT_ACTIVE", 409, "contact_share_not_active"),
            ("M7I_CONTACT_SOURCE_INVALIDATED", 409, "contact_source_invalidated"),
            ("M7I_VERIFIED_SOURCE_UNAVAILABLE", 409, "verified_contact_unavailable"),
            ("M7I_IDEMPOTENCY_CONFLICT", 409, "idempotency_conflict"),
            ("M7I_CONTACT_ALREADY_BLOCKED", 409, "contact_already_blocked"),
            ("M7I_INVALID_REPORT_DETAIL", 422, "invalid_report_detail"),
            ("M7I_CONTACT_SHARE_NOT_ALLOWED", 422, "contact_share_not_allowed"),
            ("M7I_CONTACT_REVEAL_NOT_ALLOWED", 422, "contact_reveal_not_allowed"),
        )
        headers = _no_store_headers() if no_store else None
        for marker, status, detail in mappings:
            if marker in message:
                raise HTTPException(
                    status_code=status, detail=detail, headers=headers
                ) from error
        raise HTTPException(
            status_code=500,
            detail="contact_exchange_write_failed",
            headers=headers,
        ) from error


def _identity(
    authorization: str | None,
    auth_verifier: AuthVerifier,
    repository: ContactRepository,
) -> str:
    try:
        token = extract_bearer_token(authorization)
        user_id = auth_verifier.verify_token(token).user_id
    except (MissingTokenError, InvalidTokenError) as error:
        raise HTTPException(status_code=401, detail="authentication_required") from error
    profile = repository.get_user_profile(user_id)
    if profile is None or profile.get("role") not in ("client", "freelancer"):
        raise HTTPException(status_code=403, detail="contact_exchange_not_allowed")
    return user_id


def _required_string(value: dict[str, Any], key: str) -> str:
    item = value.get(key)
    if not isinstance(item, str) or not item:
        raise HTTPException(status_code=500, detail="contact_reveal_failed")
    return item


def _set_no_store(response: Response) -> None:
    for key, value in _no_store_headers().items():
        response.headers[key] = value


def _no_store_headers() -> dict[str, str]:
    return {
        "Cache-Control": "no-store, private",
        "Pragma": "no-cache",
        "Expires": "0",
    }


__all__ = [
    "assert_ordinary_contact_payload_safe",
    "get_auth_verifier",
    "get_contact_cipher_provider",
    "get_contact_repository",
    "router",
]
