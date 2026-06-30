import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { GigForm, formFromGig, getParsedBudgets, type GigFormValues } from "../components/GigForm";
import { PageContainer } from "../components/PageContainer";
import { useAuth } from "../context/AuthContext";
import { fetchGigForClient, updateGig, type GigUpdateInput } from "../lib/gigs";
import { csvToArray } from "../lib/profiles";

function updateInputFromValues(values: GigFormValues): GigUpdateInput {
  const { budgetMin, budgetMax } = getParsedBudgets(values);

  return {
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

export function EditGigPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [initialValues, setInitialValues] = useState<GigFormValues | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadGig() {
      if (!user || !id) {
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const gig = await fetchGigForClient(id, user.id);

        if (!isMounted) {
          return;
        }

        if (!gig) {
          setInitialValues(null);
          setErrorMessage("Gig not found or you do not have access to it.");
          return;
        }

        setInitialValues(formFromGig(gig));
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load gig.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadGig();

    return () => {
      isMounted = false;
    };
  }, [id, user]);

  async function handleSubmit(values: GigFormValues) {
    if (!user || !id) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await updateGig(id, user.id, updateInputFromValues(values));
      setSuccessMessage("Gig updated.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update gig.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageContainer>
      <div className="rounded-lg border border-line bg-white p-8 shadow-soft">
        <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">Client Gig</p>
            <h1 className="mt-3 text-3xl font-bold tracking-normal text-ink">Edit Gig</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button to="/gigs/manage" variant="secondary">
              Manage Gigs
            </Button>
            <Button to="/dashboard/client" variant="secondary">
              Dashboard
            </Button>
          </div>
        </div>

        {isLoading ? <p className="mt-8 text-sm font-medium text-muted">Loading gig...</p> : null}

        {errorMessage ? (
          <p className="mt-8 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="mt-8 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {successMessage}
          </p>
        ) : null}

        {!isLoading && initialValues ? (
          <GigForm
            initialValues={initialValues}
            isSubmitting={isSubmitting}
            submitLabel="Update Gig"
            submittingLabel="Updating..."
            onSubmit={handleSubmit}
          />
        ) : null}

        {!isLoading && !initialValues && !errorMessage ? (
          <div className="mt-8">
            <Button onClick={() => navigate("/gigs/manage")}>Back to Manage Gigs</Button>
          </div>
        ) : null}
      </div>
    </PageContainer>
  );
}
