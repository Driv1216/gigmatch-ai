# Switchboard Frontend Migration — Stage 12 Closure

Date: 2026-08-10

Scope: Stage 12 only — the admin evaluation surface at `/dashboard/admin`.

## Status

- Stage 12 implementation: **COMPLETE**.
- Focused frontend, full frontend, lint, build, and focused backend evaluation verification: **PASS**.
- Minimal protected-route browser check: **PASS** for unauthenticated denial; migrated admin-surface visual/runtime inspection: **PARTIAL / NOT RUN** because no legitimate admin session was available.
- Backend evaluation logic/test changes: **NONE**.
- Database/migration changes: **NONE**.
- Dependency changes: **NONE**.
- Global legacy cleanup/final migration Closure Gate: **NOT PERFORMED**.

## Stage 11 approval

The Stage 12 request explicitly approves Stage 11. The final line of `docs/frontend/verification/switchboard-stage-11-closure.md` was changed from:

```text
User approval: PENDING
```

to:

```text
User approval: APPROVED
```

Every existing Stage 11 `PARTIAL / NOT RUN` item was preserved.

## Git state and worktree preservation

Preflight recorded:

```text
branch: main
HEAD: af46d6c413a92eb480acddf7ae91a973271784b2
worktree: intentionally dirty with cumulative migration work and unrelated user-owned files
```

The branch and HEAD remain unchanged, and the dirty worktree was preserved. No reset, restore, stash, clean, branch switch, discard, commit, push, deploy, migration, reset, or seed was performed.

## Stage 12 files changed

Implementation:

```text
frontend/src/components/AppLayout.tsx
frontend/src/pages/AdminDashboardPage.tsx
frontend/src/components/admin/evaluation/EvaluationLimitationsPanel.tsx
frontend/src/components/admin/evaluation/EvaluationSummaryCards.tsx
frontend/src/components/admin/evaluation/MetricResultsPanel.tsx
frontend/src/components/admin/evaluation/QueryComparisonSection.tsx
frontend/src/components/admin/evaluation/RankingComparisonTable.tsx
frontend/src/components/admin/evaluation/StrategyComparisonTable.tsx
frontend/src/lib/evaluationDisplay.ts
frontend/src/styles.css
```

Regression coverage:

```text
frontend/tests/evaluation.test.mjs
```

Approval and closure evidence:

```text
docs/frontend/verification/switchboard-stage-11-closure.md
docs/frontend/verification/switchboard-stage-12-closure.md
```

No backend, Supabase, package manifest, lockfile, or migration file was changed for Stage 12.

## Admin authorization and route ownership

`/dashboard/admin` remains route-level lazy loaded in `App.tsx` and remains wrapped by `ProtectedRoute allowedRole="admin"`. `ProtectedRoute` continues to resolve authority from the authenticated user's persisted profile through `AuthContext`; the page does not infer authority from presentation state, email, URL data, or browser storage.

`AppLayout` gives exactly `/dashboard/admin` its Stage 12 workbench frame. The admin route remains outside `ParticipantShell`; no second admin route or participant capability was added. Stage 1–11 route-ownership helpers and route assignments are unchanged.

The backend independently authenticates `GET /evaluation/matching`, loads the persisted profile, and requires the trusted `admin` role. Frontend route protection is therefore presentation defense, not a substitute for backend authorization.

## Evaluation authority and evidence preservation

The workbench still obtains its content from the real `GET /evaluation/matching` DTO through the existing authenticated evaluation helper. The backend evaluation runner remains the sole authority for:

```text
Precision
Recall
NDCG
MAP
ranking scores
strategy/query rows
limitations
```

React formats the response but does not calculate metrics, ranking scores, winners, improvement percentages, or overall scores. Strategy, query, ranking, and limitation evidence is rendered in backend response order. It is not sorted, reduced, selectively hidden, or compared to manufacture a preferred method.

Existing backend `available` / `unavailable_reason` state is displayed directly. Missing counts now render as `Unavailable`, never as a manufactured zero. An unavailable metric remains labelled and unavailable even if an incidental numeric field is present.

## Seeded/demo framing

