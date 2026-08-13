import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ApplicationForm } from "../components/ApplicationForm";
import { ApplicationVersionReference } from "../components/ApplicationVersionReference";
import { Button } from "../components/Button";
import {
  ApplicationApiError,
  editApplication,
  fetchApplication,
  reapplyApplication,
  updateApplicationForGigChange,
  type ApplicationResponse,
} from "../lib/applications";
import { applicationRecordErrorMessage, proposalContractVersion } from "../lib/applicationView";
import { resolveApplicationEditRouteMode, type ApplicationEditMode } from "../lib/applicationEditMode";
import { EngagementApiError, fetchReconsiderationInvitation, respondToReconsideration, type ReconsiderationInvitation } from "../lib/engagements";
import { engagementErrorMessage, humanize, structuredValue } from "../lib/engagementView";
import { fetchQaThread, QaApiError, submitRevisionUpdate, type QaThread } from "../lib/qa";
import { qaErrorMessage } from "../lib/qaView";

const reviewConflictCodes = new Set([
  "stale_application_version",
  "stale_gig_terms",
  "stale_gig_version",
  "gig_terms_changed_again",
  "revision_request_not_actionable",
  "revision_request_superseded",
  "pending_selection_blocks_revision",
  "invalid_revision_response",
  "idempotency_conflict",
  "stale_reconsideration_action",
  "reconsideration_not_allowed",
]);

