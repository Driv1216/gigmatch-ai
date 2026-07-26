# Milestone 7E closure — Client Applicant Inbox and Ranked Review

## Starting state and preservation

- Starting branch: `main`
- Starting commit: `34ea1efa1afda60408afdb31700d86c434bc4ddd`
- The branch was one commit ahead of `origin/main`.
- The working tree was intentionally dirty with the verified, uncommitted
  Milestone 7D implementation and unrelated untracked `concepts/` and
  `concepts-gpt/` directories.
- No file was reset, restored, stashed, discarded, or overwritten. The
  presentation branch was not inspected or modified. Nothing was committed or
  pushed.
- The pre-migration conclusion in
  `docs/verification/milestone-7e-invariant-map.md` was that 7E is additive:
  the verified 7A–7D authority, transition, locking, event, ranking, RLS,
  FastAPI, and frontend-versioning contracts contain no genuine contradiction.

## Authority and persistence

Gig ownership remains:

```text
gigs.client_id -> user_profiles.id
```

Every 7E API operation verifies the Supabase bearer token, resolves the trusted
`user_profiles` row and client role, uses that authenticated
`user_profiles.id`, and then applies the existing `gigs.client_id` ownership
check. Guessed, missing, draft, or cross-client applicant resources collapse to
the same public 404.

The migration
`20260724105437_milestone_7e_client_applicant_review.sql` adds only
`application_review_states`, the database-authoritative private shortlist
aggregate:

- one row at most per application;
- composite application/gig referential integrity;
- lazy creation on the first effective shortlist add, with no backfill;
- monotonic `review_state_version`;
- paired shortlist timestamp/actor metadata;
- immutable identity and no physical deletes;
- partial active-shortlist and gig lookup indexes;
- RLS enabled;
- no direct `anon` or `authenticated` table privileges;
- backend service-role read access only;
- browser-inaccessible, security-definer mutation RPCs with fixed empty
  `search_path`.

Private shortlist state never projects onto the applicant-visible application
stage. Client-private shortlist events are not participant-visible. Advance,
return, Not Selected, and reopen append participant-visible immutable events
and project only the current stage/reason fields on `applications`.

Terminal stage changes to confirmed, Not Selected, withdrawn, or
gig-cancelled closure clear an existing active shortlist in the same
transaction. Cleanup does not fabricate review-state rows. Reopen returns a
Not Selected application to Under Review, preserves the earlier Not Selected
event, and does not restore shortlist state.

## Applicant pool, ranking, and evidence

The backend starts from every real application for the owned gig and constructs
one batched normalized pool containing current application versions, exact
answered gig versions, safe current freelancer/profile fields, the latest
supported resume parse, optional review state, pending requests, and bounded
participant history. It does not use an eligible-freelancer query and does not
perform per-applicant reads.

Ranking is applied only to the rankable subset and left-joined back onto the
complete selected pool. Incomplete profiles, missing parses, invalid matching
input, stale answered terms, semantic unavailability, terminal stages, and
missing review-state rows do not remove a real applicant.

- Best Match, Newest, Advanced, Internal Shortlist, active, Not Selected,
  withdrawn, closed, and all-history projections use deterministic full-pool
  ordering before pagination.
- Current suitability targets the current material gig version and supported
  current freelancer inputs.
- Commercial evidence remains attached to the immutable application version
  and its exact answered gig version.
- The UI labels suitability as current AI-assisted evidence and separately
  warns when a response to updated gig terms is required.
- Semantic provider failure switches the complete rankable subset to the
  existing keyword pipeline. Hybrid and keyword-only scores are never mixed in
  one ranking.
- Candidate-specific missing matching input returns
  `matching_input_unavailable`, a null score, and a visible applicant.
- Missing ranking is never rendered as zero.
- A focused backend test proves otherwise-identical applications with radically
  different proposal totals receive the same suitability score.
- No ranking history, profile snapshot, resume snapshot, new weight, or
  price-based ranking input was introduced.

## Review decisions, capacity, and time

Shortlist and stage decisions use separate SHA-256 opaque action tokens.
Shortlist tokens cover application/stage, shortlist state version, and gig
state. Decision tokens additionally cover the current application version,
stage epoch, current material gig version, effective request identity, and gig
state. Application edits therefore invalidate stage decisions without
unnecessarily invalidating private shortlist organization.

The browser cannot supply identities, stages, capacities, ranking values,
events, timestamps, blockers, or policy state. FastAPI supplies configurable
shortlist and advancement limits from trusted settings; both are revalidated
and enforced while holding the gig lock in PostgreSQL.

Database lock order is:

```text
gig -> relevant effective selection request -> application
    -> review state / terminal cleanup -> marketplace event
```

Database `clock_timestamp()` is the mutation-time authority. Under Review can
advance; Advanced can return only without an effective request; both active
stages can be marked Not Selected with stage-appropriate structured decision
data; and Not Selected can reopen only without an active engagement.
Advanced Not Selected requires meaningful feedback and explicit final
confirmation. Reserved automatic reasons, duplicate reasons, blank/oversized
text, and control characters fail closed.

Paused gigs permit private shortlist organization but block applicant-visible
stage decisions. Filled/cancelled gigs and terminal applications are read-only.
Effective selection requests block return and Not Selected. Natural shortlist
set retries produce no duplicate state/event; stage transitions are not treated
as naturally idempotent.

## API and frontend

FastAPI routes:

