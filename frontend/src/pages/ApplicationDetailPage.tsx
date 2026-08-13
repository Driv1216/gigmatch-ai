import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApplicationProposalSnapshot } from "../components/ApplicationProposalSnapshot";
import { ApplicationVersionReference } from "../components/ApplicationVersionReference";
import { ApplicationWithdrawalDialog, type ApplicationWithdrawalReason } from "../components/ApplicationWithdrawalDialog";
import { Button } from "../components/Button";
import { ReconsiderationPanel } from "../components/ReconsiderationPanel";
import { SelectionPanel } from "../components/SelectionPanel";
import { StructuredQaPanel } from "../components/StructuredQaPanel";
import { WorkflowStatusBadge } from "../components/WorkflowStatusBadge";
import {
  ApplicationApiError,
  fetchApplication,
  fetchApplicationVersions,
  reaffirmApplication,
  withdrawApplication,
  type ApplicationResponse,
  type VersionEnvelope,
} from "../lib/applications";
import { isRecord } from "../lib/applicationContracts";
import {
  applicationBlockerMessage,
  applicationClosureReason,
  applicationRecordErrorMessage,
  applicationVersionOriginLabel,
  formatApplicationTime,
  proposalContractVersion,
  sortVersions,
} from "../lib/applicationView";

const refreshCodes = new Set(["stale_application_version", "stale_gig_terms", "gig_terms_changed_again", "application_edit_not_allowed", "application_withdrawal_not_allowed", "pending_selection_blocks_application_withdrawal"]);

