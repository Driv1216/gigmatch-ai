import { useCallback, useEffect, useState } from "react";
import { Button } from "./Button";
import {
  cancelReconsiderationInvitation,
  createReconsiderationInvitation,
  fetchReconsiderationContext,
  fetchReconsiderationInvitation,
  respondToReconsideration,
  type ReconsiderationInvitation,
} from "../lib/engagements";
import { isRecord } from "../lib/engagementContracts";

type Props = { applicationId: string; onChanged?: () => void };

export function ReconsiderationPanel({ applicationId, onChanged }: Props) {
  const [context, setContext] = useState<Record<string, unknown> | null>(null);
  const [invitation, setInvitation] = useState<ReconsiderationInvitation | null>(null);
  const [reason, setReason] = useState("failed_engagement_reopened");
  const [explanation, setExplanation] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    const next = await fetchReconsiderationContext(applicationId);
    const invitationId = typeof next.pending_invitation_id === "string"
      ? next.pending_invitation_id : null;
    setContext(next);
    setInvitation(invitationId ? await fetchReconsiderationInvitation(invitationId) : null);
  }, [applicationId]);
  useEffect(() => {
    let active = true;
    load().catch((value: unknown) => {
      if (active) setError(value instanceof Error ? value.message : "Unable to load reconsideration state.");
    });
    return () => { active = false; };
  }, [load]);

  async function run(action: () => Promise<unknown>) {
    setWorking(true); setError(null);
    try { await action(); await load(); onChanged?.(); }
    catch (value) { setError(value instanceof Error ? value.message : "Unable to update invitation."); await load().catch(() => undefined); }
    finally { setWorking(false); }
  }

  if (!context) return null;
  const viewerRole = String(context.viewer_role ?? "");
  const eligible = context.eligible === true;
  const createToken = typeof context.action_token === "string" ? context.action_token : null;
  const blockers = Array.isArray(context.blockers) ? context.blockers.map(String) : [];
  return (
    <section className="rounded-lg border border-line bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">Failed-engagement recovery</p>
      <h2 className="mt-2 text-xl font-bold text-ink">Reconsideration invitation</h2>
      <p className="mt-2 text-sm leading-6 text-muted">Prior application history remains unchanged. Reopening requires freelancer consent and a fresh immutable proposal version.</p>
      {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}
      {invitation ? (
        <div className="mt-5 rounded-md border border-line p-4">
          <p className="font-semibold text-ink">{label(invitation.status)}</p>
          <p className="mt-1 text-sm text-muted">{label(invitation.reason_code)}{invitation.reason_explanation ? ` · ${invitation.reason_explanation}` : ""}</p>
          {invitation.status === "pending" && viewerRole === "client" && invitation.allowed_actions.includes("cancel") ? (
            <div className="mt-4"><Button variant="secondary" disabled={working} onClick={() => { if (window.confirm("Cancel this pending reconsideration invitation?")) void run(() => cancelReconsiderationInvitation(invitation.invitation_id, { action_token: invitation.action_token, request_id: crypto.randomUUID() })); }}>Cancel invitation</Button></div>
          ) : null}
          {invitation.status === "pending" && viewerRole === "freelancer" ? (
            <div className="mt-4 space-y-4">
              <TermsComparison invitation={invitation} />
              <div className="flex flex-wrap gap-3">
                {invitation.allowed_actions.includes("reaffirm") ? <Button disabled={working} onClick={() => void run(() => respondToReconsideration(invitation.invitation_id, "reaffirm", { action_token: invitation.action_token, request_id: crypto.randomUUID() }))}>Reaffirm and Reopen</Button> : null}
                {invitation.allowed_actions.includes("submit_update") ? <Button variant="secondary" to={`/applications/${applicationId}/edit?mode=reconsideration&invitationId=${invitation.invitation_id}`}>Submit Updated Proposal</Button> : null}
                {invitation.allowed_actions.includes("decline") ? <Button variant="secondary" disabled={working} onClick={() => { if (window.confirm("Decline this invitation? Your application stage and history will remain unchanged.")) void run(() => respondToReconsideration(invitation.invitation_id, "decline", { action_token: invitation.action_token, request_id: crypto.randomUUID() })); }}>Decline</Button> : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : viewerRole === "client" && eligible && createToken ? (
        <div className="mt-5">
          <label className="text-sm font-semibold text-ink">Invitation reason
            <select value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 block w-full max-w-md rounded-md border border-line px-3 py-2">
              {["failed_engagement_reopened", "client_reconsideration", "freelancer_invited_back", "other"].map((value) => <option key={value} value={value}>{label(value)}</option>)}
            </select>
          </label>
          <textarea value={explanation} onChange={(event) => setExplanation(event.target.value)} className="mt-3 block w-full max-w-2xl rounded-md border border-line px-3 py-2" placeholder={reason === "other" ? "Explanation required" : "Optional explanation"} />
          <div className="mt-3"><Button disabled={working || (reason === "other" && !explanation.trim())} onClick={() => void run(() => createReconsiderationInvitation(applicationId, { action_token: createToken, request_id: crypto.randomUUID(), reason_code: reason, explanation: explanation.trim() || undefined }))}>Send reconsideration invitation</Button></div>
        </div>
      ) : viewerRole === "client" ? (
        <p className="mt-4 text-sm text-muted">{blockers.includes("failed_engagement_winner_ineligible") ? "The cancelled engagement’s freelancer is not eligible for reconsideration on this gig." : blockers.length ? blockers.map(label).join(" · ") : "No reconsideration action is available."}</p>
      ) : null}
    </section>
  );
}

function TermsComparison({ invitation }: { invitation: ReconsiderationInvitation }) {
  const proposal = isRecord(invitation.previous_proposal.proposal)
    ? invitation.previous_proposal.proposal : {};
  return <div className="grid gap-3 text-sm md:grid-cols-2"><div className="rounded-md bg-slate-50 p-3"><p className="font-semibold text-ink">Previous proposal</p><p className="mt-1 text-muted">{label(String(proposal.payment_structure ?? proposal.mode ?? "proposal"))}</p></div><div className="rounded-md bg-slate-50 p-3"><p className="font-semibold text-ink">Current gig terms</p><p className="mt-1 text-muted">{label(String(invitation.current_gig_terms.payment_structure ?? "current terms"))}</p></div></div>;
}
const label = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
