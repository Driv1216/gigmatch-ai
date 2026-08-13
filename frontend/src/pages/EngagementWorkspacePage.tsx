import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { EngagementActionDialog } from "../components/EngagementActionDialog";
import { SecureContactExchange } from "../components/SecureContactExchange";
import type { EngagementAction } from "../lib/engagementContracts";
import {
  EngagementApiError,
  fetchEngagement,
  fetchEngagementTimeline,
  reopenEngagementGig,
  transitionEngagement,
  type Engagement,
  type EngagementTimeline,
} from "../lib/engagements";
import {
  engagementErrorMessage,
  EngagementOperationRegistry,
  engagementStatusCopy,
  humanize,
  lifecycleActionPresentation,
  structuredValue,
} from "../lib/engagementView";

export function EngagementWorkspacePage() {
  const { engagementId } = useParams();
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [timeline, setTimeline] = useState<EngagementTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [activeAction, setActiveAction] = useState<EngagementAction | null>(null);
  const [contactAuthorityKey, setContactAuthorityKey] = useState(0);
  const loadSequenceRef = useRef(0);
  const operationsRef = useRef(new EngagementOperationRegistry(() => crypto.randomUUID()));

  const load = useCallback(async () => {
    if (!engagementId) throw new Error("Engagement identifier is missing.");
    const sequence = ++loadSequenceRef.current;
    const [next, activity] = await Promise.all([fetchEngagement(engagementId), fetchEngagementTimeline(engagementId)]);
    if (sequence !== loadSequenceRef.current) return;
    setEngagement(next);
    setTimeline(activity);
    setContactAuthorityKey((value) => value + 1);
  }, [engagementId]);

  useEffect(() => {
    let active = true;
    operationsRef.current.reset();
    setEngagement(null); setTimeline(null); setActiveAction(null); setError(null); setLoading(true);
    load().catch((value: unknown) => { if (active) setError(engagementErrorMessage(value)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; loadSequenceRef.current += 1; };
  }, [load]);

  async function act(input: { reasonCode?: string; explanation?: string }): Promise<boolean> {
    if (!engagement || !engagementId || !activeAction) return false;
    const action = activeAction;
    const meaningfulInput = action === "request_cancellation"
      ? { reasonCode: input.reasonCode, explanation: input.explanation ?? "" }
      : {};
    const requestId = operationsRef.current.get(action, engagementId, meaningfulInput);
    setWorking(true); setError(null);
    try {
      if (action === "reopen_gig") {
        if (!engagement.reopening_token) throw new Error("Gig reopening authority is unavailable.");
        await reopenEngagementGig(engagementId, { reopening_token: engagement.reopening_token, request_id: requestId });
      } else {
        await transitionEngagement(engagementId, action, {
          action_token: engagement.action_token,
          request_id: requestId,
          ...(action === "request_cancellation" ? { reason_code: input.reasonCode, explanation: input.explanation } : {}),
        });
      }
      operationsRef.current.settle(action, engagementId, meaningfulInput);
      await load();
      return true;
    } catch (value) {
      const controlledConflict = value instanceof EngagementApiError && value.status === 409;
      if (controlledConflict) {
        operationsRef.current.settle(action, engagementId, meaningfulInput);
        await load().catch(() => undefined);
        setActiveAction(null);
      }
      setError(engagementErrorMessage(value));
      return false;
    } finally { setWorking(false); }
  }

  if (loading && !engagement) return <WorkspaceState title="Loading Engagement Workspace" body="Retrieving immutable accepted terms, current lifecycle authority, and engagement-only activity…" />;
  if (!engagement || !engagementId) return <WorkspaceState title="Engagement unavailable" body={error ?? "This workspace could not be found."} error />;

  const terms = engagement.accepted_terms;
  const counterpart = engagement.viewer_role === "client" ? engagement.freelancer.display_name : engagement.client.display_name;
  return (
    <section className="stage-eight-page engagement-workspace-page">
      <aside className="engagement-context-rail" aria-label="Engagement source and current context">
        <div><span>Current engagement</span><strong>{engagement.gig.title}</strong><small>with {counterpart}</small></div>
        <dl><Fact label="Your role" value={humanize(engagement.viewer_role)} /><Fact label="Lifecycle" value={humanize(engagement.status)} /><Fact label="Accepted source" value={`Application v${terms.application_version_number} / Gig v${terms.gig_version_number}`} /></dl>
        <Link to="/engagements">Return to engagement register</Link>
      </aside>

      <header className="stage-eight-editorial-header engagement-workspace-header">
        <div><p>Engagement Workspace / Accepted authority</p><h1>{engagement.gig.title}</h1></div>
        <div><span>{humanize(engagement.status)}</span><p>{engagementStatusCopy(engagement)}</p><time dateTime={engagement.confirmed_at}>Confirmed {formatDate(engagement.confirmed_at)}</time></div>
      </header>

      {error ? <div className="stage-eight-notice is-error" role="alert"><strong>Engagement action stopped</strong><p>{error}</p></div> : null}

      <section className="engagement-terms-board" aria-labelledby="accepted-terms-title">
        <header><span>Immutable accepted terms</span><h2 id="accepted-terms-title">The exact selection source remains fixed.</h2><p>Application v{terms.application_version_number} accepted against Gig v{terms.gig_version_number}. Accepted snapshot contract v{terms.accepted_terms_contract_version} is a compatibility label, not a record ordinal.</p></header>
        <div className="engagement-terms-grid">
          <TermsGroup title="Original client payment terms" value={terms.client_payment_terms} />
          <TermsGroup title="Accepted freelancer proposal" value={terms.freelancer_proposal} />
          <TermsGroup title="Accepted timeline" value={terms.timeline} />
          <TermsGroup title="Accepted availability" value={terms.availability} />
        </div>
        <div className="engagement-scope-grid"><TermsList title="Included work" values={terms.included_work} /><TermsList title="Excluded work" values={terms.excluded_work} /><TermsList title="Assumptions" values={terms.assumptions} /><TermsList title="Estimate-change factors" values={terms.estimate_change_factors ?? []} /></div>
        {terms.scope_notes ? <div className="engagement-scope-notes"><strong>Scope notes</strong><p>{terms.scope_notes}</p></div> : null}
      </section>

      <section className="engagement-lifecycle-board" aria-labelledby="engagement-lifecycle-title">
        <header><span>Current participant-reported lifecycle</span><h2 id="engagement-lifecycle-title">{humanize(engagement.status)}</h2><p>Controls are projected by the server for this participant and this exact lifecycle version. No action is applied until authoritative success.</p></header>
        <LifecyclePath current={engagement.status} />
        <div className="engagement-action-board">
          {engagement.allowed_actions.map((action) => {
            const presentation = lifecycleActionPresentation(action);
            return <article key={action}><div><strong>{presentation.label}</strong><p>{presentation.consequence}</p></div><Button type="button" variant={presentation.terminal ? "primary" : "secondary"} disabled={working} onClick={() => setActiveAction(action)}>{presentation.label}</Button></article>;
          })}
          {engagement.allowed_actions.length === 0 ? <p>No lifecycle action is currently authorized for you. The workspace record and timeline remain available.</p> : null}
        </div>
      </section>

      <section className="engagement-timeline-board" aria-labelledby="engagement-timeline-title">
        <header><span>Engagement-only event allowlist</span><h2 id="engagement-timeline-title">Lifecycle activity</h2><p>Selection, Q&amp;A, review, proposal revisions, contact activity, and read/unread claims do not enter this timeline.</p></header>
        {timeline?.items.length === 0 ? <p className="engagement-timeline-empty">No lifecycle activity is available yet.</p> : null}
        <ol>{timeline?.items.map((event, index) => <li key={event.event_id}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{timelineLabel(event.event_type)}</strong><p>{event.status_from && event.status_to ? `${humanize(event.status_from)} → ${humanize(event.status_to)}` : humanize(event.actor_role)}</p>{event.reason_code ? <small>Reason: {humanize(event.reason_code)}</small> : null}</div><time dateTime={event.occurred_at}>{formatDate(event.occurred_at)}</time></li>)}</ol>
      </section>

      <section className="engagement-contact-slot" aria-labelledby="engagement-contact-title">
        <header><span>Stable isolated integration slot</span><h2 id="engagement-contact-title">Secure Contact Exchange</h2><p>Contact consent and lifecycle authority remain separate. Contact blocking never removes required engagement actions.</p></header>
        <div className="engagement-contact-boundary"><SecureContactExchange key={`${engagementId}:${contactAuthorityKey}`} engagementId={engagement.engagement_id} /></div>
      </section>

      <aside className="engagement-disclaimer-board"><strong>Product boundary</strong><ul>{engagement.disclaimers.map((item) => <li key={item}>{item}</li>)}</ul><p>GigMatch records participant-reported status. It does not verify work quality, settle contracts, process payments, or guarantee payment.</p></aside>

      {activeAction ? <EngagementActionDialog action={activeAction} gigTitle={engagement.gig.title} working={working} onConfirm={act} onDismiss={() => { if (!working) setActiveAction(null); }} /> : null}
    </section>
  );
}

function LifecyclePath({ current }: { current: Engagement["status"] }) {
  const statuses: Engagement["status"][] = ["confirmed", "kickoff_pending", "in_progress", "completion_pending", "completed", "cancellation_pending", "cancelled"];
  return <ol className="engagement-lifecycle-path">{statuses.map((status) => <li key={status} className={status === current ? "is-current" : undefined} aria-current={status === current ? "step" : undefined}>{humanize(status)}</li>)}</ol>;
}

function TermsGroup({ title, value }: { title: string; value: Record<string, unknown> }) {
  return <section><h3>{title}</h3><dl>{Object.entries(value).map(([key, item]) => <div key={key}><dt>{humanize(key)}</dt><dd>{structuredValue(item)}</dd></div>)}</dl></section>;
}

function TermsList({ title, values }: { title: string; values: unknown[] }) {
  return <section><h3>{title}</h3>{values.length ? <ul>{values.map((value, index) => <li key={`${structuredValue(value)}:${index}`}>{structuredValue(value)}</li>)}</ul> : <p>None recorded</p>}</section>;
}

function Fact({ label, value }: { label: string; value: ReactNode }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function WorkspaceState({ title, body, error = false }: { title: string; body: string; error?: boolean }) { return <section className="stage-eight-page"><div className={`stage-eight-state-panel${error ? " is-error" : ""}`} role={error ? "alert" : "status"}><span>Engagement Workspace</span><h1>{title}</h1><p>{body}</p>{error ? <Button to="/engagements" variant="secondary">Return to engagements</Button> : null}</div></section>; }
function timelineLabel(value: string): string { return humanize(value.replace(/^engagement_/, "").replace(/^gig_/, "Gig ")); }
const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