export function ApplicationDetailPage() {
  const { applicationId } = useParams();
  const [detail, setDetail] = useState<ApplicationResponse | null>(null);
  const [history, setHistory] = useState<VersionEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [authorityRefreshKey, setAuthorityRefreshKey] = useState(0);

  const load = useCallback(async () => {
    if (!applicationId) throw new Error("Application identifier is missing.");
    const [nextDetail, nextHistory] = await Promise.all([fetchApplication(applicationId), fetchApplicationVersions(applicationId)]);
    setDetail(nextDetail);
    setHistory(nextHistory);
  }, [applicationId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    load().catch((reason: unknown) => { if (active) setError(recordError(reason, "Unable to load application.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  const refreshWorkflowAuthorities = useCallback(async () => {
    await load();
    setAuthorityRefreshKey((value) => value + 1);
  }, [load]);

  async function mutate(action: () => Promise<ApplicationResponse>, success: string): Promise<boolean> {
    setWorking(true); setError(null); setMessage(null);
    try {
      await action();
      await load();
      setAuthorityRefreshKey((value) => value + 1);
      setMessage(success);
      return true;
    } catch (reason) {
      if (reason instanceof ApplicationApiError && refreshCodes.has(reason.code)) {
        try { await load(); } catch { /* Preserve the exact action error below. */ }
      }
      setError(recordError(reason, "Unable to update the application."));
      return false;
    } finally {
      setWorking(false);
    }
  }

  if (loading) return <StageFourState title="Loading application record" body="Retrieving the current proposal, exact gig binding, actions, blockers, and immutable history…" />;
  if (!detail || !applicationId) return <StageFourState title="Application unavailable" body={error ?? "Application not found."} error />;

  const can = (action: string) => detail.allowed_actions.includes(action);
  const title = String(detail.gig.title ?? "Application");
  const client = String(detail.client.company_name ?? detail.client.display_name ?? "Client");
  const closureReason = applicationClosureReason(detail.withdrawal_or_closure.reason);
  const closureDetail = isRecord(detail.withdrawal_or_closure.detail) ? detail.withdrawal_or_closure.detail : {};

  return (
    <section className="stage-four-page application-detail-page">
      <aside className="application-route-context" aria-label="Current application context">
        <div><span>Current application</span><strong>{title}</strong></div>
        <dl><Fact label="Stage" value={detail.stage} /><Fact label="Current proposal" value={`Application v${detail.current_version_number}`} /></dl>
        <Link to="/applications">Return to application register</Link>
      </aside>

      <header className="stage-four-editorial-header application-detail-header">
        <div><p>Application record / Immutable history</p><h1>{title}</h1></div>
        <div className="stage-four-editorial-context"><span>Safe client source</span><h2>{client}</h2><WorkflowStatusBadge status={detail.stage} tone={detail.response_to_updated_gig_required ? "attention" : "neutral"} /></div>
      </header>

      {error ? <Notice tone="error" title="Application action stopped" body={error} /> : null}
      {message ? <Notice tone="success" title="Authoritative record refreshed" body={message} /> : null}

      <ApplicationVersionReference applicationVersion={detail.current_version_number} proposalContractVersion={proposalContractVersion(detail.current_application)} answeredGigVersion={detail.answered_gig_version_number} currentMaterialGigVersion={detail.current_material_gig_version_number} />

      {closureReason ? <section className="application-outcome" aria-label="Application outcome"><span>Terminal application projection</span><h2>Application outcome</h2><p>{closureReason}</p>{typeof closureDetail.explanation === "string" && closureDetail.explanation.trim() ? <p>{closureDetail.explanation}</p> : null}</section> : null}

      {detail.response_to_updated_gig_required ? (
        <section className="application-change-board" aria-labelledby="application-change-title">
          <header><span>Material gig change</span><h2 id="application-change-title">Review the changed terms</h2><p>Application v{detail.current_version_number} answers gig v{detail.answered_gig_version_number}; current material terms are gig v{detail.current_material_gig_version_number}.</p></header>
          <div className="application-change-list">{detail.gig_change_comparison.map((change) => <article key={change.field}><span>{change.field.replace(/_/g, " ")}</span><div><small>Answered value</small><p>{comparisonValue(change.before)}</p></div><div><small>Current value</small><p>{comparisonValue(change.after)}</p></div></article>)}</div>
          <footer><p>{detail.compatibility.can_reaffirm_existing_proposal ? "The backend confirms the complete existing proposal is compatible and may be reaffirmed against the reviewed current terms." : "The backend requires a complete updated proposal; the existing financial proposal cannot be reaffirmed."}</p><div>{can("reaffirm_updated_gig_terms") ? <Button type="button" disabled={working} onClick={() => void mutate(() => reaffirmApplication(applicationId, { expected_application_version_token: detail.application_version_token, expected_material_terms_token: detail.material_terms_token }), "A new immutable reaffirmation version now answers the current material gig terms.")}>Reaffirm complete proposal</Button> : null}{can("update_for_gig_change") ? <Button to={`/applications/${applicationId}/edit?mode=update`} variant="secondary">Update complete proposal</Button> : null}</div></footer>
        </section>
      ) : null}

      <section className="application-current-record" aria-labelledby="current-proposal-title">
        <header><span>Current pointer</span><h2 id="current-proposal-title">Current proposal record</h2><p>This is the complete immutable snapshot currently referenced by the application.</p></header>
        <ApplicationProposalSnapshot title={`Application v${detail.current_version_number}`} application={detail.current_application} />
      </section>

      {detail.current_version_number > 1 ? <ApplicationProposalSnapshot title="Original submission · Application v1" application={detail.original_submission} compact /> : null}

      <section className="application-authority-board" aria-labelledby="application-authority-title">
        <header><span>7D authority</span><h2 id="application-authority-title">Available record actions</h2><p>Controls appear only from the current backend action projection.</p></header>
        <div className="application-authority-actions">{can("edit_application") ? <Button to={`/applications/${applicationId}/edit`} variant="secondary">Edit as new version</Button> : null}{can("reapply_after_gig_change") ? <Button to={`/applications/${applicationId}/edit?mode=reapply`}>Reapply in this history</Button> : null}{can("withdraw_application") ? <Button type="button" variant="secondary" disabled={working} onClick={() => setWithdrawalOpen(true)}>Withdraw application</Button> : null}{detail.allowed_actions.length === 0 ? <p>No Stage 4 record action is currently authorized.</p> : null}</div>
        {detail.blockers.length ? <div className="application-authority-blockers"><span>Server blockers</span>{detail.blockers.map((code) => <p key={code}>{applicationBlockerMessage(code)}</p>)}</div> : null}
      </section>

      <section className="application-history" aria-labelledby="application-history-title">
        <header><span>Append-only record · {history?.pagination.total_items ?? detail.version_history_count} versions</span><h2 id="application-history-title">Immutable proposal history</h2><p>Newest first. Opening a version reads the preserved canonical snapshot; it never makes that version editable.</p></header>
        <div>{sortVersions(history?.items ?? []).map((version) => <details key={version.version_number}><summary><span>Application v{version.version_number}</span><strong>{applicationVersionOriginLabel(version.origin)}</strong><small>{formatApplicationTime(version.created_at)}</small></summary><div className="application-history-version"><ApplicationVersionReference applicationVersion={version.version_number} proposalContractVersion={proposalContractVersion(version.application)} answeredGigVersion={version.answered_gig_version_number} /><ApplicationProposalSnapshot title={`Preserved application v${version.version_number}`} application={version.application} compact /></div></details>)}</div>
      </section>

      <section className="stage-six-page-region" aria-labelledby="application-stage-six-title">
        <header><span>First-class Stage 6 workflow</span><h2 id="application-stage-six-title">Structured questions and proposal authority</h2><p>The shared participant workflow below owns structured responses, immutable corrections, private reports, cursor history, and exact-version revision requests.</p></header>
        <StructuredQaPanel applicationId={applicationId} authorityRefreshKey={authorityRefreshKey} onAttentionChange={() => void refreshWorkflowAuthorities()} />
      </section>

      <section className="application-later-workflows" aria-labelledby="later-workflows-title">
        <header><span>Stage 7 + Stage 8 distinct authorities</span><h2 id="later-workflows-title">Selection and failed-engagement recovery</h2><p>Exact-version selection and reconsideration remain separate sibling records. Reconsideration is now a first-class Stage 8 workflow bound to Gig Reopening.</p></header>
        <div className="application-legacy-child"><SelectionPanel applicationId={applicationId} authorityRefreshKey={authorityRefreshKey} onChanged={refreshWorkflowAuthorities} /></div>
        <div className="application-legacy-child"><ReconsiderationPanel applicationId={applicationId} authorityRefreshKey={authorityRefreshKey} onChanged={() => void refreshWorkflowAuthorities()} /></div>
      </section>

      {withdrawalOpen ? <ApplicationWithdrawalDialog gigTitle={title} isSubmitting={working} onConfirm={(reason: ApplicationWithdrawalReason, explanation?: string) => mutate(() => withdrawApplication(applicationId, { expected_application_version_token: detail.application_version_token, reason, explanation }), "The application is withdrawn. Its complete immutable history remains available." )} onDismiss={() => setWithdrawalOpen(false)} /> : null}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value.replace(/_/g, " ")}</dd></div>; }
function Notice({ tone, title, body }: { tone: "error" | "success"; title: string; body: string }) { return <div className={`stage-four-notice is-${tone}`} role={tone === "error" ? "alert" : "status"}><strong>{title}</strong><p>{body}</p></div>; }
function StageFourState({ title, body, error = false }: { title: string; body: string; error?: boolean }) { return <section className="stage-four-page"><div className={`stage-four-state-panel${error ? " is-error" : ""}`} role={error ? "alert" : "status"}><span>Application record</span><h1>{title}</h1><p>{body}</p>{error ? <Button to="/applications" variant="secondary">Return to applications</Button> : null}</div></section>; }

function comparisonValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not specified";
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string" || typeof item === "number").join(" · ") || "No items";
  if (isRecord(value)) {
    const primitiveEntries = Object.entries(value).filter(([, item]) => typeof item === "string" || typeof item === "number");
    return primitiveEntries.length ? primitiveEntries.map(([key, item]) => `${key.replace(/_/g, " ")}: ${String(item)}`).join(" · ") : `${Object.keys(value).length} structured field${Object.keys(value).length === 1 ? "" : "s"}`;
  }
  return String(value);
}

function recordError(reason: unknown, fallback: string): string { return reason instanceof ApplicationApiError ? applicationRecordErrorMessage(reason.code) : reason instanceof Error ? reason.message : fallback; }
