import { supabase } from "./supabaseClient";
import {
  isContactExchange,
  isRevealedContact,
  type ContactExchange,
  type RevealedContact,
} from "./contactExchangeContracts";

const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

export class ContactExchangeApiError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code.replace(/_/g, " "));
    this.name = "ContactExchangeApiError";
  }
}

export const fetchContactExchange = (engagementId: string) =>
  request(
    `/engagements/${encodeURIComponent(engagementId)}/contact-exchange`,
    isContactExchange,
  );

export const shareContact = (
  engagementId: string,
  payload: Record<string, unknown>,
) =>
  request(
    `/engagements/${encodeURIComponent(engagementId)}/contact-shares`,
    isContactExchange,
    "POST",
    payload,
  );

export const revokeContact = (
  shareId: string,
  payload: Record<string, unknown>,
) =>
  request(
    `/contact-shares/${encodeURIComponent(shareId)}/revoke`,
    isContactExchange,
    "POST",
    payload,
  );

export const revealContact = (
  shareId: string,
  payload: Record<string, unknown>,
) =>
  request(
    `/contact-shares/${encodeURIComponent(shareId)}/reveal`,
    isRevealedContact,
    "POST",
    payload,
  );

export const blockEngagementContact = (
  engagementId: string,
  payload: Record<string, unknown>,
) =>
  request(
    `/engagements/${encodeURIComponent(engagementId)}/contact-block`,
    isContactExchange,
    "POST",
    payload,
  );

export const reportEngagementContact = (
  engagementId: string,
  payload: Record<string, unknown>,
) =>
  request(
    `/engagements/${encodeURIComponent(engagementId)}/contact-reports`,
    isReportResult,
    "POST",
    payload,
  );

async function request<T>(
  path: string,
  guard: (value: unknown) => value is T,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new ContactExchangeApiError("authentication_required", 401);
  }
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code =
      isRecord(data) && typeof data.detail === "string"
        ? data.detail
        : "contact_exchange_unavailable";
    throw new ContactExchangeApiError(code, response.status);
  }
  if (!guard(data)) {
    throw new Error("The contact exchange API returned an unexpected response.");
  }
  return data;
}

function isReportResult(
  value: unknown,
): value is { engagement_id: string; report_submitted: boolean } {
  return (
    isRecord(value) &&
    typeof value.engagement_id === "string" &&
    value.report_submitted === true
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export type { ContactExchange, RevealedContact };
