# BE Project Source Context

**Last updated:** 5 July 2026  
**Current milestone:** Milestone 5 — Explainability and Skill Gap  
**Current status:** Milestone 0, Milestone 1, Milestone 2A, Milestone 2B, Milestone 3, and Milestone 4A-4G are complete and tested; Milestone 4 backend matching is closed, and Milestone 5 is the next implementation step  
**Primary project rule:** This source context overrides old report/PPT/paper content unless the user explicitly says otherwise.  
**Use rule:** Future chats should treat this file as project memory, not as a task prompt.
---

## Project Title

**An AI-Powered Platform for Intelligent Gig Discovery and Matching**

This is the fixed official title for the final-year Bachelor of Engineering project. The title should not be changed for college submission.

---

## Internal Project Identity

**Internal product/repo name:** GigMatch AI  
**Repository path:** `/Users/drivyaanshyadav/Desktop/Ai-Gig/gigmatch-ai`

This project is intended to be a serious, product-grade, deployed AI SaaS-style prototype, not a basic college CRUD app.

The target is to build something strong enough for:

- BE black book / blue book submission
- Final viva
- Project demo
- Resume discussion
- Higher-studies profile discussion
- Technical interviews

---

## How to Use This Context

This file is the reusable source context for future planning, coding, debugging, review, and documentation chats.

Use it to avoid re-explaining the entire project every time a new chat is started.

### For planning/project chats

Upload or reference this file, then ask:

```text
Continue the BE project from the source context.
```

The assistant should treat this file as the current project truth.

### For Codex / implementation chats

Do **not** paste this entire file into every Codex task unless needed.

Use this as project source context, then give Codex only the current milestone/task prompt.

Codex should implement one milestone/task at a time.

### Conflict rule

If this file conflicts with old report/PPT/paper material, prefer this file unless the user explicitly says otherwise.

Old college documents are legacy context only.

---

## Current Source of Truth Files

### Primary source of truth

- This BE Project Source Context file
- `README.md` in the repository
- `docs/milestones.md`
- Reviewed SQL files in `docs/database/`
- Verified implementation state reported by the user

### Legacy-only sources

- RBL report
- IEEE-style paper
- PPT / presentation material
- Earlier college submission material

The legacy documents can help preserve the approved topic and academic direction, but they should not control implementation decisions.

---

## Team Context

The project team has **3 members**.

Drivyaansh Yadav is the:

- Main architect
- Main technical driver
- Main planner
- Primary person responsible for project direction and implementation quality

The other two teammates can contribute, but future tasks should be divided into clear, isolated, GitHub-issue-friendly work.

Future chats should assume that Drivyaansh needs help with:

- Architecture decisions
- Codex prompts
- Project planning
- Implementation review
- Supabase/database safety
- AI/ML design
- Black book and viva preparation
- Debugging
- Teammate task assignment

---

## Legacy Document Context

Old project documents exist, including:

- RBL report
- IEEE-style paper
- PPT / presentation material
- Earlier college submission material

These documents should be treated as **legacy context only**.

They should not be blindly trusted as accurate implementation details.

### Unsafe Legacy Claims

Do not blindly reuse or defend claims such as:

- 500,000 freelancer profiles
- 120,000 job descriptions
- Large-scale production-level retrieval
- Exact NDCG/MAP improvements unless actually reproduced
- 66% time-to-hire reduction
- 34% trust-score improvement
- Reinforcement learning feedback loop
- Blockchain credential validation
- Autonomous AI negotiation agents
- Production-scale behavioral learning
- Guaranteed fairness
- Any fake or unverified evaluation number

These may appear in old documents, but they should be considered unsafe unless the final implementation actually proves them.

### Useful Legacy Direction

The useful legacy direction is:

- AI-powered gig matching
- NLP-based skill extraction
- Semantic skill understanding
- Transformer-based embeddings
- Hybrid recommendation
- Vector search
- Ranking
- Explainability
- Skill-gap analysis
- Evaluation against a keyword baseline

Future work should preserve this broad academic/product direction while making the real implementation honest and defensible.

---

## Final Product Direction

The final product direction is:

> A premium developer-focused AI gig discovery and matching SaaS prototype.

The platform supports three roles:

