import { useEffect, useState, type FormEvent } from "react";
import { Button } from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { formatReviewedAt, reviewWorkspaceLabel, reviewWorkspaceState } from "../lib/profileParsingView";
import { arrayToCsv, csvToArray } from "../lib/profiles";
import {
  buildResumeParseInput,
  extractResumeDocumentText,
  extractResumeSkills,
  fetchResumeParse,
  saveResumeParse,
  type ResumeDocumentSource,
  type ResumeParse,
  type SkillExtractionResult,
} from "../lib/resumeParses";

type ReviewForm = { skills: string; categories: string; matchedTerms: string };
const emptyExtraction: SkillExtractionResult = { skills: [], categories: [], matched_terms: [], unmatched_keywords: [], confidence: "deterministic" };
const MAX_RESUME_DOCUMENT_BYTES = 5 * 1024 * 1024;
const SUPPORTED_RESUME_DOCUMENT_EXTENSIONS = [".pdf", ".docx"];

function formFromExtraction(extraction: SkillExtractionResult): ReviewForm {
  return { skills: arrayToCsv(extraction.skills), categories: arrayToCsv(extraction.categories), matchedTerms: arrayToCsv(extraction.matched_terms) };
}

function extractionFromForm(form: ReviewForm, unmatchedKeywords: string[]): SkillExtractionResult {
  return { skills: csvToArray(form.skills), categories: csvToArray(form.categories), matched_terms: csvToArray(form.matchedTerms), unmatched_keywords: unmatchedKeywords, confidence: "deterministic" };
}

function savedExtractionFromParse(parse: ResumeParse): SkillExtractionResult {
  return { skills: parse.skills, categories: parse.categories, matched_terms: parse.matched_terms, unmatched_keywords: parse.unmatched_keywords, confidence: parse.confidence };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return fallback;
}

function getFileExtension(fileName: string) {
  const extensionStart = fileName.lastIndexOf(".");
  return extensionStart >= 0 ? fileName.slice(extensionStart).toLowerCase() : "";
}

