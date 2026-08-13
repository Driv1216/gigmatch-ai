import { formatMetricName, formatMetricValue, formatStrategyLabel } from "../../../lib/evaluationDisplay";
import type { EvaluationStrategy, QueryEvaluationComparison } from "../../../lib/evaluationTypes";
import { EVALUATION_STRATEGIES } from "../../../lib/evaluationTypes";

type StrategyComparisonTableProps = {
  query: QueryEvaluationComparison;
};

export function StrategyComparisonTable({ query }: StrategyComparisonTableProps) {
  return (
    <section className="admin-query-evidence" aria-labelledby={`${query.query_id}-strategy-title`}>
      <header><span>METHOD / STRATEGY COMPARISON</span><h4 id={`${query.query_id}-strategy-title`}>Backend strategy results</h4></header>
      <div className="admin-evaluation-table-wrap">
      <table className="admin-evaluation-table">
        <caption>Keyword, semantic, and hybrid evidence for {query.query_id}</caption>
        <thead>
          <tr>
            <th>Strategy</th>
            <th>Ranked candidates</th>
            <th>Available metrics</th>
            <th>Unavailable metrics</th>
            <th>Top result</th>
          </tr>
        </thead>
        <tbody>
          {EVALUATION_STRATEGIES.map((strategy) => (
            <StrategyRow key={strategy} strategy={strategy} query={query} />
          ))}
        </tbody>
      </table>
      </div>
    </section>
  );
}

function StrategyRow({ strategy, query }: { strategy: EvaluationStrategy; query: QueryEvaluationComparison }) {
  const result = query.strategy_results[strategy];
  const availableMetrics = result?.metrics.filter((metric) => metric.is_available) ?? [];
  const unavailableMetrics = result?.metrics.filter((metric) => !metric.is_available) ?? [];
  const topCandidate = result?.ranked_candidates.find((candidate) => candidate.rank === 1);
  const availableSummary = result
    ? availableMetrics.length > 0
      ? availableMetrics.map((metric) => `${formatMetricName(metric)} ${formatMetricValue(metric.value)}`).join(", ")
      : "None returned"
    : "Unavailable";
  const unavailableSummary = result
    ? unavailableMetrics.length > 0
      ? unavailableMetrics.map((metric) => `${formatMetricName(metric)}: ${metric.reason ?? "Unavailable"}`).join(", ")
      : "None reported"
    : "Unavailable";

  return (
    <tr>
      <th scope="row">{formatStrategyLabel(strategy)}</th>
      <td className="is-number">{result ? result.ranked_candidate_ids.length : "Unavailable"}</td>
      <td>{availableSummary}</td>
      <td className="is-reason">{unavailableSummary}</td>
      <td>
        {topCandidate ? `${topCandidate.candidate_id} (${formatMetricValue(topCandidate.score)})` : "Unavailable"}
      </td>
    </tr>
  );
}
