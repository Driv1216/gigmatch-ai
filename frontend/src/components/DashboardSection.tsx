import type { ReactNode } from "react";

type DashboardSectionProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function DashboardSection({
  title,
  description,
  action,
  children,
}: DashboardSectionProps) {
  return (
    <section className="dashboard-lane">
      <header className="dashboard-lane-header">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {action ? <div className="dashboard-lane-action">{action}</div> : null}
      </header>
      <div className="dashboard-lane-body">{children}</div>
    </section>
  );
}
