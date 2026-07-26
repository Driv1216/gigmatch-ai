type QaIndicator = {
  pending_question_count: number;
  awaiting_other_participant_response_count: number;
  open_revision_request_count: number;
  qa_requires_attention: boolean;
  latest_qa_activity_at: string | null;
};

export type ApplicantStatus = "active" | "not_selected" | "withdrawn" | "closed" | "all";
export type ApplicantView = "best_match" | "newest" | "internal_shortlist" | "advanced";

export type ApplicantSuitability = {
  evidence_label: string;
  ranking_status: "available" | "unavailable";
  ranking_mode: "hybrid" | "keyword_fallback" | null;
  ranking_score: number | null;
  keyword_score: number | null;
  semantic_score: number | null;
  hybrid_score: number | null;
  match_label: string | null;
  ranking_unavailable_reason: string | null;
  strongest_matching_evidence: string | null;
  explanation: Record<string, unknown>;
  ranking_generated_at: string;
};

export type ApplicantCard = {
  application_id: string;
  freelancer: Record<string, unknown>;
  stage: string;
  submitted_at: string;
  stage_changed_at: string;
  suitability: ApplicantSuitability;
  commercial: Record<string, unknown>;
  review_state: { is_shortlisted: boolean; shortlisted_at: string | null; review_state_version: number };
  allowed_actions: string[];
  action_blockers: string[];
  shortlist_action_token: string;
  review_decision_action_token: string;
  qa?: QaIndicator;
};

export type ApplicantListEnvelope = {
  gig: Record<string, unknown>;
  counts: Record<string, number>;
  ranking_context: {
    ranking_mode: "hybrid" | "keyword_fallback" | null;
    semantic_status: "available" | "unavailable" | "not_requested";
    semantic_unavailable_reason: string | null;
  };
  ranking_generated_at: string;
  items: ApplicantCard[];
  pagination: { page: number; page_size: number; total_items: number; total_pages: number };
};

export type ApplicantDetail = {
  application_id: string;
  gig: Record<string, unknown>;
  freelancer: Record<string, unknown>;
  stage: string;
  submitted_at: string;
  stage_changed_at: string;
  current_application_version_id: string;
  current_application_version_number: number;
  current_application: Record<string, unknown>;
  commercial_proposal: Record<string, unknown>;
  answered_gig_version: Record<string, unknown>;
  current_material_gig_version: Record<string, unknown>;
  material_change_comparison: Array<{ field: string; before: unknown; after: unknown }>;
  response_to_updated_gig_required: boolean;
  suitability: ApplicantSuitability;
  review_state: { is_shortlisted: boolean; shortlisted_at: string | null; review_state_version: number };
  allowed_actions: string[];
  action_blockers: string[];
  shortlist_action_token: string;
  review_decision_action_token: string;
  review_history: Array<Record<string, unknown>>;
  application_version_count: number;
  version_history: ApplicantVersionEnvelope;
  ranking_context: ApplicantListEnvelope["ranking_context"];
  ranking_generated_at: string;
  qa?: QaIndicator;
};

export type ApplicantVersionEnvelope = {
  items: Array<{
    version_token: string;
    version_number: number;
    origin: string;
    created_at: string;
    application: Record<string, unknown>;
    answered_gig_version_number: number;
    answered_terms: Record<string, unknown>;
  }>;
  pagination: { page: number; page_size: number; total_items: number; total_pages: number };
};

export function isApplicantListEnvelope(value: unknown): value is ApplicantListEnvelope {
  return isRecord(value) && isRecord(value.gig) && isRecord(value.counts) &&
    isRecord(value.ranking_context) && typeof value.ranking_generated_at === "string" &&
    Array.isArray(value.items) && value.items.every(isApplicantCard) && isPagination(value.pagination);
}

export function isApplicantDetail(value: unknown): value is ApplicantDetail {
  return isRecord(value) && typeof value.application_id === "string" && isRecord(value.gig) &&
    isRecord(value.freelancer) && typeof value.stage === "string" &&
    typeof value.current_application_version_number === "number" &&
    typeof value.response_to_updated_gig_required === "boolean" &&
    isSuitability(value.suitability) && isRecord(value.review_state) &&
    typeof value.review_state.is_shortlisted === "boolean" &&
    Array.isArray(value.allowed_actions) && Array.isArray(value.action_blockers) &&
    typeof value.shortlist_action_token === "string" &&
    typeof value.review_decision_action_token === "string" &&
    Array.isArray(value.review_history) && isApplicantVersionEnvelope(value.version_history);
}

export function isApplicantVersionEnvelope(value: unknown): value is ApplicantVersionEnvelope {
  return isRecord(value) && Array.isArray(value.items) && value.items.every((item) =>
    isRecord(item) && typeof item.version_token === "string" &&
    typeof item.version_number === "number" && typeof item.origin === "string" &&
    isRecord(item.application) && typeof item.answered_gig_version_number === "number") &&
    isPagination(value.pagination);
}

function isApplicantCard(value: unknown): value is ApplicantCard {
  return isRecord(value) && typeof value.application_id === "string" &&
    isRecord(value.freelancer) && typeof value.stage === "string" &&
    isSuitability(value.suitability) && isRecord(value.commercial) &&
    isRecord(value.review_state) && typeof value.review_state.is_shortlisted === "boolean" &&
    Array.isArray(value.allowed_actions) && Array.isArray(value.action_blockers) &&
    typeof value.shortlist_action_token === "string" &&
    typeof value.review_decision_action_token === "string" &&
    (value.qa === undefined || isQaIndicator(value.qa));
}

function isSuitability(value: unknown): value is ApplicantSuitability {
  return isRecord(value) && ["available", "unavailable"].includes(String(value.ranking_status)) &&
    (value.ranking_score === null || typeof value.ranking_score === "number") &&
    typeof value.evidence_label === "string" && isRecord(value.explanation) &&
    typeof value.ranking_generated_at === "string";
}

function isPagination(value: unknown): value is ApplicantListEnvelope["pagination"] {
  return isRecord(value) && [value.page, value.page_size, value.total_items, value.total_pages]
    .every((item) => typeof item === "number");
}

function isQaIndicator(value: unknown): value is QaIndicator {
  return isRecord(value) &&
    typeof value.pending_question_count === "number" &&
    typeof value.awaiting_other_participant_response_count === "number" &&
    typeof value.open_revision_request_count === "number" &&
    typeof value.qa_requires_attention === "boolean";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
