export type EngagementStatus =
  | "confirmed"
  | "kickoff_pending"
  | "in_progress"
  | "completion_pending"
  | "completed"
  | "cancellation_pending"
  | "cancelled";

export type Engagement = {
  engagement_id: string;
  gig_id: string;
  application_id: string;
  viewer_role: "client" | "freelancer";
  status: EngagementStatus;
  lifecycle_version: number;
  confirmed_at: string;
  gig: { id: string; title: string; status: string };
  client: { user_id: string; display_name: string };
  freelancer: { user_id: string; display_name: string };
  accepted_terms: {
    accepted_terms_contract_version: 1 | 2;
    application_version_number: number;
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
  allowed_actions: string[];
  reopened: boolean;
  previous_active_status?: string;
  cancellation_reason_code?: string;
  cancellation_explanation?: string;
  disclaimers: string[];
};

export type EngagementList = { items: Engagement[]; count: number };
export type EngagementTimeline = {
  engagement_id: string;
  items: Array<{
    event_id: string;
    event_type: string;
    actor_role: "client" | "freelancer" | "system";
    reason_code?: string;
    status_from?: string;
    status_to?: string;
    lifecycle_version?: number;
    occurred_at: string;
  }>;
};

export type ReconsiderationInvitation = {
  invitation_id: string;
  application_id: string;
  gig_id: string;
  viewer_role: "client" | "freelancer";
  status: string;
  reason_code: string;
  reason_explanation?: string;
  action_token: string;
  allowed_actions: string[];
  current_application_stage: string;
  previous_proposal: Record<string, unknown>;
  current_gig_terms: Record<string, unknown>;
  gig: { id: string; title: string; status: string };
};

export function isEngagement(value: unknown): value is Engagement {
  if (!isRecord(value)) return false;
  return (
    typeof value.engagement_id === "string" &&
    typeof value.gig_id === "string" &&
    (value.viewer_role === "client" || value.viewer_role === "freelancer") &&
    isStatus(value.status) &&
    typeof value.lifecycle_version === "number" &&
    typeof value.confirmed_at === "string" &&
    isRecord(value.gig) &&
    isRecord(value.client) &&
    isRecord(value.freelancer) &&
    isRecord(value.accepted_terms) &&
    typeof value.action_token === "string" &&
    Array.isArray(value.allowed_actions) &&
    value.allowed_actions.every((item) => typeof item === "string") &&
    Array.isArray(value.disclaimers)
  );
}

export function isEngagementList(value: unknown): value is EngagementList {
  return isRecord(value) && Array.isArray(value.items) &&
    value.items.every(isEngagement) && typeof value.count === "number";
}

export function isEngagementTimeline(value: unknown): value is EngagementTimeline {
  return isRecord(value) && typeof value.engagement_id === "string" &&
    Array.isArray(value.items) && value.items.every((item) =>
      isRecord(item) && typeof item.event_id === "string" &&
      typeof item.event_type === "string" && typeof item.occurred_at === "string"
    );
}

export function isReconsiderationInvitation(value: unknown): value is ReconsiderationInvitation {
  return isRecord(value) && typeof value.invitation_id === "string" &&
    typeof value.application_id === "string" &&
    (value.viewer_role === "client" || value.viewer_role === "freelancer") &&
    typeof value.status === "string" && typeof value.action_token === "string" &&
    Array.isArray(value.allowed_actions) && isRecord(value.previous_proposal) &&
    isRecord(value.current_gig_terms) && isRecord(value.gig);
}

function isStatus(value: unknown): value is EngagementStatus {
  return [
    "confirmed", "kickoff_pending", "in_progress", "completion_pending",
    "completed", "cancellation_pending", "cancelled",
  ].includes(String(value));
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
