# Switchboard Frontend Migration — Stage 4 Closure

Status: implementation complete; browser verified; user approved.

User approval: APPROVED

## Scope closed

Stage 4 migrates only the freelancer application record routes:

- `/applications`
- `/applications/:applicationId`
- `/applications/:applicationId/edit`

The implementation preserves the completed Stage 1–3 Switchboard shell and the
existing 7D backend authority. No backend, database schema, migration,
deployment, commit, push, reset, or restore was performed. The user explicitly
authorized the minimum hosted marketplace records required for browser proof;
those records are listed in the browser-verification section.

The Stage 3 closure was marked `APPROVED` before Stage 4 implementation began;
its recorded limitations were preserved.

## Preflight

- Branch: `main`
- Starting HEAD: `af46d6c413a92eb480acddf7ae91a973271784b2`
- The worktree already contained the uncommitted Stage 1–3 migration and
  unrelated user-owned files listed by `git status --short`.
- Existing changes were preserved in place. No stash, reset, restore, checkout,
  or cleanup was used.
- The verified 7D routes, strict request contracts, safe DTOs, immutable-version
  origins, allowed actions, blockers, ownership checks, and controlled error
  codes were sufficient. No DTO or backend extension was required.

## Architecture and authority

The frontend remains a renderer and command issuer for server-authorized 7D
operations. It does not derive stage transitions, edit eligibility, withdrawal
eligibility, material-change compatibility, reapplication eligibility, version
ordinals, selection invalidation, closure, or time authority.

The application list is now a connected operational register. Each lane renders
only the safe list DTO: current stage, gig/client source, submission/update time,
current application-version ordinal, response requirement, later-stage attention,
allowed-action count, and server blockers. Loading, empty, error, and ready states
remain explicit.

Application Detail is one connected record with:

- safe gig/client context and current stage;
- a narrow `ApplicationVersionReference` that keeps application ordinal,
  proposal-contract version, answered gig-history ordinal, and current material
  gig ordinal distinct;
- complete readable canonical proposal snapshots without raw JSON;
- exact changed-term comparison and backend-compatible reaffirm/update controls;
- current allowed actions and blockers;
- structured closure/withdrawal outcome;
- newest-first immutable history with every backend origin accepted and unknown
  future origin strings rendered honestly;
- explicit layout-only containment for the existing structured Q&A,
  `SelectionPanel`, and `ReconsiderationPanel` integrations.

Stage 3's `GigVersionReference` was not generalized. Gig display/material/terms
contract semantics do not align with application proposal-history/binding
semantics closely enough to justify a shared abstraction.

## Edit, changed terms, and stale authority

Ordinary edit, changed-gig update, and 7D material-change reapplication use a
narrow `switchboard-record` `ApplicationForm` presentation. Stage 2 submission
continues to use `switchboard-submission`. Stage 6 proposal revision and Stage 8
reconsideration continue to use the legacy form presentation and their existing
APIs.

All Stage 4 saves still submit the complete existing canonical application
snapshot to the existing endpoints. No form field construction or validation
contract was replaced.

Material-change reapplication is explicitly described and routed as a new
version in the same withdrawn application history. It is not routed through
reconsideration, client review, or engagement reopening.

Controlled application/gig conflicts stop the operation, refresh the
authoritative application context, keep the mounted form draft, and require an
explicit review acknowledgement before another attempt. The form has no
version-key remount and no silent retry.

## Withdrawal

The Stage 4 browser `window.confirm` path was removed. Withdrawal now uses an
application-specific native dialog with:

- the exact structured 7D reason vocabulary;
- required explanation for `other`;
- an explicit same-history consequence;
- an acknowledgement checkbox;
- Escape handling, native modal focus behavior, and trigger-focus return;
- responsive full-width actions on the mobile breakpoint.

The dialog does not claim deletion and does not expose a withdrawal control when
the backend omits it, including when an effective selection request blocks it.

## Routing, containment, security, and privacy

`participantStageFourOwnsPath` accepts only the list, detail, and canonical edit
shapes. Near collisions, extra path segments, Stage 2 application submission,
client applicant review, engagements, profiles, parsers, auth/public routes, and
admin routes remain outside Stage 4 ownership.

Application pages remain route-level `lazy()` imports wrapped by the existing
`LazyPageBoundary` and freelancer-only `ProtectedRoute`.

No raw application/gig version IDs, version tokens, auth metadata, shortlist
state, review notes, other applicants, parser rows, resume text, embeddings,
semantic inputs, database snapshots, or credentials are rendered or persisted.
No Stage 4 application context or token is written to browser-global storage.

## Automated verification

Final commands:

