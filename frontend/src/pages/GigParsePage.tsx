import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { GigSelect } from "../components/GigSelect";
import { useAuth } from "../context/AuthContext";
import { buildGigParseInput, extractGigSkills, fetchGigParse, saveGigParse, type GigParse, type SkillExtractionResult } from "../lib/gigParses";
import { fetchGigForClient, type Gig, type SeniorityNeeded } from "../lib/gigs";
import { formatReviewedAt, reviewWorkspaceLabel, reviewWorkspaceState } from "../lib/profileParsingView";
import { arrayToCsv, csvToArray } from "../lib/profiles";

type ReviewForm = { requiredSkills: string; preferredSkills: string; categories: string; matchedTerms: string; deliverables: string; seniorityLevel: "" | SeniorityNeeded };
const emptyReviewForm: ReviewForm = { requiredSkills: "", preferredSkills: "", categories: "", matchedTerms: "", deliverables: "", seniorityLevel: "" };
const seniorityOptions = ["student", "junior", "mid", "senior", "any"].map((value) => ({ value: value as SeniorityNeeded, label: value[0].toUpperCase() + value.slice(1) }));

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return fallback;
}

function formFromGig(gig: Gig): ReviewForm {
  return { requiredSkills: "", preferredSkills: "", categories: "", matchedTerms: "", deliverables: arrayToCsv(gig.deliverables), seniorityLevel: gig.seniority_needed ?? "" };
}

function formFromParse(parse: GigParse): ReviewForm {
  return { requiredSkills: arrayToCsv(parse.required_skills), preferredSkills: arrayToCsv(parse.preferred_skills), categories: arrayToCsv(parse.categories), matchedTerms: arrayToCsv(parse.matched_terms), deliverables: arrayToCsv(parse.deliverables), seniorityLevel: parse.seniority_level ?? "" };
}

function textForParsing(gig: Gig) {
  return [gig.title, gig.description, `Category: ${gig.tech_category}`, gig.required_skills.length > 0 ? `Required skills: ${gig.required_skills.join(", ")}` : "", gig.preferred_skills.length > 0 ? `Preferred skills: ${gig.preferred_skills.join(", ")}` : "", gig.deliverables.length > 0 ? `Deliverables: ${gig.deliverables.join(", ")}` : ""].filter(Boolean).join("\n\n");
}

function formAfterExtraction(currentForm: ReviewForm, extraction: SkillExtractionResult): ReviewForm {
  return { ...currentForm, requiredSkills: arrayToCsv(extraction.skills), preferredSkills: "", categories: arrayToCsv(extraction.categories), matchedTerms: arrayToCsv(extraction.matched_terms) };
}