### 1. Freelancer / Student / Developer

- Creates a smart profile
- Later uploads resume PDF
- Gets recommended tech gigs
- Sees match explanation and missing skills

### 2. Client / Recruiter

- Posts tech gigs
- Later pastes messy gig descriptions
- Gets ranked freelancer recommendations
- Sees why each freelancer matched

### 3. Admin / Evaluator

- Views platform analytics
- Compares keyword matching, semantic matching, and hybrid ranking
- Reviews evaluation metrics and case studies

---

## Domain Scope

V1 focuses on **tech gigs only**.

Supported categories:

- Web development
- App development
- AI/ML
- Data science
- Cybersecurity
- DevOps/cloud
- UI/UX for tech products
- Backend/API development
- Full-stack development
- Automation/scripting
- Data engineering
- Software testing/QA

Future versions may expand to design, content, marketing, consulting, and other freelance categories, but V1 should remain focused on tech gigs.

---

## Locked V1 Scope

V1 must include:

- Real authentication
- Role-based routing
- Freelancer smart profile
- Client gig posting
- Resume PDF upload and parsing later
- Messy gig description parsing later
- Bidirectional matching:
  - Freelancer → recommended gigs
  - Client gig → recommended freelancers
- Keyword baseline
- Semantic embedding similarity
- Hybrid ranking
- Explainability
- Skill-gap analysis
- Cold-start fairness
- Admin evaluation dashboard
- Honest evaluation with ranking metrics

---

## Explicitly Avoided V1 Features

Do not add these in V1:

- Payments
- Bidding
- Chat
- Contract management
- Full marketplace operations
- Blockchain
- AI negotiation agents
- Fake reinforcement learning
- Fake behavioral learning
- Fake production-scale claims
- Generic chatbot features
- Unverified large-scale metrics

These can be mentioned only as future scope if needed, not as implemented features.

---

## Recommended Technical Stack

### Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui or a clean custom component system

### Backend

- FastAPI
- Python

### Database and Auth

- Supabase PostgreSQL
- Supabase Auth

### Vector Search Later

- pgvector preferred for deployment simplicity
- FAISS may be used for local/offline experiments or future scope, but pgvector is preferred for V1 deployment

### AI/NLP Later

- sentence-transformers
- scikit-learn
- spaCy / regex-based skill extraction
- PyMuPDF or pdfplumber for PDF parsing

### Deployment Later

- Vercel for frontend
- Render / Railway / Fly.io for backend
- Supabase for database and auth

### Tooling Constraint

Windows compatibility matters because teammates use Windows.

Avoid Bun or tooling that may create cross-platform issues.

---

## Last Known Repository Status

Repository path:

```text
/Users/drivyaanshyadav/Desktop/Ai-Gig/gigmatch-ai
```

Milestone 0 foundation has been implemented.
Milestone 1 Supabase Auth and Role Routing has been implemented.
Milestone 2A Freelancer and Client Profile Setup has been implemented and tested locally.
Milestone 2B Client Gig Posting has been implemented and tested.
Milestone 3A Skill Taxonomy and Extraction Utilities has been implemented and tested.
Milestone 3B Stateless Backend Parsing Endpoints has been implemented and tested.
Milestone 3C Parsing Database Foundation has been applied in Supabase and tested.
Milestone 3D Resume Text Parsing Review UI + Save Flow has been completed and tested.
Milestone 3E Gig Description Parsing Review UI + Save Flow has been completed and tested.
Milestone 3F-A Document Text Extraction Utilities has been completed and tested with real PyMuPDF and python-docx dependencies.
Milestone 3F-B Stateless Resume Document Extraction Endpoint has been completed and tested.
Milestone 3F-C Resume Parser Upload Input Integration has been completed and tested.
Milestone 3F PDF/DOCX Text Extraction has been completed and tested.
Milestone 3G-A Parser and Document Extraction Regression Hardening has been completed and tested.
Milestone 3G-B Security/Data-Flow Review + End-to-End Verification Checklist has been completed after manual verification confirmation.
Milestone 3 Resume/Gig Parsing is complete.
Milestone 4A Matching Contract and Normalized Entity Builders has been completed and tested.
Milestone 4B Keyword Baseline Scoring and Ranking has been completed and tested.
Milestone 4C Semantic Text Builder + Embedding Provider Interface has been completed and tested.
Milestone 4D Runtime Semantic Similarity Engine has been completed and tested.
Milestone 4E Hybrid Ranking Engine has been completed and tested.
Milestone 4F-A Auth-Safe Matching Data Access Layer has been completed and tested.
Milestone 4F-B Bidirectional Backend Matching API Routes has been completed and tested.
Milestone 4G Matching Verification and Docs Closure has been completed and tested.

