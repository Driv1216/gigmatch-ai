export const engagementStatuses = [
  "confirmed",
  "kickoff_pending",
  "in_progress",
  "completion_pending",
  "completed",
  "cancellation_pending",
  "cancelled",
] as const;

export type EngagementStatus = typeof engagementStatuses[number];

export const engagementActions = [
  "prepare_kickoff",
  "start_work",
  "request_completion",
  "confirm_completion",
  "reject_completion",
  "request_cancellation",
  "withdraw_cancellation",
  "acknowledge_cancellation",
  "reopen_gig",
] as const;

export type EngagementAction = typeof engagementActions[number];

export const reconsiderationStatuses = [
  "pending",
  "accepted",
  "declined",
  "cancelled",
  "superseded",
  "closed_by_gig_state",
] as const;

export type ReconsiderationStatus = typeof reconsiderationStatuses[number];
export type ReconsiderationAction = "cancel" | "reaffirm" | "submit_update" | "decline";

export type Engagement = {
  engagement_id: string;
  gig_id: string;
  application_id: string;
  selection_request_id?: string;
  viewer_role: "client" | "freelancer";
  status: EngagementStatus;
  lifecycle_version: number;
  confirmed_at: string;
  gig: { id: string; title: string; status: string };
  client: { user_id: string; display_name: string };
  freelancer: { user_id: string; display_name: string };
  accepted_terms: {
    accepted_terms_contract_version: 1 | 2;
    application_version_id?: string;
    application_version_number: number;
    gig_version_id?: string;
    gig_version_number: number;
    client_payment_terms: Record<string, unknown>;
    freelancer_proposal: Record<string, unknown>;
    timeline: Record<string, unknown>;
    availability: Record<string, unknown>;
    included_work: unknown[];
    excluded_work: unknown[];
    assumptions: unknown[];
    estimate_change_factors?: unknown[];
    scope_notes?: string;
  };
  action_token: string;
  reopening_token?: string;
  allowed_actions: EngagementAction[];
  reopened: boolean;
  work_started_by_user_id?: string;
  work_started_at?: string;
  completion_requested_by_user_id?: string;
  completion_requested_at?: string;
  cancellation_requested_by_user_id?: string;
  cancellation_requested_at?: string;
  previous_active_status?: EngagementStatus;
  cancellation_reason_code?: string;
  cancellation_explanation?: string;
  disclaimers: string[];
};

export type EngagementList = { items: Engagement[]; count: number };

export const engagementTimelineEvents = [
  "engagement_created",
  "engagement_kickoff_prepared",
  "engagement_work_started",
  "engagement_completion_requested",
  "engagement_completion_confirmed",
  "engagement_completion_rejected",
  "engagement_cancellation_requested",
  "engagement_cancellation_withdrawn",
  "engagement_cancellation_acknowledged",
  "gig_reopened_after_engagement_cancellation",
] as const;

export type EngagementTimeline = {
  engagement_id: string;
  items: Array<{
    event_id: string;
    event_type: typeof engagementTimelineEvents[number];
    actor_role: "client" | "freelancer" | "system";
    reason_code?: string;
    status_from?: EngagementStatus;
    status_to?: EngagementStatus;
    lifecycle_version?: number;
    occurred_at: string;
  }>;
};

export type ReconsiderationContext = {
  application_id: string;
  gig_id: string;
  viewer_role: "client" | "freelancer";
  eligible: boolean;
  blockers: string[];
  pending_invitation_id?: string | null;
  action_token?: string | null;
};

export type ReconsiderationInvitation = {
  invitation_id: string;
  reopening_id: string;
  source_engagement_id: string;
  application_id: string;
  gig_id: string;
  viewer_role: "client" | "freelancer";
  status: ReconsiderationStatus;
  reason_code: string;
  reason_explanation?: string;
  created_at: string;
  responded_at?: string;
  invited_application_version_id: string;
  invited_material_gig_version_id: string;
  response_application_version_id?: string;
  current_application_stage: string;
  current_application_version_id: string;
  current_material_gig_version_id: string;
  action_token: string;
  allowed_actions: ReconsiderationAction[];
  previous_proposal: Record<string, unknown>;
  current_gig_terms: Record<string, unknown>;
  gig: { id: string; title: string; status: string };
};

const forbiddenOrdinaryFields = new Set([
  "accepted_terms_snapshot",
  "snapshot_schema_version",
  "contact_value",
  "plaintext",
  "ciphertext",
  "nonce",
  "key_id",
  "digest",
  "fingerprint",
  "operation_fingerprint",
  "audit",
]);

