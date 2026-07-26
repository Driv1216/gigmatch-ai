import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "./Button";
import { isRecord } from "../lib/applicationContracts";
import { lines, validateProposal } from "../lib/applicationView";

type Props = {
  paymentStructure: "fixed_price" | "hourly" | "open_to_proposals";
  currency: string;
  materialTerms?: Record<string, unknown>;
  initialApplication?: Record<string, unknown>;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (application: Record<string, unknown>) => Promise<void>;
};

type Values = Record<string, string>;

export function ApplicationForm({
  paymentStructure, currency, materialTerms, initialApplication, submitLabel, submitting, onSubmit,
}: Props) {
  const [values, setValues] = useState<Values>(() => initialValues(paymentStructure, initialApplication));
  const [errors, setErrors] = useState<string[]>([]);
  const postedMaximum = useMemo(() => fixedMaximum(materialTerms), [materialTerms]);

  function update(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateProposal(values, paymentStructure, postedMaximum);
    if (nextErrors.length) {
      setErrors(nextErrors);
      return;
    }
    setErrors([]);
    await onSubmit(buildApplication(values, paymentStructure));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.length ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4" role="alert">
          <p className="font-semibold text-red-800">Please review your application</p>
          <ul className="mt-2 list-disc pl-5 text-sm text-red-700">{errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </div>
      ) : null}

      <Field label="Cover note">
        <textarea value={values.cover_note} onChange={(event) => update("cover_note", event.target.value)} rows={6}
          className={controlClass} placeholder="Explain your relevant approach and experience." />
      </Field>

      <section className="rounded-md border border-line bg-slate-50 p-5">
        <h2 className="font-bold text-ink">Financial proposal · {currency}</h2>
        {paymentStructure === "fixed_price" ? <FixedFields values={values} update={update} maximum={postedMaximum} /> : null}
        {paymentStructure === "hourly" ? <HourlyFields values={values} update={update} /> : null}
        {paymentStructure === "open_to_proposals" ? <OpenFields values={values} update={update} /> : null}
      </section>

      <section className="grid gap-5 rounded-md border border-line p-5 md:grid-cols-2">
        <div>
          <h2 className="font-bold text-ink">Timeline</h2>
          <Select label="Timeline shape" value={values.timeline_mode} onChange={(value) => update("timeline_mode", value)}
            options={["exact", "range", "requires_discussion"]} />
          {values.timeline_mode !== "requires_discussion" ? (
            <Select label="Unit" value={values.timeline_unit} onChange={(value) => update("timeline_unit", value)}
              options={["days", "weeks", "months"]} />
          ) : null}
          {values.timeline_mode === "exact" ? <Input label="Exact duration" type="number" value={values.timeline_exact} onChange={(value) => update("timeline_exact", value)} /> : null}
          {values.timeline_mode === "range" ? <div className="grid grid-cols-2 gap-3"><Input label="Minimum" type="number" value={values.timeline_minimum} onChange={(value) => update("timeline_minimum", value)} /><Input label="Maximum" type="number" value={values.timeline_maximum} onChange={(value) => update("timeline_maximum", value)} /></div> : null}
        </div>
        <div>
          <h2 className="font-bold text-ink">Availability</h2>
          <Input label="Available from" type="date" value={values.available_from} onChange={(value) => update("available_from", value)} />
          {paymentStructure === "hourly" ? <div className="grid grid-cols-2 gap-3"><Input label="Weekly minimum" type="number" value={values.weekly_minimum} onChange={(value) => update("weekly_minimum", value)} /><Input label="Weekly maximum" type="number" value={values.weekly_maximum} onChange={(value) => update("weekly_maximum", value)} /></div> : null}
        </div>
      </section>

      <section className="grid gap-4 rounded-md border border-line p-5 md:grid-cols-2">
        <TextList label="Included work" value={values.included_work} onChange={(value) => update("included_work", value)} />
        <TextList label="Excluded work" value={values.excluded_work} onChange={(value) => update("excluded_work", value)} />
        <TextList label="Assumptions" value={values.assumptions} onChange={(value) => update("assumptions", value)} />
        <TextList label="Estimate-change factors" value={values.estimate_change_factors} onChange={(value) => update("estimate_change_factors", value)} />
        <div className="md:col-span-2"><Field label="Scope notes"><textarea value={values.scope_notes} onChange={(event) => update("scope_notes", event.target.value)} rows={3} className={controlClass} /></Field></div>
      </section>

      <Button type="submit" disabled={submitting}>{submitting ? "Saving application..." : submitLabel}</Button>
    </form>
  );
}

