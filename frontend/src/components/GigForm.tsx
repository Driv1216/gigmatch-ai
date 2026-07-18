/* eslint-disable react-refresh/only-export-components */
import { useState, type FormEvent } from "react";
import { arrayToCsv, csvToArray } from "../lib/profiles";
import type { DifficultyLevel, Gig, SeniorityNeeded, WorkMode } from "../lib/gigs";
import { Button } from "./Button";

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

const inputClasses =
  "mt-2 w-full rounded-md border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100";

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
    <form className="mt-8 space-y-8" onSubmit={handleSubmit}>
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="text-sm font-semibold text-ink">Title</span>
          <input
            value={values.title}
            onChange={(event) => updateField("title", event.target.value)}
            className={inputClasses}
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm font-semibold text-ink">Description</span>
          <textarea
            value={values.description}
            onChange={(event) => updateField("description", event.target.value)}
            rows={6}
            className={inputClasses}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Tech Category</span>
          <input
            value={values.techCategory}
            onChange={(event) => updateField("techCategory", event.target.value)}
            className={inputClasses}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Currency</span>
          <input maxLength={3} value={values.currency} onChange={(event) => updateField("currency", event.target.value)} className={inputClasses} />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Required Skills</span>
          <input
            value={values.requiredSkills}
            onChange={(event) => updateField("requiredSkills", event.target.value)}
            className={inputClasses}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Budget Flexibility</span>
          <select value={values.budgetFlexibility} onChange={(event) => updateField("budgetFlexibility", event.target.value)} className={inputClasses}>
            <option value="fixed">Fixed</option><option value="negotiable">Negotiable</option><option value="depends_on_scope">Depends on scope</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Preferred Skills</span>
          <input
            value={values.preferredSkills}
            onChange={(event) => updateField("preferredSkills", event.target.value)}
            className={inputClasses}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Budget Min</span>
          <input
            inputMode="numeric"
            value={values.budgetMin}
            onChange={(event) => updateField("budgetMin", event.target.value)}
            className={inputClasses}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Budget Max</span>
          <input
            inputMode="numeric"
            value={values.budgetMax}
            onChange={(event) => updateField("budgetMax", event.target.value)}
            className={inputClasses}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Difficulty Level</span>
          <select
            value={values.difficultyLevel}
            onChange={(event) => updateField("difficultyLevel", event.target.value as GigFormValues["difficultyLevel"])}
            className={inputClasses}
          >
            <option value="">Select difficulty</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Seniority Needed</span>
          <select
            value={values.seniorityNeeded}
            onChange={(event) => updateField("seniorityNeeded", event.target.value as GigFormValues["seniorityNeeded"])}
            className={inputClasses}
          >
            <option value="">Select seniority</option>
            <option value="student">Student</option>
            <option value="junior">Junior</option>
            <option value="mid">Mid</option>
            <option value="senior">Senior</option>
            <option value="any">Any</option>
          </select>
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm font-semibold text-ink">Deliverables</span>
          <input
            value={values.deliverables}
            onChange={(event) => updateField("deliverables", event.target.value)}
            className={inputClasses}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Work Mode</span>
          <select
            value={values.workMode}
            onChange={(event) => updateField("workMode", event.target.value as GigFormValues["workMode"])}
            className={inputClasses}
          >
            <option value="">Select work mode</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">Onsite</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Application Deadline</span>
          <input
            type="datetime-local"
            value={values.deadline}
            onChange={(event) => updateField("deadline", event.target.value)}
            className={inputClasses}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Project Deadline</span>
          <input type="datetime-local" value={values.projectDeadline} onChange={(event) => updateField("projectDeadline", event.target.value)} className={inputClasses} />
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm font-semibold text-ink">Location / Timezone Requirements</span>
          <input value={values.locationRequirements} onChange={(event) => updateField("locationRequirements", event.target.value)} className={inputClasses} />
        </label>
      </div>

      {validationErrors.length > 0 ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {validationErrors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? submittingLabel : submitLabel}
      </Button>
    </form>
  );
}
