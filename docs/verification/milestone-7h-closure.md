# Milestone 7H closure

Date: 2026-07-26
Repository: `/Users/drivyaanshyadav/Desktop/Ai-Gig/gigmatch-ai`

## Starting and ending repository state

- Branch: `main`
- Starting and ending HEAD: `34ea1efa1afda60408afdb31700d86c434bc4ddd`
- Starting and ending `origin/main...main`: `0 1`; local `main` is one commit
  ahead of `origin/main`.
- The starting worktree already contained verified, uncommitted Milestone
  7D–7G work and unrelated `concepts/` and `concepts-gpt/` trees.
- All existing work was preserved. No reset, restore, stash, checkout, commit,
  push, hosted migration, deployment or presentation-branch action occurred.
- The ending worktree remains intentionally dirty with the combined preserved
  7D–7G work and the new 7H implementation.

The pre-implementation authority and contradiction analysis is recorded in
`docs/verification/milestone-7h-invariant-map.md`.

## Migration and files changed

The additive 7H migration is:

```text
supabase/migrations/20260726090000_milestone_7h_engagement_workspace_lifecycle.sql
```

It adds the engagement lifecycle version, service-only operation ledger,
one-time reopening authority, reconsideration invitation authority, participant
read RPCs, lifecycle/reopening/reconsideration mutation RPCs, and the narrow
changes needed in existing gig, review and selection paths.

Focused verification additions are:

```text
supabase/tests/milestone_7h.sql
scripts/verify_milestone_7h_concurrency.py
backend/tests/test_engagement_workspace.py
frontend/tests/engagements.test.mjs
```

The 7H backend surface is concentrated in:

```text
backend/app/api/routes/engagements.py
backend/app/marketplace/engagement_contracts.py
backend/app/marketplace/engagement_data_access.py
```

Existing backend integration changed only where required:

```text
backend/app/main.py
backend/app/api/routes/gigs.py
backend/app/marketplace/data_access.py
backend/app/marketplace/engagements.py
backend/tests/test_marketplace_engagements.py
```

The 7H frontend surface is:

```text
frontend/src/lib/engagementContracts.ts
frontend/src/lib/engagements.ts
frontend/src/pages/EngagementListPage.tsx
frontend/src/pages/EngagementWorkspacePage.tsx
frontend/src/components/ReconsiderationPanel.tsx
frontend/tests/engagements.test.mjs
```

It is integrated through the existing application in:

```text
frontend/src/App.tsx
frontend/src/components/Navbar.tsx
frontend/src/pages/ClientApplicantDetailPage.tsx
frontend/src/pages/ApplicationDetailPage.tsx
frontend/src/pages/EditApplicationPage.tsx
frontend/src/pages/ManageGigsPage.tsx
frontend/src/lib/gigManagement.ts
```

The only directly superseded legacy assertion changed is in
`supabase/tests/milestone_7b.sql`; see "Modified legacy assertion" below.

## Final authority model

The existing aggregate authorities remain unchanged:

```text
gig_versions          = immutable client terms
application_versions  = immutable freelancer proposals
selection_requests    = exact version-bound formal offers
engagements            = accepted terms and current engagement lifecycle
marketplace_events     = append-only workflow activity history
```

`private.confirm_selection_request_core(...)` remains the sole engagement
creator and selection fan-out transaction. Milestone 7H did not add a second
confirmation route, accepted-snapshot builder, winner projection, or
browser-created engagement.

The new tables are narrow authorities:

```text
private.engagement_operations
  = transactional idempotency ledger

public.engagement_reopenings
  = one-time failed-engagement reopening record

public.application_reconsideration_invitations
  = consent lifecycle for selective reconsideration
```

Frontend state and FastAPI response models are projections only. The browser
does not supply trusted participant identity, actor role, current status,
lifecycle version, timestamps, prior status, accepted snapshots, gig or
application bindings, events, or permission decisions.

## Accepted-snapshot compatibility

Existing version-1 and version-2 accepted snapshots are both preserved and
readable:

- version 1 remains the historical 7B contract;
- version 2 remains the 7G contract with `scope_notes` and exact aggregate and
  participant identifiers.

No snapshot was rewritten or upgraded. Engagement read RPCs authorize from
relational participant ownership, branch on the stored contract/schema version,
and return a normalized allowlist of immutable terms. They never return raw
accepted JSON, internal snapshot metadata, contact details, or unrelated
application/gig fields.

The normalized view includes only safe client terms, freelancer proposal,
timeline, availability, included and excluded work, assumptions,
estimate-change factors and optional scope notes.

## Engagement lifecycle

The implemented state graph is exactly:

```text
confirmed -> kickoff_pending
confirmed | kickoff_pending -> in_progress
in_progress -> completion_pending
completion_pending -> completed | in_progress
active state -> cancellation_pending
cancellation_pending -> previous active state | cancelled
```