### Milestone 0 Completed

Frontend created with:

- React
- Vite
- TypeScript
- Tailwind CSS

Frontend routes created:

- `/`
- `/login`
- `/signup`
- `/dashboard/freelancer`
- `/dashboard/client`
- `/dashboard/admin`

Reusable frontend components created:

- `Navbar`
- `Button`
- `PageContainer`
- `AppLayout`

Backend created with FastAPI.

Backend placeholder routes created:

- `/health`
- `/auth`
- `/profiles`
- `/gigs`
- `/matching`
- `/evaluation`

Other created project assets:

- Environment examples
- README
- Architecture docs
- Backend module folders
- `docs/evaluation`
- `docs/blackbook`
- `scripts`

Verification completed:

- `npm run build` passed
- Backend placeholder endpoints returned expected JSON

### Explicitly Not Implemented in Milestone 0

Milestone 0 intentionally did **not** implement:

- Supabase
- Auth logic
- Database models
- Resume parsing
- AI matching
- Real dashboards
- Fake dashboard data
- Marketplace features
- Payments
- Chat
- Contracts
- Mock AI results

---

## Supabase Setup Status

A Supabase project named **gigmatch-ai** has been created.

Email confirmation has been disabled for local/demo testing so signup can immediately return an active session.

Admin signup must not be public.

Admin accounts should be created manually later by the project owner through Supabase SQL editor or backend service-role logic.

The current active task gate is:

> Milestone 5 — Explainability and Skill Gap.

---

## Current Next Action Gate

Milestone 3 parsing and Milestone 4 backend matching are complete and verified. The next implementation step is:

> Milestone 5 — Explainability and Skill Gap.

Milestone 5 should build user-facing explanation and missing-skill functionality on top of the verified backend matching outputs. Keep it separate from admin analytics, fake evaluation metrics, pgvector/FAISS retrieval, saved match history, behavioral feedback learning, and Milestone 6 dashboard work unless a later task explicitly scopes those in.

---

## Task 002 / Milestone 1 Details

### Task Name

**Supabase Auth and Role Routing**

### Task Goal

Implement real Supabase authentication and role-based frontend routing.

### Files Expected

Task 002 should create or update:

- `docs/database/001_auth_profiles.sql`
- `frontend/src/lib/supabaseClient.ts`
- Frontend auth context/helper
- Signup flow
- Login flow
- Protected dashboard routes
- Logout support
- `backend/app/core/auth.py`
- README
- `docs/milestones.md`

---

## Supabase SQL Requirements

The SQL file should create:

```text
public.user_profiles
```

Required columns:

```sql
id uuid primary key references auth.users(id) on delete cascade
email text not null
full_name text
role text not null check role in ('freelancer', 'client', 'admin')
created_at timestamptz default now()
updated_at timestamptz default now()
```

The SQL must:

- Enable RLS on `user_profiles`
- Allow users to select only their own profile
- Allow authenticated users to insert only their own profile
- Allow normal signup only with `freelancer` or `client` role
- Prevent normal users from creating themselves as `admin`
- Prevent normal users from updating their role after profile creation
- Avoid trusting frontend role values for backend security
- Include a safe `updated_at` trigger/function

Normal users should be able to update safe profile fields later, but should not be able to change their role.

Admin users should be created manually later by the project owner through Supabase SQL editor or backend service role.

### Extra Security Rule for `user_profiles.role`

The `role` field should be set only once during signup insert.

After profile creation, normal authenticated users must not be able to update the `role` field at all.

Implement this safely at the database level. Do not rely only on frontend UI.

Preferred approach:

- Add a PostgreSQL trigger that prevents role changes when the request is made by a normal authenticated user.
- Manual admin/service-role changes should still be possible later through the Supabase SQL editor or backend service role.

