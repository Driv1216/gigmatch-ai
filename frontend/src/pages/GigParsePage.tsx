import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { PageContainer } from "../components/PageContainer";
import { useAuth } from "../context/AuthContext";
import { fetchGigForClient, type Gig, type SeniorityNeeded } from "../lib/gigs";
import {
  buildGigParseInput,
  extractGigSkills,
  fetchGigParse,
  saveGigParse,
  type GigParse,
  type SkillExtractionResult,
} from "../lib/gigParses";
import { arrayToCsv, csvToArray } from "../lib/profiles";

type ReviewForm = {
  requiredSkills: string;
  preferredSkills: string;
  categories: string;
  matchedTerms: string;
  deliverables: string;
  seniorityLevel: "" | SeniorityNeeded;
};

const emptyReviewForm: ReviewForm = {
  requiredSkills: "",
  preferredSkills: "",
  categories: "",
  matchedTerms: "",
  deliverables: "",
  seniorityLevel: "",
};

const inputClasses =
  "mt-2 w-full rounded-md border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return fallback;
}

function formFromGig(gig: Gig): ReviewForm {
  return {
    requiredSkills: "",
    preferredSkills: "",
    categories: "",
    matchedTerms: "",
    deliverables: arrayToCsv(gig.deliverables),
    seniorityLevel: gig.seniority_needed ?? "",
  };
}

function formFromParse(parse: GigParse): ReviewForm {
  return {
    requiredSkills: arrayToCsv(parse.required_skills),
    preferredSkills: arrayToCsv(parse.preferred_skills),
    categories: arrayToCsv(parse.categories),
    matchedTerms: arrayToCsv(parse.matched_terms),
    deliverables: arrayToCsv(parse.deliverables),
    seniorityLevel: parse.seniority_level ?? "",
  };
}

