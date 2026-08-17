# GigMatch AI

**An explainable, security-conscious marketplace that takes technical freelance work from discovery to engagement.**

GigMatch AI connects freelancers with relevant technology gigs and gives clients a structured path to publish work, evaluate applicants, agree on exact proposal terms, and manage the resulting engagement. It combines hybrid skill matching with a versioned marketplace workflow, so recommendations are understandable and commercial decisions remain auditable.

This repository contains the complete product implementation: a role-aware React application, FastAPI service, Supabase/PostgreSQL data layer, database-enforced authorization, matching and evaluation systems, and automated verification across the stack.

## Product capabilities

### Freelancers

- Build a structured technical profile and extract skills from pasted text, PDF, or DOCX resumes.
- Discover gigs with evidence-based recommendations and skill-gap analysis.
- Submit fixed-price, hourly, phased, or discovery proposals; revise, withdraw, and track version history.
- Handle material gig changes, structured client Q&A, and exact-version selection requests.
- Manage confirmed engagements and share contact details through explicit, revocable consent.

### Clients

- Create, publish, edit, pause, resume, close, reopen, and cancel gigs through guarded lifecycle transitions.
- Parse gig descriptions into reviewable skills, categories, deliverables, and seniority requirements.
- Review ranked applicants, shortlist or advance candidates, request clarification, and manage revisions.
- Send time-bound selection requests and atomically convert an accepted proposal into an engagement.
- Manage engagement status, cancellation, gig reopening, reconsideration, and secure contact exchange.

### Administrators

- Compare keyword, semantic, and hybrid ranking strategies against seeded relevance judgments.
- Inspect Precision@K, Recall@K, NDCG@K, Average Precision, and MAP availability through an authenticated evaluation console.

## Engineering highlights

- **Explainable hybrid matching:** deterministic keyword scoring and optional semantic similarity combine with a default `0.55 / 0.45` weighting. Recommendations include reasons, score evidence, matched skills, missing skills, and gap severity.
- **Version-safe workflows:** immutable proposal snapshots, material-term tokens, request IDs, idempotency controls, and guarded state transitions prevent stale or ambiguous commercial actions.
- **Atomic selection:** PostgreSQL functions and locking enforce one accepted selection per gig and create an engagement from the exact accepted proposal version.
- **Defense in depth:** Supabase Auth, trusted role and ownership checks, Row Level Security, restricted grants, and backend authorization protect every data path.
- **Private contact exchange:** contact data is encrypted at rest, fingerprinted with a separate key, revealed only after authorization, rate-limited, revocable, and supported by block/report controls.
- **Privacy-aware parsing:** PDF/DOCX extraction is stateless, uploads are not retained, and users review structured output before persistence.
- **Layered verification:** 15 ordered database migrations, 31 backend test modules, 13 frontend test modules, and 11 SQL test suites, plus browser and concurrency artifacts.

## Architecture

```text
React 19 + TypeScript + Vite
        | Supabase sessions + bearer tokens
        v
FastAPI application -----------------> Matching and evaluation
        | verified identity             | keyword + semantic + hybrid
        v                               v
Supabase Auth + PostgreSQL <------- versioned marketplace records
        |
        +-- RLS, grants, constraints, triggers and transactions
```

The browser owns presentation and session acquisition. FastAPI owns authenticated marketplace commands, privacy-safe read models, matching, parsing, evaluation, and cross-record rules. PostgreSQL is the final authority for ownership, integrity, concurrency, and atomic transitions.

Read the [architecture guide](docs/architecture/README.md), [matching guide](docs/matching.md), [parsing guide](docs/parsing.md), or [documentation index](docs/README.md).

## Technology stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router, Tailwind CSS, Radix UI |
| Backend | Python, FastAPI, Pydantic, Uvicorn |
| Data and identity | Supabase Auth, PostgreSQL 17, RLS, SQL functions and triggers |
| Matching | Skill taxonomy, keyword scoring, cosine similarity, pluggable embeddings, hybrid ranking |
| Documents | PyMuPDF, python-docx, multipart validation |
| Security | Verified tokens, role/ownership policy, contact encryption, keyed fingerprints, rate limits |
| Quality | `unittest`, Node test runner, ESLint, TypeScript, SQL suites, browser and concurrency checks |

## Repository map

