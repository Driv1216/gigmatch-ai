import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { PageContainer } from "../components/PageContainer";
import { fetchEngagements, type Engagement } from "../lib/engagements";

export function EngagementListPage() {
  const [items, setItems] = useState<Engagement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    fetchEngagements()
      .then((result) => { if (active) setItems(result.items); })
      .catch((value: unknown) => {
        if (active) setError(value instanceof Error ? value.message : "Unable to load engagements.");
      });
    return () => { active = false; };
  }, []);
  return (
    <PageContainer className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-accent">Shared workspace</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Engagements</h1>
        <p className="mt-2 text-sm text-muted">Active and historical confirmed work relationships.</p>
      </header>
      {error ? <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-5 text-red-700">{error}</div> : null}
      {!items && !error ? <p className="text-sm text-muted" aria-busy="true">Loading engagements…</p> : null}
      {items?.length === 0 ? <div className="rounded-lg border border-line bg-white p-8"><h2 className="text-lg font-bold text-ink">No engagements yet</h2><p className="mt-2 text-sm text-muted">A workspace appears after exact selection terms are accepted.</p></div> : null}
      <div className="grid gap-4">
        {items?.map((engagement) => (
          <article key={engagement.engagement_id} className="rounded-lg border border-line bg-white p-6 shadow-soft">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">{label(engagement.status)}</p>
                <h2 className="mt-1 text-xl font-bold text-ink">{engagement.gig.title}</h2>
                <p className="mt-2 text-sm text-muted">
                  {engagement.viewer_role === "client" ? engagement.freelancer.display_name : engagement.client.display_name}
                  {" · "}Confirmed {formatDate(engagement.confirmed_at)}
                </p>
              </div>
              <Button to={`/engagements/${engagement.engagement_id}`}>Open workspace</Button>
            </div>
          </article>
        ))}
      </div>
    </PageContainer>
  );
}

const label = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
