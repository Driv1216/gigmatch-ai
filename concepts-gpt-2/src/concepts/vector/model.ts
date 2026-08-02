import type { Role, ViewId, WorkflowState } from "../../domain/types";

const VECTOR_COMMANDS = [
  { aliases: ["market", "find work", "open market"], view: "discover" as ViewId, role: "freelancer" as Role, label: "Open opportunity field" },
  { aliases: ["ternary", "open brief", "open ternary"], view: "gig" as ViewId, role: "freelancer" as Role, label: "Open Ternary brief" },
  { aliases: ["application", "my application"], view: "applications" as ViewId, role: "freelancer" as Role, label: "Open application record" },
  { aliases: ["compare", "compare applicants"], view: "review" as ViewId, role: "client" as Role, label: "Compare applicants" },
  { aliases: ["kavya", "open kavya"], view: "candidate" as ViewId, role: "client" as Role, label: "Inspect Kavya Menon" },
  { aliases: ["selection", "review selection"], view: "selection" as ViewId, role: null, label: "Review exact selection" },
  { aliases: ["engagement", "open engagement"], view: "engagement" as ViewId, role: null, label: "Open engagement" },
] as const;

export function resolveVectorCommand(raw: string) {
  const value = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (value === "switch client") return { kind: "role" as const, role: "client" as Role };
  if (value === "switch freelancer") return { kind: "role" as const, role: "freelancer" as Role };
  if (value === "reset" || value === "reset scenario") return { kind: "reset" as const };
  const match = VECTOR_COMMANDS.find((command) => command.aliases.includes(value as never));
  if (match) return { kind: "route" as const, view: match.view, role: match.role, label: match.label };
  const suggestions = VECTOR_COMMANDS.filter((command) => command.aliases.some((alias) => alias.includes(value) || value.includes(alias.split(" ")[0]))).slice(0, 3);
  return { kind: "invalid" as const, suggestions: suggestions.length ? suggestions : VECTOR_COMMANDS.slice(0, 3) };
}

export function vectorSelectionPath(state: Pick<WorkflowState, "applicationVersion" | "selectionStatus">) {
  const broken = state.selectionStatus === "invalidated";
  return [
    { id: "brief", source: "Gig terms v3", consequence: "Four requirements fixed", state: "verified" },
    { id: "application", source: `Application v${state.applicationVersion}`, consequence: "Evidence and ₹5.8L terms recorded", state: "verified" },
    { id: "selection", source: `Selection · ${state.selectionStatus}`, consequence: broken ? "Fresh client authority required" : "Exact versions bound", state: broken ? "broken" : "verified" },
    { id: "engagement", source: "Engagement EN.001", consequence: state.selectionStatus === "accepted" ? "Created atomically" : "Not yet authorized", state: state.selectionStatus === "accepted" ? "verified" : "waiting" },
  ] as const;
}

export function contactLineage(state: Pick<WorkflowState, "contactShared" | "contactRevealed" | "contactRevoked">) {
  return [
    { label: "Consent", complete: state.contactShared },
    { label: "Authorization", complete: state.contactShared && !state.contactRevoked },
    { label: "Display", complete: state.contactRevealed },
    { label: "Revocation", complete: state.contactRevoked },
  ];
}
