export type AttentionKind =
  | "updated_gig_response_required"
  | "qa_response_required"
  | "revision_request_response_required"
  | "selection_response_required"
  | "reconsideration_response_required"
  | "engagement_response_required";

export type AttentionItem = {
  action_kind: AttentionKind;
  resource_id: string;
  application_id: string | null;
  gig_id: string;
  gig_title: string;
  deadline_at: string | null;
  latest_activity_at: string;
};

export type AttentionCollection = {
  items: AttentionItem[];
  attention_action_count: number;
  attention_resource_count: number;
  limit: number;
  has_more: boolean;
};

export type ApplicationPreview = {
  application_id: string;
  gig_id: string;
  gig_title: string;
  stage: string;
  application_version_number: number;
  updated_gig_response_required: boolean;
  qa_action_count: number;
  has_effective_selection_request: boolean;
  last_updated_at: string;
};

export type EngagementPreview = {
  engagement_id: string;
  gig_id: string;
  application_id: string;
  gig_title: string;
  status: string;
  lifecycle_version: number;
  confirmed_at: string;
  latest_activity_at: string;
  response_required: boolean;
};

export type GigReviewPreview = {
  gig_id: string;
  gig_title: string;
  product_state: string;
  opportunity_lifecycle: string;
  application_intake: string;
  operational_state: string;
  under_review_count: number;
  advanced_count: number;
  internal_shortlist_count: number;
  client_qa_action_count: number;
  has_effective_selection_request: boolean;
  latest_application_activity_at: string | null;
};

export type SelectionPreview = {
  selection_request_id: string;
  application_id: string;
  gig_id: string;
  gig_title: string;
  created_at: string;
  expires_at: string;
};

export type PreviewCollection<T> = {
  items: T[];
  total: number;
  limit: number;
  has_more: boolean;
};

export type FreelancerDashboard = {
  authoritative_now: string;
  summary: {
    total_applications: number;
    under_review_applications: number;
    advanced_applications: number;
    response_required_applications: number;
    effective_selection_requests: number;
    active_engagements: number;
  };
  attention: AttentionCollection;
  recent_applications: PreviewCollection<ApplicationPreview>;
  active_engagements: PreviewCollection<EngagementPreview>;
};

export type ClientDashboard = {
  authoritative_now: string;
  summary: {
    active_owned_gigs: number;
    active_applications: number;
    under_review_applications: number;
    advanced_applications: number;
    shortlisted_applications: number;
    effective_selection_requests: number;
    active_engagements: number;
  };
  attention: AttentionCollection;
  gig_review_overview: PreviewCollection<GigReviewPreview>;
  pending_selection_requests: PreviewCollection<SelectionPreview>;
  active_engagements: PreviewCollection<EngagementPreview>;
};

const attentionKinds = new Set<AttentionKind>([
  "updated_gig_response_required",
  "qa_response_required",
  "revision_request_response_required",
  "selection_response_required",
  "reconsideration_response_required",
  "engagement_response_required",
]);
const applicationStages = new Set([
  "under_review", "advanced", "confirmed", "not_selected", "withdrawn",
  "closed_gig_cancelled",
]);
const activeEngagementStatuses = new Set([
  "confirmed", "kickoff_pending", "in_progress", "completion_pending",
  "cancellation_pending",
]);
const sensitiveKeys = new Set([
  "action_token",
  "accepted_terms",
  "accepted_terms_snapshot",
  "contact",
  "contact_mask",
  "contact_value",
  "cover_note",
  "event_payload",
  "message_body",
  "proposal",
  "proposal_snapshot",
  "question_body",
  "response_token",
  "send_token",
]);

export function hasForbiddenDashboardFields(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasForbiddenDashboardFields);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, item]) => (
    sensitiveKeys.has(key.toLowerCase())
    || key.toLowerCase().endsWith("_token")
    || hasForbiddenDashboardFields(item)
  ));
}

export function isFreelancerDashboard(value: unknown): value is FreelancerDashboard {
  if (hasForbiddenDashboardFields(value) || !isRecord(value)) return false;
  return hasKeys(value, ["authoritative_now", "summary", "attention", "recent_applications", "active_engagements"])
    && typeof value.authoritative_now === "string"
    && isNumericRecord(value.summary, [
      "total_applications", "under_review_applications", "advanced_applications",
      "response_required_applications", "effective_selection_requests", "active_engagements",
    ])
    && isAttention(value.attention)
    && isCollection(value.recent_applications, isApplicationPreview)
    && isCollection(value.active_engagements, isEngagementPreview)
    && value.summary.total_applications === value.recent_applications.total
    && value.summary.active_engagements === value.active_engagements.total;
}

