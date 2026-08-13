import { useEffect, useRef, useState, type FormEvent } from "react";
import type { EngagementAction } from "../lib/engagementContracts";
import { lifecycleActionPresentation } from "../lib/engagementView";
import { Button } from "./Button";

const cancellationReasons = [
  "scope_could_not_be_agreed",
  "availability_changed",
  "business_needs_changed",
  "mutual_decision",
  "safety_or_policy_concern",
  "other",
] as const;

type Props = {
  action: EngagementAction;
  gigTitle: string;
  working: boolean;
  onConfirm: (input: { reasonCode?: string; explanation?: string }) => Promise<boolean>;
  onDismiss: () => void;
};

export function EngagementActionDialog({ action, gigTitle, working, onConfirm, onDismiss }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [reasonCode, setReasonCode] = useState<string>("mutual_decision");
  const [explanation, setExplanation] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const presentation = lifecycleActionPresentation(action);
  const needsReason = action === "request_cancellation";
  const needsConfirmation = Boolean(presentation.terminal);

  useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.showModal();
    return () => { window.requestAnimationFrame(() => returnFocusRef.current?.focus()); };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const succeeded = await onConfirm({
      reasonCode: needsReason ? reasonCode : undefined,
      explanation: needsReason ? explanation.trim() || undefined : undefined,
    });
    if (succeeded) onDismiss();
  }

  const invalid = working || (reasonCode === "other" && !explanation.trim()) || (needsConfirmation && !confirmed);
  return (
    <dialog
      ref={dialogRef}
      className={`engagement-action-dialog is-${action.replace(/_/g, "-")}`}
      onCancel={(event) => { if (working) event.preventDefault(); }}
      onClose={onDismiss}
      aria-labelledby="engagement-action-title"
      aria-describedby="engagement-action-consequence"
    >
      <form onSubmit={submit}>
        <header><span>Engagement lifecycle authority</span><h2 id="engagement-action-title">{presentation.label}</h2><p>{gigTitle}</p></header>
        <div className="engagement-action-dialog-body">
          <p id="engagement-action-consequence" className="engagement-action-consequence">{presentation.consequence}</p>
          {needsReason ? (
            <>
              <label><span>Structured cancellation reason</span><select autoFocus value={reasonCode} onChange={(event) => setReasonCode(event.target.value)}>{cancellationReasons.map((reason) => <option key={reason} value={reason}>{humanize(reason)}</option>)}</select></label>
              <label><span>{reasonCode === "other" ? "Explanation (required)" : "Explanation (optional)"}</span><textarea maxLength={800} rows={4} value={explanation} onChange={(event) => setExplanation(event.target.value)} /></label>
            </>
          ) : null}
          {action === "reopen_gig" ? <div className="engagement-reopening-boundary"><strong>This is failed-engagement Gig Reopening.</strong><ul><li>The cancelled engagement and historical Confirmed application remain unchanged.</li><li>The gig becomes Active with application intake still Closed.</li><li>No applicant is reactivated and no new application version is created.</li></ul></div> : null}
          {needsConfirmation ? <label className="engagement-action-confirmation"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>I reviewed the irreversible or terminal consequence and want to continue.</span></label> : null}
        </div>
        <footer><Button type="button" variant="secondary" disabled={working} onClick={() => dialogRef.current?.close()}>Keep Current State</Button><Button type="submit" disabled={invalid}>{working ? "Waiting for server…" : presentation.label}</Button></footer>
      </form>
    </dialog>
  );
}

function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
