# Switchboard Frontend Migration — Stage 5 Closure

Status: implementation complete; automated verification complete; browser verification partial.

User approval: APPROVED

## Scope completed

Stage 5 migrates only the client applicant-review routes:

- `/gigs/:gigId/applicants`
- `/gigs/:gigId/applicants/:applicationId`

The implementation preserves the complete Stage 1–4 Switchboard migration and
the current 7E backend authority. No backend, database, migration, deployment,
commit, push, reset, restore, stash, cleanup, branch switch, or hosted mutation
was performed.

Stage 4 was confirmed closed with `User approval: APPROVED` before Stage 5
editing began. Its browser evidence was preserved exactly and its closure file
was not modified.

## Preflight and worktree preservation

- Starting branch: `main`
- Starting HEAD: `af46d6c413a92eb480acddf7ae91a973271784b2`
- Ending branch: `main`
- Ending HEAD: `af46d6c413a92eb480acddf7ae91a973271784b2`
- The worktree already contained the uncommitted Stage 1–4 migration and other
  user-owned files. Every pre-existing change was preserved in place.
- Git continued to emit the pre-existing fsmonitor IPC warning while returning
  successful diff/status results.

Starting `git status --short`:

```text
 M frontend/package-lock.json
 M frontend/package.json
 M frontend/src/components/AppLayout.tsx
 M frontend/src/components/ApplicationForm.tsx
 M frontend/src/components/Button.tsx
 M frontend/src/components/DashboardAttentionList.tsx
 M frontend/src/components/DashboardPageShell.tsx
 M frontend/src/components/DashboardSection.tsx
 M frontend/src/components/DashboardStatePanel.tsx
 M frontend/src/components/DashboardSummaryCard.tsx
 M frontend/src/components/GigForm.tsx
 M frontend/src/components/Navbar.tsx
 M frontend/src/components/WorkflowStatusBadge.tsx
 M frontend/src/lib/applicationView.ts
 M frontend/src/lib/dashboardView.ts
 M frontend/src/lib/gigManagement.ts
 M frontend/src/lib/gigManagementView.ts
 M frontend/src/lib/marketplaceContracts.ts
 M frontend/src/main.tsx
 M frontend/src/pages/ApplicationDetailPage.tsx
 M frontend/src/pages/ApplyToGigPage.tsx
 M frontend/src/pages/ClientDashboardPage.tsx
 M frontend/src/pages/EditApplicationPage.tsx
 M frontend/src/pages/EditGigPage.tsx
 M frontend/src/pages/FreelancerDashboardPage.tsx
 M frontend/src/pages/GigDetailPage.tsx
 M frontend/src/pages/GigDiscoveryPage.tsx
 M frontend/src/pages/ManageGigsPage.tsx
 M frontend/src/pages/MyApplicationsPage.tsx
 M frontend/src/pages/NewGigPage.tsx
 M frontend/src/styles.css
 M frontend/tests/applications.test.mjs
 M frontend/tests/dashboard.test.mjs
 M frontend/tests/gigManagement.test.mjs
 M frontend/tests/marketplace.test.mjs
 M supabase/migrations/20260714225130_baseline_m0_m3.sql
?? .mcp.json
?? GigMatch_AI_Presentation_Guide.docx
?? concepts-gpt-forge/
?? concepts-gpt/
?? concepts/
?? docs/frontend/verification/
?? frontend/src/components/ApplicationProposalSnapshot.tsx
?? frontend/src/components/ApplicationVersionReference.tsx
?? frontend/src/components/ApplicationWithdrawalDialog.tsx
?? frontend/src/components/GigEditPreviewDialog.tsx
?? frontend/src/components/GigLifecycleDialog.tsx
?? frontend/src/components/GigRouteContextRail.tsx
?? frontend/src/components/GigVersionReference.tsx
?? frontend/src/components/ParticipantCommandSurface.tsx
?? frontend/src/components/ParticipantShell.tsx
?? frontend/src/lib/gigManagementContract.ts
?? frontend/src/lib/participantNavigation.ts
?? supabase/migrations/20260629210113_auth_profiles.sql
?? supabase/migrations/20260629210154_auth_profile_function_search_paths.sql
```

