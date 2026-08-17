# Capability History

This concise record shows how GigMatch AI reached its current baseline. Use the [README](../README.md) and [architecture guide](architecture/README.md) for current behavior.

## Current baseline

GigMatch AI implements the path from account setup through gig discovery, explainable matching, versioned applications, applicant review, Q&A, exact-version selection, engagement management, reconsideration, and consent-based contact exchange. The ordered migration chain and cross-layer tests verify the product model.

## Foundation and identity

- Established the React/TypeScript frontend and FastAPI backend.
- Added Supabase authentication, role-aware routing, hardened account setup, and administrator provisioning boundaries.
- Added structured freelancer/client profiles protected by ownership-aware RLS and grants.

## Parsing and matching

- Added client-owned gigs, a canonical skill taxonomy, deterministic alias extraction, reviewed parse persistence, and PDF/DOCX processing.
- Implemented normalized matching contracts and bidirectional keyword, semantic-provider, and hybrid ranking.
- Added authenticated recommendation APIs, deterministic score/reason evidence, and skill-gap explanations.

## Evaluation

- Added seeded relevance fixtures and conservative metric contracts.
- Implemented Precision@K, Recall@K, NDCG@K, Average Precision, and MAP availability.
- Added an administrator-only API and console for ranking comparison.

## Marketplace workflow

- Defined strict contracts and state machines for gigs, applications, review, selection, and engagements.
- Added immutable versions, idempotency, RLS, constraints, and transactional concurrency control.
- Implemented gig lifecycle, structured proposals, application revisions/withdrawal, and material-change handling.
- Implemented ranked applicant review, Q&A, linked revisions, selection expiry/cancellation/response, and atomic confirmation.
- Implemented engagement lifecycle, cancellation, reopening, reconsideration, dashboards, and encrypted contact sharing with revocation/block/report controls.

## Product hardening

- Consolidated participant dashboards and end-to-end navigation.
- Completed database, backend, frontend, browser, concurrency, and security verification for the application-to-engagement flow.
- Migrated the canonical frontend to the current Switchboard interface.
- Hardened password/OAuth, verification, account completion, and profile-creation authority.

## Historical evidence

Detailed specifications, invariant maps, SQL results, concurrency tests, and closure notes remain under `docs/verification/` and in `milestone-7-product-spec.md`. They preserve engineering history and may describe work as future relative to their original date.
