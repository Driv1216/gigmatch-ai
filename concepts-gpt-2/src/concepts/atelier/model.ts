import { EVIDENCE_ARTIFACTS } from "../../domain/expansion";
import type { ViewId } from "../../domain/types";

const DEPTH: Record<ViewId, number> = {
  home: 0,
  discover: 1,
  review: 1,
  gig: 2,
  candidate: 2,
  proposal: 3,
  applications: 3,
  selection: 4,
  engagement: 5,
};

export function atelierDepth(view: ViewId) {
  return DEPTH[view] ?? 0;
}

export function atelierTrail(view: ViewId) {
  const rolePath = view === "review" || view === "candidate" ? ["Market", "Brief", "Applicant"] : ["Market", "Brief", "Application"];
  const tail = view === "selection" ? ["Exact terms"] : view === "engagement" ? ["Exact terms", "Engagement"] : [];
  return [...rolePath.slice(0, Math.max(1, Math.min(atelierDepth(view) + 1, 3))), ...tail];
}

export function atelierCoverage(required: readonly string[]) {
  return required.map((requirement) => {
    const artifact = EVIDENCE_ARTIFACTS.find((item) =>
      item.proves.some((proof) => proof.toLowerCase() === requirement.toLowerCase()),
    );
    return {
      requirement,
      artifact: artifact?.title ?? "No reviewed artifact",
      room: artifact?.room ?? "05",
      supported: Boolean(artifact),
    };
  });
}

export function unsupportedPromises(promises: readonly string[], supported: readonly string[]) {
  return promises.filter((promise) => !supported.some((item) => item.toLowerCase() === promise.toLowerCase()));
}