The page identifies the source as `seeded_evaluation_fixtures` and repeatedly frames the evidence as a seeded local/demo evaluation. It explicitly states that the surface does not represent production traffic, customer outcomes, platform scale, or production-scale benchmarking.

No user counts, fabricated dataset claims, success rates, improvement percentages, testimonials, fairness claims, case-study results, executive KPIs, or production analytics were added.

## Presentation and semantics

The admin route is a standalone internal technical workbench using the established Bone, Ocean, Glass, Coral, and Ink palette; Space Grotesk, Manrope, and monospace operational metadata; hard borders; restrained shadows; and dense evidence rows.

Supported DTO sections are organized as evaluation scope, summary/metrics, method comparison, query-level ranking evidence, and limitations. Comparison data uses labelled semantic tables with captions and row headers, wrapped for narrow-screen overflow. Loading, authorization/API error, empty, available, and unavailable states remain explicit. Refresh and real logout are the only actions; no mutation or configuration surface was added.

## Privacy and capability boundary

Only the existing sanitized evaluation DTO is rendered. The focused backend route regression confirms that responses exclude raw resume text, raw gig descriptions, email/auth metadata, service credentials/keys, and embedding vectors. The frontend adds no request for parse rows, raw semantic inputs, profiles, contacts, tokens, or database internals, and it does not display raw backend error text.

No user/role management, moderation, suspension, gig/application mutation, model switching, weight tuning, retraining, fixture editing, label editing, or analytics infrastructure was created. This remains a read-only evaluation surface.

## Verification

Focused Stage 12 frontend coverage:

```text
node --experimental-strip-types --test tests/evaluation.test.mjs
PASS — 9/9
```

The focused test covers admin lazy/protected route ownership, denial architecture, real DTO/backend use, seeded/demo framing, unavailable evidence, absence of frontend recomputation/winner logic, response-order preservation, limitations, privacy exclusions, absence of fake KPI/product capabilities, semantic comparison tables, and unchanged Stage 1–11 route ownership.

Full frontend verification:

```text
npm test       PASS — 182/182
npm run lint   PASS
npm run build  PASS — 192 modules transformed
```

The production build emitted no `>500 kB` warning.

Focused backend evaluation regressions:

```text
.venv/bin/python -m unittest -v \
  tests.test_evaluation_fixtures \
  tests.test_evaluation_metrics \
  tests.test_evaluation_runner \
  tests.test_evaluation_routes

PASS — 51/51
```

The backend suite emitted only the existing Starlette asyncio deprecation warning; no test failed and no backend code/test was modified.

Final repository whitespace/conflict check:

```text
git -c core.fsmonitor=false diff --check
PASS — no output
```

## Bundle comparison

Stage 11 baseline:

```text
JavaScript chunks: 45
total JavaScript:  875,789 B
main JavaScript:   471,918 B
CSS:               217,031 B
```

Stage 12 build:

```text
JavaScript chunks: 45           (unchanged)
total JavaScript:  875,927 B       (+138 B)
main JavaScript:   471,916 B         (-2 B)
CSS:               230,089 B    (+13,058 B)
admin lazy chunk:   16,988 B
```

The chunk count is unchanged. `/dashboard/admin` remains in its own `AdminDashboardPage` route-level lazy chunk, no dependency was added, and the main bundle remains below the warning threshold. CSS growth is the isolated responsive Stage 12 workbench presentation.

## Minimal browser evidence

The in-app browser opened `http://127.0.0.1:5173/dashboard/admin` against the local development server. With no authenticated session, the existing protected route redirected to `http://127.0.0.1:5173/login`; no admin or participant content rendered. This is direct evidence that unauthenticated users cannot reach the admin surface.

**PARTIAL / NOT RUN:** migrated admin layout, console, and runtime inspection behind authorization. No legitimate existing admin session was available. In accordance with the Stage 12 constraint, no account was created, promoted, or otherwise altered merely to obtain browser evidence, and no broad application verification was performed.

## Legacy-cleanup boundary

Stage 12 replaced only the admin-local presentation and added one exact admin-layout exception. It did not delete global CSS, remove legacy components across the application, collapse route-ownership helpers, rewrite the shared shell architecture, remove concept directories, or create the final migration Closure Gate. Those actions remain deferred until Stage 12 is explicitly approved.

User approval: APPROVED
