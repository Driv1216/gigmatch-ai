from __future__ import annotations

import asyncio
import json
import unittest
from copy import deepcopy
from typing import Any
from urllib.parse import urlsplit

from app.api.routes import contact_exchange as contact_routes
from app.main import app
from app.marketplace.contact_contracts import (
    ContactReportRequest,
    ContactShareRequest,
)
from app.marketplace.contact_crypto import (
    ContactCipher,
    ContactDecryptionError,
    canonicalize_contact_url,
)
from app.marketplace.data_access import MarketplaceWriteError
from tests.test_applications import request_json
from tests.test_matching_data_access import FakeAuthVerifier

REQUEST_ID = "11111111-1111-4111-8111-111111111111"
TOKEN = "t" * 64
KEY = b"k" * 32
FINGERPRINT_KEY = b"f" * 32


def contact_state() -> dict[str, Any]:
    return {
        "engagement_id": "engagement-1",
        "viewer_role": "client",
        "engagement_status": "confirmed",
        "exchange_available": True,
        "blocked": False,
        "blocked_by_viewer": False,
        "blocked_by_other": False,
        "available_methods": [{
            "method": "verified_email",
            "available": True,
            "ownership_verification": "verified",
            "share_action_token": TOKEN,
        }],
        "shared_by_you": [],
        "shared_with_you": [],
        "block_action_token": TOKEN,
        "report_action_token": TOKEN,
        "warnings": ["Safety warning"],
    }


class FakeContactRepository:
    def __init__(self) -> None:
        self.users = {
            "client-1": {"id": "client-1", "role": "client"},
            "freelancer-1": {"id": "freelancer-1", "role": "freelancer"},
            "admin-1": {"id": "admin-1", "role": "admin"},
        }
        self.calls: list[tuple[str, dict[str, Any]]] = []
        self.responses: dict[str, dict[str, Any]] = {}
        self.error: MarketplaceWriteError | None = None

    def get_user_profile(self, user_id: str) -> dict[str, Any] | None:
        return self.users.get(user_id)

    def call_contact(
        self, function_name: str, payload: dict[str, Any]
    ) -> dict[str, Any]:
        self.calls.append((function_name, deepcopy(payload)))
        if self.error is not None:
            raise self.error
        if function_name in self.responses:
            return deepcopy(self.responses[function_name])
        if function_name == "contact_share_encryption_context":
            return {
                "engagement_id": "engagement-1",
                "sharer_user_id": "client-1",
                "recipient_user_id": "freelancer-1",
            }
        if function_name == "contact_share_reveal":
            return {
                "authorised": True,
                "audit_id": "audit-internal",
                "share_id": payload["p_share_id"],
                "method": "verified_email",
                "ownership_verification": "verified",
                "authorised_at": "2026-07-26T10:00:00+00:00",
                "material_kind": "auth_plaintext",
                "value": "client@example.test",
                "audit_replay": False,
            }
        if function_name == "engagement_contact_report":
            return {"engagement_id": "engagement-1", "report_submitted": True}
        return contact_state()