```text
cd frontend
npm test       PASS (87/87)
npm run lint   PASS (0 errors, 0 warnings)
npm run build  PASS

cd ..
git diff --check   PASS
git status --short INSPECTED; pre-existing dirty worktree preserved
```

The application suite added focused coverage for list states, current stage,
response requirements, version vocabulary, all current/later origins, immutable
history, edit/reaffirm/update/reapply/withdraw endpoint composition, selection
blockers, stale draft preservation, native dialog behavior, Stage 6–8 child
containment, Stage 2 form regression, exact route ownership, lazy/protected
routes, and absence of raw-token/global persistence.

The only test-run notice is Node's existing experimental type-stripping warning.
Git also continued to print the pre-existing fsmonitor IPC warning while returning
successful status/diff-check results. Vite emitted no chunk-size warning.

## Bundle impact

Stage 3 baseline:

- 42 JavaScript chunks
- 764,490 bytes total JavaScript
- 468,999-byte main JavaScript chunk
- 81,421 bytes CSS

Stage 4 build:

- 44 JavaScript chunks
- 784,216 bytes total JavaScript (`+19,726`)
- 469,327-byte main JavaScript chunk (`+328`)
- 102,867 bytes CSS (`+21,446`)

The two additional chunks preserve route/component splitting. All three
application pages remain lazy.

## Browser verification

The local frontend and FastAPI servers were started only for verification and
were stopped afterward. The in-app browser tab was closed and its temporary
viewport override reset.

Completed evidence:

- supplied freelancer credentials authenticated successfully;
- the initial `freelancer_profile_required` response rendered a stable error,
  after which the missing freelancer marketplace profile was created through
  the normal profile UI under the user's explicit authorization;
- the existing supported active gig was discovered and its complete material-v2
  terms and Apply action were verified;
- one application was submitted through the canonical Stage 2 form, creating
  application `f6b3d695-27dc-4fab-b472-6c34e9f6c5a1` at immutable v1;
- the Stage 4 detail rendered the exact answered/current material gig v2 binding,
  complete canonical snapshot, `under_review` stage, edit/withdraw authority,
  history, and contained Q&A/selection/reconsideration panels;
- ordinary editing created immutable application v2 with origin
  `freelancer_edit`; v1 remained readable and history rendered newest first;
- the application register rendered one authoritative lane with Application v2,
  under-review stage, and two authorized actions;
- the structured withdrawal dialog exposed the exact reason vocabulary,
  same-history consequence, acknowledgement-gated submit, Escape dismissal,
  and no mutation was confirmed;
- native date/datetime controls were verified with programmatic/assistive-style
  input; the browser-discovered React state synchronization issue was corrected
  by retaining `onChange` and adding narrow `onInput` handling, then covered by
  source regressions;
- populated register and detail checks at 1440×900, 1024×768, 768×900, and
  390×844 all reported document width equal to viewport width with no horizontal
  overflow and retained the v2 record actions/history;
- browser console warnings/errors: none.

The browser tab was finalized and its temporary viewport override reset. No
withdrawal, gig lifecycle, destructive, or concurrency mutation was performed.
Changed-gig reaffirm/update/reapply behavior remains covered by focused endpoint,
authority, conflict-preservation, and same-history regression tests rather than
manufacturing additional hosted material changes and withdrawals.

## Stage 4 files

Created:

- `frontend/src/components/ApplicationProposalSnapshot.tsx`
- `frontend/src/components/ApplicationVersionReference.tsx`
- `frontend/src/components/ApplicationWithdrawalDialog.tsx`
- `docs/frontend/verification/switchboard-stage-04-closure.md`

Updated for Stage 4:

- `frontend/src/components/ApplicationForm.tsx`
- `frontend/src/components/ParticipantShell.tsx`
- `frontend/src/lib/applicationView.ts`
- `frontend/src/lib/participantNavigation.ts`
- `frontend/src/pages/MyApplicationsPage.tsx`
- `frontend/src/pages/ApplicationDetailPage.tsx`
- `frontend/src/pages/EditApplicationPage.tsx`
- `frontend/src/styles.css`
- `frontend/tests/applications.test.mjs`
- `docs/frontend/verification/switchboard-stage-03-closure.md`

## Limitations carried forward

- Q&A/revision, selection, and reconsideration are deliberately contained rather
  than redesigned; their presentation belongs to Stages 6–8.
- No selection-invalidation detail is invented beyond the sanitized allowed
  actions/blockers and existing contained selection DTO.
- Changed-gig reaffirm/update/reapply and destructive withdrawal remain covered
  by the passing automated contract suite rather than additional hosted-state
  mutation.

User approval: APPROVED
