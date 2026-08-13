import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { GigLifecycleDialog, type GigLifecycleAction } from "../components/GigLifecycleDialog";
import { GigVersionReference } from "../components/GigVersionReference";
import { MatchExplanationPanel } from "../components/MatchExplanationPanel";
import { fetchManagedGigs, managementErrorMessage, runGigAction, type ManagedGig } from "../lib/gigManagement";
import { latestMaterialChangedFields, managementActionState, stableManagementErrorMessage } from "../lib/gigManagementView";
import {
  fetchRecommendedFreelancersForGig,
  MatchingApiError,
  type RankingContext,
  type RecommendedFreelancerItem,
} from "../lib/matching";
import { formatScoreValue } from "../lib/matchingExplanations";
import { rankingPresentation } from "../lib/marketplaceView";

type OpenAction = { gig: ManagedGig; action: GigLifecycleAction };

export function ManageGigsPage() {
  const [gigs, setGigs] = useState<ManagedGig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [openAction, setOpenAction] = useState<OpenAction | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedGigId, setSelectedGigId] = useState<string | null>(null);
  const [recommendedFreelancers, setRecommendedFreelancers] = useState<RecommendedFreelancerItem[]>([]);
  const [rankingContext, setRankingContext] = useState<RankingContext | null>(null);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
  const selectedGig = gigs.find((gig) => gig.gig_id === selectedGigId) ?? null;

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);
    fetchManagedGigs()
      .then((nextGigs) => { if (isMounted) setGigs(nextGigs); })
      .catch((error) => { if (isMounted) setErrorMessage(managementErrorMessage(error)); })
      .finally(() => { if (isMounted) setIsLoading(false); });
    return () => { isMounted = false; };
  }, [reloadKey]);

  async function confirmAction(body?: Record<string, unknown>) {
    if (!openAction) return false;
    setIsActing(true);
    setErrorMessage(null);
    setActionMessage(null);
    try {
      await runGigAction(openAction.gig.gig_id, openAction.action, body);
      setActionMessage(actionSuccessMessage(openAction.action));
      setReloadKey((value) => value + 1);
      return true;
    } catch (error) {
      setErrorMessage(managementErrorMessage(error));
      return false;
    } finally {
      setIsActing(false);
    }
  }

  async function loadRecommendedFreelancers(gig: ManagedGig) {
    setSelectedGigId(gig.gig_id);
    setIsLoadingRecommendations(true);
    setRecommendationsError(null);
    setRecommendedFreelancers([]);
    setRankingContext(null);
    try {
      const envelope = await fetchRecommendedFreelancersForGig(gig.gig_id);
      setRecommendedFreelancers(envelope.items);
      setRankingContext(envelope.ranking_context);
    } catch (error) {
      setRecommendationsError(getRecommendationErrorMessage(error));
    } finally {
      setIsLoadingRecommendations(false);
    }
  }

  return (
    <section className="stage-three-page manage-gigs-page" aria-busy={isLoading}>
      <header className="stage-three-editorial-header">
        <div>
          <p>Client operations / Gig authority</p>
          <h1>Manage Gigs</h1>
        </div>
        <div className="stage-three-editorial-context">
          <span>Source → consequence → action</span>
          <p>Each lane reflects the owner DTO. State changes stay local to this route and are offered only when the server authorizes them.</p>
          <Button to="/gigs/new">Create a gig</Button>
        </div>
      </header>

      {isLoading ? <StatePanel title="Loading owned gigs" body="Retrieving authoritative lifecycle, version, and blocker projections…" /> : null}
      {errorMessage ? <Notice tone="error" title="Gig control unavailable" body={errorMessage} /> : null}
      {actionMessage ? <Notice tone="success" title="Authoritative state refreshed" body={actionMessage} /> : null}

      {!isLoading && !errorMessage && gigs.length === 0 ? (
        <div className="stage-three-state-panel">
          <span>Empty owner register</span>
          <h2>No gigs yet</h2>
          <p>Create complete supported terms. The first valid publish attempt creates a reusable draft and then asks the backend to publish it.</p>
          <Button to="/gigs/new">Create the first gig</Button>
        </div>
      ) : null}

      {!isLoading && gigs.length > 0 ? (
        <div className="manage-gig-board" aria-label="Owned gig control lanes">
          <div className="manage-gig-board-heading" aria-hidden="true">
            <span>Lane</span><span>Owned record</span><span>Authoritative state</span><span>Available controls</span>
          </div>
          {gigs.map((gig, index) => (
            <ManagedGigLane
              key={gig.gig_id}
              gig={gig}
              index={index}
              isActing={isActing}
              isLoadingRecommendations={isLoadingRecommendations && selectedGigId === gig.gig_id}
              onAction={(action) => setOpenAction({ gig, action })}
              onRecommendations={() => loadRecommendedFreelancers(gig)}
            />
          ))}
        </div>
      ) : null}

      {!isLoading && !errorMessage && gigs.length > 0 ? (
        <RecommendationRegion
          selectedGig={selectedGig}
          rankingContext={rankingContext}
          freelancers={recommendedFreelancers}
          loading={isLoadingRecommendations}
          error={recommendationsError}
        />
      ) : null}

      {openAction ? (
        <GigLifecycleDialog
          action={openAction.action}
          gigTitle={gigTitle(openAction.gig)}
          activeApplicationCount={openAction.gig.active_application_count}
          isSubmitting={isActing}
          onConfirm={confirmAction}
          onDismiss={() => setOpenAction(null)}
        />
      ) : null}
    </section>
  );
}

