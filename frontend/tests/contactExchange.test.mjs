import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  contactReportCategories,
  containsForbiddenContactInternals,
  isContactExchange,
  isRevealedContact,
} from "../src/lib/contactExchangeContracts.ts";
import {
  contactErrorMessage,
  contactMethodLabel,
  ContactOperationRegistry,
  contactSourceLines,
  contactStatusPresentation,
  deriveContactExchangeViewState,
  isControlledContactConflict,
} from "../src/lib/contactExchangeView.ts";

const componentSource = read("../src/components/SecureContactExchange.tsx");
const apiSource = read("../src/lib/contactExchange.ts");
const workspaceSource = read("../src/pages/EngagementWorkspacePage.tsx");
const stylesSource = read("../src/styles.css");

const methodAvailability = [
  {
    method: "verified_email",
    available: true,
    ownership_verification: "verified",
    share_action_token: "e".repeat(64),
  },
  {
    method: "verified_phone",
    available: true,
    ownership_verification: "verified",
    share_action_token: "p".repeat(64),
  },
  {
    method: "whatsapp_phone",
    available: true,
    ownership_verification: "verified",
    whatsapp_availability: "self_declared",
    share_action_token: "w".repeat(64),
  },
  {
    method: "meeting_link",
    available: true,
    ownership_verification: "user_provided",
    share_action_token: "m".repeat(64),
  },
  {
    method: "professional_profile",
    available: true,
    ownership_verification: "user_provided",
    share_action_token: "r".repeat(64),
  },
];

