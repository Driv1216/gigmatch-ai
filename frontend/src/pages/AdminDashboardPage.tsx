import { PageContainer } from "../components/PageContainer";

export function AdminDashboardPage() {
  return (
    <PageContainer>
      <div className="rounded-lg border border-line bg-white p-8 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Admin</p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal text-ink">Dashboard Placeholder</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
          This area is reserved for future evaluation, monitoring, and project administration workflows.
        </p>
      </div>
    </PageContainer>
  );
}
