# Milestone 3G-B Verification Checklist

Status: Complete by user-confirmed manual browser and Supabase verification.

Milestone 3G-B closes the static security/data-flow review for the Milestone 3 parsing pipeline and prepares manual checks before Milestone 4 matching starts.

This checklist does not start AI matching, embeddings, recommendations, explainability dashboards, admin analytics, schema changes, storage buckets, OCR, or new product features.

## Test Accounts Needed

- One freelancer account.
- One client account.
- Optional: a second freelancer account for `resume_parses` ownership checks.
- Optional: a second client account with at least one separate gig for `gig_parses` ownership checks.

## Synthetic Test Files

Use synthetic files only. Do not use a real resume or real personal profile data for this verification pass.

The manual upload fixtures live in `manual-test-files/`:

- `synthetic_resume_3g_test.docx`: primary upload fixture; use this first because DOCX extraction is usually cleaner.
- `synthetic_resume_3g_test.pdf`: secondary upload fixture using the same synthetic content.
- `synthetic_resume_invalid.txt`: unsupported-file fixture for invalid upload testing.

## Current Parsing Flows

### Freelancer Resume Paste Flow

```text
/profile/resume-parse
-> user pastes resume text
-> frontend calls POST /parsing/extract-skills
-> user reviews editable skills/categories/matched terms
-> frontend saves reviewed output to public.resume_parses through Supabase anon client + RLS
```

The saved record stores structured reviewed output and an `extracted_text_preview` capped in the UI at 2,000 characters. Full raw resume text is not intentionally stored.

### Freelancer Resume PDF/DOCX Upload Flow

```text
/profile/resume-parse
-> user selects .pdf or .docx up to 5 MB
-> frontend calls POST /parsing/resume/extract-document
-> backend extracts plain text and returns text + metadata
-> frontend places extracted text into the existing textarea
-> user manually clicks Extract Skills
-> existing review/save flow continues
```

The upload action does not save the file, save extracted text automatically, call the parser automatically, or write to Supabase.

### Client Gig Description Parse Flow

```text
/gigs/:id/parse
-> frontend fetches the gig by id and current client id
-> frontend builds parse text from the existing gig fields
-> frontend calls POST /parsing/extract-skills
-> client reviews required/preferred skills, categories, matched terms, deliverables, and seniority
-> frontend saves reviewed output to public.gig_parses through Supabase anon client + RLS
```

The original `gigs` row is not updated by the parser save flow.

### Save/Fetch Flow for `resume_parses`

- Fetch: `frontend/src/lib/resumeParses.ts` selects from `resume_parses` with `.eq("user_id", userId)`.
- Insert: `saveResumeParse` inserts a single reviewed parse input.
- Update: `saveResumeParse` updates only parser/review fields and filters by `.eq("user_id", input.user_id)`.
- RLS: `docs/database/004_parsing_foundation.sql` requires `(select auth.uid()) = user_id` and role `freelancer`.

### Save/Fetch Flow for `gig_parses`

- Fetch: `frontend/src/lib/gigParses.ts` selects from `gig_parses` with `.eq("gig_id", gigId)`.
- Source gig check: `GigParsePage` loads the source gig with `fetchGigForClient(id, user.id)`.
- Insert: `saveGigParse` inserts a parse for the loaded `gig.id`.
- Update: `saveGigParse` updates only parser/review fields and filters by `.eq("gig_id", input.gig_id)`.
- RLS: `docs/database/004_parsing_foundation.sql` allows access only when the parse `gig_id` belongs to a gig whose `client_id = auth.uid()` and the user role is `client`.

## Static Security/Data-Flow Review

