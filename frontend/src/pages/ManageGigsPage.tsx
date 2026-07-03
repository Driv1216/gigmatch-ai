import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { PageContainer } from "../components/PageContainer";
import { useAuth } from "../context/AuthContext";
import { fetchClientGigs, type Gig } from "../lib/gigs";

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

export function ManageGigsPage() {
  const { user } = useAuth();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      </div>
    </PageContainer>
  );
}