function ManagedGigLane({
  gig,
  index,
  isActing,
  isLoadingRecommendations,
  onAction,
  onRecommendations,
}: {
  gig: ManagedGig;
  index: number;
  isActing: boolean;
  isLoadingRecommendations: boolean;
  onAction: (action: GigLifecycleAction) => void;
  onRecommendations: () => void;
}) {
  const actions = managementActionState(gig.allowed_actions, gig.blocking_reason_codes);
  const materialFields = latestMaterialChangedFields(gig.latest_material_change_summary);

  return (
    <article className="manage-gig-lane">
      <span className="manage-gig-index">{String(index + 1).padStart(2, "0")}</span>
      <div className="manage-gig-record">
        <div className="manage-gig-kicker"><span>{formatCode(gig.product_state)}</span><span>{category(gig)}</span></div>
        <h2>{gigTitle(gig)}</h2>
        <p>{description(gig)}</p>
        <div className="manage-gig-skills"><span>Required</span>{skills(gig).map((skill) => <strong key={skill}>{skill}</strong>)}</div>
        <dl className="manage-gig-terms">
          <StateFact label="Commercial terms" value={commercialTerms(gig)} />
          <StateFact label="Application deadline" value={deadline(gig)} />
        </dl>
        <GigVersionReference
          displayVersion={gig.current_display_version_number}
          materialVersion={gig.current_material_version_number}
          contractVersion={gig.terms_contract_version}
          latestChangedFields={materialFields}
        />
      </div>
      <div className="manage-gig-state">
        <dl>
          <StateFact label="Opportunity" value={gig.lifecycle} />
          <StateFact label="Application intake" value={gig.intake} />
          <StateFact label="Operations" value={gig.operations} />
          <StateFact label="Deadline" value={gig.deadline_status} />
          <StateFact label="Effective availability" value={gig.accepting_applications ? "accepting applications" : "not accepting"} />
          <StateFact label="Active applications" value={String(gig.active_application_count)} />
        </dl>
        {gig.blocking_reason_codes.length ? (
          <div className="manage-gig-blockers" role="status">
            <span>Server blockers</span>
            {gig.blocking_reason_codes.map((code) => <p key={code}>{stableManagementErrorMessage(code)}</p>)}
          </div>
        ) : null}
        {gig.engagement_state !== "none" ? (
          <div className="manage-gig-later-state">
            <span>Stage 8 engagement authority</span>
            <p>{gig.engagement_state === "current" ? "A current non-cancelled engagement owns this gig. Lifecycle controls remain in its shared workspace." : "Engagement cancelled · Gig not reopened. The eligible workspace owns one-time failed-engagement Gig Reopening; ordinary intake controls do not."}</p>
            <Button to="/engagements" variant="secondary">Open Engagement Workspace</Button>
          </div>
        ) : null}
      </div>
      <div className="manage-gig-actions">
        <span>Route-local controls</span>
        <div>
          {gig.lifecycle !== "draft" && !gig.upgrade_required ? <Button to={`/gigs/${gig.gig_id}`} variant="secondary">View shared detail</Button> : null}
          {actions.canEdit || actions.canPublish || actions.canUpgrade ? <Button to={`/gigs/${gig.gig_id}/edit`}>{actions.canPublish ? "Complete & publish" : actions.canUpgrade ? "Upgrade terms" : "Edit gig version"}</Button> : null}
          {actions.canCloseIntake ? <Button type="button" variant="secondary" disabled={isActing} onClick={() => onAction("intake/close")}>Close intake</Button> : null}
          {actions.canReopenIntake ? <Button type="button" variant="secondary" disabled={isActing} onClick={() => onAction("intake/reopen")}>Reopen intake</Button> : null}
          {actions.canPause ? <Button type="button" variant="secondary" disabled={isActing} onClick={() => onAction("pause")}>Pause operations</Button> : null}
          {actions.canResume ? <Button type="button" variant="secondary" disabled={isActing} onClick={() => onAction("resume")}>Resume operations</Button> : null}
          {actions.canCancel ? <Button type="button" disabled={isActing} onClick={() => onAction("cancel")}>Cancel gig</Button> : null}
        </div>
        <div className="manage-gig-deferred-actions">
          <span>Later-stage destinations</span>
          <Button to={`/gigs/${gig.gig_id}/applicants`} variant="secondary">Applicant review{gig.active_application_count ? ` (${gig.active_application_count})` : ""}</Button>
          <Button type="button" variant="secondary" onClick={onRecommendations} disabled={isLoadingRecommendations || gig.upgrade_required || gig.lifecycle !== "active"}>{isLoadingRecommendations ? "Loading matches…" : "Freelancer matches"}</Button>
          <Button to={`/gigs/${gig.gig_id}/parse`} variant="secondary">Legacy parser</Button>
        </div>
      </div>
    </article>
  );
}

