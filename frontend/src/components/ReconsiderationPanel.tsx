import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "./Button";
import { ReconsiderationActionDialog, type ReconsiderationDialogAction } from "./ReconsiderationActionDialog";
import {
  cancelReconsiderationInvitation,
  createReconsiderationInvitation,
  EngagementApiError,
  fetchReconsiderationContext,
  fetchReconsiderationInvitation,
  respondToReconsideration,
  type ReconsiderationContext,
  type ReconsiderationInvitation,
} from "../lib/engagements";
import {
  engagementErrorMessage,
  EngagementOperationRegistry,
  humanize,
  reconsiderationStatusConsequence,
  structuredValue,
  type EngagementOperation,
} from "../lib/engagementView";

type Props = { applicationId: string; authorityRefreshKey?: number; onChanged?: () => void | Promise<void> };

export function ReconsiderationPanel({ applicationId, authorityRefreshKey = 0, onChanged }: Props) {
  const [context, setContext] = useState<ReconsiderationContext | null>(null);
  const [invitation, setInvitation] = useState<ReconsiderationInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<ReconsiderationDialogAction | null>(null);
  const authorityRefreshRef = useRef(authorityRefreshKey);
  const loadSequenceRef = useRef(0);
  const operationsRef = useRef(new EngagementOperationRegistry(() => crypto.randomUUID()));

  const load = useCallback(async () => {
    const sequence = ++loadSequenceRef.current;
    const next = await fetchReconsiderationContext(applicationId);
    const nextInvitation = next.pending_invitation_id
      ? await fetchReconsiderationInvitation(next.pending_invitation_id)
      : null;
    if (sequence !== loadSequenceRef.current) return;
    setContext(next);
    setInvitation((current) => nextInvitation ?? (current?.status !== "pending" ? current : null));
  }, [applicationId]);

  useEffect(() => {
    let active = true;
    operationsRef.current.reset();
    setContext(null); setInvitation(null); setError(null); setActiveAction(null); setLoading(true);
    load().catch((value: unknown) => { if (active) setError(engagementErrorMessage(value)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; loadSequenceRef.current += 1; };
  }, [load]);

  useEffect(() => {
    if (authorityRefreshRef.current === authorityRefreshKey) return;
    authorityRefreshRef.current = authorityRefreshKey;
    void load().catch((value: unknown) => setError(engagementErrorMessage(value)));
  }, [authorityRefreshKey, load]);

  async function run(input: { reasonCode?: string; explanation?: string }): Promise<boolean> {
    if (!context || !activeAction) return false;
    const operation = operationFor(activeAction);
    const aggregateId = invitation?.invitation_id ?? applicationId;
    const meaningfulInput = activeAction === "create" ? input : {};
    const requestId = operationsRef.current.get(operation, aggregateId, meaningfulInput);
    setWorking(true); setError(null);
    try {
      let result: ReconsiderationInvitation;
      if (activeAction === "create") {
        if (!context.action_token) throw new Error("Reconsideration invitation authority is unavailable.");
        result = await createReconsiderationInvitation(applicationId, { action_token: context.action_token, request_id: requestId, reason_code: input.reasonCode, explanation: input.explanation });
      } else {
        if (!invitation) throw new Error("Reconsideration invitation is unavailable.");
        if (activeAction === "cancel") result = await cancelReconsiderationInvitation(invitation.invitation_id, { action_token: invitation.action_token, request_id: requestId });
        else result = await respondToReconsideration(invitation.invitation_id, activeAction === "reaffirm" ? "reaffirm" : "decline", { action_token: invitation.action_token, request_id: requestId });
      }
      operationsRef.current.settle(operation, aggregateId, meaningfulInput);
      setInvitation(result);
      await load();
      await onChanged?.();
      return true;
    } catch (value) {
      if (value instanceof EngagementApiError && value.status === 409) {
        operationsRef.current.settle(operation, aggregateId, meaningfulInput);
        await load().catch(() => undefined);
        await onChanged?.();
        setActiveAction(null);
      }
      setError(engagementErrorMessage(value));
      return false;
    } finally { setWorking(false); }
  }

  if (loading && !context) return <section className="reconsideration-board" aria-busy="true"><header><span>Stage 8 / Reconsideration</span><h2>Loading recovery authority</h2><p>Checking the cancelled-engagement reopening chain and current application binding…</p></header></section>;
  if (!context) return <section className="reconsideration-board"><header><span>Stage 8 / Reconsideration</span><h2>Recovery authority unavailable</h2><p>{error ?? "No reconsideration context is available."}</p></header></section>;

  const blockers = context.blockers;
  return (
    <section className="reconsideration-board" aria-labelledby={`reconsideration-title-${applicationId}`}>
      <header><span>Stage 8 / Failed-engagement recovery</span><h2 id={`reconsideration-title-${applicationId}`}>Reconsideration</h2><p>A distinct consent workflow bound to one cancelled engagement and its one-time Gig Reopening. It is not Reopen Application, intake reopening, or selection revised terms.</p></header>
      {error ? <div className="reconsideration-notice is-error" role="alert"><strong>Reconsideration action stopped</strong><p>{error}</p></div> : null}

      {invitation ? <InvitationRecord invitation={invitation} working={working} onAction={setActiveAction} applicationId={applicationId} /> : (
        <div className="reconsideration-availability">
          <div><span>Current application</span><strong>{humanize(String(context.viewer_role))}</strong><p>{context.eligible ? "Server authority permits an invitation for this application." : "No invitation is currently authorized."}</p></div>
          {context.viewer_role === "client" && context.eligible && context.action_token ? <Button type="button" disabled={working} onClick={() => setActiveAction("create")}>Send Reconsideration Invitation</Button> : null}
        </div>
      )}

      {!invitation && blockers.length ? <div className="reconsideration-blockers"><strong>Current authority</strong>{blockers.map((blocker) => <p key={blocker}>{blockerMessage(blocker)}</p>)}</div> : null}

      <footer className="reconsideration-boundary-note"><strong>Immutable-history boundary</strong><p>Sending, cancelling, or declining creates no application version. Only Reaffirm and Reopen or a successful complete updated proposal creates a fresh version with origin Reconsideration.</p></footer>

      {activeAction ? <ReconsiderationActionDialog action={activeAction} gigTitle={invitation?.gig.title ?? "Current gig"} working={working} onConfirm={run} onDismiss={() => { if (!working) setActiveAction(null); }} /> : null}
    </section>
  );
}

function InvitationRecord({ invitation, working, onAction, applicationId }: { invitation: ReconsiderationInvitation; working: boolean; onAction: (action: ReconsiderationDialogAction) => void; applicationId: string }) {
  return (
    <article className="reconsideration-record">
      <div className="reconsideration-source-chain"><span>Source</span><Link to={`/engagements/${invitation.source_engagement_id}`}>Cancelled engagement</Link><b>→</b><strong>Gig Reopened · Intake Closed</strong><b>→</b><strong>Reconsideration invitation</strong></div>
      <header><div><span>Invitation status</span><h3>{humanize(invitation.status)}</h3><p>{reconsiderationStatusConsequence(invitation.status)}</p></div><div><span>Structured reason</span><strong>{humanize(invitation.reason_code)}</strong>{invitation.reason_explanation ? <p>{invitation.reason_explanation}</p> : null}<time dateTime={invitation.created_at}>Sent {formatDate(invitation.created_at)}</time></div></header>
      <div className="reconsideration-comparison"><Terms title="Previous complete proposal" values={invitation.previous_proposal} /><Terms title="Current material gig terms" values={invitation.current_gig_terms} /></div>
      {invitation.status === "pending" ? <div className="reconsideration-actions">
        {invitation.allowed_actions.includes("cancel") ? <Button type="button" variant="secondary" disabled={working} onClick={() => onAction("cancel")}>Cancel Invitation</Button> : null}
        {invitation.allowed_actions.includes("reaffirm") ? <Button type="button" disabled={working} onClick={() => onAction("reaffirm")}>Reaffirm and Reopen</Button> : null}
        {invitation.allowed_actions.includes("submit_update") ? <Button variant="secondary" to={`/applications/${applicationId}/edit?mode=reconsideration&invitationId=${invitation.invitation_id}`}>Submit Updated Proposal</Button> : null}
        {invitation.allowed_actions.includes("decline") ? <Button type="button" variant="secondary" disabled={working} onClick={() => onAction("decline")}>Decline Invitation</Button> : null}
      </div> : null}
      {invitation.status === "pending" && invitation.allowed_actions.length === 0 ? <p className="reconsideration-paused">This pending invitation is preserved, but current gig/application authority makes every response unavailable.</p> : null}
    </article>
  );
}

function Terms({ title, values }: { title: string; values: Record<string, unknown> }) {
  return <section><h4>{title}</h4><dl>{Object.entries(values).map(([key, value]) => <div key={key}><dt>{humanize(key)}</dt><dd>{structuredValue(value)}</dd></div>)}</dl></section>;
}

function operationFor(action: ReconsiderationDialogAction): EngagementOperation {
  return { create: "create_reconsideration", cancel: "cancel_reconsideration", reaffirm: "reaffirm_reconsideration", decline: "decline_reconsideration" }[action] as EngagementOperation;
}

function blockerMessage(code: string): string {
  return {
    gig_not_reopened_after_cancellation: "The gig has not been reopened through failed-engagement Gig Reopening.",
    gig_not_active: "The gig is not currently active for controlled recovery.",
    engagement_already_exists: "A current non-cancelled engagement already owns this gig.",
    application_not_eligible: "Only a previous Not Selected or Withdrawn application is eligible.",
    failed_engagement_winner_ineligible: "The cancelled engagement’s historical winner cannot be invited back through this workflow.",
    invitation_already_pending: "This application already has a pending reconsideration invitation.",
  }[code] ?? humanize(code);
}

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
