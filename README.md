# GigMatch AI

An AI-powered tech gig discovery and matching platform for freelancers, students, developers, and clients.

This repository currently contains the BE project foundation, Supabase authentication, role-based frontend routing, structured profile setup for freelancers and clients, client-side gig posting, deterministic skill extraction, parsing persistence tables, and a text-based resume parsing review flow. AI matching, file-based resume parsing, recommendations, and evaluation dashboards are planned for later milestones.

## Tech Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, React Router, Supabase JS
- Backend: FastAPI, Python, Uvicorn
- Database/Auth: Supabase PostgreSQL and Supabase Auth
- AI later: sentence-transformers, pgvector, skill extraction

## Folder Structure

```text
gigmatch-ai/
  frontend/              React + Vite application
  backend/               FastAPI application
  docs/
    architecture/        Architecture notes
    database/            Supabase SQL setup files
    evaluation/          Future evaluation documentation
    blackbook/           Future academic report materials
    milestones.md        Project milestone plan
  scripts/               Future helper scripts
  README.md
  .gitignore
  .env.example
```

## Supabase Project Setup

1. Create or open the `gigmatch-ai` Supabase project.
2. Keep **Enable Data API** on.
3. For local demo speed, Supabase email confirmation may be disabled from **Authentication -> Providers -> Email**. If email confirmation stays enabled, signup will ask the user to check email before login.
4. Open the Supabase SQL Editor.
5. Paste and run [docs/database/001_auth_profiles.sql](docs/database/001_auth_profiles.sql).
6. Review, then paste and run [docs/database/002_profiles.sql](docs/database/002_profiles.sql).
7. Review, then paste and run [docs/database/003_gigs.sql](docs/database/003_gigs.sql).
8. Review, then paste and run [docs/database/004_parsing_foundation.sql](docs/database/004_parsing_foundation.sql).
9. Copy the project URL and publishable key from Supabase project settings.

Admin accounts are not created through public signup. The signup UI only allows `freelancer` and `client`. Admin profiles should be created later by the project owner through Supabase SQL or backend service-role logic.

## Environment Variables

Frontend:

```bash
cd frontend
cp .env.example .env
```

Required frontend values:

```env
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_your_publishable_key"
VITE_API_BASE_URL="http://localhost:8000"
```

Backend:

```bash
cd backend
cp .env.example .env
```

Required backend values for future server-side Supabase work:

```env
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_your_publishable_key"
SUPABASE_SECRET_KEY="sb_secret_your_secret_key"
```

Never put `SUPABASE_SECRET_KEY` in the frontend.

## Frontend Setup

```bash
cd frontend
npm install
```

## Run Frontend

```bash
cd frontend
npm run dev
```

The frontend runs on `http://localhost:5173` by default.

## Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

On Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Run Backend

```bash
cd backend
uvicorn app.main:app --reload
```

The backend runs on `http://localhost:8000` by default.

