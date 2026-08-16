import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "./Button";
import { GigSelect } from "./GigSelect";

export type ApplicationWithdrawalReason =
  | "accepted_another_opportunity"
  | "no_longer_available"
  | "scope_or_terms_no_longer_fit"
  | "timeline_changed"
  | "budget_expectations_mismatch"
  | "gig_changed_materially"
  | "personal_circumstances"
  | "other";

type Props = {
  gigTitle: string;
  isSubmitting: boolean;
  onConfirm: (reason: ApplicationWithdrawalReason, explanation?: string) => Promise<boolean>;
  onDismiss: () => void;
};

const reasons: Array<[ApplicationWithdrawalReason, string]> = [
  ["accepted_another_opportunity", "Accepted another opportunity"],
  ["no_longer_available", "No longer available"],
  ["scope_or_terms_no_longer_fit", "Scope or terms no longer fit"],
  ["timeline_changed", "My timeline changed"],
  ["budget_expectations_mismatch", "Budget expectations mismatch"],
  ["gig_changed_materially", "The gig changed materially"],
  ["personal_circumstances", "Personal circumstances"],
  ["other", "Other"],
];

export function ApplicationWithdrawalDialog({ gigTitle, isSubmitting, onConfirm, onDismiss }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [reason, setReason] = useState<ApplicationWithdrawalReason>("no_longer_available");
  const [explanation, setExplanation] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.showModal();
    return () => { window.requestAnimationFrame(() => returnFocusRef.current?.focus()); };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await onConfirm(reason, explanation.trim() || undefined)) onDismiss();
  }

  const invalid = isSubmitting || !confirmed || (reason === "other" && !explanation.trim());
  return (
    <dialog ref={dialogRef} className="application-withdrawal-dialog" onClose={onDismiss} onKeyDown={(event) => { if (event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); dialogRef.current?.close(); } }} aria-labelledby="application-withdrawal-title" aria-describedby="application-withdrawal-consequence">
      <form onSubmit={submit}>
        <header><span>Application record control</span><h2 id="application-withdrawal-title">Withdraw this application</h2><p>{gigTitle}</p></header>
        <div className="application-withdrawal-body">
          <p id="application-withdrawal-consequence" className="application-withdrawal-consequence">This closes the active application. Every immutable proposal version and the withdrawal reason remain in the same history; this does not delete your record.</p>
          <label><span>Structured reason</span><GigSelect autoFocus value={reason} onValueChange={setReason} options={reasons.map(([value, label]) => ({ value, label }))} /></label>
          {reason === "other" ? <label><span>Reason explanation</span><textarea required rows={3} value={explanation} onChange={(event) => setExplanation(event.target.value)} /></label> : null}
          <label className="application-withdrawal-confirmation"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>I understand this closes the active application while preserving its immutable history.</span></label>
        </div>
        <footer><Button type="button" variant="secondary" disabled={isSubmitting} onClick={() => dialogRef.current?.close()}>Keep application active</Button><Button type="submit" disabled={invalid}>{isSubmitting ? "Withdrawing…" : "Withdraw application"}</Button></footer>
      </form>
    </dialog>
  );
}
