import { BASE_ACTIVITY } from "./fixtures";
import type {
  ActivityItem,
  ContactPermissionEvent,
  ScenarioPreset,
  SelectionRequestRecord,
  WorkflowAction,
  WorkflowState,
} from "./types";

const MOCK_NOW = "2026-07-27T16:42:00.000Z";
const SELECTED_APPLICATION_ID = "application-kavya";
const APPLICANT_IDS = ["application-kavya", "application-dev", "application-sana", "application-rohan"] as const;

function requestFor(
  version: number,
  deadline: "24" | "48" | "72" = "48",
  status: SelectionRequestRecord["status"] = "pending",
): SelectionRequestRecord {
  const requestedAt = new Date(MOCK_NOW);
  const expiresAt = new Date(requestedAt.getTime() + Number(deadline) * 60 * 60 * 1000);
  return {
    id: `selection-v${version}-${deadline}`,
    gigId: "ternary-clinical",
    applicationId: SELECTED_APPLICATION_ID,
    gigVersion: 3,
    applicationVersion: version,
    deadlineHours: deadline,
    requestedAt: requestedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status,
  };
}

export const INITIAL_STATE: WorkflowState = {
  schemaVersion: 2,
  role: "freelancer",
  applicationStage: "Selection pending",
  applicationVersion: 2,
  shortlisted: true,
  advanced: true,
  qaAnswered: true,
  revisionRequested: false,
  selectionStatus: "pending",
  selectionDeadline: "48",
  engagementStatus: "confirmed",
  contactShared: false,
  contactRevealed: false,
  contactRevoked: false,
  gigVersion: 3,
  gigStatus: "open",
  selectedApplicationId: SELECTED_APPLICATION_ID,
  selectionRequest: requestFor(2),
  applicantOutcomes: Object.fromEntries(APPLICANT_IDS.map((id) => [id, "active"])) as WorkflowState["applicantOutcomes"],
  engagement: null,
  contactPermission: {
    engagementId: null,
    consentActive: false,
    revealAuthorized: false,
    revealed: false,
    revoked: false,
    events: [],
  },
  toast: null,
  activity: BASE_ACTIVITY,
};

function activity(title: string, detail: string, actor: ActivityItem["actor"]): ActivityItem {
  return { id: crypto.randomUUID(), at: "Now", title, detail, actor };
}

function permissionEvent(kind: ContactPermissionEvent["kind"], actor: ContactPermissionEvent["actor"]): ContactPermissionEvent {
  return { id: crypto.randomUUID(), kind, at: MOCK_NOW, actor };
}

export function normalizeWorkflowState(saved?: Partial<WorkflowState> | null): WorkflowState {
  if (!saved) return INITIAL_STATE;
  const applicationVersion = saved.applicationVersion ?? INITIAL_STATE.applicationVersion;
  const inferredRequest =
    saved.selectionRequest ??
    (saved.selectionStatus === "none"
      ? null
      : requestFor(
          applicationVersion,
          saved.selectionDeadline ?? "48",
          saved.selectionStatus === "accepted" ? "accepted" : saved.selectionStatus === "invalidated" ? "invalidated" : "pending",
        ));
  return {
    ...INITIAL_STATE,
    ...saved,
    schemaVersion: 2,
    gigVersion: saved.gigVersion ?? 3,
    gigStatus: saved.gigStatus ?? (saved.selectionStatus === "accepted" ? "filled" : "open"),
    selectedApplicationId: saved.selectedApplicationId ?? SELECTED_APPLICATION_ID,
    selectionRequest: inferredRequest,
    applicantOutcomes: { ...INITIAL_STATE.applicantOutcomes, ...saved.applicantOutcomes },
    engagement:
      saved.engagement ??
      (saved.selectionStatus === "accepted"
        ? {
            id: "engagement-ternary-kavya",
            gigId: "ternary-clinical",
            applicationId: SELECTED_APPLICATION_ID,
            gigVersion: saved.gigVersion ?? 3,
            applicationVersion,
            acceptedAt: MOCK_NOW,
            proposal: "₹5.8L fixed",
            duration: "14 weeks",
            capacity: "28 hours/week",
          }
        : null),
    contactPermission: {
      ...INITIAL_STATE.contactPermission,
      ...saved.contactPermission,
      consentActive: saved.contactPermission?.consentActive ?? saved.contactShared ?? false,
      revealed: saved.contactPermission?.revealed ?? saved.contactRevealed ?? false,
      revoked: saved.contactPermission?.revoked ?? saved.contactRevoked ?? false,
      events: saved.contactPermission?.events ?? [],
    },
    toast: null,
  };
}

