import { formatCountDetail, formatMetricName, formatMetricValue, formatStrategyLabel } from "../../../lib/evaluationDisplay";
import type { EvaluationSummary, EvaluationStrategy, MetricResult } from "../../../lib/evaluationTypes";
import { EVALUATION_STRATEGIES } from "../../../lib/evaluationTypes";

type MetricResultsPanelProps = {
  summary: EvaluationSummary;
};

export function MetricResultsPanel({ summary }: MetricResultsPanelProps) {
  return (
    <section aria-labelledby="metric-results-title" className="admin-evaluation-section admin-metric-results">
      <header className="admin-evaluation-section-header">
        <span>02 / METRICS</span>
        <div>
          <h2 id="metric-results-title">Backend-provided aggregate results</h2>
          <p>Values are formatted, not recalculated. Unavailable metrics keep their backend reason and never become zero.</p>
        </div>
      </header>

      <div className="admin-strategy-metric-stack">
        {EVALUATION_STRATEGIES.map((strategy) => (
          <StrategyMetricTable
            key={strategy}
            strategy={strategy}
            metrics={summary.aggregate_results[strategy] ?? []}
          />
        ))}
      </div>
    </section>
  );
}

function StrategyMetricTable({ strategy, metrics }: { strategy: EvaluationStrategy; metrics: MetricResult[] }) {
  return (
    <article className="admin-strategy-metric-board">
      <header>
        <span>{strategy.toUpperCase()} / AGGREGATE</span>
        <h3>{formatStrategyLabel(strategy)} ranking</h3>
      </header>
      {metrics.length === 0 ? (
        <p className="admin-evaluation-empty">
          No backend metric results were returned for this strategy.
        </p>
      ) : (
        <div className="admin-evaluation-table-wrap">
          <table className="admin-evaluation-table">
            <caption>Aggregate metrics for {formatStrategyLabel(strategy)} ranking</caption>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
                <th>Availability</th>
                <th>Included</th>
                <th>Excluded</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr key={`${strategy}-${metric.metric_name}-${metric.k ?? "all"}`}>
                  <th scope="row">{formatMetricName(metric)}</th>
                  <td className="is-number">{metric.is_available ? formatMetricValue(metric.value) : "Unavailable"}</td>
                  <td>
                    <span className={`admin-metric-status ${metric.is_available ? "is-available" : "is-unavailable"}`}>
                      {metric.is_available ? "Available" : "Unavailable"}
                    </span>
                  </td>
                  <td className="is-number">{formatCountDetail(metric.details?.included_query_count)}</td>
                  <td className="is-number">{formatCountDetail(metric.details?.excluded_query_count)}</td>
                  <td className="is-reason">{metric.reason ?? "No limitation reported"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
