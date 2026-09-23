import type {
  ContactExchange,
  ContactMethod,
  ContactShare,
} from "./contactExchangeContracts";

export type ContactExchangeViewState =
  | "loading"
  | "error"
  | "blocked"
  | "unavailable"
  | "empty"
  | "ready";

export type ContactOperation = "share_auth" | "revoke" | "block";

export class ContactOperationRegistry {
  private readonly requests = new Map<string, string>();
  private readonly createRequestId: () => string;

  constructor(createRequestId: () => string) {
    this.createRequestId = createRequestId;
  }

  get(operation: ContactOperation, subjectId: string, safeSignature = ""): string {
    const key = `${operation}:${subjectId}:${safeSignature}`;
    const existing = this.requests.get(key);
    if (existing) return existing;
    const requestId = this.createRequestId();
    this.requests.set(key, requestId);
    return requestId;
  }

  settle(operation: ContactOperation, subjectId: string, safeSignature = ""): void {
    this.requests.delete(`${operation}:${subjectId}:${safeSignature}`);
  }

  reset(): void {
    this.requests.clear();
  }
}

export function deriveContactExchangeViewState(
  exchange: ContactExchange | null,
  error: string | null,
): ContactExchangeViewState {
  if (error && exchange === null) return "error";
  if (exchange === null) return "loading";
  if (exchange.blocked) return "blocked";
  if (!exchange.exchange_available) return "unavailable";
  if (
    exchange.shared_by_you.length === 0 &&
    exchange.shared_with_you.length === 0
  ) {
    return "empty";
  }
  return "ready";
}

export function contactMethodLabel(method: ContactMethod): string {
  const labels: Record<ContactMethod, string> = {
    verified_email: "Account email",
    verified_phone: "Verified phone",
    whatsapp_phone: "WhatsApp",
    meeting_link: "Meeting link",
    professional_profile: "Professional profile",
  };
  return labels[method];
}

export function contactSourceLines(
  method: ContactMethod,
  ownership: ContactShare["ownership_verification"],
  whatsapp?: ContactShare["whatsapp_availability"],
): string[] {
  if (method === "whatsapp_phone") {
    return [
      "Phone ownership · Verified",
      whatsapp === "self_declared"
        ? "WhatsApp availability · Self-declared"
        : "WhatsApp availability · Not declared",
    ];
  }
  if (method === "verified_email") {
    return ["Supabase Auth email · Account-sourced"];
  }
  if (method === "verified_phone") {
    return ["Supabase Auth phone · Confirmed"];
  }
  return [
    ownership === "user_provided"
      ? "Participant-provided URL · Not verified by GigMatch"
      : "Source authority unavailable",
  ];
}

export function contactStatusPresentation(share: ContactShare): {
  consent: string;
  source: string;
  consequence: string;
  tone: "current" | "invalidated" | "revoked";
} {
  const consent = share.consent_status === "active" ? "Consent active" : "Consent revoked";
  const source = share.source_status === "current" ? "Source current" : "Source invalidated";
  if (share.consent_status === "revoked") {
    return {
      consent,
      source,
      consequence: "Historical share only. It cannot be restored; a later share is a new record.",
      tone: "revoked",
    };
  }
  if (share.source_status === "invalidated") {
    return {
      consent,
      source,
      consequence: "Consent remains historical, but this source can no longer be revealed.",
      tone: "invalidated",
    };
  }
  return {
    consent,
    source,
    consequence: "The server may authorize the actions projected for this exact record.",
    tone: "current",
  };
}

export function contactErrorMessage(value: unknown): string {
  if (isContactApiError(value)) {
    const messages: Record<string, string> = {
      authentication_required: "Sign in again to review contact authority.",
      contact_exchange_not_found: "This contact exchange is unavailable.",
      contact_exchange_not_allowed: "You are not authorized to use this contact exchange.",
      contact_source_invalidated:
        "The verified source changed. The old share remains historical and cannot be revealed.",
      contact_exchange_blocked:
        "Contact exchange is blocked for this engagement.",
      contact_exchange_unavailable:
        "New sharing and reveal are unavailable for this engagement.",
      contact_share_not_active: "This contact share is no longer active.",
      contact_already_shared: "This method already has an active share.",
      verified_contact_unavailable:
        "A confirmed Auth source is not currently available for this method.",
      stale_contact_action:
        "Contact authority changed. Review the refreshed state before trying again.",
      idempotency_conflict:
        "This operation no longer matches current authority. Review the refreshed state.",
      contact_reveal_rate_limited:
        "Reveal limit reached. Wait before making another deliberate reveal request.",
      contact_reveal_not_allowed:
        "The server did not authorize this reveal. No contact value was released.",
      invalid_report_detail:
        "Review the private report detail and submit it again.",
      contact_share_not_allowed:
        "The server did not authorize this contact share.",
    };
    return messages[value.code] ?? "The contact operation could not be completed safely.";
  }
  return "The contact operation could not be completed safely.";
}

export function isControlledContactConflict(value: unknown): boolean {
  return isContactApiError(value) && value.status === 409;
}

export function humanizeContactMetadata(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isContactApiError(
  value: unknown,
): value is Error & { code: string; status: number } {
  return (
    value instanceof Error &&
    value.name === "ContactExchangeApiError" &&
    typeof (value as { code?: unknown }).code === "string" &&
    typeof (value as { status?: unknown }).status === "number"
  );
}
