export type ContactMethod =
  | "verified_email"
  | "verified_phone"
  | "whatsapp_phone"
  | "meeting_link"
  | "professional_profile";

export type ContactShareAction = {
  action: "reveal" | "revoke";
  action_token: string;
};

export type ContactShare = {
  share_id: string;
  direction: "shared_by_you" | "shared_with_you";
  method: ContactMethod;
  masked_value: string;
  consent_status: "active" | "revoked";
  source_status: "current" | "invalidated";
  state_version: number;
  ownership_verification: "verified" | "user_provided";
  whatsapp_availability?: "self_declared";
  previous_share_id?: string;
  created_at: string;
  revoked_at?: string;
  invalidated_at?: string;
  actions: ContactShareAction[];
};

export type ContactMethodAvailability = {
  method: ContactMethod;
  available: boolean;
  unavailable_reason?: string;
  ownership_verification: "verified" | "user_provided";
  whatsapp_availability?: "self_declared";
  share_action_token?: string;
};

export type ContactExchange = {
  engagement_id: string;
  viewer_role: "client" | "freelancer";
  engagement_status: string;
  exchange_available: boolean;
  blocked: boolean;
  blocked_by_viewer: boolean;
  blocked_by_other: boolean;
  available_methods: ContactMethodAvailability[];
  shared_by_you: ContactShare[];
  shared_with_you: ContactShare[];
  block_action_token?: string;
  report_action_token: string;
  warnings: string[];
};

export type RevealedContact = {
  share_id: string;
  method: ContactMethod;
  value: string;
  ownership_verification: "verified" | "user_provided";
  whatsapp_availability?: "self_declared";
  authorised_at: string;
  audit_reused: boolean;
};

const METHODS = new Set<ContactMethod>([
  "verified_email",
  "verified_phone",
  "whatsapp_phone",
  "meeting_link",
  "professional_profile",
]);
const FORBIDDEN_ORDINARY_KEYS = new Set([
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
]);

export function isContactExchange(value: unknown): value is ContactExchange {
  if (!isRecord(value) || containsForbiddenContactInternals(value)) return false;
  return (
    typeof value.engagement_id === "string" &&
    (value.viewer_role === "client" || value.viewer_role === "freelancer") &&
    typeof value.engagement_status === "string" &&
    typeof value.exchange_available === "boolean" &&
    typeof value.blocked === "boolean" &&
    typeof value.blocked_by_viewer === "boolean" &&
    typeof value.blocked_by_other === "boolean" &&
    Array.isArray(value.available_methods) &&
    value.available_methods.every(isMethodAvailability) &&
    Array.isArray(value.shared_by_you) &&
    value.shared_by_you.every(isContactShare) &&
    Array.isArray(value.shared_with_you) &&
    value.shared_with_you.every(isContactShare) &&
    typeof value.report_action_token === "string" &&
    Array.isArray(value.warnings) &&
    value.warnings.every((item) => typeof item === "string")
  );
}

export function isRevealedContact(value: unknown): value is RevealedContact {
  if (!isRecord(value)) return false;
  const allowed = new Set([
    "share_id",
    "method",
    "value",
    "ownership_verification",
    "whatsapp_availability",
    "authorised_at",
    "audit_reused",
  ]);
  if (Object.keys(value).some((key) => !allowed.has(key))) return false;
  return (
    typeof value.share_id === "string" &&
    isMethod(value.method) &&
    typeof value.value === "string" &&
    value.value.length > 0 &&
    (value.ownership_verification === "verified" ||
      value.ownership_verification === "user_provided") &&
    (value.whatsapp_availability === undefined ||
      value.whatsapp_availability === "self_declared") &&
    typeof value.authorised_at === "string" &&
    typeof value.audit_reused === "boolean"
  );
}

export function containsForbiddenContactInternals(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenContactInternals);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(
    ([key, item]) =>
      FORBIDDEN_ORDINARY_KEYS.has(key.toLowerCase()) ||
      containsForbiddenContactInternals(item),
  );
}

function isMethodAvailability(value: unknown): value is ContactMethodAvailability {
  return (
    isRecord(value) &&
    isMethod(value.method) &&
    typeof value.available === "boolean" &&
    (value.ownership_verification === "verified" ||
      value.ownership_verification === "user_provided") &&
    (value.share_action_token === undefined ||
      typeof value.share_action_token === "string")
  );
}

function isContactShare(value: unknown): value is ContactShare {
  return (
    isRecord(value) &&
    typeof value.share_id === "string" &&
    (value.direction === "shared_by_you" ||
      value.direction === "shared_with_you") &&
    isMethod(value.method) &&
    typeof value.masked_value === "string" &&
    (value.consent_status === "active" || value.consent_status === "revoked") &&
    (value.source_status === "current" || value.source_status === "invalidated") &&
    typeof value.state_version === "number" &&
    (value.ownership_verification === "verified" ||
      value.ownership_verification === "user_provided") &&
    typeof value.created_at === "string" &&
    Array.isArray(value.actions) &&
    value.actions.every(
      (action) =>
        isRecord(action) &&
        (action.action === "reveal" || action.action === "revoke") &&
        typeof action.action_token === "string",
    )
  );
}

function isMethod(value: unknown): value is ContactMethod {
  return METHODS.has(value as ContactMethod);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
