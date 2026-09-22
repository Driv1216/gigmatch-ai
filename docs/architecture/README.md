# GigMatch AI Architecture

This guide describes the current runtime product. Historical designs and closure records are indexed in [Documentation](../README.md).

## System responsibilities

GigMatch AI uses three cooperating layers:

1. The React application renders public and role-specific experiences, acquires Supabase sessions, and calls typed data helpers.
2. FastAPI verifies identity, enforces role/ownership policy, coordinates marketplace commands, returns safe read models, and runs parsing, matching, and evaluation.
3. Supabase Auth and PostgreSQL provide identity, persistence, Row Level Security, immutable history, constraints, and atomic transitions.

```text
Browser
  ├─ Supabase Auth: signup, login, OAuth, session refresh
  ├─ Supabase Data API: narrowly permitted owner-scoped operations
  └─ FastAPI: marketplace, matching, parsing and evaluation
          ├─ verified identity and trusted role lookup
          ├─ domain policy and safe response assembly
          └─ PostgreSQL protected by RLS, grants and constraints
```

## Frontend

The canonical application is `frontend/`, built with React 19, TypeScript, Vite, React Router, Tailwind CSS, and Radix UI.

Route boundaries distinguish public, setup, freelancer, client, participant, and administrator surfaces. Protected routes use the authenticated profile role. Account-setup and public-account boundaries handle incomplete profiles, verification states, and redirects. Pages are lazy-loaded and delegate transport behavior to `src/lib` modules.

Product surfaces include authentication and setup; role-aware dashboards; profiles and resume parsing; gig discovery and lifecycle management; applications and proposal versioning; applicant review; Q&A and revisions; selection and reconsideration; engagement workspaces; secure contact exchange; and administrator evaluation.

The frontend never re-ranks recommendations or generates explanation claims. It renders backend-authoritative order and evidence.

## FastAPI service

The backend separates HTTP transport from domain behavior:

- `app/api/routes`: request validation, authentication dependencies, status mapping, and response contracts.
- `app/marketplace`: gigs, applications, review, Q&A, selection, engagements, contact, dashboards, policy, and data access.
- `app/matching`: normalized entities, keyword/semantic/hybrid ranking, centralized provider construction, explanations, and candidate loading.
- `app/parsing`: normalization, skill taxonomy, deterministic extraction, and document services.
- `app/evaluation`: seeded fixtures, ranking comparisons, and information-retrieval metrics.

Route groups cover health, auth/profile status, gigs, applications, applicant review, Q&A, selections, engagements, contact exchange, dashboards, parsing, matching, and evaluation. Generated schemas are available at `/docs` and `/openapi.json`.

## Data model and authority

The ordered files in `supabase/migrations/` are authoritative. The model covers users/profiles; gigs and version history; parsed resume/gig data; applications and immutable proposal versions; applicant review and Q&A; selection requests; engagements and lifecycle events; reconsideration; encrypted contact shares; and dashboard projections.

PostgreSQL constraints and triggers protect cross-record invariants even if a caller is faulty. Critical commands use expected-version tokens, unique request IDs, deterministic lock ordering, and transactional functions to reject stale, duplicate, or conflicting actions.

## Authentication and authorization

Supabase Auth establishes identity. FastAPI validates bearer tokens through Supabase Auth and loads the trusted role from `user_profiles`; browser-supplied roles are never authorization evidence.

Authorization is layered:

- Route policy restricts actions by role or engagement participation.
- Ownership checks bind records to the authenticated subject.
- RLS limits direct Data API access.
- Grants protect sensitive columns and functions.
- Database functions re-check identity and state for atomic workflows.
- Public models omit raw/private fields.

Public signup cannot create an administrator. Account completion uses database authority to prevent role escalation and partial setup.

## Marketplace lifecycle

```text
Gig draft -> published/open -> paused or intake closed -> filled/cancelled
                        |
                        v
Application -> review/Q&A/revision -> selection request
                                         |
                                  accept exact version
                                         |
                                         v
                                     engagement
                                         |
                          kickoff -> in progress -> completed
                                         |
                          cancellation/reopen/reconsideration
```

Material gig edits preserve versions and require affected applicants to reaffirm, update, withdraw, or reapply as policy allows. Selection requests point to an exact application version and expire after a bounded duration. Acceptance atomically closes competing paths and creates an immutable accepted-terms snapshot.

## Matching and explainability

Keyword ranking scores skill coverage and structured alignment. Semantic ranking builds stable allowed text and compares embeddings with cosine similarity. Production hybrid ranking uses a conservative 75% keyword and 25% semantic policy.

The production provider is revision-pinned to `intfloat/e5-small-v2` at `ffb93f3bd4047442299a41ebb6fa998a38507c52`, executes on CPU, and disallows remote code. Canonical freelancer and gig text remains model-independent. At the narrow provider boundary, E5 receives `query:` for the active query and `passage:` for candidates in both supported directions.

Provider construction is centralized across recommendations, applicant review, and administrator evaluation. One lazily loaded provider instance is reused per process. Each ranking request embeds the query and complete candidate pool in one batch, then validates cardinality, numeric finiteness, nonempty/equal dimensions, and dimension stability. Deterministic providers remain the default in ordinary tests.

The `0.75/0.25` production weighting is a product decision, not a benchmark-optimality claim. The controlled R1 benchmark found keyword exceptionally strong and E5 the strongest semantic provider tested. See the [matching guide](../matching.md) and [R1 closure](../verification/semantic-matching-refinement-closure.md).

Explanations are built after ranking and cannot alter order. They include reason codes, scores, matched/missing skills, gap severity, and deterministic text. Raw resume content, source text, vectors, and private fields stay internal.

## Secure contact exchange

Contact sharing is limited to eligible engagement participants and explicit consent. Values are encrypted before persistence; a separately keyed fingerprint supports equality/abuse controls without searchable plaintext. Reveal re-authorizes the caller, applies limits, and records access. Shares can be revoked, blocked, or reported.

Encryption keys are versioned. Rotation activates a new key while retaining previous keys only long enough to decrypt and migrate existing records.

## Failure behavior

- Missing/invalid authentication fails closed.
- Role and ownership failures do not expose private resource details.
- Version conflicts reject stale commands and require refresh.
- Request IDs support idempotent critical workflows.
- Semantic import, configuration, model-load, cache/download, encoding, and invalid-vector failures are mapped to explicit safe reason codes. Matching and applicant review fall back globally to keyword; administrator evaluation returns a sanitized unavailable response.
- Invalid/oversized documents and scanned PDFs produce safe validation or warning responses.
- Database constraints remain the final guard against contradictory state.

## Operational boundaries

Managed secrets, monitoring, backups, email delivery, OCR, payment processing, moderation operations, and disaster recovery are environment-specific integration boundaries, not claimed repository capabilities.