function RecommendationRegion({ selectedGig, rankingContext, freelancers, loading, error }: {
  selectedGig: ManagedGig | null;
  rankingContext: RankingContext | null;
  freelancers: RecommendedFreelancerItem[];
  loading: boolean;
  error: string | null;
}) {
  const ranking = rankingContext ? rankingPresentation(rankingContext) : null;
  return (
    <section className="manage-gig-deferred-region" aria-labelledby="recommendation-region-title">
      <header><span>Preserved later-stage integration</span><h2 id="recommendation-region-title">Freelancer recommendations</h2><p>This existing matching destination remains functional but is visually contained outside Stage 3 lifecycle controls.</p></header>
      {!selectedGig ? <p className="manage-gig-deferred-empty">Choose “Freelancer matches” in an owned gig lane.</p> : null}
      {selectedGig ? <div className="manage-gig-recommendation-heading"><strong>{gigTitle(selectedGig)}</strong><span>{ranking?.message ?? "Backend-ranked results"}</span></div> : null}
      {loading ? <p className="manage-gig-deferred-empty">Loading backend-ranked freelancers…</p> : null}
      {error ? <Notice tone="error" title="Recommendations unavailable" body={error} /> : null}
      {selectedGig && !loading && !error && freelancers.length === 0 ? <p className="manage-gig-deferred-empty">No eligible recommendation data is available for this gig.</p> : null}
      {freelancers.length ? <div className="manage-gig-recommendations">{freelancers.map((freelancer) => <RecommendedFreelancerCard key={`${freelancer.rank}-${freelancer.freelancer_id}`} freelancer={freelancer} />)}</div> : null}
    </section>
  );
}