export function EditApplicationPage() {
  const { applicationId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const routeMode = resolveApplicationEditRouteMode(params);
  const { mode, revisionRequestId, invitationId } = routeMode;
  const [detail, setDetail] = useState<ApplicationResponse | null>(null);
  const [qa, setQa] = useState<QaThread | null>(null);
  const [invitation, setInvitation] = useState<ReconsiderationInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authorityReviewRequired, setAuthorityReviewRequired] = useState(false);
  const [authorityReviewed, setAuthorityReviewed] = useState(false);
  const [revisionSubmitRequestId, setRevisionSubmitRequestId] = useState(() => crypto.randomUUID());
  const [reconsiderationSubmitRequestId, setReconsiderationSubmitRequestId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    let active = true;
    if (!applicationId) { setError("Application identifier is missing."); setLoading(false); return; }
    setLoading(true); setError(null); setAuthorityReviewRequired(false); setAuthorityReviewed(false);
    setRevisionSubmitRequestId(crypto.randomUUID());
    setReconsiderationSubmitRequestId(crypto.randomUUID());
    Promise.all([
      fetchApplication(applicationId),
      mode === "revision" ? fetchQaThread(applicationId) : Promise.resolve(null),
      mode === "reconsideration" && invitationId ? fetchReconsiderationInvitation(invitationId) : Promise.resolve(null),
    ]).then(([value, thread, nextInvitation]) => {
      if (active) { setDetail(value); setQa(thread); setInvitation(nextInvitation); }
    }).catch((reason: unknown) => {
      if (active) setError(recordError(reason, "Unable to load application."));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [applicationId, invitationId, mode, revisionRequestId]);

  async function submit(application: Record<string, unknown>) {
    if (!detail || !applicationId || (authorityReviewRequired && !authorityReviewed)) return;
    setSubmitting(true); setError(null);
    try {
      const base = { expected_application_version_token: detail.application_version_token, application };
      if (mode === "edit") await editApplication(applicationId, base);
      else if (mode === "update") await updateApplicationForGigChange(applicationId, { ...base, expected_material_terms_token: detail.material_terms_token });
      else if (mode === "reapply") await reapplyApplication(applicationId, { ...base, expected_material_terms_token: detail.material_terms_token });
      else if (mode === "revision" && revisionRequestId) await submitRevisionUpdate(applicationId, revisionRequestId, { request_id: revisionSubmitRequestId, expected_application_version_token: detail.application_version_token, snapshot: application });
      else if (mode === "reconsideration" && invitation) await respondToReconsideration(invitation.invitation_id, "submit-update", { request_id: reconsiderationSubmitRequestId, action_token: invitation.action_token, snapshot: application });
      else return;
      navigate(`/applications/${applicationId}`, { replace: true });
    } catch (reason) {
      const code = reason instanceof ApplicationApiError || reason instanceof QaApiError || reason instanceof EngagementApiError ? reason.code : null;
      if (code && reviewConflictCodes.has(code)) {
        try {
          const [refreshed, refreshedQa, refreshedInvitation] = await Promise.all([
            fetchApplication(applicationId),
            mode === "revision" ? fetchQaThread(applicationId) : Promise.resolve(null),
            mode === "reconsideration" && invitationId ? fetchReconsiderationInvitation(invitationId) : Promise.resolve(null),
          ]);
          setDetail(refreshed); setQa(refreshedQa); setInvitation(refreshedInvitation);
          setAuthorityReviewRequired(true);
          setAuthorityReviewed(false);
        } catch { /* Keep the submitted draft and surface the original controlled conflict. */ }
      }
      setError(recordError(reason, "Unable to save application."));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <StageFourEditorState title="Loading application editor" body="Retrieving the authoritative application version and current material gig terms…" />;
  if (!detail || !applicationId) return <StageFourEditorState title="Application unavailable" body={error ?? "Application not found."} error />;

  const structure = String(detail.current_material_terms.payment_structure) as "fixed_price" | "hourly" | "open_to_proposals";
  const currency = String(detail.current_material_terms.currency ?? "");
  const permitted = isPermitted(mode, detail, applicationId, revisionRequestId, qa, invitation);
  if (!permitted && !authorityReviewRequired) return <Unavailable applicationId={applicationId} />;

  const stageFourMode = mode === "edit" || mode === "update" || mode === "reapply";
  const title = modeTitle(mode);
  const submitLabel = mode === "reapply" ? "Reapply in this history" : mode === "revision" ? "Submit revised proposal version" : mode === "reconsideration" ? "Submit updated proposal and reopen" : mode === "update" ? "Save updated proposal version" : "Save new proposal version";
  const presentation = stageFourMode ? "switchboard-record" : mode === "revision" ? "switchboard-revision" : "switchboard-reconsideration";
  const form = <ApplicationForm paymentStructure={structure} currency={currency} materialTerms={detail.current_material_terms} initialApplication={detail.current_application} submitLabel={submitLabel} submitting={submitting} submitDisabled={(authorityReviewRequired && !authorityReviewed) || !permitted} presentation={presentation} onSubmit={submit} />;

  if (mode === "revision" && qa?.open_revision_request) {
    return (
      <section className="stage-six-revision-editor">
        <aside className="stage-six-editor-context" aria-label="Proposal revision context"><div><span>Current application</span><strong>{String(detail.gig.title ?? "Application")}</strong></div><dl><Fact label="Stage" value={detail.stage} /><Fact label="Current proposal" value={`Application v${detail.current_version_number}`} /></dl><Link to={`/applications/${applicationId}`}>Return to application record</Link></aside>
        <header className="stage-six-editor-header"><div><span>Stage 6 / Complete proposal authority</span><h1>{title}</h1><p>The open request is structured workflow evidence—not an editable proposal patch.</p></div><div><small>Requested change</small><strong>{label(qa.open_revision_request.reason_code)}</strong>{qa.open_revision_request.reason_detail ? <p>{qa.open_revision_request.reason_detail}</p> : null}</div></header>
        <ApplicationVersionReference applicationVersion={detail.current_version_number} proposalContractVersion={proposalContractVersion(detail.current_application)} answeredGigVersion={detail.answered_gig_version_number} currentMaterialGigVersion={detail.current_material_gig_version_number} />
        <section className="stage-six-editor-authority"><span>Official proposal boundary</span><h2>The existing proposal remains official while you type.</h2><p>Only a successful submission to this exact open revision request creates a complete immutable <code>proposal_revision_response</code> version and moves the current pointer. The prior version remains history.</p></section>
        {error ? <div className="stage-six-notice is-error" role="alert"><strong>Revision submission stopped</strong><p>{error}</p><small>Your complete proposal draft remains mounted.</small></div> : null}
        {authorityReviewRequired ? <section className="application-authority-review" role="status"><span>Authoritative context refreshed</span><h2>Review before another revision attempt</h2><p>The proposal, gig, and revision authority above were refetched. The complete form draft below was not remounted or cleared.</p><label><input type="checkbox" checked={authorityReviewed} onChange={(event) => { setAuthorityReviewed(event.target.checked); if (event.target.checked) setRevisionSubmitRequestId(crypto.randomUUID()); }} /><span>I reviewed the refreshed exact-version relationship and want a fresh deliberate attempt.</span></label>{!permitted ? <p className="is-blocked">The open request is no longer actionable. Your draft remains visible but cannot be submitted.</p> : null}</section> : null}
        <div className="stage-six-revision-form-board"><header><span>Complete canonical proposal</span><p>Financials + timeline + availability + scope · no partial patch</p></header>{form}</div>
      </section>
    );
  }

  if (mode === "reconsideration" && invitation) {
    return (
      <section className="stage-eight-page reconsideration-editor-page">
        <aside className="engagement-context-rail" aria-label="Reconsideration proposal context"><div><span>Current application</span><strong>{String(detail.gig.title ?? "Application")}</strong><small>{humanize(detail.stage)}</small></div><dl><Fact label="Current proposal" value={`Application v${detail.current_version_number}`} /><Fact label="Invitation" value={humanize(invitation.status)} /></dl><Link to={`/applications/${applicationId}`}>Return to application record</Link></aside>
        <header className="stage-eight-editorial-header"><div><p>Reconsideration / Complete proposal authority</p><h1>Submit an updated proposal.</h1></div><div><span>Bound recovery path</span><p>Cancelled engagement → Gig Reopening with intake closed → pending invitation → fresh immutable application version.</p></div></header>
        <section className="reconsideration-editor-source"><header><span>Exact invitation source</span><h2>Compare before creating a new promise.</h2><p>The proposal below is initialized from the current application. It remains a local draft until this exact pending invitation accepts the complete canonical snapshot.</p></header><div><EditorTerms title="Previous proposal" values={invitation.previous_proposal} /><EditorTerms title="Current material gig terms" values={invitation.current_gig_terms} /></div></section>
        <ApplicationVersionReference applicationVersion={detail.current_version_number} proposalContractVersion={proposalContractVersion(detail.current_application)} answeredGigVersion={detail.answered_gig_version_number} currentMaterialGigVersion={detail.current_material_gig_version_number} />
        {error ? <div className="stage-eight-notice is-error" role="alert"><strong>Reconsideration submission stopped</strong><p>{error}</p><small>Your complete proposal draft remains mounted.</small></div> : null}
        {authorityReviewRequired ? <section className="application-authority-review" role="status"><span>Authoritative invitation refreshed</span><h2>Review before another deliberate attempt</h2><p>The application, material gig terms, and invitation authority above were refetched. Your complete form draft was not remounted or cleared.</p><label><input type="checkbox" checked={authorityReviewed} onChange={(event) => { setAuthorityReviewed(event.target.checked); if (event.target.checked) setReconsiderationSubmitRequestId(crypto.randomUUID()); }} /><span>I reviewed the refreshed exact invitation and want a fresh operation identity.</span></label>{!permitted ? <p className="is-blocked">The invitation is no longer actionable. Your draft remains visible but cannot be submitted.</p> : null}</section> : null}
        <div className="reconsideration-editor-form"><header><span>Complete canonical proposal</span><p>Financials + timeline + availability + scope · no partial patch</p></header>{form}</div>
      </section>
    );
  }

  return (
    <section className="stage-four-page application-editor-page">
      <aside className="application-route-context" aria-label="Current application context"><div><span>Current application</span><strong>{String(detail.gig.title ?? "Application")}</strong></div><dl><Fact label="Stage" value={detail.stage} /><Fact label="Editor" value={mode} /></dl><Link to={`/applications/${applicationId}`}>Return to application record</Link></aside>
      <header className="stage-four-editorial-header"><div><p>Application record / Append-only editor</p><h1>{title}</h1></div><div className="stage-four-editorial-context"><span>Existing record</span><p>{mode === "reapply" ? "This reactivates the same withdrawn application history after a material gig change. It is not reconsideration or engagement reopening." : "Saving appends a complete immutable proposal snapshot. No historical version is overwritten."}</p></div></header>
      <ApplicationVersionReference applicationVersion={detail.current_version_number} proposalContractVersion={proposalContractVersion(detail.current_application)} answeredGigVersion={detail.answered_gig_version_number} currentMaterialGigVersion={detail.current_material_gig_version_number} />
      {mode === "update" || mode === "reapply" ? <ChangedTerms detail={detail} /> : null}
      {error ? <div className="stage-four-notice is-error" role="alert"><strong>Save stopped</strong><p>{error}</p></div> : null}
      {authorityReviewRequired ? <section className="application-authority-review" role="status"><span>Authoritative context refreshed</span><h2>Review before another save attempt</h2><p>The server reported a concurrent change. The current application and gig bindings above are refreshed; your form draft below was not remounted or cleared.</p><label><input type="checkbox" checked={authorityReviewed} onChange={(event) => setAuthorityReviewed(event.target.checked)} /><span>I reviewed the refreshed version and material-term relationship.</span></label>{!permitted ? <p className="is-blocked">The refreshed backend state no longer authorizes this action. Your draft remains visible, but it cannot be submitted.</p> : null}</section> : null}
      <div className="application-form-board"><header className="application-form-board-heading"><span>Draft</span><p>Complete canonical proposal · current backend validation · new immutable version</p></header>{form}</div>
    </section>
  );
}

function ChangedTerms({ detail }: { detail: ApplicationResponse }) {
  return <section className="application-editor-change"><span>Reviewed binding change</span><h2>Gig v{detail.answered_gig_version_number} → current material gig v{detail.current_material_gig_version_number}</h2><p>{detail.gig_change_comparison.length} authoritative field{detail.gig_change_comparison.length === 1 ? "" : "s"} changed. The complete form below binds its new proposal version only to the reviewed current material terms.</p><ul>{detail.gig_change_comparison.map((change) => <li key={change.field}>{change.field.replace(/_/g, " ")}</li>)}</ul></section>;
}

function Unavailable({ applicationId }: { applicationId: string }) { return <StageFourEditorState title="This action is no longer available" body="The application or gig state changed. Return to the record for its current backend-authorized actions." action={<Button to={`/applications/${applicationId}`}>Return to application</Button>} />; }
function StageFourEditorState({ title, body, error = false, action }: { title: string; body: string; error?: boolean; action?: ReactNode }) { return <section className="stage-four-page"><div className={`stage-four-state-panel${error ? " is-error" : ""}`} role={error ? "alert" : "status"}><span>Application editor</span><h1>{title}</h1><p>{body}</p>{action}</div></section>; }
function Fact({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value.replace(/_/g, " ")}</dd></div>; }

function modeTitle(mode: ApplicationEditMode): string { return { edit: "Edit application", update: "Update proposal for changed terms", reapply: "Reapply after material gig change", revision: "Submit complete proposal revision", reconsideration: "Submit updated reconsideration proposal", invalid: "Application edit unavailable" }[mode]; }
function isPermitted(mode: ApplicationEditMode, detail: ApplicationResponse, applicationId: string, revisionRequestId: string | null, qa: QaThread | null, invitation: ReconsiderationInvitation | null): boolean {
  if (mode === "edit") return detail.allowed_actions.includes("edit_application");
  if (mode === "update") return detail.allowed_actions.includes("update_for_gig_change");
  if (mode === "reapply") return detail.allowed_actions.includes("reapply_after_gig_change");
  if (mode === "reconsideration") return Boolean(invitation?.allowed_actions.includes("submit_update") && invitation.application_id === applicationId);
  return Boolean(revisionRequestId && qa?.permissions.respond_to_revision_request && qa.open_revision_request?.id === revisionRequestId);
}
function EditorTerms({ title, values }: { title: string; values: Record<string, unknown> }) { return <section><h3>{title}</h3><dl>{Object.entries(values).map(([key, value]) => <div key={key}><dt>{humanize(key)}</dt><dd>{structuredValue(value)}</dd></div>)}</dl></section>; }
function recordError(reason: unknown, fallback: string): string { return reason instanceof ApplicationApiError ? applicationRecordErrorMessage(reason.code) : reason instanceof QaApiError ? qaErrorMessage(reason) : reason instanceof EngagementApiError ? engagementErrorMessage(reason) : reason instanceof Error ? reason.message : fallback; }
function label(value: string): string { return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