Either participant may prepare for kickoff, mark work started, request
completion, or request cancellation. Only the other participant may confirm or
reject completion and acknowledge cancellation. Only the cancellation requester
may withdraw the request. Completed and Cancelled are terminal.

Every successful transition:

- locks authoritative rows;
- validates a state-bound action token and expected lifecycle version;
- derives actor and time in PostgreSQL;
- increments `engagements.lifecycle_version` exactly once;
- appends one allowlisted marketplace event;
- records or replays the idempotent operation in the same transaction.

The participant-safe timeline is deterministic and uses an explicit engagement
event allowlist. It does not include Q&A, shortlist, proposal, review, report,
revision or unrelated gig activity.

## Historical confirmation invariant

The permanent one-Confirmed-application-per-gig rule was the genuine schema
contradiction identified before implementation. The migration runs fail-closed
preflight checks for ambiguous or inconsistent existing data and then removes
`applications_one_confirmed_per_gig_idx`.

Historical Confirmed applications now remain immutable records of successful
past selection. Current winner authority is instead:

```text
at most one non-cancelled engagement per gig
```

`engagements_one_non_cancelled_per_gig_idx` is retained. The shared selection
confirmation core now blocks an existing non-cancelled engagement, while a
historical Confirmed application backed only by a Cancelled engagement no
longer blocks a later winner. The old winner is not rewritten, downgraded, or
deleted.

## Failed-engagement reopening

A cancelled engagement may be reopened by the owning client exactly once.
Reopening creates one immutable `engagement_reopenings` row and changes only:

```text
opportunity_lifecycle: filled -> active
application_intake:    closed (unchanged)
operational_state:     active
```

The gig therefore becomes Closed to New Applications. Gig versions,
application histories, and the prior Confirmed winner remain unchanged.
Duplicate and historical reopening attempts are rejected, and concurrent
attempts converge on one reopening authority and one event.

The owner gig-management projection explicitly distinguishes an active
engagement from `Engagement cancelled · Gig not reopened`.

## Reconsideration workflow

After a controlled reopening, the owning client may invite an eligible previous
Not Selected or Withdrawn applicant. The failed engagement's prior Confirmed
winner is always excluded.

Each invitation binds the source cancelled engagement and reopening, gig,
application, invited current application version, current material gig version,
structured reason and lifecycle version. Its states are:

```text
pending
accepted
declined
cancelled
superseded
closed_by_gig_state
```

Only one pending invitation per application is permitted. Client cancellation
does not change the application. A freelancer decline also leaves application
history unchanged.

Freelancer acceptance always creates a new immutable application version with
origin `reconsideration`:

- Reaffirm and Reopen copies the complete previous proposal;
- Submit Updated Proposal reuses the existing complete canonical application
  contract and form.

Both routes reuse the existing 7D proposal validation and version-insertion
authority, move the application back to Under Review, and preserve prior
proposal, Q&A, review, advancement and revision history. Material gig edits and
ordinary application-version changes supersede affected pending invitations.
Gig cancellation and successful later selection close them. Pause preserves
the invitation but makes actions unavailable.

## RLS and RPC grants

RLS is enabled for the new public authorities and the private operation ledger.
There is no browser table mutation authority.

All new mutation RPCs and the wrapped existing mutation entry points are:

- `SECURITY DEFINER`;
- fixed to `search_path = ''`;
- schema-qualified internally;
- revoked from `PUBLIC`, `anon` and `authenticated`;
- granted only to `service_role`.

Read RPCs also use relational participant or owning-client authorization and
return bounded safe DTOs. Direct service reads needed by the trusted backend are
limited to `service_role`. Cross-user resource access is non-enumerating.

## Lock order

The compatible aggregate order is:

```text
gig
-> effective selection request when relevant
-> applications in UUID order
-> review / Q&A / revision children
-> engagement
-> reopening
-> reconsideration invitation
-> immutable application version
-> marketplace events
-> operation ledger
```

Lifecycle-only operations use `gig -> engagement -> events -> operation`.
Cancellation acknowledgement and reopening lock the selected application before
the engagement. Reconsideration response uses
`gig -> application -> child rows -> invitation -> version -> events ->
operation`.

The implementation does not introduce reverse-order cross-aggregate scanning
triggers. All actor timestamps use authoritative PostgreSQL time after material
locks.

## Idempotency and action tokens

Every 7H mutation requires a browser-generated UUID request ID and a
server-issued opaque action token. Domain-separated SHA-256 tokens bind the
authoritative actor, operation, aggregate identity and locked state.

