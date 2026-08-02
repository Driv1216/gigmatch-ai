import type { Role, ViewId, WorkflowState } from "./types";

export const QUOTE_LINES = [
  { id: "audit", label: "Audit", weeks: "01–02", amount: 80000, outcome: "Workflow and component inventory" },
  { id: "foundation", label: "Foundation", weeks: "03–05", amount: 170000, outcome: "Accessible system foundations" },
  { id: "migration", label: "Migration", weeks: "06–10", amount: 240000, outcome: "Two investigator workflows" },
  { id: "adoption", label: "Adoption", weeks: "11–14", amount: 90000, outcome: "Four workshops and handoff" },
] as const;

export const EVIDENCE_ARTIFACTS = [
  { id: "system", room: "01", title: "Atlas Design System", kind: "Reviewed case study", proves: ["React", "Design systems", "Storybook"], note: "42 accessible components adopted across three products." },
  { id: "migration", room: "02", title: "Typed Migration Record", kind: "Delivery record", proves: ["TypeScript", "React"], note: "Four product surfaces moved to strict typed foundations." },
  { id: "access", room: "03", title: "Accessibility Matrix", kind: "Validation evidence", proves: ["WCAG 2.2", "Screen readers"], note: "NVDA and VoiceOver coverage attached to representative workflows." },
  { id: "workshops", room: "04", title: "Adoption Workshop Plan", kind: "Proposal evidence", proves: ["Design systems", "Facilitation"], note: "Four structured sessions with owners, recordings, and handoff." },
  { id: "gap", room: "05", title: "Clinical-trial Evidence", kind: "Disclosed absence", proves: [], note: "No direct clinical-trial delivery artifact is claimed." },
] as const;

export const COMMANDS = [
  { input: "open ternary", view: "gig" as ViewId, role: "freelancer" as Role, label: "Open Ternary brief" },
  { input: "compare applicants", view: "review" as ViewId, role: "client" as Role, label: "Compare applicants" },
  { input: "revise proposal", view: "proposal" as ViewId, role: "freelancer" as Role, label: "Revise proposal" },
  { input: "review selection", view: "selection" as ViewId, role: null, label: "Review exact selection" },
  { input: "open engagement", view: "engagement" as ViewId, role: null, label: "Open engagement" },
] as const;

export const TRACE_CHAINS = [
  { id: "react", source: "Gig terms v3", claim: "React required", evidence: "Atlas Design System", consequence: "Requirement covered" },
  { id: "type", source: "Gig terms v3", claim: "TypeScript required", evidence: "Typed Migration Record", consequence: "Requirement covered" },
  { id: "access", source: "Gig terms v3", claim: "WCAG 2.2 required", evidence: "Accessibility Matrix", consequence: "Requirement covered" },
  { id: "gap", source: "Kavya’s reviewed work", claim: "Clinical-trial domain", evidence: "No direct artifact", consequence: "Disclosed gap" },
] as const;

export function quoteTotal(lines: readonly { amount: number }[] = QUOTE_LINES): number {
  return lines.reduce((total, line) => total + line.amount, 0);
}

export function laneForState(state: Pick<WorkflowState, "applicationStage" | "selectionStatus">): "find" | "propose" | "review" | "confirm" | "work" {
  if (state.selectionStatus === "accepted" || state.applicationStage === "Confirmed") return "work";
  if (state.selectionStatus === "pending") return "confirm";
  if (state.selectionStatus === "invalidated") return "review";
  if (state.applicationStage === "Draft") return "propose";
  return "review";
}

export function resolveCommand(raw: string) {
  const input = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (input === "switch client") return { kind: "role" as const, role: "client" as Role };
  if (input === "switch freelancer") return { kind: "role" as const, role: "freelancer" as Role };
  if (input === "reset scenario" || input === "reset") return { kind: "reset" as const };
  const command = COMMANDS.find((item) => item.input === input);
  return command ? { kind: "route" as const, ...command } : { kind: "invalid" as const, suggestions: COMMANDS.slice(0, 3) };
}

export function artifactCoverage(required: readonly string[]) {
  return required.map((skill) => {
    const artifact = EVIDENCE_ARTIFACTS.find((item) => item.proves.some((proof) => proof.toLowerCase() === skill.toLowerCase()));
    return { skill, artifact: artifact?.title ?? null, covered: Boolean(artifact) };
  });
}

export function selectionTrace(version: number, status: WorkflowState["selectionStatus"]) {
  return [
    { label: "Gig terms", value: "v3", state: "source" },
    { label: "Application", value: `v${version}`, state: "source" },
    { label: "Selection", value: status, state: status === "invalidated" ? "broken" : "effective" },
    { label: "Engagement", value: status === "accepted" ? "created" : "not created", state: status === "accepted" ? "effective" : "waiting" },
  ] as const;
}
