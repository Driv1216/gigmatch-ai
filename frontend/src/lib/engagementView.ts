import type {
  Engagement,
  EngagementAction,
  EngagementStatus,
  ReconsiderationStatus,
} from "./engagementContracts";

export type EngagementOperation = EngagementAction | "create_reconsideration" | "cancel_reconsideration" | "reaffirm_reconsideration" | "decline_reconsideration" | "submit_reconsideration_update";

export class EngagementOperationRegistry {
  private readonly values = new Map<string, string>();
  private readonly createId: () => string;

  constructor(createId: () => string) {
    this.createId = createId;
  }

  get(operation: EngagementOperation, aggregateId: string, meaningfulInput: unknown): string {
    const key = operationKey(operation, aggregateId, meaningfulInput);
    const existing = this.values.get(key);
    if (existing) return existing;
    const created = this.createId();
    this.values.set(key, created);
    return created;
  }

  settle(operation: EngagementOperation, aggregateId: string, meaningfulInput: unknown): void {
    this.values.delete(operationKey(operation, aggregateId, meaningfulInput));
  }

  reset(): void { this.values.clear(); }
}

export function engagementCollection(items: Engagement[]) {
  return {
    active: items.filter((item) => !isTerminalEngagement(item.status)),
    historical: items.filter((item) => isTerminalEngagement(item.status)),
  };
}

export function isTerminalEngagement(status: EngagementStatus): boolean {
  return status === "completed" || status === "cancelled";
}

export function engagementStatusCopy(engagement: Engagement): string {
  const copy: Record<EngagementStatus, string> = {
    confirmed: "Exact selection terms were accepted. Kickoff has not yet been prepared.",
    kickoff_pending: "The participants are preparing to begin.",
    in_progress: "Work has been reported as started by a participant.",
    completion_pending: "Completion was requested and awaits the other participant’s decision.",
    completed: "Both-party lifecycle authority reached Completed. This is a participant-reported product status.",
    cancellation_pending: "Cancellation was requested and awaits withdrawal or counterparty acknowledgement.",
    cancelled: engagement.reopened
      ? "The engagement remains Cancelled. Its gig was reopened separately with intake kept closed."
      : "The engagement ended before completion. Its accepted terms and history remain immutable.",
  };
  return copy[engagement.status];
}

export function lifecycleActionPresentation(action: EngagementAction): { label: string; consequence: string; terminal?: boolean } {
  return {
    prepare_kickoff: { label: "Prepare for Kickoff", consequence: "Move this engagement from Confirmed to Kickoff Pending." },
    start_work: { label: "Mark Work Started", consequence: "Report work as started and move the engagement to In Progress." },
    request_completion: { label: "Request Completion", consequence: "Move to Completion Pending. The other participant must confirm or return it to In Progress." },
    confirm_completion: { label: "Confirm Completion", consequence: "Move this engagement to terminal Completed status. GigMatch does not verify work quality or payment.", terminal: true },
    reject_completion: { label: "Return to In Progress", consequence: "Reject the pending completion request and return the engagement to In Progress." },
    request_cancellation: { label: "Request Cancellation", consequence: "Move to Cancellation Pending. The other participant must acknowledge it, or you may withdraw the request." },
    withdraw_cancellation: { label: "Withdraw Cancellation Request", consequence: "Return to the exact active status held before cancellation was requested." },
    acknowledge_cancellation: { label: "Acknowledge Cancellation", consequence: "Move this engagement to terminal Cancelled status while preserving all accepted terms and history.", terminal: true },
    reopen_gig: { label: "Reopen Gig · Keep Intake Closed", consequence: "Reopen the gig after this failed engagement. The engagement stays Cancelled, the historical winner stays Confirmed, and no previous applicant is reactivated.", terminal: true },
  }[action];
}

export function reconsiderationStatusConsequence(status: ReconsiderationStatus): string {
  return {
    pending: "Awaiting the freelancer’s deliberate response.",
    accepted: "Accepted through a fresh immutable reconsideration proposal version; the application returned to Under Review.",
    declined: "Invitation declined. The application stage and history were unchanged.",
    cancelled: "Invitation cancelled by the client. The application was unchanged.",
    superseded: "A material gig or ordinary application-version change superseded this invitation.",
    closed_by_gig_state: "A later gig or selection outcome closed this invitation.",
  }[status];
}

export function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function structuredValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not specified";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" || typeof value === "number") return String(value).replace(/_/g, " ");
  if (Array.isArray(value)) return value.map(structuredValue).join(" · ") || "None";
  if (typeof value === "object") return Object.entries(value)
    .map(([key, item]) => `${humanize(key)}: ${structuredValue(item)}`).join(" · ") || "None";
  return "Not specified";
}

export function engagementErrorMessage(value: unknown): string {
  const code = value instanceof Error ? value.message.replace(/ /g, "_").toLocaleLowerCase() : "";
  const messages: Record<string, string> = {
    stale_engagement_action: "The engagement changed. Current authority was refreshed; review it before a fresh attempt.",
    stale_reopening_action: "Gig reopening authority changed. The current cancelled-engagement state was refreshed.",
    stale_reconsideration_action: "The invitation or bound terms changed. Review the refreshed authority before trying again.",
    invalid_engagement_transition: "That lifecycle transition is no longer available.",
    self_resolution_not_allowed: "The participant who requested completion cannot resolve their own request.",
    self_acknowledgement_not_allowed: "The participant who requested cancellation cannot acknowledge their own request.",
    gig_reopen_not_allowed: "This cancelled engagement is not eligible for one-time Gig Reopening.",
    reconsideration_not_allowed: "This application is not currently eligible for reconsideration.",
    idempotency_conflict: "This operation identity was already used for a different action. Review current authority before a fresh attempt.",
  };
  return messages[code] ?? (value instanceof Error ? value.message : "The engagement service is unavailable.");
}

function operationKey(operation: EngagementOperation, aggregateId: string, meaningfulInput: unknown): string {
  return `${operation}:${aggregateId}:${stableValue(meaningfulInput)}`;
}

function stableValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${key}:${stableValue(child)}`).join(",")}}`;
  return String(value ?? "");
}
