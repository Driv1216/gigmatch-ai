# Switchboard Frontend Migration — Stage 9 Closure

Date: 2026-08-09

Scope: Milestone 7I frontend presentation migration only — Secure Contact
Exchange inside the stable Stage 8 Engagement Workspace slot.

## Status

- Stage 9 implementation: **COMPLETE**.
- Required automated verification: **PASS**.
- Legitimate-state browser verification: **PASS for the existing empty state**.
- Populated contact interaction browser verification: **PARTIAL / NOT RUN**.
- Backend changes: **NONE**.
- Database changes: **NONE**.
- Deployment, hosted migration, reset, seed, or hosted mutation: **NONE**.

## Stage 8 approval update

The user explicitly approved Stage 8 in the Stage 9 request. The remaining
literal `User approval: PENDING` reference in
`docs/frontend/verification/switchboard-stage-08-closure.md` was updated to
`User approval: APPROVED`. The closure already ended with
`User approval: APPROVED`. Existing `PARTIAL / NOT RUN` evidence was not
changed or promoted.

## Starting and ending Git state

Starting state:

```text
branch: main
HEAD: af46d6c413a92eb480acddf7ae91a973271784b2
worktree: intentionally dirty with the cumulative approved Stage 1–8 work
          and unrelated user-owned files
```

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
 M frontend/src/components/ReconsiderationPanel.tsx
 M frontend/src/components/SelectionPanel.tsx
 M frontend/src/components/StructuredQaPanel.tsx
 M frontend/src/components/WorkflowStatusBadge.tsx
 M frontend/src/lib/applicantReviewView.ts
 M frontend/src/lib/applicationView.ts
 M frontend/src/lib/dashboardView.ts
 M frontend/src/lib/engagementContracts.ts
 M frontend/src/lib/engagements.ts
 M frontend/src/lib/gigManagement.ts
 M frontend/src/lib/gigManagementView.ts
 M frontend/src/lib/marketplaceContracts.ts
 M frontend/src/lib/qaContracts.ts
 M frontend/src/lib/qaView.ts
 M frontend/src/lib/selection.ts
 M frontend/src/lib/selectionContracts.ts
 M frontend/src/main.tsx
 M frontend/src/pages/ApplicantInboxPage.tsx
 M frontend/src/pages/ApplicationDetailPage.tsx
 M frontend/src/pages/ApplyToGigPage.tsx
 M frontend/src/pages/ClientApplicantDetailPage.tsx
 M frontend/src/pages/ClientDashboardPage.tsx
 M frontend/src/pages/EditApplicationPage.tsx
 M frontend/src/pages/EditGigPage.tsx
 M frontend/src/pages/EngagementListPage.tsx
 M frontend/src/pages/EngagementWorkspacePage.tsx
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
 M frontend/tests/engagements.test.mjs
 M frontend/tests/gigManagement.test.mjs
 M frontend/tests/marketplace.test.mjs
 M frontend/tests/qa.test.mjs
 M frontend/tests/selection.test.mjs
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
?? frontend/src/components/EngagementActionDialog.tsx
?? frontend/src/components/GigEditPreviewDialog.tsx
?? frontend/src/components/GigLifecycleDialog.tsx
?? frontend/src/components/GigRouteContextRail.tsx
?? frontend/src/components/GigVersionReference.tsx
?? frontend/src/components/ParticipantCommandSurface.tsx
?? frontend/src/components/ParticipantShell.tsx
?? frontend/src/components/ReconsiderationActionDialog.tsx
?? frontend/src/lib/applicationEditMode.ts
?? frontend/src/lib/engagementView.ts
?? frontend/src/lib/gigManagementContract.ts
?? frontend/src/lib/participantNavigation.ts
?? frontend/src/lib/selectionView.ts
?? supabase/migrations/20260629210113_auth_profiles.sql
?? supabase/migrations/20260629210154_auth_profile_function_search_paths.sql
```

Ending state:

```text
branch: main
HEAD: af46d6c413a92eb480acddf7ae91a973271784b2
worktree: remains intentionally dirty; all prior and unrelated changes preserved
```

Ending `git status --short` retained every starting entry and added only these
tracked Stage 9 modifications (the already-untracked
`docs/frontend/verification/` directory continues to contain both closure
updates):

```text
 M frontend/src/components/SecureContactExchange.tsx
 M frontend/src/lib/contactExchange.ts
 M frontend/src/lib/contactExchangeContracts.ts
 M frontend/src/lib/contactExchangeView.ts
 M frontend/tests/contactExchange.test.mjs