function exchange(overrides = {}) {
  return {
    engagement_id: "engagement-1",
    viewer_role: "client",
    engagement_status: "confirmed",
    exchange_available: true,
    blocked: false,
    blocked_by_viewer: false,
    blocked_by_other: false,
    available_methods: methodAvailability,
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

test("live canonical contact methods preserve whatsapp_phone and five independent methods", () => {
  assert.equal(isContactExchange(exchange()), true);
  assert.deepEqual(
    methodAvailability.map((item) => item.method),
    [
      "verified_email",
      "verified_phone",
      "whatsapp_phone",
      "meeting_link",
      "professional_profile",
    ],
  );
  assert.equal(contactMethodLabel("whatsapp_phone"), "WhatsApp");
  assert.equal(
    isContactExchange(
      exchange({
        available_methods: methodAvailability.map((item) =>
          item.method === "whatsapp_phone" ? { ...item, method: "whatsapp" } : item,
        ),
      }),
    ),
    false,
  );
});

test("ordinary contract preserves direction and rejects duplicate or misfiled share history", () => {
  const outgoing = maskedShare({
    share_id: "outgoing",
    direction: "shared_by_you",
  });
  const incoming = maskedShare({ share_id: "incoming" });
  assert.equal(
    isContactExchange(exchange({ shared_by_you: [outgoing], shared_with_you: [incoming] })),
    true,
  );
  assert.equal(isContactExchange(exchange({ shared_by_you: [incoming] })), false);
  assert.equal(
    isContactExchange(
      exchange({
        shared_by_you: [outgoing],
        shared_with_you: [{ ...incoming, share_id: "outgoing" }],
      }),
    ),
    false,
  );
});

test("phone ownership and WhatsApp availability remain separate source claims", () => {
  assert.deepEqual(contactSourceLines("verified_email", "verified"), [
    "Supabase Auth email · Account-sourced",
  ]);
  assert.deepEqual(contactSourceLines("verified_phone", "verified"), [
    "Supabase Auth phone · Confirmed",
  ]);
  assert.deepEqual(
    contactSourceLines("whatsapp_phone", "verified", "self_declared"),
    ["Phone ownership · Verified", "WhatsApp availability · Self-declared"],
  );
  assert.doesNotMatch(
    contactSourceLines("whatsapp_phone", "verified", "self_declared").join(" "),
    /WhatsApp.*Verified/i,
  );
  assert.equal(
    isContactExchange(
      exchange({
        available_methods: methodAvailability.map((item) =>
          item.method === "whatsapp_phone"
            ? { ...item, whatsapp_availability: undefined }
            : item,
        ),
      }),
    ),
    false,
  );
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
      exchange({
        blocked: true,
        blocked_by_viewer: true,
        exchange_available: false,
      }),
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

test("consent and source status remain separate current, invalidated, and revoked authorities", () => {
  const current = contactStatusPresentation(maskedShare());
  const invalidated = contactStatusPresentation(
    maskedShare({ source_status: "invalidated" }),
  );
  const revoked = contactStatusPresentation(
    maskedShare({ consent_status: "revoked", source_status: "current" }),
  );
  assert.deepEqual([current.consent, current.source], ["Consent active", "Source current"]);
  assert.deepEqual([invalidated.consent, invalidated.source], [
    "Consent active",
    "Source invalidated",
  ]);
  assert.deepEqual([revoked.consent, revoked.source], [
    "Consent revoked",
    "Source current",
  ]);
  assert.match(revoked.consequence, /cannot be restored.*new record/i);
  assert.match(invalidated.consequence, /historical.*can no longer be revealed/i);
});

test("ordinary contact contract accepts server masks and rejects recursive sensitive internals", () => {
  const safe = exchange({ shared_with_you: [maskedShare()] });
  assert.equal(isContactExchange(safe), true);
  for (const [key, value] of [
    ["value", "client@example.test"],
    ["contact_value", "+15551234567"],
    ["plaintext", "secret"],
    ["ciphertext", "encrypted"],
    ["nonce", "nonce"],
    ["key_id", "contact-v1"],
    ["source_digest", "digest"],
    ["fingerprint", "fingerprint"],
    ["private_key", "key"],
    ["audit", { viewed: true }],
    ["recipient_user_id", "internal"],
    ["credentials", "secret"],
  ]) {
    const unsafe = exchange({
      shared_with_you: [{ ...maskedShare(), nested: { [key]: value } }],
    });
    assert.equal(containsForbiddenContactInternals(unsafe), true, key);
    assert.equal(isContactExchange(unsafe), false, key);
  }
  assert.match(componentSource, /<strong>\{share\.masked_value\}<\/strong>/);
  assert.doesNotMatch(componentSource, /masked_value\s*=|maskContact|createMask/);
});

test("reveal contract permits only the narrow ephemeral disclosure shape", () => {
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
  assert.equal(isRevealedContact({ ...reveal, share_id: "" }), false);
});

test("ordinary operation registry reuses transport retries and rotates on settlement or safe input change", () => {
  let next = 0;
  const registry = new ContactOperationRegistry(() => `request-${++next}`);
  const first = registry.get("share_auth", "engagement-1", "verified_email");
  assert.equal(registry.get("share_auth", "engagement-1", "verified_email"), first);
  assert.notEqual(registry.get("share_auth", "engagement-1", "verified_phone"), first);
  registry.settle("share_auth", "engagement-1", "verified_email");
  assert.notEqual(registry.get("share_auth", "engagement-1", "verified_email"), first);
  registry.reset();
  assert.equal(next, 3);
});

test("controlled errors are safe, known, and never echo arbitrary plaintext", () => {
  const conflict = Object.assign(new Error("https://private.example/room"), {
    name: "ContactExchangeApiError",
    code: "stale_contact_action",
    status: 409,
  });
  assert.equal(isControlledContactConflict(conflict), true);
  assert.match(contactErrorMessage(conflict), /authority changed/i);
  assert.doesNotMatch(contactErrorMessage(conflict), /private\.example/);
  assert.equal(
    contactErrorMessage(new Error("jane@example.test")),
    "The contact operation could not be completed safely.",
  );
});

test("Auth-backed sharing sends no browser value and method consents remain independent", () => {
  const authShare = slice(componentSource, "async function shareAuthMethod", "async function shareUrlMethod");
  assert.match(authShare, /method,/);
  assert.match(authShare, /share_action_token: actionToken/);
  assert.doesNotMatch(authShare, /value:/);
  assert.match(componentSource, /Sharing one method never shares another/);
  assert.match(componentSource, /safeSignature: method/);
});

test("URL drafts and same-attempt IDs stay only in component action state", () => {
  const urlShare = slice(componentSource, "async function shareUrlMethod", "async function revealShare");
  assert.match(urlShare, /prior\?\.method === method && prior\.value === value/);
  assert.match(urlShare, /crypto\.randomUUID\(\)/);
  assert.match(urlShare, /value: attempt\.value/);
  assert.doesNotMatch(urlShare, /operationsRef\.current\.get/);
  assert.doesNotMatch(urlShare, /(hash|digest|fingerprint)/i);
  assert.match(componentSource, /setUrlValues\(\(current\) => \(\{ \.\.\.current, \[method\]: "" \}\)\)/);
  assert.match(componentSource, /Cancel Draft/);
  assert.match(componentSource, /setUrlValues\(\{\}\)/);
  assert.match(componentSource, /urlShareAttemptRef\.current = null/);
});

test("URL content never triggers preview, navigation, clipboard, or persistence", () => {
  assert.doesNotMatch(
    componentSource,
    /(localStorage|sessionStorage|indexedDB|document\.cookie|navigator\.clipboard|window\.location|window\.open|<iframe|new Image|prefetch|preload|preconnect|analytics|toast\()/,
  );
  assert.doesNotMatch(componentSource, /<a\b|href=/);
  assert.match(componentSource, /does not fetch or preview it/i);
  assert.doesNotMatch(slice(componentSource, "async function shareUrlMethod", "async function revealShare"), /fetch\(/);
});

test("reveal always calls the backend with current token and retry ID without local result replay", () => {
  const reveal = slice(componentSource, "async function revealShare", "function hideReveal");
  assert.match(reveal, /share\.actions\.find\(\(item\) => item\.action === "reveal"\)/);
  assert.match(reveal, /revealAttemptsRef\.current\.get\(share\.share_id\)/);
  assert.match(reveal, /await revealContact\(share\.share_id/);
  assert.match(reveal, /reveal_action_token: action\.action_token/);
  assert.match(reveal, /request_id: requestId/);
  assert.doesNotMatch(reveal, /return revealed|audit_reused/);
  assert.match(apiSource, /async function requestReveal/);
  assert.doesNotMatch(apiSource, /queryClient|useSWR|ReactQuery/);
});

test("reveal has a dedicated no-store path and no optimistic plaintext", () => {
  const revealApi = slice(apiSource, "async function requestReveal", "async function contactAccessToken");
  assert.match(revealApi, /cache: "no-store"/);
  assert.match(revealApi, /credentials: "omit"/);
  assert.match(revealApi, /"Cache-Control": "no-store"/);
  assert.match(revealApi, /Pragma: "no-cache"/);
  assert.match(revealApi, /isRevealedContact/);
  const beforeAwait = slice(
    slice(componentSource, "async function revealShare", "function hideReveal"),
    "async function revealShare",
    "const result = await revealContact",
  );
  assert.doesNotMatch(beforeAwait, /setRevealed\(/);
});

test("hide and every authority/error boundary remove revealed plaintext from rendered state", () => {
  assert.match(componentSource, /const clearRevealed = useCallback\(\(\) => setRevealed\(\{\}\)/);
  assert.match(slice(componentSource, "const load = useCallback", "useEffect"), /clearRevealed\(\)/);
  assert.match(slice(componentSource, "async function revealShare", "function hideReveal"), /clearRevealed\(\)/);
  assert.match(slice(componentSource, "function hideReveal", "function cancelUrlDraft"), /delete next\[shareId\]/);
  assert.match(slice(componentSource, "return \(\) =>", "}, \[clearEphemeralAttempts"), /clearRevealed\(\)/);
  assert.match(componentSource, /revealed \? \([\s\S]*<output[\s\S]*\) : \([\s\S]*share\.masked_value/);
  assert.doesNotMatch(stylesSource, /contact-share-value[^}]*visibility\s*:\s*hidden/);
});

test("accessible reveal feedback announces state but never broadcasts full contact value", () => {
  assert.match(componentSource, /aria-live="polite"/);
  assert.match(componentSource, /setAnnouncement\("Contact revealed\."\)/);
  assert.match(componentSource, /aria-label=\{`\$\{contactMethodLabel\(share\.method\)\} revealed contact value`\}/);
  const announcement = slice(componentSource, "contact-local-announcement", "{error ?");
  assert.doesNotMatch(announcement, /revealed\.value|masked_value/);
});

test("revocation remains historical and reshare is never restore semantics", () => {
  assert.match(componentSource, /revoked row remains historical and cannot be restored or reactivated/i);
  assert.match(componentSource, /later reshare creates a new record/i);
  assert.match(componentSource, /cannot erase information the recipient may already have retained/i);
  assert.match(componentSource, /New record after prior history/);
  assert.doesNotMatch(componentSource, />\s*(Undo revoke|Restore share|Reactivate)\s*</i);
  assert.doesNotMatch(componentSource, /setExchange\([^)]*consent_status/);
});

test("block is permanent and engagement-scoped while report remains a separate private operation", () => {
  assert.match(componentSource, /permanent for this milestone and scoped only to this engagement/i);
  assert.match(componentSource, /New sharing and reveals stop in both directions/i);
  assert.match(componentSource, /required completion and cancellation actions remain available/i);
  assert.doesNotMatch(componentSource, /unblock/i);
  assert.match(componentSource, /Submit a private report/);
  assert.match(componentSource, /Reporting does not change[\s\S]*engagement, applications, selection, or ranking/);
  assert.doesNotMatch(componentSource, /Report\s*&\s*Block|Report and Block/i);
  assert.deepEqual(contactReportCategories, [
    "harassment",
    "spam",
    "fraudulent_request",
    "identity_misrepresentation",
    "abusive_communication",
    "suspicious_payment_request",
    "request_for_credentials",
    "other",
  ]);
  assert.match(componentSource, /reportCategory === "other" && !reportDetail\.trim\(\)/);
});

test("safety copy states the exact platform and off-platform boundaries", () => {
  assert.match(componentSource, /GigMatch controls consent and reveal inside Secure Contact Exchange/);
  assert.match(componentSource, /Communication after reveal may happen outside GigMatch/);
  assert.match(componentSource, /does not process or guarantee off-platform payments/);
  assert.match(componentSource, /passwords, OTPs, private keys or sensitive payment credentials/);
  assert.doesNotMatch(componentSource, /identity verified|WhatsApp verified|monitored off-platform/i);
});

test("Stage 9 remains in the final stable workspace slot and outside lifecycle timeline", () => {
  assert.match(
    workspaceSource,
    /engagement authority[\s\S]*immutable accepted terms|Accepted authority/,
  );
  assert.match(workspaceSource, /engagement-lifecycle-board[\s\S]*engagement-timeline-board[\s\S]*engagement-contact-slot/);
  assert.match(workspaceSource, /SecureContactExchange key=\{`\$\{engagementId\}:\$\{contactAuthorityKey\}`\}/);
  assert.match(workspaceSource, /contact activity, and read\/unread claims do not enter this timeline/i);
  assert.match(workspaceSource, /Contact blocking never removes required engagement actions/);
  assert.doesNotMatch(workspaceSource, /contact_value|revealed|shared_by_you|shared_with_you/);
});

test("Stage 9 uses native consequence dialog and responsive recomposition", () => {
  assert.match(componentSource, /<dialog/);
  assert.doesNotMatch(componentSource, /window\.(confirm|prompt)/);
  assert.match(stylesSource, /Stage 9 — isolated Secure Contact Exchange presentation/);
  assert.match(stylesSource, /@media \(max-width: 1120px\)[\s\S]*contact-direction-grid/);
  assert.match(stylesSource, /@media \(max-width: 720px\)[\s\S]*contact-method-row/);
  assert.match(stylesSource, /@media \(max-width: 480px\)[\s\S]*contact-share-row/);
  assert.match(stylesSource, /prefers-reduced-motion: reduce[\s\S]*stage-nine-contact-exchange/);
});

test("contact sources expose no broad sensitive sinks or token rendering", () => {
  const source = `${componentSource}\n${apiSource}`;
  for (const sink of [
    "localStorage",
    "sessionStorage",
    "indexedDB",
    "document.cookie",
    "navigator.clipboard",
    "window.location",
    "window.open",
    "new Image",
    "<iframe",
    "toast(",
    "analytics",
  ]) {
    assert.equal(source.includes(sink), false, sink);
  }
  assert.doesNotMatch(componentSource, />\s*\{[^}]*action_token[^}]*\}\s*</);
  assert.doesNotMatch(componentSource, /data-[\w-]+=\{.*(value|token)/);
  assert.doesNotMatch(componentSource, /console\./);
  assert.match(
    slice(apiSource, "function isReportResult", "function isRecord"),
    /containsForbiddenContactInternals/,
  );
});

function read(relative) {
  return readFileSync(new URL(relative, import.meta.url), "utf8");
}

function slice(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `Missing start marker: ${start}`);
  assert.notEqual(endIndex, -1, `Missing end marker: ${end}`);
  return source.slice(startIndex, endIndex);
}
