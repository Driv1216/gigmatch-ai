import { supabase } from "./supabaseClient";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

export type SkillExtractionResult = {
  skills: string[];
  categories: string[];
  matched_terms: string[];
  unmatched_keywords: string[];
  confidence: "deterministic";
};

export type ResumeParse = {
  id: string;
  user_id: string;
  source_kind: "resume_text" | "resume_pdf" | "resume_docx" | "manual";
  source_file_name: string | null;
  source_mime_type: string | null;
  source_size_bytes: number | null;
  parser_version: string;
  status: "parsed" | "reviewed" | "failed";
  extracted_text_preview: string | null;
  parsed_json: Record<string, unknown>;
  skills: string[];
  categories: string[];
  matched_terms: string[];
  unmatched_keywords: string[];
  confidence: "deterministic";
  created_at: string;
  updated_at: string;
};

export type ResumeDocumentSource = {
  file_name: string;
  file_type: "pdf" | "docx";
  character_count: number;
  page_count: number | null;
  paragraph_count: number | null;
  warnings: string[];
};

export type ResumeDocumentExtractionResult = {
  text: string;
  source: ResumeDocumentSource;
};

export type ResumeParseInput = {
  user_id: string;
  source_kind: "resume_text";
  source_file_name: null;
  source_mime_type: "text/plain";
  source_size_bytes: number;
  parser_version: "deterministic_v1";
  status: "reviewed";
  extracted_text_preview: string;
  parsed_json: Record<string, unknown>;
  skills: string[];
  categories: string[];
  matched_terms: string[];
  unmatched_keywords: string[];
  confidence: "deterministic";
};

type ResumeParseUpdateInput = Omit<ResumeParseInput, "user_id">;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function isSkillExtractionResult(value: unknown): value is SkillExtractionResult {
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

function isResumeDocumentExtractionResult(value: unknown): value is ResumeDocumentExtractionResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as Record<string, unknown>;
  const source = result.source as Record<string, unknown> | undefined;

  return (
    typeof result.text === "string" &&
    Boolean(source) &&
    typeof source === "object" &&
    typeof source.file_name === "string" &&
    (source.file_type === "pdf" || source.file_type === "docx") &&
    typeof source.character_count === "number" &&
    (typeof source.page_count === "number" || source.page_count === null) &&
    (typeof source.paragraph_count === "number" || source.paragraph_count === null) &&
    isStringArray(source.warnings)
  );
}

function messageFromApiError(data: unknown, fallback: string) {
  if (!data || typeof data !== "object" || !("detail" in data)) {
    return fallback;
  }

  const detail = (data as { detail: unknown }).detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const firstDetail = detail[0];

    if (firstDetail && typeof firstDetail === "object" && "msg" in firstDetail && typeof firstDetail.msg === "string") {
      return firstDetail.msg;
    }
  }

  return fallback;
}

export async function extractResumeSkills(text: string): Promise<SkillExtractionResult> {
  const response = await fetch(`${apiBaseUrl}/parsing/extract-skills`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(response.status === 422 ? "Resume text is too long or invalid." : "Unable to reach the parser.");
  }

  const data: unknown = await response.json();

  if (!isSkillExtractionResult(data)) {
    throw new Error("The parser returned an unexpected response.");
  }

  return data;
}

export async function extractResumeDocumentText(file: File): Promise<ResumeDocumentExtractionResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${apiBaseUrl}/parsing/resume/extract-document`, {
    method: "POST",
    body: formData,
  });

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(messageFromApiError(data, "Unable to extract text from this resume document."));
  }

  if (!isResumeDocumentExtractionResult(data)) {
    throw new Error("The document extractor returned an unexpected response.");
  }

  if (!data.text.trim()) {
    throw new Error("The document did not contain readable text. Please paste your resume text manually.");
  }

  return data;
}

export async function fetchResumeParse(userId: string): Promise<ResumeParse | null> {
  const { data, error } = await supabase.from("resume_parses").select("*").eq("user_id", userId).maybeSingle();

  if (error) {
    throw error;
  }

  return data as ResumeParse | null;
}

function inputForUpdate(input: ResumeParseInput): ResumeParseUpdateInput {
  return {
    source_kind: input.source_kind,
    source_file_name: input.source_file_name,
    source_mime_type: input.source_mime_type,
    source_size_bytes: input.source_size_bytes,
    parser_version: input.parser_version,
    status: input.status,
    extracted_text_preview: input.extracted_text_preview,
    parsed_json: input.parsed_json,
    skills: input.skills,
    categories: input.categories,
    matched_terms: input.matched_terms,
    unmatched_keywords: input.unmatched_keywords,
    confidence: input.confidence,
  };
}

function isUniqueViolation(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "23505");
}

export async function saveResumeParse(input: ResumeParseInput, hasExistingParse: boolean) {
  if (hasExistingParse) {
    const { error } = await supabase.from("resume_parses").update(inputForUpdate(input)).eq("user_id", input.user_id);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase.from("resume_parses").insert(input);

  if (error) {
    if (isUniqueViolation(error)) {
      const { error: updateError } = await supabase
        .from("resume_parses")
        .update(inputForUpdate(input))
        .eq("user_id", input.user_id);

      if (!updateError) {
        return;
      }

      throw updateError;
    }

    throw error;
  }
}

export function buildResumeParseInput(
  userId: string,
  resumeText: string,
  extraction: SkillExtractionResult,
): ResumeParseInput {
  return {
    user_id: userId,
    source_kind: "resume_text",
    source_file_name: null,
    source_mime_type: "text/plain",
    source_size_bytes: new Blob([resumeText]).size,
    parser_version: "deterministic_v1",
    status: "reviewed",
    extracted_text_preview: resumeText.slice(0, 2000),
    parsed_json: {
      ...extraction,
      source: "resume_text_review_ui",
    },
    ...extraction,
  };
}
