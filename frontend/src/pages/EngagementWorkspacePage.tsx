import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { PageContainer } from "../components/PageContainer";
import { SecureContactExchange } from "../components/SecureContactExchange";
import {
  EngagementApiError,
  fetchEngagement,
  fetchEngagementTimeline,
  reopenEngagementGig,
  transitionEngagement,
  type Engagement,
  type EngagementTimeline,
} from "../lib/engagements";
import { isRecord } from "../lib/engagementContracts";

const cancellationReasons = [
  "scope_could_not_be_agreed", "availability_changed", "business_needs_changed",
  "mutual_decision", "safety_or_policy_concern", "other",
];

export function EngagementWorkspacePage() {
  const { engagementId } = useParams();
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [timeline, setTimeline] = useState<EngagementTimeline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [reason, setReason] = useState("mutual_decision");
  const [explanation, setExplanation] = useState("");
  const load = useCallback(async () => {
    if (!engagementId) throw new Error("Engagement identifier is missing.");
    const [next, activity] = await Promise.all([
      fetchEngagement(engagementId), fetchEngagementTimeline(engagementId),
    ]);
    setEngagement(next); setTimeline(activity);
  }, [engagementId]);
  useEffect(() => {
    let active = true;
    load().catch((value: unknown) => {
      if (active) setError(value instanceof Error ? value.message : "Unable to load engagement.");
    });
    return () => { active = false; };
  }, [load]);

  async function act(action: string) {
    if (!engagement || !engagementId) return;
    const terminal = ["confirm_completion", "acknowledge_cancellation", "reopen_gig"].includes(action);
    if (terminal && !window.confirm(`${label(action)}? Review the current workspace state before continuing.`)) return;
    setWorking(true); setError(null);
    try {
      if (action === "reopen_gig") {
        await reopenEngagementGig(engagementId, {
          reopening_token: engagement.reopening_token, request_id: crypto.randomUUID(),
        });
      } else {
        setEngagement(await transitionEngagement(engagementId, action, {
          action_token: engagement.action_token,
          request_id: crypto.randomUUID(),
          ...(action === "request_cancellation" ? {
            reason_code: reason, explanation: explanation.trim() || undefined,
          } : {}),
        }));
      }
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to update engagement.");
      if (value instanceof EngagementApiError && value.status === 409) await load().catch(() => undefined);
    } finally { setWorking(false); }
  }

  if (!engagement) return <PageContainer><p className="text-sm text-muted" aria-busy="true">{error ?? "Loading Engagement Workspace…"}</p></PageContainer>;
  const terms = engagement.accepted_terms;
  const can = (action: string) => engagement.allowed_actions.includes(action);
  return (
    <PageContainer className="space-y-6">
      <header className="rounded-lg border border-line bg-white p-7 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">{label(engagement.status)}</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">{engagement.gig.title}</h1>
        <p className="mt-2 text-sm text-muted">
          {engagement.client.display_name} · {engagement.freelancer.display_name} · Confirmed {formatDate(engagement.confirmed_at)}
        </p>
      </header>
      {error ? <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}
      <section className="rounded-lg border border-line bg-white p-6">
        <h2 className="text-xl font-bold text-ink">Immutable accepted terms</h2>
        <p className="mt-2 text-sm text-muted">Application v{terms.application_version_number} accepted against gig v{terms.gig_version_number} · snapshot contract v{terms.accepted_terms_contract_version}</p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <TermsCard title="Original client terms" value={terms.client_payment_terms} />
          <TermsCard title="Accepted freelancer proposal" value={terms.freelancer_proposal} />
          <TermsCard title="Timeline" value={terms.timeline} />
          <TermsCard title="Availability" value={terms.availability} />
        </div>
        <List title="Included work" values={terms.included_work} />
        <List title="Excluded work" values={terms.excluded_work} />
        <List title="Assumptions" values={terms.assumptions} />
        {terms.scope_notes ? <div className="mt-5"><h3 className="font-semibold text-ink">Scope notes</h3><p className="mt-2 whitespace-pre-wrap text-sm text-muted">{terms.scope_notes}</p></div> : null}
      </section>
      <SecureContactExchange engagementId={engagement.engagement_id} />
      <section className="rounded-lg border border-line bg-white p-6">
        <h2 className="text-xl font-bold text-ink">Lifecycle actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {can("prepare_kickoff") ? <Button disabled={working} onClick={() => void act("prepare_kickoff")}>Prepare for Kickoff</Button> : null}
          {can("start_work") ? <Button disabled={working} onClick={() => void act("start_work")}>Mark Work Started</Button> : null}
          {can("request_completion") ? <Button disabled={working} onClick={() => void act("request_completion")}>Request Completion</Button> : null}
          {can("confirm_completion") ? <Button disabled={working} onClick={() => void act("confirm_completion")}>Confirm Completion</Button> : null}
          {can("reject_completion") ? <Button variant="secondary" disabled={working} onClick={() => void act("reject_completion")}>Not Complete Yet</Button> : null}
          {can("withdraw_cancellation") ? <Button variant="secondary" disabled={working} onClick={() => void act("withdraw_cancellation")}>Withdraw Cancellation Request</Button> : null}
          {can("acknowledge_cancellation") ? <Button disabled={working} onClick={() => void act("acknowledge_cancellation")}>Acknowledge Cancellation</Button> : null}
          {can("reopen_gig") ? <Button disabled={working} onClick={() => void act("reopen_gig")}>Reopen Gig · Keep Intake Closed</Button> : null}
        </div>
        {can("request_cancellation") ? (
          <div className="mt-6 border-t border-line pt-5">
            <label className="text-sm font-semibold text-ink">Cancellation reason
              <select value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 block w-full max-w-md rounded-md border border-line px-3 py-2">
                {cancellationReasons.map((value) => <option key={value} value={value}>{label(value)}</option>)}
              </select>
            </label>
            <textarea value={explanation} onChange={(event) => setExplanation(event.target.value)} className="mt-3 block w-full max-w-2xl rounded-md border border-line px-3 py-2" placeholder={reason === "other" ? "Explanation required" : "Optional explanation"} />
            <div className="mt-3"><Button variant="secondary" disabled={working || (reason === "other" && !explanation.trim())} onClick={() => { if (window.confirm("Request engagement cancellation? The other participant must acknowledge it.")) void act("request_cancellation"); }}>Request Cancellation</Button></div>
          </div>
        ) : null}
      </section>
      <section className="rounded-lg border border-line bg-white p-6">
        <h2 className="text-xl font-bold text-ink">Activity</h2>
        {timeline?.items.length === 0 ? <p className="mt-3 text-sm text-muted">No lifecycle activity yet.</p> : null}
        <ol className="mt-4 space-y-4 border-l border-slate-300 pl-5">
          {timeline?.items.map((event) => <li key={event.event_id}><p className="font-semibold text-ink">{label(event.event_type.replace(/^engagement_/, ""))}</p><p className="text-sm text-muted">{label(event.actor_role)} · {formatDate(event.occurred_at)}{event.status_to ? ` · ${label(event.status_to)}` : ""}</p></li>)}
        </ol>
      </section>
      <aside className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"><ul className="list-disc space-y-2 pl-5">{engagement.disclaimers.map((item) => <li key={item}>{item}</li>)}</ul></aside>
    </PageContainer>
  );
}

function TermsCard({ title, value }: { title: string; value: Record<string, unknown> }) {
  return <div className="rounded-md border border-line p-4"><h3 className="font-semibold text-ink">{title}</h3><dl className="mt-3 space-y-2 text-sm">{Object.entries(value).filter(([, item]) => typeof item !== "object").map(([key, item]) => <div key={key}><dt className="font-medium text-ink">{label(key)}</dt><dd className="text-muted">{String(item)}</dd></div>)}</dl>{isRecord(value.budget) ? <p className="mt-2 text-sm text-muted">Budget: {String(value.budget.minimum)}–{String(value.budget.maximum)}</p> : null}</div>;
}
function List({ title, values }: { title: string; values: unknown[] }) {
  return <div className="mt-5"><h3 className="font-semibold text-ink">{title}</h3><ul className="mt-2 list-disc pl-5 text-sm text-muted">{values.map((value, index) => <li key={`${String(value)}-${index}`}>{String(value)}</li>)}</ul></div>;
}
const label = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
