# GigMatch AI — Portfolio and Resume Evidence

This document is the evidence-backed source for describing GigMatch AI in a résumé, portfolio, application, or interview. All implementation work was completed individually. Use the concise versions in a résumé and the deeper sections for portfolios and interview preparation.

## What the project is

**GigMatch AI is an explainable freelance marketplace that helps technical freelancers and clients discover relevant matches and safely move from a gig listing to an agreed, versioned engagement.**

### Problem it solves

Typical freelance platforms separate weak keyword search from the commercial workflow. GigMatch AI combines explainable bidirectional matching with structured proposals, controlled negotiation, exact-version selection, engagement lifecycle management, and consent-based contact sharing.

### Current status

**Complete product implementation under active development.** The end-to-end product workflow, database model, frontend, backend, matching system, security boundaries, and automated verification are implemented. Environment-specific operations such as payment processing, OCR, production observability, email delivery, and moderation operations remain explicit integration boundaries.

### Ownership

**Individual project — 100% designed and built by me.** I owned the product definition, UX, frontend architecture, backend APIs, database schema and migrations, matching/evaluation system, authentication and authorization, security controls, automated tests, browser verification, concurrency testing, and technical documentation.

## Exact technology stack

| Area | Technologies genuinely used |
| --- | --- |
| Languages | TypeScript, JavaScript, Python, SQL, HTML, CSS |
| Frontend | React 19, React DOM, React Router, Vite, Tailwind CSS, Radix UI, Supabase JS |
| Backend | FastAPI, Pydantic/Pydantic Settings, Uvicorn, Python multipart handling |
| Database and auth | PostgreSQL 17, Supabase PostgreSQL, Supabase Auth, Row Level Security, SQL functions, triggers, constraints and grants |
| AI/ML and ranking | Canonical skill taxonomy, deterministic keyword scoring, revision-pinned E5 embeddings, cosine similarity, hybrid ranking, deterministic explanation generation |
| Document processing | PyMuPDF for PDF extraction, python-docx for DOCX extraction |
| Security | `cryptography` with AES-GCM, independently keyed fingerprints, verified bearer tokens, role/ownership policy, rate limiting |
| Testing and quality | Python `unittest`, Node test runner, ESLint, TypeScript compiler, SQL database suites, Playwright/browser scripts, concurrency verification scripts |
| Infrastructure/tooling | Supabase CLI, PostgreSQL migrations, npm, Git, GitHub, FastAPI OpenAPI |

The production semantic provider uses `intfloat/e5-small-v2` at an immutable revision on CPU with remote code disabled. It is loaded lazily, reused per process, and fed request-level batches through an isolated E5 query/passage policy. Ordinary tests still use injected deterministic providers; an opt-in real-model smoke verifies the actual integration.

## What I built

### Major product systems

- Role-aware authentication, signup, verification, OAuth callback, account completion, and protected navigation for freelancers, clients, and administrators.
- Structured freelancer/client profiles and reviewable resume/gig parsing.
- Gig discovery, detail, creation, versioning, material-edit previews, publishing, pausing, reopening, intake control, filling, and cancellation.
- Fixed-price, hourly, phased, and discovery-style applications with immutable proposal versions.
- Ranked applicant review, private shortlisting, advancement, return-to-review, rejection, reopening, and capacity controls.
- Structured application Q&A, safety checks, rate limits, reports, correction chains, and proposal revision requests.
- Time-bound exact-version selection requests with cancellation, acceptance, revision, decline, expiry, and invalidation handling.
- Engagement workspace with accepted-term snapshots, lifecycle transitions, cancellation, gig reopening, and reconsideration invitations.
- Consent-based encrypted contact exchange with masked views, authorized reveal, audit history, revocation, block, and report controls.
- Admin matching evaluator comparing ranking strategies with information-retrieval metrics.

### Architecture decisions

