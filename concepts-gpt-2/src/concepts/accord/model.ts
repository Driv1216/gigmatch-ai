import type { WorkflowState } from "../../domain/types";

export type AccordState = "aligned" | "open" | "gap" | "changed";

export function accordAlignment(requirements: readonly string[], evidence: readonly string[]) {
  return requirements.map((requirement) => {
    const covered = evidence.some((item) => item.toLowerCase() === requirement.toLowerCase());
    return {
      requirement,
      evidence: covered ? evidence.find((item) => item.toLowerCase() === requirement.toLowerCase()) ?? requirement : "No reviewed artifact",
      state: covered ? "aligned" as AccordState : "gap" as AccordState,
    };
  });
}

export function proposalRedline(version: number) {
  return [
    { field: "Fixed proposal", before: version > 1 ? "₹5.6L" : "—", after: "₹5.8L", changed: version > 1 },
    { field: "Workshops", before: version > 1 ? "Two included" : "—", after: "Four included", changed: version > 1 },
    { field: "Delivery", before: "14 weeks", after: "14 weeks", changed: false },
    { field: "Capacity", before: "28 hours/week", after: "28 hours/week", changed: false },
  ];
}

export function accordDecision(state: Pick<WorkflowState, "selectionStatus" | "applicationVersion" | "qaAnswered">) {
  return {
    exactVersion: `Application v${state.applicationVersion} ↔ Gig terms v3`,
    questions: state.qaAnswered ? 0 : 1,
    authority:
      state.selectionStatus === "pending"
        ? "Awaiting specialist acknowledgement"
        : state.selectionStatus === "accepted"
          ? "Mutually acknowledged"
          : "Client must issue fresh terms",
    reconciled: state.selectionStatus === "accepted",
  };
}