function validateResumeDocumentFile(file: File | null) {
  if (!file) return "Select a PDF or DOCX resume file first.";
  if (!SUPPORTED_RESUME_DOCUMENT_EXTENSIONS.includes(getFileExtension(file.name))) return "Upload a PDF or DOCX resume file.";
  if (file.size > MAX_RESUME_DOCUMENT_BYTES) return "Resume document is too large. Maximum size is 5 MB.";
  if (file.size === 0) return "Resume document file is empty.";
  return null;
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024 * 1024) return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ResumeParsePage() {
  const { user } = useAuth();
  const [resumeText, setResumeText] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  const [documentSource, setDocumentSource] = useState<ResumeDocumentSource | null>(null);
  const [savedParse, setSavedParse] = useState<ResumeParse | null>(null);
  const [reviewForm, setReviewForm] = useState<ReviewForm>(formFromExtraction(emptyExtraction));
  const [unmatchedKeywords, setUnmatchedKeywords] = useState<string[]>([]);
  const [hasCandidate, setHasCandidate] = useState(false);
  const [candidateEdited, setCandidateEdited] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [isExtractingDocument, setIsExtractingDocument] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const state = reviewWorkspaceState({ isLoading: isLoadingSaved, hasError: Boolean(errorMessage), isExtracting: isExtracting || isExtractingDocument, isSaving, hasSource: Boolean(resumeText.trim()), hasCandidate, candidateEdited, hasSavedParse: Boolean(savedParse) });

  useEffect(() => {
    let isMounted = true;
    async function loadSavedParse() {
      if (!user) return;
      setIsLoadingSaved(true); setErrorMessage(null);
      try {
        const parse = await fetchResumeParse(user.id);
        if (!isMounted) return;
        setSavedParse(parse);
        if (parse) {
          const savedExtraction = savedExtractionFromParse(parse);
          setReviewForm(formFromExtraction(savedExtraction));
          setUnmatchedKeywords(savedExtraction.unmatched_keywords);
          setResumeText(parse.extracted_text_preview ?? "");
        }
        setHasCandidate(false); setCandidateEdited(false);
      } catch (error) {
        if (isMounted) setErrorMessage(getErrorMessage(error, "Unable to load saved resume parse."));
      } finally { if (isMounted) setIsLoadingSaved(false); }
    }
    loadSavedParse();
    return () => { isMounted = false; };
  }, [user]);

  function updateField<Key extends keyof ReviewForm>(key: Key, value: ReviewForm[Key]) {
    setReviewForm((current) => ({ ...current, [key]: value }));
    setHasCandidate(true); setCandidateEdited(true); setSuccessMessage(null);
  }

  function updateResumeText(value: string) {
    setResumeText(value); setDocumentSource(null); setSuccessMessage(null);
  }

  function handleDocumentChange(file: File | null) {
    setSelectedDocument(file); setDocumentSource(null); setErrorMessage(null); setSuccessMessage(null);
  }

  async function handleExtractDocumentText() {
    const validationMessage = validateResumeDocumentFile(selectedDocument);
    if (validationMessage || !selectedDocument) { setErrorMessage(validationMessage); setSuccessMessage(null); return; }
    if (resumeText.trim() && !window.confirm("Extracted document text will replace the current resume text. Continue?")) return;
    setIsExtractingDocument(true); setErrorMessage(null); setSuccessMessage(null);
    try {
      const extraction = await extractResumeDocumentText(selectedDocument);
      setResumeText(extraction.text); setDocumentSource(extraction.source);
      setReviewForm(formFromExtraction(emptyExtraction)); setUnmatchedKeywords([]);
      setHasCandidate(false); setCandidateEdited(false);
      setSuccessMessage("Document text extracted into this private workspace. Review the text, then run deterministic extraction.");
    } catch (error) {
      setDocumentSource(null); setErrorMessage(getErrorMessage(error, "Unable to extract text from this resume document."));
    } finally { setIsExtractingDocument(false); }
  }

  async function handleExtract() {
    setIsExtracting(true); setErrorMessage(null); setSuccessMessage(null);
    try {
      const extraction = await extractResumeSkills(resumeText);
      setReviewForm(formFromExtraction(extraction)); setUnmatchedKeywords(extraction.unmatched_keywords);
      setHasCandidate(true); setCandidateEdited(false);
      setSuccessMessage("Candidate extracted. Review and correct the editable fields before saving.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to extract resume skills."));
    } finally { setIsExtracting(false); }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setIsSaving(true); setErrorMessage(null); setSuccessMessage(null);
    try {
      const input = buildResumeParseInput(user.id, resumeText, extractionFromForm(reviewForm, unmatchedKeywords));
      await saveResumeParse(input, Boolean(savedParse));
      const latestParse = await fetchResumeParse(user.id);
      setSavedParse(latestParse); setHasCandidate(false); setCandidateEdited(false);
      setSuccessMessage("Reviewed resume input saved. Your freelancer profile was not changed.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to save reviewed resume parse."));
    } finally { setIsSaving(false); }
  }

  function handleClearText() {
    setResumeText(""); setDocumentSource(null); setSuccessMessage(null);
  }

  return (
    <div className="stage-ten-page parsing-workspace-page">
      <header className="stage-ten-hero">
        <div><p>RESUME / SOURCE → REVIEWED INPUT</p><h1>Extract carefully. Keep the human in the loop.</h1><span>Deterministic extraction produces a candidate, not verified truth. Correct the supported fields before saving them as reviewed structured data.</span></div>
        <div className="stage-ten-hero-meta"><span>Current state</span><strong>{reviewWorkspaceLabel(state)}</strong><small>Freelancer owner-only parser workspace</small><Button to="/profile/freelancer" variant="secondary">Open profile source</Button></div>
      </header>

      <ol className="stage-ten-sequence" aria-label="Resume review workflow">
        <li className={resumeText.trim() ? "is-active" : ""}><span>01</span><strong>Source</strong><small>{resumeText.trim() ? "Text ready" : "Paste or upload"}</small></li>
        <li className={isExtracting || hasCandidate ? "is-active" : ""}><span>02</span><strong>Extraction</strong><small>{isExtracting ? "Running" : hasCandidate ? "Candidate ready" : "Not run"}</small></li>
        <li className={hasCandidate ? "is-active" : ""}><span>03</span><strong>Review</strong><small>{candidateEdited ? "Candidate edited" : hasCandidate ? "Correction available" : "Awaiting candidate"}</small></li>
        <li className={savedParse ? "is-active" : ""}><span>04</span><strong>Saved input</strong><small>{savedParse ? "Reviewed" : "Not saved"}</small></li>
        <li><span>05</span><strong>Matching role</strong><small>No automatic rerank</small></li>
      </ol>

      {isLoadingSaved ? <section className="stage-ten-state" aria-live="polite"><span>Loading</span><h2>Checking for saved reviewed input.</h2><p>No editor state is inferred until the owner-scoped record has loaded.</p></section> : (
        <div className="stage-ten-parser-grid">
          <div className="stage-ten-parser-main">
            <section className="stage-ten-source-panel">
              <header><div><span>01 / Source</span><h2>Private resume source</h2></div><p>Transient document · editable text</p></header>
              <div className="stage-ten-source-methods">
                <div>
                  <label><span>Supported document</span><input type="file" accept=".pdf,.docx" onChange={(event) => handleDocumentChange(event.target.files?.[0] ?? null)} /></label>
                  <small>PDF or DOCX · maximum 5 MB · one file · no OCR</small>
                  {selectedDocument ? <p className="stage-ten-file-note"><strong>{selectedDocument.name}</strong><span>{formatFileSize(selectedDocument.size)}</span></p> : null}
                  <Button type="button" variant="secondary" onClick={handleExtractDocumentText} disabled={isExtractingDocument}>{isExtractingDocument ? "Extracting document…" : "Extract document text"}</Button>
                </div>
                <label><span>Resume text</span><textarea value={resumeText} onChange={(event) => updateResumeText(event.target.value)} rows={15} placeholder="Paste resume text here…" /></label>
              </div>
              {documentSource ? <div className="stage-ten-extraction-receipt"><span>Document extraction receipt</span><dl><div><dt>File</dt><dd>{documentSource.file_name}</dd></div><div><dt>Type</dt><dd>{documentSource.file_type.toUpperCase()}</dd></div><div><dt>Characters</dt><dd>{documentSource.character_count.toLocaleString()}</dd></div>{documentSource.page_count !== null ? <div><dt>Pages</dt><dd>{documentSource.page_count}</dd></div> : null}{documentSource.paragraph_count !== null ? <div><dt>Paragraphs</dt><dd>{documentSource.paragraph_count}</dd></div> : null}</dl>{documentSource.warnings.map((warning) => <p key={warning} className="stage-ten-notice is-warning">{warning}</p>)}</div> : null}
              <div className="stage-ten-inline-actions"><Button type="button" onClick={handleExtract} disabled={isExtracting}>{isExtracting ? "Extracting candidate…" : "Extract skills candidate"}</Button><Button type="button" variant="secondary" onClick={handleClearText}>Clear source text</Button></div>
            </section>

            <form className="stage-ten-review-panel" onSubmit={handleSave}>
              <header><div><span>02–03 / Extraction + review</span><h2>Editable candidate</h2></div><p>{candidateEdited ? "Participant-edited" : hasCandidate ? "Parser candidate" : "Awaiting extraction"}</p></header>
              <div className="stage-ten-form-grid">
                <label className="is-wide"><span>Skills</span><input value={reviewForm.skills} onChange={(event) => updateField("skills", event.target.value)} placeholder="React, FastAPI, PostgreSQL" /><small>Comma-separated · review before save</small></label>
                <label><span>Categories</span><input value={reviewForm.categories} onChange={(event) => updateField("categories", event.target.value)} placeholder="frontend, backend" /></label>
                <label><span>Matched terms</span><input value={reviewForm.matchedTerms} onChange={(event) => updateField("matchedTerms", event.target.value)} placeholder="react, fastapi" /></label>
              </div>
              <div className="stage-ten-candidate-meta"><span>Method · deterministic_v1</span><span>Confidence label · deterministic</span><span>Unmatched keywords · {unmatchedKeywords.length}</span></div>
              <div className="stage-ten-form-footer"><div aria-live="polite">{errorMessage ? <p className="stage-ten-notice is-error" role="alert">{errorMessage}</p> : null}{successMessage ? <p className="stage-ten-notice is-success">{successMessage}</p> : null}</div><Button type="submit" disabled={isSaving}>{isSaving ? "Saving reviewed input…" : "Save reviewed resume input"}</Button></div>
            </form>
          </div>

          <aside className="stage-ten-saved-rail">
            <section className="is-ocean"><span>04 / Saved input</span><h2>{savedParse ? "Reviewed parse on record" : "Nothing reviewed yet"}</h2>{savedParse ? <><time dateTime={savedParse.updated_at}>{formatReviewedAt(savedParse.updated_at)}</time><dl><div><dt>Skills</dt><dd>{arrayToCsv(savedParse.skills) || "None saved"}</dd></div><div><dt>Categories</dt><dd>{arrayToCsv(savedParse.categories) || "None saved"}</dd></div><div><dt>Status</dt><dd>{savedParse.status}</dd></div></dl></> : <p>Run extraction, correct the candidate, then save. An extracted candidate is not persisted until this explicit save succeeds.</p>}</section>
            <section><span>05 / Matching role</span><h2>Profile + selected supported parse</h2><p>The matching service prefers reviewed parses over parsed candidates, excludes failed parses, and uses the newest timestamp within the same supported status.</p><p>The builder merges supported list values with the structured profile; structured profile text takes precedence. Saving does not run matching or guarantee a score change.</p></section>
            <section className="is-coral"><span>Privacy boundary</span><h2>Source stays in this owner flow.</h2><p>The selected file is sent only for transient text extraction and is not added to storage. This page does not add OCR, embeddings, analytics persistence, applications, or automatic profile updates.</p></section>
          </aside>
        </div>
      )}
    </div>
  );
}
