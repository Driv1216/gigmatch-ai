import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { GigEditPreviewDialog } from "../components/GigEditPreviewDialog";
import { GigForm, formFromTerms, snapshotFromGigForm, type GigFormValues } from "../components/GigForm";
import { GigRouteContextRail } from "../components/GigRouteContextRail";
import { GigVersionReference } from "../components/GigVersionReference";
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
import { latestMaterialChangedFields } from "../lib/gigManagementView";

type PendingPreview = {
  snapshot: Record<string, unknown>;
  preview: MaterialPreview;
  requiresReconfirmation: boolean;
};

const concurrencyCodes = new Set([
  "stale_gig_version",
  "material_change_confirmation_required",
  "material_change_consequences_changed",
]);

export function EditGigPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [gig, setGig] = useState<ManagedGig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingPreview | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!id) return;
    setIsLoading(true);
    setErrorMessage(null);
    fetchManagedGig(id)
      .then((next) => { if (mounted) setGig(next); })
      .catch((error) => { if (mounted) setErrorMessage(managementErrorMessage(error)); })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, [id]);

  async function handleSubmit(values: GigFormValues) {
    if (!id || !gig) return;
    const snapshot = snapshotFromGigForm(values);
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPending(null);
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
        setSuccessMessage("The server found no effective change, so no immutable version was created.");
      } else if (preview.is_material || preview.code === "material_change_confirmation_required") {
        setPending({ snapshot, preview, requiresReconfirmation: false });
      } else {
        await editManagedGig(id, gig.optimistic_concurrency_token, snapshot);
        await refreshAfterSave("Minor display version created. The applicant-relevant material version was preserved.");
      }
    } catch (error) {
      if (isConcurrencyError(error)) {
        await refreshAndRepreview(snapshot, "The gig changed while this draft was open. Review the fresh server preview before confirming.");
      } else {
        setErrorMessage(managementErrorMessage(error));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmPreview() {
    if (!id || !gig || !pending) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await editManagedGig(id, gig.optimistic_concurrency_token, pending.snapshot, pending.preview.is_material ? pending.preview : undefined);
      setPending(null);
      await refreshAfterSave(pending.preview.is_material
        ? "Material version created. Display and applicant-relevant material references advanced atomically."
        : "Refreshed minor display version created; material terms were preserved.");
    } catch (error) {
      if (isConcurrencyError(error)) {
        await refreshAndRepreview(pending.snapshot, "Consequences changed during confirmation. Review the newly calculated server preview and confirm again.");
      } else {
        setErrorMessage(managementErrorMessage(error));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function refreshAndRepreview(snapshot: Record<string, unknown>, message: string) {
    if (!id) return;
    try {
      const latest = await fetchManagedGig(id);
      setGig(latest);
      const preview = await previewManagedGigEdit(id, latest.optimistic_concurrency_token, snapshot);
      if (preview.code === "no_effective_change") {
        setPending(null);
        setSuccessMessage("The latest authoritative version already contains this draft; no version was created.");
        setErrorMessage(null);
        return;
      }
      setPending({ snapshot, preview, requiresReconfirmation: true });
      setErrorMessage(message);
    } catch (refreshError) {
      setPending(null);
      setErrorMessage(`${managementErrorMessage(refreshError)} Your entered draft remains in the form.`);
    }
  }

  async function refreshAfterSave(message: string) {
    if (!id) return;
    setSuccessMessage(message);
    try {
      setGig(await fetchManagedGig(id));
    } catch (error) {
      setErrorMessage(`${managementErrorMessage(error)} The save completed, but the version reference could not be refreshed.`);
    }
  }

  const submitLabel = gig?.lifecycle === "draft" ? "Publish gig" : gig?.upgrade_required ? "Upgrade & publish" : "Preview changes";
  const title = gig && typeof gig.terms.title === "string" ? gig.terms.title : "Owned gig";
  const materialFields = gig ? latestMaterialChangedFields(gig.latest_material_change_summary) : [];

  return (
    <section className="stage-three-page gig-authoring-page gig-editor-page" aria-busy={isLoading}>
      {gig ? <GigRouteContextRail title={title} state={gig.product_state} phase="Version-aware editing" returnLabel="Return to managed gigs" returnTo="/gigs/manage" /> : null}
      <header className="stage-three-editorial-header">
        <div><p>Client operations / Immutable terms</p><h1>{gig?.lifecycle === "draft" ? "Complete Draft" : gig?.upgrade_required ? "Upgrade Legacy Terms" : "Edit Gig"}</h1></div>
        <div className="stage-three-editorial-context"><span>Candidate → preview → version</span><p>The complete candidate is previewed against the current display version. Material consequences always require explicit confirmation.</p><Button to="/gigs/manage" variant="secondary">Manage gigs</Button></div>
      </header>

      {isLoading ? <div className="stage-three-state-panel" role="status"><span>Gig editor</span><h2>Loading current terms</h2><p>Retrieving the owner DTO and concurrency reference…</p></div> : null}
      {errorMessage ? <div className="stage-three-notice is-error" role="alert"><strong>Controlled edit conflict</strong><p>{errorMessage}</p></div> : null}
      {successMessage ? <div className="stage-three-notice is-success" role="status"><strong>Version authority updated</strong><p>{successMessage}</p></div> : null}

      {!isLoading && gig ? (
        <>
          <GigVersionReference displayVersion={gig.current_display_version_number} materialVersion={gig.current_material_version_number} contractVersion={gig.terms_contract_version} latestChangedFields={materialFields} />
          {gig.upgrade_required ? <div className="stage-three-notice is-warning" role="status"><strong>Manual contract-zero upgrade</strong><p>Complete every supported term. Existing values and historical dependencies will not be invented or rebound.</p></div> : null}
          <div className="gig-authoring-board">
            <header><span>{gig.lifecycle === "draft" ? "Draft publication" : "Complete candidate"}</span><h2>{title}</h2><p>{gig.lifecycle === "draft" ? "Publishing creates the first supported immutable terms version." : "Submitting does not write immediately; the server first classifies exact changed fields and consequences."}</p></header>
            <GigForm initialValues={formFromTerms(gig.terms)} isSubmitting={isSubmitting} submitLabel={submitLabel} submittingLabel="Checking authority…" onSubmit={handleSubmit} />
          </div>
        </>
      ) : null}

      {!isLoading && !gig && !errorMessage ? <div className="stage-three-state-panel"><span>Owner record</span><h2>Gig not available</h2><p>The owned gig could not be loaded.</p><Button onClick={() => navigate("/gigs/manage")}>Back to Manage Gigs</Button></div> : null}

      {pending ? <GigEditPreviewDialog preview={pending.preview} requiresReconfirmation={pending.requiresReconfirmation} isSubmitting={isSubmitting} onConfirm={confirmPreview} onDismiss={() => setPending(null)} /> : null}
    </section>
  );
}

function isConcurrencyError(error: unknown): error is GigManagementApiError {
  return error instanceof GigManagementApiError && concurrencyCodes.has(error.code);
}
