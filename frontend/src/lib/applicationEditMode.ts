export type ApplicationEditMode =
  | "edit"
  | "update"
  | "reapply"
  | "revision"
  | "reconsideration"
  | "invalid";

export type ApplicationEditRouteMode = {
  mode: ApplicationEditMode;
  revisionRequestId: string | null;
  invitationId: string | null;
};

export function resolveApplicationEditRouteMode(params: URLSearchParams): ApplicationEditRouteMode {
  const requestedMode = params.get("mode");
  const revisionRequestId = clean(params.get("revision_request_id"));
  const legacyRevisionRequestId = clean(params.get("revisionRequestId"));
  const invitationId = clean(params.get("invitationId"));
  const revisionId = revisionRequestId ?? legacyRevisionRequestId;

  if (revisionRequestId && legacyRevisionRequestId && revisionRequestId !== legacyRevisionRequestId) {
    return invalid();
  }
  if (revisionId) {
    if (invitationId || (requestedMode && requestedMode !== "revision")) return invalid();
    return { mode: "revision", revisionRequestId: revisionId, invitationId: null };
  }
  if (requestedMode === "revision") return invalid();
  if (requestedMode === "reconsideration") {
    return invitationId
      ? { mode: "reconsideration", revisionRequestId: null, invitationId }
      : invalid();
  }
  if (invitationId) return invalid();
  if (requestedMode === null) return { mode: "edit", revisionRequestId: null, invitationId: null };
  if (requestedMode === "update" || requestedMode === "reapply") {
    return { mode: requestedMode, revisionRequestId: null, invitationId: null };
  }
  return invalid();
}

export function revisionEditPath(applicationId: string, revisionRequestId: string): string {
  return `/applications/${encodeURIComponent(applicationId)}/edit?revision_request_id=${encodeURIComponent(revisionRequestId)}`;
}

function clean(value: string | null): string | null {
  return value?.trim() ? value.trim() : null;
}

function invalid(): ApplicationEditRouteMode {
  return { mode: "invalid", revisionRequestId: null, invitationId: null };
}