function FixedFields({ values, update, maximum }: { values: Values; update: (name: string, value: string) => void; maximum?: number }) {
  return <div className="mt-4 space-y-4">
    <Select label="Proposal type" value={values.proposal_mode} onChange={(value) => update("proposal_mode", value)}
      options={["comfortable_within_posted_budget", "exact_total", "total_range", "requires_scope_clarification"]} />
    {maximum ? <p className="text-xs text-muted">Posted maximum: {maximum}</p> : null}
    {values.proposal_mode === "exact_total" ? <Input label="Exact total" type="number" value={values.exact_total} onChange={(value) => update("exact_total", value)} /> : null}
    {values.proposal_mode === "total_range" ? <div className="grid grid-cols-2 gap-3"><Input label="Minimum total" type="number" value={values.minimum} onChange={(value) => update("minimum", value)} /><Input label="Maximum total" type="number" value={values.maximum} onChange={(value) => update("maximum", value)} /></div> : null}
    {(values.proposal_mode === "exact_total" || values.proposal_mode === "total_range") ? <Field label="Above-budget explanation (required when applicable)"><textarea value={values.range_explanation} onChange={(event) => update("range_explanation", event.target.value)} rows={2} className={controlClass} /></Field> : null}
  </div>;
}

function HourlyFields({ values, update }: { values: Values; update: (name: string, value: string) => void }) {
  return <div className="mt-4 grid gap-4 md:grid-cols-2">
    <Input label="Requested hourly rate" type="number" value={values.hourly_rate} onChange={(value) => update("hourly_rate", value)} />
    <Select label="Rate flexibility" value={values.rate_flexibility} onChange={(value) => update("rate_flexibility", value)} options={["fixed", "negotiable", "depends_on_weekly_commitment"]} />
    <Input label="Available from" type="date" value={values.available_from} onChange={(value) => update("available_from", value)} />
    <Field label="Out-of-range explanation"><textarea value={values.range_explanation} onChange={(event) => update("range_explanation", event.target.value)} rows={2} className={controlClass} /></Field>
  </div>;
}

function OpenFields({ values, update }: { values: Values; update: (name: string, value: string) => void }) {
  return <div className="mt-4 space-y-4">
    <Select label="Proposal form" value={values.proposal_mode} onChange={(value) => update("proposal_mode", value)}
      options={["estimated_fixed_price_range", "proposed_hourly_rate", "phased_estimate", "initial_discovery_phase"]} />
    {values.proposal_mode === "estimated_fixed_price_range" ? <div className="grid grid-cols-2 gap-3"><Input label="Minimum" type="number" value={values.minimum} onChange={(value) => update("minimum", value)} /><Input label="Maximum" type="number" value={values.maximum} onChange={(value) => update("maximum", value)} /></div> : null}
    {values.proposal_mode === "proposed_hourly_rate" ? <Input label="Hourly rate" type="number" value={values.hourly_rate} onChange={(value) => update("hourly_rate", value)} /> : null}
    {values.proposal_mode === "phased_estimate" ? <div className="grid gap-3 md:grid-cols-2"><Input label="Phase name" value={values.phase_name} onChange={(value) => update("phase_name", value)} /><Input label="Phase amount" type="number" value={values.phase_amount} onChange={(value) => update("phase_amount", value)} /></div> : null}
    {values.proposal_mode === "initial_discovery_phase" ? <div className="grid gap-3 md:grid-cols-2"><Input label="Discovery scope" value={values.discovery_scope} onChange={(value) => update("discovery_scope", value)} /><Input label="Discovery amount" type="number" value={values.discovery_amount} onChange={(value) => update("discovery_amount", value)} /></div> : null}
  </div>;
}

function buildApplication(values: Values, structure: Props["paymentStructure"]): Record<string, unknown> {
  const proposal: Record<string, unknown> = { payment_structure: structure };
  if (structure !== "hourly") proposal.mode = values.proposal_mode;
  if (structure === "fixed_price") {
    if (values.proposal_mode === "exact_total") proposal.exact_total = values.exact_total;
    if (values.proposal_mode === "total_range") proposal.total_range = { minimum: values.minimum, maximum: values.maximum };
    if (values.range_explanation.trim()) proposal.above_budget_explanation = values.range_explanation.trim();
  } else if (structure === "hourly") {
    Object.assign(proposal, { requested_hourly_rate: values.hourly_rate,
      weekly_availability_hours: { minimum: values.weekly_minimum, maximum: values.weekly_maximum },
      available_from: values.available_from, rate_flexibility: values.rate_flexibility });
    if (values.range_explanation.trim()) proposal.out_of_range_explanation = values.range_explanation.trim();
  } else if (values.proposal_mode === "estimated_fixed_price_range") {
    proposal.fixed_price_range = { minimum: values.minimum, maximum: values.maximum };
  } else if (values.proposal_mode === "proposed_hourly_rate") {
    proposal.hourly_rate = values.hourly_rate;
  } else if (values.proposal_mode === "phased_estimate") {
    proposal.phases = [{ name: values.phase_name, amount: values.phase_amount,
      duration: { mode: "exact", unit: "weeks", exact_value: values.timeline_exact || "1" } }];
  } else {
    proposal.discovery_phase = { scope: values.discovery_scope, amount: values.discovery_amount,
      duration: { mode: "exact", unit: "weeks", exact_value: values.timeline_exact || "1" } };
  }
  const timeline = values.timeline_mode === "exact"
    ? { mode: "exact", unit: values.timeline_unit, exact_value: values.timeline_exact }
    : values.timeline_mode === "range"
      ? { mode: "range", unit: values.timeline_unit, minimum_value: values.timeline_minimum, maximum_value: values.timeline_maximum }
      : { mode: "requires_discussion" };
  const availability: Record<string, unknown> = { available_from: values.available_from };
  if (structure === "hourly") availability.weekly_hours = { minimum: values.weekly_minimum, maximum: values.weekly_maximum };
  return { cover_note: values.cover_note, proposal, timeline, availability,
    scope: { included_work: lines(values.included_work), excluded_work: lines(values.excluded_work),
      assumptions: lines(values.assumptions), estimate_change_factors: lines(values.estimate_change_factors) },
    ...(values.scope_notes.trim() ? { scope_notes: values.scope_notes.trim() } : {}) };
}

