# GigMatch AI Milestones

## Milestone 0: Foundation

Status: Complete.

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

Status: Incomplete. Milestone 3A and Milestone 3B are implemented and tested; Milestone 3C SQL is drafted, pending manual review and Supabase application/testing.

Introduce resume parsing, gig parsing, and normalized skill extraction inputs.

### Milestone 3A: Skill Taxonomy and Deterministic Extraction Utilities

Status: Complete.

Add a curated technical skills taxonomy, text normalization helpers, and deterministic skill extraction utilities. This step does not add resume upload, PDF parsing, DOCX parsing, frontend UI, database tables, SQL, Supabase calls, embeddings, AI parsing, or matching.

### Milestone 3B: Stateless Backend Parsing Endpoints

Status: Complete.

Expose backend endpoints that accept raw text and return deterministic parsed skill output without persistence.

### Milestone 3C: Parsing Database Foundation

Status: SQL drafted; pending manual review and Supabase application/testing.

Add safe database persistence for parsed resume and gig outputs after the stateless parser contract is verified.

### Milestone 3D: Resume Upload + Editable Parsed-Output UI + Save Flow

Status: Planned.

Add resume upload and user review flows after backend parsing and persistence are ready.

### Milestone 3E: Gig Description Parsing + Editable Parsed-Output UI + Save Flow

Status: Planned.

Add messy gig description parsing and client review flows after the shared parsing foundation is stable.

### Milestone 3F: Verification and Hardening

Status: Planned.

Verify parser behavior, edge cases, security constraints, and user-facing review flows before moving to matching.

## Milestone 4: Matching Engine

Status: Planned.

Add embeddings, pgvector semantic search, hybrid ranking, and matching APIs.

## Milestone 5: Explainability and Skill Gap

Status: Planned.

Explain why gigs match a freelancer and identify missing or weak skills.

## Milestone 6: Admin Evaluation Dashboard

Status: Planned.

Create evaluation workflows, metrics, test datasets, and admin review screens.

## Milestone 7: Deployment and Black Book

Status: Planned.

Prepare deployment, project report materials, diagrams, screenshots, and black book documentation.
