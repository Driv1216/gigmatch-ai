import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { MatchExplanationPanel } from "../components/MatchExplanationPanel";
import { PageContainer } from "../components/PageContainer";
import { useAuth } from "../context/AuthContext";
import { fetchClientGigs, type Gig } from "../lib/gigs";
import {
  fetchRecommendedFreelancersForGig,
  MatchingApiError,
  type RecommendedFreelancerItem,
} from "../lib/matching";
import { formatScoreValue } from "../lib/matchingExplanations";

function formatDate(value: string | null) {
  if (!value) {
    return "No deadline";
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatUpdatedAt(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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
  const { user } = useAuth();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedGigId, setSelectedGigId] = useState<string | null>(null);
  const [recommendedFreelancers, setRecommendedFreelancers] = useState<RecommendedFreelancerItem[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);

  const selectedGig = gigs.find((gig) => gig.id === selectedGigId) ?? null;

  useEffect(() => {
    let isMounted = true;

    async function loadGigs() {
      if (!user) {
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextGigs = await fetchClientGigs(user.id);

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
  }, [user]);

  async function loadRecommendedFreelancers(gig: Gig) {
    setSelectedGigId(gig.id);
    setIsLoadingRecommendations(true);
    setRecommendationsError(null);
    setRecommendedFreelancers([]);

    try {
      const envelope = await fetchRecommendedFreelancersForGig(gig.id);
      setRecommendedFreelancers(envelope.items);
    } catch (error) {
      setRecommendationsError(getRecommendationErrorMessage(error));
    } finally {
      setIsLoadingRecommendations(false);
    }
  }

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
              <article key={gig.id} className="rounded-lg border border-line bg-white p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold tracking-normal text-ink">{gig.title}</h2>
                      <span className="rounded-full border border-line bg-slate-50 px-3 py-1 text-xs font-semibold uppercase text-muted">
                        {gig.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-accent">{gig.tech_category}</p>
                    <p className="mt-3 text-sm leading-6 text-muted">
                      Required skills: {gig.required_skills.length > 0 ? gig.required_skills.join(", ") : "None listed"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted">Deadline: {formatDate(gig.deadline)}</p>
                    <p className="mt-2 text-xs font-medium text-muted">Updated {formatUpdatedAt(gig.updated_at)}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => loadRecommendedFreelancers(gig)}
                      disabled={isLoadingRecommendations}
                    >
                      {isLoadingRecommendations && selectedGigId === gig.id
                        ? "Loading Recommendations"
                        : "View Recommendations"}
                    </Button>
                    <Button to={`/gigs/${gig.id}/parse`} variant="secondary">
                      Parse Requirements
                    </Button>
                    <Button to={`/gigs/${gig.id}/edit`} variant="secondary">
                      Edit Gig
                    </Button>
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
                  {selectedGig ? selectedGig.title : "Select a gig"}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                  {selectedGig
                    ? "Freelancers are ranked by the backend hybrid matching engine and shown in the order returned by the API."
                    : "Select a gig to view recommended freelancers."}
                </p>
              </div>
              {selectedGig ? (
                <span className="inline-flex w-fit rounded-full border border-line bg-slate-50 px-3 py-1 text-xs font-semibold uppercase text-muted">
                  {selectedGig.status}
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

        <dl className="grid min-w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:min-w-80">
          <ScorePill label="Hybrid" value={formatScore(freelancer.hybrid_score)} />
          <ScorePill label="Keyword" value={formatScore(freelancer.keyword_score)} />
          <ScorePill label="Semantic" value={formatScore(freelancer.semantic_score)} />
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
