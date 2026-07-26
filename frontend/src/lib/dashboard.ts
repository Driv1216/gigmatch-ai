import { supabase } from "./supabaseClient";
import {
  isClientDashboard,
  isFreelancerDashboard,
  type ClientDashboard,
  type FreelancerDashboard,
} from "./dashboardContracts";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

export class DashboardApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DashboardApiError";
    this.status = status;
  }
}

export function fetchFreelancerDashboard(): Promise<FreelancerDashboard> {
  return requestDashboard("/dashboard/freelancer", isFreelancerDashboard);
}

export function fetchClientDashboard(): Promise<ClientDashboard> {
  return requestDashboard("/dashboard/client", isClientDashboard);
}

async function requestDashboard<T>(
  path: string,
  guard: (value: unknown) => value is T,
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new DashboardApiError("Sign in again to load your dashboard.", 401);
  }
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new DashboardApiError(errorMessage(body), response.status);
  }
  if (!guard(body)) {
    throw new DashboardApiError("The dashboard service returned an invalid response.", 502);
  }
  return body;
}

function errorMessage(value: unknown): string {
  if (typeof value === "object" && value !== null && "detail" in value) {
    const detail = (value as { detail?: unknown }).detail;
    if (detail === "authentication_required") return "Sign in again to load your dashboard.";
    if (detail === "dashboard_unavailable") return "Your workflow dashboard is temporarily unavailable.";
  }
  return "Unable to load your workflow dashboard.";
}
