# GigMatch AI Milestones

## Milestone 0: Foundation

Status: Complete and tested.

Create the monorepo structure, React + Vite + TypeScript frontend, FastAPI backend, basic routing, placeholder pages, placeholder backend routers, and initial documentation.

## Milestone 1: Supabase Auth and Role Routing

Status: Complete.

Add Supabase authentication, `user_profiles`, role-aware signup and login, protected frontend routes, and logout behavior.

## Milestone 2A: Freelancer and Client Profile Setup

Status: Complete.

Add real structured freelancer and client profile tables, RLS policies, role-guarded profile setup/edit pages, and dashboard CTAs.

## Milestone 2B: Gig Posting

Status: Complete.

Build real client gig posting flows without AI matching. The local implementation includes the `gigs` SQL setup file and client-only create, manage, and edit screens.

## Milestone 3: Resume/Gig Parsing

Status: Complete and tested.

Introduce resume parsing, gig parsing, and normalized skill extraction inputs.

### Milestone 3A: Skill Taxonomy and Deterministic Extraction Utilities

Status: Complete.

Add a curated technical skills taxonomy, text normalization helpers, and deterministic skill extraction utilities. This step does not add resume upload, PDF parsing, DOCX parsing, frontend UI, database tables, SQL, Supabase calls, embeddings, AI parsing, or matching.

### Milestone 3B: Stateless Backend Parsing Endpoints

Status: Complete.

Expose backend endpoints that accept raw text and return deterministic parsed skill output without persistence.

### Milestone 3C: Parsing Database Foundation

Status: Complete.

Add safe database persistence for parsed resume and gig outputs after the stateless parser contract is verified.

### Milestone 3D: Resume Text Parsing Review UI + Save Flow

Status: Complete.

Add a freelancer-only pasted resume text parser, editable parsed-output review UI, and save/fetch flow through the frontend Supabase client and RLS. This milestone does not add PDF/DOCX upload.

### Milestone 3E: Gig Description Parsing Review UI + Save Flow

Status: Complete.

Add a client-only existing gig description parser, editable parsed-output review UI, and save/fetch flow through the frontend Supabase client and RLS. This milestone does not add AI matching or recommendations.

### Milestone 3F: PDF/DOCX Text Extraction

Status: Complete and tested.

Add document text extraction after text-paste parsing flows are stable.

Includes:

- 3F-A: Document Text Extraction Utilities
- 3F-B: Stateless Resume Document Extraction Endpoint
- 3F-C: Resume Parser Upload Input Integration

### Milestone 3F-A: Document Text Extraction Utilities

Status: Complete and tested.

Add backend-only utilities that extract plain text and metadata from PDF/DOCX bytes or paths. This step does not add upload routes, frontend upload UI, storage, parser calls, database writes, OCR, AI extraction, embeddings, matching, or recommendations.

### Milestone 3F-B: Stateless Resume Document Extraction Endpoint

Status: Complete and tested.

Expose a backend endpoint for document text extraction using the completed utility layer.

### Milestone 3F-C: Resume Parser Upload Input Integration

Status: Complete and tested.

Add document upload as an input method for the existing resume review flow.

### Milestone 3G: Verification and Hardening

Status: Complete.

Verify parser behavior, edge cases, security constraints, and user-facing review flows before moving to matching.

### Milestone 3G-A: Parser and Document Extraction Regression Hardening

Status: Complete and tested.

Add backend regression coverage for deterministic parser edge cases and PDF/DOCX document extraction edge cases. This step does not add AI matching, embeddings, recommendations, explainability dashboards, admin analytics, storage buckets, OCR, frontend redesigns, or database schema changes.

### Milestone 3G-B: Security/Data-Flow Review + End-to-End Verification Checklist

Status: Complete.

Document the current parsing data flows, static security/data-flow review, required test accounts, and manual browser/Supabase verification cases before Milestone 4 matching can begin.

## Milestone 4: Matching Engine

Status: Complete and tested.

Backend matching foundation implemented and verified. This includes normalized matching entities, keyword scoring, semantic text/provider interfaces, runtime semantic similarity, hybrid ranking, auth-safe data access, bidirectional backend matching API routes, and verification/docs closure.

