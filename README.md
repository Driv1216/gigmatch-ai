# GigMatch AI

**An explainable, security-conscious marketplace for taking technical freelance work from discovery to a confirmed engagement.**

GigMatch AI connects freelancers with relevant technology gigs and gives clients a structured path to publish work, evaluate applicants, agree on exact proposal terms, and manage the resulting engagement. It combines hybrid skill matching with a versioned marketplace workflow, so recommendations are understandable and commercial decisions remain auditable.

This repository contains the complete product implementation: a role-aware React application, FastAPI service, Supabase/PostgreSQL data layer, database-enforced authorization, matching and evaluation systems, and automated verification across the stack.

## Product promise

Most freelance marketplaces stop at search and messaging. GigMatch AI treats the entire decision as one connected, auditable workflow:

```text
structured profile + structured gig
        -> explainable recommendations
        -> versioned proposal and review
        -> exact-version selection
        -> protected engagement and contact exchange
```

The product is designed around three principles:

- **Relevant without being opaque:** keyword evidence remains the majority ranking signal, while a pinned local semantic model adds bounded contextual understanding.
- **Flexible without being ambiguous:** gig terms, proposals, revisions, and selections retain exact versions and explicit state transitions.
- **Private without relying on UI trust:** identity, ownership, sensitive fields, and critical transitions are enforced across FastAPI, PostgreSQL, RLS, grants, and transactional functions.

## Current verified state

The current product baseline includes the complete account-to-engagement marketplace and the R1 production semantic refinement. The final external R1 gate passed with:

- 218/218 focused semantic and matching checks;
- 3/3 real E5 integration smoke checks;
- 458 backend tests passed, 6 intentionally skipped, and 0 failed;
- 189/189 frontend tests, plus ESLint and production build;
- Python 3.13.13 semantic runtime verified on CPU;
- frozen benchmark, decision, holdout, and artifact checksums verified;
- an identical worktree before and after verification.

See the [R1 semantic closure](docs/verification/semantic-matching-refinement-closure.md) for scope, evidence, limitations, and supported claims.

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
- Inspect Precision@K, Recall@K, NDCG@K, Average Precision, MAP, and pairwise-ordering evidence through an authenticated evaluation console.

## Engineering highlights

- **Explainable hybrid matching:** deterministic keyword scoring and E5 semantic similarity combine with a conservative product weighting of `0.75 / 0.25`. Recommendations include reasons, score evidence, matched skills, missing skills, and gap severity, with honest keyword fallback when the model is unavailable.
- **Version-safe workflows:** immutable proposal snapshots, material-term tokens, request IDs, idempotency controls, and guarded state transitions prevent stale or ambiguous commercial actions.
- **Atomic selection:** PostgreSQL functions and locking enforce one accepted selection per gig and create an engagement from the exact accepted proposal version.
- **Defense in depth:** Supabase Auth, trusted role and ownership checks, Row Level Security, restricted grants, and backend authorization protect every data path.
- **Private contact exchange:** contact data is encrypted at rest, fingerprinted with a separate key, revealed only after authorization, rate-limited, revocable, and supported by block/report controls.
- **Privacy-aware parsing:** PDF/DOCX extraction is stateless, uploads are not retained, and users review structured output before persistence.
- **Evidence-led semantic integration:** a frozen 120-judgment benchmark separated model/weight selection from a locked holdout; keyword remained exceptionally strong, and E5 was the strongest semantic provider tested.
- **Layered verification:** backend, frontend, SQL, browser, concurrency, model-smoke, checksum, and compile gates cover the product at different authority boundaries.

## Architecture

```text
React 19 + TypeScript + Vite
        | Supabase sessions + bearer tokens
        v
FastAPI application -----------------> Matching and evaluation
        | verified identity             | keyword + pinned local E5 + hybrid
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
| Matching | Skill taxonomy, deterministic keyword scoring, pinned E5 embeddings, cosine similarity, explainable hybrid ranking |
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

The normal backend requirements include the selected transformer stack. The E5 model is loaded lazily on the first semantic request and may download into the configured Hugging Face cache unless offline-only mode is enabled. On Windows, activate with `.venv\Scripts\Activate.ps1`. The API starts at `http://localhost:8000`; OpenAPI is at `http://localhost:8000/docs`.

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
| `EMBEDDING_MODEL_NAME`, `EMBEDDING_MODEL_REVISION` | Production sentence-transformers model and immutable revision |
| `EMBEDDING_INPUT_POLICY` | Provider-local query/candidate preparation policy (`e5_retrieval` for R1) |
| `EMBEDDING_CACHE_FOLDER`, `EMBEDDING_LOCAL_FILES_ONLY` | Optional model-cache path and offline-only loading control |
| `HYBRID_KEYWORD_WEIGHT`, `HYBRID_SEMANTIC_WEIGHT` | Production hybrid weights; R1 uses the deliberate conservative `0.75 / 0.25` product setting |
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

The complete non-rewriting R1 semantic gate is intended for a controlled environment with the frozen model cache:

```bash
./scripts/verify_semantic_r1.sh
```

## Security model

- Public signup is restricted to freelancer/client roles; administrators require trusted provisioning.
- The backend verifies Supabase access tokens and loads the trusted profile role.
- RLS, column grants, constraints, and triggers protect direct Data API access.
- Safe response models omit raw resumes, private profiles, auth metadata, secrets, and embeddings.
- Commercial actions use version tokens and idempotency keys; PostgreSQL serializes critical transitions.
- Contact reveal is engagement-scoped, consent-based, encrypted, audited, rate-limited, and reversible.

These controls do not replace an independent security review, operational monitoring, secret management, backups, or abuse-response procedures.

## Current boundaries

- Semantic ranking uses a local CPU model and therefore has non-trivial first-load, memory, and inference costs. If the model cannot load or encode safely, the product reports semantic unavailability and falls back to keyword ranking.
- Python 3.13.13 is verified for the selected semantic stack. Python 3.14 remains unverified because its optional dependency environment could not be installed inside the external verification sandbox; this is not evidence of incompatibility.
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
- [R1 semantic refinement closure](docs/verification/semantic-matching-refinement-closure.md)
- [Portfolio and resume guide](docs/portfolio-resume.md)

## Project ownership

GigMatch AI was independently designed and built end to end across product design, React UX, FastAPI services, PostgreSQL data modeling, secure authorization, explainable ranking, workflow state machines, and automated verification.
