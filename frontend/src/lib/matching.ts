import type { MatchExplanation } from "./matchingExplanations";
import { supabase } from "./supabaseClient";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

export type RecommendedGigItem = {
  gig_id: string;
  title?: string | null;
  category?: string | null;
  status?: string | null;
  rank: number;
  hybrid_score: number;
  keyword_score: number;
  semantic_score: number;
  explanation?: MatchExplanation | null;
};

export type RecommendedGigsEnvelope = {
  items: RecommendedGigItem[];
  count: number;
  limit: number;
  ranking_method: "hybrid";
};

export type RecommendedFreelancerItem = {
  freelancer_id: string;
  headline?: string | null;
  primary_role?: string | null;
  rank: number;
  hybrid_score: number;
  keyword_score: number;
  semantic_score: number;
  explanation?: MatchExplanation | null;
};

export type RecommendedFreelancersEnvelope = {
  items: RecommendedFreelancerItem[];
  count: number;
  limit: number;
  ranking_method: "hybrid";
};

export class MatchingApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MatchingApiError";
    this.status = status;
  }
}

export async function fetchRecommendedGigs(): Promise<RecommendedGigsEnvelope> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new MatchingApiError("Sign in again to load recommendations.", 401);
  }

  const response = await fetch(`${apiBaseUrl}/matching/recommended-gigs`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      Accept: "application/json",
    },
  });

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new MatchingApiError(messageFromApiError(data, "We could not load recommendations right now."), response.status);
  }

  if (!isRecommendedGigsEnvelope(data)) {
    throw new Error("The matching API returned an unexpected response.");
  }

  return data;
}

export async function fetchRecommendedFreelancersForGig(gigId: string): Promise<RecommendedFreelancersEnvelope> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new MatchingApiError("Sign in again to load recommendations.", 401);
  }

  const response = await fetch(`${apiBaseUrl}/matching/gigs/${encodeURIComponent(gigId)}/recommended-freelancers`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      Accept: "application/json",
    },
  });

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new MatchingApiError(
      messageFromApiError(data, "We could not load freelancer recommendations right now."),
      response.status,
    );
  }

  if (!isRecommendedFreelancersEnvelope(data)) {
    throw new Error("The matching API returned an unexpected response.");
  }

  return data;
}

function messageFromApiError(data: unknown, fallback: string) {
  if (!isRecord(data) || !("detail" in data)) {
    return fallback;
  }

  const detail = data.detail;

  if (typeof detail === "string") {
    return detail;
  }

  return fallback;
}

function isRecommendedGigsEnvelope(value: unknown): value is RecommendedGigsEnvelope {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Array.isArray(value.items) &&
    value.items.every(isRecommendedGigItem) &&
    typeof value.count === "number" &&
    typeof value.limit === "number" &&
    value.ranking_method === "hybrid"
  );
}

function isRecommendedFreelancersEnvelope(value: unknown): value is RecommendedFreelancersEnvelope {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Array.isArray(value.items) &&
    value.items.every(isRecommendedFreelancerItem) &&
    typeof value.count === "number" &&
    typeof value.limit === "number" &&
    value.ranking_method === "hybrid"
  );
}

function isRecommendedGigItem(value: unknown): value is RecommendedGigItem {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.gig_id === "string" &&
    isOptionalString(value.title) &&
    isOptionalString(value.category) &&
    isOptionalString(value.status) &&
    typeof value.rank === "number" &&
    typeof value.hybrid_score === "number" &&
    typeof value.keyword_score === "number" &&
    typeof value.semantic_score === "number" &&
    (value.explanation === undefined || value.explanation === null || isRecord(value.explanation))
  );
}

function isRecommendedFreelancerItem(value: unknown): value is RecommendedFreelancerItem {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.freelancer_id === "string" &&
    isOptionalString(value.headline) &&
    isOptionalString(value.primary_role) &&
    typeof value.rank === "number" &&
    typeof value.hybrid_score === "number" &&
    typeof value.keyword_score === "number" &&
    typeof value.semantic_score === "number" &&
    (value.explanation === undefined || value.explanation === null || isRecord(value.explanation))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isOptionalString(value: unknown) {
  return value === undefined || value === null || typeof value === "string";
}
