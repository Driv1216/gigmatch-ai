import { supabase } from "./supabaseClient";
import {
  containsForbiddenContactInternals,
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
) => requestReveal(shareId, payload);

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
  const accessToken = await contactAccessToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
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

async function requestReveal(
  shareId: string,
  payload: Record<string, unknown>,
): Promise<RevealedContact> {
  const accessToken = await contactAccessToken();
  const response = await fetch(
    `${apiBaseUrl}/contact-shares/${encodeURIComponent(shareId)}/reveal`,
    {
      method: "POST",
      cache: "no-store",
      credentials: "omit",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
      body: JSON.stringify(payload),
    },
  );
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw contactApiError(data, response.status);
  }
  if (!isRevealedContact(data)) {
    throw new Error("The reveal response was rejected by the secure contact guard.");
  }
  return data;
}

async function contactAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new ContactExchangeApiError("authentication_required", 401);
  }
  return session.access_token;
}

function contactApiError(data: unknown, status: number): ContactExchangeApiError {
  const code =
    isRecord(data) && typeof data.detail === "string"
      ? data.detail
      : "contact_exchange_unavailable";
  return new ContactExchangeApiError(code, status);
}

function isReportResult(
  value: unknown,
): value is { engagement_id: string; report_submitted: boolean } {
  return (
    isRecord(value) &&
    !containsForbiddenContactInternals(value) &&
    Object.keys(value).every((key) =>
      key === "engagement_id" || key === "report_submitted"
    ) &&
    typeof value.engagement_id === "string" &&
    value.report_submitted === true
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export type { ContactExchange, RevealedContact };
