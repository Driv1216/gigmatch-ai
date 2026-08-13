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
      className="dashboard-state-panel"
      aria-live="polite"
      aria-busy={busy}
    >
      <span>{busy ? "Loading" : "Current state"}</span>
      <h2>{title}</h2>
      <p>{body}</p>
      {retry ? (
        <Button type="button" variant="secondary" onClick={retry}>
          Try again
        </Button>
      ) : null}
    </section>
  );
}
