import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { PageContainer } from "../components/PageContainer";
import { StructuredQaPanel } from "../components/StructuredQaPanel";
import { SelectionPanel } from "../components/SelectionPanel";
import { ReconsiderationPanel } from "../components/ReconsiderationPanel";
import { fetchApplication, fetchApplicationVersions, reaffirmApplication, withdrawApplication, type ApplicationResponse, type VersionEnvelope } from "../lib/applications";
import { isRecord } from "../lib/applicationContracts";
import { statusLabel } from "../lib/applicationView";

const reasons = ["accepted_another_opportunity", "no_longer_available", "scope_or_terms_no_longer_fit", "timeline_changed", "budget_expectations_mismatch", "gig_changed_materially", "personal_circumstances", "other"];

export function ApplicationDetailPage() {
  const { applicationId } = useParams();
  const [detail, setDetail] = useState<ApplicationResponse | null>(null);
  const [history, setHistory] = useState<VersionEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState(reasons[0]);
  const [explanation, setExplanation] = useState("");

  const load = useCallback(async () => {
    if (!applicationId) throw new Error("Application identifier is missing.");
    const [nextDetail, nextHistory] = await Promise.all([fetchApplication(applicationId), fetchApplicationVersions(applicationId)]);
    setDetail(nextDetail); setHistory(nextHistory);
  }, [applicationId]);
  useEffect(() => { let active = true; load().catch((value: unknown) => { if (active) setError(value instanceof Error ? value.message : "Unable to load application."); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [load]);

  async function mutate(action: () => Promise<ApplicationResponse>) {
    setWorking(true); setError(null);
    try { setDetail(await action()); setHistory(await fetchApplicationVersions(applicationId!)); }
    catch (value) { setError(value instanceof Error ? value.message : "Unable to update the application."); }
    finally { setWorking(false); }
  }
  if (loading) return <PageContainer><p className="text-sm text-muted">Loading application...</p></PageContainer>;
  if (!detail || !applicationId) return <PageContainer><div role="alert" className="rounded-md border border-red-200 bg-red-50 p-6 text-red-700">{error ?? "Application not found."}</div></PageContainer>;
  const can = (action: string) => detail.allowed_actions.includes(action);
  return <PageContainer className="space-y-6">
    <header className="rounded-lg border border-line bg-white p-7 shadow-soft"><p className="text-xs font-semibold uppercase text-accent">{statusLabel(detail.stage)} · application v{detail.current_version_number}</p><h1 className="mt-2 text-3xl font-bold text-ink">{String(detail.gig.title ?? "Application")}</h1><p className="mt-2 text-sm text-muted">{String(detail.client.company_name ?? detail.client.display_name ?? "Client")}</p></header>
    {error ? <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
    {detail.response_to_updated_gig_required ? <section className="rounded-lg border border-amber-200 bg-amber-50 p-6"><h2 className="text-lg font-bold text-amber-950">The gig terms changed</h2><p className="mt-2 text-sm text-amber-900">Your current proposal answers gig terms v{detail.answered_gig_version_number}; the current material terms are v{detail.current_material_gig_version_number}.</p><ul className="mt-4 space-y-2 text-sm text-amber-900">{detail.gig_change_comparison.map((change) => <li key={change.field}><strong>{change.field.replace(/_/g, " ")}:</strong> updated</li>)}</ul><div className="mt-5 flex flex-wrap gap-3">{can("reaffirm_updated_gig_terms") ? <Button disabled={working} onClick={() => mutate(() => reaffirmApplication(applicationId, { expected_application_version_token: detail.application_version_token, expected_material_terms_token: detail.material_terms_token }))}>Reaffirm proposal</Button> : null}{can("update_for_gig_change") ? <Button to={`/applications/${applicationId}/edit?mode=update`} variant="secondary">Update proposal</Button> : null}</div>{!detail.compatibility.can_reaffirm_existing_proposal ? <p className="mt-3 text-xs font-semibold text-amber-900">The existing financial proposal is incompatible with the updated terms and must be revised.</p> : null}</section> : null}
    <div className="grid gap-6 lg:grid-cols-2"><Snapshot title="Current proposal" value={detail.current_application} /><Snapshot title="Original submission" value={detail.original_submission} /></div>
    <StructuredQaPanel applicationId={applicationId} onAttentionChange={() => void load()} />
    <SelectionPanel applicationId={applicationId} onChanged={() => void load()} />
    <ReconsiderationPanel applicationId={applicationId} onChanged={() => void load()} />
    <section className="rounded-lg border border-line bg-white p-6"><h2 className="text-lg font-bold text-ink">Actions</h2><div className="mt-4 flex flex-wrap gap-3">{can("edit_application") ? <Button to={`/applications/${applicationId}/edit`} variant="secondary">Edit application</Button> : null}{can("reapply_after_gig_change") ? <Button to={`/applications/${applicationId}/edit?mode=reapply`}>Reapply after gig change</Button> : null}</div>{can("withdraw_application") ? <div className="mt-5 border-t border-line pt-5"><label className="text-sm font-semibold text-ink">Withdrawal reason<select value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 block w-full max-w-md rounded-md border border-line px-3 py-2">{reasons.map((value) => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}</select></label>{reason === "other" ? <textarea value={explanation} onChange={(event) => setExplanation(event.target.value)} className="mt-3 w-full max-w-md rounded-md border border-line px-3 py-2" placeholder="Explain your reason" /> : null}<div className="mt-3"><Button variant="secondary" disabled={working || (reason === "other" && !explanation.trim())} onClick={() => { if (window.confirm("Withdraw this application? Your version history will remain, but the active application will close.")) void mutate(() => withdrawApplication(applicationId, { expected_application_version_token: detail.application_version_token, reason, explanation: explanation || undefined })); }}>Withdraw application</Button></div></div> : null}</section>
    <section className="rounded-lg border border-line bg-white p-6"><h2 className="text-lg font-bold text-ink">Version history</h2><div className="mt-4 space-y-3">{history?.items.map((version) => <details key={version.version_token} className="rounded-md border border-line p-4"><summary className="cursor-pointer font-semibold text-ink">Version {version.version_number} · {version.origin.replace(/_/g, " ")} · answered gig v{version.answered_gig_version_number}</summary><pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs text-muted">{JSON.stringify(version.application, null, 2)}</pre></details>)}</div></section>
  </PageContainer>;
}

function Snapshot({ title, value }: { title: string; value: Record<string, unknown> }) {
  const proposal = isRecord(value.proposal) ? value.proposal : {};
  return <section className="rounded-lg border border-line bg-white p-6"><h2 className="text-lg font-bold text-ink">{title}</h2><p className="mt-4 whitespace-pre-wrap text-sm text-muted">{String(value.cover_note ?? "")}</p><dl className="mt-4 grid gap-2 text-sm"><div><dt className="font-semibold text-ink">Pricing</dt><dd className="text-muted">{String(proposal.mode ?? proposal.payment_structure ?? "Proposal")}</dd></div><div><dt className="font-semibold text-ink">Scope notes</dt><dd className="text-muted">{String(value.scope_notes ?? "None")}</dd></div></dl></section>;
}
