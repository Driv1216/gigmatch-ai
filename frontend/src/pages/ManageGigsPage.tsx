import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { MatchExplanationPanel } from "../components/MatchExplanationPanel";
import { PageContainer } from "../components/PageContainer";
import { fetchManagedGigs, managementErrorMessage, runGigAction, type ManagedGig } from "../lib/gigManagement";
import {
  fetchRecommendedFreelancersForGig,
  MatchingApiError,
  type RankingContext,
  type RecommendedFreelancerItem,
} from "../lib/matching";
import { rankingPresentation } from "../lib/marketplaceView";
import { formatScoreValue } from "../lib/matchingExplanations";

function formatDate(value: string | null) {
  if (!value) {
    return "No deadline";
  }

  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getRecommendationErrorMessage(error: unknown) {
  if (error instanceof MatchingApiError) {
    const message = error.message.toLowerCase();

    if (error.status === 401) {
      return "Sign in again to load freelancer recommendations.";
    }

    if (error.status === 403 && message.includes("owned")) {
      return "We could not access recommendations for this gig. Confirm you own this gig and try again.";
    }

    if (error.status === 403) {
      return "Freelancer recommendations are available for client-owned gigs.";
    }

    if (error.status === 404) {
      return "This gig was not found.";
    }

    if (error.status === 503) {
      return "The matching service is not available right now.";
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "We could not load freelancer recommendations right now.";
}

function formatScore(score: number) {
  return formatScoreValue(score) ?? "Unavailable";
}

export function ManageGigsPage() {
  const [gigs, setGigs] = useState<ManagedGig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedGigId, setSelectedGigId] = useState<string | null>(null);
  const [recommendedFreelancers, setRecommendedFreelancers] = useState<RecommendedFreelancerItem[]>([]);
  const [rankingContext, setRankingContext] = useState<RankingContext | null>(null);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const selectedGig = gigs.find((gig) => gig.gig_id === selectedGigId) ?? null;

  useEffect(() => {
    let isMounted = true;

    async function loadGigs() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextGigs = await fetchManagedGigs();

        if (isMounted) {
          setGigs(nextGigs);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load gigs.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadGigs();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  async function loadRecommendedFreelancers(gig: ManagedGig) {
    setSelectedGigId(gig.gig_id);
    setIsLoadingRecommendations(true);
    setRecommendationsError(null);
    setRecommendedFreelancers([]);
    setRankingContext(null);

    try {
      const envelope = await fetchRecommendedFreelancersForGig(gig.gig_id);
      setRecommendedFreelancers(envelope.items);
      setRankingContext(envelope.ranking_context);
    } catch (error) {
      setRecommendationsError(getRecommendationErrorMessage(error));
    } finally {
      setIsLoadingRecommendations(false);
    }
  }

  async function runAction(gig: ManagedGig, action: "intake/close" | "intake/reopen" | "pause" | "resume" | "cancel") {
    let body: Record<string, unknown> | undefined;
    if (action === "intake/close") {
      const reason = window.prompt("Closure reason code", "moving_to_applicant_review");
      if (!reason) return;
      const explanation = reason === "other" ? window.prompt("Explain why applications are closing") : null;
      if (reason === "other" && !explanation) return;
      body = { reason, explanation };
    } else if (action === "pause") {
      const reason = window.prompt("Pause reason code", "business_delay");
      if (!reason) return;
      const explanation = reason === "other" ? window.prompt("Explain why the gig is paused") : null;
      if (reason === "other" && !explanation) return;
      body = { reason, explanation };
    } else if (action === "cancel") {
      if (!window.confirm("Cancel this published gig and close all active applications and requests? This is terminal.")) return;
      const explanation = window.prompt("Applicant-facing cancellation explanation");
      if (!explanation) return;
      const reason = window.prompt("Cancellation reason code", "opportunity_no_longer_required");
      if (!reason) return;
      const other = reason === "other" ? window.prompt("Explain the other cancellation reason") : null;
      if (reason === "other" && !other) return;
      body = { reason, applicant_facing_explanation: explanation, closes_active_records_confirmed: true, other_explanation: other };
    }
    setIsActing(true); setErrorMessage(null); setActionMessage(null);
    try {
      await runGigAction(gig.gig_id, action, body);
      setActionMessage("Gig state updated.");
      setReloadKey((value) => value + 1);
    } catch (error) {
      setErrorMessage(managementErrorMessage(error));
    } finally {
      setIsActing(false);
    }
  }

  const ranking = rankingContext ? rankingPresentation(rankingContext) : null;

  return (
    <PageContainer>
      <div className="rounded-lg border border-line bg-white p-8 shadow-soft">
        <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">Client Gigs</p>
            <h1 className="mt-3 text-3xl font-bold tracking-normal text-ink">Manage Gigs</h1>
          </div>
          <Button to="/gigs/new">Post a New Gig</Button>
        </div>

        {isLoading ? <p className="mt-8 text-sm font-medium text-muted">Loading gigs...</p> : null}

        {errorMessage ? (
          <p className="mt-8 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </p>
        ) : null}
        {actionMessage ? <p className="mt-8 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{actionMessage}</p> : null}

        {!isLoading && !errorMessage && gigs.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-line bg-slate-50 p-8">
            <h2 className="text-xl font-bold tracking-normal text-ink">No gigs posted yet</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Create the first structured gig before future parsing and matching milestones begin.
            </p>
            <div className="mt-6">
              <Button to="/gigs/new">Post a New Gig</Button>
            </div>
          </div>
        ) : null}

        {!isLoading && gigs.length > 0 ? (
          <div className="mt-8 space-y-4">
            {gigs.map((gig) => (
              <article key={gig.gig_id} className="rounded-lg border border-line bg-white p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold tracking-normal text-ink">{String(gig.terms.title ?? "Untitled gig")}</h2>
                      <span className="rounded-full border border-line bg-slate-50 px-3 py-1 text-xs font-semibold uppercase text-muted">
                        {gig.product_state.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-accent">{String((gig.terms.scope as Record<string, unknown> | undefined)?.tech_category ?? "Uncategorised")}</p>
                    <p className="mt-3 text-sm leading-6 text-muted">
                      Required skills: {Array.isArray(gig.terms.required_skills) ? gig.terms.required_skills.join(", ") : "None listed"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted">Deadline: {formatDate(typeof gig.terms.application_deadline === "string" ? gig.terms.application_deadline : null)}</p>
                    <p className="mt-2 text-xs font-medium text-muted">Display v{gig.current_display_version_number} · Material v{gig.current_material_version_number}</p>
                    <p className="mt-2 text-xs font-medium text-muted">{gig.accepting_applications ? "Effectively accepting applications" : "Not effectively accepting applications"}</p>
                    {gig.upgrade_required ? <p className="mt-2 text-sm font-semibold text-amber-700">Upgrade Required — contract-zero terms remain excluded from discovery.</p> : null}
                    {gig.blocking_reason_codes.map((code) => <p key={code} className="mt-1 text-xs font-semibold text-amber-700">{code.replace(/_/g, " ")}</p>)}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => loadRecommendedFreelancers(gig)}
                      disabled={isLoadingRecommendations || gig.upgrade_required || gig.lifecycle !== "active"}
                    >
                      {isLoadingRecommendations && selectedGigId === gig.gig_id
                        ? "Loading Recommendations"
                        : "View Recommendations"}
                    </Button>
                    <Button to={`/gigs/${gig.gig_id}/parse`} variant="secondary">
                      Parse Requirements
                    </Button>
                    <Button to={`/gigs/${gig.gig_id}/edit`} variant="secondary">
                      {gig.lifecycle === "draft" ? "Complete & Publish" : gig.upgrade_required ? "Upgrade Terms" : "Edit Version"}
                    </Button>
                    {gig.allowed_actions.includes("close_intake") ? <Button type="button" variant="secondary" disabled={isActing} onClick={() => runAction(gig, "intake/close")}>Close Applications</Button> : null}
                    {gig.allowed_actions.includes("reopen_intake") ? <Button type="button" variant="secondary" disabled={isActing} onClick={() => runAction(gig, "intake/reopen")}>Reopen Applications</Button> : null}
                    {gig.allowed_actions.includes("pause") ? <Button type="button" variant="secondary" disabled={isActing || gig.effectively_active_selection_request} onClick={() => runAction(gig, "pause")}>Pause</Button> : null}
                    {gig.allowed_actions.includes("resume") ? <Button type="button" variant="secondary" disabled={isActing} onClick={() => runAction(gig, "resume")}>Resume</Button> : null}
                    {gig.allowed_actions.includes("cancel") ? <Button type="button" disabled={isActing} onClick={() => runAction(gig, "cancel")}>Cancel Gig</Button> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {!isLoading && !errorMessage && gigs.length > 0 ? (
          <section className="mt-8 border-t border-line pt-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-accent">Recommended freelancers</p>
                <h2 className="mt-3 text-2xl font-bold tracking-normal text-ink">
                  {selectedGig ? String(selectedGig.terms.title ?? "Untitled gig") : "Select a gig"}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                  {selectedGig
                    ? (ranking?.message ?? "Freelancers are ranked by the backend matching engine and shown in the order returned by the API.")
                    : "Select a gig to view recommended freelancers."}
                </p>
              </div>
              {selectedGig ? (
                <span className="inline-flex w-fit rounded-full border border-line bg-slate-50 px-3 py-1 text-xs font-semibold uppercase text-muted">
                  {selectedGig.product_state}
                </span>
              ) : null}
            </div>

            {!selectedGig ? (
              <div className="mt-6 rounded-lg border border-dashed border-line bg-slate-50 p-6">
                <h3 className="text-base font-bold tracking-normal text-ink">Select a gig to view recommendations</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                  Use the View Recommendations button on one of your gigs.
                </p>
              </div>
            ) : null}

            {isLoadingRecommendations ? (
              <p className="mt-6 text-sm font-medium text-muted">Loading recommended freelancers...</p>
            ) : null}

            {recommendationsError ? (
              <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5">
                <h3 className="text-sm font-semibold text-amber-900">Recommendations unavailable</h3>
                <p className="mt-2 text-sm leading-6 text-amber-800">{recommendationsError}</p>
              </div>
            ) : null}

            {selectedGig &&
            !isLoadingRecommendations &&
            !recommendationsError &&
            recommendedFreelancers.length === 0 ? (
              <div className="mt-6 rounded-lg border border-dashed border-line bg-slate-50 p-6">
                <h3 className="text-base font-bold tracking-normal text-ink">
                  No recommended freelancers available for this gig yet
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                  Recommendations will appear here when the matching API has eligible freelancer data to rank.
                </p>
              </div>
            ) : null}

            {selectedGig &&
            !isLoadingRecommendations &&
            !recommendationsError &&
            recommendedFreelancers.length > 0 ? (
              <div className="mt-6 space-y-5">
                {recommendedFreelancers.map((freelancer) => (
                  <RecommendedFreelancerCard
                    key={`${freelancer.rank}-${freelancer.freelancer_id}`}
                    freelancer={freelancer}
                  />
                ))}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </PageContainer>
  );
}

function RecommendedFreelancerCard({ freelancer }: { freelancer: RecommendedFreelancerItem }) {
  const ranking = rankingPresentation({
    ranking_mode: freelancer.ranking_mode,
    semantic_status: freelancer.semantic_status,
    semantic_unavailable_reason: freelancer.semantic_unavailable_reason,
  });
  return (
    <article className="rounded-lg border border-line bg-white p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <span className="rounded-full border border-line bg-slate-50 px-3 py-1 text-xs font-semibold text-muted">
            Rank {freelancer.rank}
          </span>
          <h3 className="mt-4 text-xl font-bold tracking-normal text-ink">
            {freelancer.headline ?? "Freelancer profile"}
          </h3>
          {freelancer.primary_role ? (
            <p className="mt-2 text-sm font-semibold text-accent">{freelancer.primary_role}</p>
          ) : null}
        </div>

        <dl className={`grid min-w-full grid-cols-1 gap-2 lg:min-w-80 ${ranking.showSemanticScore ? "sm:grid-cols-3" : "sm:grid-cols-1"}`}>
          {ranking.showHybridScore && freelancer.hybrid_score !== null ? <ScorePill label="Hybrid" value={formatScore(freelancer.hybrid_score)} /> : null}
          <ScorePill label="Keyword" value={formatScore(freelancer.keyword_score)} />
          {ranking.showSemanticScore && freelancer.semantic_score !== null ? <ScorePill label="Semantic" value={formatScore(freelancer.semantic_score)} /> : null}
        </dl>
      </div>

      <MatchExplanationPanel
        explanation={freelancer.explanation}
        title="Why this freelancer matched"
        className="mt-6 shadow-none"
      />
    </article>
  );
}

function ScorePill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-slate-50 px-3 py-2">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  );
}
