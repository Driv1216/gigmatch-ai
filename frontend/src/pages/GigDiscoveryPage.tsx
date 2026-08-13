import { useEffect, useState } from "react";
import { Button } from "../components/Button";
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
    <section className="stage-two-page discovery-page" aria-busy={loading}>
      <header className="stage-two-editorial-header">
        <div>
          <p>OPEN MARKETPLACE / PUBLISHED OPPORTUNITIES</p>
          <h1>Find the brief worth opening.</h1>
        </div>
        <div className="stage-two-editorial-context">
          <span>Source: open-gig discovery</span>
          <p>
            These are paginated application-ready gigs, not personalized recommendations. No ranking or match score is applied to this list.
          </p>
        </div>
      </header>

      {state === "loading" ? <StatePanel title="Loading open gigs" body="Retrieving the latest marketplace opportunities…" /> : null}
      {state === "error" ? <StatePanel title="Open gigs unavailable" body={error ?? "Unable to load open gigs."} tone="error" /> : null}
      {state === "empty" ? <StatePanel title="No open gigs right now" body="There are no application-ready opportunities available at the moment." /> : null}

      {state === "ready" && data ? (
        <div className="discovery-board">
          <div className="discovery-board-heading" aria-hidden="true">
            <span>Lane</span><span>Opportunity</span><span>Terms + timing</span>
          </div>
          <ol className="discovery-list">
            {data.items.map((gig, index) => (
              <li key={gig.gig_id}><GigSummaryRow gig={gig} index={(data.pagination.page - 1) * data.pagination.page_size + index + 1} /></li>
            ))}
          </ol>
          <nav className="stage-two-pagination" aria-label="Gig pages">
            <p>
              <span>Open discovery</span>
              Page {data.pagination.page} of {data.pagination.total_pages} · {data.pagination.total_items} open gigs
            </p>
            <div>
              <Button type="button" variant="secondary" disabled={!controls.canGoPrevious} onClick={() => setPage((value) => value - 1)}>
                Previous
              </Button>
              <Button type="button" variant="secondary" disabled={!controls.canGoNext} onClick={() => setPage((value) => value + 1)}>
                Next
              </Button>
            </div>
          </nav>
        </div>
      ) : null}
    </section>
  );
}

function GigSummaryRow({ gig, index }: { gig: GigSummary; index: number }) {
  const clientName = gig.client.company_name ?? gig.client.display_name;
  return (
    <article className="discovery-row">
      <div className="discovery-row-index">{String(index).padStart(2, "0")}</div>
      <div className="discovery-row-main">
        <div className="discovery-row-status">
          <span>Open</span>
          <span>{humanize(gig.work_mode)}</span>
          {gig.location_requirement ? <span>{gig.location_requirement}</span> : null}
        </div>
        <h2>{gig.title}</h2>
        <p className="discovery-row-source">{clientName} · {gig.category}{gig.client.industry ? ` · ${gig.client.industry}` : ""}</p>
        <p className="discovery-row-summary">{gig.published_summary}</p>
        <div className="discovery-skill-groups">
          <SkillGroup label="Required" values={gig.required_skills} />
          <SkillGroup label="Preferred" values={gig.preferred_skills} />
        </div>
      </div>
      <div className="discovery-row-terms">
        <dl>
          <div><dt>Payment</dt><dd>{formatPayment(gig.payment)}</dd></div>
          <div><dt>Apply by</dt><dd><time dateTime={gig.application_deadline}>{formatDateTime(gig.application_deadline)}</time></dd></div>
          <div><dt>Experience</dt><dd>{humanize(gig.experience_requirement)}</dd></div>
        </dl>
        <Button to={gigDetailPath(gig.gig_id)} variant="secondary">Open complete gig</Button>
      </div>
    </article>
  );
}

function SkillGroup({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <span>{label}</span>
      <ul>
        {values.length ? values.map((skill) => <li key={skill}>{skill}</li>) : <li>None specified</li>}
      </ul>
    </div>
  );
}

function StatePanel({ title, body, tone = "neutral" }: { title: string; body: string; tone?: "neutral" | "error" }) {
  return (
    <div className={`stage-two-state-panel${tone === "error" ? " is-error" : ""}`} role={tone === "error" ? "alert" : "status"}>
      <span>{tone === "error" ? "Controlled error" : "Marketplace state"}</span>
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}

function humanize(value: string) {
  return value.replace(/_/g, " ");
}