Ending `git status --short` is the same preserved worktree plus the Stage 5
tracked modifications listed below and the two new Stage 5 components. Because
the complete `docs/frontend/verification/` directory remains untracked as one
Git status entry, this closure does not create a separate status line:

```text
 M frontend/package-lock.json
 M frontend/package.json
 M frontend/src/components/AppLayout.tsx
 M frontend/src/components/ApplicationForm.tsx
 M frontend/src/components/Button.tsx
 M frontend/src/components/DashboardAttentionList.tsx
 M frontend/src/components/DashboardPageShell.tsx
 M frontend/src/components/DashboardSection.tsx
 M frontend/src/components/DashboardStatePanel.tsx
 M frontend/src/components/DashboardSummaryCard.tsx
 M frontend/src/components/GigForm.tsx
 M frontend/src/components/Navbar.tsx
 M frontend/src/components/WorkflowStatusBadge.tsx
 M frontend/src/lib/applicantReviewView.ts
 M frontend/src/lib/applicationView.ts
 M frontend/src/lib/dashboardView.ts
 M frontend/src/lib/gigManagement.ts
 M frontend/src/lib/gigManagementView.ts
 M frontend/src/lib/marketplaceContracts.ts
 M frontend/src/main.tsx
 M frontend/src/pages/ApplicantInboxPage.tsx
 M frontend/src/pages/ApplicationDetailPage.tsx
 M frontend/src/pages/ApplyToGigPage.tsx
 M frontend/src/pages/ClientApplicantDetailPage.tsx
 M frontend/src/pages/ClientDashboardPage.tsx
 M frontend/src/pages/EditApplicationPage.tsx
 M frontend/src/pages/EditGigPage.tsx
 M frontend/src/pages/FreelancerDashboardPage.tsx
 M frontend/src/pages/GigDetailPage.tsx
 M frontend/src/pages/GigDiscoveryPage.tsx
 M frontend/src/pages/ManageGigsPage.tsx
 M frontend/src/pages/MyApplicationsPage.tsx
 M frontend/src/pages/NewGigPage.tsx
 M frontend/src/styles.css
 M frontend/tests/applicantReview.test.mjs
 M frontend/tests/applications.test.mjs
 M frontend/tests/dashboard.test.mjs
 M frontend/tests/gigManagement.test.mjs
 M frontend/tests/marketplace.test.mjs
 M supabase/migrations/20260714225130_baseline_m0_m3.sql
?? .mcp.json
?? GigMatch_AI_Presentation_Guide.docx
?? concepts-gpt-forge/
?? concepts-gpt/
?? concepts/
?? docs/frontend/verification/
?? frontend/src/components/ApplicantReviewContextRail.tsx
?? frontend/src/components/ApplicantReviewDialog.tsx
?? frontend/src/components/ApplicationProposalSnapshot.tsx
?? frontend/src/components/ApplicationVersionReference.tsx
?? frontend/src/components/ApplicationWithdrawalDialog.tsx
?? frontend/src/components/GigEditPreviewDialog.tsx
?? frontend/src/components/GigLifecycleDialog.tsx
?? frontend/src/components/GigRouteContextRail.tsx
?? frontend/src/components/GigVersionReference.tsx
?? frontend/src/components/ParticipantCommandSurface.tsx
?? frontend/src/components/ParticipantShell.tsx
?? frontend/src/lib/gigManagementContract.ts
?? frontend/src/lib/participantNavigation.ts
?? supabase/migrations/20260629210113_auth_profiles.sql
?? supabase/migrations/20260629210154_auth_profile_function_search_paths.sql
```

## Applicant-pool, ranking, and filter decisions

