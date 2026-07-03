# Parsing

## Milestone 3A: Skill Taxonomy and Deterministic Extraction

Milestone 3A adds the first backend parsing foundation for GigMatch AI: a curated technical skill taxonomy, safe text normalization helpers, and deterministic skill extraction utilities.

Given raw resume or gig text, the backend can now identify known technical skills through canonical names and aliases without calling any AI service.

## Milestone 3B: Stateless Parsing API

Milestone 3B exposes the deterministic extractor through a stateless FastAPI endpoint for plain text input.

It does not persist data, call Supabase, require file upload, or use AI. It is a thin API layer over the Milestone 3A extraction utilities.

### Endpoint

```text
POST /parsing/extract-skills
```

Request:

```json
{
  "text": "Need React, FastAPI, PostgreSQL, Supabase, and Docker experience."
}
```

Response:

```json
{
  "skills": ["React", "FastAPI", "PostgreSQL", "Supabase", "Docker"],
  "categories": ["frontend", "backend", "database", "devops"],
  "matched_terms": ["react", "fastapi", "postgresql", "supabase", "docker"],
  "unmatched_keywords": [],
  "confidence": "deterministic"
}
```

Validation:

- Empty or whitespace-only text returns an empty deterministic result.
- `text` must be a string.
- `text` is limited to 50,000 characters.

## Milestone 3C: Parsing Persistence SQL Foundation

Milestone 3C adds the Supabase/PostgreSQL persistence foundation for reviewed parsed outputs.

The SQL lives in `docs/database/004_parsing_foundation.sql` and defines:

- `public.resume_parses` for one current reviewed resume parse per freelancer user.
- `public.gig_parses` for one current reviewed gig parse per client-owned gig.
- Owner-only RLS policies for freelancer resume parses and client gig parses.
- Practical array GIN indexes for future matching.
- `updated_at` triggers that reuse the existing `public.set_updated_at()` function.

Milestone 3C has been manually reviewed, applied in Supabase, and tested.

## Milestone 3D: Resume Text Parsing Review UI

Milestone 3D adds a freelancer-only frontend page at `/profile/resume-parse`.

The page lets a freelancer paste resume text, call the stateless backend parser, review/edit extracted skills, categories, and matched terms, then save the reviewed result to `public.resume_parses` with the frontend Supabase client. Supabase Auth session plus RLS enforce row ownership.

Architecture:

- Parsing uses `POST /parsing/extract-skills`.
- Save/fetch uses the browser Supabase client and `public.resume_parses`.
- The UI stores reviewed structured output and `extracted_text_preview` only.
- Full raw resume text is not stored.
- `freelancer_profiles` is not updated automatically.

## Milestone 3E: Gig Description Parsing Review UI

Milestone 3E adds a client-only frontend page at `/gigs/:id/parse`.

The page lets a client review an existing gig title/description, call the stateless backend parser, review/edit required skills, preferred skills, categories, matched terms, deliverables, and seniority level, then save the reviewed result to `public.gig_parses` with the frontend Supabase client. Supabase Auth session plus RLS enforce gig ownership through `public.gigs.client_id`.

Architecture:

- Parsing uses `POST /parsing/extract-skills`.
- Save/fetch uses the browser Supabase client and `public.gig_parses`.
- The original `gigs` row is not updated automatically.
- The parser pre-fills extracted skills as required skills; clients manually separate required/preferred skills.
- Seniority and deliverables stay manually editable and are not AI-inferred.

## Milestone 3F-A: Document Text Extraction Utilities

Milestone 3F-A adds backend-only utilities for extracting plain text from PDF and DOCX documents.

The utility lives in `backend/app/services/document_text_extractor.py` and supports:

- Text-based PDF extraction.
- DOCX paragraph extraction.
- File extension validation for `.pdf` and `.docx`.
- Metadata including file type, character count, warnings, page count for PDFs, and paragraph count for DOCX files.
- A clear warning for scanned or image-based PDFs when readable text cannot be extracted.

This milestone does not add upload routes, frontend upload controls, file storage, OCR, parser calls, database writes, or AI extraction. Extracted text will later be used to fill the existing resume text review flow.

## Milestone 3F-B: Stateless Resume Document Extraction Endpoint

Milestone 3F-B adds a backend-only multipart upload endpoint for extracting resume document text:

```text
POST /parsing/resume/extract-document
```

The endpoint accepts exactly one `.pdf` or `.docx` file up to 5 MB, extracts plain text through `backend/app/services/document_text_extractor.py`, and returns the extracted text plus source metadata and warnings.

Example response:

```json
{
  "text": "Resume text...",
  "source": {
    "file_name": "resume.pdf",
    "file_type": "pdf",
    "character_count": 8421,
    "page_count": 2,
    "paragraph_count": null,
    "warnings": []
  }
}
```

This endpoint is stateless. It does not parse skills automatically, call the resume parser, save files, save extracted text, write to `resume_parses`, update `freelancer_profiles`, use Supabase storage, use OCR, perform AI extraction, create embeddings, or run matching/recommendations. A later frontend milestone can use the returned text to fill the existing resume text area for manual review.

## Output Contract

```json
{
  "skills": ["React", "FastAPI", "PostgreSQL"],
  "categories": ["frontend", "backend", "database"],
  "matched_terms": ["react", "fastapi", "postgresql"],
  "unmatched_keywords": [],
  "confidence": "deterministic"
}
```

`unmatched_keywords` intentionally returns an empty list for now. Keyword inference can be added later after the structured parser contract is stable.

## Taxonomy and Aliases

The taxonomy lives in `backend/app/parsing/skills_taxonomy.json`.

Each entry has:

```json
{
  "canonical": "PostgreSQL",
  "aliases": ["postgres", "postgresql", "psql"],
  "category": "database"
}
```

Aliases let messy input map to stable canonical skills. For example, `postgres` and `psql` both return `PostgreSQL`; `node js` and `node.js` both return `Node.js`; `js` returns `JavaScript`.

## Deterministic Extraction

Milestone 3A uses normalization plus regex boundary matching. This keeps the behavior explainable, testable, and safe before adding resume upload, PDF parsing, persistence, embeddings, or AI extraction.

The extractor avoids partial-word matches, so `react` matches `React`, but `reactive` does not.

## Intentionally Not Implemented

Milestone 3A through Milestone 3F-B do not include:

- Frontend resume upload UI
- Persistent file upload/storage
- Storage buckets
- Backend database write endpoints
- Backend JWT verification
- OCR
- Parser calls from document extraction
- AI extraction
- Embeddings
- Matching or recommendations
- Backend Supabase writes or service-role usage
- Freelancer profile auto-update
- Original gig auto-update

## How This Prepares Later Parsing

Future resume and gig parsers can feed extracted plain text into the same deterministic `extract_skills` utility. That keeps resume parsing, gig parsing, manual review, and future AI-assisted extraction aligned around one canonical taxonomy.

## Known Limitations

- The taxonomy is a practical starter list, not a complete global skill ontology.
- The extractor only finds known aliases from the taxonomy.
- It does not infer seniority, years of experience, proficiency, project context, or semantic similarity.
- Document extraction does not infer skills, store files, or persist parsed results.