function RecommendedFreelancerCard({ freelancer }: { freelancer: RecommendedFreelancerItem }) {
  const ranking = rankingPresentation({ ranking_mode: freelancer.ranking_mode, semantic_status: freelancer.semantic_status, semantic_unavailable_reason: freelancer.semantic_unavailable_reason });
  return (
    <article className="manage-gig-recommendation">
      <div><span>Rank {freelancer.rank}</span><h3>{freelancer.headline ?? "Freelancer profile"}</h3><p>{freelancer.primary_role ?? "Role not specified"}</p></div>
      <dl>
        {ranking.showHybridScore && freelancer.hybrid_score !== null ? <StateFact label="Hybrid" value={formatScore(freelancer.hybrid_score)} /> : null}
        <StateFact label="Keyword" value={formatScore(freelancer.keyword_score)} />
        {ranking.showSemanticScore && freelancer.semantic_score !== null ? <StateFact label="Semantic" value={formatScore(freelancer.semantic_score)} /> : null}
      </dl>
      <MatchExplanationPanel explanation={freelancer.explanation} title="Why this freelancer matched" className="shadow-none" />
    </article>
  );
}

function StateFact({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{formatCode(value)}</dd></div>;
}

function StatePanel({ title, body }: { title: string; body: string }) {
  return <div className="stage-three-state-panel" role="status"><span>Manage gigs</span><h2>{title}</h2><p>{body}</p></div>;
}

function Notice({ tone, title, body }: { tone: "error" | "success"; title: string; body: string }) {
  return <div className={`stage-three-notice is-${tone}`} role={tone === "error" ? "alert" : "status"}><strong>{title}</strong><p>{body}</p></div>;
}

function actionSuccessMessage(action: GigLifecycleAction) {
  return {
    "intake/close": "Application intake is closed; existing applications and operational state were preserved.",
    "intake/reopen": "Application intake is reopened under the current deadline and operational state.",
    pause: "Operations are paused; application-intake state was preserved.",
    resume: "Operations resumed; application-intake state was preserved.",
    cancel: "The gig was cancelled through the terminal lifecycle authority.",
  }[action];
}

function gigTitle(gig: ManagedGig) { return typeof gig.terms.title === "string" && gig.terms.title.trim() ? gig.terms.title : "Untitled gig"; }
function description(gig: ManagedGig) { return typeof gig.terms.description === "string" && gig.terms.description.trim() ? gig.terms.description : "No description available."; }
function category(gig: ManagedGig) { const scope = gig.terms.scope; return scope && typeof scope === "object" && !Array.isArray(scope) && typeof (scope as Record<string, unknown>).tech_category === "string" ? String((scope as Record<string, unknown>).tech_category) : "Uncategorised"; }
function skills(gig: ManagedGig) { return Array.isArray(gig.terms.required_skills) ? gig.terms.required_skills.filter((value): value is string => typeof value === "string") : []; }
function deadline(gig: ManagedGig) { const value = gig.terms.application_deadline; return typeof value === "string" ? new Date(value).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Not supplied"; }
function commercialTerms(gig: ManagedGig) {
  const payment = gig.terms.client_payment;
  if (!payment || typeof payment !== "object" || Array.isArray(payment)) return "Not supplied";
  const record = payment as Record<string, unknown>;
  const budget = record.budget;
  const currency = typeof gig.terms.currency === "string" ? gig.terms.currency : "";
  if (budget && typeof budget === "object" && !Array.isArray(budget)) {
    const range = budget as Record<string, unknown>;
    return `${currency} ${String(range.minimum ?? "—")}–${String(range.maximum ?? "—")} fixed price`.trim();
  }
  return `${currency} ${String(gig.terms.payment_structure ?? "structured terms")}`.trim();
}
function formatCode(value: string) { return value.replace(/_/g, " "); }
function formatScore(score: number) { return formatScoreValue(score) ?? "Unavailable"; }

function getRecommendationErrorMessage(error: unknown) {
  if (error instanceof MatchingApiError) {
    if (error.status === 401) return "Sign in again to load freelancer recommendations.";
    if (error.status === 403) return "Freelancer recommendations are available only for owned client gigs.";
    if (error.status === 404) return "This gig was not found.";
    if (error.status === 503) return "The matching service is not available right now.";
    return error.message;
  }
  return error instanceof Error ? error.message : "We could not load freelancer recommendations right now.";
}
