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

Milestone 3A through Milestone 3D do not include:

- PDF parsing
- DOCX parsing
- Resume upload
- File upload
- Storage buckets
- Backend database write endpoints
- Backend JWT verification
- AI extraction
- Embeddings
- Matching or recommendations
- Backend Supabase writes or service-role usage
- Freelancer profile auto-update

## How This Prepares Later Parsing

Future resume and gig parsers can feed extracted plain text into the same deterministic `extract_skills` utility. That keeps resume parsing, gig parsing, manual review, and future AI-assisted extraction aligned around one canonical taxonomy.

## Known Limitations

- The taxonomy is a practical starter list, not a complete global skill ontology.
- The extractor only finds known aliases from the taxonomy.
- It does not infer seniority, years of experience, proficiency, project context, or semantic similarity.
- It does not parse files or persist parsed results.