The inbox is now a connected Switchboard review register rather than a profile
card grid. It maps every DTO item directly and sends the authoritative `status`,
`view`, and pagination parameters to FastAPI. It does not locally sort, rank,
or filter the returned page.

The existing server vocabulary remains unchanged:

- Best Match;
- Newest;
- Internal Shortlist;
- Advanced;
- active review;
- Not Selected;
- withdrawn;
- closed history;
- all records.

Focused Internal Shortlist and Advanced empty states explicitly say that the
complete active applicant pool is unchanged. They do not imply that applicants
disappeared merely because the focused view is empty.

Suitability presentation retains nullable scores. `matching_input_unavailable`
renders as “Suitability unavailable” plus a complete-pool explanation; it is
never converted to zero. Provider fallback is announced for the entire
rankable subset as keyword-only, and semantic/hybrid evidence is rendered only
when the DTO says the ranking mode is `hybrid`.

Proposal price is presented only inside the separate commercial domain. It is
not read by the suitability view helpers, used for Best Match ordering, or
combined into a value score.

## Private shortlist and decision authority

Private Internal Shortlist organization is visually and semantically separate
from applicant-visible application stage. The UI does not invent a
Under Review → Shortlisted → Advanced lifecycle.

Shortlist mutations receive only the route-local DTO's
`shortlist_action_token`; applicant-stage mutations receive only the distinct
`review_decision_action_token`. Neither token is displayed, logged, placed in
shell/global context, or persisted in cookies, URL, local storage, or session
storage.

Every successful shortlist or stage mutation now refetches authoritative detail
and version state. Controlled stale, capacity, selection-blocked, and no-longer-
allowed outcomes refetch current state without silently retrying. The mounted
decision dialog preserves its structured inputs and disables confirmation if
the refreshed response no longer authorizes the action.

Terminal shortlist cleanup remains backend authority. React never issues a
second shortlist mutation after Not Selected or another terminal transition.

## Review-dialog and Reopen Application decisions

Stage 5 browser overlays were replaced by one narrow applicant-review-specific
native dialog component. It is not a universal workflow framework.

The dialog provides:

- native modal focus containment;
- Escape dismissal while no submission is in progress;
- trigger-focus restoration;
- mobile-fit actions and fields;
- the exact current client-selectable Not Selected reasons, excluding the
  system-reserved `another_applicant_selected` reason;
- optional respectful-note semantics for Under Review;
- mandatory meaningful feedback and explicit final confirmation for Advanced;
- honest structural-validation copy with no AI-moderation claim;
- controlled input preservation after conflict/capacity refresh.

Reopen Application uses the existing 7E endpoint and current reconsideration-
style reason vocabulary. Its copy explicitly distinguishes the operation from a
7H reconsideration invitation and failed-engagement Gig Reopening. It preserves
the historical Not Selected event and does not restore shortlist state.

## Proposal/version reuse and history boundaries

The client detail safely reuses Stage 4's role-neutral sanitized
`ApplicationProposalSnapshot` and `ApplicationVersionReference` for identical
canonical application snapshot and ordinal semantics. It does not reuse
freelancer-only action or route context.

Current presentation keeps three domains visibly separate:

1. current suitability, targeting the current material gig and current
   supported matching input;
2. current commercial proposal, targeting the current immutable application
   version and exact gig version answered;
3. client review decision authority.

Answered and current material gig terms are rendered as readable sanitized
facts without raw JSON. Immutable application history is paginated, newest
first, uses the existing current-origin labels, and deliberately contains no
current suitability score.

Participant-visible review history renders only the existing sanitized event
projection. Client-private shortlist activity and action tokens are absent.

## Stage 6–8 containment

The current `StructuredQaPanel`, `SelectionPanel`, and `ReconsiderationPanel`
remain mounted and functional on Client Applicant Detail. Each is wrapped only
in an overflow-safe visual containment region and continues to own its own
data, permissions, timers, tokens, and mutations.

