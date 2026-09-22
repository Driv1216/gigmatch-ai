# Parsing Pipeline

GigMatch AI converts resume and gig text into reviewable structured matching data. Extraction is deterministic and stateless; users control what is persisted.

Reviewed parsing output is one evidence source for matching; it does not bypass structured profile/gig authority or flow directly to the semantic model as raw private text.

## Inputs and flow

Supported inputs are pasted text, text-based PDF resumes, and DOCX resumes. Files are limited to 5 MB and are processed in memory, not retained.

```text
text or PDF/DOCX -> validate/extract -> normalize -> taxonomy aliases
  -> canonical skills/categories -> user review -> RLS-protected save
```

Document and skill extraction are separate actions. Uploading populates editable text; the user explicitly extracts, corrects, and saves results.

## API

### `POST /parsing/extract-skills`

Accepts up to 50,000 characters and returns deterministic structured data:

```json
{
  "skills": ["React", "FastAPI", "PostgreSQL"],
  "categories": ["frontend", "backend", "database"],
  "matched_terms": ["react", "fastapi", "postgresql"],
  "unmatched_keywords": [],
  "confidence": "deterministic"
}
```

Whitespace-only input returns an empty result. Invalid types and oversized input fail validation.

### `POST /parsing/resume/extract-document`

Accepts one `.pdf` or `.docx` multipart upload and returns text plus file name/type, character count, page or paragraph count, and warnings. Unsupported, oversized, malformed, or unreadable documents return controlled errors. PDFs without usable text warn that they may be scanned.

## Taxonomy and persistence

`backend/app/parsing/skills_taxonomy.json` defines canonical skills, aliases, and categories. Boundary-aware normalization maps variants such as `postgres`, `postgresql`, and `psql` to `PostgreSQL` without matching partial words such as `react` inside `reactive`.

Freelancers save reviewed resume data; clients save reviewed parses only for owned gigs. Supabase Auth and RLS enforce role/ownership. Resume records prioritize structured skills and a limited preview rather than the full file. Gig parses do not silently rewrite the original gig. Uploaded files are not stored.

Matching builders combine the latest eligible reviewed parse with structured records, normalize taxonomy aliases, and deduplicate evidence. Canonical semantic text is then built only from approved matching fields. Evaluation rationales, scenario tags, case IDs, raw documents, and private metadata never become model input. See [Matching and Explainability](matching.md).

## Privacy, testing, and limitations

- Extraction does not call an LLM or external AI API.
- Users review output before persistence or publication changes.
- Tests cover aliases, boundaries, validation, PDF/DOCX behavior, scanned-document warnings, endpoints, and review/save flows.
- Synthetic fixtures live in `manual-test-files/`.
- The parser cannot infer proficiency, experience duration, seniority, project context, or unseen skills.
- OCR is not included; `unmatched_keywords` is reserved and currently empty.
