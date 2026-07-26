import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { PageContainer } from "../components/PageContainer";
import { fetchApplications, type ApplicationEnvelope } from "../lib/applications";
import { applicationCollectionState, statusLabel } from "../lib/applicationView";

export function MyApplicationsPage() {
  const [data, setData] = useState<ApplicationEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    fetchApplications().then((value) => { if (active) setData(value); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load applications."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const state = applicationCollectionState(loading, error, data?.items.length ?? 0);
  return <PageContainer className="space-y-6">
    <header><p className="text-sm font-semibold text-accent">Freelancer workspace</p><h1 className="mt-2 text-3xl font-bold text-ink">My applications</h1></header>
    {state === "loading" ? <p className="text-sm text-muted">Loading applications...</p> : null}
    {state === "error" ? <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-5 text-red-700">{error}</div> : null}
    {state === "empty" ? <div className="rounded-lg border border-line bg-white p-8"><h2 className="text-xl font-bold text-ink">No applications yet</h2><p className="mt-2 text-sm text-muted">Browse published gigs and submit a proposal when the fit is right.</p><div className="mt-5"><Button to="/gigs">Browse open gigs</Button></div></div> : null}
    {state === "ready" ? <div className="grid gap-4">{data?.items.map((item) => <article key={item.application_id} className="rounded-lg border border-line bg-white p-6 shadow-soft"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase text-muted">{statusLabel(item.stage)} · version {item.current_version_number}</p><h2 className="mt-2 text-xl font-bold text-ink">{String(item.gig.title ?? "Gig")}</h2><p className="mt-1 text-sm text-muted">{String(item.client.company_name ?? item.client.display_name ?? "Client")}</p></div><Button to={`/applications/${item.application_id}`} variant="secondary">View application</Button></div>{item.qa?.qa_requires_attention ? <p className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-950">{item.qa.pending_question_count ? `${item.qa.pending_question_count} structured question response${item.qa.pending_question_count === 1 ? "" : "s"} requested` : "A proposal-revision response is requested"}</p> : null}{item.response_to_updated_gig_required ? <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">Response required: the client changed material gig terms.</p> : null}</article>)}</div> : null}
  </PageContainer>;
}
