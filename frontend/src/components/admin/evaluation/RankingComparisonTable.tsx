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
      <p className="admin-evaluation-empty">
        No ranking comparison rows were returned for this query.
      </p>
    );
  }

  return (
    <section className="admin-query-evidence" aria-labelledby={`${query.query_id}-ranking-title`}>
      <header><span>QUERY-LEVEL EVIDENCE</span><h4 id={`${query.query_id}-ranking-title`}>Candidate rank register</h4></header>
      <div className="admin-evaluation-table-wrap">
      <table className="admin-evaluation-table admin-ranking-table">
        <caption>Candidate ranks and backend scores by strategy for {query.query_id}</caption>
        <thead>
          <tr>
            <th>Candidate</th>
            {EVALUATION_STRATEGIES.map((strategy) => (
              <th key={strategy}>
                {formatStrategyLabel(strategy)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {query.ranking_comparison_rows.map((row) => (
            <tr key={row.candidate_id}>
              <th scope="row">{row.candidate_id}</th>
              {EVALUATION_STRATEGIES.map((strategy) => {
                const candidate = findCandidate(query, strategy, row.candidate_id);
                const rank = row.ranks_by_strategy[strategy];
                return (
                  <td key={`${row.candidate_id}-${strategy}`}>
                    {typeof rank === "number" ? (
                      <span className="admin-rank-value">
                        Rank <strong>{rank}</strong>
                        <small>score {formatMetricValue(candidate?.score)}</small>
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
    </section>
  );
}

function findCandidate(
  query: QueryEvaluationComparison,
  strategy: EvaluationStrategy,
  candidateId: string,
): RankedEvaluationCandidate | undefined {
  return query.strategy_results[strategy]?.ranked_candidates.find((candidate) => candidate.candidate_id === candidateId);
}
