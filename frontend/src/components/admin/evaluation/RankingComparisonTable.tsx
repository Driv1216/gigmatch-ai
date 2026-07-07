import { formatMetricValue, formatStrategyLabel } from "../../../lib/evaluationDisplay";
import type {
  EvaluationStrategy,
  QueryEvaluationComparison,
  RankedEvaluationCandidate,
} from "../../../lib/evaluationTypes";
import { EVALUATION_STRATEGIES } from "../../../lib/evaluationTypes";

type RankingComparisonTableProps = {
  query: QueryEvaluationComparison;
};

export function RankingComparisonTable({ query }: RankingComparisonTableProps) {
  if (query.ranking_comparison_rows.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-line bg-slate-50 px-4 py-3 text-sm text-muted">
        No ranking comparison rows were returned for this query.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="min-w-full divide-y divide-line text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3 font-semibold">Candidate</th>
            {EVALUATION_STRATEGIES.map((strategy) => (
              <th key={strategy} className="px-4 py-3 font-semibold">
                {formatStrategyLabel(strategy)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-white">
          {query.ranking_comparison_rows.map((row) => (
            <tr key={row.candidate_id}>
              <td className="px-4 py-3 font-medium text-ink">{row.candidate_id}</td>
              {EVALUATION_STRATEGIES.map((strategy) => {
                const candidate = findCandidate(query, strategy, row.candidate_id);
                const rank = row.ranks_by_strategy[strategy];
                return (
                  <td key={`${row.candidate_id}-${strategy}`} className="px-4 py-3 text-muted">
                    {typeof rank === "number" ? (
                      <span>
                        Rank <span className="font-semibold tabular-nums text-ink">{rank}</span>
                        <span className="ml-2 text-xs tabular-nums">score {formatMetricValue(candidate?.score)}</span>
                      </span>
                    ) : (
                      "Unavailable"
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function findCandidate(
  query: QueryEvaluationComparison,
  strategy: EvaluationStrategy,
  candidateId: string,
): RankedEvaluationCandidate | undefined {
  return query.strategy_results[strategy]?.ranked_candidates.find((candidate) => candidate.candidate_id === candidateId);
}
