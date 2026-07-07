import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { MatchExplanationPanel } from "../components/MatchExplanationPanel";
import { PageContainer } from "../components/PageContainer";
import { useAuth } from "../context/AuthContext";
import {
  fetchRecommendedGigs,
  MatchingApiError,
  type RecommendedGigItem,
} from "../lib/matching";
import { formatScoreValue } from "../lib/matchingExplanations";

function getRecommendationErrorMessage(error: unknown) {
  if (error instanceof MatchingApiError) {
    const message = error.message.toLowerCase();

    if (error.status === 401) {
      return "Sign in again to load recommendations.";
    }

    if (error.status === 403 && message.includes("freelancer profile")) {
      return "Complete your freelancer profile to receive recommendations.";
    }

    if (error.status === 403) {
      return "Recommendations are available for freelancer accounts with a completed profile.";
    }

    if (error.status === 503) {
      return "The matching service is not available right now.";
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "We could not load recommendations right now.";
}

function formatScore(score: number) {
  return formatScoreValue(score) ?? "Unavailable";
}

export function FreelancerDashboardPage() {
  const { user } = useAuth();
  const [recommendedGigs, setRecommendedGigs] = useState<RecommendedGigItem[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRecommendations() {
      if (!user) {
        setIsLoadingRecommendations(false);
        return;
      }

      setIsLoadingRecommendations(true);
      setRecommendationsError(null);

      try {
        const envelope = await fetchRecommendedGigs();

        if (isMounted) {
          setRecommendedGigs(envelope.items);
        }
      } catch (error) {
        if (isMounted) {
          setRecommendedGigs([]);
          setRecommendationsError(getRecommendationErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoadingRecommendations(false);
        }
      }
    }

    loadRecommendations();

    return () => {
      isMounted = false;
    };
  }, [user]);

  return (
    <PageContainer className="space-y-8">
      <div className="rounded-lg border border-line bg-white p-8 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Freelancer</p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal text-ink">Freelancer Dashboard</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
          Manage your profile, keep your reviewed resume skills current, and review backend-ranked gig recommendations.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button to="/profile/freelancer">Complete / Edit Smart Profile</Button>
          <Button to="/profile/resume-parse" variant="secondary">
            Resume Parser
          </Button>
        </div>
      </div>

      <section className="rounded-lg border border-line bg-white p-8 shadow-soft">
        <div className="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">Recommended gigs</p>
            <h2 className="mt-3 text-2xl font-bold tracking-normal text-ink">Backend-ranked opportunities</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Matches are ranked by the backend hybrid matching engine and shown in the order returned by the API.
            </p>
          </div>
          <span className="inline-flex w-fit rounded-full border border-line bg-slate-50 px-3 py-1 text-xs font-semibold uppercase text-muted">
            Hybrid ranking
          </span>
        </div>

        {isLoadingRecommendations ? (
          <p className="mt-8 text-sm font-medium text-muted">Loading recommendations...</p>
        ) : null}

        {recommendationsError ? (
          <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-5">
            <h3 className="text-sm font-semibold text-amber-900">Recommendations unavailable</h3>
            <p className="mt-2 text-sm leading-6 text-amber-800">{recommendationsError}</p>
          </div>
        ) : null}

        {!isLoadingRecommendations && !recommendationsError && recommendedGigs.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-line bg-slate-50 p-6">
            <h3 className="text-base font-bold tracking-normal text-ink">No recommendations available yet</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Open gigs will appear here when the matching API has enough eligible data to rank.
            </p>
          </div>
        ) : null}

        {!isLoadingRecommendations && !recommendationsError && recommendedGigs.length > 0 ? (
          <div className="mt-8 space-y-5">
            {recommendedGigs.map((gig) => (
              <RecommendedGigCard key={`${gig.rank}-${gig.gig_id}`} gig={gig} />
            ))}
          </div>
        ) : null}
      </section>
    </PageContainer>
  );
}

function RecommendedGigCard({ gig }: { gig: RecommendedGigItem }) {
  return (
    <article className="rounded-lg border border-line bg-white p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-line bg-slate-50 px-3 py-1 text-xs font-semibold text-muted">
              Rank {gig.rank}
            </span>
            {gig.status ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase text-emerald-700">
                {gig.status}
              </span>
            ) : null}
          </div>
          <h3 className="mt-4 text-xl font-bold tracking-normal text-ink">{gig.title ?? "Untitled gig"}</h3>
          {gig.category ? <p className="mt-2 text-sm font-semibold text-accent">{gig.category}</p> : null}
        </div>

        <dl className="grid min-w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:min-w-80">
          <ScorePill label="Hybrid" value={formatScore(gig.hybrid_score)} />
          <ScorePill label="Keyword" value={formatScore(gig.keyword_score)} />
          <ScorePill label="Semantic" value={formatScore(gig.semantic_score)} />
        </dl>
      </div>

      <MatchExplanationPanel explanation={gig.explanation} className="mt-6 shadow-none" />
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
