import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "./Button";

export type ApplicantReviewDialogMode = "advance" | "return" | "not_selected" | "reopen";

export type NotSelectedDecision = {
  primary_reason: string;
  additional_reasons: string[];
  feedback_points: string[];
  respectful_note?: string;
  other_explanation?: string;
  final_decision_confirmed: boolean;
};

export type ReopenDecision = {
  reason: string;
  explanation?: string;
};

type Props = {
  mode: ApplicantReviewDialogMode;
  applicantName: string;
  applicationStage: string;
  isSubmitting: boolean;
  stillAuthorized: boolean;
  error: string | null;
  onConfirm: (decision?: NotSelectedDecision | ReopenDecision) => Promise<boolean>;
  onDismiss: () => void;
};

const notSelectedReasons = [
  ["required_skills_mismatch", "Required skills mismatch"],
  ["experience_level_mismatch", "Experience mismatch"],
  ["proposal_exceeded_budget", "Proposal exceeded available budget"],
  ["timeline_or_availability_mismatch", "Timeline or availability mismatch"],
  ["stronger_overall_match", "Stronger overall match"],
  ["gig_requirements_changed", "Gig requirements changed"],
  ["other", "Other job-related reason"],
] as const;

const reopenReasons = [
  ["gig_materially_changed", "Gig materially changed"],
  ["failed_engagement_reopened", "Failed engagement reopened"],
  ["client_reconsideration", "Client reconsideration"],
  ["freelancer_invited_back", "Freelancer invited back"],
  ["other", "Other"],
] as const;

export function ApplicantReviewDialog({
  mode,
  applicantName,
  applicationStage,
  isSubmitting,
  stillAuthorized,
  error,
  onConfirm,
  onDismiss,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [reason, setReason] = useState("stronger_overall_match");
  const [feedback, setFeedback] = useState("");
  const [note, setNote] = useState("");
  const [otherExplanation, setOtherExplanation] = useState("");
  const [finalConfirmed, setFinalConfirmed] = useState(false);
  const [reopenReason, setReopenReason] = useState("client_reconsideration");
  const [reopenExplanation, setReopenExplanation] = useState("");

  useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.showModal();
    return () => { window.requestAnimationFrame(() => returnFocusRef.current?.focus()); };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let decision: NotSelectedDecision | ReopenDecision | undefined;
    if (mode === "not_selected") {
      decision = {
        primary_reason: reason,
        additional_reasons: [],
        feedback_points: feedback.trim() ? [feedback.trim()] : [],
        respectful_note: note.trim() || undefined,
        other_explanation: otherExplanation.trim() || undefined,
        final_decision_confirmed: applicationStage === "advanced" ? finalConfirmed : false,
      };
    } else if (mode === "reopen") {
      decision = {
        reason: reopenReason,
        explanation: reopenExplanation.trim() || undefined,
      };
    }
    if (await onConfirm(decision)) onDismiss();
  }

  const advancedDecision = applicationStage === "advanced";
  const invalidNotSelected = mode === "not_selected" && (
    (reason === "other" && !otherExplanation.trim()) ||
    (advancedDecision && (!feedback.trim() || !finalConfirmed))
  );
  const invalidReopen = mode === "reopen" && reopenReason === "other" && !reopenExplanation.trim();
  const title = dialogTitle(mode);

  return (
    <dialog
      ref={dialogRef}
      className="applicant-review-dialog"
      onClose={onDismiss}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !isSubmitting) {
          event.preventDefault();
          dialogRef.current?.close();
        }
      }}
      aria-labelledby="applicant-review-dialog-title"
      aria-describedby="applicant-review-dialog-consequence"
    >
      <form onSubmit={submit}>
        <header>
          <span>Client review decision</span>
          <h2 id="applicant-review-dialog-title">{title}</h2>
          <p>{applicantName} · {applicationStage.replace(/_/g, " ")}</p>
        </header>
        <div className="applicant-review-dialog-body">
          <p id="applicant-review-dialog-consequence" className="applicant-review-dialog-consequence">
            {dialogConsequence(mode, advancedDecision)}
          </p>
          {error ? <p className="applicant-review-dialog-error" role="alert">{error} Your inputs remain here while the authoritative record is refreshed.</p> : null}
          {!stillAuthorized ? <p className="applicant-review-dialog-error" role="alert">This action is no longer authorized for the refreshed record. Close this dialog and review the current controls.</p> : null}

          {mode === "not_selected" ? (
            <>
              <label><span>Primary structured reason</span>
                <select autoFocus value={reason} onChange={(event) => setReason(event.target.value)}>
                  {notSelectedReasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              {reason === "other" ? <label><span>Other reason explanation</span><textarea required rows={3} maxLength={500} value={otherExplanation} onChange={(event) => setOtherExplanation(event.target.value)} /></label> : null}
              {advancedDecision ? <label><span>Meaningful applicant feedback</span><textarea required rows={4} maxLength={500} value={feedback} onChange={(event) => setFeedback(event.target.value)} /><small>Advanced decisions require at least one meaningful feedback point.</small></label> : null}
              <label><span>Optional respectful note</span><textarea rows={4} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} /></label>
              {advancedDecision ? <label className="applicant-review-final-confirmation"><input type="checkbox" checked={finalConfirmed} onChange={(event) => setFinalConfirmed(event.target.checked)} /><span>I confirm this is the final Not Selected decision and the applicant-visible stage will change.</span></label> : null}
              <p className="applicant-review-structural-note">GigMatch validates the decision structure. It does not claim to AI-moderate this feedback.</p>
            </>
          ) : null}

          {mode === "reopen" ? (
            <>
              <label><span>Controlled reopen reason</span>
                <select autoFocus value={reopenReason} onChange={(event) => setReopenReason(event.target.value)}>
                  {reopenReasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label><span>Explanation {reopenReason === "other" ? "(required)" : "(optional)"}</span><textarea required={reopenReason === "other"} rows={4} maxLength={1000} value={reopenExplanation} onChange={(event) => setReopenExplanation(event.target.value)} /></label>
              <p className="applicant-review-structural-note">This is the 7E review action, not a reconsideration invitation or failed-engagement Gig Reopening.</p>
            </>
          ) : null}
        </div>
        <footer>
          <Button type="button" variant="secondary" disabled={isSubmitting} onClick={() => dialogRef.current?.close()}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting || !stillAuthorized || invalidNotSelected || invalidReopen}>
            {isSubmitting ? "Refreshing record…" : title}
          </Button>
        </footer>
      </form>
    </dialog>
  );
}

function dialogTitle(mode: ApplicantReviewDialogMode): string {
  return {
    advance: "Advance",
    return: "Return to Review",
    not_selected: "Mark Not Selected",
    reopen: "Reopen Application",
  }[mode];
}

function dialogConsequence(mode: ApplicantReviewDialogMode, advancedDecision: boolean): string {
  if (mode === "advance") return "This participant-visible decision moves the application from Under Review to Advanced. It does not select the applicant or create an engagement.";
  if (mode === "return") return "This participant-visible decision moves the application from Advanced back to Under Review. It does not withdraw or reopen the application.";
  if (mode === "reopen") return "This preserves the historical Not Selected event and returns the application to Under Review. Private shortlist state is not restored automatically.";
  return advancedDecision
    ? "This is a final participant-visible decision. Advanced applicants require meaningful feedback and explicit confirmation."
    : "This participant-visible decision moves the application from Under Review to Not Selected and remains in review history.";
}
