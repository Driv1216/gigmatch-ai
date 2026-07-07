import { formatMetricName, formatMetricValue, formatStrategyLabel } from "../../../lib/evaluationDisplay";
import type { EvaluationStrategy, QueryEvaluationComparison } from "../../../lib/evaluationTypes";
import { EVALUATION_STRATEGIES } from "../../../lib/evaluationTypes";

type StrategyComparisonTableProps = {
  query: QueryEvaluationComparison;
};

export function StrategyComparisonTable({ query }: StrategyComparisonTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="min-w-full divide-y divide-line text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3 font-semibold">Strategy</th>
            <th className="px-4 py-3 font-semibold">Ranked candidates</th>
            <th className="px-4 py-3 font-semibold">Available metrics</th>
            <th className="px-4 py-3 font-semibold">Unavailable metrics</th>
            <th className="px-4 py-3 font-semibold">Top result</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-white">
          {EVALUATION_STRATEGIES.map((strategy) => (
            <StrategyRow key={strategy} strategy={strategy} query={query} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StrategyRow({ strategy, query }: { strategy: EvaluationStrategy; query: QueryEvaluationComparison }) {
  const result = query.strategy_results[strategy];
  const availableMetrics = result?.metrics.filter((metric) => metric.is_available) ?? [];
  const unavailableMetrics = result?.metrics.filter((metric) => !metric.is_available) ?? [];
  const topCandidate = result?.ranked_candidates.find((candidate) => candidate.rank === 1);

  return (
    <tr>
      <td className="px-4 py-3 font-medium text-ink">{formatStrategyLabel(strategy)}</td>
      <td className="px-4 py-3 tabular-nums text-muted">{result?.ranked_candidate_ids.length ?? 0}</td>
      <td className="px-4 py-3 text-muted">
        {availableMetrics.length > 0
          ? availableMetrics.map((metric) => `${formatMetricName(metric)} ${formatMetricValue(metric.value)}`).join(", ")
          : "None"}
      </td>
      <td className="px-4 py-3 text-muted">
        {unavailableMetrics.length > 0
          ? unavailableMetrics.map((metric) => `${formatMetricName(metric)}: ${metric.reason ?? "Unavailable"}`).join(", ")
          : "None"}
      </td>
      <td className="px-4 py-3 text-muted">
        {topCandidate ? `${topCandidate.candidate_id} (${formatMetricValue(topCandidate.score)})` : "Unavailable"}
      </td>
    </tr>
  );
}