- Split responsibility across a React presentation/session layer, FastAPI policy and domain layer, and PostgreSQL integrity/transaction layer.
- Made PostgreSQL the final authority for cross-record invariants and concurrency-sensitive transitions rather than trusting browser state.
- Separated pure domain contracts/state machines from HTTP routes and Supabase data-access adapters.
- Preserved immutable gig/application versions so material changes and accepted commercial terms remain auditable.
- Used narrow safe response projections to avoid returning raw resumes, secrets, auth metadata, private profiles, or embedding vectors.
- Kept matching explanations downstream of ranking so explanation generation cannot manipulate ordering.
- Modeled semantic availability explicitly and used an honest keyword fallback instead of fabricated similarity values.

### Backend and API work

- Built **80 FastAPI route handlers** across 14 route modules for authentication/profile status, gigs, applications, review, Q&A, selections, engagements, contact exchange, dashboards, parsing, matching, evaluation, and health checks.
- Defined strict Pydantic request contracts with forbidden unknown fields, bounded text, discriminated proposal variants, UUID request IDs, and exact-version action tokens.
- Implemented trusted authentication dependencies, consistent error mapping, privacy-safe response assembly, and non-enumerating authorization failures.
- Added OpenAPI-compatible endpoint contracts and dependency-injectable auth, repository, embedding, and clock boundaries for deterministic testing.

### Database work

- Authored and maintained **15 ordered Supabase migrations** defining **28 unique PostgreSQL tables** across public and private schemas.
- Implemented **47 unique public PostgreSQL functions/RPCs** for account setup and marketplace reads/commands, supported by private validation, token, projection, replay, and locking functions.
- Added **34 explicit `CREATE POLICY` migration statements** plus grants, triggers, foreign keys, checks, uniqueness constraints, immutable-history guards, and ownership helpers.
- Designed transactional selection confirmation, deterministic lock ordering, operation replay/idempotency records, exact-version conflict rejection, and database-authoritative timestamps.
- Built public/private separation for sensitive contact ciphertext and operation data.

### AI/ML and matching work

- Created a **90-skill canonical technical taxonomy** with normalized aliases and boundary-aware deterministic extraction.
- Built normalized freelancer and gig feature representations from skills, categories, role, experience, tools, deliverables, seniority, biography/project context, and gig description.
- Implemented bidirectional matching for freelancer-to-gig and gig-to-freelancer queries.
- Implemented **4 ranking modes**: keyword, semantic, hybrid, and explicit keyword fallback.
- Built model-independent semantic text, a pluggable embedding interface, direction-aware E5 query/passage formatting, request-level batch encoding, strict vector validation, and cosine-similarity scoring.
- Integrated a conservative production hybrid policy of **75% keyword score and 25% semantic score**, explicitly documented as a product decision rather than a benchmark-optimality claim.
- Added deterministic feature-based explanations containing reason codes, component scores, skill coverage, missing required/preferred skills, and gap severity.
- Built an evaluation runner comparing **3 primary strategies**—keyword, semantic, and hybrid—on the same candidates.
- Implemented Precision@K, Recall@K, NDCG@K, Average Precision, and MAP availability with conservative completeness rules.
- Preserved a lightweight seeded evaluator and created a frozen semantic benchmark with **24 bidirectional queries and 120 graded judgments**, separated into an 80-judgment selection set and a locked 40-judgment holdout. The evidence showed keyword exceptionally strong and E5 the strongest semantic provider tested; it is not a claim of production accuracy or business lift.
- Used no LLM for ranking, skill extraction, or explanation generation. Deterministic logic keeps outputs auditable and testable.

### Authentication and security work

- Integrated Supabase Auth while loading the trusted application role from the database rather than trusting browser role claims.
- Restricted public signup to freelancer/client roles and protected administrator provisioning.
- Combined FastAPI role/ownership checks with PostgreSQL RLS, column/function grants, constraints, and safe public projections.
- Verified bearer tokens through Supabase Auth and failed closed when identity infrastructure or credentials were invalid.
- Protected stale/duplicate commercial actions with expected-version tokens, idempotency UUIDs, immutable snapshots, and transactional database functions.
- Encrypted contact values with AES-GCM, bound ciphertext to contextual associated data, used a separate keyed fingerprint, supported versioned key rotation, and re-authorized every reveal.
- Added reveal rate limits, no-store behavior, audit records, revocation, blocking, reporting, and Q&A contact/credential safety checks.

