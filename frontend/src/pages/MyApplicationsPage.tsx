import { useEffect, useState, type ReactNode } from "react";
import { Button } from "../components/Button";
import { WorkflowStatusBadge } from "../components/WorkflowStatusBadge";
import { ApplicationApiError, fetchApplications, type ApplicationEnvelope } from "../lib/applications";
import {
  applicationBlockerMessage,
  applicationCollectionState,
  applicationRecordErrorMessage,
  formatApplicationTime,
} from "../lib/applicationView";

export function MyApplicationsPage() {
  const [data, setData] = useState<ApplicationEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchApplications()
      .then((value) => { if (active) setData(value); })
      .catch((reason: unknown) => { if (active) setError(recordError(reason, "Unable to load applications.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey]);

  const state = applicationCollectionState(loading, error, data?.items.length ?? 0);
  return (
    <section className="stage-four-page application-register-page" aria-busy={loading}>
      <header className="stage-four-editorial-header">
        <div><p>Freelancer operations / Proposal authority</p><h1>My Applications</h1></div>
        <div className="stage-four-editorial-context"><span>Record → binding → available action</span><p>Each lane is an authoritative application history. Proposal versions are immutable, and material gig changes remain explicit.</p><Button to="/gigs">Find gigs</Button></div>
      </header>

      {state === "loading" ? <StatePanel title="Loading application register" body="Retrieving current stages, proposal ordinals, blockers, and response requirements…" /> : null}
      {state === "error" ? <StatePanel title="Application register unavailable" body={error ?? "Unable to load applications."} retry={() => setReloadKey((value) => value + 1)} error /> : null}
      {state === "empty" ? <StatePanel title="No applications yet" body="Browse active gigs and submit a complete proposal when the fit is right." action={<Button to="/gigs">Browse open gigs</Button>} /> : null}

      {state === "ready" ? (
        <div className="application-register" aria-label="Application record lanes">
          <div className="application-register-heading" aria-hidden="true"><span>Lane</span><span>Application record</span><span>Current authority</span><span>Open record</span></div>
          {data?.items.map((item, index) => {
            const title = String(item.gig.title ?? "Untitled gig");
            const client = String(item.client.company_name ?? item.client.display_name ?? "Client");
            const attention = item.response_to_updated_gig_required || Boolean(item.qa?.qa_requires_attention);
            return (
              <article key={item.application_id} className="application-register-lane">
                <span className="application-register-index">{String(index + 1).padStart(2, "0")}</span>
                <div className="application-register-record">
                  <div className="application-register-kicker"><WorkflowStatusBadge status={item.stage} tone={attention ? "attention" : "neutral"} /><span>{item.gig_product_state.replace(/_/g, " ")}</span></div>
                  <h2>{title}</h2><p>{client}</p>
                  <dl><Fact label="Submitted" value={formatApplicationTime(item.submitted_at)} /><Fact label="Last updated" value={formatApplicationTime(item.updated_at)} /></dl>
                </div>
                <div className="application-register-state">
                  <strong>Application v{item.current_version_number}</strong><span>Current immutable proposal</span>
                  {item.response_to_updated_gig_required ? <p className="is-attention">Response required: material gig terms changed.</p> : null}
                  {item.qa?.qa_requires_attention ? <p className="is-later">Later-stage response is waiting inside this record.</p> : null}
                  {item.blockers.length ? <div className="application-register-blockers"><span>Server blockers</span>{item.blockers.map((code) => <p key={code}>{applicationBlockerMessage(code)}</p>)}</div> : null}
                </div>
                <div className="application-register-action"><span>{item.allowed_actions.length} authorized action{item.allowed_actions.length === 1 ? "" : "s"}</span><Button to={`/applications/${item.application_id}`}>View application</Button></div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }

function StatePanel({ title, body, retry, action, error = false }: { title: string; body: string; retry?: () => void; action?: ReactNode; error?: boolean }) {
  return <div className={`stage-four-state-panel${error ? " is-error" : ""}`} role={error ? "alert" : "status"}><span>Application register</span><h2>{title}</h2><p>{body}</p>{retry ? <Button type="button" variant="secondary" onClick={retry}>Try again</Button> : action}</div>;
}

function recordError(reason: unknown, fallback: string): string {
  return reason instanceof ApplicationApiError ? applicationRecordErrorMessage(reason.code) : reason instanceof Error ? reason.message : fallback;
}