class ContactContractAndCryptoTests(unittest.TestCase):
    def setUp(self) -> None:
        self.cipher = ContactCipher(
            active_key_id="contact-v1",
            encryption_keys={"contact-v1": KEY},
            fingerprint_key=FINGERPRINT_KEY,
        )

    def test_verified_methods_reject_browser_values_and_authority(self) -> None:
        with self.assertRaises(ValueError):
            ContactShareRequest.model_validate({
                "method": "verified_email",
                "share_action_token": TOKEN,
                "request_id": REQUEST_ID,
                "value": "browser@example.test",
            })
        with self.assertRaises(ValueError):
            ContactShareRequest.model_validate({
                "method": "verified_email",
                "share_action_token": TOKEN,
                "request_id": REQUEST_ID,
                "verification_status": "verified",
            })

    def test_url_contract_rejects_unsafe_hosts_and_credentials(self) -> None:
        invalid = (
            "http://example.com/meet",
            "https://user:password@example.com/meet",
            "https://localhost/meet",
            "https://service.internal/meet",
            "https://127.0.0.1/meet",
            "https://[::1]/meet",
            "https://example.com:8443/meet",
            "https://example.com/\x00meet",
        )
        for value in invalid:
            with self.subTest(value=value), self.assertRaises(ValueError):
                canonicalize_contact_url(value, method="meeting_link")
        self.assertEqual(
            canonicalize_contact_url(
                " HTTPS://Meet.Example.com/session?id=1 ",
                method="meeting_link",
            ),
            "https://meet.example.com/session?id=1",
        )

    def test_aes_gcm_is_random_bound_and_fingerprinted_separately(self) -> None:
        context = {
            "share_id": "share-1",
            "engagement_id": "engagement-1",
            "sharer_user_id": "client-1",
            "recipient_user_id": "freelancer-1",
            "method": "meeting_link",
        }
        first = self.cipher.protect("https://meet.example.com/secret", **context)
        second = self.cipher.protect("https://meet.example.com/secret", **context)
        self.assertNotEqual(first.ciphertext, second.ciphertext)
        self.assertEqual(first.canonical_fingerprint, second.canonical_fingerprint)
        self.assertNotIn("secret", first.ciphertext)
        self.assertEqual(
            self.cipher.reveal(
                ciphertext=first.ciphertext,
                nonce=first.nonce,
                key_id=first.key_id,
                **context,
            ),
            "https://meet.example.com/secret",
        )
        with self.assertRaises(ContactDecryptionError):
            self.cipher.reveal(
                ciphertext=first.ciphertext,
                nonce=first.nonce,
                key_id=first.key_id,
                **{**context, "recipient_user_id": "other-user"},
            )

    def test_other_report_requires_clean_detail(self) -> None:
        with self.assertRaises(ValueError):
            ContactReportRequest.model_validate({
                "report_action_token": TOKEN,
                "request_id": REQUEST_ID,
                "category": "other",
            })


class ContactRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repo = FakeContactRepository()
        self.auth = FakeAuthVerifier("client-1")
        self.cipher = ContactCipher(
            active_key_id="contact-v1",
            encryption_keys={"contact-v1": KEY},
            fingerprint_key=FINGERPRINT_KEY,
        )
        app.dependency_overrides[contact_routes.get_auth_verifier] = lambda: self.auth
        app.dependency_overrides[
            contact_routes.get_contact_repository
        ] = lambda: self.repo
        app.dependency_overrides[
            contact_routes.get_contact_cipher_provider
        ] = lambda: (lambda: self.cipher)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    def request(
        self, method: str, path: str, body: dict[str, Any] | None = None
    ) -> tuple[int, Any]:
        return asyncio.run(request_json(method, path, body))

    def test_read_uses_verified_actor_and_focused_rpc(self) -> None:
        status, body = self.request(
            "GET", "/engagements/engagement-1/contact-exchange"
        )
        self.assertEqual(status, 200)
        self.assertTrue(body["exchange_available"])
        self.assertEqual(
            self.repo.calls[-1],
            (
                "contact_exchange_get",
                {
                    "p_engagement_id": "engagement-1",
                    "p_acting_user_id": "client-1",
                },
            ),
        )

    def test_verified_share_never_forwards_contact_value_or_evidence(self) -> None:
        status, _ = self.request(
            "POST",
            "/engagements/engagement-1/contact-shares",
            {
                "method": "verified_phone",
                "share_action_token": TOKEN,
                "request_id": REQUEST_ID,
            },
        )
        self.assertEqual(status, 200)
        name, payload = self.repo.calls[-1]
        self.assertEqual(name, "contact_share_create")
        self.assertIsNone(payload["p_ciphertext"])
        self.assertIsNone(payload["p_value_fingerprint"])
        self.assertNotIn("verification_status", payload)
        self.assertNotIn("recipient_user_id", payload)

    def test_url_share_encrypts_before_repository_and_uses_context(self) -> None:
        plaintext = "https://meet.example.com/private-room"
        status, _ = self.request(
            "POST",
            "/engagements/engagement-1/contact-shares",
            {
                "method": "meeting_link",
                "share_action_token": TOKEN,
                "request_id": REQUEST_ID,
                "value": plaintext,
            },
        )
        self.assertEqual(status, 200)
        self.assertEqual(self.repo.calls[-2][0], "contact_share_encryption_context")
        name, payload = self.repo.calls[-1]
        self.assertEqual(name, "contact_share_create")
        self.assertNotIn(plaintext, json.dumps(payload))
        self.assertEqual(payload["p_key_id"], "contact-v1")
        self.assertEqual(len(payload["p_value_fingerprint"]), 64)
        self.assertEqual(payload["p_masked_value"], "https://meet.example.com/••••")

    def test_auth_reveal_returns_only_public_value_with_no_store(self) -> None:
        status, body, headers = asyncio.run(
            request_with_headers(
                "POST",
                "/contact-shares/share-1/reveal",
                {
                    "reveal_action_token": TOKEN,
                    "request_id": REQUEST_ID,
                },
            )
        )
        self.assertEqual(status, 200)
        self.assertEqual(body["value"], "client@example.test")
        self.assertNotIn("audit_id", body)
        self.assertNotIn("material_kind", body)
        self.assertEqual(headers["cache-control"], "no-store, private")
        self.assertEqual(headers["pragma"], "no-cache")

    def test_encrypted_url_reveal_decrypts_and_strips_internals(self) -> None:
        protected = self.cipher.protect(
            "https://profile.example.com/person",
            share_id="share-1",
            engagement_id="engagement-1",
            sharer_user_id="freelancer-1",
            recipient_user_id="client-1",
            method="professional_profile",
        )
        self.repo.responses["contact_share_reveal"] = {
            "authorised": True,
            "audit_id": "audit-internal",
            "share_id": "share-1",
            "engagement_id": "engagement-1",
            "sharer_user_id": "freelancer-1",
            "recipient_user_id": "client-1",
            "method": "professional_profile",
            "ownership_verification": "user_provided",
            "authorised_at": "2026-07-26T10:00:00+00:00",
            "material_kind": "encrypted_url",
            "ciphertext": protected.ciphertext,
            "nonce": protected.nonce,
            "key_id": protected.key_id,
            "audit_replay": True,
        }
        status, body = self.request(
            "POST",
            "/contact-shares/share-1/reveal",
            {"reveal_action_token": TOKEN, "request_id": REQUEST_ID},
        )
        self.assertEqual(status, 200)
        self.assertEqual(body["value"], "https://profile.example.com/person")
        self.assertTrue(body["audit_reused"])
        serialized = json.dumps(body)
        for forbidden in ("ciphertext", "nonce", "key_id", "audit-internal"):
            self.assertNotIn(forbidden, serialized)

    def test_reveal_denials_are_no_store_and_sanitized(self) -> None:
        self.repo.responses["contact_share_reveal"] = {
            "authorised": False,
            "denial_code": "contact_reveal_rate_limited",
            "retry_after_seconds": 23,
        }
        status, body, headers = asyncio.run(
            request_with_headers(
                "POST",
                "/contact-shares/share-1/reveal",
                {"reveal_action_token": TOKEN, "request_id": REQUEST_ID},
            )
        )
        self.assertEqual((status, body["detail"]), (429, "contact_reveal_rate_limited"))
        self.assertEqual(headers["retry-after"], "23")
        self.assertEqual(headers["cache-control"], "no-store, private")

    def test_recursive_sanitizer_rejects_internal_material_in_ordinary_dto(self) -> None:
        unsafe = contact_state()
        unsafe["shared_with_you"] = [{
            "share_id": "share-1",
            "masked_value": "••••",
            "nested": {"ciphertext": "must-not-leak"},
        }]
        self.repo.responses["contact_exchange_get"] = unsafe
        status, body = self.request(
            "GET", "/engagements/engagement-1/contact-exchange"
        )
        self.assertEqual(
            (status, body["detail"]),
            (500, "contact_exchange_response_invalid"),
        )
        self.assertNotIn("must-not-leak", json.dumps(body))

    def test_revoke_block_and_report_forward_only_narrow_authority(self) -> None:
        cases = (
            (
                "/contact-shares/share-1/revoke",
                {"action_token": TOKEN, "request_id": REQUEST_ID},
                "contact_share_revoke",
            ),
            (
                "/engagements/engagement-1/contact-block",
                {"action_token": TOKEN, "request_id": REQUEST_ID},
                "engagement_contact_block",
            ),
            (
                "/engagements/engagement-1/contact-reports",
                {
                    "report_action_token": TOKEN,
                    "request_id": REQUEST_ID,
                    "category": "spam",
                },
                "engagement_contact_report",
            ),
        )
        for path, payload, expected in cases:
            with self.subTest(path=path):
                self.repo.calls.clear()
                status, _ = self.request("POST", path, payload)
                self.assertEqual(status, 200)
                name, rpc_payload = self.repo.calls[-1]
                self.assertEqual(name, expected)
                self.assertEqual(rpc_payload["p_acting_user_id"], "client-1")
                self.assertNotIn("recipient_user_id", rpc_payload)

    def test_auth_and_database_errors_fail_closed_without_raw_details(self) -> None:
        status, body = asyncio.run(
            request_json(
                "GET",
                "/engagements/engagement-1/contact-exchange",
                auth=False,
            )
        )
        self.assertEqual((status, body["detail"]), (401, "authentication_required"))
        self.auth.user_id = "admin-1"
        status, body = self.request(
            "GET", "/engagements/engagement-1/contact-exchange"
        )
        self.assertEqual((status, body["detail"]), (403, "contact_exchange_not_allowed"))
        self.auth.user_id = "client-1"
        self.repo.error = MarketplaceWriteError(
            "M7I_CONTACT_EXCHANGE_NOT_FOUND ciphertext=secret"
        )
        status, body = self.request(
            "GET", "/engagements/guessed/contact-exchange"
        )
        self.assertEqual((status, body["detail"]), (404, "contact_exchange_not_found"))
        self.assertNotIn("secret", json.dumps(body))


