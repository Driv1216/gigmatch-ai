import { supabase } from "./supabaseClient";
import { isQaThread, type QaThread } from "./qaContracts";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

export class QaApiError extends Error {
  constructor(public code: string, public status: number, public retryAfter: number | null = null) {
    super(code.replace(/_/g, " "));
    this.name = "QaApiError";
  }
}

export function fetchQaThread(
  applicationId: string,
  beforeSequence?: number,
): Promise<QaThread> {
  const query = beforeSequence ? `?before_sequence=${beforeSequence}` : "";
  return request(`/applications/${encodeURIComponent(applicationId)}/qa${query}`);
}

export function askQuestion(applicationId: string, payload: unknown): Promise<QaThread> {
  return mutate(applicationId, "/qa/questions", payload);
}

export function addClarification(applicationId: string, payload: unknown): Promise<QaThread> {
  return mutate(applicationId, "/qa/messages", payload);
}

export function answerQuestion(applicationId: string, messageId: string, payload: unknown): Promise<QaThread> {
  return mutate(applicationId, `/qa/questions/${encodeURIComponent(messageId)}/answer`, payload);
}

export function declineQuestion(applicationId: string, messageId: string, payload: unknown): Promise<QaThread> {
  return mutate(applicationId, `/qa/questions/${encodeURIComponent(messageId)}/decline`, payload);
}

export function correctMessage(applicationId: string, messageId: string, payload: unknown): Promise<QaThread> {
  return mutate(applicationId, `/qa/messages/${encodeURIComponent(messageId)}/correct`, payload);
}

export function reportMessage(applicationId: string, messageId: string, payload: unknown): Promise<QaThread> {
  return mutate(applicationId, `/qa/messages/${encodeURIComponent(messageId)}/report`, payload);
}

export function stopPreAdvancement(applicationId: string, requestId: string): Promise<QaThread> {
  return mutate(applicationId, "/qa/stop-pre-advancement", { request_id: requestId });
}

export function createRevisionRequest(applicationId: string, payload: unknown): Promise<QaThread> {
  return mutate(applicationId, "/revision-requests", payload);
}

export function declineRevisionRequest(
  applicationId: string,
  revisionId: string,
  payload: unknown,
): Promise<QaThread> {
  return mutate(applicationId, `/revision-requests/${encodeURIComponent(revisionId)}/decline`, payload);
}

export function submitRevisionUpdate(
  applicationId: string,
  revisionId: string,
  payload: unknown,
): Promise<QaThread> {
  return mutate(applicationId, `/revision-requests/${encodeURIComponent(revisionId)}/submit-update`, payload);
}

function mutate(applicationId: string, suffix: string, body: unknown): Promise<QaThread> {
  return request(`/applications/${encodeURIComponent(applicationId)}${suffix}`, "POST", body);
}

async function request(path: string, method = "GET", body?: unknown): Promise<QaThread> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new QaApiError("authentication_required", 401);
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
    const retry = Number(response.headers.get("Retry-After"));
    throw new QaApiError(
      errorCode(data),
      response.status,
      Number.isFinite(retry) && retry > 0 ? retry : null,
    );
  }
  if (!isQaThread(data)) throw new Error("The Q&A API returned an unexpected response.");
  return data;
}

function errorCode(value: unknown): string {
  if (value && typeof value === "object" && !Array.isArray(value) &&
    "detail" in value && typeof value.detail === "string") return value.detail;
  return "qa_service_unavailable";
}

export type { QaThread };
