import { supabase } from "./supabaseClient";
import {
  isEngagement,
  isEngagementList,
  isEngagementTimeline,
  isReconsiderationInvitation,
  isRecord,
  type Engagement,
  type EngagementList,
  type EngagementTimeline,
  type ReconsiderationInvitation,
} from "./engagementContracts";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

export class EngagementApiError extends Error {
  constructor(public code: string, public status: number) {
    super(code.replace(/_/g, " "));
    this.name = "EngagementApiError";
  }
}

export const fetchEngagements = (): Promise<EngagementList> =>
  request("/engagements", isEngagementList);
export const fetchEngagement = (id: string): Promise<Engagement> =>
  request(`/engagements/${encodeURIComponent(id)}`, isEngagement);
export const fetchEngagementTimeline = (id: string): Promise<EngagementTimeline> =>
  request(`/engagements/${encodeURIComponent(id)}/timeline`, isEngagementTimeline);

export function transitionEngagement(
  id: string,
  action: string,
  payload: Record<string, unknown>,
): Promise<Engagement> {
  const paths: Record<string, string> = {
    prepare_kickoff: "prepare-kickoff",
    start_work: "start-work",
    request_completion: "completion/request",
    confirm_completion: "completion/confirm",
    reject_completion: "completion/reject",
    request_cancellation: "cancellation/request",
    withdraw_cancellation: "cancellation/withdraw",
    acknowledge_cancellation: "cancellation/acknowledge",
  };
  return request(`/engagements/${encodeURIComponent(id)}/${paths[action]}`, isEngagement, "POST", payload);
}

export const reopenEngagementGig = (id: string, payload: Record<string, unknown>) =>
  request(`/engagements/${encodeURIComponent(id)}/reopen-gig`, isRecord, "POST", payload);

export const fetchReconsiderationContext = (applicationId: string) =>
  request(`/applications/${encodeURIComponent(applicationId)}/reconsideration-context`, isRecord);
export const fetchReconsiderationInvitation = (id: string): Promise<ReconsiderationInvitation> =>
  request(`/reconsideration-invitations/${encodeURIComponent(id)}`, isReconsiderationInvitation);
export const createReconsiderationInvitation = (applicationId: string, payload: Record<string, unknown>) =>
  request(`/applications/${encodeURIComponent(applicationId)}/reconsideration-invitations`, isReconsiderationInvitation, "POST", payload);
export const cancelReconsiderationInvitation = (id: string, payload: Record<string, unknown>) =>
  request(`/reconsideration-invitations/${encodeURIComponent(id)}/cancel`, isReconsiderationInvitation, "POST", payload);
export const respondToReconsideration = (
  id: string,
  action: "reaffirm" | "decline" | "submit-update",
  payload: Record<string, unknown>,
) => request(`/reconsideration-invitations/${encodeURIComponent(id)}/${action}`, isReconsiderationInvitation, "POST", payload);

async function request<T>(
  path: string,
  guard: (value: unknown) => value is T,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new EngagementApiError("authentication_required", 401);
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
  if (!response.ok) {
    const code = isRecord(data) && typeof data.detail === "string"
      ? data.detail : "engagement_service_unavailable";
    throw new EngagementApiError(code, response.status);
  }
  if (!guard(data)) throw new Error("The engagement API returned an unexpected response.");
  return data;
}

export type { Engagement, EngagementTimeline, ReconsiderationInvitation };
