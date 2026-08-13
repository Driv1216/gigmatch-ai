# Switchboard Frontend Migration — Stage 6 Closure

Status: implementation complete; automated verification complete; authenticated browser verification partial.

User approval: APPROVED

## Scope completed

Stage 6 migrates the existing Milestone 7F structured Q&A and proposal-revision regions on:

- `/applications/:applicationId`;
- `/gigs/:gigId/applicants/:applicationId`;
- `/applications/:applicationId/edit?revision_request_id=...`.

The existing narrow Q&A attention projections on the already-migrated application/applicant lists remain unchanged. No top-level route was added or renamed.

Stage 5 was explicitly approved by the user before Stage 6 implementation. Both `User approval` markers in `switchboard-stage-05-closure.md` were changed from `PENDING` to `APPROVED`; every partial-browser limitation in that artifact remains unchanged.

## Preflight and Git state

- Starting branch: `main`
- Starting HEAD: `af46d6c413a92eb480acddf7ae91a973271784b2`
- Ending branch: `main`
- Ending HEAD: `af46d6c413a92eb480acddf7ae91a973271784b2`
- Expected branch check: PASS
- The worktree was already intentionally dirty with the approved, uncommitted Stage 1–5 migration and unrelated user-owned files.
- All pre-existing changes were preserved in place.
- No reset, restore, stash, clean, branch switch, commit, push, deploy, hosted migration, or unrelated overwrite occurred.
- Git continued to emit its pre-existing fsmonitor IPC warning while status and diff checks completed successfully.

The final `git status --short` remains the preserved pre-existing dirty worktree plus the Stage 6 files listed below. The verification directory remains represented by the existing untracked `docs/frontend/verification/` entry, and the new Stage 6 route helper appears as `?? frontend/src/lib/applicationEditMode.ts`.

## Non-chat architecture decision

The 7F surface is presented as a structured operational workflow rather than chat:

```text
discussion state
→ permanent allowance / blockers / attention
→ authorized structured action
→ immutable sequence history
→ official-proposal boundary
→ exact-version revision lifecycle
```

No typing indicators, presence, read receipts, reactions, arbitrary direct messages, attachments, voice/video, or chat-bubble-dominant presentation were added. Pending response is explicitly labelled as distinct from unread state.

The new presentation uses the approved Bone/Ocean/Glass/Coral/Ink palette, Space Grotesk/Manrope, monospace operational metadata, hard borders, restrained offset shadows, dense source/response/consequence rows, and deliberate mobile stacking.

## Server-derived thread modes

The frontend preserves the current exact mode vocabulary:

- `initial_clarification`;
- `initial_response_only`;
- `advanced_discussion`;
- `read_only`.

Mode is read directly from the strict 7F DTO. React does not derive it from application stage. Focused regression proves that a never-advanced Under Review application may render `initial_clarification`, while a previously Advanced application returned to Under Review may render backend-projected `read_only` with `returned_to_general_review`.

Intake closure and deadline passage were not introduced as browser-side read-only rules. Individual permissions, including report permission, render independently of the overall mode.

## Permanent allowance handling

The UI renders `used`, `remaining`, and `limit` from the authoritative `initial_question_allowance` projection. It explains that the two-turn allowance belongs to the complete application history and that an authorized pre-advancement client correction consumes the same allowance.

The runtime guard requires a coherent `used + remaining = limit` projection. No message-page counting, refresh reset, withdrawal/reapplication reset, shortlist reset, or stage-only reconstruction was introduced.

## Immutable message and correction semantics

- Server `sequence_number` is the only visible message sequence; array indexes are not used as sequence authority.
- Questions, answers, declines, clarifications, and corrections render as dense operational records rather than chat bubbles.
- Primary answer/decline relationships use `in_reply_to_message_id`.
- Append-only correction relationships use `corrects_message_id`.
- When the source row is outside the loaded cursor page, the relationship says so rather than inventing a local sequence.
- Original messages remain visible.
- No Edit Message or Delete Message action exists.
- Decline copy states that the consequence is limited to resolving the question; it does not imply withdrawal, ranking, Not Selected, or proposal change.
- Success is required before a primary resolution is reflected in refreshed authority; no optimistic resolved state is written.