No frontend recommendation UI, explainability, skill-gap recommendations, admin analytics, ranking metrics, pgvector, FAISS, saved match history, behavioral feedback learning, or production-scale retrieval claims yet.

### Milestone 4A: Matching Contract and Normalized Entity Builders

Status: Complete and tested.

Matching contract and normalized entity builders implemented. This includes pure backend builders for normalized freelancer and gig matching profiles, deterministic skill normalization/deduplication, source metadata, structured-data precedence, and parse-data enrichment.

No scoring, embeddings, APIs, frontend recommendations, explanations, or evaluation metrics yet.

### Milestone 4B: Keyword Baseline Scoring and Ranking

Status: Complete and tested.

Keyword baseline scoring and ranking implemented over normalized matching profiles. This includes pure backend scoring for freelancer/gig pairs, deterministic gig and freelancer ranking, required/preferred skill coverage, category alignment, missing required skills, and stable tie-breaking.

No semantic embeddings, hybrid ranking, APIs, frontend recommendations, explanations, or evaluation metrics yet.

### Milestone 4C: Semantic Text Builder + Embedding Provider Interface

Status: Complete and tested.

Semantic text builders and embedding provider interface implemented. This includes deterministic freelancer/gig embedding text, a provider protocol, deterministic fake embeddings for tests, an optional lazy sentence-transformers wrapper, and a pure cosine similarity utility.

No semantic candidate ranking, hybrid ranking, APIs, pgvector, frontend recommendations, explanations, or evaluation metrics yet.

### Milestone 4D: Runtime Semantic Similarity Engine

Status: Complete and tested.

Runtime semantic similarity scoring and ranking implemented over normalized matching profiles using injected embedding providers. This includes pairwise semantic scoring, raw cosine preservation, normalized semantic scores, deterministic freelancer/gig ranking, provider metadata, vector validation, and draft/closed gig status preservation.

No hybrid ranking, APIs, pgvector, frontend recommendations, explanations, or evaluation metrics yet.

### Milestone 4E: Hybrid Ranking Engine

Status: Complete and tested.

Pure backend hybrid ranking engine implemented over normalized matching profiles. This combines existing keyword and semantic scores with default weights of 0.55 keyword / 0.45 semantic, preserves inspectable keyword and semantic score components, supports custom validated weights, and uses deterministic sorting and tie-breaking.

No APIs, JWT auth, Supabase access, database queries or writes, frontend recommendation UI, explainability, skill-gap recommendations, admin analytics, evaluation metrics, pgvector, or FAISS yet.

### Milestone 4F: Auth-Safe Bidirectional Backend Matching APIs

Status: Complete and tested.

Expose the completed backend matching engines through authenticated, role-safe backend APIs without leaking cross-owner data.

### Milestone 4F-A: Auth-Safe Matching Data Access Layer

Status: Complete and tested.

Backend auth-safe matching data access implemented for future matching APIs. This verifies authenticated users before matching data is loaded, uses `user_profiles.role` as the trusted role source, recognizes admin without granting automatic matching bypass, reads existing Supabase tables only, performs read-only data access, enforces owner-based freelancer/client access, prevents clients from loading another client's gig, selects latest reviewed/saved parse rows using schema-supported `status`, `updated_at`, and `created_at` columns, and converts database rows into existing normalized matching entities.

No final matching API routes, 4E ranker calls, frontend UI, explanations, skill-gap recommendations, admin analytics, evaluation metrics, pgvector, FAISS, database writes, or saved match results yet.

### Milestone 4F-B: Bidirectional Backend Matching API Routes

Status: Complete and tested.

Authenticated freelancer-to-gigs and client-gig-to-freelancers backend matching routes implemented. This exposes compact hybrid recommendation envelopes through `GET /matching/recommended-gigs` and `GET /matching/gigs/{gig_id}/recommended-freelancers`, using the completed 4F-A data access layer and 4E hybrid ranker with role, token, ownership, and limit validation.