export function stateForPreset(preset: ScenarioPreset, role: WorkflowState["role"] = "freelancer"): WorkflowState {
  const baseline = { ...INITIAL_STATE, role, activity: BASE_ACTIVITY };
  if (preset === "baseline") return baseline;
  if (preset === "revision") {
    return { ...baseline, revisionRequested: true, selectionStatus: "pending" };
  }
  if (preset === "invalidated") {
    return {
      ...baseline,
      applicationVersion: 3,
      applicationStage: "Advanced",
      selectionStatus: "invalidated",
      selectionRequest: requestFor(2, "48", "invalidated"),
    };
  }
  if (preset === "expired") {
    return {
      ...baseline,
      selectionStatus: "invalidated",
      selectionRequest: {
        ...requestFor(2, "24", "expired"),
        expiresAt: "2026-07-27T15:00:00.000Z",
      },
    };
  }
  return workflowReducer(baseline, { type: "accept-selection" });
}

export function workflowReducer(state: WorkflowState, action: WorkflowAction): WorkflowState {
  switch (action.type) {
    case "set-role":
      return { ...state, role: action.role, toast: `Viewing as ${action.role}` };
    case "apply":
      return {
        ...state,
        applicationStage: "Under review",
        applicationVersion: 1,
        shortlisted: false,
        advanced: false,
        qaAnswered: false,
        revisionRequested: false,
        selectionStatus: "none",
        gigStatus: "open",
        selectionRequest: null,
        engagement: null,
        applicantOutcomes: { ...INITIAL_STATE.applicantOutcomes },
        toast: "Application version 1 recorded",
        activity: [activity("Application submitted", "Version 1 answered gig terms v3.", "freelancer"), ...state.activity],
      };
    case "toggle-shortlist":
      return {
        ...state,
        shortlisted: !state.shortlisted,
        toast: state.shortlisted ? "Removed from private shortlist" : "Added to private shortlist",
        activity: [
          activity(
            state.shortlisted ? "Removed from private shortlist" : "Added to private shortlist",
            "This review state remains private to the client.",
            "client",
          ),
          ...state.activity,
        ],
      };
    case "toggle-advance": {
      const advanced = !state.advanced;
      return {
        ...state,
        advanced,
        applicationStage: advanced ? "Advanced" : "Under review",
        selectionStatus: advanced ? state.selectionStatus : "none",
        toast: advanced ? "Applicant formally advanced" : "Returned to general review",
        activity: [
          activity(advanced ? "Applicant advanced" : "Returned to review", "Participant-visible stage updated.", "client"),
          ...state.activity,
        ],
      };
    }
    case "answer-qa":
      return {
        ...state,
        qaAnswered: true,
        toast: "Structured answer recorded",
        activity: [activity("Clarification answered", "The immutable Q&A record is now complete.", "freelancer"), ...state.activity],
      };
    case "request-revision":
      return {
        ...state,
        revisionRequested: true,
        toast: "Proposal revision requested",
        activity: [activity("Proposal revision requested", "Workshop scope clarification requested.", "client"), ...state.activity],
      };
    case "submit-revision":
      return {
        ...state,
        applicationVersion: state.applicationVersion + 1,
        revisionRequested: false,
        selectionStatus: state.selectionStatus === "pending" ? "invalidated" : state.selectionStatus,
        selectionRequest:
          state.selectionRequest?.status === "pending"
            ? { ...state.selectionRequest, status: "invalidated" }
            : state.selectionRequest,
        applicationStage: state.advanced ? "Advanced" : state.applicationStage,
        toast: "New immutable proposal version recorded",
        activity: [
          activity(
            `Application version ${state.applicationVersion + 1} submitted`,
            state.selectionStatus === "pending"
              ? "The previous selection request was invalidated; a fresh request is required."
              : "The official proposal now points to the new version.",
            "freelancer",
          ),
          ...state.activity,
        ],
      };
    case "send-selection":
      return {
        ...state,
        selectionStatus: "pending",
        selectionDeadline: action.deadline,
        selectionRequest: requestFor(state.applicationVersion, action.deadline),
        applicationStage: "Selection pending",
        toast: `Exact-version request sent for ${action.deadline} hours`,
        activity: [
          activity(
            "Fresh selection request sent",
            `Application v${state.applicationVersion} · gig terms v3 · expires in ${action.deadline} hours.`,
            "client",
          ),
          ...state.activity,
        ],
      };
    case "accept-selection":
      if (
        state.selectionStatus !== "pending" ||
        state.selectionRequest?.status !== "pending" ||
        state.selectionRequest.applicationVersion !== state.applicationVersion ||
        state.selectionRequest.gigVersion !== state.gigVersion ||
        state.selectionRequest.applicationId !== state.selectedApplicationId ||
        state.gigStatus !== "open" ||
        Date.parse(state.selectionRequest.expiresAt) <= Date.parse(MOCK_NOW)
      ) {
        return { ...state, toast: "No effective exact-version selection request is available" };
      }
      return {
        ...state,
        selectionStatus: "accepted",
        selectionRequest: { ...state.selectionRequest, status: "accepted" },
        applicationStage: "Confirmed",
        gigStatus: "filled",
        applicantOutcomes: Object.fromEntries(
          APPLICANT_IDS.map((id) => [id, id === state.selectedApplicationId ? "confirmed" : "not_selected"]),
        ) as WorkflowState["applicantOutcomes"],
        engagement: {
          id: "engagement-ternary-kavya",
          gigId: state.selectionRequest.gigId,
          applicationId: state.selectionRequest.applicationId,
          gigVersion: state.selectionRequest.gigVersion,
          applicationVersion: state.selectionRequest.applicationVersion,
          acceptedAt: MOCK_NOW,
          proposal: "₹5.8L fixed",
          duration: "14 weeks",
          capacity: "28 hours/week",
        },
        contactPermission: {
          ...state.contactPermission,
          engagementId: "engagement-ternary-kavya",
        },
        engagementStatus: "confirmed",
        toast: "Exact terms accepted · engagement confirmed",
        activity: [
          activity(
            "Engagement confirmed",
            `Application v${state.applicationVersion} accepted against gig terms v3. The gig is now filled.`,
            "system",
          ),
          ...state.activity,
        ],
      };
    case "share-contact":
      return {
        ...state,
        contactShared: true,
        contactRevoked: false,
        contactPermission: {
          ...state.contactPermission,
          engagementId: state.engagement?.id ?? "engagement-ternary-kavya",
          consentActive: true,
          revoked: false,
          events: [permissionEvent("consent", state.role), ...state.contactPermission.events],
        },
        toast: "Verified email shared for this engagement",
        activity: [activity("Contact permission added", "Verified email shared for this engagement only.", state.role), ...state.activity],
      };
    case "reveal-contact":
      if (
        !state.contactShared ||
        state.contactRevoked ||
        !state.contactPermission.consentActive ||
        state.contactPermission.revoked
      ) {
        return { ...state, toast: "Sharing consent is not active" };
      }
      return {
        ...state,
        contactRevealed: true,
        contactPermission: {
          ...state.contactPermission,
          revealAuthorized: true,
          revealed: true,
          events: [
            permissionEvent("reveal", state.role),
            permissionEvent("authorization", "system"),
            ...state.contactPermission.events,
          ],
        },
        toast: "Reveal authorized and recorded",
        activity: [activity("Shared email revealed", "Authorization and consent checked before reveal.", state.role), ...state.activity],
      };
    case "revoke-contact":
      return {
        ...state,
        contactRevoked: true,
        contactRevealed: false,
        contactPermission: {
          ...state.contactPermission,
          consentActive: false,
          revealed: false,
          revoked: true,
          events: [permissionEvent("revocation", state.role), ...state.contactPermission.events],
        },
        toast: "Future display stopped inside GigMatch",
        activity: [activity("Contact sharing revoked", "Previously viewed information cannot be erased.", state.role), ...state.activity],
      };
    case "advance-engagement": {
      const next = {
        confirmed: "kickoff_pending",
        kickoff_pending: "in_progress",
        in_progress: "completion_pending",
        completion_pending: "completed",
        completed: "completed",
      }[state.engagementStatus] as WorkflowState["engagementStatus"];
      return {
        ...state,
        engagementStatus: next,
        toast: next === "completed" ? "Completion confirmed" : `Engagement moved to ${next.replace("_", " ")}`,
        activity: [activity("Engagement status updated", next.replace("_", " "), state.role), ...state.activity],
      };
    }
    case "expire-selection":
      if (!state.selectionRequest || state.selectionRequest.status !== "pending") {
        return { ...state, toast: "No pending selection can expire" };
      }
      return {
        ...state,
        selectionStatus: "invalidated",
        applicationStage: state.advanced ? "Advanced" : state.applicationStage,
        selectionRequest: { ...state.selectionRequest, status: "expired" },
        toast: "Selection window expired · a fresh exact-version request is required",
        activity: [
          activity("Selection request expired", "No terms were accepted. Fresh authority is required.", "system"),
          ...state.activity,
        ],
      };
    case "load-preset":
      return { ...stateForPreset(action.preset, state.role), toast: `Loaded ${action.preset} comparison state` };
    case "dismiss-toast":
      return { ...state, toast: null };
    case "reset":
      return { ...INITIAL_STATE, role: state.role, activity: BASE_ACTIVITY };
    default:
      return state;
  }
}