## Report, privacy, and stop boundary

Private report controls use only the participant-safe DTO permission and `reported_by_viewer` projection. The presentation states that a report:

- preserves the original message;
- does not change ranking, proposal truth, or application state;
- does not automatically punish the other participant;
- keeps category/detail private from the other participant.

No private report detail, detector match, fingerprint, raw row, action/version token, Stage 5 shortlist state, or service credential is rendered.

Freelancer stop-pre-advancement copy preserves the exact limited consequence: it stops new pre-advancement client turns while open questions remain resolvable. It is not described as withdrawal, blocking the client, changing suitability/proposal truth, or preventing later backend-authorized Advanced discussion.

## Safety, rate limits, drafts, and idempotency

The existing deterministic frontend detector remains advisory and covers high-confidence contact/off-platform, credential/secret, and bank/payment identifier patterns. Copy explicitly says backend validation remains authoritative and makes no AI-moderation or complete-safety claim.

On advisory or authoritative safety failure, rate limit, stale state, idempotency conflict, or controlled workflow conflict:

- the relevant draft remains mounted;
- local allowance/message counts are not incremented;
- detector matches are not exposed;
- safe server retry timing is shown when supplied;
- no automatic retry occurs;
- controlled conflicts refetch current authority;
- the user must make a fresh deliberate attempt against changed authority.

Composer, response, correction, report, stop, revision-create, revision-decline, and linked proposal-update request IDs live in route/component-local state. Each ID stays with the same logical draft through a transport/error retry and resets on success or route/application change. Nothing is written to local storage, session storage, IndexedDB, global context, or shared persistence.

## Cursor history and attention

Cursor history continues to request `before_sequence` from FastAPI and merges immutable rows by ID while retaining server sequence order. Pagination never derives sequence from the array index.

The displayed pending-response counts come from the complete backend summary rather than the currently loaded message page. The UI explains that an unresolved older question may remain in projected attention even if its body is outside the loaded page. No unread, seen, delivered, or read-receipt state was invented.

## Official proposal authority

A dedicated Ocean authority band states:

**Discussion does not modify the official proposal.**

No editable financial, scope, timeline, or availability fields were added to the Q&A timeline. Q&A messages never update the application version, proposal pointer, or gig binding in React.

Stage 4 `ApplicationVersionReference` remains the shared role-safe source for application ordinal, proposal contract version, answered gig version, and current material gig version. Stage 4 `ApplicationProposalSnapshot` remains the current/history proposal presentation on the surrounding pages.

## Revision lifecycle

The revision region presents:

- an open exact-version request when supplied;
- its structured reason and bounded detail;
- server-authorized decline or full-update actions only;
- distinct open, fulfilled, declined, superseded, stage-closed, and gig-closed history outcomes;
- explicit consequence copy for whether an application version was or was not created.

Revision creation continues to submit the current application/material version identities from the 7F DTO. React does not reconstruct Advanced/gig/material-response/selection/rate eligibility. The backend remains responsible for every precondition and conflict.

Decline creates no proposal version. The full update link now generates the canonical query:

```text
/applications/:applicationId/edit?revision_request_id=:revisionRequestId
```

The previous `mode=revision&revisionRequestId=...` shape remains recognized only as an explicit revision compatibility input. Missing IDs, conflicting revision/reconsideration inputs, unknown modes, and mismatched IDs resolve to `invalid`; none silently fall through to ordinary edit or reconsideration.

## ApplicationForm mode and resulting version behavior

`ApplicationForm` now has a narrow `switchboard-revision` presentation in addition to the preserved Stage 2 submission and Stage 4 record presentations. Reconsideration retains its existing legacy-contained presentation and endpoint.

The Stage 6 revision editor:

