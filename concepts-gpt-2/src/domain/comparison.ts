import { APPLICANTS, GIGS } from "./fixtures";
import type { ViewId } from "./types";

export const PROJECT_WEEKS = [
  { week: "W01–02", phase: "Audit", hours: 24, outcome: "Workflow and component inventory" },
  { week: "W03–05", phase: "Foundation", hours: 28, outcome: "Accessible system foundations" },
  { week: "W06–10", phase: "Migration", hours: 28, outcome: "Two investigator workflows" },
  { week: "W11–14", phase: "Adoption", hours: 24, outcome: "Workshops and handoff" },
] as const;

export const EVIDENCE_AXES = [
  { id: "required", label: "Required evidence" },
  { id: "gap", label: "Disclosed gap" },
  { id: "proposal", label: "Commercial proposal" },
  { id: "availability", label: "Availability" },
  { id: "version", label: "Record version" },
  { id: "stage", label: "Review stage" },
] as const;

export function scheduleLoad() {
  return PROJECT_WEEKS.reduce((sum, phase) => sum + phase.hours, 0);
}

export function alignmentStates(requirements: readonly string[], evidence: readonly string[]) {
  return requirements.map((requirement) => ({
    requirement,
    state: evidence.some((item) => item.toLowerCase() === requirement.toLowerCase()) ? "matched" as const : "gap" as const,
  }));
}

export function semanticDepth(view: ViewId): number {
  if (view === "home") return 0;
  if (view === "discover" || view === "review") return 1;
  if (view === "gig" || view === "candidate") return 2;
  if (view === "proposal" || view === "applications") return 3;
  if (view === "selection") return 4;
  return 5;
}

export function workflowBand(view: ViewId): "find" | "propose" | "review" | "confirm" | "work" {
  if (view === "home" || view === "discover" || view === "gig") return "find";
  if (view === "proposal" || view === "review") return "propose";
  if (view === "applications" || view === "candidate") return "review";
  if (view === "selection") return "confirm";
  return "work";
}

export function applicantFacet(applicantId: string, axisId: string): string {
  const applicant = APPLICANTS.find((item) => item.id === applicantId) ?? APPLICANTS[0];
  switch (axisId) {
    case "required": return `${applicant.match}/100 · ${applicant.skills.slice(0, 3).join(", ")}`;
    case "gap": return applicant.gap;
    case "proposal": return `${applicant.proposal} · ${applicant.timeline}`;
    case "availability": return applicant.availability;
    case "version": return `Application v${applicant.version}`;
    case "stage": return applicant.stage;
    default: return "Not available";
  }
}

export function opportunityFacet(gigId: string, axisId: string): string {
  const gig = GIGS.find((item) => item.id === gigId) ?? GIGS[0];
  switch (axisId) {
    case "required": return `${gig.match}/100 · ${gig.matchingSkills.slice(0, 3).join(", ")}`;
    case "gap": return gig.missingSkills[0] ?? "No disclosed gap";
    case "proposal": return gig.budget;
    case "availability": return `${gig.duration} · ${gig.commitment}`;
    case "version": return gig.id === "ternary-clinical" ? "Gig terms v3" : "Current terms";
    case "stage": return `Closes ${gig.deadline}`;
    default: return "Not available";
  }
}