function initialValues(structure: Props["paymentStructure"], initial?: Record<string, unknown>): Values {
  const proposal = initial && isRecord(initial.proposal) ? initial.proposal : {};
  const timeline = initial && isRecord(initial.timeline) ? initial.timeline : {};
  const availability = initial && isRecord(initial.availability) ? initial.availability : {};
  const scope = initial && isRecord(initial.scope) ? initial.scope : {};
  const weekly = isRecord(availability.weekly_hours) ? availability.weekly_hours : {};
  const range = isRecord(proposal.total_range) ? proposal.total_range : isRecord(proposal.fixed_price_range) ? proposal.fixed_price_range : {};
  const phases = Array.isArray(proposal.phases) && isRecord(proposal.phases[0]) ? proposal.phases[0] : {};
  const discovery = isRecord(proposal.discovery_phase) ? proposal.discovery_phase : {};
  const defaultMode = structure === "fixed_price" ? "comfortable_within_posted_budget" : structure === "hourly" ? "hourly" : "estimated_fixed_price_range";
  return { cover_note: String(initial?.cover_note ?? ""), proposal_mode: String(proposal.mode ?? defaultMode),
    exact_total: String(proposal.exact_total ?? ""), minimum: String(range.minimum ?? ""), maximum: String(range.maximum ?? ""),
    hourly_rate: String(proposal.requested_hourly_rate ?? proposal.hourly_rate ?? ""), range_explanation: String(proposal.above_budget_explanation ?? proposal.out_of_range_explanation ?? ""),
    rate_flexibility: String(proposal.rate_flexibility ?? "negotiable"), available_from: String(availability.available_from ?? proposal.available_from ?? ""),
    weekly_minimum: String(weekly.minimum ?? ""), weekly_maximum: String(weekly.maximum ?? ""),
    timeline_mode: String(timeline.mode ?? "exact"), timeline_unit: String(timeline.unit ?? "weeks"), timeline_exact: String(timeline.exact_value ?? ""),
    timeline_minimum: String(timeline.minimum_value ?? ""), timeline_maximum: String(timeline.maximum_value ?? ""),
    included_work: arrayLines(scope.included_work), excluded_work: arrayLines(scope.excluded_work), assumptions: arrayLines(scope.assumptions),
    estimate_change_factors: arrayLines(scope.estimate_change_factors), scope_notes: String(initial?.scope_notes ?? ""),
    phase_name: String(phases.name ?? "Initial phase"), phase_amount: String(phases.amount ?? ""),
    discovery_scope: String(discovery.scope ?? "Discovery and scope confirmation"), discovery_amount: String(discovery.amount ?? "") };
}

function fixedMaximum(terms?: Record<string, unknown>): number | undefined {
  const payment = terms && isRecord(terms.client_payment) ? terms.client_payment : {};
  const budget = isRecord(payment.budget) ? payment.budget : {};
  const maximum = Number(budget.maximum);
  return Number.isFinite(maximum) && maximum > 0 ? maximum : undefined;
}

function arrayLines(value: unknown): string { return Array.isArray(value) ? value.filter((item) => typeof item === "string").join("\n") : ""; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block text-sm font-semibold text-ink">{label}<div className="mt-2">{children}</div></label>; }
function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <Field label={label}><input type={type} min={type === "number" ? "0" : undefined} step={type === "number" ? "any" : undefined} value={value} onChange={(event) => onChange(event.target.value)} className={controlClass} /></Field>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) { return <Field label={label}><select value={value} onChange={(event) => onChange(event.target.value)} className={controlClass}>{options.map((option) => <option key={option} value={option}>{option.replace(/_/g, " ")}</option>)}</select></Field>; }
function TextList({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <Field label={`${label} (one per line)`}><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className={controlClass} /></Field>; }
const controlClass = "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent";
