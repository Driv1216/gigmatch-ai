# Switchboard Frontend Migration — Stage 11 Closure

Date: 2026-08-09

Scope: Stage 11 only — public landing and authentication surfaces at `/`, `/login`, and `/signup`.

## Status

- Stage 11 implementation: **COMPLETE**.
- Focused and full automated verification: **PASS**.
- Public/auth responsive browser verification: **PASS** at 1440, 1024, 768, and 390 CSS pixels.
- Existing authenticated client-session routing, wrong-role redirect, logout, and browser-Back denial: **PASS**.
- Credential-submission login and signup-success browser proof: **PARTIAL / NOT RUN**.
- Backend changes: **NONE**.
- Database/migration changes: **NONE**.
- Dependency changes: **NONE**.
- Deployment, hosted account creation, marketplace mutation, migration, reset, or seed: **NONE**.

## Stage 10 approval

The Stage 11 request states that Stage 10 is explicitly approved. Preflight found `docs/frontend/verification/switchboard-stage-10-closure.md` already ending with:

```text
User approval: APPROVED
```

No Stage 10 file edit was necessary. Every existing Stage 10 `PARTIAL / NOT RUN` limitation remains exactly as recorded.

## Git state and worktree preservation

Starting state:

```text
branch: main
HEAD: af46d6c413a92eb480acddf7ae91a973271784b2
worktree: intentionally dirty with cumulative Stage 1–10 changes and unrelated user-owned files
```

The exact starting `git status --short` was recorded during preflight. It contained the cumulative frontend work, existing modified package files and migration files, concept directories, verification documents, and unrelated user-owned files. The fsmonitor daemon emitted its existing query warning, so final Git inspection used `git -c core.fsmonitor=false` where applicable.

Ending state:

```text
branch: main
HEAD: af46d6c413a92eb480acddf7ae91a973271784b2
worktree: remains intentionally dirty; all prior and unrelated entries were preserved
```

No reset, restore, stash, clean, branch switch, discard, commit, push, deployment, hosted migration, database reset, or seed was used.

Final `git -c core.fsmonitor=false diff --check` result: **PASS**, no output.

## Exact Stage 11 files changed

Implementation:

```text
frontend/src/components/AppLayout.tsx
frontend/src/components/PublicShell.tsx
frontend/src/lib/publicNavigation.ts
frontend/src/pages/LandingPage.tsx
frontend/src/pages/LoginPage.tsx
frontend/src/pages/SignupPage.tsx
frontend/src/styles.css
```

Regression coverage:

```text
frontend/tests/publicAuth.test.mjs
```

Closure evidence:

```text
docs/frontend/verification/switchboard-stage-11-closure.md
```

The pre-existing modified `frontend/package.json`, `frontend/package-lock.json`, backend files, and migrations were not changed for Stage 11.

## Live authentication and profile-persistence authority

The inspected live authority remains:

```text
Supabase createClient default session persistence
→ AuthContext getUser / onAuthStateChange lifecycle
→ owner-scoped user_profiles lookup through fetchUserProfile
→ persisted user_profiles.role
→ dashboardPathForRole / ProtectedRoute authorization
```

`AuthContext` still resolves the live user, loads the persisted profile, exposes only `profile.role`, and signs out through `supabase.auth.signOut()`. `ProtectedRoute` still waits while auth is resolving, redirects unauthenticated visits to `/login`, fails safely when the trusted profile is missing, and redirects wrong-role visits to the dashboard derived from the persisted role.

No access token, refresh token, session JSON, trusted role, authenticated user, participant state, or contact-reveal state was added to local storage, session storage, cookies, or a new global store. `supabaseClient.ts` and its default persistence configuration were unchanged.

### Signup persistence path

Repository evidence confirms the current signup path is frontend-owned:

```text
supabase.auth.signUp
→ if active session exists, one authenticated user_profiles insert
→ refreshProfile owner-scoped persisted-row read
→ dashboard derived from persistedProfile.role
```

The inspected auth migration defines the `user_profiles` table, role constraint, owner RLS, non-admin insert policy, and role-change prevention. It does not define an `auth.users` profile-creation trigger. Stage 11 therefore preserves exactly one frontend profile insert and adds no trigger, function, repair write, upsert, retry manufacturer, or second profile-creation path.

