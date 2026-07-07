type EvaluationLimitationsPanelProps = {
  limitations: string[];
};

export function EvaluationLimitationsPanel({ limitations }: EvaluationLimitationsPanelProps) {
  return (
    <section aria-labelledby="evaluation-limitations-title" className="rounded-lg border border-line bg-white p-6 shadow-soft">
      <p className="text-sm font-semibold uppercase tracking-wide text-accent">Limitations</p>
      <h2 id="evaluation-limitations-title" className="mt-2 text-2xl font-bold tracking-normal text-ink">
        Evaluation boundaries
      </h2>

      <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
        {limitations.map((limitation) => (
          <li key={limitation} className="rounded-md border border-line bg-slate-50 px-4 py-3">
            {limitation}
          </li>
        ))}
      </ul>
    </section>
  );
}
