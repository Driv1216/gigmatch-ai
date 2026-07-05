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

Status: In progress.

Explain why gigs match a freelancer and identify missing or weak skills.

### Milestone 5A: Backend Explanation and Skill-Gap Contract

Status: Complete and tested.

Backend-only explanation and skill-gap contract models/enums implemented for future explainability work. This includes deterministic evidence-based reason codes, compact score explanation shape, skill evidence, skill-gap severity vocabulary, skill-gap summaries, and neutral match explanation shells that support both freelancer-to-gig and gig-to-freelancer use cases.

No API response changes, frontend explanation UI, explanation text generation, skill-gap calculation logic, admin evaluation dashboard, ranking metrics, ranking formula changes, database writes, or database migrations yet.

## Milestone 6: Admin Evaluation Dashboard

Status: Planned.

Create evaluation workflows, metrics, test datasets, and admin review screens.

## Milestone 7: Deployment and Black Book

Status: Planned.

Prepare deployment, project report materials, diagrams, screenshots, and black book documentation.