export function isEngagement(value: unknown): value is Engagement {
  if (!isRecord(value) || containsForbiddenOrdinaryField(value)) return false;
  const terms = value.accepted_terms;
  return (
    typeof value.engagement_id === "string" &&
    typeof value.gig_id === "string" &&
    typeof value.application_id === "string" &&
    isViewerRole(value.viewer_role) &&
    isEngagementStatus(value.status) &&
    Number.isInteger(value.lifecycle_version) &&
    typeof value.confirmed_at === "string" &&
    isNamedRecord(value.gig) &&
    isNamedRecord(value.client, "display_name") &&
    isNamedRecord(value.freelancer, "display_name") &&
    isRecord(terms) &&
    (terms.accepted_terms_contract_version === 1 || terms.accepted_terms_contract_version === 2) &&
    Number.isInteger(terms.application_version_number) &&
    Number.isInteger(terms.gig_version_number) &&
    isRecord(terms.client_payment_terms) &&
    isRecord(terms.freelancer_proposal) &&
    isRecord(terms.timeline) &&
    isRecord(terms.availability) &&
    Array.isArray(terms.included_work) &&
    Array.isArray(terms.excluded_work) &&
    Array.isArray(terms.assumptions) &&
    typeof value.action_token === "string" &&
    value.action_token.length >= 16 &&
    isArrayOf(value.allowed_actions, isEngagementAction) &&
    typeof value.reopened === "boolean" &&
    isArrayOf(value.disclaimers, (item): item is string => typeof item === "string")
  );
}

export function isEngagementList(value: unknown): value is EngagementList {
  return isRecord(value) && Array.isArray(value.items) &&
    value.items.every(isEngagement) && Number.isInteger(value.count) && value.count === value.items.length;
}

export function isEngagementTimeline(value: unknown): value is EngagementTimeline {
  return isRecord(value) && !containsForbiddenOrdinaryField(value) &&
    typeof value.engagement_id === "string" && Array.isArray(value.items) &&
    new Set(value.items.map((item) => isRecord(item) ? item.event_id : null)).size === value.items.length &&
    value.items.every((item) => isRecord(item) &&
      typeof item.event_id === "string" &&
      isOneOf(item.event_type, engagementTimelineEvents) &&
      isOneOf(item.actor_role, ["client", "freelancer", "system"] as const) &&
      typeof item.occurred_at === "string" &&
      (item.lifecycle_version === undefined || Number.isInteger(item.lifecycle_version)) &&
      (item.status_from === undefined || isEngagementStatus(item.status_from)) &&
      (item.status_to === undefined || isEngagementStatus(item.status_to))
    );
}

export function isReconsiderationContext(value: unknown): value is ReconsiderationContext {
  return isRecord(value) && !containsForbiddenOrdinaryField(value) &&
    typeof value.application_id === "string" && typeof value.gig_id === "string" &&
    isViewerRole(value.viewer_role) && typeof value.eligible === "boolean" &&
    isArrayOf(value.blockers, (item): item is string => typeof item === "string") &&
    (value.pending_invitation_id === null || value.pending_invitation_id === undefined || typeof value.pending_invitation_id === "string") &&
    (value.action_token === null || value.action_token === undefined || typeof value.action_token === "string");
}

export function isReconsiderationInvitation(value: unknown): value is ReconsiderationInvitation {
  return isRecord(value) && !containsForbiddenOrdinaryField(value) &&
    typeof value.invitation_id === "string" && typeof value.reopening_id === "string" &&
    typeof value.source_engagement_id === "string" && typeof value.application_id === "string" &&
    typeof value.gig_id === "string" && isViewerRole(value.viewer_role) &&
    isOneOf(value.status, reconsiderationStatuses) && typeof value.reason_code === "string" &&
    typeof value.created_at === "string" && typeof value.invited_application_version_id === "string" &&
    typeof value.invited_material_gig_version_id === "string" &&
    typeof value.current_application_stage === "string" &&
    typeof value.current_application_version_id === "string" &&
    typeof value.current_material_gig_version_id === "string" &&
    typeof value.action_token === "string" && value.action_token.length >= 16 &&
    isArrayOf(value.allowed_actions, isReconsiderationAction) &&
    isRecord(value.previous_proposal) && isRecord(value.current_gig_terms) && isNamedRecord(value.gig);
}

export function containsForbiddenOrdinaryField(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenOrdinaryField);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, child]) =>
    forbiddenOrdinaryFields.has(key.toLocaleLowerCase()) || containsForbiddenOrdinaryField(child));
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isEngagementStatus(value: unknown): value is EngagementStatus {
  return isOneOf(value, engagementStatuses);
}

function isEngagementAction(value: unknown): value is EngagementAction {
  return isOneOf(value, engagementActions);
}

function isReconsiderationAction(value: unknown): value is ReconsiderationAction {
  return isOneOf(value, ["cancel", "reaffirm", "submit_update", "decline"] as const);
}

function isViewerRole(value: unknown): value is "client" | "freelancer" {
  return value === "client" || value === "freelancer";
}

function isNamedRecord(value: unknown, label = "title"): boolean {
  return isRecord(value) && typeof value[label] === "string";
}

function isArrayOf<T>(value: unknown, guard: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

function isOneOf<const T extends readonly string[]>(value: unknown, values: T): value is T[number] {
  return typeof value === "string" && values.includes(value);
}
