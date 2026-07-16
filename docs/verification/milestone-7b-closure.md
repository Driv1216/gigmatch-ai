# Milestone 7B Verification Closure

Milestone 7B is complete and tested. Milestone 7 remains in progress, and Milestone
7C is not started.

The secure marketplace persistence foundation exists. Application and
applicant-review workflows are not yet exposed through APIs or UI.

## Repository and migration preflight

- Runtime: Python 3.14.6 in `backend/.venv`.
- Pydantic: 2.13.4. The locked 7A marketplace contracts remain frozen standard-library
  dataclasses and enums.
- Supabase CLI: 2.98.2. Docker 29.5.3 and local Supabase PostgreSQL 17 were used.
- Pre-7B SQL lived in `docs/database/001_auth_profiles.sql` through
  `004_parsing_foundation.sql`; there was no standard `supabase/migrations` project.
  A local migration baseline now mirrors that verified M0-3 schema so clean resets and
  legacy-schema upgrades are executable.
- Existing application schemas are `auth` and exposed `public`; 7B adds a non-exposed
  `private` helper schema. Existing UUID generation uses `gen_random_uuid()`, timestamps
  use `timestamptz`, and `set_updated_at()` uses an empty fixed search path.
- Existing gigs use `public.gigs.client_id -> public.user_profiles.id`. Freelancer and
  client profile primary keys are independent UUIDs; both profiles have a unique
  `user_id -> user_profiles.id`. Applications therefore store the real
  `freelancer_profiles.id` and resolve ownership through `freelancer_profiles.user_id`.
- The trusted admin source remains `public.user_profiles.role`. No JWT metadata or
  caller-provided role is trusted.
- Existing browser gig persistence uses the publishable-key Supabase client and RLS.
  Existing backend matching persistence uses the backend-only configured Supabase
  secret/service path. FastAPI verifies bearer tokens through Supabase Auth and resolves
  the verified user ID.
- Existing RLS uses `TO authenticated`, `auth.uid()`, explicit grants, and ownership
  predicates. There was no prior marketplace `SECURITY DEFINER` RPC or SQL database test
  framework.
- Local database testing is now supported by `supabase db reset`, `supabase test db`,
  and a two-session concurrency runner that invokes PostgreSQL through the local
  Supabase database container.

## Legacy status evidence and resolution

The pre-7B vocabulary was exactly `draft`, `open`, and `closed`.

- `draft` is the form default and is excluded from open-gig matching.
- `open` is the only status returned by the backend open-gig query.
- `closed` is a manually selectable frontend label and is excluded from matching.
- The repository had no filled, cancelled, application-review, or engagement workflow
  capable of proving that every historical `closed` row meant “intake closed while the
  opportunity remains active.”

Consequently, historical `closed` is not silently reinterpreted. Before any 7B schema
change, the migration deterministically lists up to 100 ordered row IDs and raises
`M7B_UNRESOLVED_LEGACY_CLOSED_GIGS`. The verified failure left the legacy row intact,
created no `gig_versions` table, and recorded no 7B migration version.

Legacy `draft` maps to `draft/closed/active`; legacy `open` maps to
`active/accepting/active`. Both receive an honest `legacy_import` version with
`terms_contract_version = 0`. New writes through the legacy compatibility path may use
`closed` only as controlled input for `active/closed/active`; it is not retained as an
independent fourth state source.

The configured hosted Supabase endpoint could not be resolved during preflight, so no
claim is made about hosted row counts. Real verification used clean local databases,
the complete M0-3 baseline, deterministic `draft`/`open` rows, and a deterministic
ambiguous `closed` row.

## Function privilege decision

The backend-only model was selected because FastAPI already verifies the Supabase token
and the repository has a backend-only secret/service database path. The function is:

```text
public.confirm_selection_request(selection_request_id uuid, acting_user_id uuid)
```

It is `SECURITY DEFINER`, schema-qualifies all objects, has `search_path = ''`, and
accepts only the request ID and the FastAPI-verified acting user ID. Execution is
revoked from `PUBLIC`, `anon`, and `authenticated`, and granted only to `service_role`.
Normal browser roles cannot call it. Direct DML on the new marketplace tables is also
revoked from `service_role`; controlled mutation occurs through the function owner.

## Migrations and schema implemented

`20260714225130_baseline_m0_m3.sql` supplies the executable local baseline for the
already-complete auth, profile, gig, and parsing schema.

