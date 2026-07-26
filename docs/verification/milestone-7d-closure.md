# Milestone 7D Closure Verification

## Repository preflight

- Starting branch: `main`.
- Starting commit: `34ea1ef`.
- The working tree was clean before implementation.
- No commit or push was performed, and no presentation branch was checked out or
  modified.

## Invariant-map conclusion

The pre-implementation schema and behavior inventory is recorded in
`docs/verification/milestone-7d-invariant-map.md`. Existing 7B/7C invariants did
not require a rewrite. The implementation preserves the existing one-history
rule, split immutable snapshot model, exact application/gig version bindings,
selection-request state model, append-only events, RLS authority, and global
lock order.

The only additive snapshot column is nullable `application_versions.scope_notes`.
It closes a pre-7D storage gap for applicant-authored scope notes without making
legacy versions invalid.

## Architecture implemented

The vertical slice is database-authoritative:

```text
authenticated freelancer UI
-> strict FastAPI contracts and ownership checks
-> service-only narrow mutation RPC
-> locked aggregate/version/event transaction
-> sanitized current-state and immutable-history DTOs
```

The browser never supplies an acting user, freelancer profile, currency,
application stage, version ordinal, event data, or server action list. FastAPI
derives identity from the verified bearer token, resolves the trusted freelancer
profile, derives currency from reviewed gig terms, and reloads safe current state
after every mutation.

## Database and RPC design

Migration:

- `supabase/migrations/20260720064417_milestone_7d_freelancer_applications.sql`

Additions and amendments:

- Nullable paired `submission_request_id` / `submission_fingerprint` fields for
  legacy-safe submission idempotency.
- Partial unique freelancer/request index and the existing unique
  gig/freelancer constraint together enforce one history.
- Immutable `scope_notes` snapshot storage and distinct
  `gig_change_reapplication` version origin.
- Complete fixed-price, hourly, and open-proposal validation, including exact
  decimal/range checks, timeline/availability shapes, mandatory open scope,
  budget/rate explanations, and supported gig contract checks.
- Fail-closed handling for the inherited gig validator's possible SQL `NULL`
  result: every 7D call site requires the result to be explicitly `TRUE`.
- Canonical JSON normalization before fingerprinting. Numeric JSON values and
  equivalent decimal strings normalize to the same operation fingerprint.
- Opaque SHA-256 gig-terms and application-version tokens.
- Backend-only `SECURITY DEFINER`, fixed-empty-search-path RPCs:
  `submit_application`, `create_application_version`,
  `respond_to_application_gig_change`, `withdraw_application`, and
  `reapply_application_after_gig_change`.
- RPC execution is revoked from `PUBLIC`, `anon`, and `authenticated`, and
  granted only to `service_role`. Direct marketplace-table DML remains denied.

All writes use the established order:

```text
gig
-> stored pending request when relevant
-> application
-> immutable version
-> reference-oriented events
```

Deadline, expiry, and eligibility decisions use `clock_timestamp()` after the
material locks. Event-insert failure rolls back the pointer, version, stage, and
request effects as one transaction.

## Snapshot, idempotency, and gig-version authority

Each version stores complete applicant content: cover note, proposal, timeline,
availability, structured scope, and scope notes. Reaffirmation copies all of it
to a new immutable version; edits and changed-gig updates always create a new
version rather than mutating history.

Initial submission binds the version to the exact reviewed material gig version.
The idempotency fingerprint covers trusted freelancer identity, gig identity,
reviewed material version, and canonical complete snapshot. Therefore:

- the same key and same canonical operation replays without another version or
  event;
- equivalent decimal representations replay as equal;
- the same key with changed content conflicts;
- a different key cannot create a second gig/freelancer history;
- replay after a later application edit returns the reloaded current safe state;
- nullable fields keep existing application rows migration-compatible.

Minor canonical gig corrections do not require a response. A material edit
makes the application stale by exact version identity. Compatible proposals can
be reaffirmed; changed currency, changed payment structure, or a proposal made
newly invalid by budget/rate terms requires an updated proposal. A second
material edit causes a stale-token conflict rather than acknowledging unseen
terms.

## Selection requests and reapplication

An ordinary edit or changed-gig response invalidates an effective request that
targets the same application before inserting the new version. A request for a
different application remains pending and does not block the edit. An effective
request for this application blocks ordinary withdrawal. Expired stored-pending
rows are not treated as effective.

Withdrawal updates the application projection with a structured reason and
preserves every version. Reapplication is allowed only for a withdrawn
application, a newer material gig version, and an application-ready gig with no
disqualifying engagement/request. It reactivates the same aggregate and appends
one `gig_change_reapplication` version/event; it never creates a second history.

## Backend routes and DTOs

Added authenticated freelancer routes:

- `GET /gigs/{gig_id}/application-context`
- `POST /gigs/{gig_id}/applications`
- `GET /applications`
- `GET /applications/{application_id}`
- `GET /applications/{application_id}/versions`
- `POST /applications/{application_id}/versions`
- `POST /applications/{application_id}/gig-change/reaffirm`
- `POST /applications/{application_id}/gig-change/update`
- `POST /applications/{application_id}/withdraw`
- `POST /applications/{application_id}/reapply-after-gig-change`

