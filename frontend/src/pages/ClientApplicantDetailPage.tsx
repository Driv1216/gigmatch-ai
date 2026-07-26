import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { PageContainer } from "../components/PageContainer";
import { StructuredQaPanel } from "../components/StructuredQaPanel";
import { SelectionPanel } from "../components/SelectionPanel";
import { ReconsiderationPanel } from "../components/ReconsiderationPanel";
import {
  advanceApplicant,
  ApplicantReviewApiError,
  fetchApplicant,
  fetchApplicantVersions,
  markApplicantNotSelected,
  reopenApplicant,
  returnApplicantToReview,
  setApplicantShortlist,
  type ApplicantDetail,
  type ApplicantVersionEnvelope,
} from "../lib/applicantReview";
import {
  applicantReviewErrorMessage,
  applicantScorePresentation,
  formatReviewDate,
  notSelectedDecisionReady,
  reopenDecisionReady,
  shouldRefreshApplicantReviewAfterError,
} from "../lib/applicantReviewView";
import { isRecord } from "../lib/applicationContracts";
import { statusLabel } from "../lib/applicationView";

export function ClientApplicantDetailPage() {
  const { gigId, applicationId } = useParams();
  const [detail, setDetail] = useState<ApplicantDetail | null>(null);
  const [versions, setVersions] = useState<ApplicantVersionEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [dialog, setDialog] = useState<"advance" | "return" | "not_selected" | "reopen" | null>(null);
  const [reason, setReason] = useState("stronger_overall_match");
  const [feedback, setFeedback] = useState("");
  const [note, setNote] = useState("");
  const [otherExplanation, setOtherExplanation] = useState("");
  const [finalConfirmed, setFinalConfirmed] = useState(false);
  const [reopenReason, setReopenReason] = useState("client_reconsideration");
  const [reopenExplanation, setReopenExplanation] = useState("");

  const load = useCallback(async () => {
    if (!gigId || !applicationId) throw new Error("Applicant identifier is missing.");
    const [nextDetail, nextVersions] = await Promise.all([
      fetchApplicant(gigId, applicationId),
      fetchApplicantVersions(gigId, applicationId),
    ]);
    setDetail(nextDetail);
    setVersions(nextVersions);
  }, [applicationId, gigId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    load().catch((value) => { if (active) setError(applicantReviewErrorMessage(value)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  if (loading) return <PageContainer><p className="text-sm text-muted">Loading applicant review...</p></PageContainer>;
  if (!detail || !gigId) return <PageContainer><div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">{error ?? "Applicant review not found."}</div></PageContainer>;
  const reviewedApplicant = detail;
  const score = applicantScorePresentation(detail.suitability);
  const current = detail.current_application;
  const proposal = isRecord(current.proposal) ? current.proposal : {};
  const timeline = isRecord(current.timeline) ? current.timeline : {};
  const availability = isRecord(current.availability) ? current.availability : {};
  const explanation = detail.suitability.explanation;
  const skillGap = isRecord(explanation.skill_gap) ? explanation.skill_gap : {};
  const can = (action: string) => detail.allowed_actions.includes(action);

  async function runMutation(action: () => Promise<ApplicantDetail>) {
    setWorking(true);
    setError(null);
    try {
      setDetail(await action());
      setDialog(null);
    } catch (value) {
      const message = applicantReviewErrorMessage(value);
      if (value instanceof ApplicantReviewApiError &&
        shouldRefreshApplicantReviewAfterError(value.code)) {
        await load().catch(() => undefined);
      }
      setError(message);
    } finally {
      setWorking(false);
    }
  }

  async function submitDialog() {
    if (!dialog) return;
    if (dialog === "advance") {
      await runMutation(() => advanceApplicant(reviewedApplicant.application_id, reviewedApplicant.review_decision_action_token));
    } else if (dialog === "return") {
      await runMutation(() => returnApplicantToReview(reviewedApplicant.application_id, reviewedApplicant.review_decision_action_token));
    } else if (dialog === "not_selected") {
      await runMutation(() => markApplicantNotSelected(reviewedApplicant.application_id, {
        review_decision_action_token: reviewedApplicant.review_decision_action_token,
        primary_reason: reason,
        additional_reasons: [],
        feedback_points: feedback.trim() ? [feedback.trim()] : [],
        respectful_note: note.trim() || undefined,
        other_explanation: otherExplanation.trim() || undefined,
        final_decision_confirmed: reviewedApplicant.stage === "advanced" ? finalConfirmed : false,
      }));
    } else {
      await runMutation(() => reopenApplicant(reviewedApplicant.application_id, {
        review_decision_action_token: reviewedApplicant.review_decision_action_token,
        reason: reopenReason,
        explanation: reopenExplanation.trim() || undefined,
      }));
    }
  }

  return (
    <PageContainer className="space-y-6">
      <header className="rounded-lg border border-line bg-white p-7 shadow-soft">
        <Button to={`/gigs/${gigId}/applicants`} variant="secondary">Back to applicants</Button>
        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-accent">{statusLabel(detail.stage)} · application v{detail.current_application_version_number}</p>
            <h1 className="mt-2 text-3xl font-bold text-ink">{String(detail.freelancer.display_name ?? "Applicant")}</h1>
            <p className="mt-2 text-sm text-muted">{String(detail.freelancer.headline ?? "Headline unavailable")}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-muted">{detail.suitability.evidence_label}</p>
            <p className="mt-2 text-xl font-bold text-ink">{score.label}{score.score ? ` · ${score.score}` : ""}</p>
            <p className="mt-2 text-xs text-muted">Generated {formatReviewDate(detail.ranking_generated_at)}</p>
          </div>
        </div>
      </header>

      {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}
      {detail.response_to_updated_gig_required ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-lg font-bold text-amber-950">Response to updated gig required</h2>
          <p className="mt-2 text-sm text-amber-900">
            The current proposal answers gig v{String(detail.answered_gig_version.version_number ?? "")};
            current suitability evaluates gig v{String(detail.current_material_gig_version.version_number ?? "")}.
          </p>
          <ul className="mt-4 space-y-1 text-sm text-amber-900">
            {detail.material_change_comparison.map((change) => <li key={change.field}>{change.field.replace(/_/g, " ")} changed</li>)}
          </ul>
        </section>
      ) : null}

      <section className="rounded-lg border border-line bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-ink">Client review actions</h2>
            <p className="mt-2 text-sm text-muted">
              Internal shortlist is private. Stage decisions are participant-visible and preserved in history.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {can("add_to_internal_shortlist") ? <Button variant="secondary" disabled={working} onClick={() => void runMutation(() => setApplicantShortlist(detail.application_id, true, detail.shortlist_action_token))}>Add to shortlist</Button> : null}
            {can("remove_from_internal_shortlist") ? <Button variant="secondary" disabled={working} onClick={() => void runMutation(() => setApplicantShortlist(detail.application_id, false, detail.shortlist_action_token))}>Remove shortlist</Button> : null}
            {can("advance") ? <Button disabled={working} onClick={() => setDialog("advance")}>Advance</Button> : null}
            {can("return_to_review") ? <Button variant="secondary" disabled={working} onClick={() => setDialog("return")}>Return to general review</Button> : null}
            {can("mark_not_selected") ? <Button variant="secondary" disabled={working} onClick={() => setDialog("not_selected")}>Mark Not Selected</Button> : null}
            {can("reopen") ? <Button disabled={working} onClick={() => setDialog("reopen")}>Reopen application</Button> : null}
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold text-muted">
          {detail.review_state.is_shortlisted ? "Currently on the private internal shortlist." : "Not currently shortlisted."}
        </p>
        {detail.action_blockers.map((blocker) => <p key={blocker} className="mt-2 text-sm font-semibold text-amber-800">{blocker.replace(/_/g, " ")}</p>)}
      </section>

      <StructuredQaPanel applicationId={detail.application_id} onAttentionChange={() => void load()} />
      <SelectionPanel applicationId={detail.application_id} onChanged={() => void load()} />
      <ReconsiderationPanel applicationId={detail.application_id} onChanged={() => void load()} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-white p-6">
          <h2 className="text-xl font-bold text-ink">Current structured application</h2>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted">{String(current.cover_note ?? "")}</p>
          <dl className="mt-5 space-y-3">
            <DetailRow label="Proposal" value={String(proposal.mode ?? proposal.payment_structure ?? "Not specified")} />
            <DetailRow label="Timeline" value={String(timeline.mode ?? "Not specified")} />
            <DetailRow label="Available from" value={String(availability.available_from ?? "Not specified")} />
            <DetailRow label="Scope notes" value={String(current.scope_notes ?? "None")} />
          </dl>
          <details className="mt-5 rounded-md border border-line p-4">
            <summary className="cursor-pointer font-semibold text-ink">Complete structured proposal</summary>
            <pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs text-muted">{JSON.stringify(current, null, 2)}</pre>
          </details>
        </section>
        <section className="rounded-lg border border-line bg-white p-6">
          <h2 className="text-xl font-bold text-ink">Current suitability evidence</h2>
          <p className="mt-3 text-sm leading-6 text-muted">{String(explanation.summary ?? "No explanation details are available.")}</p>
          <SkillList label="Matched required skills" value={skillGap.matched_required_skills} />
          <SkillList label="Required skill gaps" value={skillGap.missing_required_skills} />
          <SkillList label="Matched preferred skills" value={skillGap.matched_preferred_skills} />
          <SkillList label="Preferred skill gaps" value={skillGap.missing_preferred_skills} />
          <p className="mt-5 text-xs text-muted">AI-assisted evidence supports review and does not make the client decision.</p>
        </section>
      </div>

      <section className="rounded-lg border border-line bg-white p-6">
        <h2 className="text-xl font-bold text-ink">Client terms and answered terms</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <VersionTerms label="Exact terms answered" value={detail.answered_gig_version} />
          <VersionTerms label="Current material terms" value={detail.current_material_gig_version} />
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-6">
        <h2 className="text-xl font-bold text-ink">Participant-visible review history</h2>
        {detail.review_history.length ? (
          <ol className="mt-4 space-y-3">
            {detail.review_history.map((event, index) => (
              <li key={`${String(event.event_type)}-${String(event.occurred_at)}-${index}`} className="rounded-md border border-line p-4">
                <p className="font-semibold text-ink">{String(event.event_type ?? "Application event").replace(/_/g, " ")}</p>
                <p className="mt-1 text-xs text-muted">{formatReviewDate(event.occurred_at)}</p>
              </li>
            ))}
          </ol>
        ) : <p className="mt-3 text-sm text-muted">No client decision events yet.</p>}
      </section>

      <section className="rounded-lg border border-line bg-white p-6">
        <h2 className="text-xl font-bold text-ink">Immutable application-version history</h2>
        <p className="mt-2 text-sm text-muted">
          Suitability above is current evidence and is not attached to these historical versions.
        </p>
        <div className="mt-4 space-y-3">
          {versions?.items.map((version) => (
            <details key={version.version_token} className="rounded-md border border-line p-4">
              <summary className="cursor-pointer font-semibold text-ink">
                Application v{version.version_number} · answered gig v{version.answered_gig_version_number} · {version.origin.replace(/_/g, " ")}
              </summary>
              <pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs text-muted">{JSON.stringify(version.application, null, 2)}</pre>
            </details>
          ))}
        </div>
      </section>
      {dialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="review-dialog-title" className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-lg bg-white p-6 shadow-xl">
            <h2 id="review-dialog-title" className="text-xl font-bold text-ink">
              {dialog === "advance" ? "Advance applicant" : dialog === "return" ? "Return to general review" : dialog === "not_selected" ? "Mark applicant Not Selected" : "Reopen application"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              {dialog === "not_selected"
                ? "Keep feedback professional, respectful, and job-related. GigMatch validates structure; it does not perform AI moderation."
                : "This participant-visible decision will be recorded in immutable review history."}
            </p>
            {dialog === "not_selected" ? (
              <div className="mt-5 space-y-4">
                <label className="block text-sm font-semibold text-ink">Primary reason
                  <select value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2">
                    {["required_skills_mismatch", "experience_level_mismatch", "proposal_exceeded_budget", "timeline_or_availability_mismatch", "stronger_overall_match", "gig_requirements_changed", "other"].map((value) => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}
                  </select>
                </label>
                {reason === "other" ? <label className="block text-sm font-semibold text-ink">Other reason
                  <textarea value={otherExplanation} onChange={(event) => setOtherExplanation(event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2" />
                </label> : null}
                {detail.stage === "advanced" ? <label className="block text-sm font-semibold text-ink">Meaningful feedback point
                  <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2" />
                </label> : null}
                <label className="block text-sm font-semibold text-ink">Optional respectful note
                  <textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2" />
                </label>
                {detail.stage === "advanced" ? <label className="flex items-start gap-3 text-sm font-semibold text-ink">
                  <input type="checkbox" checked={finalConfirmed} onChange={(event) => setFinalConfirmed(event.target.checked)} className="mt-1" />
                  I confirm this is the final Not Selected decision.
                </label> : null}
              </div>
            ) : null}
            {dialog === "reopen" ? (
              <div className="mt-5 space-y-4">
                <label className="block text-sm font-semibold text-ink">Reopen reason
                  <select value={reopenReason} onChange={(event) => setReopenReason(event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2">
                    {["gig_materially_changed", "failed_engagement_reopened", "client_reconsideration", "freelancer_invited_back", "other"].map((value) => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-ink">Explanation {reopenReason === "other" ? "(required)" : "(optional)"}
                  <textarea value={reopenExplanation} onChange={(event) => setReopenExplanation(event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2" />
                </label>
              </div>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" disabled={working} onClick={() => setDialog(null)}>Cancel</Button>
              <Button
                disabled={
                  working ||
                  (dialog === "not_selected" && !notSelectedDecisionReady({
                    stage: detail.stage,
                    reason,
                    otherExplanation,
                    feedback,
                    finalConfirmed,
                  })) ||
                  (dialog === "reopen" && !reopenDecisionReady(reopenReason, reopenExplanation))
                }
                onClick={() => void submitDialog()}
              >
                {working ? "Saving…" : "Confirm"}
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </PageContainer>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase text-muted">{label}</dt><dd className="mt-1 text-sm text-ink">{value.replace(/_/g, " ")}</dd></div>;
}

function SkillList({ label, value }: { label: string; value: unknown }) {
  const names = Array.isArray(value) ? value.flatMap((item) => isRecord(item) && typeof item.skill_name === "string" ? [item.skill_name] : []) : [];
  return <div className="mt-4"><h3 className="text-sm font-semibold text-ink">{label}</h3><p className="mt-1 text-sm text-muted">{names.length ? names.join(", ") : "None listed"}</p></div>;
}

function VersionTerms({ label, value }: { label: string; value: Record<string, unknown> }) {
  return <div className="rounded-md border border-line bg-slate-50 p-4"><h3 className="font-semibold text-ink">{label} · v{String(value.version_number ?? "")}</h3><pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs text-muted">{JSON.stringify(value.terms ?? {}, null, 2)}</pre></div>;
}