No frontend recommendation UI, explanations, skill-gap recommendations, admin analytics, evaluation metrics, pgvector, FAISS, database writes, or saved match results yet.

### Milestone 4G: Matching Verification and Docs Closure

Status: Complete and tested.

Completed backend matching verification and documentation closure. This confirms the matching API routes are registered, role and ownership gates hold, auth failures are handled before provider configuration errors, `limit` validation is enforced, empty candidate lists return safe envelopes, normal unit tests use fakes without live Supabase or real model loading, opt-in Supabase smoke tests remain skipped by default, and documentation captures the implemented flow, route contracts, privacy boundary, manual smoke checklist, limitations, and next milestone.

## Milestone 5: Explainability and Skill Gap

Status: Complete and tested.

Explain why gigs match a freelancer and identify missing or weak skills.

### Milestone 5A: Backend Explanation and Skill-Gap Contract

Status: Complete and tested.

Backend-only explanation and skill-gap contract models/enums implemented for future explainability work. This includes deterministic evidence-based reason codes, compact score explanation shape, skill evidence, skill-gap severity vocabulary, skill-gap summaries, and neutral match explanation shells that support both freelancer-to-gig and gig-to-freelancer use cases.

No API response changes, frontend explanation UI, explanation text generation, skill-gap calculation logic, admin evaluation dashboard, ranking metrics, ranking formula changes, database writes, or database migrations yet.

### Milestone 5B: Explanation Evidence Builder

Status: Complete and tested.

Backend-only explanation evidence builder implemented over existing normalized matching profiles and hybrid matching results. This produces deterministic structured evidence for matched required skills, matched preferred skills, missing required skills, missing preferred skills, compact score evidence, and evidence-supported reason codes while remaining neutral for both freelancer-to-gig and gig-to-freelancer flows.

No API response changes, frontend explanation UI, natural-language explanation text, skill-gap severity/focus calculation, admin evaluation dashboard, ranking metrics, ranking formula changes, database writes, or database migrations yet.

### Milestone 5C: Skill Gap Summary Builder

Status: Complete and tested.

Backend-only deterministic skill-gap summary builder implemented over existing 5B missing-skill evidence. This assigns missing-skill severity using the existing `SkillGapSeverity` contract, preserves raw matched and missing skill evidence, prioritizes missing required skills before missing preferred skills, removes duplicate focus skills, and keeps focus skills compact without inventing non-missing skills.

No API response changes, frontend explanation UI, natural-language explanation text, LLM explanations, admin evaluation dashboard, ranking metrics, ranking formula changes, database writes, or database migrations yet.

### Milestone 5D: Deterministic Explanation Text Builder

Status: Complete and tested.

Backend-only deterministic explanation text builder implemented over existing 5B/5C structured evidence. This adds a minimal optional `summary` field to the existing `MatchExplanation` contract and renders short template-based text for matched skills, missing skills, compact score availability, skill-gap severity, focus skills, and evidence-backed alignment reasons.

No API response changes, frontend explanation UI, LLM explanations, admin evaluation dashboard, ranking metrics, ranking formula changes, database writes, or database migrations yet.

### Milestone 5E: Matching API Explanation Extension

Status: Complete and tested.

Existing matching API result items now include an additive `explanation` object built from the 5B evidence builder, 5C skill-gap summary builder, and 5D deterministic text builder. Existing result fields, ordering, score values, route names, auth gates, ownership checks, and empty-envelope behavior are preserved.

No frontend explanation UI, LLM explanations, admin evaluation dashboard, ranking metrics, ranking formula changes, database writes, or database migrations yet.

### Milestone 5F-A: Frontend Explanation Types, Response Helpers, and Shared UI Components

Status: Complete and tested.

Frontend-only explanation foundations implemented. This adds TypeScript types that mirror the backend `explanation` response object, null-safe display helpers for severity labels, reason labels, score formatting, and reusable presentational components for summary text, matched/missing skills, focus skills, skill-gap severity, score evidence, and human-readable reason details.

No recommendation page integration, route-level recommendation fetching, backend contract changes, ranking/scoring changes, database writes, LLM explanations, admin evaluation dashboard, or evaluation metrics yet.

