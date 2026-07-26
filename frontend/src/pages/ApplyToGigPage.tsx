import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApplicationForm } from "../components/ApplicationForm";
import { Button } from "../components/Button";
import { PageContainer } from "../components/PageContainer";
import { ApplicationApiError, fetchApplicationContext, submitApplication, type ApplicationContext } from "../lib/applications";
import { blockerMessage } from "../lib/applicationView";

export function ApplyToGigPage() {
  const { gigId } = useParams();
  const navigate = useNavigate();
  const [context, setContext] = useState<ApplicationContext | null>(null);
  const [requestId] = useState(() => crypto.randomUUID());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!gigId) { setError("Gig identifier is missing."); setLoading(false); return; }
    fetchApplicationContext(gigId)
      .then((value) => { if (active) setContext(value); })
      .catch((reason: unknown) => { if (active) setError(message(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [gigId]);

  async function handleSubmit(application: Record<string, unknown>) {
    if (!gigId || !context?.material_terms_token) return;
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
      setError(message(reason));
      if (reason instanceof ApplicationApiError && reason.code === "stale_gig_terms") {
        try { setContext(await fetchApplicationContext(gigId)); } catch { /* keep the actionable mutation error */ }
      }
    } finally { setSubmitting(false); }
  }

  if (loading) return <PageContainer><p className="text-sm text-muted">Loading application terms...</p></PageContainer>;
  if (!context) return <PageContainer><ErrorPanel message={error ?? "Application terms are unavailable."} /></PageContainer>;
  if (!context.can_apply || !context.material_terms_token) {
    return <PageContainer><ErrorPanel message={blockerMessage(context.blocker)} existingId={context.existing_application_id} /></PageContainer>;
  }
  return (
    <PageContainer className="space-y-6">
      <header><p className="text-sm font-semibold text-accent">Application · gig terms v{context.material_gig_version_number}</p><h1 className="mt-2 text-3xl font-bold text-ink">Apply to {String(context.gig.title ?? "gig")}</h1><p className="mt-3 text-sm text-muted">Your proposal will be bound to these published terms. Deadline: {new Date(context.application_deadline).toLocaleString()}.</p></header>
      {error ? <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      <ApplicationForm paymentStructure={context.payment_structure} currency={context.currency} materialTerms={context.material_terms}
        submitLabel="Submit application" submitting={submitting} onSubmit={handleSubmit} />
    </PageContainer>
  );
}

function ErrorPanel({ message: value, existingId }: { message: string; existingId?: string | null }) {
  return <div className="rounded-lg border border-line bg-white p-8"><h1 className="text-2xl font-bold text-ink">Application unavailable</h1><p className="mt-3 text-sm text-muted">{value}</p><div className="mt-6 flex gap-3">{existingId ? <Button to={`/applications/${existingId}`}>View your application</Button> : null}<Button to="/gigs" variant="secondary">Browse gigs</Button></div></div>;
}

function message(reason: unknown) {
  if (reason instanceof ApplicationApiError) {
    const copy: Record<string, string> = { stale_gig_terms: "The gig terms changed. Review the refreshed terms and submit again; your form values were preserved.", application_already_exists: "You already have an application for this gig.", application_deadline_passed: "The application deadline has passed.", invalid_financial_proposal: "The proposal does not satisfy the published financial terms." };
    return copy[reason.code] ?? reason.message;
  }
  return reason instanceof Error ? reason.message : "Unable to load or submit the application.";
}
