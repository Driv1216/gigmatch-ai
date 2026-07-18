import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { GigForm, formFromTerms, snapshotFromGigForm, type GigFormValues } from "../components/GigForm";
import { PageContainer } from "../components/PageContainer";
import {
  editManagedGig,
  fetchManagedGig,
  GigManagementApiError,
  managementErrorMessage,
  previewManagedGigEdit,
  publishManagedGig,
  type ManagedGig,
  type MaterialPreview,
  upgradeManagedGig,
} from "../lib/gigManagement";

export function EditGigPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [gig, setGig] = useState<ManagedGig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<{ snapshot: Record<string, unknown>; preview: MaterialPreview } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    if (!id) return;
    setIsLoading(true);
    fetchManagedGig(id)
      .then((next) => { if (mounted) setGig(next); })
      .catch((error) => { if (mounted) setErrorMessage(managementErrorMessage(error)); })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, [id, reloadKey]);

  async function handleSubmit(values: GigFormValues) {
    if (!id || !gig) return;
    setIsSubmitting(true); setErrorMessage(null); setSuccessMessage(null); setPending(null);
    const snapshot = snapshotFromGigForm(values);
    try {
      if (gig.lifecycle === "draft") {
        await publishManagedGig(id, gig.optimistic_concurrency_token, snapshot);
        navigate("/gigs/manage");
        return;
      }
      if (gig.upgrade_required) {
        await upgradeManagedGig(id, gig.optimistic_concurrency_token, snapshot);
        navigate("/gigs/manage");
        return;
      }
      const preview = await previewManagedGigEdit(id, gig.optimistic_concurrency_token, snapshot);
      if (preview.code === "no_effective_change") {
        setSuccessMessage("No effective change was detected; no version was created.");
      } else if (preview.code === "material_change_confirmation_required") {
        setPending({ snapshot, preview });
      } else {
        await editManagedGig(id, gig.optimistic_concurrency_token, snapshot);
        setSuccessMessage(preview.is_material ? "Material version created." : "Minor display version created.");
        setReloadKey((value) => value + 1);
      }
    } catch (error) {
      setErrorMessage(managementErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmMaterialChange() {
    if (!id || !gig || !pending) return;
    setIsSubmitting(true); setErrorMessage(null);
    try {
      await editManagedGig(id, gig.optimistic_concurrency_token, pending.snapshot, pending.preview);
      setPending(null); setSuccessMessage("Material version created and dependent records were updated atomically.");
      setReloadKey((value) => value + 1);
    } catch (error) {
      if (error instanceof GigManagementApiError && ["material_change_confirmation_required", "material_change_consequences_changed"].includes(error.code) && error.detail && typeof error.detail === "object") {
        setPending({ snapshot: pending.snapshot, preview: error.detail as MaterialPreview });
        setErrorMessage("Consequences changed while you were reviewing. Review the refreshed counts before confirming again.");
      } else {
        setErrorMessage(managementErrorMessage(error));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const submitLabel = gig?.lifecycle === "draft" ? "Publish Gig" : gig?.upgrade_required ? "Upgrade and Publish" : "Review Changes";
  return (
    <PageContainer>
      <div className="rounded-lg border border-line bg-white p-8 shadow-soft">
        <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-semibold uppercase tracking-wide text-accent">Client Gig</p><h1 className="mt-3 text-3xl font-bold tracking-normal text-ink">Version-aware Gig Editor</h1></div>
          <div className="flex gap-3"><Button to="/gigs/manage" variant="secondary">Manage Gigs</Button><Button to="/dashboard/client" variant="secondary">Dashboard</Button></div>
        </div>
        {isLoading ? <p className="mt-8 text-sm font-medium text-muted">Loading gig...</p> : null}
        {errorMessage ? <p className="mt-8 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{errorMessage}</p> : null}
        {successMessage ? <p className="mt-8 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{successMessage}</p> : null}
        {gig?.upgrade_required ? <p className="mt-8 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">Upgrade required: supply complete supported terms. Existing values are not invented.</p> : null}
        {pending ? (
          <section className="mt-8 rounded-lg border border-amber-300 bg-amber-50 p-6">
            <h2 className="text-lg font-bold text-ink">Confirm material consequences</h2>
            <p className="mt-2 text-sm text-muted">Changed fields: {pending.preview.changed_fields.join(", ")}</p>
            <p className="mt-2 text-sm text-muted">Active applications requiring a response: {pending.preview.affected_application_count}</p>
            <p className="mt-2 text-sm text-muted">Selection request: {pending.preview.selection_request_effect.replace(/_/g, " ")}</p>
            <div className="mt-5 flex gap-3"><Button type="button" onClick={confirmMaterialChange} disabled={isSubmitting}>Confirm Material Change</Button><Button type="button" variant="secondary" onClick={() => setPending(null)}>Keep Editing</Button></div>
          </section>
        ) : null}
        {!isLoading && gig ? <GigForm key={`${gig.current_display_version_id}-${reloadKey}`} initialValues={formFromTerms(gig.terms)} isSubmitting={isSubmitting} submitLabel={submitLabel} submittingLabel="Saving..." onSubmit={handleSubmit} /> : null}
        {!isLoading && !gig && !errorMessage ? <Button onClick={() => navigate("/gigs/manage")}>Back to Manage Gigs</Button> : null}
      </div>
    </PageContainer>
  );
}
