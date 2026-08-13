import { formatQueryType } from "../../../lib/evaluationDisplay";
import type { EvaluationSummary } from "../../../lib/evaluationTypes";
import { RankingComparisonTable } from "./RankingComparisonTable";
import { StrategyComparisonTable } from "./StrategyComparisonTable";

type QueryComparisonSectionProps = {
  summary: EvaluationSummary;
};

export function QueryComparisonSection({ summary }: QueryComparisonSectionProps) {
  return (
    <section aria-labelledby="query-comparison-title" className="admin-evaluation-section admin-query-comparison">
      <header className="admin-evaluation-section-header">
        <span>03–04 / METHODS + QUERY EVIDENCE</span>
        <div>
          <h2 id="query-comparison-title">Strategy results by seeded query</h2>
          <p>Every backend query stays in response order with its method rows, candidate ranks, and query-specific limitations.</p>
        </div>
      </header>

      {summary.query_results.length === 0 ? (
        <div className="admin-evaluation-empty"><strong>No evaluation results available yet</strong><p>The backend evaluation endpoint returned an empty query result set.</p></div>
      ) : (
        <div className="admin-query-records">
          {summary.query_results.map((query) => (
            <article key={`${query.fixture_id}-${query.query_id}`} className="admin-query-record">
              <header>
                <div>
                  <span>{query.fixture_id}</span>
                  <h3>{query.query_id}</h3>
                  <p>{formatQueryType(query.query_type)}</p>
                </div>
                <dl>
                  <QueryStat label="Candidates" value={query.candidate_count.toString()} />
                  <QueryStat label="Judgments" value={query.judgment_count.toString()} />
                  <QueryStat label="Complete" value={query.is_complete_judgment_set ? "Yes" : "No"} />
                </dl>
              </header>

              {query.limitations.length > 0 ? (
                <ul className="admin-query-limitations">
                  {query.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
                </ul>
              ) : null}

              <div className="admin-query-evidence-stack">
                <StrategyComparisonTable query={query} />
                <RankingComparisonTable query={query} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function QueryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
