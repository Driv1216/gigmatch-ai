/* eslint-disable react-refresh/only-export-components */
import { useState, type FormEvent, type ReactNode } from "react";
import { arrayToCsv, csvToArray } from "../lib/profiles";
import type { DifficultyLevel, Gig, SeniorityNeeded, WorkMode } from "../lib/gigs";
import { Button } from "./Button";
import { GigSelect } from "./GigSelect";

export type GigFormValues = {
  title: string;
  description: string;
  techCategory: string;
  requiredSkills: string;
  preferredSkills: string;
  budgetMin: string;
  budgetMax: string;
  difficultyLevel: "" | DifficultyLevel;
  seniorityNeeded: "" | SeniorityNeeded;
  deliverables: string;
  workMode: "" | WorkMode;
  deadline: string;
  projectDeadline: string;
  currency: string;
  budgetFlexibility: string;
  locationRequirements: string;
};

type GigFormProps = {
  initialValues?: GigFormValues;
  isSubmitting: boolean;
  submitLabel: string;
  submittingLabel: string;
  onSubmit: (values: GigFormValues) => void;
};

export const emptyGigForm: GigFormValues = {
  title: "",
  description: "",
  techCategory: "",
  requiredSkills: "",
  preferredSkills: "",
  budgetMin: "",
  budgetMax: "",
  difficultyLevel: "",
  seniorityNeeded: "",
  deliverables: "",
  workMode: "",
  deadline: "",
  projectDeadline: "",
  currency: "USD",
  budgetFlexibility: "negotiable",
  locationRequirements: "",
};

const inputClasses = "gig-form-control";
const difficultyOptions = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
] as const;
const seniorityOptions = [
  { value: "student", label: "Student" },
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "any", label: "Any" },
] as const;
const workModeOptions = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "Onsite" },
] as const;
const budgetFlexibilityOptions = [
  { value: "fixed", label: "Fixed" },
  { value: "negotiable", label: "Negotiable" },
  { value: "depends_on_scope", label: "Depends on scope" },
] as const;

export function formFromGig(gig: Gig): GigFormValues {
  return {
    title: gig.title,
    description: gig.description,
    techCategory: gig.tech_category,
    requiredSkills: arrayToCsv(gig.required_skills),
    preferredSkills: arrayToCsv(gig.preferred_skills),
    budgetMin: gig.budget_min === null ? "" : String(gig.budget_min),
    budgetMax: gig.budget_max === null ? "" : String(gig.budget_max),
    difficultyLevel: gig.difficulty_level ?? "",
    seniorityNeeded: gig.seniority_needed ?? "",
    deliverables: arrayToCsv(gig.deliverables),
    workMode: gig.work_mode ?? "",
    deadline: gig.deadline ?? "",
    projectDeadline: "",
    currency: "USD",
    budgetFlexibility: "negotiable",
    locationRequirements: "",
  };
}

function parseBudget(value: string, label: string, errors: string[]) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (!/^\d+$/.test(trimmed)) {
    errors.push(`${label} must be a whole number with no negative sign.`);
    return null;
  }

  const parsed = Number(trimmed);

  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    errors.push(`${label} must be a non-negative whole number.`);
    return null;
  }

  return parsed;
}

function validateGigForm(values: GigFormValues) {
  const errors: string[] = [];

  if (!values.title.trim()) {
    errors.push("Title is required.");
  }

  if (!values.description.trim()) {
    errors.push("Description is required.");
  }

  if (!values.techCategory.trim()) {
    errors.push("Tech category is required.");
  }

  if (!values.currency.match(/^[A-Za-z]{3}$/)) errors.push("Currency must be a three-letter code.");
  if (!values.deadline) errors.push("A timezone-aware application deadline is required.");
  if (values.deadline && new Date(values.deadline).getTime() <= Date.now()) errors.push("Application deadline must be in the future.");
  if (values.projectDeadline && new Date(values.projectDeadline).getTime() <= new Date(values.deadline).getTime()) {
    errors.push("Project deadline must be later than the application deadline.");
  }
  if (csvToArray(values.requiredSkills).length === 0) errors.push("At least one required skill is required.");
  if (csvToArray(values.deliverables).length === 0) errors.push("At least one deliverable is required.");
  if (!values.seniorityNeeded) errors.push("Experience requirement is required.");
  if (!values.workMode) errors.push("Work mode is required.");

  const budgetMin = parseBudget(values.budgetMin, "Budget min", errors);
  const budgetMax = parseBudget(values.budgetMax, "Budget max", errors);
  if (budgetMin === null || budgetMax === null) errors.push("A complete fixed-price budget range is required.");

  if (budgetMin !== null && budgetMax !== null && budgetMax < budgetMin) {
    errors.push("Budget max cannot be less than budget min.");
  }

  return errors;
}

