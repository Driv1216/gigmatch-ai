import test from "node:test";
import assert from "node:assert/strict";

import {
  containsForbiddenContactInternals,
  isContactExchange,
  isRevealedContact,
} from "../src/lib/contactExchangeContracts.ts";
import { deriveContactExchangeViewState } from "../src/lib/contactExchangeView.ts";

function exchange(overrides = {}) {
  return {
    engagement_id: "engagement-1",
    viewer_role: "client",
    engagement_status: "confirmed",
    exchange_available: true,
    blocked: false,
    blocked_by_viewer: false,
    blocked_by_other: false,
    available_methods: [{
      method: "verified_email",
      available: true,
      ownership_verification: "verified",
      share_action_token: "t".repeat(64),
    }],
    shared_by_you: [],
    shared_with_you: [],
    block_action_token: "b".repeat(64),
    report_action_token: "r".repeat(64),
    warnings: ["Safety"],
    ...overrides,
  };
}

function maskedShare(overrides = {}) {
  return {
    share_id: "share-1",
    direction: "shared_with_you",
    method: "verified_email",
    masked_value: "c•••••@example.test",
    consent_status: "active",
    source_status: "current",
    state_version: 1,
    ownership_verification: "verified",
    created_at: "2026-07-26T10:00:00+00:00",
    actions: [{ action: "reveal", action_token: "t".repeat(64) }],
    ...overrides,
  };
}

test("ordinary contact contract accepts masks and rejects nested sensitive internals", () => {
  const safe = exchange({ shared_with_you: [maskedShare()] });
  assert.equal(isContactExchange(safe), true);
  for (const [key, value] of [
    ["value", "client@example.test"],
    ["ciphertext", "encrypted"],
    ["nonce", "nonce"],
    ["key_id", "contact-v1"],
    ["source_digest", "digest"],
    ["canonical_value_fingerprint", "fingerprint"],
  ]) {
    const unsafe = exchange({
      shared_with_you: [{ ...maskedShare(), nested: { [key]: value } }],
    });
    assert.equal(containsForbiddenContactInternals(unsafe), true);
    assert.equal(isContactExchange(unsafe), false);
  }
});

test("view states cover loading, error, unavailable, blocked, empty, and ready", () => {
  assert.equal(deriveContactExchangeViewState(null, null), "loading");
  assert.equal(deriveContactExchangeViewState(null, "failed"), "error");
  assert.equal(
    deriveContactExchangeViewState(
      exchange({ exchange_available: false, engagement_status: "cancelled" }),
      null,
    ),
    "unavailable",
  );
  assert.equal(
    deriveContactExchangeViewState(
      exchange({ blocked: true, exchange_available: false }),
      null,
    ),
    "blocked",
  );
  assert.equal(deriveContactExchangeViewState(exchange(), null), "empty");
  assert.equal(
    deriveContactExchangeViewState(
      exchange({ shared_with_you: [maskedShare()] }),
      null,
    ),
    "ready",
  );
});

test("revoked and invalidated shares remain safe masked history", () => {
  const historical = exchange({
    shared_by_you: [
      maskedShare({
        direction: "shared_by_you",
        consent_status: "revoked",
        source_status: "invalidated",
        revoked_at: "2026-07-26T11:00:00+00:00",
        invalidated_at: "2026-07-26T10:30:00+00:00",
        actions: [],
      }),
    ],
  });
  assert.equal(isContactExchange(historical), true);
  assert.equal(historical.shared_by_you[0].masked_value.includes("@"), true);
});

test("reveal contract permits only the ephemeral public disclosure shape", () => {
  const reveal = {
    share_id: "share-1",
    method: "whatsapp_phone",
    value: "+15551234567",
    ownership_verification: "verified",
    whatsapp_availability: "self_declared",
    authorised_at: "2026-07-26T10:00:00+00:00",
    audit_reused: false,
  };
  assert.equal(isRevealedContact(reveal), true);
  assert.equal(isRevealedContact({ ...reveal, ciphertext: "secret" }), false);
  assert.equal(isRevealedContact({ ...reveal, audit_id: "internal" }), false);
});
