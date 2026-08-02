export type Role = "freelancer" | "client";
export type ConceptId =
  | "northline"
  | "covenant"
  | "waypoint"
  | "relay"
  | "monument"
  | "tempo"
  | "duet"
  | "aperture"
  | "facet"
  | "fold"
  | "tally"
  | "lane"
  | "command"
  | "proofroom"
  | "trace"
  | "harbor"
  | "accord"
  | "vector"
  | "atelier"
  | "index"
  | "bench"
  | "measure"
  | "crosscheck"
  | "orbit"
  | "weave"
  | "current";
export type ViewId =
  | "home"
  | "discover"
  | "gig"
  | "proposal"
  | "applications"
  | "review"
  | "candidate"
  | "selection"
  | "engagement";

export type PaymentType = "fixed" | "hourly" | "open";

export interface Gig {
  id: string;
  title: string;
  company: string;
  category: string;
  summary: string;
  workMode: string;
  location: string;
  posted: string;
  deadline: string;
  duration: string;
  commitment: string;
  paymentType: PaymentType;
  budget: string;
  requiredSkills: string[];
  preferredSkills: string[];
  deliverables: string[];
  match: number;
  matchLabel: string;
  matchReason: string;
  matchingSkills: string[];
  missingSkills: string[];
  applicants: number;
}

export interface Applicant {
  id: string;
  name: string;
  initials: string;
  headline: string;
  location: string;
  experience: string;
  availability: string;
  match: number;
  proposal: string;
  timeline: string;
  version: number;
  stage: "Under review" | "Advanced";
  shortlisted: boolean;
  skills: string[];
  gap: string;
  note: string;
}

export interface ActivityItem {
  id: string;
  at: string;
  title: string;
  detail: string;
  actor: "client" | "freelancer" | "system";
}

export type ScenarioPreset = "baseline" | "revision" | "invalidated" | "expired" | "engaged";
export type SelectionRecordStatus = "pending" | "invalidated" | "expired" | "accepted";
export type ApplicantOutcome = "active" | "confirmed" | "not_selected";

export interface SelectionRequestRecord {
  id: string;
  gigId: string;
  applicationId: string;
  gigVersion: number;
  applicationVersion: number;
  deadlineHours: "24" | "48" | "72";
  requestedAt: string;
  expiresAt: string;
  status: SelectionRecordStatus;
}

export interface EngagementRecord {
  id: string;
  gigId: string;
  applicationId: string;
  gigVersion: number;
  applicationVersion: number;
  acceptedAt: string;
  proposal: string;
  duration: string;
  capacity: string;
}

export interface ContactPermissionEvent {
  id: string;
  kind: "consent" | "authorization" | "reveal" | "revocation";
  at: string;
  actor: Role | "system";
}

export interface ContactPermissionRecord {
  engagementId: string | null;
  consentActive: boolean;
  revealAuthorized: boolean;
  revealed: boolean;
  revoked: boolean;
  events: ContactPermissionEvent[];
}

export interface WorkflowState {
  schemaVersion: 2;
  role: Role;
  applicationStage: "Draft" | "Under review" | "Advanced" | "Selection pending" | "Confirmed";
  applicationVersion: number;
  shortlisted: boolean;
  advanced: boolean;
  qaAnswered: boolean;
  revisionRequested: boolean;
  selectionStatus: "none" | "pending" | "invalidated" | "accepted";
  selectionDeadline: "24" | "48" | "72";
  engagementStatus: "confirmed" | "kickoff_pending" | "in_progress" | "completion_pending" | "completed";
  contactShared: boolean;
  contactRevealed: boolean;
  contactRevoked: boolean;
  gigVersion: number;
  gigStatus: "open" | "filled";
  selectedApplicationId: string;
  selectionRequest: SelectionRequestRecord | null;
  applicantOutcomes: Record<string, ApplicantOutcome>;
  engagement: EngagementRecord | null;
  contactPermission: ContactPermissionRecord;
  toast: string | null;
  activity: ActivityItem[];
}

export type WorkflowAction =
  | { type: "set-role"; role: Role }
  | { type: "apply" }
  | { type: "toggle-shortlist" }
  | { type: "toggle-advance" }
  | { type: "answer-qa" }
  | { type: "request-revision" }
  | { type: "submit-revision" }
  | { type: "send-selection"; deadline: "24" | "48" | "72" }
  | { type: "accept-selection" }
  | { type: "share-contact" }
  | { type: "reveal-contact" }
  | { type: "revoke-contact" }
  | { type: "advance-engagement" }
  | { type: "expire-selection" }
  | { type: "load-preset"; preset: ScenarioPreset }
  | { type: "dismiss-toast" }
  | { type: "reset" };
