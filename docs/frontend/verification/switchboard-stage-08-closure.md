# Switchboard Frontend Migration — Stage 8 Closure

Date: 2026-08-09

Scope: Milestone 7H frontend migration only — Engagement Workspace,
participant-reported lifecycle, failed-engagement Gig Reopening, and
reconsideration.

## Status

- Stage 8 implementation: **COMPLETE**.
- Required automated verification: **PASS**.
- Legitimate-state browser verification: **PASS for the states that exist**.
- Browser verification of unavailable mutation states: **PARTIAL / NOT RUN**.
- Backend/database changes for Stage 8: **NONE**.
- Deployment, hosted migration, reset, seed, or hosted mutation: **NONE**.

Stage 7 was explicitly approved by the user in the current conversation. Both
`User approval: APPROVED` markers in
`docs/frontend/verification/switchboard-stage-07-closure.md` were changed to
`User approval: APPROVED`. Its existing browser limitations remain unchanged
and were not promoted to PASS.

## Git and worktree preservation

Starting state:

```text
branch: main
HEAD: af46d6c413a92eb480acddf7ae91a973271784b2
worktree: intentionally dirty with the cumulative Stage 1–7 implementation
          and user-owned/unrelated files
```

Ending state:

```text
branch: main
HEAD: af46d6c413a92eb480acddf7ae91a973271784b2
worktree: remains intentionally dirty; prior and unrelated changes preserved
```

No reset, restore, stash, clean, branch switch, commit, push, or destructive
Git operation was used. `git -c core.fsmonitor=false diff --check` passed. The
ordinary Git invocation also emitted the existing fsmonitor daemon IPC warning;
disabling that optional integration proved the diff itself clean.

The worktree contains pre-existing backend/database and other user-owned
changes. Stage 8 did not edit backend or database files.

## Exact Stage 8 files changed

Stage 7 approval record:

```text
docs/frontend/verification/switchboard-stage-07-closure.md
```

Stage 8 implementation:

```text
frontend/src/lib/engagementContracts.ts
frontend/src/lib/engagements.ts
frontend/src/lib/engagementView.ts
frontend/src/lib/participantNavigation.ts
frontend/src/components/ApplicationForm.tsx
frontend/src/components/EngagementActionDialog.tsx
frontend/src/components/ParticipantShell.tsx
frontend/src/components/ReconsiderationActionDialog.tsx
frontend/src/components/ReconsiderationPanel.tsx
frontend/src/pages/ApplicationDetailPage.tsx
frontend/src/pages/ClientApplicantDetailPage.tsx
frontend/src/pages/EditApplicationPage.tsx
frontend/src/pages/EngagementListPage.tsx
frontend/src/pages/EngagementWorkspacePage.tsx
frontend/src/pages/ManageGigsPage.tsx
frontend/src/styles.css
```

Stage 8 regression coverage:

```text
frontend/tests/applicantReview.test.mjs
frontend/tests/applications.test.mjs
frontend/tests/engagements.test.mjs
frontend/tests/gigManagement.test.mjs
frontend/tests/qa.test.mjs
frontend/tests/selection.test.mjs
```

Closure evidence:

```text
docs/frontend/verification/switchboard-stage-08-closure.md
```

## Authority and route ownership

The live Milestone 7H DTOs were sufficient. No frontend-invented workflow
authority and no backend DTO expansion were needed.

`/engagements` is a connected participant register with explicit loading,
error, empty, and ready states. It groups the backend's seven exact statuses
into current work and terminal history only as a presentation decision;
`completed` and `cancelled` remain the authoritative server statuses.

`/engagements/:engagementId` is the shared Engagement Workspace. Both routes
retain lazy route boundaries and the existing client/freelancer role
protection. Participant command navigation remains destination-only and does
not expose workflow mutations.

Runtime guards fail closed on malformed data, incoherent list counts,
duplicate timeline event IDs, unsupported status/action values, and forbidden
ordinary-response fields. Action tokens are transported internally and never
rendered. Raw accepted snapshots, encrypted contact material, key/digest
metadata, and plaintext contact fields are rejected from ordinary engagement
and reconsideration DTOs.

## Engagement Workspace composition

The final connected composition is:

```text
source authority rail
→ immutable accepted exact-version terms
→ participant-reported lifecycle
→ allowed action lanes and narrow consequence dialogs
→ engagement-only lifecycle timeline
→ stable isolated SecureContactExchange slot
```

Accepted terms support contract versions 1 and 2 through a normalized view.
The workspace displays the immutable application/material-gig version
ordinals and the accepted client payment, freelancer proposal, timeline,
availability, included/excluded work, assumptions, estimate-change factors,
and scope notes supplied by the safe DTO. It never implies mutable contract
editing, payment settlement, contractual enforcement, time tracking, or work
quality verification.

