import { formatWorkflowStatus } from "../lib/dashboardView";

type WorkflowStatusBadgeProps = {
  status: string;
  tone?: "neutral" | "attention" | "active";
};

export function WorkflowStatusBadge({
  status,
  tone = "neutral",
}: WorkflowStatusBadgeProps) {
  return (
    <span className={`workflow-status is-${tone}`}>
      {formatWorkflowStatus(status)}
    </span>
  );
}