export function GigParsePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [gig, setGig] = useState<Gig | null>(null);
  const [savedParse, setSavedParse] = useState<GigParse | null>(null);
  const [reviewForm, setReviewForm] = useState<ReviewForm>(emptyReviewForm);
  const [unmatchedKeywords, setUnmatchedKeywords] = useState<string[]>([]);
  const [hasCandidate, setHasCandidate] = useState(false);
  const [candidateEdited, setCandidateEdited] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const state = reviewWorkspaceState({ isLoading, hasError: Boolean(errorMessage), isExtracting, isSaving, hasSource: Boolean(gig), hasCandidate, candidateEdited, hasSavedParse: Boolean(savedParse) });

  useEffect(() => {
    let isMounted = true;
    async function loadGigAndParse() {
      if (!user || !id) return;
      setIsLoading(true); setErrorMessage(null);
      try {
        const nextGig = await fetchGigForClient(id, user.id);
        if (!isMounted) return;
        if (!nextGig) {
          setGig(null); setSavedParse(null); setErrorMessage("Gig not found or you do not have access to it."); return;
        }
        setGig(nextGig);
        const nextParse = await fetchGigParse(nextGig.id);
        if (!isMounted) return;
        setSavedParse(nextParse);
        setReviewForm(nextParse ? formFromParse(nextParse) : formFromGig(nextGig));
        setUnmatchedKeywords(nextParse?.unmatched_keywords ?? []);
        setHasCandidate(false); setCandidateEdited(false);
      } catch (error) {
        if (isMounted) setErrorMessage(getErrorMessage(error, "Unable to load gig parsing data."));
      } finally { if (isMounted) setIsLoading(false); }
    }
    loadGigAndParse();
    return () => { isMounted = false; };
  }, [id, user]);

  function updateField<Key extends keyof ReviewForm>(key: Key, value: ReviewForm[Key]) {
    setReviewForm((current) => ({ ...current, [key]: value })); setHasCandidate(true); setCandidateEdited(true); setSuccessMessage(null);
  }

  async function handleExtract() {
    if (!gig) return;
    setIsExtracting(true); setErrorMessage(null); setSuccessMessage(null);
    try {
      const extraction = await extractGigSkills(textForParsing(gig));
      setReviewForm((current) => formAfterExtraction(current, extraction));
      setUnmatchedKeywords(extraction.unmatched_keywords); setHasCandidate(true); setCandidateEdited(false);
      setSuccessMessage("Candidate extracted from the current gig source. Review and correct it before saving.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to extract gig requirements."));
    } finally { setIsExtracting(false); }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!gig) return;
    setIsSaving(true); setErrorMessage(null); setSuccessMessage(null);
    try {
      const input = buildGigParseInput(gig.id, csvToArray(reviewForm.requiredSkills), csvToArray(reviewForm.preferredSkills), csvToArray(reviewForm.categories), csvToArray(reviewForm.matchedTerms), unmatchedKeywords, reviewForm.seniorityLevel || null, csvToArray(reviewForm.deliverables));
      await saveGigParse(input, Boolean(savedParse));
      const latestParse = await fetchGigParse(gig.id);
      setSavedParse(latestParse); setHasCandidate(false); setCandidateEdited(false);
      setSuccessMessage("Reviewed gig input saved. Published terms, versions, lifecycle, applications, and selections were not changed.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to save reviewed gig parse."));
    } finally { setIsSaving(false); }
  }

  return (
    <div className="stage-ten-page parsing-workspace-page">
      <header className="stage-ten-hero">
        <div><p>GIG / MATCHING-INPUT REVIEW</p><h1>Review the signals. Leave gig authority intact.</h1><span>The current owned gig is the source. Deterministic extraction creates an editable matching-input candidate; it is not an alternate published-gig editor.</span></div>
        <div className="stage-ten-hero-meta"><span>Current state</span><strong>{reviewWorkspaceLabel(state)}</strong><small>Owning-client route · RLS-protected parse write</small><Button to="/gigs/manage" variant="secondary">Back to manage gigs</Button></div>
      </header>

      <ol className="stage-ten-sequence" aria-label="Gig parse review workflow">
        <li className={gig ? "is-active" : ""}><span>01</span><strong>Gig source</strong><small>{gig ? "Owned record loaded" : "Unavailable"}</small></li>
        <li className={isExtracting || hasCandidate ? "is-active" : ""}><span>02</span><strong>Extraction</strong><small>{isExtracting ? "Running" : hasCandidate ? "Candidate ready" : "Not run"}</small></li>
        <li className={hasCandidate ? "is-active" : ""}><span>03</span><strong>Review</strong><small>{candidateEdited ? "Candidate edited" : hasCandidate ? "Correction available" : "Awaiting candidate"}</small></li>
        <li className={savedParse ? "is-active" : ""}><span>04</span><strong>Saved parse</strong><small>{savedParse ? "Reviewed" : "Not saved"}</small></li>
        <li><span>05</span><strong>Matching role</strong><small>Gig authority retained</small></li>
      </ol>

      {isLoading ? <section className="stage-ten-state" aria-live="polite"><span>Loading</span><h2>Opening the owned gig source.</h2><p>The gig and its reviewed parse are loaded through their existing owner-scoped helpers.</p></section> : null}
      {!isLoading && !gig ? <section className="stage-ten-state is-error"><span>Controlled error</span><h2>Gig source unavailable.</h2><p>{errorMessage ?? "The requested gig could not be loaded."}</p><Button to="/gigs/manage" variant="secondary">Return to manage gigs</Button></section> : null}

      {!isLoading && gig ? (
        <div className="stage-ten-parser-grid">
          <div className="stage-ten-parser-main">
            <section className="stage-ten-source-panel gig-parse-source">
              <header><div><span>01 / Authoritative source</span><h2>{gig.title}</h2></div><p>{gig.status} · {gig.tech_category}</p></header>
              <div className="stage-ten-gig-source-copy"><p>{gig.description}</p><dl><div><dt>Required skills</dt><dd>{arrayToCsv(gig.required_skills) || "None in current gig source"}</dd></div><div><dt>Preferred skills</dt><dd>{arrayToCsv(gig.preferred_skills) || "None in current gig source"}</dd></div><div><dt>Seniority</dt><dd>{gig.seniority_needed ?? "Not set"}</dd></div><div><dt>Deliverables</dt><dd>{arrayToCsv(gig.deliverables) || "None in current gig source"}</dd></div></dl></div>
              <div className="stage-ten-inline-actions"><Button type="button" onClick={handleExtract} disabled={isExtracting}>{isExtracting ? "Extracting candidate…" : "Extract requirements candidate"}</Button><Button to={`/gigs/${gig.id}/edit`} variant="secondary">Edit through gig authority</Button></div>
              <p className="stage-ten-authority-note">Editing published terms belongs to the Stage 3 gig-management flow. This workspace never creates a gig version or changes lifecycle, intake, application staleness, or selection authority.</p>
            </section>

            <form className="stage-ten-review-panel" onSubmit={handleSave}>
              <header><div><span>02–03 / Extraction + review</span><h2>Editable matching-input candidate</h2></div><p>{candidateEdited ? "Client-edited" : hasCandidate ? "Parser candidate" : "Awaiting extraction"}</p></header>
              <div className="stage-ten-form-grid">
                <label className="is-wide"><span>Required skills</span><input value={reviewForm.requiredSkills} onChange={(event) => updateField("requiredSkills", event.target.value)} placeholder="React, FastAPI, PostgreSQL" /></label>
                <label className="is-wide"><span>Preferred skills</span><input value={reviewForm.preferredSkills} onChange={(event) => updateField("preferredSkills", event.target.value)} placeholder="Docker, AWS" /></label>
                <label><span>Categories</span><input value={reviewForm.categories} onChange={(event) => updateField("categories", event.target.value)} placeholder="frontend, backend" /></label>
                <label><span>Matched terms</span><input value={reviewForm.matchedTerms} onChange={(event) => updateField("matchedTerms", event.target.value)} placeholder="react, fastapi" /></label>
                <label><span>Seniority level</span><GigSelect value={reviewForm.seniorityLevel} onValueChange={(value) => updateField("seniorityLevel", value)} options={seniorityOptions} placeholder="Select seniority" /></label>
                <label><span>Deliverables</span><input value={reviewForm.deliverables} onChange={(event) => updateField("deliverables", event.target.value)} placeholder="API routes, dashboard" /></label>
              </div>
              <div className="stage-ten-candidate-meta"><span>Method · deterministic_v1</span><span>Confidence label · deterministic</span><span>Unmatched keywords · {unmatchedKeywords.length}</span></div>
              <div className="stage-ten-form-footer"><div aria-live="polite">{errorMessage ? <p className="stage-ten-notice is-error" role="alert">{errorMessage}</p> : null}{successMessage ? <p className="stage-ten-notice is-success">{successMessage}</p> : null}</div><Button type="submit" disabled={isSaving}>{isSaving ? "Saving reviewed input…" : "Save reviewed gig input"}</Button></div>
            </form>
          </div>

          <aside className="stage-ten-saved-rail">
            <section className="is-ocean"><span>04 / Saved input</span><h2>{savedParse ? "Reviewed parse on record" : "Nothing reviewed yet"}</h2>{savedParse ? <><time dateTime={savedParse.updated_at}>{formatReviewedAt(savedParse.updated_at)}</time><dl><div><dt>Required</dt><dd>{arrayToCsv(savedParse.required_skills) || "None saved"}</dd></div><div><dt>Preferred</dt><dd>{arrayToCsv(savedParse.preferred_skills) || "None saved"}</dd></div><div><dt>Status</dt><dd>{savedParse.status}</dd></div></dl></> : <p>Extraction output remains an unsaved candidate until this client explicitly saves the reviewed fields.</p>}</section>
            <section><span>05 / Matching role</span><h2>Authoritative gig + selected parse</h2><p>The matching service prefers reviewed parses over parsed candidates, excludes failed parses, and uses the newest timestamp within the same supported status.</p><p>Structured gig title, description, category, difficulty, status, and supported seniority take precedence. Supported skills and deliverables merge with parse values. Price and proposal terms do not enter suitability ranking.</p></section>
            <section className="is-coral"><span>Authority boundary</span><h2>Parse save has no gig consequences.</h2><p>Saving here does not publish, version, pause, close, fill, cancel, invalidate applications, alter staleness, or change a selection request. It also does not trigger matching or promise a ranking change.</p></section>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
