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
- Completed R1 as a frozen 120-judgment semantic refinement cycle with a query-level selection/holdout split, exact model revisions, pairwise inversion analysis, runtime evidence, and checksum-gated external execution.
- Selected E5 as the strongest tested semantic provider, then integrated a conservative keyword-majority `0.75/0.25` product policy without claiming benchmark-optimal superiority.
- Added centralized process-level provider reuse, request-level batch embedding, strict vector validation, sanitized fallback behavior, and an opt-in real-model smoke test in both ranking directions.

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
- Verified the R1 production semantic path under Python 3.13.13 alongside 458 passing backend tests and 189 passing frontend tests; Python 3.14 semantic compatibility remains unverified.

## Historical evidence

Detailed specifications, invariant maps, SQL results, concurrency tests, and closure notes remain under `docs/verification/` and in `milestone-7-product-spec.md`. The [R1 semantic closure](verification/semantic-matching-refinement-closure.md) is the evidence record for the current model configuration. Historical files preserve engineering history and may describe work as future relative to their original date.