Historical selection winner and current gig winner are kept distinct. Failed
engagement recovery does not rewrite selection history, reuse the historical
winner as a reconsideration candidate, or present reopening as a new selection.

## Lifecycle, tokens, and idempotency

The exact lifecycle statuses are `confirmed`, `kickoff_pending`,
`in_progress`, `completion_pending`, `completed`, `cancellation_pending`, and
`cancelled`. The UI offers only backend-projected actions from the exact action
allowlist and explains each action's immediate consequence before submission.
There are no optimistic status transitions: a mutation must succeed and the
workspace must refetch before new authority is presented.

Every logical mutation gets a component-local browser UUID request ID. The
same logical transport retry reuses that ID; changed inputs or a deliberately
new operation get a fresh ID. Success and controlled 409 conflicts settle the
old operation. Route/aggregate changes clear the registry. A controlled 409
refetches authority, closes the stale dialog, and requires the participant to
review current state before choosing another action. Stale action tokens,
skipped lifecycle versions, and idempotency conflicts are never automatically
retried as new mutations.

Lifecycle action tokens and lifecycle versions remain separate from Stage 4
application actions, Stage 6 Q&A/revision actions, Stage 7 selection actions,
and Stage 8 reconsideration actions.

## Timeline boundary

The workspace renders only the existing participant-safe engagement lifecycle
timeline. Its event types are guarded by the backend's explicit allowlist:

```text
engagement_created
engagement_kickoff_prepared
engagement_work_started
engagement_completion_requested
engagement_completion_confirmed
engagement_completion_rejected
engagement_cancellation_requested
engagement_cancellation_withdrawn
engagement_cancellation_acknowledged
gig_reopened_after_engagement_cancellation
```

It does not merge application history, private shortlist events, Q&A,
selection request history, reconsideration history, contact activity, or
internal/audit events into the engagement timeline.

## Failed-engagement Gig Reopening

The cancelled-workspace recovery action is a dedicated, consequence-specific
dialog. It is offered only when `reopen_gig` and a valid reopening token are
projected by server authority. The UI states that the source engagement stays
cancelled, the gig is reopened once for controlled recovery, and application
intake stays closed.

This operation is deliberately distinct from Stage 3 intake reopening and
Stage 5 `Reopen Application`. The existing Manage Gigs architecture was
preserved; its Stage 8 integration links to Engagements and does not route
failed-engagement recovery through the Stage 3 lifecycle dialog.

## Reconsideration workflow

Reconsideration is a first-class sibling authority with the visible source
chain:

```text
cancelled engagement
→ failed-engagement Gig Reopening with intake closed
→ reconsideration invitation
```

The UI covers all invitation statuses: `pending`, `accepted`, `declined`,
`cancelled`, `superseded`, and `closed_by_gig_state`. Client create/cancel and
freelancer reaffirm/update/decline operations use narrow dialogs and their own
action tokens/request IDs. A pending invitation with no allowed action remains
visible as preserved authority instead of receiving a fabricated response
control.

Eligibility and blockers come only from the reconsideration context. The
cancelled engagement's historical winner remains excluded by server
authority. Reconsideration is not nested under Q&A, Selection, or applicant
review actions.

## Reconsideration edit-mode isolation

`mode=reconsideration` requires the exact pending invitation and a complete
canonical proposal. Its form presentation and submit path are separate from
ordinary edit, reapply, Stage 6 revision, and Stage 7 revised-selection terms.
Invalid or conflicting mode parameters fail closed; they do not silently fall
through to ordinary edit.

The reconsideration submission uses a stable request ID. A controlled conflict
refetches both application and invitation authority, preserves the mounted
draft, and requires explicit review plus a fresh logical operation. A
successful reaffirmation or complete updated proposal creates a fresh
immutable application version with origin `reconsideration` and returns the
application through backend authority; sending, cancelling, or declining an
invitation does not create an application version.

Successful engagement and reconsideration operations refresh their owning
route authority and the Stage 4–7 host surfaces where required. This uses
route-local callbacks/keys rather than a global workflow store or event bus,
so unrelated mounted drafts are not destroyed unnecessarily.

## Secure Contact Exchange and Stage 9 containment

`SecureContactExchange` was not redesigned or given Stage 8 workflow
responsibility. It remains mounted in a stable, visually separate workspace
slot with its own component-local ephemeral plaintext and security state.
Contact data is not lifted into engagement state, persisted, copied into lists
or accepted terms, or merged into the lifecycle timeline. Workspace authority
refreshes remount the isolated slot so revealed plaintext is cleared.