`20260714225138_milestone_7b_database_foundation.sql` is transaction-wrapped and adds:

- Authoritative gig `opportunity_lifecycle`, `application_intake`, and
  `operational_state`, plus a trigger-maintained six-value product `status` projection.
- Required `current_gig_version_id` and `current_material_gig_version_id` pointers.
- Immutable `gig_versions` with generated contract, kind, payment-structure, and
  currency projections.
- `applications` with one history per freelancer/gig and a required current-version
  pointer.
- Immutable, sequential `application_versions` with generated proposal contract,
  payment-structure, and currency projections.
- Exact-version-bound `selection_requests` and structured terminal metadata.
- `engagements` with immutable accepted terms constructed only inside confirmation.
- Append-only `marketplace_events` with participant/private/admin visibility.

Minor gig corrections move only the display pointer. Material changes move the material
pointer as well. Confirmation validates the request against the current material
pointer, so a display-only correction does not invalidate an otherwise valid request.

## JSONB integrity strategy

- Verified 7A contracts remain the future backend construction layer.
- Database generated columns derive contract versions, version kind, payment structure,
  and currency from canonical JSON rather than accepting contradictory projections.
- Checks independently enforce object shape, schema-version equality, ISO-style
  currency, payment discriminator, actor identity, reason identity, acknowledgement,
  positive/sequential versions, and timestamp ordering.
- Normal authenticated users and `service_role` cannot directly insert version JSON.
- Event payloads reject keys for proposal/engagement snapshots, raw parse/resume text,
  contact values, credentials, tokens, service-role details, embeddings, semantic text,
  and secrets.

## Relational and immutable protections

- Both gig pointers use `(gigs.id, pointer) -> gig_versions(gig_id, id)`.
- The application pointer uses `(applications.id, current_version_id) ->
  application_versions(application_id, id)`.
- Cyclic pointers are `DEFERRABLE INITIALLY DEFERRED`; controlled creation uses
  pre-generated parent and version UUIDs in one transaction.
- Application versions enforce `(application_id, gig_id)` ownership and
  `(gig_id, gig_version_id)` identity.
- Selection requests enforce the exact triple `(application_id,
  application_version_id, gig_version_id)`.
- Engagements enforce the same accepted version triple plus application/gig identity
  and one unique engagement per selection request.
- Partial unique indexes enforce one confirmed application, one pending request, and
  one non-cancelled engagement per gig.
- Trigger checks prevent gig-version, application-version, and event updates/deletes;
  protect application, selection-request, and engagement immutable columns; and reject
  all physical marketplace deletions.
- Application-version insertion locks the parent and enforces exact `previous + 1`
  chronology and non-decreasing timestamps.

## RLS and privileges

All six new public tables have RLS enabled and only participant-safe `SELECT` policies.
Boolean-only, fixed-search-path helpers in `private` bypass recursive RLS safely.

| Actor | Applications and versions | Selection requests | Engagements | Gig versions | Events | Direct writes |
|---|---|---|---|---|---|---|
| Freelancer | Own application history only | Own requests only | Participant only | Versions referenced by own history | Participants/freelancer-private only | None |
| Client | Applications for owned gigs | Requests for owned gigs | Owned-gig engagements | All versions of owned gigs | Participants/client-private only | No new marketplace-table writes |
| Admin | All rows through trusted `user_profiles.role` | All | All | All | All, including admin-internal | None through browser role |
| Unauthenticated | No private grants | None | None | None | None | None |
| `service_role` | Read | Read | Read | Read | Read | Confirmation RPC only; direct DML revoked |

The existing M0-3 gig compatibility trigger remains the narrow legacy input translator.
It creates a contract-version-zero immutable version for legacy direct content writes,
so such writes cannot silently create selection-eligible terms.

## Atomic confirmation and global locking

The documented global lock order is:

```text
gig -> selection request -> selected application -> remaining applications by UUID -> engagement
```

The function resolves only the request's gig key before locking, then locks/revalidates
in that order. It verifies pending/unexpired status, Advanced stage, freelancer
ownership, current application version, exact application/gig-version binding, current
material gig version, supported contract versions, commercial acknowledgement, active
and unpaused gig state, and absence of an existing winner.

