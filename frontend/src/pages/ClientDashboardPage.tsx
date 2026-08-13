import { Button } from "../components/Button";
import { DashboardAttentionList } from "../components/DashboardAttentionList";
import { DashboardPageShell } from "../components/DashboardPageShell";
import { DashboardSection } from "../components/DashboardSection";
import { DashboardStatePanel } from "../components/DashboardStatePanel";
import { DashboardSummaryCard } from "../components/DashboardSummaryCard";
import { WorkflowStatusBadge } from "../components/WorkflowStatusBadge";
import { fetchClientDashboard } from "../lib/dashboard";
import { dashboardViewState, formatDashboardDate } from "../lib/dashboardView";
import { useDashboardResource } from "../lib/useDashboardResource";

export function ClientDashboardPage() {
  const dashboard = useDashboardResource(fetchClientDashboard);
  const state = dashboardViewState(dashboard.loading, dashboard.error, dashboard.data);

  return (
    <DashboardPageShell
      eyebrow="Client workspace"
      title="Hiring and engagement workflow"
      description="Review current applicant work, explicit response obligations, selection requests, and active engagements without changing workflow state from the dashboard."
      actions={(
        <>
          <Button to="/gigs/new">Create gig</Button>
          <Button to="/gigs/manage" variant="secondary">Manage gigs</Button>
        </>
      )}
    >
      {state === "loading" ? <DashboardStatePanel title="Loading your workflow" body="Building a current view of your gigs and engagements…" busy /> : null}
      {state === "error" ? (
        <DashboardStatePanel title="Dashboard unavailable" body={dashboard.error ?? "Unable to load your workflow dashboard."} retry={dashboard.retry} />
      ) : null}
      {state === "empty" ? (
        <DashboardStatePanel
          title="Create your first gig"
          body="Publish clear terms to begin receiving applications. The dashboard will then consolidate review and engagement workflow."
        />
      ) : null}

      {dashboard.data ? (
        <>
          <DashboardSection title="Summary" description="Complete current totals from authoritative workflow state.">
            <dl className="dashboard-summary-grid is-client">
              <DashboardSummaryCard label="Active owned gigs" value={dashboard.data.summary.active_owned_gigs} />
              <DashboardSummaryCard label="Active applications" value={dashboard.data.summary.active_applications} />
              <DashboardSummaryCard label="Under review" value={dashboard.data.summary.under_review_applications} />
              <DashboardSummaryCard label="Advanced" value={dashboard.data.summary.advanced_applications} />
              <DashboardSummaryCard label="Internal shortlist" value={dashboard.data.summary.shortlisted_applications} detail="Private to your client workflow." />
              <DashboardSummaryCard label="Effective selections" value={dashboard.data.summary.effective_selection_requests} />
              <DashboardSummaryCard label="Active engagements" value={dashboard.data.summary.active_engagements} />
            </dl>
          </DashboardSection>

          <DashboardSection
            title="Requires Your Action"
            description={`${dashboard.data.attention.attention_action_count} explicit responses across ${dashboard.data.attention.attention_resource_count} workflow resources. Ordinary applications are kept in review overview.`}
          >
            <DashboardAttentionList role="client" items={dashboard.data.attention.items} />
          </DashboardSection>

          <DashboardSection
            title="Gig Review Overview"
            description="A bounded review preview, not a replacement for Manage Gigs or the applicant inbox."
            action={<Button to="/gigs/manage" variant="secondary">Manage gigs</Button>}
          >
            {dashboard.data.gig_review_overview.items.length === 0 ? (
              <p className="dashboard-empty-row">No applicant-review activity yet.</p>
            ) : (
              <ul className="dashboard-record-list">
                {dashboard.data.gig_review_overview.items.map((gig, index) => (
                  <li key={gig.gig_id} className="dashboard-record-row">
                    <span className="dashboard-row-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <div className="dashboard-row-content">
                      <div>
                        <div className="dashboard-status-line">
                          <WorkflowStatusBadge status={gig.product_state} tone={gig.operational_state === "paused" ? "attention" : "active"} />
                          {gig.has_effective_selection_request ? <WorkflowStatusBadge status="Selection pending" tone="attention" /> : null}
                        </div>
                        <h3>{gig.gig_title}</h3>
                        <p className="dashboard-row-meta">
                          {gig.under_review_count} Under Review · {gig.advanced_count} Advanced · {gig.internal_shortlist_count} Shortlisted · {gig.client_qa_action_count} Q&amp;A responses
                        </p>
                      </div>
                      <div className="dashboard-row-actions">
                        <Button to={`/gigs/${encodeURIComponent(gig.gig_id)}/applicants`} variant="secondary">Review applicants</Button>
                        <Button to="/gigs/manage" variant="secondary">Manage gig</Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DashboardSection>

          <DashboardSection title="Pending Selection Requests" description="Only currently effective, unexpired requests are shown.">
            {dashboard.data.pending_selection_requests.items.length === 0 ? (
              <p className="dashboard-empty-row">No effective selection requests.</p>
            ) : (
              <ul className="dashboard-record-list">
                {dashboard.data.pending_selection_requests.items.map((selection, index) => (
                  <li key={selection.selection_request_id} className="dashboard-record-row is-attention">
                    <span className="dashboard-row-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <div className="dashboard-row-content">
                      <div>
                        <WorkflowStatusBadge status="Awaiting freelancer response" tone="attention" />
                        <h3>{selection.gig_title}</h3>
                        <p className="dashboard-row-meta">Expires {formatDashboardDate(selection.expires_at)}</p>
                      </div>
                      <Button
                        to={`/gigs/${encodeURIComponent(selection.gig_id)}/applicants/${encodeURIComponent(selection.application_id)}`}
                        variant="secondary"
                      >
                        Open selection context
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
    </DashboardPageShell>
  );
}
