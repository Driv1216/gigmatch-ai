import { Link } from "react-router-dom";
import type { AttentionItem } from "../lib/dashboardContracts";
import {
  attentionDestination,
  attentionLabel,
  formatDashboardDate,
  type DashboardRole,
} from "../lib/dashboardView";
import { WorkflowStatusBadge } from "./WorkflowStatusBadge";

type DashboardAttentionListProps = {
  role: DashboardRole;
  items: AttentionItem[];
};

export function DashboardAttentionList({
  role,
  items,
}: DashboardAttentionListProps) {
  if (items.length === 0) {
    return (
      <p className="dashboard-empty-row">
        No workflow response is currently assigned to you.
      </p>
    );
  }
  return (
    <ul className="dashboard-record-list" aria-label="Workflow responses">
      {items.map((item, index) => (
        <li key={`${item.action_kind}-${item.resource_id}`} className="dashboard-record-row is-attention">
          <span className="dashboard-row-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <div className="dashboard-row-content">
            <div>
              <WorkflowStatusBadge status={attentionLabel(item.action_kind)} tone="attention" />
              <h3>{item.gig_title}</h3>
              <p className="dashboard-row-meta">
                {item.deadline_at
                  ? `Respond by ${formatDashboardDate(item.deadline_at)}`
                  : `Activity ${formatDashboardDate(item.latest_activity_at)}`}
              </p>
            </div>
            <Link
              to={attentionDestination(role, item)}
              className="dashboard-row-link"
              aria-label={`${attentionLabel(item.action_kind)} for ${item.gig_title}`}
            >
              Open workflow <span aria-hidden="true">→</span>
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
