import { Button } from "../components/Button";
import { DashboardAttentionList } from "../components/DashboardAttentionList";
import { DashboardPageShell } from "../components/DashboardPageShell";
import { DashboardSection } from "../components/DashboardSection";
import { DashboardStatePanel } from "../components/DashboardStatePanel";
import { DashboardSummaryCard } from "../components/DashboardSummaryCard";
import { MatchExplanationPanel } from "../components/MatchExplanationPanel";
import { WorkflowStatusBadge } from "../components/WorkflowStatusBadge";
import { fetchFreelancerDashboard } from "../lib/dashboard";
import { dashboardHeaderContext, dashboardViewState, formatDashboardDate } from "../lib/dashboardView";
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
      headerContext={dashboardHeaderContext("freelancer", state, dashboard.data)}
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
            <dl className="dashboard-summary-grid">
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
              <p className="dashboard-empty-row">No applications yet.</p>
            ) : (
              <ul className="dashboard-record-list">
                {dashboard.data.recent_applications.items.map((application, index) => (
                  <li key={application.application_id} className="dashboard-record-row">
                    <span className="dashboard-row-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <div className="dashboard-row-content">
                      <div>
                        <div className="dashboard-status-line">
                          <WorkflowStatusBadge status={application.stage} />
                          {application.updated_gig_response_required ? <WorkflowStatusBadge status="Updated terms response required" tone="attention" /> : null}
                          {application.has_effective_selection_request ? <WorkflowStatusBadge status="Selection response available" tone="attention" /> : null}
                        </div>
                        <h3>{application.gig_title}</h3>
                        <p className="dashboard-row-meta">
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
              <p className="dashboard-empty-row">No active engagements.</p>
            ) : (
              <ul className="dashboard-record-list">
                {dashboard.data.active_engagements.items.map((engagement, index) => (
                  <li key={engagement.engagement_id} className="dashboard-record-row">
                    <span className="dashboard-row-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <div className="dashboard-row-content">
                      <div>
                        <WorkflowStatusBadge status={engagement.status} tone={engagement.response_required ? "attention" : "active"} />
                        <h3>{engagement.gig_title}</h3>
                        <p className="dashboard-row-meta">Activity {formatDashboardDate(engagement.latest_activity_at)}</p>
                      </div>
                      <Button to={`/engagements/${encodeURIComponent(engagement.engagement_id)}`} variant="secondary">
                        Open workspace
                      </Button>
                    </div>
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
        {recommendations.loading ? <p className="dashboard-loading-row" aria-live="polite">Loading recommendations…</p> : null}
        {recommendations.error ? (
          <DashboardStatePanel title="Recommendations unavailable" body={recommendations.error} retry={recommendations.retry} />
        ) : null}
        {!recommendations.loading && !recommendations.error && recommendations.data?.items.length === 0 ? (
          <p className="dashboard-empty-row">
            No eligible recommendations are available right now.
          </p>
        ) : null}
        {!recommendations.loading && !recommendations.error && recommendations.data?.items.length ? (
          <ul className="dashboard-record-list dashboard-recommendations">
            {recommendations.data.items.map((gig, index) => {
              const ranking = rankingPresentation(gig);
              return (
                <li key={gig.gig_id} className="dashboard-record-row is-recommendation">
                  <span className="dashboard-row-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <div className="dashboard-recommendation-content">
                    <div className="dashboard-row-content">
                      <div>
                        <WorkflowStatusBadge status={`${ranking.label} · Rank ${gig.rank}`} />
                        <h3>{gig.title ?? "Untitled gig"}</h3>
                        {gig.category ? <p className="dashboard-row-meta">{gig.category}</p> : null}
                      </div>
                      <dl className="dashboard-score-list">
                        {ranking.showHybridScore && gig.hybrid_score !== null ? <Score label="Hybrid" value={gig.hybrid_score} /> : null}
                        <Score label="Keyword" value={gig.keyword_score} />
                        {ranking.showSemanticScore && gig.semantic_score !== null ? <Score label="Semantic" value={gig.semantic_score} /> : null}
                      </dl>
                    </div>
                    <MatchExplanationPanel explanation={gig.explanation} className="dashboard-match-explanation shadow-none" />
                    <Button to={`/gigs/${encodeURIComponent(gig.gig_id)}`} variant="secondary">View gig details</Button>
                  </div>
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
    <div className="dashboard-score">
      <dt>{label}</dt>
      <dd>{formatScoreValue(value) ?? "Unavailable"}</dd>
    </div>
  );
}
