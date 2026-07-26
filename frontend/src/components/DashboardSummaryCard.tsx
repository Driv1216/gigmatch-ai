type DashboardSummaryCardProps = {
  label: string;
  value: number;
  detail?: string;
};

export function DashboardSummaryCard({
  label,
  value,
  detail,
}: DashboardSummaryCardProps) {
  return (
    <div className="rounded-md border border-line bg-slate-50 p-4">
      <dt className="text-sm font-medium text-muted">{label}</dt>
      <dd className="mt-2 text-2xl font-bold tabular-nums text-ink">{value}</dd>
      {detail ? <p className="mt-2 text-xs leading-5 text-muted">{detail}</p> : null}
    </div>
  );
}
