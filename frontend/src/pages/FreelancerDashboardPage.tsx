import { Button } from "../components/Button";
import { PageContainer } from "../components/PageContainer";

export function FreelancerDashboardPage() {
  return (
    <PageContainer>
      <div className="rounded-lg border border-line bg-white p-8 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Freelancer</p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal text-ink">Dashboard Placeholder</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
          This area is reserved for future resume, skills, and matched gig workflows.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button to="/profile/freelancer">Complete / Edit Smart Profile</Button>
          <Button to="/profile/resume-parse" variant="secondary">
            Resume Parser
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
