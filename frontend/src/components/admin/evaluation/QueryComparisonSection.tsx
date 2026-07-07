import { formatQueryType } from "../../../lib/evaluationDisplay";
import type { EvaluationSummary } from "../../../lib/evaluationTypes";
import { RankingComparisonTable } from "./RankingComparisonTable";
import { StrategyComparisonTable } from "./StrategyComparisonTable";

type QueryComparisonSectionProps = {
  summary: EvaluationSummary;
};

export function QueryComparisonSection({ summary }: QueryComparisonSectionProps) {
  return (
    <section aria-labelledby="query-comparison-title" className="rounded-lg border border-line bg-white p-6 shadow-soft">
      <p className="text-sm font-semibold uppercase tracking-wide text-accent">Query comparison</p>
      <h2 id="query-comparison-title" className="mt-2 text-2xl font-bold tracking-normal text-ink">
        Strategy results by seeded query
      </h2>

      {summary.query_results.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-line bg-slate-50 p-6">
          <h3 className="text-base font-bold tracking-normal text-ink">No evaluation results available yet</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            The backend evaluation endpoint returned an empty query result set.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {summary.query_results.map((query) => (
            <article key={`${query.fixture_id}-${query.query_id}`} className="border-t border-line pt-6 first:border-t-0 first:pt-0">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-xl font-bold tracking-normal text-ink">{query.query_id}</h3>
                  <p className="mt-2 text-sm font-semibold text-accent">{formatQueryType(query.query_type)}</p>
                </div>
                <dl className="grid gap-2 text-sm sm:grid-cols-3">
                  <QueryStat label="Candidates" value={query.candidate_count.toString()} />
                  <QueryStat label="Judgments" value={query.judgment_count.toString()} />
                  <QueryStat label="Complete" value={query.is_complete_judgment_set ? "Yes" : "No"} />
                </dl>
              </div>

              {query.limitations.length > 0 ? (
                <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {query.limitations.join(" ")}
                </div>
              ) : null}

              <div className="mt-5 space-y-5">
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
    <div className="rounded-md border border-line bg-slate-50 px-3 py-2">
      <dt className="text-xs font-medium uppercase text-muted">{label}</dt>
      <dd className="mt-1 font-semibold text-ink">{value}</dd>
    </div>
  );
}
