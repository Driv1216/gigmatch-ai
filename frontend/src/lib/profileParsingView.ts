export type ProfileWorkspaceState = "loading" | "error" | "missing" | "ready";

export type ReviewWorkspaceState =
  | "loading"
  | "error"
  | "extracting"
  | "saving"
  | "candidate_edited"
  | "candidate_extracted"
  | "saved_reviewed"
  | "source_ready"
  | "no_source";

type ReviewWorkspaceStateInput = {
  isLoading: boolean;
  hasError: boolean;
  isExtracting: boolean;
  isSaving: boolean;
  hasSource: boolean;
  hasCandidate: boolean;
  candidateEdited: boolean;
  hasSavedParse: boolean;
};

export function profileWorkspaceState(
  isLoading: boolean,
  errorMessage: string | null,
  hasExistingProfile: boolean,
): ProfileWorkspaceState {
  if (isLoading) return "loading";
  if (errorMessage) return "error";
  return hasExistingProfile ? "ready" : "missing";
}

export function reviewWorkspaceState({
  isLoading,
  hasError,
  isExtracting,
  isSaving,
  hasSource,
  hasCandidate,
  candidateEdited,
  hasSavedParse,
}: ReviewWorkspaceStateInput): ReviewWorkspaceState {
  if (isLoading) return "loading";
  if (hasError) return "error";
  if (isExtracting) return "extracting";
  if (isSaving) return "saving";
  if (hasCandidate && candidateEdited) return "candidate_edited";
  if (hasCandidate) return "candidate_extracted";
  if (hasSavedParse) return "saved_reviewed";
  return hasSource ? "source_ready" : "no_source";
}

export function reviewWorkspaceLabel(state: ReviewWorkspaceState): string {
  const labels: Record<ReviewWorkspaceState, string> = {
    loading: "Loading saved input",
    error: "Controlled error",
    extracting: "Extraction running",
    saving: "Saving reviewed input",
    candidate_edited: "Candidate edited",
    candidate_extracted: "Candidate extracted",
    saved_reviewed: "Saved reviewed input",
    source_ready: "Source ready",
    no_source: "No source yet",
  };
  return labels[state];
}

export function formatReviewedAt(value: string): string {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? "Saved timestamp unavailable" : timestamp.toLocaleString();
}