Alternative approach:

- Use column-level grants so authenticated users can update only safe columns such as `full_name` and `updated_at`, but not `role`.

Security rules:

- Do not rely only on frontend role dropdown restrictions.
- Do not trust client-submitted role updates.
- Do not create any RLS policy that allows normal users to promote themselves to admin.

---

## Auth Implementation Rules

Signup page should allow only:

- Freelancer
- Client

Signup page must **never** expose admin as an option.

On signup:

- Create Supabase auth user
- Create corresponding `user_profiles` row
- Redirect by role:
  - `freelancer` → `/dashboard/freelancer`
  - `client` → `/dashboard/client`

If Supabase email confirmation is enabled and signup returns no active session:

- Show a clear “check your email to confirm your account” message
- Do not crash

For local/demo testing, email confirmation is currently disabled.

---

## Login Rules

Login should:

- Sign in with Supabase email/password auth
- Fetch matching row from `user_profiles`
- Redirect based on role:
  - `freelancer` → `/dashboard/freelancer`
  - `client` → `/dashboard/client`
  - `admin` → `/dashboard/admin`

If profile row is missing:

- Show a clear error
- Do not silently create fake data

---

## Protected Route Rules

Dashboard protection must follow:

- Unauthenticated user → `/login`
- Freelancer → `/dashboard/freelancer`
- Client → `/dashboard/client`
- Admin → `/dashboard/admin`

Wrong-role users should be redirected to their correct dashboard.

Examples:

- Freelancer trying to open `/dashboard/admin` should be redirected to `/dashboard/freelancer`
- Client trying to open `/dashboard/freelancer` should be redirected to `/dashboard/client`
- Admin should be the only role allowed into `/dashboard/admin`

---

## Navbar and Logout Rules

Navbar behavior:

- Logged-out users see Login and Signup links
- Logged-in users see dashboard link and Logout button
- Logout should call Supabase `signOut`
- Logout should clear auth state
- Logout should redirect to `/login`

---

## Backend Auth Rule

Do not implement real backend JWT verification yet.

For Task 002, only create:

```text
backend/app/core/auth.py
```

This file should contain clean TODO stubs for future Supabase JWT verification.

Do not:

- Implement insecure fake auth
- Use service role key yet
- Trust frontend role values in backend logic
- Add backend authorization based only on client-submitted role

Backend env example should include:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Service role must never be exposed to frontend.

---

## Milestone Roadmap

### Milestone 0: Foundation

Status: **Completed**

Includes base frontend/backend project structure and placeholder routes.

### Milestone 1: Supabase Auth and Role Routing

Status: **Completed**

Goal: real login/signup, role-based frontend routing, protected dashboards, safe `user_profiles` table.

### Milestone 2A: Freelancer and Client Profile Setup

Status: **Completed**

Goal:

- Freelancer profile creation/editing
- Client profile creation/editing if needed
- Structured skill/category fields
- No AI yet unless structured data exists

### Milestone 2B: Client Gig Posting

Status: **Completed and tested**

Goal:

- Client gig creation
- Client gig list/manage view
- Client gig editing
- Client-owned `gigs` table with RLS
- No AI matching or freelancer recommendations yet

### Milestone 3: Resume/Gig Parsing

Status: **Completed and tested**

Goal:

- Resume PDF upload
- Resume text extraction
- Basic skill extraction
- Messy gig description parsing
- Editable parsed output

### Milestone 3A: Skill Taxonomy and Deterministic Extraction Utilities

Status: **Completed and tested**

Goal:

- Curated technical skill taxonomy
- Text normalization helpers
- Deterministic skill extraction through aliases
- No resume upload, PDF parsing, DOCX parsing, frontend UI, database persistence, Supabase calls, embeddings, AI extraction, or matching

### Milestone 3B: Stateless Backend Parsing Endpoints

Status: **Completed and tested**

Goal:

- Backend endpoints that accept raw text and return deterministic parsed output
- No persistence until the parser contract is reviewed

### Milestone 3C: Parsing Database Foundation

Status: **Completed and tested**

Goal:

- Safe persistence for parsed resume and gig outputs
- `resume_parses` and `gig_parses` tables with RLS

