import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GigForm, getParsedBudgets, snapshotFromGigForm, type GigFormValues } from "../components/GigForm";
import { Button } from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { createGig, type GigInput } from "../lib/gigs";
import { csvToArray } from "../lib/profiles";
import { managementErrorMessage, publishManagedGig } from "../lib/gigManagement";

function inputFromValues(values: GigFormValues, clientId: string): GigInput {
  const { budgetMin, budgetMax } = getParsedBudgets(values);

  return {
    client_id: clientId,
    title: values.title.trim(),
    description: values.description.trim(),
    tech_category: values.techCategory.trim(),
    required_skills: csvToArray(values.requiredSkills),
    preferred_skills: csvToArray(values.preferredSkills),
    budget_min: budgetMin,
    budget_max: budgetMax,
    difficulty_level: values.difficultyLevel || null,
    seniority_needed: values.seniorityNeeded || null,
    deliverables: csvToArray(values.deliverables),
    work_mode: values.workMode || null,
    deadline: values.deadline ? new Date(values.deadline).toISOString() : null,
    status: "draft",
  };
}

export function NewGigPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedDraft, setSavedDraft] = useState<{ id: string; current_gig_version_id: string } | null>(null);

  async function handleSubmit(values: GigFormValues) {
    if (!user) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const draft = savedDraft ?? await createGig(inputFromValues(values, user.id));
      setSavedDraft(draft);
      await publishManagedGig(draft.id, draft.current_gig_version_id, snapshotFromGigForm(values));
      navigate("/gigs/manage");
    } catch (error) {
      setErrorMessage(managementErrorMessage(error));
      setIsSubmitting(false);
    }
  }

  return (
    <section className="stage-three-page gig-authoring-page">
      <header className="stage-three-editorial-header">
        <div>
          <p>Client operations / New authority</p>
          <h1>Create a Gig</h1>
        </div>
        <div className="stage-three-editorial-context">
          <span>Draft → publish</span>
          <p>A valid submission creates one genuine owned draft, then publishes complete contract-one terms. If publication fails, Retry reuses that draft.</p>
          <Button to="/gigs/manage" variant="secondary">Manage gigs</Button>
        </div>
      </header>
      {savedDraft ? <div className="stage-three-notice is-warning" role="status"><strong>Draft secured for retry</strong><p>Publication did not create another draft. Your next valid attempt will reuse the existing owned draft.</p></div> : null}
      {errorMessage ? <div className="stage-three-notice is-error" role="alert"><strong>Publication did not complete</strong><p>{errorMessage}</p></div> : null}
      <div className="gig-authoring-board">
        <header><span>Canonical contract</span><h2>Complete publication terms</h2><p>All fields below form one complete version snapshot. Validation here supports entry; backend and database authority make the final decision.</p></header>
        <GigForm
          isSubmitting={isSubmitting}
          submitLabel={savedDraft ? "Retry publication" : "Create draft & publish"}
          submittingLabel={savedDraft ? "Retrying publication…" : "Creating and publishing…"}
          onSubmit={handleSubmit}
        />
      </div>
    </section>
  );
}
