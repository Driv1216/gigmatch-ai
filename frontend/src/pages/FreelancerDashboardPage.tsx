import { Button } from "../components/Button";
import { DashboardAttentionList } from "../components/DashboardAttentionList";
import { DashboardPageShell } from "../components/DashboardPageShell";
import { DashboardSection } from "../components/DashboardSection";
import { DashboardStatePanel } from "../components/DashboardStatePanel";
import { DashboardSummaryCard } from "../components/DashboardSummaryCard";
import { MatchExplanationPanel } from "../components/MatchExplanationPanel";
import { WorkflowStatusBadge } from "../components/WorkflowStatusBadge";
import { fetchFreelancerDashboard } from "../lib/dashboard";
import { dashboardViewState, formatDashboardDate } from "../lib/dashboardView";
import { fetchRecommendedGigs } from "../lib/matching";
import { formatScoreValue } from "../lib/matchingExplanations";
import { rankingPresentation } from "../lib/marketplaceView";
import { useDashboardResource } from "../lib/useDashboardResource";

export function FreelancerDashboardPage() {
  const dashboard = useDashboardResource(fetchFreelancerDashboard);
  const recommendations = useDashboardResource(fetchRecommendedGigs);
  const state = dashboardViewState(dashboard.loading, dashboard.error, dashboard.data);

  return (
    <DashboardPageShell
      eyebrow="Freelancer workspace"
      title="Your marketplace workflow"
      description="Track responses, applications, active engagements, and independent matching recommendations from one current view."
      actions={(
        <>
          <Button to="/gigs">Find gigs</Button>
          <Button to="/applications" variant="secondary">View all applications</Button>
        </>
      )}
    >
      {state === "loading" ? (
        <DashboardStatePanel title="Loading your workflow" body="Building a current view of your applications and engagements…" busy />
      ) : null}
      {state === "error" ? (
        <DashboardStatePanel
          title="Dashboard unavailable"
          body={dashboard.error ?? "Unable to load your workflow dashboard."}
          retry={dashboard.retry}
        />
      ) : null}
      {state === "empty" ? (
        <DashboardStatePanel
          title="Start with an application-ready gig"
          body="You do not have marketplace workflow activity yet. Browse open gigs to review terms and submit your first application."
        />
      ) : null}

      {dashboard.data ? (
        <>
          <DashboardSection title="Summary" description="Complete current totals; preview limits do not affect these counts.">
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DashboardSummaryCard label="All applications" value={dashboard.data.summary.total_applications} />
              <DashboardSummaryCard label="Under review" value={dashboard.data.summary.under_review_applications} />
              <DashboardSummaryCard label="Advanced" value={dashboard.data.summary.advanced_applications} />
              <DashboardSummaryCard label="Applications requiring response" value={dashboard.data.summary.response_required_applications} />
              <DashboardSummaryCard label="Effective selection requests" value={dashboard.data.summary.effective_selection_requests} />
              <DashboardSummaryCard label="Active engagements" value={dashboard.data.summary.active_engagements} />
            </dl>
          </DashboardSection>

          <DashboardSection
            title="Needs Your Attention"
            description={`${dashboard.data.attention.attention_action_count} current response actions across ${dashboard.data.attention.attention_resource_count} workflow resources.`}
          >
            <DashboardAttentionList role="freelancer" items={dashboard.data.attention.items} />
          </DashboardSection>

          <DashboardSection
            title="Recent Applications"
            description="A bounded current preview. Open an application to reload full authority before responding."
            action={<Button to="/applications" variant="secondary">View all applications</Button>}
          >
            {dashboard.data.recent_applications.items.length === 0 ? (
              <p className="text-sm text-muted">No applications yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {dashboard.data.recent_applications.items.map((application) => (
                  <li key={application.application_id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <WorkflowStatusBadge status={application.stage} />
                          {application.updated_gig_response_required ? <WorkflowStatusBadge status="Updated terms response required" tone="attention" /> : null}
                          {application.has_effective_selection_request ? <WorkflowStatusBadge status="Selection response available" tone="attention" /> : null}
                        </div>
                        <h3 className="mt-2 font-semibold text-ink">{application.gig_title}</h3>
                        <p className="mt-1 text-xs text-muted">
                          Version {application.application_version_number} · {application.qa_action_count} Q&amp;A responses · Updated {formatDashboardDate(application.last_updated_at)}
                        </p>
                      </div>
                      <Button to={`/applications/${encodeURIComponent(application.application_id)}`} variant="secondary">
                        Open application
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DashboardSection>

          <DashboardSection
            title="Active Engagements"
            description="Current participant-reported lifecycle state."
            action={<Button to="/engagements" variant="secondary">View all engagements</Button>}
          >
            {dashboard.data.active_engagements.items.length === 0 ? (
              <p className="text-sm text-muted">No active engagements.</p>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {dashboard.data.active_engagements.items.map((engagement) => (
                  <li key={engagement.engagement_id} className="rounded-md border border-line p-4">
                    <WorkflowStatusBadge status={engagement.status} tone={engagement.response_required ? "attention" : "active"} />
                    <h3 className="mt-3 font-semibold text-ink">{engagement.gig_title}</h3>
                    <p className="mt-1 text-xs text-muted">Activity {formatDashboardDate(engagement.latest_activity_at)}</p>
                    <Button className="mt-4 w-full" to={`/engagements/${encodeURIComponent(engagement.engagement_id)}`} variant="secondary">
                      Open workspace
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </DashboardSection>
        </>
      ) : null}

      <DashboardSection
        title="Recommended Gigs"
        description="This independent section uses the existing matching service. Its availability does not affect your workflow dashboard."
        action={<Button to="/gigs" variant="secondary">Browse all gigs</Button>}
      >
        {recommendations.loading ? <p className="text-sm text-muted" aria-live="polite">Loading recommendations…</p> : null}
        {recommendations.error ? (
          <DashboardStatePanel title="Recommendations unavailable" body={recommendations.error} retry={recommendations.retry} />
        ) : null}
        {!recommendations.loading && !recommendations.error && recommendations.data?.items.length === 0 ? (
          <p className="rounded-md border border-dashed border-line bg-slate-50 p-5 text-sm text-muted">
            No eligible recommendations are available right now.
          </p>
        ) : null}
        {!recommendations.loading && !recommendations.error && recommendations.data?.items.length ? (
          <ul className="space-y-4">
            {recommendations.data.items.map((gig) => {
              const ranking = rankingPresentation(gig);
              return (
                <li key={gig.gig_id} className="rounded-md border border-line p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <WorkflowStatusBadge status={`${ranking.label} · Rank ${gig.rank}`} />
                      <h3 className="mt-2 font-semibold text-ink">{gig.title ?? "Untitled gig"}</h3>
                      {gig.category ? <p className="mt-1 text-xs text-muted">{gig.category}</p> : null}
                    </div>
                    <dl className="flex flex-wrap gap-2 text-xs">
                      {ranking.showHybridScore && gig.hybrid_score !== null ? <Score label="Hybrid" value={gig.hybrid_score} /> : null}
                      <Score label="Keyword" value={gig.keyword_score} />
                      {ranking.showSemanticScore && gig.semantic_score !== null ? <Score label="Semantic" value={gig.semantic_score} /> : null}
                    </dl>
                  </div>
                  <MatchExplanationPanel explanation={gig.explanation} className="mt-4 shadow-none" />
                  <Button className="mt-4" to={`/gigs/${encodeURIComponent(gig.gig_id)}`} variant="secondary">View gig details</Button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </DashboardSection>
    </DashboardPageShell>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-line bg-slate-50 px-3 py-2">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold tabular-nums text-ink">{formatScoreValue(value) ?? "Unavailable"}</dd>
    </div>
  );
}