### Milestone 3D: Resume Text Parsing Review UI + Save Flow

Status: **Completed and tested**

Goal:

- Freelancer-only page for pasted resume text
- Call stateless backend parser
- Editable parsed-output review UI
- Save/fetch reviewed output from `resume_parses` through frontend Supabase client and RLS
- No PDF/DOCX upload yet

### Milestone 3E: Gig Description Parsing Review UI + Save Flow

Status: **Completed and tested**

Goal:

- Client-only page for existing gig descriptions
- Call stateless backend parser
- Editable parsed-output review UI
- Save/fetch reviewed output from `gig_parses` through frontend Supabase client and RLS
- No AI matching/recommendations yet

### Milestone 3F: PDF/DOCX Text Extraction

Status: **Completed and tested**

Goal:

- Resume document text extraction after text-paste parsing flows are stable
- No AI matching or recommendations yet

### Milestone 3F-A: Document Text Extraction Utilities

Status: **Completed and tested**

Goal:

- Backend-only PDF/DOCX plain text extraction utilities
- Return extracted text, metadata, and warnings
- No upload route, frontend upload UI, storage, parser call, database write, OCR, AI extraction, embeddings, matching, or recommendations

### Milestone 3F-B: Stateless Resume Document Extraction Endpoint

Status: **Completed and tested**

Goal:

- Backend endpoint for document text extraction using the completed utility layer
- No persistence or parser side effects

### Milestone 3F-C: Resume Parser Upload Input Integration

Status: **Completed and tested**

Goal:

- Add document upload as an input method for existing resume text review flow
- No storage buckets until explicitly designed

### Milestone 3G: Verification and Hardening

Status: **Completed**

Goal:

- Parser edge-case tests
- Security and data-flow review
- End-to-end verification before matching begins

### Milestone 4: Matching Engine

Status: **Completed and tested**

Goal:

- Normalized matching entities
- Keyword baseline scoring and ranking
- Semantic text/provider interface and runtime semantic similarity
- Hybrid ranking
- Auth-safe data access
- Bidirectional backend matching API routes
- Verification and docs closure

### Milestone 5: Explainability and Skill Gap

Status: **Planned next**

Goal:

- Match explanations
- Matched skills
- Missing skills
- Score breakdown
- Skill-gap recommendations

### Milestone 6: Admin Evaluation Dashboard

Status: **Planned**

Goal:

- Keyword vs semantic vs hybrid comparison
- Precision@K
- Recall@K
- NDCG@K
- MAP if feasible
- Case studies
- Match distribution analytics

### Milestone 7: Deployment and Black Book

Status: **Planned**

Goal:

- Frontend deployment
- Backend deployment
- Supabase production/demo configuration
- Black book diagrams
- Viva preparation
- Final PPT
- Demo script

---

## Near-Term Next Tasks

Begin Milestone 5 in smaller safe steps:

1. Design the explanation contract over existing matching results without changing the verified Milestone 4 route privacy boundary accidentally.
2. Add focused tests before exposing any user-facing explanation or skill-gap wording.
3. Keep admin analytics, ranking metrics, fake production claims, pgvector/FAISS retrieval, saved match history, and behavioral feedback learning out of Milestone 5 unless explicitly scoped later.
4. Commit each milestone step separately.

Do not begin admin analytics, fake evaluation metrics, Milestone 6 dashboard features, or production-scale claims during Milestone 5.

---

## Milestone 2 Expected Direction

Milestone 2 should add product data, still without AI.

### Freelancer Profile Fields

Possible fields:

- Full name
- Headline
- Bio
- Location
- Experience level
- Primary role
- Tech categories
- Skills
- Tools
- Project links
- GitHub URL
- Portfolio URL
- LinkedIn URL
- Availability
- Preferred gig type

### Client Gig Fields

Possible fields:

- Gig title
- Description
- Tech category
- Required skills
- Preferred skills
- Budget range
- Difficulty level
- Seniority needed
- Deliverables
- Remote/on-site
- Deadline
- Status: draft/open/closed

### Possible Tables Later

Do not create these in Task 002, but they may be needed in Milestone 2:

- `freelancer_profiles`
- `client_profiles`
- `gigs`
- `skills`
- `freelancer_skills`
- `gig_required_skills`
- `gig_preferred_skills`

