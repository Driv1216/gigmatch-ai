import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ApplicantReviewContextRail } from "../components/ApplicantReviewContextRail";
import {
  ApplicantReviewDialog,
  type ApplicantReviewDialogMode,
  type NotSelectedDecision,
  type ReopenDecision,
} from "../components/ApplicantReviewDialog";
import { ApplicationProposalSnapshot } from "../components/ApplicationProposalSnapshot";
import { ApplicationVersionReference } from "../components/ApplicationVersionReference";
import { Button } from "../components/Button";
import { ReconsiderationPanel } from "../components/ReconsiderationPanel";
import { SelectionPanel } from "../components/SelectionPanel";
import { StructuredQaPanel } from "../components/StructuredQaPanel";
import { WorkflowStatusBadge } from "../components/WorkflowStatusBadge";
import {
  advanceApplicant,
  ApplicantReviewApiError,
  fetchApplicant,
  fetchApplicantVersions,
  markApplicantNotSelected,
  reopenApplicant,
  returnApplicantToReview,
  setApplicantShortlist,
  type ApplicantDetail,
  type ApplicantVersionEnvelope,
} from "../lib/applicantReview";
import {
  applicantActionBlockerMessage,
  applicantRankingModeLabel,
  applicantRankingUnavailableMessage,
  applicantReviewErrorMessage,
  applicantScorePresentation,
  formatReviewDate,
  shouldRefreshApplicantReviewAfterError,
} from "../lib/applicantReviewView";
import { isRecord } from "../lib/applicationContracts";
import { applicationVersionOriginLabel, proposalContractVersion } from "../lib/applicationView";

