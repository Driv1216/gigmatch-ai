import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { fetchEngagements, type Engagement } from "../lib/engagements";
import { engagementCollection, engagementStatusCopy, humanize } from "../lib/engagementView";

export function EngagementListPage() {
  const [items, setItems] = useState<Engagement[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setError(null);
    fetchEngagements()
      .then((result) => { if (active) setItems(result.items); })
      .catch((value: unknown) => { if (active) setError(value instanceof Error ? value.message : "Unable to load engagements."); });
    return () => { active = false; };
  }, []);

  const groups = engagementCollection(items ?? []);
  return (
    <section className="stage-eight-page engagement-register-page" aria-busy={items === null && !error}>
      <header className="stage-eight-editorial-header">
        <div><p>Engagements / Shared authority</p><h1>Accepted work,<br />kept in context.</h1></div>
        <div><span>One connected register</span><p>Current and terminal workspaces come from accepted exact-version selections. Lifecycle status is participant-reported.</p></div>
      </header>

      {error ? <StatePanel tone="error" title="Engagement register unavailable" body={error} /> : null}
      {items === null && !error ? <StatePanel title="Loading engagement register" body="Retrieving participant-safe accepted terms, lifecycle authority, and workspace destinations…" /> : null}
      {items?.length === 0 ? <StatePanel title="No engagements yet" body="A shared Engagement Workspace appears only after exact selection terms are accepted. Existing applications remain in their own records." /> : null}

      {items && items.length > 0 ? (
        <div className="engagement-register-board">
          <EngagementGroup eyebrow="Current authority" title="Active engagements" items={groups.active} empty="No active engagement currently requires lifecycle action." />
          <EngagementGroup eyebrow="Immutable history" title="Completed and cancelled" items={groups.historical} empty="No terminal engagement history yet." />
        </div>
      ) : null}
    </section>
  );
}

function EngagementGroup({ eyebrow, title, items, empty }: { eyebrow: string; title: string; items: Engagement[]; empty: string }) {
  return (
    <section className="engagement-register-group" aria-labelledby={`engagement-group-${eyebrow.replace(/\s/g, "-")}`}>
      <header><span>{eyebrow}</span><h2 id={`engagement-group-${eyebrow.replace(/\s/g, "-")}`}>{title}</h2><strong>{items.length}</strong></header>
      {items.length === 0 ? <p className="engagement-register-empty">{empty}</p> : (
        <ol>{items.map((engagement, index) => <li key={engagement.engagement_id}><article className="engagement-register-lane"><span>{String(index + 1).padStart(2, "0")}</span><div><p>{humanize(engagement.status)}</p><h3>{engagement.gig.title}</h3><small>{engagement.viewer_role === "client" ? engagement.freelancer.display_name : engagement.client.display_name}</small></div><div><strong>{engagementStatusCopy(engagement)}</strong><time dateTime={engagement.confirmed_at}>Confirmed {formatDate(engagement.confirmed_at)}</time></div><Button to={`/engagements/${engagement.engagement_id}`}>Open Workspace</Button></article></li>)}</ol>
      )}
    </section>
  );
}

function StatePanel({ title, body, tone = "neutral" }: { title: string; body: string; tone?: "neutral" | "error" }) {
  return <div className={`stage-eight-state-panel is-${tone}`} role={tone === "error" ? "alert" : "status"}><span>Engagement register</span><h2>{title}</h2><p>{body}</p></div>;
}

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