Keep schema practical and avoid overengineering.

---

## AI/ML Direction for Later Milestones

Do not implement AI before Milestone 2 data structures exist.

When AI begins, use honest implementation.

### Resume Parsing

Use:

- PyMuPDF or pdfplumber for PDF text extraction
- Regex/spaCy/taxonomy-based extraction for skills
- User confirmation/editing after parsing

Do not claim perfect resume parsing.

### Skill Extraction

Use a hybrid practical method:

- Curated `skills_taxonomy.json`
- Alias mapping
- Regex/string matching
- Optional spaCy phrase matcher

Do not pretend a custom large NER model was trained unless actually implemented.

### Embeddings

Use sentence-transformers or similar open-source embedding models.

Create structured text before embedding.

Example freelancer embedding text:

```text
Role: Full-stack developer.
Skills: React, FastAPI, PostgreSQL, Supabase.
Projects: AI scholarship matching platform, document extraction pipeline.
Domains: AI SaaS, web development, backend APIs.
```

Example gig embedding text:

```text
Gig: Build AI-powered dashboard.
Required skills: React, FastAPI, PostgreSQL, document parsing.
Domain: AI SaaS.
Deliverables: dashboard, API, database.
```

### Matching Methods

Implement three methods:

1. Keyword baseline
2. Semantic embedding similarity
3. Hybrid ranking

### Hybrid Ranking Signals

Hybrid score can combine:

- Semantic similarity
- Required skill coverage
- Preferred skill coverage
- Missing critical skill penalty
- Domain alignment
- Seniority fit
- Project similarity
- Cold-start fairness

### Safe Cold-Start Claim

Safe claim:

> The system reduces cold-start disadvantage by making semantic skill alignment and required skill coverage primary ranking signals when behavioral history is unavailable.

Unsafe claim:

> The system guarantees fair hiring.

---

## Evaluation Direction

Evaluation must be honest.

Do not use fake huge numbers.

Possible evaluation dataset size for BE V1:

- 300–500 freelancer profiles
- 100–200 tech gigs
- 1,000–5,000 labeled freelancer-gig pairs if feasible

Use ranking labels:

```text
0 = not relevant
1 = weak match
2 = decent match
3 = strong match
```

Compare:

- Keyword baseline
- Semantic similarity
- Hybrid ranking

Metrics:

- Precision@5
- Recall@10
- NDCG@10
- MAP if feasible
- Average query time
- Case studies where keyword matching fails

Only claim improvements that are measured on the project’s own evaluation set.

---

## Black Book and Viva Strategy

Describe the project academically as:

> This project proposes an AI-assisted gig discovery and matching platform focused on tech gigs. It converts freelancer profiles and gig descriptions into structured skill representations and semantic embeddings, compares keyword-based matching with embedding-based semantic retrieval, and applies a hybrid ranking model combining semantic similarity, skill coverage, domain alignment, seniority fit, and cold-start fairness. The system provides explainable recommendations and evaluates ranking quality using information retrieval metrics.

### Required Diagrams Later

- Use case diagram
- System architecture diagram
- ER diagram
- Data flow diagram
- AI pipeline diagram
- Sequence diagram for freelancer matching
- Sequence diagram for client matching
- Hybrid scoring flowchart
- Evaluation workflow
- Deployment architecture

### Algorithms to Explain Later

- Keyword matching
- Cosine similarity
- Transformer embeddings
- Skill extraction and normalization
- Hybrid ranking
- Precision@K
- Recall@K
- NDCG@K
- MAP
- Cold-start handling
- Explainability logic

### Safe Claims

Safe claims include:

- The system uses transformer-based embeddings.
- The system compares keyword, semantic, and hybrid matching.
- The hybrid score improves ranking on the project’s labeled evaluation dataset only if measured.
- Recommendations are explainable through matched skills, missing skills, and score breakdown.
- Cold-start design reduces dependence on ratings/reviews.

### Unsafe Claims

Avoid claiming:

- The system was trained on 500,000 profiles.
- The platform reduces hiring time by 66%.
- The system guarantees fairness.
- The ranking model uses reinforcement learning.
- The system is production-scale.
- AI agents negotiate contracts.
- Blockchain credentials verify trust.