### Milestone 5F-B: Freelancer Recommended Gigs Explanation UI

Status: Complete and tested.

The freelancer dashboard now loads `GET /matching/recommended-gigs` with the current Supabase access token, renders backend-ranked recommended gigs in API order, and reuses the shared 5F-A explanation panel for summary, matched and missing skills, skill-gap severity, focus skills, score evidence, and secondary reason details.

No client recommended freelancers UI, backend contract changes, ranking/scoring changes, database writes, saved match history, bidding/apply/chat/contract/payment flows, LLM explanations, admin evaluation dashboard, or evaluation metrics yet.

### Milestone 5F-C: Client Recommended Freelancers Explanation UI

Status: Complete and tested.

The client gig management screen now lets clients select one of their owned gigs, loads `GET /matching/gigs/{gig_id}/recommended-freelancers` with the current Supabase access token, renders backend-ranked recommended freelancers in API order, and reuses the shared 5F-A explanation panel for client-facing match explanations.

No Milestone 5G verification/docs closure, backend contract changes, ranking/scoring changes, database writes, saved match history, apply/bid/chat/contract/payment flows, LLM explanations, admin evaluation dashboard, or evaluation metrics yet.

### Milestone 5G: End-to-End Verification and Docs Closure

Status: Complete and tested.

Completed Milestone 5 verification and documentation closure. This confirms the backend explanation object is exposed through both matching routes, frontend recommendation UIs render backend-provided explanations through shared components, recommendation order is preserved from the backend response, automated frontend build/lint checks pass, focused backend matching/explanation tests pass, privacy boundaries are documented, and manual smoke-test checklists are captured for freelancer and client flows.

No Milestone 6 admin evaluation dashboard, ranking metrics, fake improvement metrics, backend behavior changes, ranking/scoring changes, database writes, saved match history, apply/bid/chat/contract/payment flows, behavioral learning, pgvector/FAISS, or LLM explanations were added.

## Milestone 6: Admin Evaluation Dashboard

Status: Complete and tested.

Create evaluation workflows, metrics, test datasets, and admin review screens.

### Milestone 6A: Evaluation Dataset, Relevance Label Contract, and Seeded Fixtures

Status: Complete and tested.

Backend-only evaluation fixture contract implemented for future matching evaluation work. This adds small deterministic seeded evaluation fixtures, explicit query directions (`freelancer_to_gigs` and `gig_to_freelancers`), a 0-2 relevance label scale, label-source tracking, query-level complete-judgment-set flags, fixture loading, and validation for duplicate ids, invalid labels, missing candidates, and incomplete complete-judgment sets.

Seeded fixtures are transparent local/demo fixtures only. They are not production-scale evaluation, do not calculate Precision@K, Recall@K, NDCG, MAP, timing metrics, or improvement claims, and do not run keyword, semantic, or hybrid rankers yet.

No admin dashboard UI, new API routes, frontend files, database migrations, Supabase writes, ranking formula changes, new dependencies, or fake evaluation metrics were added.

### Milestone 6B: Pure Metric Calculation Utilities

Status: Complete and tested.

Backend-only pure metric utilities implemented for evaluation math over ranked candidate ids and explicit 6A relevance judgments. This adds a safe `MetricResult` envelope and calculations for Precision@K, Recall@K, NDCG@K, single-query Average Precision, and MAP from valid AP results.

Metric utilities return unavailable results with clear reasons instead of silently treating unjudged candidates as not relevant. Recall@K and Average Precision require complete judgment sets; Average Precision and MAP require at least one relevant candidate per included query. NDCG@K uses the 0-2 graded relevance scale directly and returns `0.0` when IDCG is zero because all judged candidates are not relevant.

No keyword, semantic, or hybrid rankers, evaluation runner, ranking comparison builder, admin API, dashboard UI, database migrations, Supabase reads/writes, route changes, ranking formula changes, or metric improvement claims were added.

### Milestone 6C: Evaluation Runner and Ranking Comparison Builder

Status: Complete and tested.

