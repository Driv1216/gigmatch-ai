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
      <p className="rounded-md border border-dashed border-line bg-slate-50 p-5 text-sm leading-6 text-muted">
        No workflow response is currently assigned to you.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-line" aria-label="Workflow responses">
      {items.map((item) => (
        <li key={`${item.action_kind}-${item.resource_id}`} className="py-4 first:pt-0 last:pb-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <WorkflowStatusBadge status={attentionLabel(item.action_kind)} tone="attention" />
              <h3 className="mt-2 truncate text-base font-semibold text-ink">{item.gig_title}</h3>
              <p className="mt-1 text-xs text-muted">
                {item.deadline_at
                  ? `Respond by ${formatDashboardDate(item.deadline_at)}`
                  : `Activity ${formatDashboardDate(item.latest_activity_at)}`}
              </p>
            </div>
            <Link
              to={attentionDestination(role, item)}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              aria-label={`${attentionLabel(item.action_kind)} for ${item.gig_title}`}
            >
              Open workflow
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
