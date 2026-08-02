import { APPLICANTS, GIGS, TERMS } from "./fixtures";
import type { Role, ViewId, WorkflowState } from "./types";

export const FINAL_VIEWS: Record<Role, ViewId[]> = {
  freelancer: ["home", "discover", "gig", "proposal", "applications", "selection", "engagement"],
  client: ["home", "review", "candidate", "selection", "engagement"],
};

export function benchQueue(role: Role, state: WorkflowState) {
  const source = role === "client" ? APPLICANTS : GIGS;
  return source.map((record, index) => ({
    id: record.id,
    label: "name" in record ? record.name : record.company,
    title: "headline" in record ? record.headline : record.title,
    priority:
      index === 0
        ? state.selectionRequest?.status === "expired"
          ? "Renew authority"
          : state.selectionStatus === "pending"
            ? "Decision due"
            : "Primary"
        : index === 1
          ? "Next"
          : "Later",
  }));
}

export function evidenceRanking() {
  return [...APPLICANTS]
    .sort((first, second) => second.match - first.match)
    .map((applicant) => ({ id: applicant.id, match: applicant.match, proposal: applicant.proposal }));
}

export const PLAN_SEGMENTS = [
  { id: "audit", label: "Audit", start: 1, weeks: 2, amount: 0.8, hours: 24 },
  { id: "foundation", label: "Foundation", start: 3, weeks: 4, amount: 1.8, hours: 28 },
  { id: "migration", label: "Migration", start: 7, weeks: 5, amount: 2.2, hours: 30 },
  { id: "adoption", label: "Adoption", start: 12, weeks: 3, amount: 1, hours: 22 },
] as const;

export function measurePlan(capacity = 28) {
  const conflict = capacity < 26 || capacity > 30;
  return {
    segments: PLAN_SEGMENTS,
    amount: Number(
      PLAN_SEGMENTS.reduce((total, item) => total + item.amount, 0).toFixed(1),
    ),
    totalWeeks: Math.max(...PLAN_SEGMENTS.map((item) => item.start + item.weeks - 1)),
    capacity,
    conflict,
    conflictMessage: capacity < 26 ? "Delivery extends beyond 14 weeks" : capacity > 30 ? "Exceeds stated weekly availability" : "Plan fits the brief",
  };
}

export const CROSSCHECK_REQUIREMENTS = [
  { id: "react", label: "React systems", client: "Typed patterns across three products", freelancer: "Two reviewed platform systems", status: "supported" },
  { id: "typescript", label: "TypeScript", client: "Migration safety and typed workflows", freelancer: "Large typed migration record", status: "supported" },
  { id: "a11y", label: "WCAG 2.2", client: "Keyboard and screen-reader validation", freelancer: "AA audit and remediation matrix", status: "supported" },
  { id: "clinical", label: "Clinical trials", client: "Operational context preferred", freelancer: "Adjacent regulated-health work only", status: "gap" },
] as const;

export function crosscheckPoint(requirementIndex: number, version: number, state: WorkflowState) {
  const requirement = CROSSCHECK_REQUIREMENTS[Math.max(0, Math.min(requirementIndex, CROSSCHECK_REQUIREMENTS.length - 1))];
  const effective = version === state.applicationVersion;
  return {
    requirement,
    version,
    effective,
    authority:
      state.selectionRequest?.applicationVersion === version
        ? state.selectionRequest.status
        : version < state.applicationVersion
          ? "superseded"
          : "unrequested",
  };
}

export const ORBIT_DEPTHS = [
  { id: "market", label: "Market", view: "discover" as ViewId },
  { id: "brief", label: "Brief", view: "gig" as ViewId },
  { id: "application", label: "Application", view: "applications" as ViewId },
  { id: "authority", label: "Authority", view: "selection" as ViewId },
  { id: "engagement", label: "Engagement", view: "engagement" as ViewId },
] as const;

export function orbitDepthForView(view: ViewId) {
  const aliases: Partial<Record<ViewId, ViewId>> = { home: "discover", proposal: "applications", review: "discover", candidate: "gig" };
  const resolved = aliases[view] ?? view;
  const index = ORBIT_DEPTHS.findIndex((depth) => depth.view === resolved);
  return index < 0 ? 0 : index;
}

export function weaveJunctions(state: WorkflowState) {
  return [
    { id: "brief", from: "Gig terms v3", to: "Four requirements", state: "bound" },
    { id: "evidence", from: "Reviewed evidence", to: "Proposal promises", state: "bound" },
    {
      id: "authority",
      from: `Application v${state.selectionRequest?.applicationVersion ?? state.applicationVersion}`,
      to: "Selection authority",
      state: state.selectionRequest?.status ?? "unissued",
    },
    {
      id: "engagement",
      from: "Accepted exact terms",
      to: "Engagement",
      state: state.engagement ? "bound" : "waiting",
    },
    {
      id: "permission",
      from: "Engagement consent",
      to: state.contactPermission.revealed ? "Verified contact" : "Masked contact",
      state: state.contactPermission.revoked ? "severed" : state.contactPermission.consentActive ? "bound" : "waiting",
    },
  ] as const;
}

export function currentChannel(state: WorkflowState) {
  if (state.engagement) return "work";
  if (state.selectionStatus === "pending") return "confirm";
  if (state.selectionRequest?.status === "invalidated" || state.selectionRequest?.status === "expired") return "revision";
  if (state.applicationVersion > 0) return "review";
  return "find";
}

export function immutableTerms(state: WorkflowState) {
  return {
    proposal: state.engagement?.proposal ?? TERMS.proposal,
    duration: state.engagement?.duration ?? TERMS.timeline,
    capacity: state.engagement?.capacity ?? "28 hours/week",
    gigVersion: state.engagement?.gigVersion ?? state.gigVersion,
    applicationVersion: state.engagement?.applicationVersion ?? state.applicationVersion,
  };
}
