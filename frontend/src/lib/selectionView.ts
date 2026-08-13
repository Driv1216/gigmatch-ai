import type {
  SelectionContext,
  SelectionRequestDetail,
  SelectionRequestHistoryItem,
} from "./selectionContracts";

export const SELECTION_DURATION_OPTIONS = [24, 48, 72] as const;

export type SelectionOperation =
  | "send"
  | "cancel"
  | "accept"
  | "decline-remain"
  | "decline-withdraw"
  | "revised-terms";

export class SelectionOperationRegistry {
  private readonly values = new Map<string, string>();
  private readonly createId: () => string;

  constructor(createId: () => string) {
    this.createId = createId;
  }

  get(key: string): string {
    const existing = this.values.get(key);
    if (existing) return existing;
    const created = this.createId();
    this.values.set(key, created);
    return created;
  }

  settle(key: string): void {
    this.values.delete(key);
  }

  reset(): void {
    this.values.clear();
  }
}

export function selectionAuthorityLabels(
  context: SelectionContext,
  request: SelectionRequestDetail | null,
): { application: string; request: string } {
  return {
    application: `Application · ${humanize(context.application_stage)}`,
    request: `Selection request · ${request ? humanize(request.status) : "Not sent"}`,
  };
}

export function versionBoundary(
  bound: number,
  current: number,
  noun: "Application" | "Material gig",
): { bound: string; current: string | null; changed: boolean } {
  const changed = bound !== current;
  return {
    bound: `${noun} v${bound}`,
    current: changed ? `Current ${noun.toLowerCase()} is v${current}` : null,
    changed,
  };
}

export function selectionHistoryConsequence(item: SelectionRequestHistoryItem): string {
  if (item.status === "accepted") return "Exact terms accepted and engagement confirmed.";
  if (item.status === "revision_requested") return "Revised terms requested; application remains Advanced.";
  if (item.status === "declined" && item.decline_disposition === "withdraw_completely") {
    return "Declined and application withdrawn.";
  }
  if (item.status === "declined") return "Declined; application remains Advanced.";
  if (item.status === "cancelled") return "Cancelled by the client; application unchanged.";
  if (item.status === "expired") return "Response window expired by server authority.";
  if (item.status === "invalidated") return "Frozen terms were invalidated by a material version change.";
  return "Awaiting an authoritative freelancer response.";
}

export function operationKey(
  operation: SelectionOperation,
  aggregateId: string,
  meaningfulInput: unknown,
): string {
  return `${operation}:${aggregateId}:${stableValue(meaningfulInput)}`;
}

export function informationalRemaining(
  expiresAt: string,
  authoritativeNow: string,
  elapsedMilliseconds: number,
): { reached: boolean; label: string } {
  const remaining = new Date(expiresAt).getTime()
    - new Date(authoritativeNow).getTime()
    - Math.max(0, elapsedMilliseconds);
  if (!Number.isFinite(remaining) || remaining <= 0) {
    return { reached: true, label: "Response window reached · checking server authority" };
  }
  const totalMinutes = Math.ceil(remaining / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { reached: false, label: `${hours}h ${minutes}m remaining (informational)` };
}

export function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function structuredValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not specified";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" || typeof value === "number") return String(value).replace(/_/g, " ");
  if (Array.isArray(value)) return value.map(structuredValue).join(" · ") || "None";
  if (typeof value === "object") {
    return Object.entries(value).map(([key, item]) => (
      `${humanize(key)}: ${structuredValue(item)}`
    )).join(" · ") || "None";
  }
  return "Not specified";
}

function stableValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${key}:${stableValue(item)}`).join(",")}}`;
  }
  return String(value ?? "");
}