export function snapshotFromGigForm(values: GigFormValues): Record<string, unknown> {
  const { budgetMin, budgetMax } = getParsedBudgets(values);
  const toAware = (value: string) => value ? new Date(value).toISOString() : null;
  return {
    terms_contract_version: 1,
    snapshot_schema_version: 1,
    version_kind: "initial_product_version",
    payment_structure: "fixed_price",
    currency: values.currency.trim().toUpperCase(),
    title: values.title.trim(),
    description: values.description.trim(),
    scope: { tech_category: values.techCategory.trim() },
    client_payment: {
      payment_structure: "fixed_price",
      currency: values.currency.trim().toUpperCase(),
      budget: { minimum: budgetMin, maximum: budgetMax },
      flexibility: values.budgetFlexibility,
    },
    required_skills: csvToArray(values.requiredSkills),
    preferred_skills: csvToArray(values.preferredSkills),
    experience_requirement: values.seniorityNeeded,
    difficulty_level: values.difficultyLevel || null,
    work_mode: values.workMode,
    location_requirements: values.locationRequirements.trim() || null,
    weekly_commitment: null,
    expected_duration: null,
    application_deadline: toAware(values.deadline),
    project_deadline: toAware(values.projectDeadline),
    deliverables: csvToArray(values.deliverables),
    assumptions: [],
  };
}

export function formFromTerms(terms: Record<string, unknown>): GigFormValues {
  const payment = typeof terms.client_payment === "object" && terms.client_payment ? terms.client_payment as Record<string, unknown> : {};
  const budget = typeof payment.budget === "object" && payment.budget ? payment.budget as Record<string, unknown> : payment;
  const scope = typeof terms.scope === "object" && terms.scope ? terms.scope as Record<string, unknown> : {};
  const localDate = (value: unknown) => typeof value === "string" ? new Date(value).toISOString().slice(0, 16) : "";
  const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  return {
    title: typeof terms.title === "string" ? terms.title : "",
    description: typeof terms.description === "string" ? terms.description : "",
    techCategory: typeof scope.tech_category === "string" ? scope.tech_category : "",
    requiredSkills: arrayToCsv(strings(terms.required_skills)), preferredSkills: arrayToCsv(strings(terms.preferred_skills)),
    budgetMin: String(budget.minimum ?? payment.budget_min ?? ""), budgetMax: String(budget.maximum ?? payment.budget_max ?? ""),
    difficultyLevel: (typeof terms.difficulty_level === "string" ? terms.difficulty_level : "") as GigFormValues["difficultyLevel"],
    seniorityNeeded: (typeof terms.experience_requirement === "string" ? terms.experience_requirement : "") as GigFormValues["seniorityNeeded"],
    deliverables: arrayToCsv(strings(terms.deliverables)),
    workMode: (typeof terms.work_mode === "string" ? terms.work_mode : "") as GigFormValues["workMode"],
    deadline: localDate(terms.application_deadline), projectDeadline: localDate(terms.project_deadline),
    currency: typeof terms.currency === "string" ? terms.currency : "USD",
    budgetFlexibility: typeof payment.flexibility === "string" ? payment.flexibility : "negotiable",
    locationRequirements: typeof terms.location_requirements === "string" ? terms.location_requirements : "",
  };
}

export function getParsedBudgets(values: GigFormValues) {
  const errors: string[] = [];

  return {
    budgetMin: parseBudget(values.budgetMin, "Budget min", errors),
    budgetMax: parseBudget(values.budgetMax, "Budget max", errors),
  };
}

