import { Button } from "../components/Button";
import { PageContainer } from "../components/PageContainer";

export function ClientDashboardPage() {
  return (
    <PageContainer>
      <div className="rounded-lg border border-line bg-white p-8 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Client</p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal text-ink">Dashboard Placeholder</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
          This area is reserved for future tech gig posting, gig parsing, and candidate discovery workflows.
        </p>
        <div className="mt-8">
          <Button to="/profile/client">Complete / Edit Client Profile</Button>
        </div>
      </div>
    </PageContainer>
  );
}