- loads application and 7F authority in parallel;
- requires the requested ID to match the one open server-projected revision;
- displays current application/proposal/gig version context;
- initializes the complete canonical form from the current proposal;
- sends `snapshot: application` only to `submitRevisionUpdate`;
- never sends a revision through ordinary-edit or reconsideration APIs;
- keeps the old proposal official while the user types;
- preserves the mounted complete draft after conflicts;
- refetches application and Q&A authority together;
- requires an explicit acknowledgement and fresh operation ID before a new attempt against refreshed authority.

Only authoritative success creates a new immutable application version with origin `proposal_revision_response`, fulfills the request, moves the current pointer, and leaves the prior version in history. No partial proposal patch or existing-version mutation was added.

## Stage 7 and Stage 8 containment

The Q&A/revision region is now first-class on both owning detail pages. The surrounding approved Stage 4 and Stage 5 presentations were not redesigned again.

`SelectionPanel` remains a separate Stage 7 containment region with its current APIs, tokens, states, expiry, selection blockers, and mutations. Stage 6 did not redesign selection or create selection state.

`ReconsiderationPanel` and reconsideration application-edit behavior remain a separate Stage 8 containment region with their current APIs, tokens, states, and mutations. Revision and reconsideration query modes and endpoints remain distinct.

## Automated verification

Final requested commands:

```text
cd frontend
node --experimental-strip-types --test tests/qa.test.mjs
  PASS (20/20)
npm test
  PASS (110/110)
npm run lint
  PASS (0 errors, 0 warnings)
npm run build
  PASS

cd ../backend
./.venv/bin/python -m unittest tests.test_qa
  PASS (19/19)

cd ..
git diff --check
  PASS
git status --short
  INSPECTED; pre-existing dirty worktree preserved
```

Focused coverage includes loading/error/empty/ready states; all four modes; never-advanced versus returned-under-review; permanent allowance coherence; immutable question/answer/decline/correction relationships; report and stop consequences; cursor sequence; complete-summary attention; no fake unread state; advisory safety; rate/stale/idempotency draft preservation; every revision lifecycle outcome; exact query-mode resolution; full proposal endpoint isolation; Stage 4/5 regression; Stage 7/8 containment; and no token/draft persistence.

Warnings are limited to Node's existing experimental type-stripping notice, the focused backend suite's existing Starlette/Python deprecation notice, and Git's pre-existing fsmonitor IPC warning.

## Bundle impact

Approved Stage 5 baseline:

- 44 JavaScript chunks;
- 796,887 total JavaScript bytes;
- 469,619-byte main JavaScript chunk;
- 127,901 bytes CSS;
- 43,630-byte Structured Q&A lazy chunk.

Stage 6 build:

- 44 JavaScript chunks (no change);
- 812,036 total JavaScript bytes (`+15,149`);
- 469,623-byte main JavaScript chunk (`+4`);
- 147,143 bytes CSS (`+19,242`);
- 45,040-byte Structured Q&A lazy chunk (`+1,410`);
- 11,943-byte Edit Application lazy chunk.

The primary bundle is effectively unchanged, the Q&A/detail/editor routes remain lazy, and Vite emitted no greater-than-500 kB warning. The CSS delta is scoped to Stage 6 workspace, revision editor, responsive, focus, and reduced-motion presentation.

## Authenticated browser evidence

Environment inspection confirmed hosted Supabase data with a local FastAPI origin. Existing records were treated as non-disposable. Local Vite/FastAPI servers were used only for verification and stopped afterward.

Authenticated client status: **PASS for the available populated surface**.

The retained legitimate `clientA` session loaded owned gig `Web dev` and its real applicant `freelancerA`. The available 7F projection showed:

- viewer role: Client;
- application stage: Under Review;
- mode: Initial clarification;
- permanent allowance: 0 used / 2 remaining;
- pending for viewer: 0;
- pending for other participant: 0;
- no message rows;
- the structured client composer;
- the prominent official-proposal notice;
- no open revision request and therefore no fabricated revision action;
- the separate Stage 7 Selection panel below;
- the separate Stage 8 Reconsideration panel below.

