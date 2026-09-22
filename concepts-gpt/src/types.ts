export type ConceptId =
  | "concierge"
  | "ledger"
  | "exchange"
  | "workroom"
  | "pocket"
  | "studio"
  | "signal-index"
  | "afterdark";
export type Role = "freelancer" | "client";
export type ViewId = "overview" | "market" | "proposal" | "applications" | "review" | "engagement";

export type Gig = {
  id: string;
  title: string;
  company: string;
  companySummary: string;
  category: string;
  location: string;
  workMode: string;
  posted: string;
  deadline: string;
  duration: string;
  weeklyCommitment: string;
  budget: string;
  paymentStructure: string;
  summary: string;
  deliverables: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  match: number;
  matchLabel: string;
  matchingSkills: string[];
  missingSkills: string[];
  matchReason: string;
  applicants: number;
};

export type Applicant = {
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
  coverNote: string;
  skills: string[];
  gap: string;
  stage: "Under review" | "Advanced" | "Selection pending";
  shortlisted: boolean;
};

export type AppState = {
  applied: boolean;
  applicationStage: "Draft" | "Under review" | "Advanced" | "Selection pending" | "Confirmed";
  applicationVersion: number;
  shortlisted: boolean;
  advanced: boolean;
  selectionSent: boolean;
  accepted: boolean;
};

export type ConceptProps = {
  role: Role;
  view: ViewId;
  gigs: Gig[];
  activeGig: Gig;
  applicants: Applicant[];
  state: AppState;
  onNavigate: (view: ViewId) => void;
  onSelectGig: (id: string) => void;
  onApply: () => void;
  onShortlist: () => void;
  onAdvance: () => void;
  onSendSelection: () => void;
  onAccept: () => void;
  onToast: (message: string) => void;
};

export type ConceptMeta = {
  id: ConceptId;
  number: string;
  name: string;
  thesis: string;
  interaction: string;
};