function textForParsing(gig: Gig) {
  return [
    gig.title,
    gig.description,
    `Category: ${gig.tech_category}`,
    gig.required_skills.length > 0 ? `Required skills: ${gig.required_skills.join(", ")}` : "",
    gig.preferred_skills.length > 0 ? `Preferred skills: ${gig.preferred_skills.join(", ")}` : "",
    gig.deliverables.length > 0 ? `Deliverables: ${gig.deliverables.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function formAfterExtraction(currentForm: ReviewForm, extraction: SkillExtractionResult): ReviewForm {
  return {
    ...currentForm,
    requiredSkills: arrayToCsv(extraction.skills),
    preferredSkills: "",
    categories: arrayToCsv(extraction.categories),
    matchedTerms: arrayToCsv(extraction.matched_terms),
  };
}

export function GigParsePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [gig, setGig] = useState<Gig | null>(null);
  const [savedParse, setSavedParse] = useState<GigParse | null>(null);
  const [reviewForm, setReviewForm] = useState<ReviewForm>(emptyReviewForm);
  const [unmatchedKeywords, setUnmatchedKeywords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadGigAndParse() {
      if (!user || !id) {
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextGig = await fetchGigForClient(id, user.id);

        if (!isMounted) {
          return;
        }

        if (!nextGig) {
          setGig(null);
          setSavedParse(null);
          setErrorMessage("Gig not found or you do not have access to it.");
          return;
        }

        setGig(nextGig);

        const nextParse = await fetchGigParse(nextGig.id);

        if (!isMounted) {
          return;
        }

        setSavedParse(nextParse);

        if (nextParse) {
          setReviewForm(formFromParse(nextParse));
          setUnmatchedKeywords(nextParse.unmatched_keywords);
        } else {
          setReviewForm(formFromGig(nextGig));
          setUnmatchedKeywords([]);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getErrorMessage(error, "Unable to load gig parsing data."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadGigAndParse();

    return () => {
      isMounted = false;
    };
  }, [id, user]);

  function updateField<Key extends keyof ReviewForm>(key: Key, value: ReviewForm[Key]) {
    setReviewForm((current) => ({ ...current, [key]: value }));
  }

  async function handleExtract() {
    if (!gig) {
      return;
    }

    setIsExtracting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const extraction = await extractGigSkills(textForParsing(gig));
      setReviewForm((current) => formAfterExtraction(current, extraction));
      setUnmatchedKeywords(extraction.unmatched_keywords);
      setSuccessMessage("Requirements extracted. Review the result before saving.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to extract gig requirements."));
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!gig) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const input = buildGigParseInput(
        gig.id,
        csvToArray(reviewForm.requiredSkills),
        csvToArray(reviewForm.preferredSkills),
        csvToArray(reviewForm.categories),
        csvToArray(reviewForm.matchedTerms),
        unmatchedKeywords,
        reviewForm.seniorityLevel || null,
        csvToArray(reviewForm.deliverables),
      );

      await saveGigParse(input, Boolean(savedParse));
      const latestParse = await fetchGigParse(gig.id);
      setSavedParse(latestParse);
      setSuccessMessage("Reviewed gig parse saved.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to save reviewed gig parse."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PageContainer>
      <div className="rounded-lg border border-line bg-white p-8 shadow-soft">
        <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">Gig Parsing</p>
            <h1 className="mt-3 text-3xl font-bold tracking-normal text-ink">Gig Requirement Parser</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
              Parse an existing gig description with deterministic skill extraction, then review and save structured
              requirements for future matching work.
            </p>
          </div>
          <Button to="/gigs/manage" variant="secondary">
            Manage Gigs
          </Button>
        </div>

        {isLoading ? <p className="mt-8 text-sm font-medium text-muted">Loading gig requirements...</p> : null}

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

        {!isLoading && gig ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <section className="border-b border-line pb-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-accent">Source Gig</p>
                <h2 className="mt-2 text-2xl font-bold tracking-normal text-ink">{gig.title}</h2>
                <p className="mt-2 text-sm font-semibold text-muted">{gig.tech_category}</p>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-ink">{gig.description}</p>
              </section>

              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={handleExtract} disabled={isExtracting}>
                  {isExtracting ? "Extracting..." : "Extract Requirements"}
                </Button>
                <Button to={`/gigs/${gig.id}/edit`} variant="secondary">
                  Edit Source Gig
                </Button>
              </div>

              <form className="border-t border-line pt-6" onSubmit={handleSave}>
                <div className="flex flex-col gap-2 border-b border-line pb-5">
                  <p className="text-sm font-semibold uppercase tracking-wide text-accent">Review Output</p>
                  <h2 className="text-xl font-bold tracking-normal text-ink">Editable requirement result</h2>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <label className="block md:col-span-2">
                    <span className="text-sm font-semibold text-ink">Required Skills</span>
                    <input
                      value={reviewForm.requiredSkills}
                      onChange={(event) => updateField("requiredSkills", event.target.value)}
                      className={inputClasses}
                      placeholder="React, FastAPI, PostgreSQL"
                    />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="text-sm font-semibold text-ink">Preferred Skills</span>
                    <input
                      value={reviewForm.preferredSkills}
                      onChange={(event) => updateField("preferredSkills", event.target.value)}
                      className={inputClasses}
                      placeholder="Docker, AWS"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Categories</span>
                    <input
                      value={reviewForm.categories}
                      onChange={(event) => updateField("categories", event.target.value)}
                      className={inputClasses}
                      placeholder="frontend, backend"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Matched Terms</span>
                    <input
                      value={reviewForm.matchedTerms}
                      onChange={(event) => updateField("matchedTerms", event.target.value)}
                      className={inputClasses}
                      placeholder="react, fastapi"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Seniority Level</span>
                    <select
                      value={reviewForm.seniorityLevel}
                      onChange={(event) => updateField("seniorityLevel", event.target.value as ReviewForm["seniorityLevel"])}
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
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Deliverables</span>
                    <input
                      value={reviewForm.deliverables}
                      onChange={(event) => updateField("deliverables", event.target.value)}
                      className={inputClasses}
                      placeholder="API routes, dashboard, deployment"
                    />
                  </label>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Reviewed Requirements"}
                  </Button>
                  <p className="text-sm text-muted">Confidence: deterministic</p>
                </div>
              </form>
            </div>

            <aside className="border-t border-line pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">Saved Parse</p>
              {savedParse ? (
                <div className="mt-4 space-y-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Last Updated</p>
                    <p className="mt-1 text-sm font-medium text-ink">{new Date(savedParse.updated_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Required Skills</p>
                    <p className="mt-1 text-sm leading-6 text-ink">
                      {arrayToCsv(savedParse.required_skills) || "No required skills saved yet."}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Preferred Skills</p>
                    <p className="mt-1 text-sm leading-6 text-ink">
                      {arrayToCsv(savedParse.preferred_skills) || "No preferred skills saved yet."}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Categories</p>
                    <p className="mt-1 text-sm leading-6 text-ink">
                      {arrayToCsv(savedParse.categories) || "No categories saved yet."}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Deliverables</p>
                    <p className="mt-1 text-sm leading-6 text-ink">
                      {arrayToCsv(savedParse.deliverables) || "No deliverables saved yet."}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-muted">
                  No reviewed parse is saved for this gig yet. Extract requirements, edit the fields, then save the
                  result.
                </p>
              )}
            </aside>
          </div>
        ) : null}
      </div>
    </PageContainer>
  );
}
