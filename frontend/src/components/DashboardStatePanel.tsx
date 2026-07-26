import { Button } from "./Button";

type DashboardStatePanelProps = {
  title: string;
  body: string;
  retry?: () => void;
  busy?: boolean;
};

export function DashboardStatePanel({
  title,
  body,
  retry,
  busy = false,
}: DashboardStatePanelProps) {
  return (
    <section
      className="rounded-lg border border-line bg-white p-6 shadow-soft"
      aria-live="polite"
      aria-busy={busy}
    >
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
      {retry ? (
        <Button type="button" variant="secondary" className="mt-4" onClick={retry}>
          Try again
        </Button>
      ) : null}
    </section>
  );
}
