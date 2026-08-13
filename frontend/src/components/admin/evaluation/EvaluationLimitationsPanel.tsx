type EvaluationLimitationsPanelProps = {
  limitations: string[];
};

export function EvaluationLimitationsPanel({ limitations }: EvaluationLimitationsPanelProps) {
  return (
    <section aria-labelledby="evaluation-limitations-title" className="admin-evaluation-section admin-evaluation-limitations">
      <header className="admin-evaluation-section-header">
        <span>05 / LIMITATIONS</span>
        <div>
          <h2 id="evaluation-limitations-title">Evaluation boundaries</h2>
          <p>These limitations are returned by the backend evaluation runner and remain attached to the evidence.</p>
        </div>
      </header>

      {limitations.length > 0 ? (
        <ol>
          {limitations.map((limitation, index) => (
            <li key={`${index}-${limitation}`}><span>{String(index + 1).padStart(2, "0")}</span><p>{limitation}</p></li>
          ))}
        </ol>
      ) : <p className="admin-evaluation-empty">No backend limitations were returned.</p>}
    </section>
  );
}
