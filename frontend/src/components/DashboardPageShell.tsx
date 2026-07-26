import type { ReactNode } from "react";
import { PageContainer } from "./PageContainer";

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
    <PageContainer className="space-y-6">
      <header className="rounded-lg border border-line bg-white p-6 shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">{eyebrow}</p>
        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-normal text-ink">{title}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted">{description}</p>
          </div>
          <div className="flex flex-wrap gap-3">{actions}</div>
        </div>
      </header>
      {children}
    </PageContainer>
  );
}
