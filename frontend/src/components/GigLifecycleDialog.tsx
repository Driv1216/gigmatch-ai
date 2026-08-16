import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "./Button";
import { GigSelect } from "./GigSelect";

export type GigLifecycleAction = "intake/close" | "intake/reopen" | "pause" | "resume" | "cancel";

type GigLifecycleDialogProps = {
  action: GigLifecycleAction;
  gigTitle: string;
  activeApplicationCount: number;
  isSubmitting: boolean;
  onConfirm: (body?: Record<string, unknown>) => Promise<boolean>;
  onDismiss: () => void;
};

const intakeReasons = [
  ["sufficient_applications_received", "Sufficient applications received"],
  ["moving_to_applicant_review", "Moving to applicant review"],
  ["hiring_timeline_changed", "Hiring timeline changed"],
  ["requirements_under_revision", "Requirements under revision"],
  ["other", "Other"],
] as const;

const pauseReasons = [
  ["internal_approval_pending", "Internal approval pending"],
  ["budget_temporarily_unavailable", "Budget temporarily unavailable"],
  ["requirements_under_revision", "Requirements under revision"],
  ["hiring_paused", "Hiring paused"],
  ["business_delay", "Business delay"],
  ["other", "Other"],
] as const;

const cancellationReasons = [
  ["opportunity_no_longer_required", "Opportunity no longer required"],
  ["budget_no_longer_available", "Budget no longer available"],
  ["business_priorities_changed", "Business priorities changed"],
  ["requirements_cannot_be_finalised", "Requirements cannot be finalised"],
  ["posted_in_error", "Posted in error"],
  ["other", "Other"],
] as const;

export function GigLifecycleDialog({
  action,
  gigTitle,
  activeApplicationCount,
  isSubmitting,
  onConfirm,
  onDismiss,
}: GigLifecycleDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [reason, setReason] = useState(defaultReason(action));
  const [explanation, setExplanation] = useState("");
  const [applicantExplanation, setApplicantExplanation] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    return () => {
      window.requestAnimationFrame(() => returnFocusRef.current?.focus());
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = buildBody();
    if (await onConfirm(body)) onDismiss();
  }

  function buildBody(): Record<string, unknown> | undefined {
    if (action === "intake/close" || action === "pause") {
      return { reason, explanation: reason === "other" ? explanation.trim() : null };
    }
    if (action === "cancel") {
      return {
        reason,
        applicant_facing_explanation: applicantExplanation.trim(),
        closes_active_records_confirmed: confirmed,
        other_explanation: reason === "other" ? explanation.trim() : null,
      };
    }
    return undefined;
  }

  const content = dialogContent(action, activeApplicationCount);
  const reasons = action === "intake/close" ? intakeReasons : action === "pause" ? pauseReasons : action === "cancel" ? cancellationReasons : null;
  const needsOther = reason === "other";
  const invalid = isSubmitting
    || (needsOther && !explanation.trim())
    || (action === "cancel" && (!applicantExplanation.trim() || !confirmed));

  return (
    <dialog ref={dialogRef} className={`gig-action-dialog is-${action.replace("/", "-")}`} onClose={onDismiss} onKeyDown={(event) => { if (event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); dialogRef.current?.close(); } }} aria-labelledby="gig-action-title" aria-describedby="gig-action-consequence">
      <form onSubmit={handleSubmit}>
        <header>
          <span>Gig lifecycle control</span>
          <h2 id="gig-action-title">{content.title}</h2>
          <p>{gigTitle}</p>
        </header>
        <div className="gig-action-dialog-body">
          <p id="gig-action-consequence" className="gig-action-consequence">{content.consequence}</p>
          {reasons ? (
            <label>
              <span>Structured reason</span>
              <GigSelect autoFocus value={reason} onValueChange={setReason} options={reasons.map(([value, label]) => ({ value, label }))} />
            </label>
          ) : null}
          {needsOther ? (
            <label>
              <span>Reason explanation</span>
              <textarea required rows={3} value={explanation} onChange={(event) => setExplanation(event.target.value)} />
            </label>
          ) : null}
          {action === "cancel" ? (
            <>
              <label>
                <span>Applicant-facing explanation</span>
                <textarea required rows={4} value={applicantExplanation} onChange={(event) => setApplicantExplanation(event.target.value)} />
                <small>This explanation is shown to affected applicants.</small>
              </label>
              <label className="gig-action-confirmation">
                <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
                <span>I understand this terminal action closes {activeApplicationCount} active application{activeApplicationCount === 1 ? "" : "s"} and any effective selection request.</span>
              </label>
            </>
          ) : null}
        </div>
        <footer>
          <Button type="button" variant="secondary" onClick={() => dialogRef.current?.close()} disabled={isSubmitting}>Keep current state</Button>
          <Button type="submit" disabled={invalid}>{isSubmitting ? "Updating…" : content.confirm}</Button>
        </footer>
      </form>
    </dialog>
  );
}

function defaultReason(action: GigLifecycleAction) {
  if (action === "intake/close") return "moving_to_applicant_review";
  if (action === "pause") return "business_delay";
  if (action === "cancel") return "opportunity_no_longer_required";
  return "";
}

function dialogContent(action: GigLifecycleAction, activeApplications: number) {
  const records = `${activeApplications} active application${activeApplications === 1 ? "" : "s"}`;
  return {
    "intake/close": { title: "Close application intake", consequence: `Stop new applications while preserving ${records}, the published terms, and operational state.`, confirm: "Close intake" },
    "intake/reopen": { title: "Reopen application intake", consequence: "Accept new applications again. A future application deadline is required; a paused gig remains unavailable until resumed.", confirm: "Reopen intake" },
    pause: { title: "Pause gig operations", consequence: "Temporarily make the gig unavailable while preserving whether application intake is open or closed. An effective selection request can block this action.", confirm: "Pause operations" },
    resume: { title: "Resume gig operations", consequence: "Resume operations without changing application intake. Closed intake stays closed.", confirm: "Resume operations" },
    cancel: { title: "Cancel this gig", consequence: `This is terminal. It cancels the effective selection request, closes ${records}, preserves terminal history, and closes intake.`, confirm: "Cancel gig permanently" },
  }[action];
}
