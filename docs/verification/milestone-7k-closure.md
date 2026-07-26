# Milestone 7K — Final Security, Integration, and Browser E2E

## Closure status

Milestone 7K is complete. The full Milestone 7 workflow was verified through
the real local Vite, FastAPI, Supabase Auth/API, and PostgreSQL stack with four
independent authenticated Chromium contexts. All mandatory automated,
concurrency, security, browser, and post-browser database gates passed.

The repository remained on `main` at the starting commit
`6461e5d582f803a885b61f9fc976c13013d8fd49`. At preflight, `main` was neither
ahead of nor behind `origin/main` (`0 0`). The final work remains uncommitted.
Nothing was pushed, deployed, applied to hosted Supabase, stashed, reset,
restored, or discarded. The pre-existing `concepts/`, `concepts-gpt/`, and
`concepts-gpt-forge/` directories were preserved and excluded.

## Local runtime and fixture boundary

The executable guard accepted only this topology:

```text
ephemeral Chromium
-> http://127.0.0.1:5173 (Vite)
-> http://127.0.0.1:8000 (FastAPI)
-> http://127.0.0.1:54321 (local Supabase Auth/API)
-> postgresql://127.0.0.1:54322/postgres
```

Before every destructive reset, the runner compared the effective frontend and
backend configuration with `supabase status`, required project ID
`gigmatch-ai`, checked the fixed ports and loopback hosts, and rejected hosted
Supabase URLs. Local ignored environment files were mode `0600`. Contact
encryption and fingerprint keys and all test passwords were generated locally
and were never printed or committed.

Four confirmed local identities were provisioned without recording
credentials:

- Client A: workflow owner
- Client B: cross-client isolation actor
- Freelancer A: selected participant and invalidation actor
- Freelancer B: competing applicant and cross-freelancer isolation actor

Setup created only Auth users, trusted profiles, and reviewed resume parses.
Both gigs, all applications, review decisions, Q&A, revision requests,
selection requests, the engagement, lifecycle transitions, and contact shares
used by the proof were created through the visible product UI.

## Automated gate

- Clean local migration replay applied every migration through
  `20260726210000_milestone_7j_dashboard_consolidation.sql`.
- Database: 10 pgTAP files and 526 assertions passed. This is 18 assertions
  above the verified 7J baseline of 508.
- Database schema lint: no errors.
- Database advisors: no security finding; three existing performance warnings
  remain for overlapping permissive admin/owner `SELECT` policies on
  `client_profiles`, `freelancer_profiles`, and `gigs`.
- Backend: 440 discovered tests completed successfully with 3 intentional
  opt-in Supabase smoke skips. The discovery total did not decrease.
- Backend compilation: `app`, `tests`, and `scripts` passed.
- Frontend: 60 tests passed, one above the 7J baseline.
- Frontend ESLint: passed.
- Frontend TypeScript and production Vite build: passed.
- Repository whitespace check: passed.

The three skipped backend cases were inspected. They are legacy opt-in matching
smoke tests that require externally supplied credentials and pre-existing,
non-isolated smoke fixtures. They were not activated. Equivalent local
authentication, role isolation, gig discovery, and matching-read paths were
exercised by the isolated browser gate.

## Independent-session concurrency gate

Every existing Milestone 7 harness passed against local PostgreSQL:

- 7B selection confirmation: one success, one controlled loser, one accepted
  request, one confirmed application, one filled gig, and one engagement.
- 7C-B gig lifecycle/edit: all six race families passed.
- 7D applications: all submission, edit, invalidation, withdrawal, and
  reapplication race families passed.
- 7E applicant review: shortlist/advance capacity, terminal projection,
  reopen, withdrawal, edit, and cancellation races passed.
- 7F Q&A/revisions: all 16 race families passed.
- 7G selections: all 26 race families passed, including fan-out closure.
- 7H engagement/reconsideration: all six race families passed.
- 7I secure contact exchange: all 12 race families passed.

The 7B harness had retained its original prose error assertion while the
authority now returns the 7G stable code
`M7G_SELECTION_REQUEST_NOT_PENDING`. Updating that assertion was the only
concurrency-harness repair; the serialized database outcome was already
correct.

## Browser scenarios

The reproducible command is:

```text
backend/.venv/bin/python scripts/run_milestone_7k_browser.py
```

It performs the fail-closed local guard, clean reset, ephemeral fixture
provisioning, service startup, browser run, log checks, read-only database
evidence, and owned-process cleanup.

### A. Primary marketplace closure

Passed. Client A published and reviewed a fixed-price gig. Freelancers A and B
discovered it and submitted complete proposals. Client A saw honest keyword
fallback ranking, privately shortlisted A, completed structured Q&A, advanced
A, requested a proposal revision, received immutable application version 2,
sent an exact-version request, and Freelancer A accepted it. Both selected
participants opened the same Engagement Workspace.

Freelancer A never saw private shortlist state. Freelancer B saw **Not
Selected** and “Another applicant was selected for this gig,” with no
engagement or actionable Q&A.

### B. Selection invalidation

Passed. On an isolated second UI-created gig, Freelancer A edited the proposal
after a pending selection request. The old request became invalidated,
acceptance disappeared, versions 1 and 2 remained visible, and Client A sent a
fresh request only after reviewing version 2.

### C. Engagement and secure contact

