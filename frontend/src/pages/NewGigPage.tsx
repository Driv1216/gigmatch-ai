import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GigForm, getParsedBudgets, type GigFormValues } from "../components/GigForm";
import { Button } from "../components/Button";
import { PageContainer } from "../components/PageContainer";
import { useAuth } from "../context/AuthContext";
import { createGig, type GigInput } from "../lib/gigs";
import { csvToArray } from "../lib/profiles";

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
    deadline: values.deadline || null,
    status: values.status,
  };
}

export function NewGigPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(values: GigFormValues) {
    if (!user) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createGig(inputFromValues(values, user.id));
      navigate("/gigs/manage");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create gig.");
      setIsSubmitting(false);
    }
  }

  return (
    <PageContainer>
      <div className="rounded-lg border border-line bg-white p-8 shadow-soft">
        <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">Client Gig</p>
            <h1 className="mt-3 text-3xl font-bold tracking-normal text-ink">Post a New Gig</h1>
          </div>
          <Button to="/gigs/manage" variant="secondary">
            Manage Gigs
          </Button>
        </div>

        {errorMessage ? (
          <p className="mt-8 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <GigForm
          isSubmitting={isSubmitting}
          submitLabel="Create Gig"
          submittingLabel="Creating..."
          onSubmit={handleSubmit}
        />
      </div>
    </PageContainer>
  );
}
