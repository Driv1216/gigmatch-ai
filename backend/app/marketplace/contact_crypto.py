"""Authenticated encryption and strict URL handling for contact exchange."""

from __future__ import annotations

import base64
import hashlib
import hmac
import ipaddress
import json
import os
import re
from dataclasses import dataclass
from typing import Mapping
from urllib.parse import SplitResult, urlsplit, urlunsplit

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidTag

from app.config import settings

CONTROL_CHARACTERS = re.compile(r"[\x00-\x1f\x7f]")
LOCAL_HOST_SUFFIXES = (
    ".localhost",
    ".local",
    ".internal",
    ".home",
    ".lan",
)
URL_METHODS = frozenset({"meeting_link", "professional_profile"})


class ContactCryptoConfigurationError(RuntimeError):
    """Raised when backend-only contact encryption settings are unusable."""


class ContactDecryptionError(RuntimeError):
    """Raised without leaking cryptographic details."""


@dataclass(frozen=True)
class ProtectedContactValue:
    canonical_url: str
    ciphertext: str
    nonce: str
    key_id: str
    canonical_fingerprint: str
    masked_value: str


class ContactCipher:
    """AES-256-GCM envelope with independently keyed canonical fingerprints."""

    def __init__(
        self,
        *,
        active_key_id: str,
        encryption_keys: Mapping[str, bytes],
        fingerprint_key: bytes,
    ) -> None:
        if not active_key_id or active_key_id not in encryption_keys:
            raise ContactCryptoConfigurationError("Active contact encryption key is missing.")
        if any(len(key) != 32 for key in encryption_keys.values()):
            raise ContactCryptoConfigurationError("Contact encryption keys must be 32 bytes.")
        if len(fingerprint_key) != 32:
            raise ContactCryptoConfigurationError("Contact fingerprint key must be 32 bytes.")
        self._active_key_id = active_key_id
        self._keys = dict(encryption_keys)
        self._fingerprint_key = fingerprint_key

    @classmethod
    def from_settings(cls) -> "ContactCipher":
        try:
            raw_keys = json.loads(settings.contact_encryption_keys_json)
        except json.JSONDecodeError as error:
            raise ContactCryptoConfigurationError(
                "Contact encryption key configuration is invalid."
            ) from error
        if not isinstance(raw_keys, dict) or not all(
            isinstance(key_id, str) and isinstance(value, str)
            for key_id, value in raw_keys.items()
        ):
            raise ContactCryptoConfigurationError(
                "Contact encryption key configuration is invalid."
            )
        encryption_keys = {
            key_id: _decode_key(value) for key_id, value in raw_keys.items()
        }
        return cls(
            active_key_id=settings.contact_active_encryption_key_id,
            encryption_keys=encryption_keys,
            fingerprint_key=_decode_key(settings.contact_fingerprint_key_base64),
        )

    def protect(
        self,
        value: str,
        *,
        share_id: str,
        engagement_id: str,
        sharer_user_id: str,
        recipient_user_id: str,
        method: str,
    ) -> ProtectedContactValue:
        canonical = canonicalize_contact_url(value, method=method)
        associated_data = contact_associated_data(
            share_id=share_id,
            engagement_id=engagement_id,
            sharer_user_id=sharer_user_id,
            recipient_user_id=recipient_user_id,
            method=method,
        )
        nonce = os.urandom(12)
        ciphertext = AESGCM(self._keys[self._active_key_id]).encrypt(
            nonce, canonical.encode("utf-8"), associated_data
        )
        fingerprint = hmac.new(
            self._fingerprint_key,
            b"contact-canonical-v1\x1f"
            + method.encode("ascii")
            + b"\x1f"
            + canonical.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        hostname = urlsplit(canonical).hostname or ""
        return ProtectedContactValue(
            canonical_url=canonical,
            ciphertext=_encode_bytes(ciphertext),
            nonce=_encode_bytes(nonce),
            key_id=self._active_key_id,
            canonical_fingerprint=fingerprint,
            masked_value=f"https://{hostname}/••••",
        )

    def reveal(
        self,
        *,
        ciphertext: str,
        nonce: str,
        key_id: str,
        share_id: str,
        engagement_id: str,
        sharer_user_id: str,
        recipient_user_id: str,
        method: str,
    ) -> str:
        key = self._keys.get(key_id)
        if key is None:
            raise ContactDecryptionError("Contact material cannot be decrypted.")
        try:
            plaintext = AESGCM(key).decrypt(
                _decode_bytes(nonce),
                _decode_bytes(ciphertext),
                contact_associated_data(
                    share_id=share_id,
                    engagement_id=engagement_id,
                    sharer_user_id=sharer_user_id,
                    recipient_user_id=recipient_user_id,
                    method=method,
                ),
            ).decode("utf-8")
            return canonicalize_contact_url(plaintext, method=method)
        except (InvalidTag, ValueError, UnicodeDecodeError) as error:
            raise ContactDecryptionError("Contact material cannot be decrypted.") from error


def canonicalize_contact_url(value: str, *, method: str) -> str:
    if method not in URL_METHODS:
        raise ValueError("Only user-provided URL methods accept a URL.")
    cleaned = value.strip()
    if (
        not cleaned
        or len(cleaned) > 2048
        or CONTROL_CHARACTERS.search(cleaned)
    ):
        raise ValueError("Contact URL must be clean and no longer than 2048 characters.")
    try:
        parsed = urlsplit(cleaned)
        port = parsed.port
    except ValueError as error:
        raise ValueError("Contact URL is malformed.") from error
    if parsed.scheme.casefold() != "https" or not parsed.hostname:
        raise ValueError("Contact URL must use HTTPS.")
    if parsed.username is not None or parsed.password is not None:
        raise ValueError("Contact URL cannot contain credentials.")
    if port not in (None, 443):
        raise ValueError("Contact URL must use the standard HTTPS port.")
    try:
        hostname = parsed.hostname.encode("idna").decode("ascii").casefold()
    except UnicodeError as error:
        raise ValueError("Contact URL hostname is invalid.") from error
    if (
        hostname == "localhost"
        or hostname.endswith(LOCAL_HOST_SUFFIXES)
        or "." not in hostname
    ):
        raise ValueError("Contact URL cannot target a local or private hostname.")
    try:
        ipaddress.ip_address(hostname)
    except ValueError:
        pass
    else:
        raise ValueError("Contact URL cannot use an IP-literal hostname.")
    netloc = hostname
    normalized = SplitResult(
        scheme="https",
        netloc=netloc,
        path=parsed.path or "/",
        query=parsed.query,
        fragment=parsed.fragment,
    )
    canonical = urlunsplit(normalized)
    if len(canonical) > 2048:
        raise ValueError("Contact URL is too long after normalization.")
    return canonical


def contact_associated_data(
    *,
    share_id: str,
    engagement_id: str,
    sharer_user_id: str,
    recipient_user_id: str,
    method: str,
) -> bytes:
    return "\x1f".join(
        (
            "contact-material-v1",
            share_id,
            engagement_id,
            sharer_user_id,
            recipient_user_id,
            method,
        )
    ).encode("utf-8")


def _decode_key(value: str) -> bytes:
    try:
        return base64.b64decode(value, validate=True)
    except (ValueError, TypeError) as error:
        raise ContactCryptoConfigurationError("Contact key is not valid base64.") from error


def _encode_bytes(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _decode_bytes(value: str) -> bytes:
    if not value or CONTROL_CHARACTERS.search(value):
        raise ValueError("Encoded contact material is invalid.")
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


__all__ = [
    "ContactCipher",
    "ContactCryptoConfigurationError",
    "ContactDecryptionError",
    "ProtectedContactValue",
    "canonicalize_contact_url",
    "contact_associated_data",
]
