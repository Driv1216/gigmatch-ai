import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ApplicantReviewContextRail } from "../components/ApplicantReviewContextRail";
import { Button } from "../components/Button";
import { WorkflowStatusBadge } from "../components/WorkflowStatusBadge";
import {
  fetchApplicants,
  setApplicantShortlist,
  type ApplicantListEnvelope,
  type ApplicantStatus,
  type ApplicantView,
} from "../lib/applicantReview";
import {
  applicantActionBlockerMessage,
  applicantInboxState,
  applicantRankingModeLabel,
  applicantRankingUnavailableMessage,
  applicantReviewErrorMessage,
  applicantScorePresentation,
  formatReviewDate,
  validApplicantViews,
} from "../lib/applicantReviewView";
import { isRecord } from "../lib/applicationContracts";

const statuses: Array<[ApplicantStatus, string]> = [
  ["active", "Active review"],
  ["not_selected", "Not Selected"],
  ["withdrawn", "Withdrawn"],
  ["closed", "Closed history"],
  ["all", "All records"],
];

const viewLabels: Record<ApplicantView, string> = {
  best_match: "Best Match",
  newest: "Newest",
  internal_shortlist: "Internal Shortlist",
  advanced: "Advanced",
};

export function ApplicantInboxPage() {
  const { gigId } = useParams();
  const [view, setView] = useState<ApplicantView>("best_match");
  const [status, setStatus] = useState<ApplicantStatus>("active");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApplicantListEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!gigId) throw new Error("Gig identifier is missing.");
    setLoading(true);
    setError(null);
    try {
      setData(await fetchApplicants(gigId, { view, status, page }));
    } catch (value) {
      setError(applicantReviewErrorMessage(value));
    } finally {
      setLoading(false);
    }
  }, [gigId, page, status, view]);

  useEffect(() => { void load(); }, [load]);

  const staleRecord = Boolean(data && gigId && String(data.gig.gig_id ?? "") !== gigId);
  const state = applicantInboxState(loading || staleRecord, error, data?.items.length ?? 0, status);
  const views = validApplicantViews(status, true);
  const gigTitle = String(data?.gig.title ?? "Applicant review");
  const gigState = String(data?.gig.product_state ?? data?.gig.lifecycle ?? "Loading");

  function chooseStatus(next: ApplicantStatus) {
    setStatus(next);
    setPage(1);
    setActionError(null);
    if (!validApplicantViews(next, true).includes(view)) setView("best_match");
  }

  async function toggleShortlist(applicationId: string, shortlisted: boolean, token: string) {
    setWorkingId(applicationId);
    setActionError(null);
    try {
      await setApplicantShortlist(applicationId, shortlisted, token);
      await load();
    } catch (value) {
      const message = applicantReviewErrorMessage(value);
      await load().catch(() => undefined);
      setActionError(message);
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <section className="stage-five-page applicant-inbox-page" aria-busy={loading}>
      <ApplicantReviewContextRail
        gigTitle={gigTitle}
        gigState={gigState}
        returnTo="/gigs/manage"
        returnLabel="Return to managed gigs"
      />

      <header className="stage-five-editorial-header">
        <div><p>Client operations / Complete applicant pool</p><h1>{gigTitle}</h1></div>
        <div className="stage-five-editorial-context">
          <span>Rank, organize, then decide</span>
          <p>Every real application remains in this register. Current suitability evidence and exact commercial proposal evidence stay separate.</p>
          <strong>{data?.counts.all ?? "—"} total application record{data?.counts.all === 1 ? "" : "s"}</strong>
        </div>
      </header>

      <section className="applicant-filter-board" aria-label="Applicant register controls">
        <div className="applicant-status-tabs" role="group" aria-label="Application stage groups">
          {statuses.map(([value, label]) => (
            <button key={value} type="button" onClick={() => chooseStatus(value)} aria-pressed={status === value}>
              <span>{label}</span><strong>{data?.counts[value] ?? "—"}</strong>
            </button>
          ))}
        </div>
        <div className="applicant-view-tabs" role="group" aria-label="Authoritative applicant ordering">
          <span>Order / focused view</span>
          {views.map((item) => (
            <button key={item} type="button" onClick={() => { setView(item); setPage(1); setActionError(null); }} aria-pressed={view === item}>
              {viewLabels[item]}
            </button>
          ))}
        </div>
      </section>

      {data?.ranking_context.ranking_mode === "keyword_fallback" ? (
        <section className="applicant-ranking-notice" aria-labelledby="keyword-fallback-title">
          <span>Ranking context / Entire rankable subset</span>
          <h2 id="keyword-fallback-title">Keyword-only fallback is active</h2>
          <p>Semantic matching is unavailable ({String(data.ranking_context.semantic_unavailable_reason ?? "provider unavailable").replace(/_/g, " ")}). Every score shown in this context is keyword-only; no hybrid or semantic score is implied.</p>
        </section>
      ) : null}

      {actionError ? <Notice title="Applicant organization stopped" body={actionError} /> : null}
      {state === "loading" ? <StatePanel title="Loading applicant register" body="Retrieving the complete pool, authoritative ordering, private review state, and current evidence…" /> : null}
      {state === "error" ? <StatePanel title="Applicant register unavailable" body={error ?? "Unable to load applicant review."} retry={() => void load()} error /> : null}
      {state === "empty_active" ? (
        view === "internal_shortlist" || view === "advanced"
          ? <StatePanel title={`No applicants in ${viewLabels[view]}`} body="The complete active applicant pool is unchanged. This authoritative focused view currently contains no records." />
          : <StatePanel title="No active applicants" body="No application is currently Under Review or Advanced. Real submitted applications will appear here even when suitability evidence is unavailable." />
      ) : null}
      {state === "empty_history" ? <StatePanel title="No records in this history view" body="This authoritative filter returned no application records. Choose another stage group to continue." /> : null}

      {state === "ready" && data ? (
        <div className="applicant-register" aria-label="Applicant review register">
          <div className="applicant-register-heading" aria-hidden="true"><span>Lane</span><span>Applicant record</span><span>Current suitability</span><span>Commercial / private state</span><span>Destination</span></div>
          {data.items.map((applicant, index) => {
            const score = applicantScorePresentation(applicant.suitability);
            const freelancer = applicant.freelancer;
            const commercial = applicant.commercial;
            const proposal = isRecord(commercial.proposal) ? commercial.proposal : {};
            const timeline = isRecord(commercial.timeline) ? commercial.timeline : {};
            const availability = isRecord(commercial.availability) ? commercial.availability : {};
            const isShortlisted = applicant.review_state.is_shortlisted;
            return (
              <article key={applicant.application_id} className="applicant-register-lane">
                <span className="applicant-register-index">{String((page - 1) * data.pagination.page_size + index + 1).padStart(2, "0")}</span>
                <div className="applicant-register-record">
                  <div className="applicant-register-kicker"><WorkflowStatusBadge status={applicant.stage} /><span>Application v{String(commercial.application_version_number ?? "—")}</span></div>
                  <h2>{String(freelancer.display_name ?? "Applicant")}</h2>
                  <p>{String(freelancer.headline ?? "Profile headline unavailable")}</p>
                  <small>{String(freelancer.experience_level ?? "Experience not specified")} · {String(freelancer.location ?? "Location not specified")}</small>
                  <p className="applicant-register-skills">{skillSummary(freelancer.skills)}</p>
                </div>
                <div className={`applicant-register-suitability${score.score ? " is-available" : " is-unavailable"}`}>
                  <span>{applicant.suitability.evidence_label}</span>
                  <strong>{score.label}</strong>
                  {score.score ? <b>{score.score}</b> : <p>{applicantRankingUnavailableMessage(applicant.suitability.ranking_unavailable_reason)}</p>}
                  <small>{applicantRankingModeLabel(applicant.suitability.ranking_mode)}</small>
                  {applicant.suitability.strongest_matching_evidence ? <p>Strongest evidence: {applicant.suitability.strongest_matching_evidence}</p> : null}
                </div>
                <div className="applicant-register-commercial">
                  <span>Current commercial proposal</span>
                  <strong>{proposalSummary(proposal)}</strong>
                  <dl><Fact label="Timeline" value={String(timeline.mode ?? "Not specified")} /><Fact label="Available" value={String(availability.available_from ?? "Not specified")} /></dl>
                  <p className="applicant-private-state"><b>Private organization</b>{isShortlisted ? "Included on Internal Shortlist" : "Not on Internal Shortlist"}</p>
                  {commercial.response_to_updated_gig_required === true ? <p className="applicant-updated-warning">Answers gig v{String(commercial.answered_gig_version_number ?? "—")}; current material terms are v{String(commercial.current_material_gig_version_number ?? "—")}.</p> : null}
                  {applicant.action_blockers.map((blocker) => <p className="applicant-inline-blocker" key={blocker}>{applicantActionBlockerMessage(blocker)}</p>)}
                </div>
                <div className="applicant-register-action">
                  <small>Submitted {formatReviewDate(applicant.submitted_at)}</small>
                  {applicant.qa?.qa_requires_attention ? <p>Later-stage Q&amp;A attention is attached to this record.</p> : null}
                  <div>
                    {applicant.allowed_actions.includes("add_to_internal_shortlist") ? <Button type="button" variant="secondary" disabled={workingId === applicant.application_id} onClick={() => void toggleShortlist(applicant.application_id, true, applicant.shortlist_action_token)}>Add to Internal Shortlist</Button> : null}
                    {applicant.allowed_actions.includes("remove_from_internal_shortlist") ? <Button type="button" variant="secondary" disabled={workingId === applicant.application_id} onClick={() => void toggleShortlist(applicant.application_id, false, applicant.shortlist_action_token)}>Remove from Internal Shortlist</Button> : null}
                    <Button to={`/gigs/${encodeURIComponent(gigId ?? "")}/applicants/${encodeURIComponent(applicant.application_id)}`}>Open review record</Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {data && data.pagination.total_pages > 1 ? (
        <nav aria-label="Applicant register pages" className="applicant-pagination">
          <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous page</Button>
          <p>Page {data.pagination.page} of {data.pagination.total_pages} · {data.pagination.total_items} filtered records</p>
          <Button type="button" variant="secondary" disabled={page >= data.pagination.total_pages} onClick={() => setPage((value) => value + 1)}>Next page</Button>
        </nav>
      ) : null}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value.replace(/_/g, " ")}</dd></div>; }

function StatePanel({ title, body, retry, error = false }: { title: string; body: string; retry?: () => void; error?: boolean }) {
  return <div className={`stage-five-state-panel${error ? " is-error" : ""}`} role={error ? "alert" : "status"}><span>Applicant register</span><h2>{title}</h2><p>{body}</p>{retry ? <Button type="button" variant="secondary" onClick={retry}>Try again</Button> : null}</div>;
}

function Notice({ title, body }: { title: string; body: string }) { return <div className="stage-five-notice is-error" role="alert"><strong>{title}</strong><p>{body}</p></div>; }

function skillSummary(value: unknown): string {
  const skills = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
  return skills.length ? `Current skills · ${skills.join(" · ")}` : "Current skills unavailable";
}

function proposalSummary(proposal: Record<string, unknown>): string {
  const currency = typeof proposal.currency === "string" ? proposal.currency : "";
  if (proposal.exact_total !== undefined) return `${currency} ${String(proposal.exact_total)} total`.trim();
  if (proposal.requested_hourly_rate !== undefined) return `${currency} ${String(proposal.requested_hourly_rate)} / hour`.trim();
  if (proposal.hourly_rate !== undefined) return `${currency} ${String(proposal.hourly_rate)} / hour`.trim();
  if (proposal.mode === "comfortable_within_posted_budget") return "Comfortable within posted budget";
  if (Array.isArray(proposal.phases)) return `${proposal.phases.length} structured pricing phase${proposal.phases.length === 1 ? "" : "s"}`;
  return String(proposal.mode ?? proposal.payment_structure ?? "Open complete proposal").replace(/_/g, " ");
}