---

## Coding and Project Rules for Future Chats

Future chats must follow these rules:

- Do not hype fake things.
- Do not invent completed features.
- Do not suggest unnecessary features.
- Do not implement AI before data structures exist.
- Do not add marketplace scope creep.
- Keep the project practical for a 2-month BE timeline.
- Keep teammate tasks isolated and GitHub-issue friendly.
- Prioritize AI core, UI/UX, evaluation, deployment, documentation.
- Maintain black-book and viva defensibility.
- Do not blindly trust old report/PPT claims.
- Always separate implemented features from planned features.
- Do not call a feature completed unless the user explicitly says it is implemented and verified.
- Keep the UI premium and developer-focused, not like a generic college form app.
- Prefer clean, maintainable architecture over overengineered abstractions.
- Avoid fake dashboards and mock AI outputs pretending to be real.

---

## Current Run Commands

Frontend:

```bash
cd /Users/drivyaanshyadav/Desktop/Ai-Gig/gigmatch-ai/frontend
npm run dev
```

Frontend local URL:

```text
http://127.0.0.1:5173/
```

Backend:

```bash
cd /Users/drivyaanshyadav/Desktop/Ai-Gig/gigmatch-ai/backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

Backend health check:

```bash
curl http://127.0.0.1:8000/health
```

---

## How to Continue in a New Chat

Use one of these prompts in a new chat after adding this file to project sources.

### Start Matching

```text
Continue the BE project from the source context. We are starting Milestone 4. Help me plan and implement the matching engine safely, beginning with a backend keyword baseline and a clear scoring contract.
```

### Create Next Codex Prompt

```text
Continue the BE project from the source context. Create the next Codex prompt for Milestone 4 matching engine implementation.
```

### Explain Architecture for Viva

```text
Continue the BE project from the source context. Explain the current architecture for viva.
```

### Debug Auth

```text
Continue the BE project from the source context. Help me debug the auth implementation.
```

### Plan Next Implementation Step

```text
Continue the BE project from the source context. Tell me the next safest implementation step and give me a Codex prompt.
```

---

## Context Maintenance Rule

This file should stay useful and not become too large.

After each milestone:

1. Update the `Last updated`, `Current milestone`, and `Current status` fields at the top.
2. Move completed task-specific implementation details into a changelog or milestone history section.
3. Keep only the current active task in detail.
4. Preserve major architectural decisions and safety rules.
5. Do not let old completed prompts make future chats overbuild outdated tasks.

---

## Summary of Current State

The project foundation is complete.

Supabase project has been created and email confirmation has been disabled for local/demo testing.

Milestone 1 auth/role routing, Milestone 2A structured profile setup, and Milestone 2B client gig posting are complete and tested.

The database now includes:

- `user_profiles`
- `freelancer_profiles`
- `client_profiles`
- `gigs`
- `resume_parses`
- `gig_parses`

The current next action is:

> Milestone 5 — Explainability and Skill Gap.

Milestone 3 is complete and was split safely into smaller steps:

- Milestone 3A: Skill taxonomy and extraction utilities
- Milestone 3B: Stateless backend parsing endpoints
- Milestone 3C: Parsing database foundation
- Milestone 3D: Resume text parsing review UI + save flow
- Milestone 3E: Gig description parsing review UI + save flow
- Milestone 3F: PDF/DOCX text extraction
- Milestone 3G: Verification and hardening

Milestone 4 backend foundation progress:

- Milestone 4A: Matching contract and normalized entity builders — complete and tested
- Milestone 4B: Keyword baseline scoring and ranking — complete and tested
- Milestone 4C: Semantic text builders and embedding provider interface — complete and tested
- Milestone 4D: Runtime semantic similarity engine — complete and tested
- Milestone 4E: Hybrid ranking engine — complete and tested
- Milestone 4F-A: Auth-safe matching data access — complete and tested
- Milestone 4F-B: Bidirectional backend matching API routes — complete and tested
- Milestone 4G: Matching verification and docs closure — complete and tested

Milestone 4 is closed. Do not proceed to admin analytics, fake evaluation metrics, or Milestone 6 features during Milestone 5 unless explicitly scoped later.
