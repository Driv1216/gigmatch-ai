import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApplicationForm } from "../components/ApplicationForm";
import { Button } from "../components/Button";
import { GigRouteContextRail } from "../components/GigRouteContextRail";
import { ApplicationApiError, fetchApplicationContext, submitApplication, type ApplicationContext } from "../lib/applications";
import { applicationSubmissionErrorMessage, blockerMessage } from "../lib/applicationView";
import { formatDateTime } from "../lib/marketplaceView";

type TermsReviewState = "current" | "refreshing" | "review_required" | "refresh_failed";

export function ApplyToGigPage() {
  const { gigId } = useParams();
  const navigate = useNavigate();
  const [context, setContext] = useState<ApplicationContext | null>(null);
  const [requestId] = useState(() => crypto.randomUUID());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsReviewState, setTermsReviewState] = useState<TermsReviewState>("current");

  useEffect(() => {
    let active = true;
    if (!gigId) { setError("Gig identifier is missing."); setLoading(false); return; }
    fetchApplicationContext(gigId)
      .then((value) => { if (active) setContext(value); })
      .catch((reason: unknown) => { if (active) setError(message(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [gigId]);

  async function refreshTermsAfterStale() {
    if (!gigId) return;
    setTermsReviewState("refreshing");
    setError(null);
    try {
      const nextContext = await fetchApplicationContext(gigId);
      setContext(nextContext);
      setTermsReviewState(nextContext.can_apply ? "review_required" : "current");
    } catch (reason) {
      setTermsReviewState("refresh_failed");
      setError(message(reason));
    }
  }

  async function handleSubmit(application: Record<string, unknown>) {
    if (!gigId || !context?.material_terms_token || termsReviewState !== "current") return;
    setSubmitting(true);
    setError(null);
    try {
      const saved = await submitApplication(gigId, {
        submission_request_id: requestId,
        expected_material_terms_token: context.material_terms_token,
        application,
      });
      navigate(`/applications/${saved.application_id}`, { replace: true });
    } catch (reason) {
      if (reason instanceof ApplicationApiError && reason.code === "stale_gig_terms") {
        await refreshTermsAfterStale();
      } else {
        setError(message(reason));
      }
    } finally { setSubmitting(false); }
  }

  if (loading) return <section className="stage-two-page"><StatePanel title="Loading application terms" body="Confirming the current gig and application context…" /></section>;
  if (!context) return <section className="stage-two-page"><ErrorPanel message={error ?? "Application terms are unavailable."} gigId={gigId} /></section>;
  if (!context.can_apply || !context.material_terms_token) {
    return <section className="stage-two-page"><ErrorPanel message={blockerMessage(context.blocker)} existingId={context.existing_application_id} gigId={gigId} /></section>;
  }

  const title = textField(context.gig, "title") ?? "Current gig";
  const clientName = textField(context.client, "company_name") ?? textField(context.client, "display_name") ?? "Client";
  const requiredSkills = stringList(context.gig.required_skills);

  return (
    <section className="stage-two-page application-submission-page">
      <GigRouteContextRail title={title} state="accepting applications" phase="Application submission" returnTo={`/gigs/${encodeURIComponent(gigId ?? "")}`} returnLabel="Return to gig detail" />
      <header className="stage-two-editorial-header application-submission-header">
        <div>
          <p>APPLICATION / COMPLETE PROPOSAL</p>
          <h1>Make the promise inspectable.</h1>
        </div>
        <div className="stage-two-editorial-context">
          <span>Apply to {title}</span>
          <p>Your authenticated freelancer identity is used automatically. The complete proposal is bound to the current reviewed gig terms when submitted.</p>
        </div>
      </header>

      <div className="application-terms-strip" aria-label="Current application terms">
        <div><span>Client</span><strong>{clientName}</strong></div>
        <div><span>Payment basis</span><strong>{context.payment_structure.replace(/_/g, " ")} · {context.currency}</strong></div>
        <div><span>Apply by</span><strong>{formatDateTime(context.application_deadline)}</strong></div>
        <div><span>Required skills</span><strong>{requiredSkills.length ? requiredSkills.join(" · ") : "None specified"}</strong></div>
      </div>

      {termsReviewState !== "current" ? (
        <TermsReviewNotice
          state={termsReviewState}
          onConfirm={() => setTermsReviewState("current")}
          onRetry={refreshTermsAfterStale}
        />
      ) : null}

      {error && termsReviewState === "current" ? <div role="alert" className="application-submission-error"><strong>Application not submitted</strong><p>{error}</p></div> : null}

      <div className="application-form-board">
        <div className="application-form-board-heading">
          <span>Draft</span>
          <p>All fields below belong to the existing complete proposal contract. Submission creates one application history for this gig.</p>
        </div>
        <ApplicationForm
          paymentStructure={context.payment_structure}
          currency={context.currency}
          materialTerms={context.material_terms}
          presentation="switchboard-submission"
          submitDisabled={termsReviewState !== "current"}
          submitLabel="Submit application"
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      </div>
    </section>
  );
}

function TermsReviewNotice({ state, onConfirm, onRetry }: { state: TermsReviewState; onConfirm: () => void; onRetry: () => Promise<void> }) {
  const refreshing = state === "refreshing";
  const failed = state === "refresh_failed";
  return (
    <div className="application-terms-changed" role="alert" aria-live="assertive">
      <span>Terms changed</span>
      <h2>{refreshing ? "Refreshing the authoritative terms…" : failed ? "Current terms could not be refreshed" : "Review the refreshed terms before resubmitting"}</h2>
      <p>
        {refreshing
          ? "Submission is paused while the current application context is reloaded."
          : failed
            ? "Your draft remains in this form, but submission stays blocked until the current terms can be loaded."
            : "Your form draft was preserved. Check the updated terms strip and visible proposal fields, then confirm your review before trying again with the same submission request."}
      </p>
      {!refreshing && !failed ? <Button type="button" onClick={onConfirm}>I reviewed the refreshed terms</Button> : null}
      {failed ? <Button type="button" variant="secondary" onClick={onRetry}>Retry terms refresh</Button> : null}
    </div>
  );
}

function ErrorPanel({ message: value, existingId, gigId }: { message: string; existingId?: string | null; gigId?: string }) {
  return (
    <div className="stage-two-state-panel is-application-blocked" role="alert">
      <span>Application context</span>
      <h1>Application unavailable</h1>
      <p>{value}</p>
      <div className="stage-two-state-actions">
        {existingId ? <Button to={`/applications/${encodeURIComponent(existingId)}`}>View your application</Button> : null}
        {gigId ? <Button to={`/gigs/${encodeURIComponent(gigId)}`} variant="secondary">Return to gig detail</Button> : null}
        <Button to="/gigs" variant="secondary">Browse gigs</Button>
      </div>
    </div>
  );
}

function StatePanel({ title, body }: { title: string; body: string }) {
  return <div className="stage-two-state-panel" role="status"><span>Application submission</span><h1>{title}</h1><p>{body}</p></div>;
}

function message(reason: unknown) {
  if (reason instanceof ApplicationApiError) return applicationSubmissionErrorMessage(reason.code);
  return reason instanceof Error ? reason.message : "Unable to load or submit the application.";
}

function textField(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
