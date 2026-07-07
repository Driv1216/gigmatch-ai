import { useEffect, useState } from "react";
import { EvaluationLimitationsPanel } from "../components/admin/evaluation/EvaluationLimitationsPanel";
import { EvaluationSummaryCards } from "../components/admin/evaluation/EvaluationSummaryCards";
import { MetricResultsPanel } from "../components/admin/evaluation/MetricResultsPanel";
import { QueryComparisonSection } from "../components/admin/evaluation/QueryComparisonSection";
import { Button } from "../components/Button";
import { PageContainer } from "../components/PageContainer";
import { useAuth } from "../context/AuthContext";
import { EvaluationApiError, fetchEvaluationSummary } from "../lib/evaluation";
import type { EvaluationSummary } from "../lib/evaluationTypes";

function getEvaluationErrorMessage(error: unknown) {
  if (error instanceof EvaluationApiError) {
    if (error.status === 401) {
      return "Sign in again to load admin evaluation results.";
    }

    if (error.status === 403) {
      return "Admin-only evaluation results are unavailable for this account.";
    }

    if (error.status === 503) {
      return "The evaluation service is not available right now.";
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Could not load evaluation summary. Try again.";
}

export function AdminDashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<EvaluationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadEvaluationSummary() {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextSummary = await fetchEvaluationSummary();
      setSummary(nextSummary);
    } catch (error) {
      setSummary(null);
      setErrorMessage(getEvaluationErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialSummary() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextSummary = await fetchEvaluationSummary();

        if (isMounted) {
          setSummary(nextSummary);
        }
      } catch (error) {
        if (isMounted) {
          setSummary(null);
          setErrorMessage(getEvaluationErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialSummary();

    return () => {
      isMounted = false;
    };
  }, [user]);

  return (
    <PageContainer className="space-y-8">
      <div className="rounded-lg border border-line bg-white p-8 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">Admin Evaluation Console</p>
            <h1 className="mt-3 text-3xl font-bold tracking-normal text-ink">Seeded matching evaluation results</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
              Backend-provided evaluation summary from the seeded matching fixtures and evaluation runner. These
              results are for internal evaluation visibility and are not production-scale performance claims.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={loadEvaluationSummary} disabled={isLoading}>
            {isLoading ? "Loading" : "Refresh"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-line bg-white p-6 shadow-soft">
          <p className="text-sm font-medium text-muted">Loading evaluation summary...</p>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-lg font-bold tracking-normal text-amber-950">Evaluation data unavailable</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-800">{errorMessage}</p>
          <div className="mt-5">
            <Button type="button" variant="secondary" onClick={loadEvaluationSummary}>
              Try Again
            </Button>
          </div>
        </div>
      ) : null}

      {!isLoading && !errorMessage && !summary ? (
        <div className="rounded-lg border border-dashed border-line bg-white p-6 shadow-soft">
          <h2 className="text-lg font-bold tracking-normal text-ink">No evaluation results available yet</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            The admin evaluation endpoint returned no summary payload.
          </p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && summary ? (
        <>
          <EvaluationSummaryCards summary={summary} />
          <MetricResultsPanel summary={summary} />
          <QueryComparisonSection summary={summary} />
          <EvaluationLimitationsPanel
            limitations={[
              ...summary.limitations,
              "This console renders backend-provided seeded evaluation data only.",
              "The frontend does not calculate metrics or make improvement claims.",
            ]}
          />
        </>
      ) : null}
    </PageContainer>
  );
}
