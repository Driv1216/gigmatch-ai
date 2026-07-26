import { supabase } from "./supabaseClient";
import {
  isApplicantDetail,
  isApplicantListEnvelope,
  isApplicantVersionEnvelope,
  type ApplicantDetail,
  type ApplicantListEnvelope,
  type ApplicantStatus,
  type ApplicantVersionEnvelope,
  type ApplicantView,
} from "./applicantReviewContracts";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

export class ApplicantReviewApiError extends Error {
  constructor(public code: string, public status: number) {
    super(code.replace(/_/g, " "));
    this.name = "ApplicantReviewApiError";
  }
}

export function fetchApplicants(
  gigId: string,
  options: { view: ApplicantView; status: ApplicantStatus; page: number; pageSize?: number },
): Promise<ApplicantListEnvelope> {
  const query = new URLSearchParams({
    view: options.view,
    status: options.status,
    page: String(options.page),
    page_size: String(options.pageSize ?? 20),
  });
  return request(`/gigs/${encodeURIComponent(gigId)}/applicants?${query}`, isApplicantListEnvelope);
}

export function fetchApplicant(gigId: string, applicationId: string): Promise<ApplicantDetail> {
  return request(
    `/gigs/${encodeURIComponent(gigId)}/applicants/${encodeURIComponent(applicationId)}`,
    isApplicantDetail,
  );
}

export function fetchApplicantVersions(
  gigId: string,
  applicationId: string,
  page = 1,
): Promise<ApplicantVersionEnvelope> {
  return request(
    `/gigs/${encodeURIComponent(gigId)}/applicants/${encodeURIComponent(applicationId)}/versions?page=${page}&page_size=10`,
    isApplicantVersionEnvelope,
  );
}

export function setApplicantShortlist(
  applicationId: string,
  shortlisted: boolean,
  shortlistActionToken: string,
): Promise<ApplicantDetail> {
  return request(
    `/applications/${encodeURIComponent(applicationId)}/review/shortlist`,
    isApplicantDetail,
    "POST",
    { shortlisted, shortlist_action_token: shortlistActionToken },
  );
}

export function advanceApplicant(applicationId: string, token: string): Promise<ApplicantDetail> {
  return reviewDecision(applicationId, "advance", token);
}

export function returnApplicantToReview(applicationId: string, token: string): Promise<ApplicantDetail> {
  return reviewDecision(applicationId, "return", token);
}

export function markApplicantNotSelected(
  applicationId: string,
  payload: Record<string, unknown>,
): Promise<ApplicantDetail> {
  return request(
    `/applications/${encodeURIComponent(applicationId)}/review/not-selected`,
    isApplicantDetail,
    "POST",
    payload,
  );
}

export function reopenApplicant(
  applicationId: string,
  payload: Record<string, unknown>,
): Promise<ApplicantDetail> {
  return request(
    `/applications/${encodeURIComponent(applicationId)}/review/reopen`,
    isApplicantDetail,
    "POST",
    payload,
  );
}

function reviewDecision(
  applicationId: string,
  action: "advance" | "return",
  token: string,
): Promise<ApplicantDetail> {
  return request(
    `/applications/${encodeURIComponent(applicationId)}/review/${action}`,
    isApplicantDetail,
    "POST",
    { review_decision_action_token: token },
  );
}

async function request<T>(
  path: string,
  guard: (value: unknown) => value is T,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new ApplicantReviewApiError("authentication_required", 401);
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new ApplicantReviewApiError(errorCode(data), response.status);
  if (!guard(data)) throw new Error("The applicant review API returned an unexpected response.");
  return data;
}

function errorCode(value: unknown): string {
  if (value && typeof value === "object" && !Array.isArray(value) &&
    "detail" in value && typeof value.detail === "string") return value.detail;
  return "applicant_review_service_unavailable";
}

export type {
  ApplicantDetail,
  ApplicantListEnvelope,
  ApplicantStatus,
  ApplicantVersionEnvelope,
  ApplicantView,
};
