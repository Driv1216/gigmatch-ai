# Milestone 7J — Dashboard Consolidation and Product Workflow Polish

## Closure status

Milestone 7J is implemented and locally verified. This closes 7J only. Milestone
7K remains, so Milestone 7 as a whole is not marked complete.

The repository remained on `main` at
`6461e5d582f803a885b61f9fc976c13013d8fd49`, with `main` neither ahead of nor
behind `origin/main` when the final audit ran. Nothing was committed, pushed,
deployed, or applied to a hosted database. Existing untracked concept
directories were preserved and excluded from the work:

- `concepts/`
- `concepts-gpt/`
- `concepts-gpt-forge/`

## Authority and read-model definitions

Both dashboard reads are service-only, `SECURITY DEFINER` database functions
with an empty search path and an exact acting-user role check:

- `public.dashboard_freelancer_get(uuid)`
- `public.dashboard_client_get(uuid)`

The functions use a single materialized authoritative timestamp per call,
bounded previews, deterministic ordering, and coherent total/limit/has-more
metadata. They do not write rows, emit events, acquire action locks, return
contact details, or expose proposal bodies.

Definitions are intentionally separated:

- An effective selection request is any pending request whose expiry is later
  than the authoritative timestamp.
- A selection belongs in freelancer attention only when it is also actionable:
  the opportunity and operation are active, the application is advanced, the
  request versions are current, and no non-cancelled engagement already exists
  for the gig.
- Response-required application totals count distinct applications, while
  attention action totals count individual actions.
- Engagement attention is derived from the exact participant and pending
  completion/cancellation actor.
- Reconsideration attention reuses the authoritative reconsideration-result
  helper and only includes actions currently allowed to the freelancer.

Existing primary, foreign-key, status, application, and gig indexes cover the
read paths; no speculative index was added.

## API and contract

The backend exposes:

- `GET /dashboard/freelancer`
- `GET /dashboard/client`

Each route requires a verified bearer identity, verifies the exact profile role,
performs one focused RPC, validates a strict response model, recursively rejects
forbidden sensitive fields, and returns `Cache-Control: private, no-store` plus
`Pragma: no-cache`. Authentication, authorization, dependency, and malformed
upstream failures are sanitized.

Recommendation retrieval remains independent of the core freelancer dashboard.
A recommendation outage therefore cannot suppress applications, engagement, or
attention data.

## Product workflow

The freelancer dashboard now presents summary totals, response-required work,
recent applications, active engagements, and an independently loading
recommendation section. Recommendation ranking language remains honest and
scores are suppressed where the existing policy requires it.

The client dashboard now presents summary totals, explicit action items, gig
review state, effective selections, active engagements, and direct workflow
links.

Role navigation is consolidated to:

- Freelancer: Dashboard, Find Gigs, My Applications, Engagements
- Client: Dashboard, Manage Gigs, Engagements, Create Gig

Admin evaluation navigation remains intact. Page modules are loaded with
`React.lazy` behind the authorization boundary, with explicit loading and
recoverable dynamic-import failure states.

Static accessibility inspection found semantic links and buttons, one dashboard
page heading supplied by the shared shell, labelled workflow lists and links,
and polite/assertive live regions for loading and failure states. No clickable
non-interactive dashboard elements were introduced. This is a static code
inspection, not a browser-assisted or formal WCAG certification.

## Bundle evidence

Before route-level splitting:

- 157 modules transformed
- main JavaScript: 705.63 kB (185.90 kB gzip)
- page-route chunks: 0
- Vite emitted the greater-than-500 kB warning

After route-level splitting:

- 169 modules transformed
- main JavaScript: 461.61 kB (134.10 kB gzip)
- page-route chunks: 23 (40 JavaScript chunks total)
- freelancer dashboard chunk: approximately 6.4 kB
- client dashboard chunk: approximately 5.4 kB
- no greater-than-500 kB warning

## Verification

Focused implementation checks:

- Database: 34 new pgTAP assertions passed.
- Backend dashboard tests: 11 passed; application and test compilation passed.
- Frontend dashboard tests: 9 passed; TypeScript and focused ESLint passed.

Final gates:

- Clean local database reset applied every migration through 7J.
- Database: 9 files, 508 assertions, all passed.
- Database schema lint: no errors.
- Backend: 439 passed, 3 intentionally skipped.
- Backend compilation: `app`, `tests`, and `scripts` passed.
- Frontend: 59 tests passed.
- Frontend full ESLint passed.
- Frontend production build passed.
- Repository diff whitespace check passed; new 7J files also passed an explicit
  trailing-whitespace scan.

The first full gate exposed a semantic audit distinction between effective and
actionable freelancer selections. That definition was corrected, then the full
database rebuild, all 508 assertions, lint, and advisors were rerun successfully
against the corrected migration.

Known non-blocking output:

- Supabase CLI 2.98.2 reported that 2.109.1 is available.
- Advisors retain three pre-existing performance warnings for multiple
  permissive authenticated `SELECT` policies on `client_profiles`,
  `freelancer_profiles`, and `gigs`.
- Backend output retains existing Starlette asyncio and SWIG deprecation
  warnings.
- Frontend test output retains Node's experimental warning.
- No browser smoke test, hosted migration, deployment, or production
  concurrency exercise was performed. The dashboard functions are read-only,
  and their consistency is covered by a single-statement snapshot design.

## Files changed

Database:

- `supabase/migrations/20260726210000_milestone_7j_dashboard_consolidation.sql`
- `supabase/tests/milestone_7j.sql`

Backend:

- `backend/app/main.py`
- `backend/app/api/routes/dashboard.py`
- `backend/app/marketplace/dashboard_contracts.py`
- `backend/app/marketplace/dashboard_data_access.py`
- `backend/tests/test_dashboard.py`

Frontend:

- `frontend/src/App.tsx`
- `frontend/src/components/Navbar.tsx`
- `frontend/src/components/DashboardAttentionList.tsx`
- `frontend/src/components/DashboardPageShell.tsx`
- `frontend/src/components/DashboardSection.tsx`
- `frontend/src/components/DashboardStatePanel.tsx`
- `frontend/src/components/DashboardSummaryCard.tsx`
- `frontend/src/components/LazyPageBoundary.tsx`
- `frontend/src/components/WorkflowStatusBadge.tsx`
- `frontend/src/lib/dashboard.ts`
- `frontend/src/lib/dashboardContracts.ts`
- `frontend/src/lib/dashboardView.ts`
- `frontend/src/lib/useDashboardResource.ts`
- `frontend/src/pages/ClientDashboardPage.tsx`
- `frontend/src/pages/FreelancerDashboardPage.tsx`
- `frontend/tests/dashboard.test.mjs`

Verification:

- `docs/verification/milestone-7j-invariant-map.md`
- `docs/verification/milestone-7j-closure.md`
