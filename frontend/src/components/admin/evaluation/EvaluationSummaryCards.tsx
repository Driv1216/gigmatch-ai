import type { EvaluationSummary } from "../../../lib/evaluationTypes";

type EvaluationSummaryCardsProps = {
  summary: EvaluationSummary;
};

export function EvaluationSummaryCards({ summary }: EvaluationSummaryCardsProps) {
  const cards = [
    { label: "Fixtures", value: summary.fixture_ids.join(", ") || "Unavailable", detail: "Backend-provided fixture identifiers" },
    { label: "Queries", value: summary.query_count.toString(), detail: "Seeded evaluation queries" },
    { label: "Candidates", value: summary.candidate_count.toString(), detail: "Backend summary across fixture queries" },
    { label: "Judgments", value: summary.judgment_count.toString(), detail: "Seeded explicit relevance labels" },
    { label: "Top-K", value: summary.top_ks.join(", ") || "Unavailable", detail: "Backend evaluation settings" },
    { label: "Source", value: summary.generated_from ?? "Unavailable", detail: "Evaluation response provenance" },
  ];

  return (
    <section aria-labelledby="evaluation-summary-title" className="admin-evaluation-section admin-evaluation-scope">
      <header className="admin-evaluation-section-header">
        <span>01 / EVALUATION SCOPE</span>
        <div>
          <h2 id="evaluation-summary-title">Seeded evaluation run</h2>
          <p>Counts, fixture identifiers, and settings below come from the sanitized backend summary.</p>
        </div>
      </header>

      <dl className="admin-evaluation-scope-grid">
        {cards.map((card) => (
          <div key={card.label}>
            <dt>{card.label}</dt>
            <dd>{card.value}</dd>
            <dd>{card.detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
