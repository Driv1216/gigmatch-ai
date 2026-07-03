import type { SeniorityNeeded } from "./gigs";
import { supabase } from "./supabaseClient";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

export type SkillExtractionResult = {
  skills: string[];
  categories: string[];
  matched_terms: string[];
  unmatched_keywords: string[];
  confidence: "deterministic";
};

export type GigParse = {
  id: string;
  gig_id: string;
  parser_version: string;
  status: "parsed" | "reviewed" | "failed";
  parsed_json: Record<string, unknown>;
  required_skills: string[];
  preferred_skills: string[];
  categories: string[];
  matched_terms: string[];
  unmatched_keywords: string[];
  confidence: "deterministic";
  seniority_level: SeniorityNeeded | null;
  deliverables: string[];
  created_at: string;
  updated_at: string;
};

export type GigParseInput = {
  gig_id: string;
  parser_version: "deterministic_v1";
  status: "reviewed";
  parsed_json: Record<string, unknown>;
  required_skills: string[];
  preferred_skills: string[];
  categories: string[];
  matched_terms: string[];
  unmatched_keywords: string[];
  confidence: "deterministic";
  seniority_level: SeniorityNeeded | null;
  deliverables: string[];
};

type GigParseUpdateInput = Omit<GigParseInput, "gig_id">;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isSkillExtractionResult(value: unknown): value is SkillExtractionResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as Record<string, unknown>;

  return (
    isStringArray(result.skills) &&
    isStringArray(result.categories) &&
    isStringArray(result.matched_terms) &&
    isStringArray(result.unmatched_keywords) &&
    result.confidence === "deterministic"
  );
}

function inputForUpdate(input: GigParseInput): GigParseUpdateInput {
  return {
    parser_version: input.parser_version,
    status: input.status,
    parsed_json: input.parsed_json,
    required_skills: input.required_skills,
    preferred_skills: input.preferred_skills,
    categories: input.categories,
    matched_terms: input.matched_terms,
    unmatched_keywords: input.unmatched_keywords,
    confidence: input.confidence,
    seniority_level: input.seniority_level,
    deliverables: input.deliverables,
  };
}

function isUniqueViolation(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "23505");
}

export async function extractGigSkills(text: string): Promise<SkillExtractionResult> {
  const response = await fetch(`${apiBaseUrl}/parsing/extract-skills`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(response.status === 422 ? "Gig text is too long or invalid." : "Unable to reach the parser.");
  }

  const data: unknown = await response.json();

  if (!isSkillExtractionResult(data)) {
    throw new Error("The parser returned an unexpected response.");
  }

  return data;
}

export async function fetchGigParse(gigId: string): Promise<GigParse | null> {
  const { data, error } = await supabase.from("gig_parses").select("*").eq("gig_id", gigId).maybeSingle();

  if (error) {
    throw error;
  }

  return data as GigParse | null;
}

export async function saveGigParse(input: GigParseInput, hasExistingParse: boolean) {
  if (hasExistingParse) {
    const { error } = await supabase.from("gig_parses").update(inputForUpdate(input)).eq("gig_id", input.gig_id);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase.from("gig_parses").insert(input);

  if (error) {
    if (isUniqueViolation(error)) {
      const { error: updateError } = await supabase.from("gig_parses").update(inputForUpdate(input)).eq("gig_id", input.gig_id);

      if (!updateError) {
        return;
      }

      throw updateError;
    }

    throw error;
  }
}

export function buildGigParseInput(
  gigId: string,
  requiredSkills: string[],
  preferredSkills: string[],
  categories: string[],
  matchedTerms: string[],
  unmatchedKeywords: string[],
  seniorityLevel: SeniorityNeeded | null,
  deliverables: string[],
): GigParseInput {
  return {
    gig_id: gigId,
    parser_version: "deterministic_v1",
    status: "reviewed",
    parsed_json: {
      required_skills: requiredSkills,
      preferred_skills: preferredSkills,
      categories,
      matched_terms: matchedTerms,
      unmatched_keywords: unmatchedKeywords,
      confidence: "deterministic",
      seniority_level: seniorityLevel,
      deliverables,
      source: "gig_description_review_ui",
    },
    required_skills: requiredSkills,
    preferred_skills: preferredSkills,
    categories,
    matched_terms: matchedTerms,
    unmatched_keywords: unmatchedKeywords,
    confidence: "deterministic",
    seniority_level: seniorityLevel,
    deliverables,
  };
}