export function GigForm({ initialValues = emptyGigForm, isSubmitting, submitLabel, submittingLabel, onSubmit }: GigFormProps) {
  const [values, setValues] = useState<GigFormValues>(initialValues);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  function updateField<Key extends keyof GigFormValues>(key: Key, value: GigFormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateGigForm(values);
    setValidationErrors(errors);

    if (errors.length > 0) {
      return;
    }

    onSubmit(values);
  }

  return (
    <form className="gig-form" onSubmit={handleSubmit} aria-describedby={validationErrors.length ? "gig-form-errors" : undefined}>
      {validationErrors.length > 0 ? (
        <div id="gig-form-errors" className="gig-form-errors" role="alert">
          <strong>Complete these terms before continuing</strong>
          {validationErrors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}
      <FormSection index="01" title="Opportunity brief" consequence="These fields define the published record and its discovery context." className="is-bone">
        <Field label="Title" wide><input required value={values.title} onChange={(event) => updateField("title", event.target.value)} className={inputClasses} /></Field>
        <Field label="Description" wide><textarea required value={values.description} onChange={(event) => updateField("description", event.target.value)} rows={7} className={inputClasses} /></Field>
        <Field label="Tech category"><input required value={values.techCategory} onChange={(event) => updateField("techCategory", event.target.value)} className={inputClasses} /></Field>
        <Field label="Difficulty level"><GigSelect value={values.difficultyLevel} onValueChange={(value) => updateField("difficultyLevel", value)} options={difficultyOptions} placeholder="Select difficulty" className={inputClasses} /></Field>
      </FormSection>

      <FormSection index="02" title="Skills & delivery" consequence="Required skills and deliverables are applicant-relevant material terms." className="is-glass">
        <Field label="Required skills" hint="Comma-separated; at least one."><input required value={values.requiredSkills} onChange={(event) => updateField("requiredSkills", event.target.value)} className={inputClasses} /></Field>
        <Field label="Preferred skills" hint="Comma-separated; optional."><input value={values.preferredSkills} onChange={(event) => updateField("preferredSkills", event.target.value)} className={inputClasses} /></Field>
        <Field label="Deliverables" hint="Comma-separated; at least one." wide><input required value={values.deliverables} onChange={(event) => updateField("deliverables", event.target.value)} className={inputClasses} /></Field>
        <Field label="Experience requirement"><GigSelect required value={values.seniorityNeeded} onValueChange={(value) => updateField("seniorityNeeded", value)} options={seniorityOptions} placeholder="Select experience" className={inputClasses} invalid={validationErrors.includes("Experience requirement is required.")} aria-describedby={validationErrors.length ? "gig-form-errors" : undefined} /></Field>
        <Field label="Work mode"><GigSelect required value={values.workMode} onValueChange={(value) => updateField("workMode", value)} options={workModeOptions} placeholder="Select work mode" className={inputClasses} invalid={validationErrors.includes("Work mode is required.")} aria-describedby={validationErrors.length ? "gig-form-errors" : undefined} /></Field>
        <Field label="Location / timezone requirements" wide><input value={values.locationRequirements} onChange={(event) => updateField("locationRequirements", event.target.value)} className={inputClasses} /></Field>
      </FormSection>

      <FormSection index="03" title="Commercial terms" consequence="Stage 3 preserves the existing complete fixed-price authoring contract." className="is-ocean">
        <Field label="Currency" hint="Three-letter code."><input required maxLength={3} value={values.currency} onChange={(event) => updateField("currency", event.target.value)} className={inputClasses} /></Field>
        <Field label="Budget flexibility"><GigSelect value={values.budgetFlexibility} onValueChange={(value) => updateField("budgetFlexibility", value)} options={budgetFlexibilityOptions} className={inputClasses} /></Field>
        <Field label="Budget minimum"><input required inputMode="numeric" value={values.budgetMin} onChange={(event) => updateField("budgetMin", event.target.value)} className={inputClasses} /></Field>
        <Field label="Budget maximum"><input required inputMode="numeric" value={values.budgetMax} onChange={(event) => updateField("budgetMax", event.target.value)} className={inputClasses} /></Field>
      </FormSection>

      <FormSection index="04" title="Authoritative deadlines" consequence="The server requires a timezone-aware future application deadline; project deadline, when set, follows it." className="is-coral">
        <Field label="Application deadline"><input required type="datetime-local" value={values.deadline} onInput={(event) => updateField("deadline", event.currentTarget.value)} onChange={(event) => updateField("deadline", event.target.value)} className={inputClasses} /></Field>
        <Field label="Project deadline"><input type="datetime-local" value={values.projectDeadline} onInput={(event) => updateField("projectDeadline", event.currentTarget.value)} onChange={(event) => updateField("projectDeadline", event.target.value)} className={inputClasses} /></Field>
      </FormSection>

      <footer className="gig-form-submit"><p>Submission sends one complete candidate snapshot. The backend normalizes and validates it before any immutable version or lifecycle transition is committed.</p><Button type="submit" disabled={isSubmitting}>{isSubmitting ? submittingLabel : submitLabel}</Button></footer>
    </form>
  );
}

function FormSection({ index, title, consequence, className, children }: { index: string; title: string; consequence: string; className: string; children: ReactNode }) {
  return <section className={`gig-form-section ${className}`}><header><span>{index}</span><div><h3>{title}</h3><p>{consequence}</p></div></header><div className="gig-form-fields">{children}</div></section>;
}

function Field({ label, hint, wide = false, children }: { label: string; hint?: string; wide?: boolean; children: ReactNode }) {
  return <label className={wide ? "is-wide" : undefined}><span>{label}</span>{children}{hint ? <small>{hint}</small> : null}</label>;
}
