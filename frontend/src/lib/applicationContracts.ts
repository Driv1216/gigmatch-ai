type QaIndicator = {
  pending_question_count: number;
  awaiting_other_participant_response_count: number;
  open_revision_request_count: number;
  qa_requires_attention: boolean;
  latest_qa_activity_at: string | null;
};

export type ApplicationContext = {
  gig_id: string;
  can_apply: boolean;
  blocker: string | null;
  existing_application_id: string | null;
  gig: Record<string, unknown>;
  client: Record<string, unknown>;
  material_terms: Record<string, unknown>;
  payment_structure: "fixed_price" | "hourly" | "open_to_proposals";
  currency: string;
  required_proposal_fields: string[];
  application_deadline: string;
  material_gig_version_number: number;
  material_terms_token: string | null;
};

export type ApplicationResponse = {
  application_id: string;
  stage: string;
  application_version_token: string;
  current_application: Record<string, unknown>;
  current_version_number: number;
  original_submission: Record<string, unknown>;
  answered_gig_version_number: number;
  current_material_gig_version_number: number;
  current_material_terms: Record<string, unknown>;
  response_to_updated_gig_required: boolean;
  material_terms_token: string | null;
  gig_change_comparison: Array<{ field: string; before: unknown; after: unknown }>;
  withdrawal_or_closure: Record<string, unknown>;
  version_history_count: number;
  compatibility: { can_reaffirm_existing_proposal: boolean };
  allowed_actions: string[];
  blockers: string[];
  gig: Record<string, unknown>;
  client: Record<string, unknown>;
  qa?: QaIndicator;
  idempotent_replay?: boolean;
};

export type ApplicationSummary = {
  application_id: string;
  gig: Record<string, unknown>;
  client: Record<string, unknown>;
  stage: string;
  submitted_at: string;
  updated_at: string;
  current_version_number: number;
  response_to_updated_gig_required: boolean;
  gig_product_state: string;
  allowed_actions: string[];
  blockers: string[];
  qa?: QaIndicator;
};

export type VersionSummary = {
  version_token: string;
  version_number: number;
  origin: string;
  created_at: string;
  application: Record<string, unknown>;
  answered_gig_version_number: number;
  answered_terms: Record<string, unknown>;
};

export type ApplicationEnvelope = {
  items: ApplicationSummary[];
  pagination: { page: number; page_size: number; total_items: number; total_pages: number };
};

export type VersionEnvelope = {
  items: VersionSummary[];
  pagination: { page: number; page_size: number; total_items: number; total_pages: number };
};

export function isApplicationContext(value: unknown): value is ApplicationContext {
  return isRecord(value) && typeof value.gig_id === "string" && typeof value.can_apply === "boolean" &&
    ["fixed_price", "hourly", "open_to_proposals"].includes(String(value.payment_structure)) &&
    typeof value.currency === "string" && typeof value.material_gig_version_number === "number" &&
    (value.material_terms_token === null || typeof value.material_terms_token === "string");
}

export function isApplicationResponse(value: unknown): value is ApplicationResponse {
  return isRecord(value) && typeof value.application_id === "string" && typeof value.stage === "string" &&
    typeof value.application_version_token === "string" && typeof value.current_version_number === "number" &&
    typeof value.response_to_updated_gig_required === "boolean" && Array.isArray(value.allowed_actions) &&
    isRecord(value.compatibility) && (value.qa === undefined || isQaIndicator(value.qa));
}

export function isApplicationEnvelope(value: unknown): value is ApplicationEnvelope {
  return isRecord(value) && Array.isArray(value.items) && value.items.every((item) =>
    isRecord(item) && typeof item.application_id === "string" && typeof item.stage === "string" &&
    typeof item.current_version_number === "number" && typeof item.response_to_updated_gig_required === "boolean" &&
    (item.qa === undefined || isQaIndicator(item.qa))) &&
    isPagination(value.pagination);
}

export function isVersionEnvelope(value: unknown): value is VersionEnvelope {
  return isRecord(value) && Array.isArray(value.items) && value.items.every((item) =>
    isRecord(item) && typeof item.version_token === "string" && typeof item.version_number === "number" &&
    typeof item.origin === "string" && typeof item.answered_gig_version_number === "number") && isPagination(value.pagination);
}

function isPagination(value: unknown) {
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

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