## Defensible engineering numbers

Counts below are repository-derived and should be timestamped when used externally because active development may change them.

| Evidence | Defensible count |
| --- | ---: |
| Product roles | 3 — freelancer, client, administrator |
| FastAPI route handlers | 80 |
| API route modules | 14 |
| Ordered database migrations | 15 |
| Unique PostgreSQL tables | 28 |
| Unique public PostgreSQL functions/RPCs | 47 |
| Explicit policy creation statements | 34 |
| Canonical taxonomy skills | 90 |
| Ranking modes | 4 |
| Strategies compared by evaluator | 3 |
| Evaluation query directions | 2 |
| Seeded candidate instances/judgments | 6 / 6 |
| Gig product states | 6 |
| Application stages | 6 |
| Selection request states | 7 |
| Engagement lifecycle states | 7 |
| Frozen semantic benchmark | 24 queries / 120 judgments |
| Backend automated tests | 458 passing, 6 skipped in the latest recorded run |
| Frontend automated tests | 189 passing in the latest recorded run |
| SQL test suites | 11 |
| Dedicated concurrency verification scripts | 7 Python scripts plus 1 shell harness |

No user count, revenue, latency, accuracy, F1, conversion, or ranking-lift figure is claimed because the repository does not contain a defensible real-world measurement for it.

## Lifecycle complexity

The marketplace is deliberately modeled as orthogonal state machines instead of one overloaded status column:

- Gigs expose **6 product states** derived from opportunity lifecycle, application intake, and operational state.
- Applications use **6 stages** and preserve a separate immutable version origin history.
- Selection requests use **7 states**: pending, accepted, declined, revision requested, expired, cancelled, and invalidated.
- Engagements use **7 states**: confirmed, kickoff pending, in progress, completion pending, completed, cancellation pending, and cancelled.
- Material gig edits, Q&A/revision state, shortlist membership, reconsideration, and contact consent remain separate domains to avoid contradictory state.

Critical workflows handle stale versions, duplicate requests, expiry, competing selections, concurrent acceptance, cancellation, reopening, and privacy projection. This is substantially more complex than CRUD because correctness depends on transitions across multiple actors and records under concurrency.

## Why this is non-trivial

- Matching is bidirectional, multi-signal, explainable, privacy-bounded, and evaluated—not a hard-coded recommendation list.
- Commercial proposals are typed domain objects with several pricing structures, scope, availability, and timeline constraints.
- Gig and proposal versions preserve exactly what each participant saw and accepted.
- Atomic selection must prevent two concurrent candidates from being confirmed for one gig.
- Material edits propagate consequences without destroying application history.
- Authorization spans browser-to-Supabase access and backend API access, requiring defense in depth.
- Contact exchange protects highly sensitive data with encryption, consent, reveal authorization, rate limits, and abuse controls.
- The UI represents backend-authoritative workflow capabilities and conflict recovery rather than optimistic local assumptions.
- The evaluation layer refuses to report recall/MAP when judgment completeness makes those metrics invalid.

## Validation and quality

### Automated verification

- **458 backend tests passed** with 6 intentionally skipped in the latest full run.
- **189 frontend tests passed** in the latest full run.
- ESLint and the TypeScript/Vite production build passed.
- **11 SQL suites** cover RLS, grants, constraints, immutable history, RPC behavior, workflow transitions, and security invariants.
- Backend tests cover domain contracts, route authorization, data access, document extraction, ranking, explanations, evaluation, state transitions, idempotency, and error sanitization.

### Manual, browser, and concurrency verification

- Synthetic PDF, DOCX, invalid-file, and scanned-style fixtures validate document handling.
- Browser verification covers end-to-end marketplace workflows, responsive behavior, accessibility-sensitive controls, and authentication hardening.
- Dedicated concurrency scripts exercise application, review, Q&A, selection, engagement, contact, and dashboard invariants.
- A shell-based concurrency harness validates critical database behavior against PostgreSQL.
- Milestone closure reports and invariant maps preserve commands, results, exclusions, and architectural decisions under `docs/verification/`.

