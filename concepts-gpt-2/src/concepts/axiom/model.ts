import type { Role, ViewId, WorkflowState } from "../../domain/types";

export type AxiomPhase = "market" | "evidence" | "promise" | "authority" | "work";
export type AxiomAuthorityStatus = "unissued" | "pending" | "invalidated" | "expired" | "accepted";

export interface AxiomSceneDescriptor {
  view: ViewId;
  role: Role;
  phase: AxiomPhase;
  phaseIndex: number;
  focusedRecord: number;
  evidenceFit: number;
  verifiedFacets: number;
  gapFacets: number;
  versionShells: number;
  authorityStatus: AxiomAuthorityStatus;
  authorityOffset: number;
  authorityOpacity: number;
  engagementClosure: number;
  permissionMarkers: 0 | 1 | 2 | 3;
  accent: "cyan" | "amber" | "coral" | "muted";
  camera: readonly [number, number, number];
  summary: string;
}

const PHASES: AxiomPhase[] = ["market", "evidence", "promise", "authority", "work"];

const VIEW_PHASE: Record<ViewId, AxiomPhase> = {
  home: "market",
  discover: "market",
  review: "market",
  gig: "evidence",
  candidate: "evidence",
  proposal: "promise",
  applications: "promise",
  selection: "authority",
  engagement: "work",
};

const VIEW_CAMERA: Record<ViewId, readonly [number, number, number]> = {
  home: [0, 0.25, 8.8],
  discover: [-1.25, 0.45, 8.15],
  review: [1.25, 0.45, 8.15],
  gig: [-2.4, 0.5, 7.2],
  candidate: [2.4, 0.5, 7.2],
  proposal: [-1.4, -0.25, 6.65],
  applications: [1.4, -0.25, 6.65],
  selection: [0, 0.1, 6.1],
  engagement: [0, 0.2, 5.5],
};

const FREELANCER_MATCHES = [92, 86, 81];
const CLIENT_MATCHES = [92, 87, 84, 79];

export function axiomPhaseForView(view: ViewId): AxiomPhase {
  return VIEW_PHASE[view];
}

export function axiomViewForPhase(role: Role, phase: AxiomPhase): ViewId {
  const freelancer: ViewId[] = ["discover", "gig", "applications", "selection", "engagement"];
  const client: ViewId[] = ["review", "candidate", "candidate", "selection", "engagement"];
  return (role === "client" ? client : freelancer)[PHASES.indexOf(phase)];
}

function permissionMarkers(state: WorkflowState): 0 | 1 | 2 | 3 {
  if (state.contactPermission.revoked) return 3;
  if (state.contactPermission.revealed) return 2;
  if (state.contactPermission.consentActive) return 1;
  return 0;
}

function authorityStatus(state: WorkflowState): AxiomAuthorityStatus {
  return state.selectionRequest?.status ?? (state.selectionStatus === "accepted" ? "accepted" : "unissued");
}

export function createAxiomSceneDescriptor(
  state: WorkflowState,
  view: ViewId,
  role: Role,
  focusedRecord = 0,
): AxiomSceneDescriptor {
  const matches = role === "client" ? CLIENT_MATCHES : FREELANCER_MATCHES;
  const safeFocus = Math.max(0, Math.min(matches.length - 1, focusedRecord));
  const evidenceFit = matches[safeFocus];
  const status = authorityStatus(state);
  const phase = axiomPhaseForView(view);
  const phaseIndex = PHASES.indexOf(phase);
  const invalid = status === "invalidated" || status === "expired";
  const accepted = status === "accepted" || Boolean(state.engagement);

  return {
    view,
    role,
    phase,
    phaseIndex,
    focusedRecord: safeFocus,
    evidenceFit,
    verifiedFacets: Math.max(3, Math.min(6, Math.round(evidenceFit / 17))),
    gapFacets: 1,
    versionShells: Math.max(1, Math.min(4, state.applicationVersion)),
    authorityStatus: status,
    authorityOffset: status === "pending" || accepted ? 0 : invalid ? .48 : .2,
    authorityOpacity: status === "expired" ? .24 : status === "unissued" ? .5 : 1,
    engagementClosure: accepted ? 1 : 0,
    permissionMarkers: permissionMarkers(state),
    accent: invalid ? "coral" : accepted || status === "pending" ? "cyan" : phase === "evidence" ? "amber" : "muted",
    camera: VIEW_CAMERA[view],
    summary: invalid
      ? `${status} authority: application version ${state.applicationVersion} no longer aligns with the recorded request.`
      : accepted
        ? `Accepted authority is locked to application version ${state.applicationVersion} and gig version ${state.gigVersion}.`
        : status === "pending"
          ? `Pending authority aligns application version ${state.applicationVersion} with gig version ${state.gigVersion}.`
          : `${evidenceFit}% evidence fit with one disclosed domain gap.`,
  };
}
