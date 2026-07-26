import { formatWorkflowStatus } from "../lib/dashboardView";

type WorkflowStatusBadgeProps = {
  status: string;
  tone?: "neutral" | "attention" | "active";
};

export function WorkflowStatusBadge({
  status,
  tone = "neutral",
}: WorkflowStatusBadgeProps) {
  const tones = {
    neutral: "border-line bg-slate-50 text-muted",
    attention: "border-amber-200 bg-amber-50 text-amber-800",
    active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
      {formatWorkflowStatus(status)}
    </span>
  );
}
