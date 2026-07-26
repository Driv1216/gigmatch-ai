import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { PageContainer } from "../components/PageContainer";
import {
  fetchApplicants,
  setApplicantShortlist,
  type ApplicantListEnvelope,
  type ApplicantStatus,
  type ApplicantView,
} from "../lib/applicantReview";
import {
  applicantInboxState,
  applicantReviewErrorMessage,
  applicantScorePresentation,
  formatReviewDate,
  validApplicantViews,
} from "../lib/applicantReviewView";
import { isRecord } from "../lib/applicationContracts";
import { statusLabel } from "../lib/applicationView";

const statuses: ApplicantStatus[] = ["active", "not_selected", "withdrawn", "closed", "all"];

export function ApplicantInboxPage() {
  const { gigId } = useParams();
  const [view, setView] = useState<ApplicantView>("best_match");
  const [status, setStatus] = useState<ApplicantStatus>("active");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApplicantListEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const state = applicantInboxState(loading, error, data?.items.length ?? 0, status);
  const views = validApplicantViews(status, true);
  function chooseStatus(next: ApplicantStatus) {
    setStatus(next);
    setPage(1);
    if (!validApplicantViews(next, true).includes(view)) setView("best_match");
  }

  async function toggleShortlist(applicationId: string, shortlisted: boolean, token: string) {
    setWorkingId(applicationId);
    setError(null);
    try {
      await setApplicantShortlist(applicationId, shortlisted, token);
      await load();
    } catch (value) {
      const message = applicantReviewErrorMessage(value);
      await load().catch(() => undefined);
      setError(message);
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <PageContainer className="space-y-6">
      <header className="rounded-lg border border-line bg-white p-7 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Client applicant inbox</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">
          {String(data?.gig.title ?? "Review applicants")}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          Review every submitted application. Suitability evidence is current and AI-assisted; commercial
          terms remain tied to the exact application and gig versions shown.
        </p>
        {data?.gig.product_state ? (
          <p className="mt-3 text-xs font-semibold uppercase text-muted">
            Gig state: {String(data.gig.product_state).replace(/_/g, " ")}
          </p>
        ) : null}
      </header>

      <section aria-label="Applicant filters" className="rounded-lg border border-line bg-white p-5">
        <div className="flex flex-wrap gap-2">
          {statuses.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => chooseStatus(item)}
              aria-pressed={status === item}
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                status === item ? "border-brand bg-blue-50 text-brand" : "border-line text-muted"
              }`}
            >
              {item.replace(/_/g, " ")} {data?.counts[item] !== undefined ? `(${data.counts[item]})` : ""}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
          {views.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => { setView(item); setPage(1); }}
              aria-pressed={view === item}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${
                view === item ? "bg-ink text-white" : "bg-slate-100 text-muted"
              }`}
            >
              {item.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </section>

      {data?.ranking_context.ranking_mode === "keyword_fallback" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-bold text-amber-950">Keyword ranking fallback</h2>
          <p className="mt-2 text-sm text-amber-900">
            Semantic matching is unavailable ({String(data.ranking_context.semantic_unavailable_reason).replace(/_/g, " ")}).
            Scores shown are keyword-only.
          </p>
        </div>
      ) : null}

      {state === "loading" ? <p className="text-sm font-medium text-muted">Loading applicants...</p> : null}
      {state === "error" ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">{error}</div> : null}
      {state === "empty_active" ? (
        <div className="rounded-lg border border-dashed border-line bg-white p-8">
          <h2 className="text-xl font-bold text-ink">No active applicants</h2>
          <p className="mt-2 text-sm text-muted">New submitted applications will appear here without requiring a ranking score.</p>
        </div>
      ) : null}
      {state === "empty_history" ? (
        <div className="rounded-lg border border-dashed border-line bg-white p-8">
          <h2 className="text-xl font-bold text-ink">No applications in this history view</h2>
          <p className="mt-2 text-sm text-muted">Choose another status to continue reviewing application history.</p>
        </div>
      ) : null}

      {state === "ready" && data ? (
        <div className="space-y-4">
          {data.items.map((applicant) => {
            const score = applicantScorePresentation(applicant.suitability);
            const freelancer = applicant.freelancer;
            const commercial = applicant.commercial;
            const proposal = isRecord(commercial.proposal) ? commercial.proposal : {};
            const timeline = isRecord(commercial.timeline) ? commercial.timeline : {};
            const availability = isRecord(commercial.availability) ? commercial.availability : {};
            return (
              <article key={applicant.application_id} className="rounded-lg border border-line bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold text-ink">{String(freelancer.display_name ?? "Applicant")}</h2>
                      <span className="rounded-full border border-line bg-slate-50 px-3 py-1 text-xs font-semibold text-muted">
                        {statusLabel(applicant.stage)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-accent">{String(freelancer.headline ?? "Profile headline unavailable")}</p>
                    <p className="mt-2 text-sm text-muted">
                      {String(freelancer.experience_level ?? "Experience not specified")} · {String(freelancer.location ?? "Location not specified")}
                    </p>
                    <p className="mt-3 text-sm text-muted">
                      Skills: {Array.isArray(freelancer.skills) && freelancer.skills.length ? freelancer.skills.join(", ") : "Not listed"}
                    </p>
                  </div>
                  <div className="min-w-48 rounded-lg bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-muted">{applicant.suitability.evidence_label}</p>
                    <p className="mt-2 text-lg font-bold text-ink">{score.label}{score.score ? ` · ${score.score}` : ""}</p>
                    <p className="mt-2 text-xs text-muted">Generated {formatReviewDate(applicant.suitability.ranking_generated_at)}</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 border-t border-line pt-5 md:grid-cols-3">
                  <Summary label="Proposal" value={String(proposal.mode ?? proposal.payment_structure ?? "Review full proposal")} />
                  <Summary label="Timeline" value={String(timeline.mode ?? "Not specified")} />
                  <Summary label="Availability" value={String(availability.available_from ?? "Not specified")} />
                </div>
                <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted">{String(commercial.cover_note_preview ?? "")}</p>
                {commercial.response_to_updated_gig_required === true ? (
                  <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                    Response to the updated gig is required. Suitability still reflects current requirements.
                  </p>
                ) : null}
                {applicant.qa && (
                  applicant.qa.awaiting_other_participant_response_count > 0 ||
                  applicant.qa.open_revision_request_count > 0
                ) ? (
                  <p className="mt-3 text-sm font-semibold text-brand">
                    {applicant.qa.awaiting_other_participant_response_count > 0
                      ? `Awaiting ${applicant.qa.awaiting_other_participant_response_count} freelancer response${applicant.qa.awaiting_other_participant_response_count === 1 ? "" : "s"}`
                      : "Proposal revision request open"}
                  </p>
                ) : null}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted">
                    Submitted {formatReviewDate(applicant.submitted_at)} · Application v{String(commercial.application_version_number ?? "")}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {applicant.allowed_actions.includes("add_to_internal_shortlist") ? (
                      <Button variant="secondary" disabled={workingId === applicant.application_id} onClick={() => void toggleShortlist(applicant.application_id, true, applicant.shortlist_action_token)}>Add to shortlist</Button>
                    ) : null}
                    {applicant.allowed_actions.includes("remove_from_internal_shortlist") ? (
                      <Button variant="secondary" disabled={workingId === applicant.application_id} onClick={() => void toggleShortlist(applicant.application_id, false, applicant.shortlist_action_token)}>Remove shortlist</Button>
                    ) : null}
                    <Button to={`/gigs/${gigId}/applicants/${applicant.application_id}`}>View full application</Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {data && data.pagination.total_pages > 1 ? (
        <nav aria-label="Applicant pages" className="flex items-center justify-between rounded-lg border border-line bg-white p-4">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
          <p className="text-sm text-muted">Page {page} of {data.pagination.total_pages}</p>
          <Button variant="secondary" disabled={page >= data.pagination.total_pages} onClick={() => setPage((value) => value + 1)}>Next</Button>
        </nav>
      ) : null}
    </PageContainer>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase text-muted">{label}</p><p className="mt-1 text-sm font-medium text-ink">{value.replace(/_/g, " ")}</p></div>;
}