Passed. The participants prepared kickoff, started work, requested completion,
and confirmed completion through the UI. Verified email and a unique HTTPS
meeting value were shared, revealed, and hidden. The meeting value was never
fetched. After revocation, a stale reveal received the controlled `409`
response, and plaintext remained hidden after refresh.

Successful reveal responses were checked in the real browser for
`Cache-Control: private, no-store` and `Pragma: no-cache`. The reveal endpoint
was the only full-value response exception.

### D. Authentication and isolation

Passed. The suite verified unauthenticated redirect, both wrong-role
directions, Client B denial for Client A resources, Freelancer B denial for
Freelancer A's application, non-enumerating guessed URLs, logout plus browser
back denial, and a recoverable lazy-import failure without a blank shell.

The final run used four persistent actor contexts plus temporary denial/failure
contexts. It reported zero unexpected external requests and zero retained
browser artifacts.

## Security, sanitisation, and persistence evidence

The focused 7K SQL suite added 18 passing assertions for:

- RLS on the explicit protected and private table sets
- denial of browser mutation and private-table access
- service-only workflow RPC execution
- fixed empty search paths on security-definer authorities and private helpers
- required immutable/append-only protection triggers
- absence of freelancer access to client-private shortlist/report state
- safe dashboard and contact privilege boundaries

Real successful and controlled-failure backend responses were recursively
audited using exact forbidden keys. Ordinary responses contained no access or
refresh tokens, service/encryption material, raw source text, embeddings,
private reports, contact ciphertext/nonces/key IDs/digests/fingerprints, SQL
markers, or stack traces. After reveal, the unique contact sentinel was also
rejected from every ordinary successful JSON response.

Post-browser read-only evidence proved:

- the main gig had immutable versions 1 and 2
- Freelancer A's accepted application had immutable versions 1 and 2
- the engagement bound the exact accepted application and gig versions
- Freelancer B was automatically closed with
  `another_applicant_selected`
- exactly one non-cancelled main engagement existed
- successful pre-revocation decryption plus the retired material row proved the
  encrypted meeting material lifecycle
- after revocation, ciphertext and nonce were null while non-secret retirement
  evidence remained
- the unique sentinel was absent from every text/JSON column in `public` and
  `private`, including events and operation ledgers
- the sentinel was absent from retained backend/frontend logs, browser
  local/session storage, cookies, URLs, and retained test artifacts

This claim is limited to observable persistence and retained artifacts. It does
not claim absence from ephemeral process memory.

## Confirmed defects and minimal repairs

Four confirmed integration defects were repaired:

1. Freelancer-facing application detail omitted the existing structured
   selection-confirmation closure reason. The safe reason is now mapped and
   rendered with regression coverage.
2. Linked revision submission forwarded a noncanonical proposal snapshot. The
   backend now derives the current version currency and forwards the canonical
   complete proposal payload, with exact contract/version assertions.
3. Backend application action names did not match the frontend contract for
   reaffirm, gig-change update, edit, and withdrawal. The action projection and
   pending-selection regression coverage now use the real frontend keys.
4. The 7B concurrency harness expected obsolete prose instead of the stable 7G
   non-pending code. Only the assertion was updated.

The browser runner and E2E module were added as verification infrastructure.
They fail on page errors, unexpected console errors, Vite overlays, blank
routes, unexpected network origins, sensitive log retention, sanitized-response
violations, stale reveal success, or failed post-run authority assertions.

## Bundle and dependency findings

The production bundle retains route-level splitting:

- 40 JavaScript chunks
- main JavaScript chunk: 461,593 bytes
- total JavaScript output: 736,206 bytes
- no greater-than-500 kB Vite warning

Runtime/dev tooling was updated to current compatible releases used by this
gate, including Playwright 1.62.0 and Chromium.

`npm audit --omit=dev --audit-level=high` reports two package entries for one
React Router advisory affecting RSC-mode server action handling
(`GHSA-qwww-vcr4-c8h2`). This application is a client-only Vite SPA: it has no
React Server Components, server actions, React Router server request handler,
or RSC runtime dependency. The affected execution path is therefore absent.
The suggested forced change is a downgrade to `react-router-dom@7.11.0`; it was
not applied because it is unnecessary for this architecture and npm marks it
as a breaking forced resolution. No applicable critical or high-severity issue
remains in the verified application surface.

Other non-blocking output:

- Supabase CLI 2.98.2 reports that 2.109.1 is available.
- Backend output includes existing Starlette asyncio and SWIG deprecation
  warnings.
- Frontend tests include Node's experimental type-stripping warning.

## Changed files

Milestone 7K verification and repairs:

- `docs/verification/milestone-7k-invariant-map.md`
- `docs/verification/milestone-7k-closure.md`
- `docs/verification/milestone-7-closure.md`
- `frontend/e2e/milestone-7k.mjs`
- `scripts/run_milestone_7k_browser.py`
- `supabase/tests/milestone_7k.sql`
- `backend/app/api/routes/applications.py`
- `backend/app/api/routes/qa.py`
- `backend/tests/test_applications.py`
- `backend/tests/test_qa.py`
- `frontend/src/lib/applicationView.ts`
- `frontend/src/pages/ApplicationDetailPage.tsx`
- `frontend/tests/applications.test.mjs`
- `scripts/verify_milestone_7b_concurrency.py`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/eslint.config.js`

The uncommitted Milestone 7J files listed in
`docs/verification/milestone-7j-closure.md` remain part of the preserved
working tree. No concept or presentation file was changed.
