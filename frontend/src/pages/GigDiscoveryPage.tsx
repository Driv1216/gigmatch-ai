import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { PageContainer } from "../components/PageContainer";
import { fetchOpenGigs, MarketplaceApiError, type GigDiscoveryEnvelope, type GigSummary } from "../lib/marketplace";
import { collectionViewState, formatDateTime, formatPayment, gigDetailPath, paginationState } from "../lib/marketplaceView";

const pageSize = 20;

export function GigDiscoveryPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<GigDiscoveryEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchOpenGigs(page, pageSize)
      .then((response) => {
        if (active) setData(response);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setData(null);
        setError(reason instanceof MarketplaceApiError || reason instanceof Error ? reason.message : "Unable to load open gigs.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [page]);

  const state = collectionViewState(loading, error, data?.items.length ?? 0);
  const pagination = data?.pagination;
  const controls = paginationState(pagination?.page ?? page, pagination?.total_pages ?? 0);

  return (
    <PageContainer className="space-y-6">
      <header className="rounded-lg border border-line bg-white p-8 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Open marketplace</p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal text-ink">Discover application-ready gigs</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
          Browse current published opportunities with complete terms, active intake, and a future application deadline.
        </p>
      </header>

      {state === "loading" ? <StatePanel title="Loading open gigs" body="Retrieving the latest marketplace opportunities..." /> : null}
      {state === "error" ? <StatePanel title="Open gigs unavailable" body={error ?? "Unable to load open gigs."} tone="error" /> : null}
      {state === "empty" ? <StatePanel title="No open gigs right now" body="There are no application-ready opportunities available at the moment." /> : null}

      {state === "ready" && data ? (
        <>
          <div className="space-y-5">
            {data.items.map((gig) => <GigSummaryCard key={gig.gig_id} gig={gig} />)}
          </div>
          <nav className="flex flex-col gap-3 rounded-lg border border-line bg-white p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between" aria-label="Gig pages">
            <p className="text-sm text-muted">
              Page {data.pagination.page} of {data.pagination.total_pages} · {data.pagination.total_items} open gigs
            </p>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" disabled={!controls.canGoPrevious} onClick={() => setPage((value) => value - 1)}>
                Previous
              </Button>
              <Button type="button" variant="secondary" disabled={!controls.canGoNext} onClick={() => setPage((value) => value + 1)}>
                Next
              </Button>
            </div>
          </nav>
        </>
      ) : null}
    </PageContainer>
  );
}

function GigSummaryCard({ gig }: { gig: GigSummary }) {
  return (
    <article className="rounded-lg border border-line bg-white p-6 shadow-soft">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase text-emerald-700">Open</span>
            <span className="rounded-full border border-line bg-slate-50 px-3 py-1 text-xs font-semibold text-muted">{gig.work_mode}</span>
          </div>
          <h2 className="mt-4 text-xl font-bold text-ink">{gig.title}</h2>
          <p className="mt-2 text-sm font-semibold text-accent">{gig.category}</p>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted">{gig.published_summary}</p>
        </div>
        <div className="min-w-56 rounded-md border border-line bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase text-muted">Payment</p>
          <p className="mt-2 text-sm font-bold text-ink">{formatPayment(gig.payment)}</p>
          <p className="mt-3 text-xs text-muted">Apply by {formatDateTime(gig.application_deadline)}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {gig.required_skills.map((skill) => <span key={skill} className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink">{skill}</span>)}
      </div>
      <div className="mt-6 flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">{gig.client.company_name ?? gig.client.display_name}</p>
          {gig.client.industry ? <p className="mt-1 text-xs text-muted">{gig.client.industry}</p> : null}
        </div>
        <Button to={gigDetailPath(gig.gig_id)} variant="secondary">View full details</Button>
      </div>
    </article>
  );
}

function StatePanel({ title, body, tone = "neutral" }: { title: string; body: string; tone?: "neutral" | "error" }) {
  return (
    <div className={`rounded-lg border p-8 ${tone === "error" ? "border-red-200 bg-red-50" : "border-line bg-white"}`}>
      <h2 className={`text-lg font-bold ${tone === "error" ? "text-red-800" : "text-ink"}`}>{title}</h2>
      <p className={`mt-2 text-sm leading-6 ${tone === "error" ? "text-red-700" : "text-muted"}`}>{body}</p>
    </div>
  );
}