Stage 5 did not redesign Q&A, proposal revision, selection request/history,
selection expiry, reconsideration invitations, failed-engagement reopening, or
engagement lifecycle. Advance is not labeled Selected, and effective selection
blockers are rendered from the 7E review DTO.

## Route classification and privacy

`participantStageFiveOwnsPath` accepts only the canonical list and detail
shapes and rejects malformed/trailing/extra applicant segments plus gig list,
new, manage, detail, apply, edit, parse, freelancer application, engagement,
profile, public, authentication, and admin collisions.

Both applicant pages remain route-level `lazy()` imports wrapped by the current
`LazyPageBoundary` and client-only `ProtectedRoute`. Stage 5 now receives the
native participant canvas instead of legacy containment. Route-local context
contains only safe gig/applicant name, current stage/ordinal, private shortlist
label, and return destination; parameter changes suppress stale prior-record
rendering.

The Stage 4 freelancer sources remain free of client shortlist state and review
decision tokens. No shared shell/global context or persistence was introduced.

## Automated verification

Final commands:

```text
cd frontend
node --experimental-strip-types --test tests/applicantReview.test.mjs
  PASS (17/17)
npm test
  PASS (98/98)
npm run lint
  PASS (0 errors, 0 warnings)
npm run build
  PASS

cd ../backend
./.venv/bin/python -m unittest tests.test_applicant_review
  PASS (15/15)

cd ..
git diff --check
  PASS
git status --short
  INSPECTED; pre-existing dirty worktree preserved
```

Focused frontend coverage includes collection states, all supported filters and
views, complete-pool mapping, unavailable-not-zero behavior, fallback honesty,
hybrid evidence gating, price/ranking separation, separate token domains,
shortlist capacity/stale messages, advance/return/selection blockers, both Not
Selected requirement levels, dialog accessibility, conflict draft preservation,
Reopen Application boundaries, participant/private history separation, exact
version evidence, later-panel containment, Stage 4 privacy, exact routing, lazy
client protection, and no persistence.

The unchanged focused backend suite provides repository-independent evidence
for authentication, client role, owned/missing/mismatched not-found behavior,
complete-pool ranking, fallback, price independence, request-contract strictness,
action tokens, and write-error mapping.

Warnings are limited to Node's existing experimental type-stripping notice,
the focused backend suite's existing Starlette/Python deprecation notice, and
Git's pre-existing fsmonitor IPC warning.

## Bundle impact

Stage 4 baseline:

- 44 JavaScript chunks;
- 784,216 total JavaScript bytes;
- 469,327-byte main JavaScript chunk;
- 102,867 bytes CSS.

Stage 5 build:

- 44 JavaScript chunks (no change);
- 796,887 total JavaScript bytes (`+12,671`);
- 469,619-byte main JavaScript chunk (`+292`);
- 127,901 bytes CSS (`+25,034`);
- Applicant Inbox lazy chunk: 10,108 bytes;
- Client Applicant Detail lazy chunk: 22,772 bytes.

The main-chunk delta is small, both owned routes remain lazy, Q&A remains in a
separate 43,630-byte chunk, and Vite emitted no greater-than-500 kB warning.
The CSS delta is scoped Stage 5 register/detail/dialog responsive presentation.

## Authenticated browser verification

The configured frontend targets hosted Supabase and a local FastAPI origin, so
the existing records were treated as non-disposable. Local Vite and FastAPI
servers were started only for verification and stopped afterward. The in-app
browser reused the legitimate retained `clientA` session and the Stage 4
marketplace fixture rather than creating records.

Read-only evidence completed:

- the correct client opened owned gig
  `ed54caea-3c25-411f-9698-2900357ff4a9`;
- the inbox rendered one complete real application,
  `f6b3d695-27dc-4fab-b472-6c34e9f6c5a1`, in Under Review;
- Best Match rendered the applicant with an honest 90% keyword-only result and
  the provider-level `embedding_provider_not_configured` fallback notice;
- Newest remained authoritative and rendered the same one real record;
- Internal Shortlist returned an honest focused empty state while explicitly
  preserving the complete active pool;
