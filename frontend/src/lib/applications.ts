import { supabase } from "./supabaseClient";
import {
  isApplicationContext, isApplicationEnvelope, isApplicationResponse, isVersionEnvelope,
  type ApplicationContext, type ApplicationEnvelope, type ApplicationResponse, type VersionEnvelope,
} from "./applicationContracts";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

export class ApplicationApiError extends Error {
  constructor(public code: string, public status: number) {
    super(code.replace(/_/g, " "));
    this.name = "ApplicationApiError";
  }
}

export function fetchApplicationContext(gigId: string): Promise<ApplicationContext> {
  return request(`/gigs/${encodeURIComponent(gigId)}/application-context`, isApplicationContext);
}

export function submitApplication(gigId: string, payload: unknown): Promise<ApplicationResponse> {
  return request(`/gigs/${encodeURIComponent(gigId)}/applications`, isApplicationResponse, "POST", payload);
}

export function fetchApplications(page = 1, pageSize = 20): Promise<ApplicationEnvelope> {
  return request(`/applications?page=${page}&page_size=${pageSize}`, isApplicationEnvelope);
}

export function fetchApplication(applicationId: string): Promise<ApplicationResponse> {
  return request(`/applications/${encodeURIComponent(applicationId)}`, isApplicationResponse);
}

export function fetchApplicationVersions(applicationId: string): Promise<VersionEnvelope> {
  return request(`/applications/${encodeURIComponent(applicationId)}/versions`, isVersionEnvelope);
}

export function editApplication(applicationId: string, payload: unknown): Promise<ApplicationResponse> {
  return request(`/applications/${encodeURIComponent(applicationId)}/versions`, isApplicationResponse, "POST", payload);
}

export function reaffirmApplication(applicationId: string, payload: unknown): Promise<ApplicationResponse> {
  return request(`/applications/${encodeURIComponent(applicationId)}/gig-change/reaffirm`, isApplicationResponse, "POST", payload);
}

export function updateApplicationForGigChange(applicationId: string, payload: unknown): Promise<ApplicationResponse> {
  return request(`/applications/${encodeURIComponent(applicationId)}/gig-change/update`, isApplicationResponse, "POST", payload);
}

export function withdrawApplication(applicationId: string, payload: unknown): Promise<ApplicationResponse> {
  return request(`/applications/${encodeURIComponent(applicationId)}/withdraw`, isApplicationResponse, "POST", payload);
}

export function reapplyApplication(applicationId: string, payload: unknown): Promise<ApplicationResponse> {
  return request(`/applications/${encodeURIComponent(applicationId)}/reapply-after-gig-change`, isApplicationResponse, "POST", payload);
}

async function request<T>(
  path: string, guard: (value: unknown) => value is T, method = "GET", body?: unknown,
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new ApplicationApiError("authentication_required", 401);
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: { Authorization: `Bearer ${session.access_token}`, Accept: "application/json", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new ApplicationApiError(errorCode(data), response.status);
  if (!guard(data)) throw new Error("The application API returned an unexpected response.");
  return data;
}

function errorCode(value: unknown): string {
  if (value && typeof value === "object" && !Array.isArray(value) && "detail" in value && typeof value.detail === "string") {
    return value.detail;
  }
  return "application_service_unavailable";
}

export type { ApplicationContext, ApplicationEnvelope, ApplicationResponse, VersionEnvelope };
