import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "./Button";
import { GigSelect } from "./GigSelect";

export type ReconsiderationDialogAction = "create" | "cancel" | "reaffirm" | "decline";

type Props = {
  action: ReconsiderationDialogAction;
  gigTitle: string;
  working: boolean;
  onConfirm: (input: { reasonCode?: string; explanation?: string }) => Promise<boolean>;
  onDismiss: () => void;
};

const reasons = ["failed_engagement_reopened", "client_reconsideration", "freelancer_invited_back", "other"] as const;

export function ReconsiderationActionDialog({ action, gigTitle, working, onConfirm, onDismiss }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [reasonCode, setReasonCode] = useState("failed_engagement_reopened");
  const [explanation, setExplanation] = useState("");
  const content = dialogContent(action);

  useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.showModal();
    return () => { window.requestAnimationFrame(() => returnFocusRef.current?.focus()); };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await onConfirm({ reasonCode, explanation: explanation.trim() || undefined })) onDismiss();
  }

  const invalid = working || (action === "create" && reasonCode === "other" && !explanation.trim());
  return (
    <dialog ref={dialogRef} className={`reconsideration-dialog is-${action}`} onCancel={(event) => { if (working) event.preventDefault(); }} onClose={onDismiss} aria-labelledby="reconsideration-dialog-title" aria-describedby="reconsideration-dialog-consequence">
      <form onSubmit={submit}>
        <header><span>Failed-engagement recovery</span><h2 id="reconsideration-dialog-title">{content.title}</h2><p>{gigTitle}</p></header>
        <div className="reconsideration-dialog-body">
          <div id="reconsideration-dialog-consequence" className="reconsideration-dialog-consequence"><strong>Exact consequence</strong>{content.consequence}</div>
          {action === "create" ? <><label><span>Structured invitation reason</span><GigSelect autoFocus value={reasonCode} onValueChange={setReasonCode} options={reasons.map((reason) => ({ value: reason, label: humanize(reason) }))} /></label><label><span>{reasonCode === "other" ? "Explanation (required)" : "Explanation (optional)"}</span><textarea rows={4} maxLength={800} value={explanation} onChange={(event) => setExplanation(event.target.value)} /></label></> : null}
        </div>
        <footer><Button type="button" variant="secondary" disabled={working} onClick={() => dialogRef.current?.close()}>Keep Invitation Unchanged</Button><Button type="submit" disabled={invalid}>{working ? "Waiting for server…" : content.confirm}</Button></footer>
      </form>
    </dialog>
  );
}

function dialogContent(action: ReconsiderationDialogAction): { title: string; confirm: string; consequence: ReactNode } {
  return {
    create: { title: "Send Reconsideration Invitation", confirm: "Send Invitation", consequence: <ul><li>The application remains Not Selected or Withdrawn while pending.</li><li>The freelancer must deliberately reaffirm, submit a complete update, or decline.</li><li>No application version is created by sending.</li></ul> },
    cancel: { title: "Cancel Reconsideration Invitation", confirm: "Cancel Invitation", consequence: <ul><li>The invitation becomes Cancelled.</li><li>The application stage, proposal pointer, and immutable history remain unchanged.</li></ul> },
    reaffirm: { title: "Reaffirm and Reopen", confirm: "Reaffirm Complete Proposal", consequence: <ul><li>A fresh immutable application version with origin Reconsideration is created.</li><li>The complete previous proposal is copied; no partial patch is made.</li><li>The same application history returns to Under Review.</li></ul> },
    decline: { title: "Decline Invitation", confirm: "Decline Invitation", consequence: <ul><li>The invitation becomes Declined.</li><li>The application stage, proposal pointer, and history remain unchanged.</li></ul> },
  }[action];
}

function humanize(value: string): string { return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
