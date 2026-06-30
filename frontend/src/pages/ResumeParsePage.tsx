import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "../components/Button";
import { PageContainer } from "../components/PageContainer";
import { useAuth } from "../context/AuthContext";
import { arrayToCsv, csvToArray } from "../lib/profiles";
import {
  buildResumeParseInput,
  extractResumeSkills,
  fetchResumeParse,
  saveResumeParse,
  type ResumeParse,
  type SkillExtractionResult,
} from "../lib/resumeParses";

type ReviewForm = {
  skills: string;
  categories: string;
  matchedTerms: string;
};

const emptyExtraction: SkillExtractionResult = {
  skills: [],
  categories: [],
  matched_terms: [],
  unmatched_keywords: [],
  confidence: "deterministic",
};

const inputClasses =
  "mt-2 w-full rounded-md border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100";

function formFromExtraction(extraction: SkillExtractionResult): ReviewForm {
  return {
    skills: arrayToCsv(extraction.skills),
    categories: arrayToCsv(extraction.categories),
    matchedTerms: arrayToCsv(extraction.matched_terms),
  };
}

function extractionFromForm(form: ReviewForm, unmatchedKeywords: string[]): SkillExtractionResult {
  return {
    skills: csvToArray(form.skills),
    categories: csvToArray(form.categories),
    matched_terms: csvToArray(form.matchedTerms),
    unmatched_keywords: unmatchedKeywords,
    confidence: "deterministic",
  };
}

function savedExtractionFromParse(parse: ResumeParse): SkillExtractionResult {
  return {
    skills: parse.skills,
    categories: parse.categories,
    matched_terms: parse.matched_terms,
    unmatched_keywords: parse.unmatched_keywords,
    confidence: parse.confidence,
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return fallback;
}

export function ResumeParsePage() {
  const { user } = useAuth();
  const [resumeText, setResumeText] = useState("");
  const [savedParse, setSavedParse] = useState<ResumeParse | null>(null);
  const [reviewForm, setReviewForm] = useState<ReviewForm>(formFromExtraction(emptyExtraction));
  const [unmatchedKeywords, setUnmatchedKeywords] = useState<string[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const reviewedExtraction = useMemo(
    () => extractionFromForm(reviewForm, unmatchedKeywords),
    [reviewForm, unmatchedKeywords],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadSavedParse() {
      if (!user) {
        return;
      }

      setIsLoadingSaved(true);
      setErrorMessage(null);

      try {
        const parse = await fetchResumeParse(user.id);

        if (!isMounted) {
          return;
        }

        setSavedParse(parse);

        if (parse) {
          const savedExtraction = savedExtractionFromParse(parse);
          setReviewForm(formFromExtraction(savedExtraction));
          setUnmatchedKeywords(savedExtraction.unmatched_keywords);
          setResumeText(parse.extracted_text_preview ?? "");
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getErrorMessage(error, "Unable to load saved resume parse."));
        }
      } finally {
        if (isMounted) {
          setIsLoadingSaved(false);
        }
      }
    }

    loadSavedParse();

    return () => {
      isMounted = false;
    };
  }, [user]);

  function updateField<Key extends keyof ReviewForm>(key: Key, value: ReviewForm[Key]) {
    setReviewForm((current) => ({ ...current, [key]: value }));
  }

  async function handleExtract() {
    setIsExtracting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const extraction = await extractResumeSkills(resumeText);
      setReviewForm(formFromExtraction(extraction));
      setUnmatchedKeywords(extraction.unmatched_keywords);
      setSuccessMessage("Skills extracted. Review the result before saving.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to extract resume skills."));
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const input = buildResumeParseInput(user.id, resumeText, reviewedExtraction);
      await saveResumeParse(input, Boolean(savedParse));
      const latestParse = await fetchResumeParse(user.id);
      setSavedParse(latestParse);
      setSuccessMessage("Reviewed resume parse saved.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to save reviewed resume parse."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PageContainer>
      <div className="rounded-lg border border-line bg-white p-8 shadow-soft">
        <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">Resume Parsing</p>
            <h1 className="mt-3 text-3xl font-bold tracking-normal text-ink">Resume Text Parser</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
              Paste resume text to extract technical skills with the deterministic parser. PDF and DOCX upload come later;
              this version saves only reviewed structured output and a short text preview.
            </p>
          </div>
          <Button to="/dashboard/freelancer" variant="secondary">
            Back to Dashboard
          </Button>
        </div>

        {isLoadingSaved ? (
          <p className="mt-8 text-sm font-medium text-muted">Loading saved resume parse...</p>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <label className="block">
                <span className="text-sm font-semibold text-ink">Resume Text</span>
                <textarea
                  value={resumeText}
                  onChange={(event) => setResumeText(event.target.value)}
                  rows={12}
                  className={`${inputClasses} font-mono leading-6`}
                  placeholder="Paste resume text here..."
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={handleExtract} disabled={isExtracting}>
                  {isExtracting ? "Extracting..." : "Extract Skills"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setResumeText("")}>
                  Clear Text
                </Button>
              </div>

              {errorMessage ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {errorMessage}
                </p>
              ) : null}
              {successMessage ? (
                <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  {successMessage}
                </p>
              ) : null}

              <form className="border-t border-line pt-6" onSubmit={handleSave}>
                <div className="flex flex-col gap-2 border-b border-line pb-5">
                  <p className="text-sm font-semibold uppercase tracking-wide text-accent">Review Output</p>
                  <h2 className="text-xl font-bold tracking-normal text-ink">Editable structured result</h2>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <label className="block md:col-span-2">
                    <span className="text-sm font-semibold text-ink">Skills</span>
                    <input
                      value={reviewForm.skills}
                      onChange={(event) => updateField("skills", event.target.value)}
                      className={inputClasses}
                      placeholder="React, FastAPI, PostgreSQL"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Categories</span>
                    <input
                      value={reviewForm.categories}
                      onChange={(event) => updateField("categories", event.target.value)}
                      className={inputClasses}
                      placeholder="frontend, backend, database"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Matched Terms</span>
                    <input
                      value={reviewForm.matchedTerms}
                      onChange={(event) => updateField("matchedTerms", event.target.value)}
                      className={inputClasses}
                      placeholder="react, fastapi, postgresql"
                    />
                  </label>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Reviewed Result"}
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
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Saved Skills</p>
                    <p className="mt-1 text-sm leading-6 text-ink">{arrayToCsv(savedParse.skills) || "No skills saved yet."}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Saved Categories</p>
                    <p className="mt-1 text-sm leading-6 text-ink">
                      {arrayToCsv(savedParse.categories) || "No categories saved yet."}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Stored Preview</p>
                    <p className="mt-1 max-h-40 overflow-auto rounded-md border border-line bg-white p-3 text-xs leading-5 text-muted">
                      {savedParse.extracted_text_preview || "No preview stored."}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-muted">
                  No reviewed resume parse is saved yet. Extract skills, review the fields, then save the result.
                </p>
              )}
            </aside>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
