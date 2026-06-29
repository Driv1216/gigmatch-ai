import { Button } from "../components/Button";
import { PageContainer } from "../components/PageContainer";

export function LandingPage() {
  return (
    <PageContainer className="flex min-h-[calc(100vh-4rem)] items-center">
      <div className="max-w-3xl">
        <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-accent">Developer SaaS Prototype</p>
        <h1 className="text-5xl font-bold tracking-normal text-ink sm:text-6xl">GigMatch AI</h1>
        <p className="mt-6 max-w-2xl text-xl leading-8 text-muted">
          AI-powered tech gig discovery and matching platform.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button to="/login">Login</Button>
          <Button to="/signup" variant="secondary">
            Signup
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
