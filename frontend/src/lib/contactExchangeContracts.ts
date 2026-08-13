export type ContactMethod =
  | "verified_email"
  | "verified_phone"
  | "whatsapp_phone"
  | "meeting_link"
  | "professional_profile";

export const contactReportCategories = [
  "harassment",
  "spam",
  "fraudulent_request",
  "identity_misrepresentation",
  "abusive_communication",
  "suspicious_payment_request",
  "request_for_credentials",
  "other",
] as const;

export type ContactReportCategory = typeof contactReportCategories[number];

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
  "contact_value",
  "plaintext",
  "email",
  "phone",
  "url",
  "ciphertext",
  "nonce",
  "key_id",
  "encryption_key",
  "private_key",
  "source_digest",
  "digest",
  "canonical_value_fingerprint",
  "fingerprint",
  "material_kind",
  "material",
  "sharer_user_id",
  "recipient_user_id",
  "participant_user_id",
  "audit_id",
  "audit",
  "credentials",
  "secret",
  "secrets",
  "access_token",
]);

export function isContactExchange(value: unknown): value is ContactExchange {
  if (!isRecord(value) || containsForbiddenContactInternals(value)) return false;
  const availableMethods = Array.isArray(value.available_methods)
    ? value.available_methods
    : [];
  const sharedByYou = Array.isArray(value.shared_by_you)
    ? value.shared_by_you
    : [];
  const sharedWithYou = Array.isArray(value.shared_with_you)
    ? value.shared_with_you
    : [];
  return (
    typeof value.engagement_id === "string" &&
    (value.viewer_role === "client" || value.viewer_role === "freelancer") &&
    typeof value.engagement_status === "string" &&
    typeof value.exchange_available === "boolean" &&
    typeof value.blocked === "boolean" &&
    typeof value.blocked_by_viewer === "boolean" &&
    typeof value.blocked_by_other === "boolean" &&
    availableMethods.length === METHODS.size &&
    availableMethods.every(isMethodAvailability) &&
    new Set(availableMethods.map((item) => item.method)).size === METHODS.size &&
    sharedByYou.every(
      (item) => isContactShare(item) && item.direction === "shared_by_you",
    ) &&
    sharedWithYou.every(
      (item) => isContactShare(item) && item.direction === "shared_with_you",
    ) &&
    new Set([...sharedByYou, ...sharedWithYou].map((item) => item.share_id)).size ===
      sharedByYou.length + sharedWithYou.length &&
    value.blocked === (value.blocked_by_viewer || value.blocked_by_other) &&
    (value.block_action_token === undefined || isOpaqueToken(value.block_action_token)) &&
    isOpaqueToken(value.report_action_token) &&
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
    value.share_id.length > 0 &&
    isMethod(value.method) &&
    typeof value.value === "string" &&
    value.value.length > 0 &&
    (value.ownership_verification === "verified" ||
      value.ownership_verification === "user_provided") &&
    (value.whatsapp_availability === undefined ||
      value.whatsapp_availability === "self_declared") &&
    (value.method === "whatsapp_phone" ?
      value.ownership_verification === "verified" &&
        value.whatsapp_availability === "self_declared" :
      value.whatsapp_availability === undefined) &&
    (["verified_email", "verified_phone", "whatsapp_phone"].includes(
      value.method as string,
    )
      ? value.ownership_verification === "verified"
      : value.ownership_verification === "user_provided") &&
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
    (value.unavailable_reason === undefined ||
      typeof value.unavailable_reason === "string") &&
    (value.whatsapp_availability === undefined ||
      value.whatsapp_availability === "self_declared") &&
    (value.method === "whatsapp_phone" ?
      value.ownership_verification === "verified" &&
        value.whatsapp_availability === "self_declared" :
      value.whatsapp_availability === undefined) &&
    (["verified_email", "verified_phone", "whatsapp_phone"].includes(
      value.method as string,
    )
      ? value.ownership_verification === "verified"
      : value.ownership_verification === "user_provided") &&
    (value.share_action_token === undefined || isOpaqueToken(value.share_action_token))
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
    value.masked_value.length > 0 &&
    (value.consent_status === "active" || value.consent_status === "revoked") &&
    (value.source_status === "current" || value.source_status === "invalidated") &&
    typeof value.state_version === "number" &&
    (value.ownership_verification === "verified" ||
      value.ownership_verification === "user_provided") &&
    (value.whatsapp_availability === undefined ||
      value.whatsapp_availability === "self_declared") &&
    (value.method === "whatsapp_phone" ?
      value.ownership_verification === "verified" &&
        value.whatsapp_availability === "self_declared" :
      value.whatsapp_availability === undefined) &&
    (["verified_email", "verified_phone", "whatsapp_phone"].includes(
      value.method as string,
    )
      ? value.ownership_verification === "verified"
      : value.ownership_verification === "user_provided") &&
    (value.previous_share_id === undefined ||
      typeof value.previous_share_id === "string") &&
    (value.revoked_at === undefined || typeof value.revoked_at === "string") &&
    (value.invalidated_at === undefined ||
      typeof value.invalidated_at === "string") &&
    typeof value.created_at === "string" &&
    Array.isArray(value.actions) &&
    value.actions.every(
      (action) =>
        isRecord(action) &&
        (action.action === "reveal" || action.action === "revoke") &&
        isOpaqueToken(action.action_token),
    )
  );
}

function isMethod(value: unknown): value is ContactMethod {
  return METHODS.has(value as ContactMethod);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isOpaqueToken(value: unknown): value is string {
  return typeof value === "string" && value.length >= 16 && value.length <= 128;
}