`private.engagement_operations` stores actor, request UUID, operation kind,
canonical fingerprint and result references transactionally with the business
mutation. Exact replay returns the authoritative existing result. Reuse of the
same key for a different payload or operation returns
`idempotency_conflict`. Stale tokens and skipped lifecycle versions fail
closed.

## API and frontend

Participant-safe backend routes provide engagement list, detail, timeline and
the exact lifecycle actions. Owning-client routes provide one-time reopening
and invitation creation/cancellation. Participant invitation routes provide
context, reaffirmation, updated-proposal acceptance and decline.

Protected frontend routes are:

```text
/engagements
/engagements/:engagementId
```

The list covers loading, empty, error and ready states with active and
historical workspaces. The workspace shows safe participant/gig summaries,
status, confirmation date, immutable accepted terms, server-authorized controls,
deterministic timeline, and the required product-record, payment and
participant-reported-status disclaimers. Destructive and terminal actions use
confirmation dialogs. Conflict handling reloads authoritative state.

Reconsideration controls are integrated into the client applicant detail and
freelancer application detail. Updated proposals use the existing complete
application form through reconsideration mode. No contact details or unread
notification claims were added.

## Modified legacy assertion

One 7B database assertion directly encoded the superseded permanent
one-Confirmed-row invariant. It was changed from expecting a second historical
Confirmed application to fail to asserting:

1. a second historical Confirmed row may exist after the first engagement is
   Cancelled; and
2. exactly one non-cancelled engagement remains the current authority.

No unrelated 7B–7G assertion was changed.

## Final verification results

### Database replay and pgTAP

```text
supabase db reset --local
```

Result: clean replay succeeded through
`20260726090000_milestone_7h_engagement_workspace_lifecycle.sql`.

```text
supabase test db \
  supabase/tests/milestone_7b.sql \
  supabase/tests/milestone_7c_b.sql \
  supabase/tests/milestone_7d.sql \
  supabase/tests/milestone_7e.sql \
  supabase/tests/milestone_7f.sql \
  supabase/tests/milestone_7g.sql \
  supabase/tests/milestone_7h.sql
```

Result: 7 files, 420 assertions, all passed. The new 7H suite contributes 40
assertions.

```text
supabase db lint --local --level warning
```

Result: `No schema errors found`.

```text
supabase db advisors --local --type all --level warn
```

Result: three performance warnings for pre-existing multiple permissive
authenticated `SELECT` policies on `client_profiles`, `freelancer_profiles`
and `gigs`; no 7H security finding was reported.

### Independent-session concurrency

```text
python3 scripts/verify_milestone_7h_concurrency.py
```

Result: all six race families passed:

1. competing work-start transitions;
2. completion confirm versus reject;
3. cancellation withdrawal versus acknowledgement;
4. duplicate failed-engagement reopening;
5. competing reconsideration invitations;
6. invitation response versus material gig edit.

The verifier uses independent PostgreSQL sessions and also checks surviving
projection/event singularity.

### Backend

```text
cd backend
.venv/bin/python -m unittest discover -s tests -v
```

Result: 415 tests ran; 412 passed and 3 pre-existing tests were skipped.

```text
.venv/bin/python -m compileall -q \
  app tests ../scripts/verify_milestone_7h_concurrency.py
```

Result: passed with no compilation errors.

### Frontend

```text
cd frontend
npm test
npm run lint
npm run build
```

Results:

- 46 tests passed;
- ESLint passed;
- TypeScript and Vite production build passed, transforming 153 modules.

### Worktree checks

```text
git diff --check
git status --short
```

`git diff --check` passed. `git status --short` confirms the intentional
combined uncommitted 7D–7H work plus preserved `concepts/` and `concepts-gpt/`
trees; nothing was committed or discarded.

## Warnings and honest limitations

- Supabase CLI reports that v2.109.1 is available while the local verified
  version is v2.98.2.
- The database advisor retains the three pre-existing multiple-permissive-policy
  performance warnings listed above.
- Vite reports one minified JavaScript chunk of approximately 692 kB, above its
  500 kB advisory threshold. The production build succeeds; code splitting is
  outside this milestone.
- Python dependencies emit existing deprecation warnings for
  `asyncio.iscoroutinefunction` and SWIG wrapper types during the full test
  suite. They do not fail tests.
- This milestone provides participant-reported lightweight lifecycle status,
  not verification that external work, delivery, payment or cancellation facts
  occurred.
- Authenticated browser smoke was not requested and was not fabricated.
- No hosted migration was applied and no deployment was performed.

## Explicit exclusions

Milestone 7H does not add project management, work delivery, tasks, milestones,
files, timesheets, contracts, signatures, payments, escrow, invoices, disputes,
reviews, ratings, general chat, contact exchange, notification infrastructure,
dashboard consolidation, matching/ranking changes, enterprise workspaces, or
unrelated UI redesign.
