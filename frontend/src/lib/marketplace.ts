import { supabase } from "./supabaseClient";
import {
  isGigDetailResponse,
  isGigDiscoveryEnvelope,
  type GigDetailResponse,
  type GigDiscoveryEnvelope,
} from "./marketplaceContracts";

export type {
  DurationSummary,
  GigDetail,
  GigDetailResponse,
  GigDiscoveryEnvelope,
  GigSummary,
  GigTombstone,
  PaymentSummary,
  SafeClientSummary,
  StructuredRange,
} from "./marketplaceContracts";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

export class MarketplaceApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MarketplaceApiError";
    this.status = status;
  }
}

export async function fetchOpenGigs(page = 1, pageSize = 20): Promise<GigDiscoveryEnvelope> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return requestMarketplace(`/gigs?${params.toString()}`, isGigDiscoveryEnvelope);
}

export async function fetchGigDetail(gigId: string): Promise<GigDetailResponse> {
  return requestMarketplace(`/gigs/${encodeURIComponent(gigId)}`, isGigDetailResponse);
}

async function requestMarketplace<T>(path: string, guard: (value: unknown) => value is T): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new MarketplaceApiError("Sign in again to view marketplace gigs.", 401);
  }
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { Authorization: `Bearer ${session.access_token}`, Accept: "application/json" },
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new MarketplaceApiError(apiMessage(data), response.status);
  }
  if (!guard(data)) {
    throw new Error("The marketplace API returned an unexpected response.");
  }
  return data;
}

function apiMessage(value: unknown): string {
  if (value && typeof value === "object" && !Array.isArray(value) && "detail" in value && typeof value.detail === "string") {
    return value.detail;
  }
  return "We could not load this marketplace view right now.";
}
