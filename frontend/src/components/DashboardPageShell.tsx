import type { ReactNode } from "react";
type DashboardPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions: ReactNode;
  children: ReactNode;
};

export function DashboardPageShell({
  eyebrow,
  title,
  description,
  actions,
  children,
}: DashboardPageShellProps) {
  return (
    <section className="dashboard-page">
      <header className="dashboard-editorial-header">
        <div className="dashboard-editorial-copy">
          <p>{eyebrow}</p>
          <h1>{title}</h1>
        </div>
        <div className="dashboard-editorial-context">
          <span>Current read model</span>
          <p>{description}</p>
          <div className="dashboard-page-actions">{actions}</div>
        </div>
      </header>
      <div className="dashboard-lanes">{children}</div>
    </section>
  );
}
