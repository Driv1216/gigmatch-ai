import { isRecord } from "../lib/applicationContracts";

type ApplicationProposalSnapshotProps = {
  title: string;
  application: Record<string, unknown>;
  compact?: boolean;
};

export function ApplicationProposalSnapshot({ title, application, compact = false }: ApplicationProposalSnapshotProps) {
  const proposal = isRecord(application.proposal) ? application.proposal : {};
  const timeline = isRecord(application.timeline) ? application.timeline : {};
  const availability = isRecord(application.availability) ? application.availability : {};
  const scope = isRecord(application.scope) ? application.scope : {};

  return (
    <section className={compact ? "application-proposal-snapshot is-compact" : "application-proposal-snapshot"}>
      <header><span>Complete canonical snapshot</span><h3>{title}</h3></header>
      <div className="application-proposal-cover">
        <span>Cover note</span>
        <p>{text(application.cover_note, "No cover note reported.")}</p>
      </div>
      <dl className="application-proposal-facts">
        <Fact label="Payment structure" value={formatCode(text(proposal.payment_structure, "Not reported"))} />
        <Fact label="Proposal form" value={proposalForm(proposal)} />
        <Fact label="Commercial proposal" value={commercialProposal(proposal)} />
        <Fact label="Timeline" value={duration(timeline)} />
        <Fact label="Available from" value={text(availability.available_from, "Not reported")} />
        <Fact label="Weekly availability" value={range(isRecord(availability.weekly_hours) ? availability.weekly_hours : {})} />
      </dl>
      <div className="application-proposal-scope">
        <SnapshotList title="Included work" values={scope.included_work} />
        <SnapshotList title="Excluded work" values={scope.excluded_work} />
        <SnapshotList title="Assumptions" values={scope.assumptions} />
        <SnapshotList title="Estimate-change factors" values={scope.estimate_change_factors} />
      </div>
      {text(application.scope_notes, "") ? <p className="application-proposal-notes"><span>Scope notes</span>{text(application.scope_notes, "")}</p> : null}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function SnapshotList({ title, values }: { title: string; values: unknown }) {
  const items = Array.isArray(values) ? values.filter((value): value is string => typeof value === "string" && Boolean(value.trim())) : [];
  return <div><h4>{title}</h4>{items.length ? <ul>{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : <p>None reported</p>}</div>;
}

function proposalForm(proposal: Record<string, unknown>): string {
  return formatCode(text(proposal.mode, proposal.payment_structure === "hourly" ? "hourly rate" : "Not reported"));
}

function commercialProposal(proposal: Record<string, unknown>): string {
  const currency = text(proposal.currency, "");
  if (proposal.exact_total !== undefined) return `${currency} ${text(proposal.exact_total, "—")} total`.trim();
  if (proposal.requested_hourly_rate !== undefined) return `${currency} ${text(proposal.requested_hourly_rate, "—")} / hour`.trim();
  if (proposal.hourly_rate !== undefined) return `${currency} ${text(proposal.hourly_rate, "—")} / hour`.trim();
  if (isRecord(proposal.total_range)) return `${currency} ${range(proposal.total_range)}`.trim();
  if (isRecord(proposal.fixed_price_range)) return `${currency} ${range(proposal.fixed_price_range)}`.trim();
  if (Array.isArray(proposal.phases)) return `${proposal.phases.length} pricing phase${proposal.phases.length === 1 ? "" : "s"}`;
  if (isRecord(proposal.discovery_phase)) return `Discovery phase · ${currency} ${text(proposal.discovery_phase.amount, "—")}`.trim();
  if (proposal.mode === "comfortable_within_posted_budget") return "Comfortable within posted budget";
  return "Structured proposal";
}

function duration(value: Record<string, unknown>): string {
  const mode = text(value.mode, "Not reported");
  if (mode === "exact") return `${text(value.exact_value, "—")} ${text(value.unit, "")}`.trim();
  if (mode === "range") return `${text(value.minimum_value, "—")}–${text(value.maximum_value, "—")} ${text(value.unit, "")}`.trim();
  return formatCode(mode);
}

function range(value: Record<string, unknown>): string {
  if (value.minimum === undefined && value.maximum === undefined) return "Not reported";
  return `${text(value.minimum, "—")}–${text(value.maximum, "—")}`;
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}

function formatCode(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
