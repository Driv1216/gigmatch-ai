import { supabase } from "./supabaseClient";
import {
  isRecommendedFreelancersEnvelope,
  isRecommendedGigsEnvelope,
  type RecommendedFreelancersEnvelope,
  type RecommendedGigsEnvelope,
} from "./matchingContracts";

export type {
  RankingContext,
  RankingMode,
  RecommendedFreelancerItem,
  RecommendedFreelancersEnvelope,
  RecommendedGigItem,
  RecommendedGigsEnvelope,
  SemanticStatus,
  SemanticUnavailableReason,
} from "./matchingContracts";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

export class MatchingApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MatchingApiError";
    this.status = status;
  }
}

export async function fetchRecommendedGigs(): Promise<RecommendedGigsEnvelope> {
  return requestRecommendations("/matching/recommended-gigs", isRecommendedGigsEnvelope, "We could not load recommendations right now.");
}

export async function fetchRecommendedFreelancersForGig(gigId: string): Promise<RecommendedFreelancersEnvelope> {
  return requestRecommendations(
    `/matching/gigs/${encodeURIComponent(gigId)}/recommended-freelancers`,
    isRecommendedFreelancersEnvelope,
    "We could not load freelancer recommendations right now.",
  );
}

async function requestRecommendations<T>(
  path: string,
  guard: (value: unknown) => value is T,
  fallback: string,
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new MatchingApiError("Sign in again to load recommendations.", 401);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${session.access_token}`, Accept: "application/json" },
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new MatchingApiError(messageFromApiError(data, fallback), response.status);
  }
  if (!guard(data)) {
    throw new Error("The matching API returned an unexpected response.");
  }
  return data;
}

function messageFromApiError(data: unknown, fallback: string) {
  if (!data || typeof data !== "object" || Array.isArray(data) || !("detail" in data)) {
    return fallback;
  }
  return typeof data.detail === "string" ? data.detail : fallback;
}