| Check | Evidence | Result |
| --- | --- | --- |
| Frontend uses only Supabase anon/public client | `frontend/src/lib/supabaseClient.ts` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` only. | Code-inspection pass |
| Service-role key is not exposed in frontend code | Repo scan found no frontend `SUPABASE_SERVICE_ROLE_KEY` or service-role usage. Backend config has a backend-only `supabase_secret_key` setting, but parsing routes do not use it. | Code-inspection pass |
| Resume parse saves are scoped to logged-in freelancer/user | `ResumeParsePage` passes `user.id` into `buildResumeParseInput`; update payload omits `user_id`; RLS requires `auth.uid() = user_id` and freelancer role. | Code-inspection pass |
| Gig parse saves are scoped to logged-in client/gig owner | `GigParsePage` uses `fetchGigForClient(id, user.id)` before parse/save; update payload omits `gig_id`; RLS checks `gigs.client_id = auth.uid()` and client role. | Code-inspection pass |
| Save helpers do not appear to allow unsafe owner override | UI passes current authenticated user/gig. Helpers accept IDs as arguments, so RLS remains the real security boundary if helpers are misused elsewhere. | Code-inspection pass with RLS dependency |
| Document extraction endpoint does not persist files | `backend/app/api/routes/parsing.py` reads upload bytes, calls `extract_text_from_document_bytes`, and returns response metadata. No filesystem write or storage call is present. | Code-inspection pass |
| Document extraction endpoint does not write to Supabase | Parsing route imports no Supabase client and performs no database calls. | Code-inspection pass |
| Parser endpoint remains stateless | `POST /parsing/extract-skills` only calls `extract_skills(payload.text)`. | Code-inspection pass |
| Wrong-role users are redirected or blocked by route guards | `ProtectedRoute` redirects authenticated users whose role does not match `allowedRole`; parse routes are wrapped with freelancer/client role guards in `App.tsx`. | Code-inspection pass; browser check pending |
| Logged-out users are redirected | `ProtectedRoute` redirects unauthenticated users to `/login`. | Code-inspection pass; browser check pending |
| Database RLS remains the real security boundary | SQL revokes table access then grants authenticated permissions constrained by owner/role RLS policies. | Code-inspection pass; Supabase check pending |
| No accidental file storage | App code scan found no `.storage` calls or bucket logic. Supabase storage package exists as a dependency of Supabase JS, but app code does not use it. | Code-inspection pass |

## Manual Verification Cases

### Freelancer Resume Paste Flow

Test ID: M3G-B-001
Role: Freelancer
Precondition: Freelancer is logged in and has access to `/profile/resume-parse`.
Steps:
1. Open `/profile/resume-parse`.
2. Paste resume text containing known aliases, for example `React, Node.js, PostgreSQL, Docker`.
3. Click `Extract Skills`.
4. Review the editable output.
Expected result: The page shows deterministic parsed skills, categories, matched terms, and no crash.
Actual result: Pending browser verification.
Status: Pending
Notes: This validates the paste-to-parser path only.

Test ID: M3G-B-002
Role: Freelancer
Precondition: M3G-B-001 output is visible.
Steps:
1. Edit at least one reviewed skill field.
2. Click save.
3. Refresh the page.
Expected result: The reviewed parse reloads from `resume_parses` for the same freelancer account.
Actual result: Pending browser/Supabase verification.
Status: Pending
Notes: Confirm the saved row belongs to the current freelancer user.

### Freelancer Resume PDF/DOCX Upload Flow

Test ID: M3G-B-003
Role: Freelancer
Precondition: Freelancer is logged in and has `manual-test-files/synthetic_resume_3g_test.docx` and `manual-test-files/synthetic_resume_3g_test.pdf` available.
Steps:
1. Open `/profile/resume-parse`.
2. Select `synthetic_resume_3g_test.docx`.
3. Click `Extract Text`.
4. Review the populated textarea and metadata.
5. Click `Extract Skills`.
6. Repeat the same extraction flow with `synthetic_resume_3g_test.pdf`.
Expected result: Extracted text appears in the textarea, metadata is shown, and skills are parsed only after the manual `Extract Skills` click. Both DOCX and PDF should use the same synthetic resume content.
Actual result: Pending browser verification.
Status: Pending
Notes: Confirm upload does not save automatically before clicking save.

Test ID: M3G-B-004
Role: Freelancer
Precondition: Freelancer is logged in and has `manual-test-files/synthetic_resume_invalid.txt` available.
Steps:
1. Try uploading `synthetic_resume_invalid.txt`.
Expected result: The UI/backend rejects invalid files clearly without saving files or parsed output.
Actual result: Pending browser verification.
Status: Pending
Notes: Backend unit tests cover unsupported files too; this is the browser messaging check.

Test ID: M3G-B-004A
Role: Freelancer
Precondition: Freelancer is logged in.
Steps:
1. Skip the oversized upload browser test unless a convenient >5 MB file is already available.
Expected result: No manual oversized-file upload is required for this verification pass.
Actual result: Not run.
Status: Not run
Notes: Oversized upload already covered by backend unit tests; manual large-file browser test skipped.

### Client Gig Description Parse Flow

Test ID: M3G-B-005
Role: Client
Precondition: Client is logged in and owns at least one gig.
Steps:
1. Open `/gigs/manage`.
2. Navigate to parse a client-owned gig at `/gigs/:id/parse`.
3. Click `Extract Requirements`.
4. Review the editable output.
Expected result: The page parses the existing gig description and displays editable required skills, categories, matched terms, seniority, and deliverables.
Actual result: Pending browser verification.
Status: Pending
Notes: Confirm the source `gigs` row is not modified by extraction.

Test ID: M3G-B-006
Role: Client
Precondition: M3G-B-005 output is visible.
Steps:
1. Edit reviewed requirements.
2. Click save.
3. Refresh the page.
Expected result: Reviewed parse reloads from `gig_parses` for the same client-owned gig.
Actual result: Pending browser/Supabase verification.
Status: Pending
Notes: Confirm a single current parse exists for the gig.

### Wrong-Role Route Protection

Test ID: M3G-B-007
Role: Client
Precondition: Client is logged in.
Steps:
1. Navigate directly to `/profile/resume-parse`.
Expected result: Client is redirected to the client dashboard and cannot access the freelancer resume parser UI.
Actual result: Pending browser verification.
Status: Pending
Notes: Code inspection shows `ProtectedRoute allowedRole="freelancer"`.

Test ID: M3G-B-008
Role: Freelancer
Precondition: Freelancer is logged in.
Steps:
1. Navigate directly to `/gigs/manage` and `/gigs/some-id/parse`.
Expected result: Freelancer is redirected to the freelancer dashboard and cannot access client gig parsing UI.
Actual result: Pending browser verification.
Status: Pending
Notes: Code inspection shows client gig routes use `ProtectedRoute allowedRole="client"`.

### Logged-Out Route Protection

Test ID: M3G-B-009
Role: Logged out
Precondition: No active Supabase session.
Steps:
1. Navigate directly to `/profile/resume-parse`.
2. Navigate directly to `/gigs/manage` or `/gigs/some-id/parse`.
Expected result: Logged-out user is redirected to `/login`.
Actual result: Pending browser verification.
Status: Pending
Notes: Code inspection shows `ProtectedRoute` redirects when `user` is absent.

### Supabase RLS Ownership Behavior

Test ID: M3G-B-010
Role: Second freelancer
Precondition: Freelancer A has a saved `resume_parses` row. Freelancer B is logged in separately.
Steps:
1. As Freelancer B, attempt to query or view Freelancer A's resume parse through the app or Supabase client.
2. If testing in Supabase SQL/API, use an authenticated session for Freelancer B, not service-role credentials.
Expected result: Freelancer B cannot read, update, or delete Freelancer A's resume parse.
Actual result: Pending Supabase verification.
Status: Pending
Notes: SQL RLS requires `auth.uid() = user_id`.

Test ID: M3G-B-011
Role: Second client
Precondition: Client A owns a gig with a saved `gig_parses` row. Client B is logged in separately.
Steps:
1. As Client B, navigate directly to Client A's `/gigs/:id/parse` URL.
2. If testing in Supabase SQL/API, attempt to query or mutate Client A's `gig_parses` row with Client B's authenticated session.
Expected result: Client B cannot view, insert, update, or delete a parse for Client A's gig.
Actual result: Pending browser/Supabase verification.
Status: Pending
Notes: SQL RLS checks ownership through `public.gigs.client_id`.

### No Service Role Key Leakage

Test ID: M3G-B-012
Role: Developer
Precondition: Local repo and frontend build output are available.
Steps:
1. Search frontend source and generated build output for `SUPABASE_SERVICE_ROLE_KEY`, `service_role`, or actual service-role secret values.
2. Inspect browser network/runtime env exposure if needed.
Expected result: Frontend exposes only publishable Supabase configuration and does not contain service-role secrets.
Actual result: Source code inspection passed; build-output/browser verification pending.
Status: Pending
Notes: Source scan found no frontend service-role usage.

### No Accidental File Storage

Test ID: M3G-B-013
Role: Developer/Freelancer
Precondition: Freelancer upload flow can be exercised.
Steps:
1. Upload a PDF/DOCX through `/profile/resume-parse`.
2. Check Supabase Storage buckets and app code/network calls.
Expected result: No storage bucket receives the file; no `.storage` API call is made; extracted text appears only in the textarea until the user saves reviewed parse output.
Actual result: Source code inspection passed; Supabase/browser verification pending.
Status: Pending
Notes: App code scan found no storage calls.

### Backend Parser/Extraction No-Persistence Behavior

Test ID: M3G-B-014
Role: Developer
Precondition: Backend is running or tests can be run locally.
Steps:
1. Call `POST /parsing/extract-skills` with text input.
2. Call `POST /parsing/resume/extract-document` with a small valid PDF or DOCX.
3. Check database tables and storage for new rows/files caused by these backend endpoints alone.
Expected result: Endpoints return parsed/extracted response data but do not persist files or database rows.
Actual result: Code inspection passed; database/storage verification pending.
Status: Pending
Notes: Backend route imports no Supabase client and performs no writes.

## Known Limitations

- Parser behavior is deterministic taxonomy matching, not perfect resume or gig understanding.
- Short or ambiguous aliases remain hard to handle perfectly; 3G-A added narrow regression guards for known false positives.
- Scanned/image-based PDFs remain unsupported because OCR is intentionally out of scope.
- Backend parsing endpoints are public stateless utility endpoints in this local app architecture; persistence security is enforced by Supabase Auth and RLS in the frontend save flows.
- The frontend helper functions accept user or gig IDs as parameters, so direct helper misuse would still rely on Supabase RLS to reject unsafe writes.

## Final Signoff

- Static security/data-flow review: Code-inspection pass.
- Automated backend parser/extraction tests: Pass locally with `./.venv/bin/python -m unittest discover -s tests`.
- Frontend build: Pass locally with `npm run build`.
- Manual browser verification: Complete by user confirmation.
- Supabase RLS ownership verification: Complete by user confirmation.
- Milestone 3G-B readiness: Complete.
- Parent Milestone 3G: Complete.
- Milestone 3: Complete.
- Milestone 4: Current / next implementation phase.