- proposal amount remained in the commercial lane and separate from
  suitability/private organization;
- detail rendered Application v2, answered/current material Gig v2, the complete
  canonical proposal, current keyword evidence and skill gaps, separate private
  shortlist/stage controls, participant history, and two immutable versions;
- the live Q&A, selection, and reconsideration panels loaded successfully inside
  their Stage 6–8 containment regions;
- the Under Review Not Selected dialog exposed only current client-selectable
  reasons, optional note semantics, stage consequence, and structural-validation
  language; it was opened and dismissed without confirming;
- at 390×844 the dialog measured 354×722 inside the viewport, Escape closed it,
  and focus returned to the `Mark Not Selected` trigger;
- browser console warnings/errors: none;
- Vite overlay: absent.

Backend request logs contain only `GET` and `OPTIONS` requests for this browser
run. No shortlist, advance, return, Not Selected, Reopen Application, Q&A,
selection, or reconsideration mutation was submitted.

## Representative-width and accessibility evidence

Populated inbox and detail were inspected at 1440×900, 1024×768, 768×900, and
390×844. At every width:

- `document.documentElement.scrollWidth` equaled `clientWidth`;
- all nine status/view controls remained present;
- the applicant register remained readable;
- suitability and commercial regions remained separate and present;
- private organization and client decision regions remained distinct;
- all three later-stage panels remained contained;
- no Vite overlay appeared.

Visual inspection confirmed the Switchboard Bone/Ocean/Glass/Coral/Ink palette,
editorial heading hierarchy, hard connected borders, offset shadows, dense lane
composition, explicit focus, text-backed ranking status, and deliberate mobile
stacking. Semantic headings, labelled filter groups, native form labels, minimum
control heights, non-hover information, native dialog keyboard behavior, and
reduced-motion CSS are present.

The temporary viewport override was reset and the browser tab finalized after
verification.

## Cross-role status and limitations

Browser status is **partial** for cross-role proof. The correct owned client was
verified. No legitimate second-client or freelancer session was available in
the in-app browser, so cross-client denial, freelancer denial of client review
routes, and a live freelancer Stage 4 shortlist-absence check were not claimed.
Those boundaries remain covered by the unchanged FastAPI ownership/role suite,
client-only protected routes, strict frontend privacy regressions, and the
existing verified 7E/7K authority.

The hosted fixture is Under Review and not shortlisted. Therefore the following
were not mutated or fabricated in browser:

- shortlist add/remove and capacity competition;
- Advance and Return to Review;
- effective-selection blocking;
- Advanced Not Selected final confirmation;
- Reopen Application;
- stale/capacity races.

Their current endpoints, tokens, DTO actions/blockers, refetch behavior,
structured contracts, and conflict paths remain covered by the focused frontend,
backend, database, and verified 7E concurrency evidence. No fake ranking or
unreachable fixture was created.

## Exact Stage 5 files changed

Created:

- `frontend/src/components/ApplicantReviewContextRail.tsx`
- `frontend/src/components/ApplicantReviewDialog.tsx`
- `docs/frontend/verification/switchboard-stage-05-closure.md`

Updated:

- `frontend/src/components/ParticipantShell.tsx`
- `frontend/src/lib/applicantReviewView.ts`
- `frontend/src/lib/participantNavigation.ts`
- `frontend/src/pages/ApplicantInboxPage.tsx`
- `frontend/src/pages/ClientApplicantDetailPage.tsx`
- `frontend/src/styles.css`
- `frontend/tests/applicantReview.test.mjs`

## Deviations and backend/database status

No deviation from the locked Stage 5 architecture was required. Browser
mutation and second-account proof are explicitly partial because the configured
records are hosted/non-disposable and only one legitimate client session was
available.

Backend/database change status: **none**. Current DTOs and APIs were sufficient
for a truthful Switchboard presentation.

No Stage 6–9 presentation was pulled forward.

User approval: APPROVED