The signup role form remains operation-local and typed as `Exclude<UserRole, "admin">`. Its only values are `freelancer` and `client`. Admin, evaluator, superuser, and runtime account switching are not exposed. After an active-session signup, routing now uses the reloaded persisted profile role rather than the form selection. If that row cannot be inserted or resolved, the page stops with a controlled account-setup error and does not manufacture authority.

### Confirmation-aware signup

The no-session branch remains before the protected profile insert/read:

```text
successful signUp with no active session
→ visible confirmation-required status
→ no profile query or dashboard navigation
```

The form continues to state that the user must confirm through email before login. No assumption about the current demo confirmation setting was hardcoded.

## Public/auth route architecture

`stageElevenOwnsPublicPath` owns exactly:

```text
/
/login
/signup
```

`AppLayout` composes those routes through `PublicShell`, outside `ParticipantShell` and its command surface. The existing route-level `lazy()` imports and `LazyPageBoundary` remain in `App.tsx`. Participant route ownership helpers for Stages 1–10 are unchanged. `/dashboard/admin` remains protected by the real admin role and retains its deferred Stage 12 presentation.

Authenticated visits to public/auth routes preserve the existing intentional no-redirect behavior. Once auth resolution completes, the public header offers the persisted-role dashboard and real logout action. While authority resolves, it renders an explicit `Resolving account` status rather than guessing a role or flashing protected content.

## Login, trusted role, and errors

Login continues to call real `signInWithPassword`, reads `user_profiles` through `fetchUserProfile`, refreshes `AuthContext`, and routes only through the persisted profile role:

```text
freelancer → /dashboard/freelancer
client     → /dashboard/client
admin      → /dashboard/admin
```

No email, CTA, form selection, query parameter, or browser-storage inference was added. A missing profile remains a controlled failure and does not receive repair behavior. Authentication and profile-setup errors use stable public messages; raw database errors, tokens, secrets, stack traces, and internal details are not rendered or logged.

The exact existing fields and validation remain: login email/password; signup full name/email/password/role; signup password minimum length 6. Inputs now provide semantic labels, names, and appropriate `email`, `current-password`, `new-password`, and `name` autocomplete semantics. Operation errors use persistent `role="alert"` regions, while confirmation-required success uses a `role="status"` region associated with the form.

No OAuth, magic link, password reset, MFA, account deletion, email change, organization switching, admin invitation, or invented remember-me UI was added.

## Logout, wrong-role routing, and browser Back

The existing legitimate browser session resolved to the trusted client dashboard. Browser proof established:

- an authenticated visit to `/login` intentionally remained on `/login` and exposed `/dashboard/client` as the dashboard destination;
- a client visit to freelancer-only `/applications` redirected through current authorization to `/dashboard/client`;
- logout invoked the real `AuthContext.logout` / Supabase sign-out path and reached `/login`;
- the authenticated participant shell unmounted after logout;
- browser Back re-evaluated the historical protected route and returned to `/login`;
- no participant shell or protected dashboard heading became usable after Back.

No browser-history disabling or navigation-only logout was introduced. Stage 11 persists no participant or Secure Contact Exchange state, so the existing protected-route unmount boundary continues to cover prior Stage 4–10 state and Stage 9 ephemeral contact reveal state.

## Public landing truthfulness and data boundary

The landing page markets only implemented high-level capabilities:

- structured freelancer profiles and client-owned gig briefs;
- reviewed resume extraction;
- keyword, semantic, and hybrid matching with honest unavailable-mode fallback;
- explainable shared-skill and gap evidence;
- structured applications and client review;
- exact-version selection;
- Engagement Workspace context;
- consent-based, revocable Secure Contact Exchange.

The copy explicitly states that marketplace discovery and participant workflow data require authenticated access. The landing page imports no Supabase/API helper, starts no data request, exposes no fake search, and renders no marketplace record, participant profile, recommendation, application, engagement, contact, dashboard count, or evaluation data.

It makes no payment, escrow, contract/signature, invoice, refund, dispute, task-board, timesheet, real-time chat, automatic negotiation, guaranteed-ranking, guaranteed-hiring, fairness, behavioral-learning, or production-scale claim. It adds no fake metrics, counts, testimonials, ratings, logos, case studies, or activity feeds.

## Assets and network-origin review

Stage 11 uses the already bundled local Manrope and Space Grotesk production fonts plus CSS composition. It adds no image, marketing, animation, icon, auth-wrapper, or component-library dependency and no runtime font/CDN, stock image, avatar, analytics, tracking pixel, marketing script, or external icon origin.