export function isClientDashboard(value: unknown): value is ClientDashboard {
  if (hasForbiddenDashboardFields(value) || !isRecord(value)) return false;
  return hasKeys(value, ["authoritative_now", "summary", "attention", "gig_review_overview", "pending_selection_requests", "active_engagements"])
    && typeof value.authoritative_now === "string"
    && isNumericRecord(value.summary, [
      "active_owned_gigs", "active_applications", "under_review_applications",
      "advanced_applications", "shortlisted_applications",
      "effective_selection_requests", "active_engagements",
    ])
    && isAttention(value.attention)
    && isCollection(value.gig_review_overview, isGigReviewPreview)
    && isCollection(value.pending_selection_requests, isSelectionPreview)
    && isCollection(value.active_engagements, isEngagementPreview)
    && value.summary.effective_selection_requests === value.pending_selection_requests.total
    && value.summary.active_engagements === value.active_engagements.total;
}

function isAttention(value: unknown): value is AttentionCollection {
  if (!isRecord(value) || !hasKeys(value, [
    "items", "attention_action_count", "attention_resource_count", "limit", "has_more",
  ]) || !Array.isArray(value.items) || !value.items.every(isAttentionItem)
    || !nonNegative(value.attention_action_count)
    || !nonNegative(value.attention_resource_count)
    || !positive(value.limit) || typeof value.has_more !== "boolean") return false;
  return value.items.length <= value.limit
    && value.attention_action_count >= value.items.length
    && value.attention_resource_count <= value.attention_action_count
    && value.has_more === (value.attention_action_count > value.limit);
}

function isAttentionItem(value: unknown): value is AttentionItem {
  return isRecord(value)
    && hasKeys(value, [
      "action_kind", "resource_id", "application_id", "gig_id", "gig_title",
      "deadline_at", "latest_activity_at",
    ])
    && attentionKinds.has(value.action_kind as AttentionKind)
    && strings(value, ["resource_id", "gig_id", "gig_title", "latest_activity_at"])
    && optionalString(value.application_id)
    && optionalString(value.deadline_at);
}

function isApplicationPreview(value: unknown): value is ApplicationPreview {
  return isRecord(value)
    && hasKeys(value, [
      "application_id", "gig_id", "gig_title", "stage", "application_version_number",
      "updated_gig_response_required", "qa_action_count",
      "has_effective_selection_request", "last_updated_at",
    ])
    && strings(value, ["application_id", "gig_id", "gig_title", "stage", "last_updated_at"])
    && applicationStages.has(value.stage as string)
    && positive(value.application_version_number) && nonNegative(value.qa_action_count)
    && booleans(value, ["updated_gig_response_required", "has_effective_selection_request"]);
}

function isEngagementPreview(value: unknown): value is EngagementPreview {
  return isRecord(value)
    && hasKeys(value, [
      "engagement_id", "gig_id", "application_id", "gig_title", "status",
      "lifecycle_version", "confirmed_at", "latest_activity_at", "response_required",
    ])
    && strings(value, [
      "engagement_id", "gig_id", "application_id", "gig_title", "status",
      "confirmed_at", "latest_activity_at",
    ])
    && activeEngagementStatuses.has(value.status as string)
    && positive(value.lifecycle_version) && typeof value.response_required === "boolean";
}

function isGigReviewPreview(value: unknown): value is GigReviewPreview {
  return isRecord(value)
    && hasKeys(value, [
      "gig_id", "gig_title", "product_state", "opportunity_lifecycle",
      "application_intake", "operational_state", "under_review_count",
      "advanced_count", "internal_shortlist_count", "client_qa_action_count",
      "has_effective_selection_request", "latest_application_activity_at",
    ])
    && strings(value, [
      "gig_id", "gig_title", "product_state", "opportunity_lifecycle",
      "application_intake", "operational_state",
    ])
    && ["under_review_count", "advanced_count", "internal_shortlist_count", "client_qa_action_count"]
      .every((key) => nonNegative(value[key]))
    && typeof value.has_effective_selection_request === "boolean"
    && optionalString(value.latest_application_activity_at);
}

function isSelectionPreview(value: unknown): value is SelectionPreview {
  return isRecord(value)
    && hasKeys(value, [
      "selection_request_id", "application_id", "gig_id", "gig_title",
      "created_at", "expires_at",
    ])
    && strings(value, [
      "selection_request_id", "application_id", "gig_id", "gig_title",
      "created_at", "expires_at",
    ]);
}

function isCollection<T>(
  value: unknown,
  guard: (item: unknown) => item is T,
): value is PreviewCollection<T> {
  if (!isRecord(value) || !hasKeys(value, ["items", "total", "limit", "has_more"])
    || !Array.isArray(value.items) || !value.items.every(guard)
    || !nonNegative(value.total) || !positive(value.limit)
    || typeof value.has_more !== "boolean") return false;
  return value.items.length <= value.limit
    && value.total >= value.items.length
    && value.has_more === (value.total > value.limit);
}

function isNumericRecord(value: unknown, keys: string[]): value is Record<string, number> {
  return isRecord(value) && hasKeys(value, keys) && keys.every((key) => nonNegative(value[key]));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => key in value);
}

function strings(value: Record<string, unknown>, keys: string[]): boolean {
  return keys.every((key) => typeof value[key] === "string" && value[key] !== "");
}

function booleans(value: Record<string, unknown>, keys: string[]): boolean {
  return keys.every((key) => typeof value[key] === "boolean");
}

function optionalString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function nonNegative(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function positive(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}