```text
gigmatch-ai/
├── frontend/                 Product React application and tests
├── backend/                  FastAPI routes, domain services and tests
├── supabase/
│   ├── migrations/           Authoritative ordered database schema
│   └── tests/                Policy, invariant and workflow tests
├── docs/                     Current guides and verification archive
├── scripts/                  Concurrency and browser verification helpers
├── manual-test-files/        Synthetic parsing fixtures
└── milestone-7-product-spec.md  Historical product specification
```

The `concepts*` directories are preserved design explorations, not the runtime product. The canonical frontend is `frontend/`.

## Local setup

### Prerequisites

- Node.js 22.6+ and npm (required by the frontend test runner's type stripping)
- Python 3.11+
- Supabase CLI and a Docker-compatible runtime
- A Supabase project or the local Supabase stack

### 1. Database

`supabase/migrations/` is the authoritative schema history.

```bash
supabase start
supabase db reset --local
supabase status
```

Use the local URL and keys printed by `supabase status`. The files under `docs/database/` are early bootstrap references; do not apply them after the migration chain.

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

On Windows, activate with `.venv\Scripts\Activate.ps1`. The API starts at `http://localhost:8000`; OpenAPI is at `http://localhost:8000/docs`.

```bash
curl http://localhost:8000/health
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Vite starts at `http://localhost:5173` by default.

## Configuration

Never expose `SUPABASE_SECRET_KEY`, contact-encryption keys, or fingerprint keys through `VITE_*` variables.

### Frontend

| Variable | Purpose |
| --- | --- |
| `VITE_APP_NAME` | Product name |
| `VITE_API_BASE_URL` | FastAPI base URL |
| `VITE_SUPABASE_URL` | Supabase API URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase key |
| `VITE_GOOGLE_AUTH_ENABLED` | Google sign-in control; provider setup is also required |

### Backend

| Variable | Purpose |
| --- | --- |
| `APP_NAME`, `APP_ENV`, `FRONTEND_ORIGIN` | Service metadata and browser origin |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Token verification and authenticated access |
| `SUPABASE_SECRET_KEY` | Trusted server-side operations only |
| `EMBEDDING_MODEL_NAME` | Optional sentence-transformers model; blank disables runtime semantic ranking |
| `APPLICANT_SHORTLIST_CAPACITY`, `APPLICANT_ADVANCEMENT_CAPACITY` | Applicant review limits |
| `QA_*` | Q&A burst, daily, revision, and pagination policies |
| `CONTACT_*` | Encryption keyring, fingerprint, reveal rate, and window |

Generate independent 32-byte base64 contact encryption and fingerprint keys. During rotation, activate a new key ID but retain prior encryption keys until existing ciphertext is migrated.

## Verification

```bash
cd backend
.venv/bin/python -m unittest discover -s tests -v
```

```bash
cd frontend
npm test
npm run lint
npm run build
```

```bash
supabase db reset --local
supabase test db
```

Focused browser and concurrency helpers live in `frontend/e2e/` and `scripts/`; consult the [verification archive](docs/README.md#historical-engineering-evidence) before environment-specific checks.

## Security model

- Public signup is restricted to freelancer/client roles; administrators require trusted provisioning.
- The backend verifies Supabase access tokens and loads the trusted profile role.
- RLS, column grants, constraints, and triggers protect direct Data API access.
- Safe response models omit raw resumes, private profiles, auth metadata, secrets, and embeddings.
- Commercial actions use version tokens and idempotency keys; PostgreSQL serializes critical transitions.
- Contact reveal is engagement-scoped, consent-based, encrypted, audited, rate-limited, and reversible.

These controls do not replace an independent security review, operational monitoring, secret management, backups, or abuse-response procedures.

## Current boundaries

- Semantic ranking requires a separately installed `sentence-transformers` package and configured model; unavailable infrastructure is surfaced explicitly.
- Skill extraction recognizes a curated taxonomy and does not infer proficiency or experience duration.
- PDF extraction supports embedded text; OCR is not included.
- Evaluation uses seeded judgments and makes no real-world accuracy or business-impact claim.
- Payment terms are modeled, but payment processing and escrow are not implemented.
- Email delivery, production observability, backups, and moderation require environment-specific integrations.

## Documentation

- [Documentation index](docs/README.md)
- [System architecture](docs/architecture/README.md)
- [Matching and explainability](docs/matching.md)
- [Parsing pipeline](docs/parsing.md)
- [Capability history](docs/milestones.md)
- [Portfolio and resume guide](docs/portfolio-resume.md)

## Project ownership

GigMatch AI was independently designed and built end to end across product design, React UX, FastAPI services, PostgreSQL data modeling, secure authorization, explainable ranking, workflow state machines, and automated verification.