Backend-only evaluation runner implemented over the existing 6A fixtures, 6B metric utilities, and internal matching rankers. For each fixture query, the runner ranks the same candidate pool separately with keyword, semantic, and hybrid strategies, calculates per-strategy Precision@K, Recall@K, NDCG@K, and Average Precision where valid, and returns structured rank comparison rows showing each candidate's rank across strategies.

The runner accepts an injected embedding provider so tests use deterministic embeddings and do not instantiate heavy sentence-transformer models. Aggregate results are honest: MAP is calculated from available AP values through the 6B helper, and mean Precision@K, Recall@K, and NDCG@K average only available query-level values with included/excluded counts.

No FastAPI routes, admin API, dashboard UI, frontend files, database migrations, Supabase reads/writes, route calls, new dependencies, production benchmark claims, or improvement claims were added.

### Milestone 6D: Admin-Only Evaluation API

Status: Complete and tested.

Backend-only admin evaluation API implemented at `GET /evaluation/matching`. The endpoint verifies the bearer token, loads the trusted role from `user_profiles.role`, allows only admin users, loads seeded evaluation fixtures, delegates ranking and metric work to the 6C evaluation runner, and returns the structured evaluation summary with factual metadata and limitations.

The route supports repeated positive `top_k` query values such as `?top_k=1&top_k=3`, deduplicates them in request order, and rejects invalid values with a clear 400 response. Missing or invalid auth returns 401; valid non-admin roles return 403.

No frontend UI, dashboard-specific chart data, inline metric calculation, inline ranker calls, Supabase evaluation-data reads/writes, database migrations, new dependencies, public admin signup, service-role exposure, production benchmark claims, or improvement claims were added.

### Milestone 6E: Admin Evaluation Console UI

Status: Complete and tested.

Frontend admin evaluation console implemented in the existing protected admin dashboard flow. The console calls the real `GET /evaluation/matching` 6D endpoint using the current Supabase access token, renders the backend-provided seeded evaluation summary, and shows dataset summary, top-K values, aggregate strategy metrics, unavailable metric reasons, query-level strategy comparisons, per-candidate ranking comparison rows, limitations, loading/error/empty states, and refresh/retry actions.

The implementation is intentionally modular and upgrade-friendly: typed evaluation response models and API helper live under `frontend/src/lib`, while reusable evaluation display sections live under `frontend/src/components/admin/evaluation`. The admin page composes these pieces and does not calculate metrics, rank candidates, hardcode evaluation numbers, or create fake chart data.

This is a technical admin evaluation console for internal visibility and viva/demo proof, not the final team-approved analytics dashboard design.

No backend API changes, new routes, database migrations, Supabase writes, new frontend dependencies, frontend metric calculations, fake improvement claims, production-scale claims, chart builders, manual labeling UI, or Milestone 6F closure work were added.

### Milestone 6F: Verification, Limitations, and Docs Closure

Status: Complete and tested.

Milestone 6 closure verification completed. Backend evaluation tests, selected matching/auth regression tests, full backend unittest discovery, frontend production build, and frontend lint all pass. Full backend discovery emits dependency deprecation warnings only; no test failures were observed.

Documentation and source context were updated to reflect that Milestone 6A through 6F are complete. Milestone 6 remains honest about scope: it uses seeded local/demo evaluation fixtures, calculates metrics only from explicit labels, shows unavailable metric reasons when metrics are not valid, and exposes an internal admin evaluation console rather than a final team-approved analytics dashboard.

Manual browser smoke was not run during closure because verified local admin/freelancer/client test accounts and end-to-end local Supabase credentials were not available in this session. Automated route tests cover admin access, non-admin denial, invalid auth denial, invalid `top_k`, delegation to the 6C runner, and response privacy checks.

No Milestone 7 work, deployment configuration, black book generation, new product features, new metrics, new fixtures, new API routes, frontend redesign, database migrations, Supabase writes, fake improvement claims, production-scale claims, or matching behavior changes were added.

## Milestone 7: Deployment and Black Book

Status: Planned.

Prepare deployment, project report materials, diagrams, screenshots, and black book documentation.