### Evaluation and real-world claim boundary

The matching evaluation dataset is seeded and deterministic. It verifies algorithms, metric correctness, bidirectional behavior, and comparison contracts; it is not large enough to support accuracy, F1, business lift, or user-outcome claims. No such metrics should be added until a separately documented real-world dataset and evaluation protocol exist.

## Links and availability

- **GitHub:** [github.com/Driv1216/gigmatch-ai](https://github.com/Driv1216/gigmatch-ai)
- **Repository visibility:** Public.
- **Team:** Individual project; all product and engineering work is mine.
- **Product status:** Complete product implementation under active development.
- **Execution:** The repository contains documented local setup for the frontend, FastAPI backend, and Supabase stack.
- **Demo:** No public demo URL is claimed in the repository documentation.

## Ready-to-use résumé content

### One-line résumé description

Built an explainable full-stack freelance marketplace that matches technical talent to gigs and safely manages versioned applications, atomic selection, engagements, and encrypted contact exchange.

### Recommended four bullets

- Independently architected and built an end-to-end marketplace using React 19, TypeScript, FastAPI, Pydantic, Supabase Auth, and PostgreSQL, implementing 80 API handlers across freelancer, client, and administrator workflows.
- Developed bidirectional hybrid ranking across deterministic keyword evidence and a revision-pinned E5 provider, with request-level batching, cosine similarity, conservative 75/25 product weighting, deterministic explanations, skill-gap analysis, and IR evaluation metrics.
- Engineered version-safe marketplace state machines using 28 PostgreSQL tables, 47 public RPCs, immutable snapshots, idempotency keys, locking, RLS, and atomic selection-to-engagement transactions.
- Established cross-layer quality gates with 458 passing backend tests, 189 passing frontend tests, 11 SQL suites, and browser/concurrency/model verification for security-sensitive workflows.

### Alternative security-focused bullet

- Designed defense-in-depth authorization and contact privacy using verified Supabase tokens, trusted role/ownership checks, PostgreSQL RLS/grants, AES-GCM encryption, separate keyed fingerprints, audited reveal, rate limits, and revocation controls.

### Alternative AI/ML-focused bullet

- Built a transparent matching pipeline using a 90-skill normalized taxonomy, deterministic keyword features, pinned E5 embeddings, cosine similarity, hybrid ranking, a frozen 120-judgment benchmark, and Precision@K/Recall@K/NDCG/AP/MAP/pairwise evaluation.

## ATS keyword profile

Use relevant terms naturally inside accomplishments:

`React`, `TypeScript`, `Python`, `FastAPI`, `Pydantic`, `PostgreSQL`, `Supabase`, `REST API`, `OpenAPI`, `Row Level Security`, `authentication`, `authorization`, `database design`, `state machines`, `transactional systems`, `concurrency control`, `idempotency`, `hybrid ranking`, `sentence transformers`, `embeddings`, `semantic similarity`, `cosine similarity`, `explainable AI`, `feature engineering`, `information retrieval`, `NDCG`, `automated testing`, `full-stack development`, `secure software design`.

## Interview talking points

- Why PostgreSQL, not browser state, owns selection and engagement invariants.
- How exact proposal versions prevent participants from accepting different terms.
- Why explanation generation happens after ranking and cannot change ordering.
- How semantic unavailability is represented honestly through typed keyword fallback.
- How RLS and backend ownership checks protect two different access paths.
- How AES-GCM associated data, separate fingerprints, and versioned key rotation protect contacts.
- Why incomplete judgments make some information-retrieval metrics unavailable.
- Which concurrency races were considered and how idempotency plus locking closes them.

## Claim boundaries

Do not invent users, revenue, conversion, latency, accuracy, F1, deployment scale, ranking improvement, or business impact. Describe the evaluation corpus as seeded, sentence-transformers as optional/configurable, and the latest test counts as repository-recorded. Payment terms are modeled, but payment processing and escrow are not implemented.
