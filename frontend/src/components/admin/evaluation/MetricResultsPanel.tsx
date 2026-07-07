import { formatCountDetail, formatMetricName, formatMetricValue, formatStrategyLabel } from "../../../lib/evaluationDisplay";
import type { EvaluationSummary, EvaluationStrategy, MetricResult } from "../../../lib/evaluationTypes";
import { EVALUATION_STRATEGIES } from "../../../lib/evaluationTypes";

type MetricResultsPanelProps = {
  summary: EvaluationSummary;
};

export function MetricResultsPanel({ summary }: MetricResultsPanelProps) {
  return (
    <section aria-labelledby="metric-results-title" className="rounded-lg border border-line bg-white p-6 shadow-soft">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Strategy metrics</p>
        <h2 id="metric-results-title" className="mt-2 text-2xl font-bold tracking-normal text-ink">
          Backend-provided aggregate metric results
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          Values are returned by the evaluation API. Unavailable metrics are shown with backend-provided reasons.
        </p>
      </div>

      <div className="mt-6 space-y-6">
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
    <div>
      <h3 className="text-base font-bold tracking-normal text-ink">{formatStrategyLabel(strategy)} ranking</h3>
      {metrics.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-line bg-slate-50 px-4 py-3 text-sm text-muted">
          No backend metric results were returned for this strategy.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-line">
          <table className="min-w-full divide-y divide-line text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Metric</th>
                <th className="px-4 py-3 font-semibold">Value</th>
                <th className="px-4 py-3 font-semibold">Availability</th>
                <th className="px-4 py-3 font-semibold">Included</th>
                <th className="px-4 py-3 font-semibold">Excluded</th>
                <th className="px-4 py-3 font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {metrics.map((metric) => (
                <tr key={`${strategy}-${metric.metric_name}-${metric.k ?? "all"}`}>
                  <td className="px-4 py-3 font-medium text-ink">{formatMetricName(metric)}</td>
                  <td className="px-4 py-3 tabular-nums text-ink">{formatMetricValue(metric.value)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        metric.is_available
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      {metric.is_available ? "Available" : "Unavailable"}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted">
                    {formatCountDetail(metric.details?.included_query_count)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted">
                    {formatCountDetail(metric.details?.excluded_query_count)}
                  </td>
                  <td className="max-w-md px-4 py-3 text-muted">{metric.reason ?? "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