It constructs the accepted snapshot entirely from immutable stored gig/application
versions and stored acknowledgement metadata, accepts the request, confirms the chosen
application, fills the gig, creates one engagement, closes only other active
applications with system origin `selection_confirmed` and reason
`another_applicant_selected`, preserves withdrawn/previously closed rows, and appends
essential events. Every step is in one PostgreSQL transaction. A forced event-insert
failure proved that request, application, gig, engagement, and applicant changes all
roll back. Repeated invocation fails as non-pending and creates no duplicate record.

## Verification commands and results

Clean migration and history:

```bash
supabase db reset --local
supabase migration list --local
```

Result: PASS. Both baseline and 7B versions are applied. The clean reset completed with
no seed warning after local seed execution was disabled.

Representative legacy migration:

```bash
supabase db reset --local --version 20260714225130
# deterministic draft/open fixture insert through local PostgreSQL
supabase migration up --local
```

Result: PASS. Both rows were preserved, mapped to `draft/closed/active` and
`active/accepting/active`, and received version 1 `legacy_import` contract 0 snapshots.

Ambiguous legacy `closed` safety test:

```bash
supabase db reset --local --version 20260714225130
# deterministic closed fixture insert through local PostgreSQL
supabase migration up --local
```

Result: expected controlled failure
`M7B_UNRESOLVED_LEGACY_CLOSED_GIGS`. Follow-up SQL proved the row remained `closed`,
`public.gig_versions` did not exist, and migration version `20260714225138` was absent.

Database constraints, RLS, privileges, atomic confirmation, and rollback:

```bash
supabase test db supabase/tests/milestone_7b.sql
```

Result: PASS, 90 tests.

Real concurrency:

```bash
python3 scripts/verify_milestone_7b_concurrency.py
```

Result: PASS. Two independent PostgreSQL sessions raced the same request; one succeeded,
one failed with the controlled non-pending error, and final counts were exactly one
accepted request, confirmed application, filled gig, active engagement, and snapshot.

Supabase schema checks:

```bash
supabase db lint --local --level warning
supabase db advisors --local --type all --level warn
```

Result: lint PASS with no schema errors. Advisors reported only three pre-existing M0-3
performance warnings for multiple permissive SELECT policies on `client_profiles`,
`freelancer_profiles`, and `gigs`; no new marketplace-table warning was reported.

Milestone 7A regression:

```bash
cd backend
./.venv/bin/python -m unittest \
  tests.test_marketplace_gigs_applications \
  tests.test_marketplace_payments_selections \
  tests.test_marketplace_engagements \
  tests.test_marketplace_contracts
```

Result: PASS, 87 tests.

Matching/ranking regression:

```bash
cd backend
./.venv/bin/python -m unittest \
  tests.test_matching_builders tests.test_keyword_matching \
  tests.test_semantic_matching tests.test_semantic_ranker \
  tests.test_hybrid_matching tests.test_matching_data_access \
  tests.test_matching_routes tests.test_matching_explanation_contracts
```

Result: PASS, 106 tests. Existing Starlette deprecation warning only.

Focused auth/data-access regression:

```bash
cd backend
./.venv/bin/python -m unittest \
  tests.test_matching_data_access tests.test_matching_routes tests.test_evaluation_routes
```

Result: PASS, 50 tests. Existing Starlette deprecation warning only.

Full backend:

```bash
cd backend
./.venv/bin/python -m unittest discover -s tests
```

Result: PASS, 323 tests, 3 existing opt-in Supabase smoke tests skipped. Existing SWIG
and Starlette dependency deprecation warnings only.

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

Result: both PASS. Vite retains the existing non-blocking chunk-size warning; 120 modules
were transformed and the production bundle was built.

## Warnings and browser smoke

- Hosted Supabase rows were not inspected because the configured hosted endpoint did
  not resolve. The migration will block and identify any hosted legacy `closed` rows.
- Manual admin/client/freelancer browser smoke remains pending. 7B adds no product UI
  and makes no browser-smoke success claim.
- The three existing opt-in remote Supabase tests remain skipped in normal backend
  discovery because their external credentials/fixtures are not part of this closure.

## Explicit exclusions

7B added no application routes, applicant-review routes, frontend UI, shortlist
persistence, Q&A, contact exchange, notifications, payment processing, escrow, invoices,
contracts, chat, company workspaces, reviewer assignment, ranking changes, price-based
ranking, behavioural learning, embeddings, or LLM-generated explanations.
