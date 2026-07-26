import { supabase } from "./supabaseClient";
import { stableManagementErrorMessage } from "./gigManagementView";

export type ManagedGig = {
  gig_id: string;
  terms: Record<string, unknown>;
  lifecycle: "draft" | "active" | "filled" | "cancelled";
  intake: "accepting" | "closed";
  operations: "active" | "paused";
  product_state: "draft" | "open" | "paused" | "closed_to_new_applications" | "filled" | "cancelled";
  accepting_applications: boolean;
  deadline_status: "future" | "expired_or_missing";
  terms_contract_version: number;
  upgrade_required: boolean;
  current_display_version_id: string;
  current_display_version_number: number;
  current_material_version_id: string;
  current_material_version_number: number;
  optimistic_concurrency_token: string;
  allowed_actions: string[];
  blocking_reason_codes: string[];
  active_application_count: number;
  effectively_active_selection_request: boolean;
  latest_material_change_summary: Record<string, unknown>;
  engagement_state: "none" | "current" | "cancelled_not_reopened";
};

export type MaterialPreview = {
  code: "ready" | "no_effective_change" | "material_change_confirmation_required";
  expected_current_gig_version_id: string;
  is_material: boolean;
  changed_fields: string[];
  affected_application_count: number;
  selection_request_effect: "none" | "will_be_invalidated";
  preview_fingerprint: string;
};

export class GigManagementApiError extends Error {
  constructor(public code: string, public status: number, public detail: unknown = code) {
    super(code);
    this.name = "GigManagementApiError";
  }
}

export async function fetchManagedGigs(): Promise<ManagedGig[]> {
  const data = await request<{ items: ManagedGig[] }>("/gigs/manage");
  return data.items;
}

export function fetchManagedGig(gigId: string): Promise<ManagedGig> {
  return request(`/gigs/${encodeURIComponent(gigId)}/manage`);
}

export function publishManagedGig(gigId: string, expected: string, snapshot: Record<string, unknown>) {
  return snapshotAction(gigId, "publish", expected, snapshot);
}

export function upgradeManagedGig(gigId: string, expected: string, snapshot: Record<string, unknown>) {
  return snapshotAction(gigId, "upgrade", expected, snapshot);
}

export function previewManagedGigEdit(gigId: string, expected: string, snapshot: Record<string, unknown>): Promise<MaterialPreview> {
  return snapshotAction(gigId, "edits/preview", expected, snapshot) as Promise<MaterialPreview>;
}

export function editManagedGig(gigId: string, expected: string, snapshot: Record<string, unknown>, preview?: MaterialPreview) {
  return request<Record<string, unknown>>(`/gigs/${encodeURIComponent(gigId)}/edits`, {
    method: "POST",
    body: JSON.stringify({
      expected_current_gig_version_id: expected,
      snapshot,
      confirm_material_effects: Boolean(preview),
      preview_fingerprint: preview?.preview_fingerprint ?? null,
    }),
  });
}

export function runGigAction(gigId: string, action: "intake/close" | "intake/reopen" | "pause" | "resume" | "cancel", body?: Record<string, unknown>) {
  return request<Record<string, unknown>>(`/gigs/${encodeURIComponent(gigId)}/${action}`, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function snapshotAction(gigId: string, action: string, expected: string, snapshot: Record<string, unknown>) {
  return request<Record<string, unknown>>(`/gigs/${encodeURIComponent(gigId)}/${action}`, {
    method: "POST",
    body: JSON.stringify({ expected_current_gig_version_id: expected, snapshot }),
  });
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new GigManagementApiError("authentication_required", 401);
  const base = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data && typeof data === "object" && "detail" in data ? (data as { detail: unknown }).detail : null;
    const code = typeof detail === "string"
      ? detail
      : detail && typeof detail === "object" && "code" in detail && typeof (detail as { code: unknown }).code === "string"
        ? String((detail as { code: unknown }).code)
        : "gig_management_failed";
    throw new GigManagementApiError(code, response.status, detail);
  }
  return data as T;
}

export function managementErrorMessage(error: unknown): string {
  if (!(error instanceof GigManagementApiError)) return error instanceof Error ? error.message : "Gig management failed.";
  return stableManagementErrorMessage(error.code);
}
