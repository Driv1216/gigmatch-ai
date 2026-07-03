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

Status: Incomplete. Milestone 3A, Milestone 3B, Milestone 3C, Milestone 3D, Milestone 3E, Milestone 3F-A, and Milestone 3F-B are complete and tested; Milestone 3F-C is planned next.

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

Status: Incomplete. Milestone 3F-A and Milestone 3F-B are complete and tested; Milestone 3F-C and 3F-D are planned.

Add document text extraction after text-paste parsing flows are stable.

### Milestone 3F-A: Document Text Extraction Utilities

Status: Complete and tested.

Add backend-only utilities that extract plain text and metadata from PDF/DOCX bytes or paths. This step does not add upload routes, frontend upload UI, storage, parser calls, database writes, OCR, AI extraction, embeddings, matching, or recommendations.

### Milestone 3F-B: Stateless Resume Document Extraction Endpoint

Status: Complete and tested.

Expose a backend endpoint for document text extraction using the completed utility layer.

### Milestone 3F-C: Resume Parser Upload Input Integration

Status: Planned.

Add document upload as an input method for the existing resume review flow.

### Milestone 3F-D: Document Extraction Verification and Docs

Status: Planned.

Harden document extraction edge cases and document manual verification behavior.

### Milestone 3G: Verification and Hardening

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