```text
GET  /gigs/{gig_id}/applicants
GET  /gigs/{gig_id}/applicants/{application_id}
GET  /gigs/{gig_id}/applicants/{application_id}/versions
POST /applications/{application_id}/review/shortlist
POST /applications/{application_id}/review/advance
POST /applications/{application_id}/review/return
POST /applications/{application_id}/review/not-selected
POST /applications/{application_id}/review/reopen
```

List/detail/version DTOs expose only safe presentation fields, current
suitability evidence, exact commercial/version context, private client review
state, server-derived actions/blockers, and opaque action tokens. They exclude
contact data, raw resume text, unrestricted parse JSON, vectors, credentials,
and service details.

Frontend routes:

```text
/gigs/:gigId/applicants
/gigs/:gigId/applicants/:applicationId
```

The owned-gig management surface links to the applicant inbox. The inbox has
explicit loading, error, active-empty, history-empty, fallback, filtering,
ordering, shortlist, and pagination states. The detail page presents the
complete current structured proposal, exact answered/current terms comparison,
current suitability and skill-gap evidence, participant review history, and
paginated immutable application-version history.

Review controls include private shortlist, advance, return, structured
Under-Review/Advanced Not Selected confirmations, and reopen. Conflict and
capacity responses refresh authoritative state without clearing the decision
form. The UI explicitly says feedback is structurally validated but not
AI-moderated. No 7F controls, clarification, proposal revision, selection,
contact, chat, notification, engagement, or payment placeholders were added.

The final React review applied the repository’s existing named component,
semantic control, stable-key, colocated-state, hook-dependency, and TypeScript
patterns. Frontend automation continues to use the existing runtime-contract
and pure view-model architecture.

## Automated verification

Database:

```text
supabase db reset --local                                      PASS
supabase test db supabase/tests/milestone_7b.sql              PASS (90)
supabase test db supabase/tests/milestone_7c_b.sql            PASS (45)
supabase test db supabase/tests/milestone_7d.sql              PASS (55)
supabase test db supabase/tests/milestone_7e.sql              PASS (59)
supabase db lint --local --level warning --fail-on error      PASS, no schema errors
supabase db advisors --local --type all --level warn          PASS
```

The unchanged 7B–7D files passed together during the final full database run.
After correcting test-only pgTAP privilege/JWT assertion syntax, the 59-test
7E suite passed. Migration replay itself was clean.

Backend and frontend:

```text
backend: python -m unittest tests.test_applicant_review        PASS (15)
backend: python -m unittest discover -s tests                  PASS (377, 3 skipped)
frontend focused applicant-review tests                       PASS (6)
frontend npm test                                             PASS (29)
frontend npm run lint                                         PASS
frontend npm run build                                        PASS
Python compile check for all new backend/concurrency modules  PASS
git diff --check                                              PASS
```

The separate-session verifier uses independent `psql` processes against the
local PostgreSQL container, not mocked repositories or concurrent coroutines.
All 12 required race families passed:

1. final shortlist slot: one success, one capacity failure, final count one;
2. final advancement slot: one success, one capacity failure, final count one;
3. same-applicant shortlist adds: one row and one effective event;
4. shortlist versus terminal transition: terminal and not shortlisted;
5. advance versus withdrawal: valid serial terminal projection;
6. advance versus edit: valid stale-token/serialized current-version outcome;
7. return versus effective request creation: no request with a non-Advanced app;
8. Not Selected versus withdrawal: one valid terminal projection;
9. Not Selected versus edit: one valid stale-state winner;
10. concurrent reopen: one transition and one reopen event;
11. review transition versus cancellation: cancellation authoritative;
12. terminal cleanup: no committed terminal application actively shortlisted.

Each race checks final stage/review state, active shortlist and Advanced counts,
current version identity, event counts and singularity, and rejects duplicate or
mixed projections.

## Warnings and limitations

Supabase advisors report only the same three pre-existing performance warnings:
multiple permissive authenticated SELECT policies on `client_profiles`,
`freelancer_profiles`, and `gigs`. No 7E table, function, policy, or index
warning was introduced.

Non-failing toolchain output consists of existing Python/Starlette and SWIG
deprecation notices, Node’s experimental type-stripping notice, and Vite’s
existing bundle-size warning.

Authenticated browser smoke was not run. The local database contains the full
migration stack after reset, but the repository has no provisioned genuine
client/freelancer browser sessions connected to a jointly verified running
frontend/backend environment. Per the milestone rule, no session or browser
result was fabricated and no hosted migration was applied.

## Complete Milestone 7E changed-file list

```text
backend/app/api/routes/applicant_review.py
backend/app/config.py
backend/app/main.py
backend/app/marketplace/applicant_review.py
backend/app/marketplace/applicant_review_contracts.py
backend/app/marketplace/applicant_review_data_access.py
backend/tests/test_applicant_review.py
docs/verification/milestone-7e-closure.md
docs/verification/milestone-7e-invariant-map.md
frontend/src/App.tsx
frontend/src/lib/applicantReview.ts
frontend/src/lib/applicantReviewContracts.ts
frontend/src/lib/applicantReviewView.ts
frontend/src/pages/ApplicantInboxPage.tsx
frontend/src/pages/ClientApplicantDetailPage.tsx
frontend/src/pages/ManageGigsPage.tsx
frontend/tests/applicantReview.test.mjs
scripts/verify_milestone_7e_concurrency.py
supabase/migrations/20260724105437_milestone_7e_client_applicant_review.sql
supabase/tests/milestone_7e.sql
```

Milestone 7E implementation and automated verification complete.
Authenticated browser smoke: not run; no genuine paired client/freelancer sessions were provisioned for the verified local environment.
Milestone 7F not started.
Milestone 7 remains in progress.
