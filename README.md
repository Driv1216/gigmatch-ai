# GigMatch AI

An AI-powered tech gig discovery and matching platform for freelancers, students, developers, and clients.

This repository currently contains the BE project foundation, Supabase authentication, role-based frontend routing, and structured profile setup for freelancers and clients. AI matching, resume parsing, gig posting, and evaluation dashboards are planned for later milestones.

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
7. Copy the project URL and publishable key from Supabase project settings.

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
5. Logout and try any dashboard or profile route; the app redirects to `/login`.

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

## Current Milestone Status

Milestones 0, 1, and 2A are implemented:

- Foundation repo structure, frontend, backend, routing, and docs added
- Supabase auth client configured
- Signup and login forms connected to Supabase Auth
- `user_profiles` SQL setup added
- Role-based dashboard routing added
- Navbar login/signup/logout behavior added
- `freelancer_profiles` and `client_profiles` SQL setup added
- Freelancer and client profile create/update pages added
- Backend auth verification stubs added for future work

## Planned Future Modules

- Gig posting
- Resume parsing
- Gig parsing
- Skill extraction
- Embeddings
- pgvector matching
- Hybrid ranking
- Explainability
- Evaluation dashboard