## Health Check

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "gigmatch-ai-backend"
}
```

## Test Signup

1. Start the frontend.
2. Go to `/signup`.
3. Enter full name, email, password, and choose `Freelancer` or `Client`.
4. Submit the form.
5. If email confirmation is disabled, the app creates the auth user, inserts `user_profiles`, and redirects to the correct dashboard.
6. If email confirmation is enabled, the app shows a check-email message instead of crashing.

## Test Login

1. Go to `/login`.
2. Login with a Supabase Auth user that has a matching `user_profiles` row.
3. The app fetches the profile row and redirects by role:
   - `freelancer` -> `/dashboard/freelancer`
   - `client` -> `/dashboard/client`
   - `admin` -> `/dashboard/admin`

If the profile row is missing, the app shows a clear error and does not create fake data.

## Test Role-Based Redirects

1. Login as a freelancer and try `/dashboard/client`; the app redirects to `/dashboard/freelancer`.
2. Login as a client and try `/dashboard/admin`; the app redirects to `/dashboard/client`.
3. Login as a freelancer and try `/profile/client`; the app redirects to `/dashboard/freelancer`.
4. Login as a client and try `/profile/freelancer`; the app redirects to `/dashboard/client`.
5. Login as a freelancer and try `/gigs/new`; the app redirects to `/dashboard/freelancer`.
6. Login as a freelancer and try `/gigs/manage`; the app redirects to `/dashboard/freelancer`.
7. Login as a client and try `/profile/resume-parse`; the app redirects to `/dashboard/client`.
8. Logout and try any dashboard, profile, or gig route; the app redirects to `/login`.

## user_profiles Security

[docs/database/001_auth_profiles.sql](docs/database/001_auth_profiles.sql) protects `user_profiles` at the database level:

- RLS is enabled on `public.user_profiles`.
- Select policy only allows users to read their own profile where `auth.uid() = id`.
- Insert policy only allows authenticated users to insert their own profile row.
- Public signup insert is limited to `role in ('freelancer', 'client')`, so public signup cannot create admins.
- Update policy only allows users to update their own profile row.
- A trigger prevents normal authenticated API requests from changing `role` after profile creation.
- Column-level grants allow authenticated users to update only safe columns such as `full_name` and `updated_at`, not `role`.

Together, the insert policy, update policy, trigger, and grants prevent browser users from promoting themselves to `admin`. Manual admin/service-role changes remain possible later through trusted project-owner SQL or backend service-role code.

## Structured Profile Setup

[docs/database/002_profiles.sql](docs/database/002_profiles.sql) creates:

- `public.freelancer_profiles`
- `public.client_profiles`

Both tables reference `public.user_profiles(id)`, enable RLS, restrict normal users to their own role-specific profile row, allow admins to select all profile rows, and maintain `updated_at` through triggers.

To apply the SQL:

1. Confirm [docs/database/001_auth_profiles.sql](docs/database/001_auth_profiles.sql) has already been run.
2. Open the Supabase SQL Editor.
3. Review [docs/database/002_profiles.sql](docs/database/002_profiles.sql).
4. Paste the full SQL into the editor and run it.
5. Keep using only the frontend publishable key in `frontend/.env`; never place the service role or secret key in frontend env vars.

## Test Freelancer Profile Create/Update

1. Login as a `freelancer`.
2. Open `/dashboard/freelancer`.
3. Click `Complete / Edit Smart Profile`.
4. Fill in the profile fields. For array fields such as skills, tools, tech categories, and project links, enter comma-separated values.
5. Save the form and confirm the success message appears.
6. Refresh `/profile/freelancer` and confirm saved values load back into the form.
7. Edit a field, save again, and confirm the row updates instead of creating a duplicate.

## Test Client Profile Create/Update

1. Login as a `client`.
2. Open `/dashboard/client`.
3. Click `Complete / Edit Client Profile`.
4. Fill in the company fields. For hiring focus, enter comma-separated values.
5. Save the form and confirm the success message appears.
6. Refresh `/profile/client` and confirm saved values load back into the form.
7. Edit a field, save again, and confirm the row updates instead of creating a duplicate.

## Profile RLS Checks

1. As a freelancer, verify `/profile/client` redirects to `/dashboard/freelancer`.
2. As a client, verify `/profile/freelancer` redirects to `/dashboard/client`.
3. In Supabase SQL Editor, inspect the created policies on `freelancer_profiles` and `client_profiles`.
4. Confirm normal authenticated users cannot insert or update rows where `user_id` is another user's id.
5. Confirm normal authenticated users cannot select another user's profile row.

## Client Gig Posting Setup

[docs/database/003_gigs.sql](docs/database/003_gigs.sql) creates:

- `public.gigs`

The table references `public.user_profiles(id)` through `client_id`, enables RLS, restricts normal clients to their own gigs, prevents freelancers from creating or editing gigs, allows admins to select all gigs, adds practical budget constraints, and indexes client, status, category, and skill array fields.

To apply the SQL:

1. Confirm [docs/database/001_auth_profiles.sql](docs/database/001_auth_profiles.sql) and [docs/database/002_profiles.sql](docs/database/002_profiles.sql) have already been run.
2. Open the Supabase SQL Editor.
3. Review [docs/database/003_gigs.sql](docs/database/003_gigs.sql).
4. Paste the full SQL into the editor and run it.
5. Keep using only the frontend publishable key in `frontend/.env`; never place the service role or secret key in frontend env vars.

## Test Client Gig Create/List/Update

1. Login as a `client`.
2. Open `/dashboard/client`.
3. Click `Post a New Gig`.
4. Fill in title, description, tech category, and any optional structured fields. For skill and deliverable fields, enter comma-separated values.
5. Save the gig and confirm the app returns to `/gigs/manage`.
6. Confirm the manage page lists the gig title, category, status, required skills, deadline, and updated time.
7. Click `Edit Gig`, update a field, save, and confirm the success message appears.
8. Return to `/gigs/manage` and confirm the updated values are shown.

## Test Freelancer Cannot Access Gig Posting

1. Login as a `freelancer`.
2. Try `/gigs/new`; the app should redirect to `/dashboard/freelancer`.
3. Try `/gigs/manage`; the app should redirect to `/dashboard/freelancer`.
4. Try a known `/gigs/:id/edit` URL; the app should redirect to `/dashboard/freelancer`.
5. Confirm no gig posting controls appear on the freelancer dashboard.

## Gig RLS Checks

1. As a client, confirm you can select, insert, and update only rows where `client_id = auth.uid()`.
2. Confirm a client cannot insert a gig with another user's `client_id`.
3. Confirm a client cannot update another client's gig.
4. Confirm a freelancer cannot insert, update, or delete gigs.
5. Confirm freelancers do not get read access to gigs in Milestone 2B.

## Parsing Persistence Setup

[docs/database/004_parsing_foundation.sql](docs/database/004_parsing_foundation.sql) creates:

- `public.resume_parses`
- `public.gig_parses`

Both tables enable RLS. Freelancers can access only their own resume parse row, and clients can access only parse rows for gigs they own. The current frontend uses `resume_parses` for reviewed pasted-text resume extraction.

## Test Resume Text Parser

1. Start the backend and frontend.
2. Login as a `freelancer`.
3. Open `/dashboard/freelancer`.
4. Click `Resume Parser`.
5. Paste resume text and click `Extract Skills`.
6. Review or edit the comma-separated skills, categories, and matched terms.
7. Save the reviewed result and confirm the success message appears.
8. Refresh `/profile/resume-parse` and confirm the saved result loads again.

The page calls `POST /parsing/extract-skills` for deterministic parsing and saves reviewed output directly to `public.resume_parses` through the frontend Supabase client and RLS. It does not upload PDF/DOCX files, store full raw resume text, update `freelancer_profiles`, or use AI extraction.

## Current Milestone Status

Milestones 0, 1, 2A, 2B, 3A, 3B, and 3C are complete and tested. Milestone 3D is implemented locally and pending manual review:

- Foundation repo structure, frontend, backend, routing, and docs added
- Supabase auth client configured
- Signup and login forms connected to Supabase Auth
- `user_profiles` SQL setup added
- Role-based dashboard routing added
- Navbar login/signup/logout behavior added
- `freelancer_profiles` and `client_profiles` SQL setup added
- Freelancer and client profile create/update pages added
- `gigs` SQL setup applied and tested
- Client gig create, manage, and edit pages added
- Deterministic skill taxonomy and extraction utilities added
- Stateless backend parsing endpoint added
- `resume_parses` and `gig_parses` persistence foundation added
- Resume text parsing review UI and save/fetch flow added
- Backend auth verification stubs added for future work

Milestone 3 overall remains incomplete until gig parsing UI, PDF/DOCX text extraction, verification/hardening, and later matching work are completed.

## Planned Future Modules

- Gig parsing review UI
- PDF/DOCX text extraction
- Freelancer recommendations
- Embeddings
- pgvector matching
- Hybrid ranking
- Explainability
- Evaluation dashboard