Contact blocking cannot hide or disable mandatory engagement lifecycle
actions. Stage 9 remains the sole owner of contact presentation/restyling and
will not require another Engagement Workspace architecture rewrite.

## React quality review

The React best-practices review found direct imports, route-local state,
bounded effects with cleanup/load sequencing, no new dependency, no global
store, no browser persistence, narrow dialogs/components, and no lifted
contact plaintext. Duplicate event protection and controlled-conflict dialog
closure were added during that review.

## Automated verification

Frontend:

```text
node --experimental-strip-types --test tests/engagements.test.mjs
17 tests passed

npm test
136 tests passed

npm run lint
PASS

npm run build
PASS — Vite 6.4.3, 189 modules transformed, no >500 kB warning
```

Unchanged backend authority/security regressions:

```text
./.venv/bin/python -m unittest tests.test_engagement_workspace -v
7 tests passed

./.venv/bin/python -m unittest \
  tests.test_selections \
  tests.test_marketplace_payments_selections \
  tests.test_marketplace_engagements -v
54 tests passed

./.venv/bin/python -m unittest tests.test_contact_exchange -v
13 tests passed
```

The backend runs emitted only the existing Starlette deprecation warning.

## Bundle impact

Stage 7 recorded 44 JavaScript chunks, 823,891 aggregate JavaScript bytes, a
469,623-byte primary JavaScript bundle, and 159,197 CSS bytes.

Stage 8 produces:

```text
JavaScript chunks:       44          (no change)
Aggregate JavaScript:    847,388 B   (+23,497 B)
Primary JavaScript:      469,842 B   (+219 B)
CSS:                     177,644 B   (+18,447 B)
```

Relevant lazy chunks:

```text
EngagementListPage        3,216 B
engagementView            11,083 B
EngagementWorkspacePage   25,679 B
EditApplicationPage       15,617 B
ApplicationDetailPage     13,753 B
ClientApplicantDetailPage 23,317 B
StructuredQaPanel         62,375 B
```

The Stage 8 workspace and edit integrations remain lazy; the primary bundle
growth is 219 bytes and no chunk-count regression occurred.

## Browser evidence and honest limitations

Local Vite/FastAPI servers used the repository's existing environment and were
stopped after verification. No database record was created or mutated. Backend
logs contained only `GET` and `OPTIONS` requests.

The retained authenticated `clientA` session exposed the legitimate fixture:

```text
owned gig: Web dev
application: freelancerA / Application v2 / Under Review
engagement register: empty
selection request: not sent
reconsideration invitation: absent
failed-engagement reopening authority: absent
```

Verified real-state behavior:

- `/engagements` showed `No engagements yet` and did not fabricate a workspace.
- The current client applicant record preserved the Stage 7 selection boundary
  and showed no selection action because the application is not Advanced.
- The separate Stage 8 Reconsideration region showed no invitation and only the
  authoritative blockers: the gig has not been reopened through
  failed-engagement Gig Reopening, and only a previous Not Selected or
  Withdrawn application is eligible.
- Manage Gigs retained the owned record and Engagements destination, while no
  failed-engagement reopening control was rendered without a cancelled
  engagement.
- At 1440, 1024, 768, and 390 pixels, the engagement register, applicant route,
  and reconsideration boundary remained inside the viewport; document
  horizontal overflow was false at every width.
- The 390-pixel visual inspection confirmed readable stacked applicant,
  Selection, and Reconsideration regions with distinct borders and no critical
  clipping.
- Browser console warnings/errors were empty and no Vite overlay appeared.

Browser status is **PARTIAL / NOT RUN** for a populated Engagement Workspace,
all lifecycle mutations/dialog outcomes, lifecycle timeline records, isolated
contact exchange inside a real engagement, cancellation, failed-engagement Gig
Reopening, all reconsideration invitation statuses and responses, and accepted
reconsideration with a fresh application version. No legitimate fixture exposed
those states, and none was manufactured. Their invariants are covered by the
focused frontend tests plus the unchanged Milestone 7H backend/concurrency and
contact security regressions; missing browser evidence is not promoted to PASS.

## Known boundaries

- Engagement status remains participant-reported workflow state, not proof of
  delivery, acceptance quality, payment, or contractual settlement.
- The engagement list DTO has authoritative statuses but no separate
  active/historical flag; terminal grouping is therefore limited to the exact
  `completed` and `cancelled` statuses.
- Reconsideration context exposes the current pending invitation, not a general
  invitation-history feed. Terminal invitation copy is supported when a DTO is
  present, but the frontend does not invent missing history authority.
- Contact presentation remains intentionally deferred to Stage 9.

User approval: APPROVED
