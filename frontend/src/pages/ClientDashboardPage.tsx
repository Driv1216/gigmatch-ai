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
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              <p className="text-sm text-muted">No applicant-review activity yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {dashboard.data.gig_review_overview.items.map((gig) => (
                  <li key={gig.gig_id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <WorkflowStatusBadge status={gig.product_state} tone={gig.operational_state === "paused" ? "attention" : "active"} />
                          {gig.has_effective_selection_request ? <WorkflowStatusBadge status="Selection pending" tone="attention" /> : null}
                        </div>
                        <h3 className="mt-2 font-semibold text-ink">{gig.gig_title}</h3>
                        <p className="mt-1 text-xs text-muted">
                          {gig.under_review_count} Under Review · {gig.advanced_count} Advanced · {gig.internal_shortlist_count} Shortlisted · {gig.client_qa_action_count} Q&amp;A responses
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
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
              <p className="text-sm text-muted">No effective selection requests.</p>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {dashboard.data.pending_selection_requests.items.map((selection) => (
                  <li key={selection.selection_request_id} className="rounded-md border border-line p-4">
                    <WorkflowStatusBadge status="Awaiting freelancer response" tone="attention" />
                    <h3 className="mt-3 font-semibold text-ink">{selection.gig_title}</h3>
                    <p className="mt-1 text-xs text-muted">Expires {formatDashboardDate(selection.expires_at)}</p>
                    <Button
                      className="mt-4 w-full"
                      to={`/gigs/${encodeURIComponent(selection.gig_id)}/applicants/${encodeURIComponent(selection.application_id)}`}
                      variant="secondary"
                    >
                      Open selection context
                    </Button>
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
    </DashboardPageShell>
  );
}