At all inspected routes and viewports, rendered markup contained no HTTP(S) asset or navigation origin, browser logs contained no error or warning, and no Vite overlay appeared. The existing Supabase origin remains the expected live authentication/profile authority and was not changed.

**PARTIAL / NOT RUN:** the in-app browser surface did not expose a complete request-origin timeline. Source inspection, rendered markup inspection, dependency inspection, and browser logs prove no new marketing/asset origin, but this is not promoted to a full packet-level network audit.

## Automated verification

Focused Stage 11 test:

```text
node --experimental-strip-types --test tests/publicAuth.test.mjs
PASS — 10/10
```

Full frontend verification:

```text
npm test       PASS — 173/173
npm run lint   PASS
npm run build  PASS — 192 modules transformed
```

The build produced no `>500 kB` warning. No backend test or backend change was required because repository migrations, RLS, and the live frontend signup path resolved the authority question without changing backend/database behavior.

## Milestone 7K compatibility

`frontend/e2e/milestone-7k.mjs` was inspected. Stage 11 preserves its auth selectors:

```text
Email
Password
Login
Logout
```

Its unauthenticated denial, trusted role dashboard, wrong-role redirect, logout/Back denial, lazy failure, origin audit, and retained-contact-sentinel assertions remain unchanged. No assertion was weakened or deleted, and no locator update was necessary.

**PARTIAL / NOT RUN:** the complete destructive/data-creating Milestone 7K proof was not rerun for this presentation-only stage. Its compatibility was established by source inspection, focused auth/public coverage, full frontend tests, and direct non-marketplace browser auth-boundary proof.

## Bundle comparison

Approved Stage 10 baseline:

```text
JavaScript chunks: 45
total JavaScript:  869,510 B
main JavaScript:   470,227 B
CSS:               202,320 B
```

Stage 11 build:

```text
JavaScript chunks: 45           (unchanged)
total JavaScript:  875,789 B    (+6,279 B)
main JavaScript:   471,918 B    (+1,691 B)
CSS:               217,031 B   (+14,711 B)
```

Relevant public/auth lazy chunks:

```text
LandingPage: 3,623 B
LoginPage:   2,722 B
SignupPage:  4,475 B
```

The modest main growth is the public shell/path ownership. Public/auth page implementation remains in three existing route-level chunks. CSS growth is the scoped responsive Stage 11 composition. Chunk count is unchanged, no dependency was added, and the main chunk remains below the warning threshold.

## Browser evidence

The resolved `/`, `/login`, and `/signup` surfaces were inspected at:

```text
1440 × 900
1024 × 850
768 × 900
390 × 844
```

All 12 route/viewport combinations passed:

- responsive Switchboard composition;
- document scroll width equal to viewport width, with no horizontal overflow;
- zero participant-shell or participant-command nodes;
- zero unlabeled inputs;
- zero Vite overlays;
- non-empty resolved content and correct route heading;
- no remote HTTP(S) markup origins;
- no console error or warning.

The loading/resolution architecture was also observed directly: lazy pages rendered their controlled loading state and the header rendered `Resolving account` until the live session/profile resolved. No protected participant content flashed.

Visual inspection found and corrected one submit-button contrast regression before final proof. The final computed login submit colors were white text on Ink, and the button label was visible. Direct keyboard focus on the email field rendered the required 3px Coral outline with 3px offset.

Honest limitations:

- **PARTIAL / NOT RUN:** full sequential keyboard-Tab traversal across every control; direct focus visibility, semantic controls, input labels, and focus CSS passed, but the browser-control surface did not reliably advance an untouched document through the full sequence.
- **PARTIAL / NOT RUN:** credential-submission login for freelancer, client, or admin; no reusable credentials were exposed or entered. The existing legitimate persisted client session and authorization boundary were exercised instead.
- **PARTIAL / NOT RUN:** hosted signup success and active-session profile insert; no hosted account was created solely for proof.
- **PARTIAL / NOT RUN:** hosted email-confirmation delivery/return flow; the no-session contract is covered by focused source regression tests but was not simulated or called browser PASS.
- **PARTIAL / NOT RUN:** missing-profile browser state and login error response; no legitimate broken-profile account or credentials were available, and no authority-corrupting test account was created.

## Deferred work

Stage 12 admin dashboard presentation, final legacy cleanup, and closure-gate architecture remain deferred. Stage 11 preserves ordinary admin login routing and admin authorization without adding public admin signup or redesigning the admin dashboard.

User approval: APPROVED
