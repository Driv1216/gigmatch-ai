import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ApplicationForm } from "../components/ApplicationForm";
import { PageContainer } from "../components/PageContainer";
import { editApplication, fetchApplication, reapplyApplication, updateApplicationForGigChange, type ApplicationResponse } from "../lib/applications";
import { fetchQaThread, submitRevisionUpdate, type QaThread } from "../lib/qa";
import { fetchReconsiderationInvitation, respondToReconsideration, type ReconsiderationInvitation } from "../lib/engagements";

export function EditApplicationPage() {
  const { applicationId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mode = params.get("mode") === "update" ? "update" : params.get("mode") === "reapply" ? "reapply" : params.get("mode") === "revision" ? "revision" : params.get("mode") === "reconsideration" ? "reconsideration" : "edit";
  const revisionRequestId = params.get("revisionRequestId");
  const invitationId = params.get("invitationId");
  const [detail, setDetail] = useState<ApplicationResponse | null>(null);
  const [qa, setQa] = useState<QaThread | null>(null);
  const [invitation, setInvitation] = useState<ReconsiderationInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let active = true; if (!applicationId) { setError("Application identifier is missing."); setLoading(false); return; } Promise.all([fetchApplication(applicationId), mode === "revision" ? fetchQaThread(applicationId) : Promise.resolve(null), mode === "reconsideration" && invitationId ? fetchReconsiderationInvitation(invitationId) : Promise.resolve(null)]).then(([value, thread, nextInvitation]) => { if (active) { setDetail(value); setQa(thread); setInvitation(nextInvitation); } }).catch((value: unknown) => { if (active) setError(value instanceof Error ? value.message : "Unable to load application."); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [applicationId, invitationId, mode]);
  async function submit(application: Record<string, unknown>) {
    if (!detail || !applicationId) return;
    setSubmitting(true); setError(null);
    try {
      const base = { expected_application_version_token: detail.application_version_token, application };
      if (mode === "edit") await editApplication(applicationId, base);
      else if (mode === "update") await updateApplicationForGigChange(applicationId, { ...base, expected_material_terms_token: detail.material_terms_token });
      else if (mode === "reapply") await reapplyApplication(applicationId, { ...base, expected_material_terms_token: detail.material_terms_token });
      else if (revisionRequestId) await submitRevisionUpdate(applicationId, revisionRequestId, {
        request_id: crypto.randomUUID(),
        expected_application_version_token: detail.application_version_token,
        snapshot: application,
      });
      else if (mode === "reconsideration" && invitation) await respondToReconsideration(
        invitation.invitation_id,
        "submit-update",
        { request_id: crypto.randomUUID(), action_token: invitation.action_token, snapshot: application },
      );
      navigate(`/applications/${applicationId}`, { replace: true });
    } catch (value) { setError(value instanceof Error ? value.message : "Unable to save application."); }
    finally { setSubmitting(false); }
  }
  if (loading) return <PageContainer><p className="text-sm text-muted">Loading application editor...</p></PageContainer>;
  if (!detail) return <PageContainer><div role="alert" className="rounded-md border border-red-200 bg-red-50 p-6 text-red-700">{error ?? "Application not found."}</div></PageContainer>;
  const structure = String(detail.current_material_terms.payment_structure) as "fixed_price" | "hourly" | "open_to_proposals";
  const currency = String(detail.current_material_terms.currency ?? "");
  const permitted = mode === "edit" ? detail.allowed_actions.includes("edit_application") : mode === "update" ? detail.allowed_actions.includes("update_for_gig_change") : mode === "reapply" ? detail.allowed_actions.includes("reapply_after_gig_change") : mode === "reconsideration" ? Boolean(invitation?.allowed_actions.includes("submit_update") && invitation.application_id === applicationId) : Boolean(revisionRequestId && qa?.permissions.respond_to_revision_request && qa.open_revision_request?.id === revisionRequestId);
  if (!permitted) return <PageContainer><div className="rounded-lg border border-line bg-white p-8"><h1 className="text-2xl font-bold text-ink">This action is no longer available</h1><p className="mt-3 text-sm text-muted">The application or gig state changed. Return to the application for its current actions.</p></div></PageContainer>;
  return <PageContainer className="space-y-6"><header><p className="text-sm font-semibold text-accent">Application v{detail.current_version_number}</p><h1 className="mt-2 text-3xl font-bold text-ink">{mode === "reapply" ? "Reapply after gig change" : mode === "update" ? "Update proposal for changed terms" : mode === "revision" ? "Submit complete proposal revision" : mode === "reconsideration" ? "Submit updated reconsideration proposal" : "Edit application"}</h1>{mode === "revision" || mode === "reconsideration" ? <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Your existing proposal remains historical. This complete form creates a new immutable proposal version only after current terms and validation are rechecked.</p> : null}</header>{error ? <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}<ApplicationForm key={`${mode}-${detail.current_version_number}`} paymentStructure={structure} currency={currency} materialTerms={detail.current_material_terms} initialApplication={detail.current_application} submitLabel={mode === "reapply" ? "Reapply" : mode === "revision" ? "Submit revised proposal version" : mode === "reconsideration" ? "Submit updated proposal and reopen" : "Save new version"} submitting={submitting} onSubmit={submit} /></PageContainer>;
}