async def request_with_headers(
    method: str,
    path: str,
    body: dict[str, Any] | None = None,
) -> tuple[int, Any, dict[str, str]]:
    parsed = urlsplit(path)
    raw = json.dumps(body).encode() if body is not None else b""
    headers = [
        (b"host", b"test"),
        (b"content-type", b"application/json"),
        (b"authorization", b"Bearer token"),
    ]
    events: list[dict[str, Any]] = []
    sent = False
    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": method,
        "scheme": "http",
        "path": parsed.path,
        "raw_path": parsed.path.encode(),
        "query_string": parsed.query.encode(),
        "headers": headers,
        "client": ("test", 1),
        "server": ("test", 80),
    }

    async def receive() -> dict[str, Any]:
        nonlocal sent
        if not sent:
            sent = True
            return {"type": "http.request", "body": raw, "more_body": False}
        return {"type": "http.disconnect"}

    async def send(message: dict[str, Any]) -> None:
        events.append(message)

    await app(scope, receive, send)
    start = next(event for event in events if event["type"] == "http.response.start")
    response_headers = {
        key.decode().casefold(): value.decode()
        for key, value in start.get("headers", [])
    }
    data = b"".join(
        event.get("body", b"")
        for event in events
        if event["type"] == "http.response.body"
    )
    return start["status"], json.loads(data or b"null"), response_headers


if __name__ == "__main__":
    unittest.main()
