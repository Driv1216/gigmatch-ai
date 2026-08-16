import type {
  AttentionItem,
  AttentionKind,
  ClientDashboard,
  FreelancerDashboard,
} from "./dashboardContracts";

export type DashboardViewState = "loading" | "error" | "empty" | "ready";
export type DashboardRole = "client" | "freelancer";
export type DashboardHeaderContext = {
  eyebrow: string;
  title: string;
  detail: string;
};

type DashboardAttentionCounts = {
  attention: {
    attention_action_count: number;
    attention_resource_count: number;
  };
};

const actionPriority: Record<AttentionKind, number> = {
  engagement_response_required: 1,
  selection_response_required: 2,
  reconsideration_response_required: 3,
  revision_request_response_required: 4,
  qa_response_required: 5,
  updated_gig_response_required: 6,
};

export function dashboardViewState(
  loading: boolean,
  error: string | null,
  data: ClientDashboard | FreelancerDashboard | null,
): DashboardViewState {
  if (loading) return "loading";
  if (error) return "error";
  if (!data) return "error";
  const summary = data.summary;
  const hasWorkflow = Object.values(summary).some((value) => value > 0);
  return hasWorkflow ? "ready" : "empty";
}

export function dashboardHeaderContext(
  role: DashboardRole,
  state: DashboardViewState,
  data: DashboardAttentionCounts | null,
): DashboardHeaderContext {
  const eyebrow = role === "freelancer" ? "Freelancer dashboard" : "Client dashboard";

  if (state === "loading") {
    return {
      eyebrow,
      title: "Response summary loading",
      detail: "Current response counts will appear when the dashboard is ready.",
    };
  }

  if (state === "error" || !data) {
    return {
      eyebrow,
      title: "Response summary unavailable",
      detail: "Current response counts could not be loaded.",
    };
  }

  const actions = data.attention.attention_action_count;
  const resources = data.attention.attention_resource_count;
  return {
    eyebrow,
    title: `${actions} response action${actions === 1 ? "" : "s"}`,
    detail: `Across ${resources} workflow resource${resources === 1 ? "" : "s"}.`,
  };
}

export function attentionDestination(role: DashboardRole, item: AttentionItem): string {
  if (item.action_kind === "engagement_response_required") {
    return `/engagements/${encodeURIComponent(item.resource_id)}`;
  }
  if (role === "client") {
    return `/gigs/${encodeURIComponent(item.gig_id)}/applicants/${encodeURIComponent(item.application_id ?? "")}`;
  }
  return `/applications/${encodeURIComponent(item.application_id ?? "")}`;
}

export function attentionLabel(kind: AttentionKind): string {
  const labels: Record<AttentionKind, string> = {
    updated_gig_response_required: "Respond to updated gig terms",
    qa_response_required: "Respond to Q&A",
    revision_request_response_required: "Review revision request",
    selection_response_required: "Respond to selection request",
    reconsideration_response_required: "Respond to reconsideration",
    engagement_response_required: "Resolve engagement step",
  };
  return labels[kind];
}

export function compareAttention(left: AttentionItem, right: AttentionItem): number {
  if (left.deadline_at && right.deadline_at) {
    const deadline = left.deadline_at.localeCompare(right.deadline_at);
    if (deadline !== 0) return deadline;
  } else if (left.deadline_at) return -1;
  else if (right.deadline_at) return 1;
  const priority = actionPriority[left.action_kind] - actionPriority[right.action_kind];
  if (priority !== 0) return priority;
  const activity = right.latest_activity_at.localeCompare(left.latest_activity_at);
  return activity || left.resource_id.localeCompare(right.resource_id);
}

export function formatWorkflowStatus(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}

export function formatDashboardDate(value: string | null): string {
  if (!value) return "No deadline";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}