The composer was inspected without entering or submitting content. No question, clarification, revision request, shortlist action, stage decision, selection action, or reconsideration action was submitted. FastAPI verification logs contained only `GET` and `OPTIONS` requests—no `POST` mutation.

Browser console warning/error log: empty. Vite overlay: absent.

## Paired-role and revision-form browser status

Paired client/freelancer browser verification: **PARTIAL**.

Only the legitimate retained client session was available. No genuine paired freelancer session was provisioned, so role-correct freelancer response/report/stop controls and live absence of Stage 5 shortlist state were not claimed in browser. They remain covered by current backend participant/ownership tests, strict role DTOs, protected routes, Stage 5 privacy regression, and Stage 6 focused source/contract tests.

Actionable revision-form browser verification: **NOT RUN**.

The genuine hosted fixture is Under Review with no open revision request. It therefore cannot legitimately expose revision creation, decline, or the linked freelancer revision editor. No application was Advanced, no fake message/revision was created, and no real gig/application terms were changed solely for evidence.

The following browser states were also unavailable and were not fabricated:

- `initial_response_only`;
- `advanced_discussion`;
- returned-to-review `read_only`;
- populated question/answer/decline/correction history;
- private reporting;
- stop-pre-advancement;
- cursor loading of an older page;
- rate/safety/stale/idempotency failure UI;
- open/fulfilled/declined/superseded revision history;
- complete `proposal_revision_response` submission.

## Representative widths and accessibility

The populated client detail and complete Stage 6 region were inspected at:

- 1440×900;
- 1024×768;
- 768×900;
- 390×844.

At every width:

- `document.documentElement.scrollWidth` equaled `clientWidth`;
- the Stage 6 header, three authority/attention cards, composer, history, proposal boundary, and revision region remained present;
- Selection and Reconsideration remained present in separate containment regions;
- no critical horizontal overflow appeared;
- no Vite overlay appeared.

Desktop and 390px visual inspection confirmed hard connected borders, clear typography, readable metadata, deliberate one-column mobile stacking, and no chat-bubble treatment.

Accessibility implementation includes semantic section headings, labelled native inputs/selects/textareas, `time` metadata, text-backed states, minimum 40–48px controls, explicit focus outlines, autofocus into newly opened structured action forms, trigger-focus restoration after cancel/success, non-hover-only information, route-local error/status announcements, skip navigation inherited from the approved shell, and scoped reduced-motion rules.

The temporary viewport override was reset and the temporary browser tab finalized after verification.

## Exact Stage 6 files changed

Created:

- `frontend/src/lib/applicationEditMode.ts`
- `docs/frontend/verification/switchboard-stage-06-closure.md`

Updated:

- `docs/frontend/verification/switchboard-stage-05-closure.md` (approval markers only)
- `frontend/src/components/ApplicationForm.tsx`
- `frontend/src/components/StructuredQaPanel.tsx`
- `frontend/src/lib/qaContracts.ts`
- `frontend/src/lib/qaView.ts`
- `frontend/src/pages/ApplicationDetailPage.tsx`
- `frontend/src/pages/ClientApplicantDetailPage.tsx`
- `frontend/src/pages/EditApplicationPage.tsx`
- `frontend/src/styles.css`
- `frontend/tests/applicantReview.test.mjs`
- `frontend/tests/applications.test.mjs`
- `frontend/tests/qa.test.mjs`

## Limitations, deviations, and backend/database status

The unavailable paired-role, advanced/history, mutation, and revision-form browser states are recorded above as partial/not run. Approval of Stage 5 did not upgrade any Stage 5 partial evidence.

No architecture deviation or missing DTO gap required backend work. Current 7F DTOs, actions, blockers, permissions, exact identities, and endpoints were sufficient for truthful Stage 6 presentation. The canonical query mode was added frontend-only, with a fail-closed compatibility parser for the former revision link.

Backend/database change status: **none**.

No selection, engagement lifecycle, failed-engagement Gig Reopening, reconsideration, or Secure Contact Exchange redesign was pulled forward.

User approval: APPROVED
