import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EvaluationLimitationsPanel } from "../components/admin/evaluation/EvaluationLimitationsPanel";
import { EvaluationSummaryCards } from "../components/admin/evaluation/EvaluationSummaryCards";
import { MetricResultsPanel } from "../components/admin/evaluation/MetricResultsPanel";
import { QueryComparisonSection } from "../components/admin/evaluation/QueryComparisonSection";
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

    return "Could not load the seeded evaluation summary. Try again.";
  }

  return "Could not load the seeded evaluation summary. Try again.";
}

export function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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

  async function handleLogout() {
    await logout();
    navigate("/login");
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
    <div className="switchboard-admin-shell">
      <a className="switchboard-admin-skip" href="#admin-evaluation-main">Skip to evaluation evidence</a>
      <header className="switchboard-admin-topbar">
        <Link to="/dashboard/admin" className="switchboard-admin-brand" aria-label="GigMatch evaluation workbench">
          <span aria-hidden="true">GM</span>
          <strong>GigMatch</strong>
          <small>Evaluation workbench</small>
        </Link>
        <div className="switchboard-admin-context">
          <span>Internal read surface</span>
          <strong>Seeded matching evaluation</strong>
        </div>
        <div className="switchboard-admin-authority">
          <span>Trusted role</span>
          <strong>Admin authority</strong>
          <button type="button" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main id="admin-evaluation-main" className="switchboard-admin-main">
        <section className="switchboard-admin-hero" aria-labelledby="admin-evaluation-title">
          <div>
            <p className="switchboard-admin-eyebrow">EVALUATION / SEEDED FIXTURES</p>
            <h1 id="admin-evaluation-title">Ranking evidence,<br />with its limits attached.</h1>
            <p>
              This internal workbench renders the sanitized summary returned by the matching evaluation API.
              It uses small seeded local/demo fixtures—not production traffic, customer outcomes, or a production-scale benchmark.
            </p>
          </div>
          <aside className="switchboard-admin-receipt" aria-label="Evaluation authority">
            <span>READ-ONLY AUTHORITY</span>
            <h2>Backend evidence only</h2>
            <dl>
              <div><dt>Source</dt><dd>GET /evaluation/matching</dd></div>
              <div><dt>Scope</dt><dd>Seeded local/demo fixtures</dd></div>
              <div><dt>Frontend</dt><dd>Format and preserve</dd></div>
            </dl>
            <button type="button" onClick={loadEvaluationSummary} disabled={isLoading}>
              <span>{isLoading ? "Loading evaluation" : "Refresh evidence"}</span>
              <b aria-hidden="true">↻</b>
            </button>
          </aside>
        </section>

        <div className="switchboard-admin-workspace">
          {isLoading ? (
            <section className="switchboard-admin-state" aria-live="polite">
              <span>REQUEST / IN FLIGHT</span>
              <h2>Loading evaluation summary</h2>
              <p>The workbench is waiting for the authenticated backend response.</p>
            </section>
          ) : null}

          {errorMessage ? (
            <section className="switchboard-admin-state is-error" role="alert">
              <span>REQUEST / CONTROLLED FAILURE</span>
              <h2>Evaluation data unavailable</h2>
              <p>{errorMessage}</p>
              <button type="button" onClick={loadEvaluationSummary}>Try again</button>
            </section>
          ) : null}

          {!isLoading && !errorMessage && !summary ? (
            <section className="switchboard-admin-state">
              <span>RESPONSE / EMPTY</span>
              <h2>No evaluation results available yet</h2>
              <p>The admin evaluation endpoint returned no summary payload.</p>
            </section>
          ) : null}

          {!isLoading && !errorMessage && summary ? (
            <>
              <EvaluationSummaryCards summary={summary} />
              <MetricResultsPanel summary={summary} />
              <QueryComparisonSection summary={summary} />
              <EvaluationLimitationsPanel limitations={summary.limitations} />
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
