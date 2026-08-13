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
    <div className="dashboard-summary-cell">
      <dt>{label}</dt>
      <dd>{value}</dd>
      {detail ? <p>{detail}</p> : null}
    </div>
  );
}