Strict Pydantic discriminated contracts reject unknown/client-authoritative
fields and preserve decimal precision. Cross-user IDs return non-enumerating
404s. DTOs expose safe gig/client terms, answered/current version numbers,
comparison fields, derived compatibility/actions/blockers, and immutable
history without raw database rows, auth metadata, selection internals, or
private nested term keys.

## Frontend surfaces

- Gig detail uses the authenticated application context to render Apply, View
  existing application, or a state-specific blocker.
- `/gigs/:gigId/apply` renders fixed/hourly/open forms and keeps one request ID
  across retries. A stale-terms response refreshes authoritative terms without
  remounting or clearing form state.
- `/applications` provides explicit loading, empty, error, ready, status, and
  response-required states.
- `/applications/:applicationId` shows current/original proposals, answered and
  current material versions, gig-change comparison, compatible reaffirmation,
  withdrawal confirmation/reason, reapplication, and newest-first immutable
  history.
- `/applications/:applicationId/edit` handles ordinary edit, changed-gig update,
  and material-change reapplication with action revalidation.
- Freelancer navigation includes `My Applications`.

Frontend automation uses the repository's existing runtime-contract and pure
view-model test architecture; no new DOM framework was introduced.

## Exact automated verification

Final clean replay and database results:

```text
supabase db reset --local                                      PASS
supabase test db supabase/tests/milestone_7b.sql              PASS (90)
supabase test db supabase/tests/milestone_7c_b.sql            PASS (45)
supabase test db supabase/tests/milestone_7d.sql              PASS (55)
supabase db lint --local --level warning                      PASS, no schema errors
```

The separate-session verifier passed 18 reported outcomes covering same-key and
different-freelancer submission, deadline waiting, submission versus material
edit/pause/intake-close/cancellation/fill, edit versus edit/material edit,
same/other-application request behavior, changed-gig response versus a second
material edit, withdrawal versus edit/cancellation, and reapplication versus
reapplication. Counts, version ordinals, history identity, and event singularity
were checked after the races.

```text
backend unittest discovery       PASS (362 run, 3 skipped)
frontend npm test                PASS (23)
frontend npm run lint            PASS
frontend npm run build           PASS
git diff --check                 PASS
```

Supabase advisors report only the same three pre-existing performance warnings:
multiple permissive authenticated SELECT policies on `client_profiles`,
`freelancer_profiles`, and `gigs`. No 7D table, policy, function, or index warning
was introduced.

Non-failing toolchain warnings are unchanged dependency deprecations in the
backend, Node's experimental type-stripping notice in frontend tests, the
Supabase CLI update notice, and Vite's existing bundle-size warning.

## Browser-smoke status and limitations

Authenticated browser smoke was not run. The checked-in frontend/backend
environment targets the previously identified non-local Supabase project, which
does not contain the required 7C-B/7D migration stack. The clean local Supabase
database contains the migrations, but the application is not configured with a
local authenticated test account/session. Running the requested story against
the configured remote target would produce misleading results, so no browser
claim is made.

## Files changed

Database and verification:

- `supabase/migrations/20260720064417_milestone_7d_freelancer_applications.sql`
- `supabase/tests/milestone_7d.sql`
- `scripts/verify_milestone_7d_concurrency.py`
- `docs/verification/milestone-7d-invariant-map.md`
- `docs/verification/milestone-7d-closure.md`

Backend:

- `backend/app/main.py`
- `backend/app/api/routes/applications.py`
- `backend/app/marketplace/applications.py`
- `backend/app/marketplace/application_contracts.py`
- `backend/app/marketplace/application_data_access.py`
- `backend/tests/test_applications.py`
- `backend/tests/test_marketplace_gigs_applications.py`

Frontend:

- `frontend/src/App.tsx`
- `frontend/src/components/ApplicationForm.tsx`
- `frontend/src/components/Navbar.tsx`
- `frontend/src/lib/applicationContracts.ts`
- `frontend/src/lib/applications.ts`
- `frontend/src/lib/applicationView.ts`
- `frontend/src/pages/ApplicationDetailPage.tsx`
- `frontend/src/pages/ApplyToGigPage.tsx`
- `frontend/src/pages/EditApplicationPage.tsx`
- `frontend/src/pages/GigDetailPage.tsx`
- `frontend/src/pages/MyApplicationsPage.tsx`
- `frontend/tests/applications.test.mjs`

## Explicit exclusions and remaining work

- No selection-request UI was added.
- No unrelated page redesign, new browser framework, commit, push, remote
  migration, or deployment was performed.
- Milestone 7E and later work remain outside this slice.

Milestone 7D implementation and automated verification complete.
Authenticated browser smoke: not run because the configured remote target lacks
the required migrations and no local authenticated app session is configured.
Milestone 7E not started.
Milestone 7 remains in progress.
