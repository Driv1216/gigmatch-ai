# Switchboard Frontend Migration — Stage 7 Closure

User approval: APPROVED

## Scope and repository preservation

Stage 7 promotes the existing Milestone 7G exact-version selection workflow on:

```text
/applications/:applicationId
/gigs/:gigId/applicants/:applicationId
```

The stage began and ended on branch `main` at
`af46d6c413a92eb480acddf7ae91a973271784b2`. The starting worktree already
contained the approved uncommitted Stage 1–6 frontend migration, verified
Milestone 7 implementation, and unrelated user-owned files. No reset, restore,
stash, clean, checkout, commit, push, deployment, migration, seed, or concept
change occurred. The ending worktree remains intentionally dirty and preserves
that complete starting state.

Stage 6 approval was confirmed before editing: both approval markers in
`switchboard-stage-06-closure.md` are `APPROVED`.

## Authority decisions

The live repository agreed with the locked migration plan and the 7G/7H
authority artifacts. No contradiction or DTO gap required backend work.

The authority chain remains:

```text
immutable application version + immutable material gig version
→ selection request
→ database-authoritative response window and status
→ server-authorized participant action
→ transactional result
→ immutable request history
```

The frontend does not select a winner, expire or invalidate a request, rebind
terms, create an engagement, or infer resend eligibility. It renders only the
existing participant-safe context, request, history, blocker, token, and
engagement projections.

The history endpoint contains internal request/version identifiers required to
resolve safe request details. They remain component-local routing references.
The UI displays safe request ordinals and application/material-gig version
numbers only; raw IDs are never rendered.

## First-class selection presentation

`SelectionPanel` is now a Stage 7 Switchboard authority rather than a generic
contained card. It uses the approved Bone/Ocean/Glass/Coral/Ink language and
keeps the following projections visibly separate:

```text
Application · <authoritative stage>
Selection request · <authoritative status>
```

`Selection Pending` is never presented as an application stage.

The panel presents:

- the exact frozen proposal, timeline, availability, structured scope, scope
  notes, and client material terms;
- the request-bound Application and Material gig ordinals;
- an explicit bound-versus-current warning when either ordinal changes;
- sent time, exact deadline, current request status, and an informational
  countdown;
- distinct Pending, Accepted, Declined, Cancelled, Expired, Invalidated, and
  Revised Terms Requested history consequences;
- safe immutable request ordinals without raw UUIDs or raw JSON;
- only the existing minimal accepted engagement summary and existing
  Engagement Workspace destination.

All structured terms wrap as readable definition lists. The UI does not print
snapshot JSON, operation fingerprints, event internals, contact data, private
shortlist state, or parser/semantic internals.

## Tokens and idempotency

Send, management, and response tokens remain independent:

- `send_token` is used only by the client send operation;
- `management_token` is used only by client request cancellation;
- `response_token` is used only by the four freelancer responses.

Tokens remain inside `SelectionPanel` response state. They are not displayed,
logged, placed in URLs, exported to the participant shell, or written to local
storage, session storage, cookies, or global context.

`SelectionOperationRegistry` holds UUID request IDs in a component-local map.
The stable logical-operation key contains only the operation, route-local
aggregate identity, and meaningful participant input—never an action token.
The same key reuses the same UUID after an ordinary transport/service failure.
A changed input or request produces a new key. Success and authoritative 409
conflicts settle the old key so deliberate later attempts receive a fresh UUID.
Route/application changes reset the registry. No automatic mutation retry was
introduced.

## Expiry and resend behavior

The countdown is informational. It is calculated from `expires_at -
authoritative_now` and monotonic elapsed page time, not `Date.now()`. Reaching
zero changes only the informational label and triggers a read refresh. It does
not locally expire the request, hide authorized response controls, or enable a
resend. Server status and blockers remain authoritative.

The client deadline choices are exactly 24, 48, and 72 hours with 48 selected
by default. Existing server blockers—including active request, unchanged-term
resend, open Stage 6 revision, version response, readiness, filled gig, and
existing engagement conditions—remain the only send/resend authority. Intake
closure, browser time, and unanswered Q&A are not added as frontend blockers.

## Participant actions and exact consequences

Client send shows the exact version binding, response duration, one-active-
request constraint, and conditional commercial acknowledgement. Client
cancellation uses a selection-specific native dialog with the existing
structured reason/detail contract and states that the request becomes
Cancelled while the application remains Advanced and the proposal is not
rewritten.

The freelancer workflow retains four full choices:

```text
Accept Exact Terms
Decline while Remaining Interested
Decline and Withdraw Completely
Request Revised Terms
```

Each opens a native selection-specific confirmation dialog with its exact
server consequence. Acceptance states that no conditions may be added and that
only authoritative success may accept the request, Confirm the selected
application, Fill the gig, create one current engagement, and close other
active applications. The UI waits for the mutation and authoritative refetch;
it performs no optimistic fan-out.

Decline/remain preserves Advanced plus proposal/Q&A history. Decline/withdraw
uses only the selection response and does not issue a second ordinary
withdrawal. Revised terms uses the existing structured categories/detail,
leaves the application Advanced, and explicitly creates no Stage 6 revision
request, editor navigation, or application version.

## Cross-authority synchronization and Stage 8 containment

