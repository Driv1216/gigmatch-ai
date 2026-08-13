export type SelectionViewerRole = "client" | "freelancer";

export type SelectionContext = {
  application_id: string;
  gig_id: string;
  viewer_role: SelectionViewerRole;
  application_stage: string;
  application_version_id: string;
  application_version_number: number;
  material_gig_version_id: string;
  material_gig_version_number: number;
  proposal: Record<string, unknown>;
  timeline: Record<string, unknown>;
  availability: Record<string, unknown>;
  scope: Record<string, unknown>;
  scope_notes: string | null;
  client_terms: Record<string, unknown>;
  commercial_warning_code: string | null;
  commercial_acknowledgement_required: boolean;
  can_send: boolean;
  send_token: string | null;
  blockers: string[];
  active_request_id: string | null;
  latest_request_id: string | null;
  authoritative_now: string;
};

export type SelectionRequestDetail = {
  selection_request_id: string;
  gig_id: string;
  application_id: string;
  viewer_role: SelectionViewerRole;
  status: string;
  stored_status: string;
  created_at: string;
  expires_at: string;
  terminal_at?: string;
  application_version_id: string;
  application_version_number: number;
  material_gig_version_id: string;
  material_gig_version_number: number;
  proposal: Record<string, unknown>;
  timeline: Record<string, unknown>;
  availability: Record<string, unknown>;
  scope: Record<string, unknown>;
  scope_notes?: string;
  client_terms: Record<string, unknown>;
  commercial_warning_code?: string;
  commercial_acknowledged_at?: string;
  decline_disposition?: string;
  cancellation_reason_code?: string;
  cancellation_detail?: Record<string, unknown>;
  response_change_categories?: string[];
  response_detail?: string;
  previous_selection_request_id?: string;
  management_token?: string;
  response_token?: string;
  engagement?: {
    engagement_id: string;
    status: string;
    confirmed_at: string;
  };
  authoritative_now: string;
};

export type SelectionRequestHistoryItem = {
  selection_request_id: string;
  status: string;
  created_at: string;
  expires_at: string;
  terminal_at?: string;
  application_version_id: string;
  material_gig_version_id: string;
  decline_disposition?: string;
  cancellation_reason_code?: string;
  previous_selection_request_id?: string;
};

export type SelectionRequestHistory = {
  application_id: string;
  items: SelectionRequestHistoryItem[];
  authoritative_now: string;
};

export function isSelectionContext(value: unknown): value is SelectionContext {
  if (!isRecord(value)) return false;
  return (
    typeof value.application_id === "string" &&
    typeof value.gig_id === "string" &&
    (value.viewer_role === "client" || value.viewer_role === "freelancer") &&
    typeof value.application_stage === "string" &&
    typeof value.application_version_id === "string" &&
    typeof value.application_version_number === "number" &&
    typeof value.material_gig_version_id === "string" &&
    typeof value.material_gig_version_number === "number" &&
    isRecord(value.proposal) &&
    isRecord(value.timeline) &&
    isRecord(value.availability) &&
    isRecord(value.scope) &&
    isRecord(value.client_terms) &&
    (typeof value.scope_notes === "string" || value.scope_notes === null) &&
    (typeof value.commercial_warning_code === "string" || value.commercial_warning_code === null) &&
    typeof value.commercial_acknowledgement_required === "boolean" &&
    typeof value.can_send === "boolean" &&
    (typeof value.send_token === "string" || value.send_token === null) &&
    (typeof value.active_request_id === "string" || value.active_request_id === null) &&
    (typeof value.latest_request_id === "string" || value.latest_request_id === null) &&
    Array.isArray(value.blockers) &&
    value.blockers.every((item) => typeof item === "string") &&
    typeof value.authoritative_now === "string"
  );
}

export function isSelectionRequestDetail(value: unknown): value is SelectionRequestDetail {
  if (!isRecord(value)) return false;
  return (
    typeof value.selection_request_id === "string" &&
    typeof value.gig_id === "string" &&
    typeof value.application_id === "string" &&
    (value.viewer_role === "client" || value.viewer_role === "freelancer") &&
    typeof value.status === "string" &&
    typeof value.stored_status === "string" &&
    typeof value.created_at === "string" &&
    typeof value.expires_at === "string" &&
    typeof value.application_version_id === "string" &&
    typeof value.application_version_number === "number" &&
    typeof value.material_gig_version_id === "string" &&
    typeof value.material_gig_version_number === "number" &&
    isRecord(value.proposal) &&
    isRecord(value.timeline) &&
    isRecord(value.availability) &&
    isRecord(value.scope) &&
    isRecord(value.client_terms) &&
    optionalString(value, "management_token") &&
    optionalString(value, "response_token") &&
    optionalString(value, "terminal_at") &&
    optionalString(value, "decline_disposition") &&
    optionalString(value, "cancellation_reason_code") &&
    optionalString(value, "response_detail") &&
    optionalString(value, "previous_selection_request_id") &&
    (value.response_change_categories === undefined || (
      Array.isArray(value.response_change_categories) &&
      value.response_change_categories.every((item) => typeof item === "string")
    )) &&
    typeof value.authoritative_now === "string"
  );
}

export function isSelectionRequestHistory(value: unknown): value is SelectionRequestHistory {
  if (!isRecord(value) || !Array.isArray(value.items)) return false;
  return (
    typeof value.application_id === "string" &&
    typeof value.authoritative_now === "string" &&
    value.items.every(isSelectionRequestHistoryItem)
  );
}

function isSelectionRequestHistoryItem(value: unknown): value is SelectionRequestHistoryItem {
  if (!isRecord(value)) return false;
  return (
    typeof value.selection_request_id === "string" &&
    typeof value.status === "string" &&
    typeof value.created_at === "string" &&
    typeof value.expires_at === "string" &&
    typeof value.application_version_id === "string" &&
    typeof value.material_gig_version_id === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function optionalString(value: Record<string, unknown>, key: string): boolean {
  return value[key] === undefined || typeof value[key] === "string";
}
