import { GIGS } from "../../domain/fixtures";
import { PROJECT_WEEKS } from "../../domain/comparison";
import type { WorkflowState } from "../../domain/types";

export const HARBOR_CAPACITY = {
  available: 32,
  committed: 28,
  buffer: 4,
} as const;

export function harborActions(state: Pick<WorkflowState, "selectionStatus" | "revisionRequested" | "qaAnswered">) {
  const actions = [
    { id: "deadline", label: "Ternary application closes", urgency: 3, at: "07 Aug · 18:00" },
    { id: "qa", label: state.qaAnswered ? "Clarification answered" : "Answer structured clarification", urgency: state.qaAnswered ? 0 : 4, at: "Today" },
    { id: "revision", label: state.revisionRequested ? "Submit requested revision" : "Proposal scope current", urgency: state.revisionRequested ? 5 : 0, at: "Today" },
    { id: "selection", label: state.selectionStatus === "pending" ? "Respond to exact selection" : "Selection requires client action", urgency: state.selectionStatus === "pending" ? 6 : 2, at: "31h remaining" },
  ];
  return actions.sort((a, b) => b.urgency - a.urgency);
}

export function harborSchedule() {
  return PROJECT_WEEKS.map((phase, index) => ({
    ...phase,
    start: [10, 24, 14, 19][index],
    month: ["Aug", "Aug", "Sep", "Oct"][index],
    capacity: `${phase.hours}/28h`,
  }));
}

export function capacityConflict(hours: number, available = HARBOR_CAPACITY.available) {
  return {
    hours,
    available,
    buffer: Math.max(available - hours, 0),
    conflict: hours > available,
  };
}

export function deadlineOrder() {
  return [...GIGS].sort((a, b) => {
    const dayA = Number(a.deadline.slice(0, 2));
    const dayB = Number(b.deadline.slice(0, 2));
    return dayA - dayB;
  });
}