```

`frontend/src/styles.css` was already modified in the starting cumulative
migration and now also contains the scoped Stage 9 rules. All other starting
status entries remain unchanged. `git -c core.fsmonitor=false diff --check`
passed with no output.

No reset, restore, stash, clean, branch switch, discard, commit, push,
deployment, database reset, seed, hosted migration, or hosted verification
mutation was used.

## Exact Stage 9 files changed

Stage 8 approval record:

```text
docs/frontend/verification/switchboard-stage-08-closure.md
```

Stage 9 implementation:

```text
frontend/src/components/SecureContactExchange.tsx
frontend/src/lib/contactExchange.ts
frontend/src/lib/contactExchangeContracts.ts
frontend/src/lib/contactExchangeView.ts
frontend/src/styles.css
```

Stage 9 regression coverage:

```text
frontend/tests/contactExchange.test.mjs
```

Closure evidence:

```text
docs/frontend/verification/switchboard-stage-09-closure.md
```

`EngagementWorkspacePage.tsx` was read but not edited. Its approved stable
contact slot and authority-refresh remount key remain unchanged. No package,
backend, migration, or database test file was changed for Stage 9.

## Live WhatsApp identifier resolution

The naming discrepancy is historical prose drift, not a live contract
contradiction.

The locked Switchboard plan, TypeScript `ContactMethod`, frontend API payload,
FastAPI/Pydantic `ContactMethod`, database migration, and backend tests all use:

```text
whatsapp_phone
```

The older Milestone 7I closure prose lists `whatsapp`. There is no adapter
mapping `whatsapp` to `whatsapp_phone`, and the browser does not send the older
name. Stage 9 therefore preserves `whatsapp_phone` as the live canonical
identifier. Backend and database authority required no change.

## Direction, method, and source presentation

The contact region now presents two independent directional boards:

```text
You share
Shared with you
```

Each board renders server records by method. Five distinct method rows remain:

```text
verified_email
verified_phone
whatsapp_phone
meeting_link
professional_profile
```

Sharing one row never changes or implies consent for another. Incoming and
outgoing histories remain separate, and runtime guards reject shares filed in
the wrong direction or duplicate share IDs across the two directions.

Verified email and phone are labelled as confirmed Supabase Auth sources. The
browser sends only method, opaque action token, and request ID for those
methods; it sends no email, phone, mask, verification flag, or digest.

WhatsApp retains the exact two-authority language:

```text
Phone ownership · Verified
WhatsApp availability · Self-declared
```

WhatsApp itself is never labelled verified. Meeting/profile URLs are labelled
participant-provided and not verified by GigMatch.

## Consent, source state, masks, and history

`consent_status` and `source_status` render as separate operational fields.
The presentation distinguishes:

- active consent plus current source;
- active historical consent plus invalidated source;
- revoked consent with its preserved source evidence.

Masks render directly from `share.masked_value`; no browser mask generator or
plaintext-derived reconstruction exists. Historical timestamps, previous-share
linkage, revoked state, and invalidated state come only from the DTO.

Revocation is presented as stopping future GigMatch reveals, not deletion.
The consequence dialog states that the row remains historical, cannot be
restored/reactivated, a later reshare creates a new record, and retained
external copies cannot be erased. React never mutates an old row into a new
active share.

Source invalidation keeps historical consent visible, removes reveal authority
according to the DTO, clears any local reveal after denial, refreshes authority,
and instructs the participant that a new valid source requires a fresh share.

## URL draft plaintext boundary

Meeting/profile plaintext exists only in `SecureContactExchange` state and its
single component-local active-attempt ref. It is sent only after the participant
presses Share. Auth-backed methods never use that path.

A same-value transport retry reuses the URL attempt UUID. A meaningfully
changed value creates a fresh UUID through direct comparison inside the narrow
component action state. The raw URL is not placed in `ContactOperationRegistry`,
is not hashed for a browser key, and is not used as a React key or DOM data
attribute.

The draft clears after successful share, explicit Cancel Draft, engagement
change, and unmount. A local validation/service failure preserves the currently
mounted draft for correction. The component never fetches, resolves, previews,
embeds, preloads, preconnects, or navigates to contact URLs.

## Tokens and ordinary mutation idempotency

Contact action tokens remain opaque and component-local. They are read only at
the deliberate action boundary and are never rendered, logged, persisted, put
in URLs, or lifted into shell/workspace state.

The ordinary operation registry stores only operation type, engagement/share
identifier, and—only for Auth share—the method identifier. It cannot receive a
URL/contact value. Share, revoke, and block reuse a UUID for the same logical
transport retry, settle it on success, and create a fresh UUID after controlled
stale/conflict refresh. Report detail uses a separate component-local attempt
object so its changed input receives a new UUID without entering the registry.
Controlled 409 responses clear reveal state, refresh authority once, and
require a new deliberate participant action; they are not silently retried.

## Critical reveal retry and cache boundary

Reveal has a dedicated API function rather than the ordinary response helper.
It sends only current share ID, current server-issued reveal token, and a
component-local request UUID. It uses:

```text
cache: no-store
credentials: omit
Cache-Control: no-store
Pragma: no-cache
```

The unchanged backend continues to return:

```text
Cache-Control: no-store, private
Pragma: no-cache
Expires: 0
```

The reveal-attempt map stores only `share_id → request_id`; it never stores a
response or plaintext. A same logical transport retry may reuse its UUID but
always calls the backend again. A successful response settles the attempt. A
backend denial/rate limit/stale response removes the old attempt, clears all
revealed plaintext, refreshes authority, and displays only sanitized copy. A
prior successful reveal is never replayed locally.

Full values flow only from the guarded reveal response into component-local
`revealed` state. They are removed by Hide, authority refresh, any ordinary
contact mutation, reveal denial/error, revocation, block, invalidation refresh,
engagement change, Stage 8 contact-slot remount, and unmount. Hide conditionally
removes the `<output>` node from the DOM; CSS concealment is not used.

The local `aria-live` region announces only messages such as `Contact
revealed.` and `Contact hidden.`. The full value is separately labelled and is
never included in a live announcement or global feedback surface. No clipboard,
automatic `mailto`, `tel`, WhatsApp launch, or URL navigation was added.

## Block, report, and lifecycle independence

Block uses a contact-specific destructive native dialog. Copy states that the
block is permanent for this milestone, applies only to this engagement, denies
new sharing and reveals both directions, revokes the blocker's own active
shares, preserves the other participant's consent history, leaves the
engagement intact, and cannot erase external copies. There is no unblock flow
or account-wide claim.

Private Report remains a visibly separate form and operation. Its categories
are the exact live backend vocabulary, including the required-detail rule for
`other`. Copy states that details stay private and reporting does not
automatically block or change the engagement, applications, selection, or
ranking.

The Stage 8 lifecycle board, allowed actions, and timeline were not edited.
Contact blocking cannot remove lifecycle actions. Contact/reveal/report
activity is not added to the engagement timeline, accepted terms, application,
selection, command surface, or marketplace events. Reveal audit is never
presented as Viewed, Seen, Copied, or Contacted.

## Runtime sanitization

Ordinary response guards were strengthened to fail closed on:

- a non-canonical method or incomplete five-method availability projection;
- wrong-direction or duplicate share history;
- incoherent blocked flags;
- invalid ownership/WhatsApp source claims;
- missing/invalid opaque token shapes;
- empty masks;
- recursively nested value/contact/plaintext, URL, ciphertext, nonce, key,
  digest, fingerprint, material, audit, participant-ID, credential, secret, or
  access-token fields.

Reveal keeps a separate exact allowlist and now also enforces method/source
semantics. Component code verifies that the response share ID and method match
the requested record before rendering. Unknown error messages are replaced by
a fixed safe message instead of being echoed.

## Sensitive-sink and external-network review

The Stage 9 component and client were explicitly inspected for:

```text
localStorage
sessionStorage
indexedDB
document.cookie
console.
navigator.clipboard
window.location
window.open
iframe
new Image
prefetch
preload
preconnect
toast
analytics
global/shared context
operation-registry metadata
```

No sensitive sink exists. The only `fetch(` calls are the existing focused API
requests to configured `apiBaseUrl`; reveal now has its own no-store path.
Neither rendered masks nor revealed values are assigned to resource attributes,
links, navigation, metadata requests, or DOM data attributes.

The browser DOM exposed only the local Vite origin for script/link/image/iframe
assets. Backend verification logs contained only expected `OPTIONS` and `GET
/engagements` requests. No unexpected external origin or contact-content
request was observed. No real contact value was revealed for proof.

## Automated verification

Frontend:

```text
node --experimental-strip-types --test tests/contactExchange.test.mjs
22 tests passed

node --experimental-strip-types --test tests/engagements.test.mjs
17 tests passed

npm test
154 tests passed

npm run lint
PASS

npm run build
PASS — Vite 6.4.3, 189 modules transformed, no >500 kB warning
```

Unchanged backend authority/security regressions:

```text
./.venv/bin/python -m unittest tests.test_contact_exchange -v
13 tests passed

./.venv/bin/python -m unittest tests.test_engagement_workspace -v
7 tests passed
```

Node emitted only its experimental type-stripping warning. Backend runs emitted
only the existing Starlette deprecation warning.

## Bundle impact

Approved Stage 8 baseline:

```text
JavaScript chunks:       44
Aggregate JavaScript:    847,388 B
Primary JavaScript:      469,842 B
CSS:                     177,644 B
EngagementWorkspace:      25,679 B
```

Stage 9 build:

```text
JavaScript chunks:       44          (no change)
Aggregate JavaScript:    860,693 B   (+13,305 B)
Primary JavaScript:      469,842 B   (no change)
CSS:                     190,433 B   (+12,789 B)
EngagementWorkspace:      38,984 B   (+13,305 B)
```

All JavaScript growth is confined to the existing lazy
`EngagementWorkspacePage` chunk; the eager primary bundle and chunk count are
unchanged. No contact, QR, URL-preview, icon, crypto, query-cache, or other
dependency was added. Route-level lazy loading remains intact.

## Browser evidence and honest limitations

Local Vite/FastAPI servers used the existing environment and were stopped after
verification. The retained authenticated `clientA` session still exposes an
empty engagement register. No engagement, contact share, consent, URL share,
reveal audit, revocation, block, report, or invalidation was created or mutated.

Verified legitimate behavior:

- `/engagements` rendered the real `No engagements yet` state and no fabricated
  workspace.
- At 1440, 1024, 768, and 390 pixels, `documentElement.scrollWidth` exactly
  equalled the viewport width; horizontal overflow was false at every width.
- The 390-pixel visual inspection showed the Switchboard shell, editorial
  register header, and empty-state panel without clipping or overlay.
- No Vite error overlay appeared.
- Browser console warning/error output was empty.
- Rendered resource elements used only `http://127.0.0.1:5173`; expected API
  reads went only to local FastAPI.
- Backend logs recorded only `OPTIONS /engagements` and `GET /engagements`.

Browser status is **PARTIAL / NOT RUN** for a populated Engagement Workspace,
the redesigned contact authority/header, all five method rows, outgoing and
incoming share histories, masked/current/invalidated/revoked/blocked states,
URL draft interaction, reveal/hide, revocation, block, and private report.
Those states did not exist legitimately and were not manufactured. Share,
Reveal, Revoke, Block, and Report were not invoked. These boundaries are
covered by the 22 focused frontend tests plus the unchanged 13-test backend
security suite; unavailable browser states are not promoted to PASS.

## Remaining limitations

- The legitimate local state has no populated engagement, so Stage 9 visual
  browser evidence is limited to preservation of the real engagement empty
  state and responsive Stage 8 shell/register behavior.
- The DTO exposes safe share history but not a participant read-receipt model;
  the frontend correctly does not invent one.
- GigMatch controls in-product consent/reveal only. It cannot monitor
  off-platform communication, guarantee off-platform payments, or erase copies
  retained after a prior authorized reveal.

User approval: APPROVED