export function ClientApplicantDetailPage() {
  const { gigId, applicationId } = useParams();
  const [detail, setDetail] = useState<ApplicantDetail | null>(null);
  const [versions, setVersions] = useState<ApplicantVersionEnvelope | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [dialog, setDialog] = useState<ApplicantReviewDialogMode | null>(null);
  const [authorityRefreshKey, setAuthorityRefreshKey] = useState(0);

  const load = useCallback(async () => {
    if (!gigId || !applicationId) throw new Error("Applicant identifier is missing.");
    const [nextDetail, nextVersions] = await Promise.all([
      fetchApplicant(gigId, applicationId),
      fetchApplicantVersions(gigId, applicationId, historyPage),
    ]);
    setDetail(nextDetail);
    setVersions(nextVersions);
  }, [applicationId, gigId, historyPage]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    load().catch((value) => { if (active) setError(applicantReviewErrorMessage(value)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  const refreshWorkflowAuthorities = useCallback(async () => {
    await load();
    setAuthorityRefreshKey((value) => value + 1);
  }, [load]);

  const staleRecord = Boolean(detail && applicationId && detail.application_id !== applicationId);
  if (loading || staleRecord) return <StageFiveState title="Loading applicant review record" body="Retrieving current evidence, exact proposal binding, private review state, actions, blockers, and history…" />;
  if (!detail || !gigId || !applicationId) return <StageFiveState title="Applicant review unavailable" body={error ?? "Applicant review not found."} error />;

  const applicant = detail;
  const applicantName = String(detail.freelancer.display_name ?? "Applicant");
  const gigTitle = String(detail.gig.title ?? "Owned gig");
  const gigState = String(detail.gig.product_state ?? detail.gig.lifecycle ?? "Unavailable");
  const score = applicantScorePresentation(detail.suitability);
  const explanation = detail.suitability.explanation;
  const skillGap = isRecord(explanation.skill_gap) ? explanation.skill_gap : {};
  const can = (action: string) => detail.allowed_actions.includes(action);

  async function runMutation(action: () => Promise<ApplicantDetail>, success: string): Promise<boolean> {
    setWorking(true);
    setError(null);
    setMessage(null);
    try {
      await action();
      await load();
      setAuthorityRefreshKey((value) => value + 1);
      setMessage(success);
      return true;
    } catch (value) {
      const actionMessage = applicantReviewErrorMessage(value);
      if (value instanceof ApplicantReviewApiError && shouldRefreshApplicantReviewAfterError(value.code)) {
        await load().catch(() => undefined);
      }
      setError(actionMessage);
      return false;
    } finally {
      setWorking(false);
    }
  }

  async function submitDialog(decision?: NotSelectedDecision | ReopenDecision): Promise<boolean> {
    if (!dialog) return false;
    if (dialog === "advance") {
      return runMutation(
        () => advanceApplicant(applicant.application_id, applicant.review_decision_action_token),
        "The authoritative record now shows this application as Advanced.",
      );
    }
    if (dialog === "return") {
      return runMutation(
        () => returnApplicantToReview(applicant.application_id, applicant.review_decision_action_token),
        "The authoritative record now shows this application Under Review.",
      );
    }
    if (dialog === "not_selected") {
      return runMutation(
        () => markApplicantNotSelected(applicant.application_id, {
          review_decision_action_token: applicant.review_decision_action_token,
          ...(decision as NotSelectedDecision),
        }),
        "The authoritative record now shows this application as Not Selected. Any active private shortlist state was cleaned up by backend authority.",
      );
    }
    return runMutation(
      () => reopenApplicant(applicant.application_id, {
        review_decision_action_token: applicant.review_decision_action_token,
        ...(decision as ReopenDecision),
      }),
      "The application is Under Review again. Its historical Not Selected decision remains preserved and shortlist state was not restored.",
    );
  }

  return (
    <section className="stage-five-page applicant-detail-page">
      <ApplicantReviewContextRail
        gigTitle={gigTitle}
        gigState={gigState}
        applicantName={applicantName}
        applicationStage={detail.stage}
        applicationVersion={detail.current_application_version_number}
        shortlisted={detail.review_state.is_shortlisted}
        returnTo={`/gigs/${encodeURIComponent(gigId)}/applicants`}
        returnLabel="Return to applicant register"
      />

      <header className="stage-five-editorial-header applicant-detail-header">
        <div><p>Applicant record / Current review authority</p><h1>{applicantName}</h1></div>
        <div className="stage-five-editorial-context"><span>{gigTitle}</span><WorkflowStatusBadge status={detail.stage} tone={detail.response_to_updated_gig_required ? "attention" : "neutral"} /><p>Application v{detail.current_application_version_number} · submitted {formatReviewDate(detail.submitted_at)}</p></div>
      </header>

      {error ? <Notice tone="error" title="Applicant review action stopped" body={error} /> : null}
      {message ? <Notice tone="success" title="Authoritative record refreshed" body={message} /> : null}

      <ApplicationVersionReference
        applicationVersion={detail.current_application_version_number}
        proposalContractVersion={proposalContractVersion(detail.current_application)}
        answeredGigVersion={Number(detail.answered_gig_version.version_number ?? 0)}
        currentMaterialGigVersion={Number(detail.current_material_gig_version.version_number ?? 0)}
      />

      {detail.response_to_updated_gig_required ? (
        <section className="applicant-change-board" aria-labelledby="applicant-change-title">
          <header><span>Exact version boundary</span><h2 id="applicant-change-title">Proposal answers earlier material terms</h2><p>Commercial evidence remains bound to answered gig v{String(detail.answered_gig_version.version_number ?? "—")}; current suitability evaluates material gig v{String(detail.current_material_gig_version.version_number ?? "—")}.</p></header>
          <div>{detail.material_change_comparison.map((change) => <article key={change.field}><strong>{change.field.replace(/_/g, " ")}</strong><p><span>Answered</span>{comparisonValue(change.before)}</p><p><span>Current</span>{comparisonValue(change.after)}</p></article>)}</div>
        </section>
      ) : null}

      <div className="applicant-evidence-grid">
        <section className="applicant-suitability-board" aria-labelledby="current-suitability-title">
          <header><span>Current material gig + current matching input</span><h2 id="current-suitability-title">Current suitability</h2><p>AI-assisted evidence supports review. It is not a stage, hiring decision, or commercial-value score.</p></header>
          <div className={`applicant-suitability-result${score.score ? " is-available" : " is-unavailable"}`}>
            <span>{detail.suitability.evidence_label}</span><strong>{score.label}</strong>{score.score ? <b>{score.score}</b> : <p>{applicantRankingUnavailableMessage(detail.suitability.ranking_unavailable_reason)}</p>}
            <small>{applicantRankingModeLabel(detail.suitability.ranking_mode)} · generated {formatReviewDate(detail.ranking_generated_at)}</small>
          </div>
          {detail.suitability.ranking_status === "available" ? (
            <>
              <div className="applicant-score-facts">
                <Fact label="Keyword evidence" value={formatScore(detail.suitability.keyword_score)} />
                {detail.suitability.ranking_mode === "hybrid" ? <Fact label="Semantic evidence" value={formatScore(detail.suitability.semantic_score)} /> : null}
                {detail.suitability.ranking_mode === "hybrid" ? <Fact label="Combined evidence" value={formatScore(detail.suitability.hybrid_score)} /> : null}
              </div>
              <p className="applicant-evidence-summary">{String(explanation.summary ?? "No explanation summary is available.")}</p>
              <div className="applicant-skill-grid"><SkillList label="Matched required skills" value={skillGap.matched_required_skills} /><SkillList label="Required skill gaps" value={skillGap.missing_required_skills} /><SkillList label="Matched preferred skills" value={skillGap.matched_preferred_skills} /><SkillList label="Preferred skill gaps" value={skillGap.missing_preferred_skills} /></div>
            </>
          ) : null}
        </section>

        <section className="applicant-commercial-board" aria-labelledby="current-commercial-title">
          <header><span>Current immutable application version</span><h2 id="current-commercial-title">Current commercial proposal</h2><p>This evidence belongs to Application v{detail.current_application_version_number} and the exact gig version it answered. Price does not affect suitability.</p></header>
          <ApplicationProposalSnapshot title={`Application v${detail.current_application_version_number}`} application={detail.current_application} />
        </section>
      </div>

      <section className="applicant-terms-board" aria-labelledby="applicant-terms-title">
        <header><span>Commercial comparison / Sanitized exact terms</span><h2 id="applicant-terms-title">Answered terms and current material terms</h2><p>These snapshots explain version context; they do not rewrite the application proposal or current suitability evidence.</p></header>
        <div><TermsSnapshot title="Exact gig terms answered" version={Number(detail.answered_gig_version.version_number ?? 0)} terms={isRecord(detail.answered_gig_version.terms) ? detail.answered_gig_version.terms : {}} /><TermsSnapshot title="Current material gig terms" version={Number(detail.current_material_gig_version.version_number ?? 0)} terms={isRecord(detail.current_material_gig_version.terms) ? detail.current_material_gig_version.terms : {}} /></div>
      </section>

      <section className="applicant-review-authority" aria-labelledby="review-authority-title">
        <header><span>Client review decision / Server-authorized controls</span><h2 id="review-authority-title">Private organization and participant-visible decisions</h2><p>Shortlist organization and application stage are independent authorities with separate action tokens.</p></header>
        <div className="applicant-authority-columns">
          <section><span>Client-private organization</span><h3>Internal Shortlist</h3><p>{detail.review_state.is_shortlisted ? `Included since ${formatReviewDate(detail.review_state.shortlisted_at)}.` : "Not currently included."} The freelancer cannot see this state.</p><div>{can("add_to_internal_shortlist") ? <Button type="button" variant="secondary" disabled={working} onClick={() => void runMutation(() => setApplicantShortlist(detail.application_id, true, detail.shortlist_action_token), "The refreshed private review state now includes this applicant on the Internal Shortlist.")}>Add to Internal Shortlist</Button> : null}{can("remove_from_internal_shortlist") ? <Button type="button" variant="secondary" disabled={working} onClick={() => void runMutation(() => setApplicantShortlist(detail.application_id, false, detail.shortlist_action_token), "The refreshed private review state no longer includes this applicant on the Internal Shortlist.")}>Remove from Internal Shortlist</Button> : null}</div></section>
          <section><span>Applicant-visible review stage</span><h3>Client review decision</h3><p>Only controls projected by the current backend response are available. Advance is not selection.</p><div>{can("advance") ? <Button type="button" disabled={working} onClick={() => setDialog("advance")}>Advance</Button> : null}{can("return_to_review") ? <Button type="button" variant="secondary" disabled={working} onClick={() => setDialog("return")}>Return to Review</Button> : null}{can("mark_not_selected") ? <Button type="button" variant="secondary" disabled={working} onClick={() => setDialog("not_selected")}>Mark Not Selected</Button> : null}{can("reopen") ? <Button type="button" disabled={working} onClick={() => setDialog("reopen")}>Reopen Application</Button> : null}{!detail.allowed_actions.some((action) => ["advance", "return_to_review", "mark_not_selected", "reopen"].includes(action)) ? <p>No applicant-visible Stage 5 decision is currently authorized.</p> : null}</div></section>
        </div>
        {detail.action_blockers.length ? <div className="applicant-authority-blockers"><span>Current server blockers</span>{detail.action_blockers.map((blocker) => <p key={blocker}>{applicantActionBlockerMessage(blocker)}</p>)}</div> : null}
      </section>

      <section className="applicant-review-history" aria-labelledby="review-history-title">
        <header><span>Participant-visible events only</span><h2 id="review-history-title">Review decision history</h2><p>Private shortlist activity is intentionally absent from this participant history.</p></header>
        {detail.review_history.length ? <ol>{detail.review_history.map((event, index) => <ReviewEvent key={`${String(event.event_type)}-${String(event.occurred_at)}-${index}`} event={event} />)}</ol> : <p className="applicant-history-empty">No participant-visible client decision events yet.</p>}
      </section>

      <section className="applicant-version-history" aria-labelledby="applicant-version-history-title">
        <header><span>Append-only proposal record · {versions?.pagination.total_items ?? detail.application_version_count} versions</span><h2 id="applicant-version-history-title">Immutable application-version history</h2><p>Current suitability is deliberately not attached to any historical application version.</p></header>
        <div>{versions?.items.map((version) => <details key={version.version_token}><summary><span>Application v{version.version_number}</span><strong>{applicationVersionOriginLabel(version.origin)}</strong><small>{formatReviewDate(version.created_at)}</small></summary><div className="applicant-history-version"><ApplicationVersionReference applicationVersion={version.version_number} proposalContractVersion={proposalContractVersion(version.application)} answeredGigVersion={version.answered_gig_version_number} /><ApplicationProposalSnapshot title={`Preserved application v${version.version_number}`} application={version.application} compact /></div></details>)}</div>
        {versions && versions.pagination.total_pages > 1 ? <nav className="applicant-history-pagination" aria-label="Application version pages"><Button type="button" variant="secondary" disabled={historyPage <= 1} onClick={() => setHistoryPage((value) => Math.max(1, value - 1))}>Newer versions</Button><p>Page {versions.pagination.page} of {versions.pagination.total_pages}</p><Button type="button" variant="secondary" disabled={historyPage >= versions.pagination.total_pages} onClick={() => setHistoryPage((value) => value + 1)}>Older versions</Button></nav> : null}
      </section>

      <section className="stage-six-page-region is-client" aria-labelledby="applicant-stage-six-title">
        <header><span>First-class Stage 6 workflow</span><h2 id="applicant-stage-six-title">Structured questions and proposal authority</h2><p>This shared participant workflow is distinct from suitability, private shortlist organization, and applicant-stage decisions above.</p></header>
        <StructuredQaPanel applicationId={applicationId} authorityRefreshKey={authorityRefreshKey} onAttentionChange={() => void refreshWorkflowAuthorities()} />
      </section>

      <section className="applicant-later-workflows" aria-labelledby="applicant-later-title">
        <header><span>Stage 7 + Stage 8 distinct authorities</span><h2 id="applicant-later-title">Selection and failed-engagement recovery</h2><p>Exact-version selection and reconsideration remain separate sibling records. Reconsideration is now a first-class Stage 8 workflow bound to Gig Reopening.</p></header>
        <div className="applicant-later-child" data-later-stage="selection"><SelectionPanel applicationId={applicationId} authorityRefreshKey={authorityRefreshKey} onChanged={refreshWorkflowAuthorities} /></div>
        <div className="applicant-later-child" data-later-stage="reconsideration"><ReconsiderationPanel applicationId={applicationId} authorityRefreshKey={authorityRefreshKey} onChanged={() => void refreshWorkflowAuthorities()} /></div>
      </section>

      {dialog ? <ApplicantReviewDialog mode={dialog} applicantName={applicantName} applicationStage={detail.stage} isSubmitting={working} stillAuthorized={dialogAuthorized(dialog, detail.allowed_actions)} error={error} onConfirm={submitDialog} onDismiss={() => setDialog(null)} /> : null}
    </section>
  );
}

function StageFiveState({ title, body, error = false }: { title: string; body: string; error?: boolean }) { return <section className="stage-five-page"><div className={`stage-five-state-panel${error ? " is-error" : ""}`} role={error ? "alert" : "status"}><span>Applicant review record</span><h1>{title}</h1><p>{body}</p>{error ? <Button to="/gigs/manage" variant="secondary">Return to managed gigs</Button> : null}</div></section>; }
function Notice({ tone, title, body }: { tone: "error" | "success"; title: string; body: string }) { return <div className={`stage-five-notice is-${tone}`} role={tone === "error" ? "alert" : "status"}><strong>{title}</strong><p>{body}</p></div>; }
function Fact({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value.replace(/_/g, " ")}</dd></div>; }

function SkillList({ label, value }: { label: string; value: unknown }) {
  const names = Array.isArray(value) ? value.flatMap((item) => isRecord(item) && typeof item.skill_name === "string" ? [item.skill_name] : []) : [];
  return <div><h3>{label}</h3><p>{names.length ? names.join(" · ") : "None listed"}</p></div>;
}

function TermsSnapshot({ title, version, terms }: { title: string; version: number; terms: Record<string, unknown> }) {
  return <article className="applicant-terms-snapshot"><header><span>Gig v{version}</span><h3>{title}</h3></header><dl>{Object.entries(terms).map(([key, value]) => <div key={key}><dt>{key.replace(/_/g, " ")}</dt><dd>{structuredValue(value)}</dd></div>)}</dl></article>;
}

function ReviewEvent({ event }: { event: Record<string, unknown> }) {
  const detail = isRecord(event.detail) ? event.detail : {};
  const feedback = Array.isArray(detail.feedback_points) ? detail.feedback_points.filter((value): value is string => typeof value === "string") : [];
  return <li><div><strong>{String(event.event_type ?? "Application event").replace(/_/g, " ")}</strong><small>{formatReviewDate(event.occurred_at)}</small></div>{event.reason_code ? <p>Reason: {String(event.reason_code).replace(/_/g, " ")}</p> : null}{feedback.map((point, index) => <p key={`${index}-${point}`}>Feedback: {point}</p>)}{typeof detail.respectful_note === "string" ? <p>Note: {detail.respectful_note}</p> : null}{typeof detail.other_explanation === "string" ? <p>Explanation: {detail.other_explanation}</p> : null}{typeof detail.reopen_explanation === "string" ? <p>Reopen explanation: {detail.reopen_explanation}</p> : null}</li>;
}

function dialogAuthorized(mode: ApplicantReviewDialogMode, actions: string[]): boolean {
  const action = { advance: "advance", return: "return_to_review", not_selected: "mark_not_selected", reopen: "reopen" }[mode];
  return actions.includes(action);
}

function formatScore(value: number | null): string { return value === null ? "Unavailable" : `${Math.round(value * 100)}%`; }

function comparisonValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not specified";
  if (Array.isArray(value)) return value.map((item) => structuredValue(item)).join(" · ") || "No items";
  if (isRecord(value)) return Object.entries(value).map(([key, item]) => `${key.replace(/_/g, " ")}: ${structuredValue(item)}`).join(" · ") || "No structured values";
  return String(value);
}

function structuredValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not specified";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" || typeof value === "number") return String(value).replace(/_/g, " ");
  if (Array.isArray(value)) return value.map((item) => structuredValue(item)).join(" · ") || "None";
  if (isRecord(value)) return Object.entries(value).map(([key, item]) => `${key.replace(/_/g, " ")}: ${structuredValue(item)}`).join(" · ") || "None";
  return "Not specified";
}