Both host pages own one narrow numeric `authorityRefreshKey`. A successful or
controlled-conflict selection operation refreshes the owning application or
applicant record and advances that key. `StructuredQaPanel` and
`ReconsiderationPanel` observe the key through nonvisual read-only refresh
hooks. Their current drafts and forms are not remounted or reset.

The same route-local mechanism refreshes Selection after Stage 5 decisions,
Stage 4 application mutations, or Stage 6 mutations. It contains no action
tokens, executes no mutation, and introduces no global store, command bus, or
workflow framework.

Stage 8 reconsideration remains a separate sibling region. Its invitation,
response, Engagement Workspace, failed-engagement reopening, and lifecycle
presentation were not redesigned. Secure Contact Exchange and Stage 9 code
were untouched.

## Automated verification

```text
cd frontend
node --experimental-strip-types --test tests/selection.test.mjs
  PASS (18/18)

npm test
  PASS (123/123)

npm run lint
  PASS

npm run build
  PASS

cd backend
./.venv/bin/python -m unittest \
  tests.test_selections \
  tests.test_marketplace_payments_selections \
  tests.test_marketplace_engagements -v
  PASS (54/54)

git diff --check
  PASS
```

The focused frontend suite covers separate application/request status, exact
frozen and current-versus-bound versions, strict history contracts, every
terminal status and response consequence, token separation/non-persistence,
24/48/72 duration behavior, server-time countdown behavior, request-ID reuse
and rotation, resend/revision blockers, atomic acceptance copy, safe ordinals,
no raw JSON, route-local synchronization, Stage 8 containment, global command
exclusion, native dialog/time semantics, and accessibility source expectations.

The unchanged backend group proves exact frozen request bindings, application
and gig invalidation, minor-correction/material behavior, terminal resend
rules, expiry, all response state transitions, atomic request contracts,
participant authorization, sanitized conflicts, financial compatibility, and
engagement snapshot/state compatibility. No backend test or implementation was
changed.

Warnings remain limited to the repository's existing Node experimental
type-stripping notice, Starlette/Python deprecation notice, and Git fsmonitor
IPC warning.

## Bundle impact

Approved Stage 6 baseline:

- 44 JavaScript chunks;
- 812,036 total JavaScript bytes;
- 469,623-byte main JavaScript chunk;
- 147,143 bytes CSS;
- 45,040-byte Structured Q&A/detail shared lazy chunk.

Stage 7 build:

- 44 JavaScript chunks (unchanged);
- 823,891 total JavaScript bytes (`+11,855`);
- 469,623-byte main JavaScript chunk (unchanged);
- 159,197 bytes CSS (`+12,054`);
- 56,615-byte Structured Q&A/detail shared lazy chunk (`+11,575`).

The primary bundle is unchanged, the existing application/applicant routes
remain lazy, and Vite emitted no greater-than-500 kB warning. The Stage 7 delta
is isolated to the shared detail-route workflow chunk and scoped responsive
styles.

## Browser evidence and limitations

Local Vite/FastAPI servers used the repository's existing configured
environment and were stopped after verification. No local or hosted database
reset, migration, seed, or write occurred. Backend request logs contained only
`GET` and `OPTIONS` requests.

Authenticated client evidence: **PASS for the legitimate available state**.

The retained `clientA` session loaded owned gig `Web dev` and applicant
`freelancerA`. The real authoritative state was:

```text
Application v2
Application stage: Under Review
Selection request: Not sent
Selection blocker: application_not_advanced
Selection history: empty
```

The browser correctly showed both independent statuses, exact current
Application v2 / Material gig v2 source terms, the human blocker “Advance this
applicant before sending a formal request,” no false send/cancel/freelancer
response action, empty immutable history, and a separate Stage 8
Reconsideration region.

At 1440, 1024, 768, and 390 pixels:

- document horizontal overflow was false;
- Selection stayed inside the viewport and its source stayed inside the
  Selection boundary;
- frozen proposal/client terms wrapped without critical clipping;
- blocker, history, and reconsideration boundaries remained readable;
- Selection and Reconsideration remained separate siblings;
- no Vite overlay or console warning/error appeared.

Browser status is **PARTIAL/NOT RUN** for Advanced/send, pending/countdown,
client cancellation, all freelancer responses/dialogs, expiry, invalidation,
terminal request history, atomic acceptance, and accepted engagement summary.
No legitimate record/session exposed those states, and none was manufactured.
Those invariants remain covered by focused frontend tests and unchanged
backend/database authority evidence; missing browser evidence is not promoted
to PASS.

## Exact Stage 7 files changed

```text
frontend/src/components/SelectionPanel.tsx
frontend/src/components/StructuredQaPanel.tsx
frontend/src/components/ReconsiderationPanel.tsx
frontend/src/lib/selection.ts
frontend/src/lib/selectionContracts.ts
frontend/src/lib/selectionView.ts
frontend/src/pages/ApplicationDetailPage.tsx
frontend/src/pages/ClientApplicantDetailPage.tsx
frontend/src/styles.css
frontend/tests/selection.test.mjs
frontend/tests/applications.test.mjs
frontend/tests/applicantReview.test.mjs
docs/frontend/verification/switchboard-stage-07-closure.md
```

No backend, database, migration, route, global command, concept, Engagement
Workspace, reconsideration workflow, or Secure Contact Exchange file changed
for Stage 7.

User approval: APPROVED
