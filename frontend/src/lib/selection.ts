import { supabase } from "./supabaseClient";
import {
  isSelectionContext,
  isSelectionRequestDetail,
  type SelectionContext,
  type SelectionRequestDetail,
} from "./selectionContracts";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

export class SelectionApiError extends Error {
  constructor(public code: string, public status: number) {
    super(code.replace(/_/g, " "));
    this.name = "SelectionApiError";
  }
}

export function fetchSelectionContext(applicationId: string): Promise<SelectionContext> {
  return request(
    `/applications/${encodeURIComponent(applicationId)}/selection-context`,
    isSelectionContext,
  );
}

export function fetchSelectionRequest(requestId: string): Promise<SelectionRequestDetail> {
  return request(
    `/selection-requests/${encodeURIComponent(requestId)}`,
    isSelectionRequestDetail,
  );
}

export function sendSelectionRequest(
  applicationId: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return mutate(`/applications/${encodeURIComponent(applicationId)}/selection-requests`, payload);
}

export function cancelSelectionRequest(
  requestId: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return mutate(`/selection-requests/${encodeURIComponent(requestId)}/cancel`, payload);
}

export function respondToSelectionRequest(
  requestId: string,
  action:
    | "accept"
    | "decline-remain-interested"
    | "decline-withdraw"
    | "request-revised-terms",
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return mutate(
    `/selection-requests/${encodeURIComponent(requestId)}/${action}`,
    payload,
  );
}

async function mutate(
  path: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return request(path, isRecord, "POST", payload);
}

async function request<T>(
  path: string,
  guard: (value: unknown) => value is T,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new SelectionApiError("authentication_required", 401);
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
  if (!response.ok) throw new SelectionApiError(errorCode(data), response.status);
  if (!guard(data)) throw new Error("The selection API returned an unexpected response.");
  return data;
}

function errorCode(value: unknown): string {
  if (
    isRecord(value) &&
    typeof value.detail === "string"
  ) return value.detail;
  if (
    isRecord(value) &&
    isRecord(value.detail) &&
    typeof value.detail.code === "string"
  ) return value.detail.code;
  return "selection_service_unavailable";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export type { SelectionContext, SelectionRequestDetail };
