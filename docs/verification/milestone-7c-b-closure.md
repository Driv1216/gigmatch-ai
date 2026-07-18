# Milestone 7C-B Verification Closure

Milestone 7C-B implementation and automated verification are complete. Authenticated
browser smoke partially passed because the configured browser/backend Supabase target
is non-local and has not received the 7C-B migrations. No hosted migration was applied.

## Preflight and preserved work

- Repository: `/Users/drivyaanshyadav/Desktop/Ai-Gig/gigmatch-ai`.
- Branch: `main`; starting commit: `703f72c`.
- Initial status contained only the immediately preceding verified 7C-A work. It was
  preserved as the required base.
- `presentation/30-percent-showcase` was not checked out, compared, copied, merged,
  modified, or deleted.
- No commit or push was performed.

## Authority and version model

Published content and commercial history are authoritative only in immutable complete
`gig_versions.terms_snapshot` rows. `terms_contract_version = 1` identifies the
supported contract schema; `gig_versions.version_number` is the per-gig history
ordinal. Contract-zero upgrades allocate the next ordinal and never reset history.

`current_gig_version_id` is the current display snapshot. A minor correction moves
only it. `current_material_gig_version_id` is the exact applicant-relevant contract.
A material change moves both pointers. Existing application versions are never
rewritten; staleness remains derived from application-version `gig_version_id` versus
the current material pointer.

The `gigs` content projections—title, description, category, skills, budget/rate
range, difficulty, experience, deliverables, work mode, and deadline—mirror the
current display snapshot transactionally. `opportunity_lifecycle`,
`application_intake`, and `operational_state` are authoritative orthogonal state;
`status` is their product projection. Projected content cannot be independently
mutated after publication.

## Database migrations and RPCs

`20260718120000_milestone_7c_b_gig_management.sql` adds canonical snapshot validation,
material-subset normalization, changed-field calculation, preview fingerprints,
projection application, direct-write lockdown, and these service-only fixed-search-
path RPCs:

- `manage_gig_publish`
- `manage_gig_upgrade`
- `preview_gig_edit`
- `manage_gig_edit`
- `manage_gig_lifecycle`

Execution is revoked from `PUBLIC`, `anon`, and `authenticated`, and granted only to
`service_role`. `gig_versions` remains SELECT-only and append-only. Browser insert and
update grants on `gigs` are column-scoped; insert/update policies accept only genuine
owned drafts. Browser status publication, published terms changes, state changes,
pointer changes, version DML, and physical gig deletion are unavailable.

`20260718120001_milestone_7c_b_selection_fill_compatibility.sql` preserves only the
verified 7B state-only `active -> filled` projection used by atomic selection
confirmation. Ordinary browser roles have no state-column grants.

Every write locks and revalidates the gig. The compatible lock order is:

```text
gig -> effective selection request -> applications by UUID -> events
```

Publication/upgrade allocates the next ordinal under that lock, inserts the immutable
version, moves pointers, updates projections/state, and appends an event in one
transaction. Failed calls leave no version, pointer drift, projection drift, dependent
effect, or event.

## Materiality and consequences

Backend input is normalized into one complete contract-one snapshot. Skill sets are
deduplicated and order-normalized; money uses decimal validation; enums and nullable
values are normalized; aware deadlines are converted to UTC. Naive deadlines fail.
Application acceptance and publication use strict `deadline > authoritative now`.

The database independently derives top-level changed fields and the material subset.
Case/whitespace-only title/description normalization and skill-order normalization are
minor or no-op. Payment, currency, budget/rate, skills, scope, deliverables, experience,
work/location, commitment/duration, and either deadline are material. Client-supplied
materiality, changed fields, counts, or effects are rejected by strict request DTOs.

Preview writes nothing. Its opaque fingerprint binds the expected display version,
complete candidate, changed fields, active-application count, and effective request
effect. Confirmation recomputes all values under the lock. Missing confirmation returns
`material_change_confirmation_required`; a stale fingerprint returns
`material_change_consequences_changed` with refreshed consequences.

Material edits invalidate only `pending` requests with `expires_at > database now()`
using `gig_version_changed`. Minor edits do not invalidate requests or make applications
stale. A time-expired pending row does not block pause or receive active-request effects.

## Lifecycle behavior

- Close intake requires the additive structured `IntakeClosureReason`, preserves
  applications, creates no version, and is not cancellation.
- Reopen preserves operations and requires the stored application deadline to be
  future. A paused reopen remains effectively unavailable.
- Pause preserves intake and blocks only on an effectively pending request. Resume
  preserves intake and never reopens it.
- Cancellation requires the existing structured reason, applicant-facing explanation,
  and explicit active-record confirmation. It cancels the effective request, closes
  only active applications as `closed_gig_cancelled`, preserves terminal applications,
  never uses Not Selected, closes intake, applies terminal operations, and appends one
  reference-oriented event. Filled/cancelled transitions are rejected.
- Contract-zero upgrade is manual and complete. Any application, request, or engagement
  blocks with `legacy_dependency_reconciliation_required`; no historical record is
  rebound and no missing term is invented.

## Owner routes and DTO

Actual FastAPI routes are:

- `GET /gigs/manage`
- `GET /gigs/{gig_id}/manage`
- `POST /gigs/{gig_id}/publish`
- `POST /gigs/{gig_id}/upgrade`
- `POST /gigs/{gig_id}/edits/preview`
- `POST /gigs/{gig_id}/edits`
- `POST /gigs/{gig_id}/intake/close`
- `POST /gigs/{gig_id}/intake/reopen`
- `POST /gigs/{gig_id}/pause`
- `POST /gigs/{gig_id}/resume`
- `POST /gigs/{gig_id}/cancel`

The owner DTO includes sanitized terms, orthogonal/product/effective state, deadline
status, contract/upgrade status, both version IDs and ordinals, concurrency token,
allowed actions and blockers, active-application count, effective-request indicator,
and latest material summary. It excludes applicant identities/proposals, contact data,
raw parser data, private payment notes, credentials, and audit internals. The 7C-A
viewer DTO remains mutation-token free.

Stable errors include `stale_gig_version`, `invalid_gig_transition`,
`material_change_confirmation_required`, `material_change_consequences_changed`,
`pending_selection_blocks_pause`, `future_deadline_required`,
`unsupported_contract_upgrade_required`,
`legacy_dependency_reconciliation_required`, `not_gig_owner`, and
`no_effective_change`.

## Frontend cutover

The frontend was changed only after the database/backend gate passed. The existing
Manage Gigs workflow now loads owner DTOs, shows version/state/deadline/upgrade and
blocking information, and invokes action-specific backend operations. New publication
creates a genuine draft then publishes it through FastAPI; retry reuses that draft.
Published/legacy editing loads complete owner terms, previews changes, confirms or
refreshes material consequences, sends the expected display version, and maps stale
conflicts. Close/reopen, pause/resume, and destructive cancellation collect structured
reasons. Direct published `updateGig` was removed. Parser-review persistence remains
unchanged. No application, applicant-review, selection-management, or engagement UI
was added.

## Automated verification

Clean local migration replay:

```bash
supabase db reset --local
```

Result: PASS; baseline, 7B, and both 7C-B migrations applied from scratch.

Database regression and 7C-B transaction/RLS suite:

```bash
supabase test db supabase/tests/milestone_7b.sql
supabase test db supabase/tests/milestone_7c_b.sql
```

Results: PASS, 90/90 and 45/45 assertions respectively. Coverage includes publication,
ordinal/contract distinction, pointer movement, immutability, privileges, direct-write
RLS, minor/material classification, stale writes, preview rollback/fingerprints,
application linkage, request invalidation, pause block, intake, cancellation, and
terminal behavior.

Separate-connection races:

```bash
supabase/tests/milestone_7c_b_concurrency.sh
```

Result: PASS. Verified same-base edit (one success/one stale), cancellation/edit,
pause/edit, publication/direct draft edit, cancellation/selection acceptance, and
material edit/selection acceptance. No post-cancellation version, cancelled-plus-
engagement, duplicate ordinal, or edit-wins-plus-engagement outcome occurred.

Focused backend gate: PASS, 65 tests. Final full backend: PASS, 349 tests with the
three existing opt-in remote smoke skips. Frontend: PASS, 16 tests; lint PASS; build
PASS with the existing Vite chunk-size warning. `git diff --check`: PASS.

## Browser smoke

Status: **partially passed**.

The local Vite page loaded with meaningful content, no Vite overlay, and no captured
console errors. A synthetic client authenticated and the complete fixed-price publish
form rendered and validated. Same-origin proxying reached FastAPI. The configured
frontend/backend Supabase URLs are non-local, however, and that external target lacks
the new state/version query surface and service RPCs (the owner query returned HTTP
400). Publication/management therefore could not be completed safely in that target.
No hosted migration was attempted. The complete flow, lifecycle sequence, and two-tab
conflict remain automated-transaction verified but require a migrated authenticated
deployment for full browser closure.

## Files added or changed for 7C-B

- `backend/app/api/routes/gigs.py`
- `backend/app/marketplace/data_access.py`
- `backend/app/marketplace/gig_management.py`
- `backend/app/marketplace/reasons.py`
- `backend/tests/test_gig_management.py`
- `frontend/src/components/GigForm.tsx`
- `frontend/src/lib/gigManagement.ts`
- `frontend/src/lib/gigManagementView.ts`
- `frontend/src/lib/gigs.ts`
- `frontend/src/pages/EditGigPage.tsx`
- `frontend/src/pages/ManageGigsPage.tsx`
- `frontend/src/pages/NewGigPage.tsx`
- `frontend/tests/gigManagement.test.mjs`
- `frontend/vite.config.ts`
- `supabase/migrations/20260718120000_milestone_7c_b_gig_management.sql`
- `supabase/migrations/20260718120001_milestone_7c_b_selection_fill_compatibility.sql`
- `supabase/tests/milestone_7c_b.sql`
- `supabase/tests/milestone_7c_b_concurrency.sh`
- `docs/verification/milestone-7c-b-closure.md`
- `docs/verification/milestone-7c-closure.md`

## Remaining scope

Application submission/response to material changes, My Applications, applicant
review/advancement, selection sending/response, scheduled expiry, engagements,
notifications, contact exchange, payments, contracts, and chat remain 7D+ work.

Milestone 7C-A implementation and automated verification complete.
Milestone 7C-B implementation and automated verification complete.
Milestone 7C implementation and automated verification complete.
Authenticated browser smoke: partially passed.
Milestone 7D not started.
Milestone 7 remains in progress.
