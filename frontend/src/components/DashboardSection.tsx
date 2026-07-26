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
    <section className="rounded-lg border border-line bg-white p-5 shadow-soft sm:p-6">
      <header className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink">{title}</h2>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{description}</p> : null}
        </div>
        {action}
      </header>
      <div className="mt-5">{children}</div>
    </section>
  );
}
