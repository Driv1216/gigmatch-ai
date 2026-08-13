# Switchboard Frontend Migration Plan

- Status: **LOCKED — implementation source of truth**
- Locked: 2026-08-09
- Last precision amendment: 2026-08-10
- Selected design reference: `concepts-gpt-2/src/concepts/switchboard`
- Implementation model: one stage at a time, with review and verification before the next stage
- Migration state: plan locked; redesign implementation not started by this document

Repository and source-control boundary for this lock:

```text
Repository: /Users/drivyaanshyadav/Desktop/Ai-Gig/gigmatch-ai
Document: docs/frontend/switchboard-migration-plan.md
Product implementation branch: main
Main HEAD after concept integration: 67ebaa3
```

The complete `concepts-gpt-2` suite, including Switchboard, is committed on `main` as a durable design reference. Its presence on `main` does not make it product implementation code or functional authority. Future agents must not copy prototype records, state, routes, permissions, or workflow behavior into the main application merely because the concept source is available in the repository.

`main` was fast-forwarded to include the former concept branch’s commits, then that branch was removed locally and remotely after the pushed `main` ref safely contained them. Future implementation work belongs on `main` under the user’s workflow, and this locked plan is maintained there as the durable migration source of truth. Because the wider worktree contains other intentional user-owned changes, no agent may switch branches, clean the tree, reset, restore, stash, or discard files automatically. Every task must first inspect the current branch, HEAD, and `git status --short`, then preserve unrelated work while following the user’s explicit Git instructions.

## 1. Purpose and precedence

This document is the durable, repository-local source of truth for migrating the real GigMatch AI frontend to the finalized **Switchboard** UI, UX, and interaction direction.

It exists so a new Codex task, ChatGPT conversation, developer, or reviewer can recover the complete approved plan without relying on prior chat history.

This document supersedes:

- the original ten-stage migration roadmap;
- intermediate chat summaries and corrections;
- any earlier wording that grouped Q&A, selection, reconsideration, engagement, or contact into broader stages;
- the terms “Delivery Workspace” and “Delivery lanes.”

The approved product term is **Engagement Workspace**. GigMatch does not claim to provide project management or a work-delivery system.

If a future implementation prompt conflicts with this document, stop and resolve the conflict before changing the application. Do not silently reinterpret this plan.

This document does not by itself authorize implementing all stages. Each stage requires its own explicit implementation request and approval boundary.

## 2. Core objective

The migration equation is:

```text
REAL GIGMATCH PRODUCT
+ REAL BACKEND WORKFLOWS AND DATA
+ SWITCHBOARD DESIGN AND INTERACTION LANGUAGE
= THE NEW MAIN GIGMATCH FRONTEND
```

The objective is not to copy prototype screens into production. It is to express the real application, real data, real authorization, and real workflow consequences through the Switchboard design system.

## 3. Authority model

### 3.1 Product and functional authority

The following remain authoritative:

- PostgreSQL and Supabase database constraints and state;
- FastAPI routes and DTOs;
- authenticated user identity and trusted role;
- route authorization and cross-user isolation;
- server-authorized action availability and action tokens;
- gig and application lifecycle state;
- immutable gig and application versions;
- ranking evidence and honest fallback behavior;
- client-private shortlist and review information;
- structured Q&A and proposal-revision rules;
- exact-version selection requests and confirmation;
- engagement lifecycle, reopening, and reconsideration;
- secure contact consent, reveal, revocation, blocking, reporting, and plaintext boundaries;
- verified Milestone 7 behavior and its regression evidence.

Switchboard must never override these authorities.

### 3.2 Design authority

The selected Switchboard concept is authoritative for:

- visual language and palette;
- typography and information hierarchy;
- spacing, density, borders, and offset shadows;
- editorial page headings;
- lane and row composition;
- persistent navigation philosophy;
- command/context presentation;
- active-record continuity;
- source, consequence, and action relationships;
- contextual work areas;
- interaction feedback and restrained motion;
- responsive recomposition.

### 3.3 Treatment of concept-only behavior

Every Switchboard behavior not already present in the real product must receive one explicit treatment:

1. **Map to existing capability.** Use the interaction to expose real routes, records, sections, or authorized actions.
2. **Safe frontend addition.** Add navigation, focus, keyboard, or presentation behavior using already-authorized data.
3. **Real product extension.** If the interaction requires missing authoritative capability, stop and propose the smallest legitimate backend/DTO extension.
4. **Exclude deliberately.** If the behavior would be dishonest, unsafe, or outside product scope, record why it is not being implemented.

Never fabricate a capability merely to make the concept appear literal.

## 4. Selected concept and verified production baseline

### 4.1 Exact design reference

The finalized concept is:

```text
concepts-gpt-2/src/concepts/switchboard
```

Other concept directories are not design references for this migration. They may only contribute technical infrastructure if it is independently justified and does not dilute Switchboard.

The concept remains a prototype. Its records, roles, counts, status values, action behavior, and route assumptions are non-authoritative.

### 4.2 Current frontend baseline

The main application frontend currently uses:

- React 19;
- React Router with explicit routes;
- route-level `lazy()` imports;
- `LazyPageBoundary` for route failures;
- `ProtectedRoute` for role checks;
- `AuthContext` for the authenticated session and trusted displayed role;
- page-local data fetching through typed API libraries and runtime guards;
- a shared `AppLayout` and `Navbar`;
- Tailwind plus existing global styles;
- focused Node test files, ESLint, TypeScript, and Vite build verification.

The migration must preserve route-level code splitting and recoverable lazy-route failures.

### 4.3 Current route inventory

Public and authentication:

```text
/
/login
/signup
```

Dashboards and profiles:

```text
/dashboard/freelancer
/dashboard/client
/dashboard/admin
/profile/freelancer
/profile/client
/profile/resume-parse
```

Gigs and applicant review:

```text
/gigs
/gigs/new
/gigs/manage
/gigs/:gigId
/gigs/:gigId/apply
/gigs/:gigId/applicants
/gigs/:gigId/applicants/:applicationId
/gigs/:id/edit
/gigs/:id/parse
```

Applications and engagements:

```text
/applications
/applications/:applicationId
/applications/:applicationId/edit
/engagements
/engagements/:engagementId
```

These URLs remain stable unless a separate, explicit product decision approves a change. Navigation labels may evolve; route identities may not drift casually.

### 4.4 Backend authority map

The migration sequence follows the real Milestone 7 boundaries:

| Authority | Product responsibility | Migration stage |
| --- | --- | --- |
| 7C-A | Gig discovery, detail, pagination, ranking context, recommendations, and semantic fallback | Stage 2 |
| 7C-B | Client gig management and lifecycle | Stage 3 |
| 7D | Freelancer applications and immutable versions | Stage 4 |
| 7E | Client applicant review | Stage 5 |
| 7F | Structured Q&A and proposal revision | Stage 6 |
| 7G | Version-bound selection and confirmation | Stage 7 |
| 7H | Engagement lifecycle, failed-engagement Gig Reopening, and reconsideration | Stage 8 |
| 7I | Secure Contact Exchange | Stage 9 |
| 7J | Role dashboards | Stage 1 |
| 7K | Final security, integration, and browser proof | Closure Gate |

Milestones 7A and 7B are cross-cutting domain and persistence authorities. They do not receive dedicated redesign stages, but their contracts, state model, immutable-version foundations, and selection/engagement invariants remain binding throughout the migration.

Three similarly named recovery operations must remain distinct:

| Operation | Exact meaning | Owning stage/authority |
| --- | --- | --- |
| Material-gig-change reapplication | The freelancer reactivates the same application history after a material gig change | Stage 4 / 7D |
| Reopen Application | The client moves a Not Selected application back to Under Review through the controlled review action | Stage 5 / 7E |
| Failed-engagement Gig Reopening | The owning client reopens the gig after a cancelled engagement, enabling controlled reconsideration | Stage 8 / 7H |

The underlying authority chain remains:

```text
gig_versions
    = immutable client terms

application_versions
    = immutable freelancer proposals

selection_requests
    = exact application-version and gig-version offers

engagements
    = accepted terms plus the current lightweight lifecycle

marketplace_events
    = append-only workflow activity within its explicit allowlists
```

## 5. Locked Switchboard design language

### 5.1 Visual tokens

The concept palette is the starting design authority:

| Token | Reference value | Role |
| --- | --- | --- |
| Bone | `#EEE9DD` | Primary warm canvas |
| Ocean | `#073F59` | Deep authority/navigation color |
| Glass | `#8BCABD` | Active context, focus, positive operational emphasis |
| Coral | `#E35F48` | Consequence, warning, editorial accent |
| Ink | `#111312` | Primary text and structural border |

Implementation may introduce derived shades for accessibility and state differentiation, but must not turn the product into a generic neutral card dashboard.

### 5.2 Typography

The intended hierarchy is:

- Space Grotesk for editorial headings and strong interface labels;
- Manrope for body and control text;
- a deliberate monospace stack for identifiers, versions, metadata, shortcuts, and operational labels.

Stage 1 must resolve the production font strategy completely.

Preferred implementation:

- approved production-local Fontsource packages or self-hosted font assets;
- verified package licensing and production bundling;
- no runtime request to Google Fonts, a CDN, or any other external font origin.

Fallback only if local packages/assets are not approved:

- choose and document a deliberate system-font stack;
- update the design tokens to name the actual stack;
- do not leave CSS that names unavailable fonts and silently varies by machine.

### 5.3 Composition

Switchboard identity depends on the combined system, not isolated decorations:

- a persistent authenticated application shell;
- a strong top navigation band;
- a non-mutating command/context band;
- editorial headings with high information density;
- lane and row structures instead of repetitive floating cards;
- visible relationship between current record, current state, consequences, and available destinations;
- thin structural borders and deliberate offset shadows;
- expandable inline work areas where the real workflow benefits;
- clear current-version and lifecycle cues;
- context continuity across list, detail, and subarea transitions.

### 5.4 Motion and feedback

- Motion must clarify focus, expansion, navigation, or completion—not decorate continuously.
- Hover and focus treatments must not be the only way to reveal essential information.
- `prefers-reduced-motion` must remain supported.
- Action feedback must reflect confirmed backend results; optimistic styling must not invent success.
- Focus-visible treatment must be obvious against all five core colors.

### 5.5 Responsive philosophy

Responsive work means recomposition, not merely shrinking desktop layouts.

Required representative widths:

```text
1440 px — wide desktop
1024 px — compact desktop/tablet landscape
768 px  — tablet/narrow shell transition
390 px  — mobile
```

At each width, verify:

- navigation remains understandable and role-correct;
- command/context controls remain usable;
- editorial hierarchy survives;
- lanes recompose without losing state or consequence information;
- forms and action areas preserve label/control relationships;
- dense metadata wraps or reorganizes deliberately;
- no critical control depends on horizontal clipping;
- no generic card-grid replacement is used as an escape hatch.

## 6. Locked frontend architecture

### 6.1 Shell boundary

The participant Switchboard shell is introduced incrementally.

- Stage 1 installs the participant shell for freelancer/client protected routes only.
- Freelancer/client routes use the participant shell as they migrate.
- Admin remains on its existing isolated admin presentation until Stage 12, including when an admin uses an otherwise shared authorized route.
- Public, login, and signup remain outside the participant shell until Stage 11.
- Legacy pages must remain reachable and functional inside a layout-only containment boundary.
- The shell must not require all routes to migrate simultaneously.
- Role display is derived from authenticated authority. The concept role toggle must not become a fake account or role switch.

### 6.2 Command/context surface

The locked rule is:

> The command/context surface is non-mutating. It may navigate, open or focus existing product areas, and expose contextual destinations, but it never executes workflow mutations or stores action tokens.

Legitimate examples include:

- open Applications;
- jump to Q&A;
- show the selection section;
- focus available actions;
- open an Engagement Workspace;
- navigate between subareas of the current authorized record.

It must not:

- pretend to search records without a real search capability;
- execute publish, shortlist, selection, engagement, or contact mutations;
- infer permission from visual state;
- store, cache, copy, or replay server action tokens;
- create a global command DSL during this migration.

Keyboard behavior:

- `/` opens or focuses the surface only with no modifier;
- `/` is ignored while focus is in `input`, `textarea`, `select`, content-editable elements, textbox-like editable controls, or a dialog-owned field;
- `Cmd+K` or `Ctrl+K` applies only while the application shell owns interaction;
- `Escape` closes the surface and restores focus to the element that opened it;
- shortcut handling must not change route-local workflow state;
- modal/dialog keyboard behavior takes precedence while a dialog is active.

### 6.3 Active-record context

Prefer route-local or route-derived context over a shell-global record registry.

The normal pattern is:

- a record workspace renders its own context rail immediately below the shell;
- context uses authorized route data already loaded for that record;
- list routes and public routes do not retain a prior record descriptor.

If a shared shell slot later proves necessary, registration must be ephemeral and lifecycle-safe:

- register on owning route mount;
- unregister on unmount;
- clear immediately on pathname change;
- clear on authenticated user or role change;
- clear on logout;
- never persist to local storage, session storage, cookies, URLs, or a global token-bearing store;
- never include sensitive contact plaintext or private data not required for navigation context.

Stage 1 must not invent active-record data. Record context begins with the owning record stages.

### 6.4 State and data ownership

- Backend responses remain the source of workflow truth.
- Preserve the existing typed API modules and runtime response guards.
- Keep route/resource data close to the route that owns it.
- Do not introduce a global workflow state machine.
- Do not introduce a global server-action-token store.
- Do not duplicate authoritative backend transition logic in presentation code.
- Refetch or apply existing authoritative response projections after mutations.
- Contact reveal plaintext remains component-local and short-lived.
- No sensitive plaintext is placed in shared context, browser persistence, analytics, URLs, logs, or generic caches.

### 6.5 Component strategy

Build abstractions only after repeated production semantics justify them.

Allowed early foundations:

- scoped design tokens;
- authenticated shell structure;
- navigation primitives;
- command/context surface;
- editorial heading primitive;
- lane/row presentation primitives that are proven by Stage 1 dashboards.

Explicitly avoid speculative Stage 1 abstractions such as:

- a universal `SwitchboardPage`;
- a universal workflow engine;
- universal schema-driven forms;
- generic action dialogs for every authority;
- a generic version component before multiple real version domains are implemented;
- one giant workspace component shared by unrelated records;
- a command language or fake global record index.

Version-component sequencing:

1. Stage 3 may introduce a narrow `GigVersionReference` presentation because gig management requires exact current/material version clarity.
2. Stage 4 observes application-version presentation.
3. Generalize to a shared `VersionReference` only if the repeated semantics actually align. Do not generalize merely because both contain a number.

### 6.6 Legacy coexistence

The legacy adapter is layout-only containment.

It may:

- provide safe spacing inside the new shell;
- isolate legacy page styles;
- prevent shell and page overflow conflicts;
- give unmigrated routes a deliberate temporary canvas.

It must not:

- translate API responses;
- translate props or workflow state;
- adapt action tokens;
- rename server states;
- simulate missing data;
- become a second application architecture.

Legacy components and CSS remain until the Closure Gate proves them unused. Do not delete them opportunistically during feature stages.

### 6.7 Backend and database change policy

“No backend or database changes” is the default for this presentation migration, not an absolute invariant.

If a migrated surface cannot truthfully represent a necessary capability because an authoritative DTO or endpoint is missing:

1. stop that part of the stage;
2. identify the precise missing capability;
3. propose the smallest authoritative extension;
4. document authorization, privacy, versioning, and test consequences;
5. obtain approval before implementing it.

Never invent client-side truth to avoid a small legitimate backend change.

## 7. Target information architecture

Route URLs remain as listed in Section 4.3. Stage 1 validates navigation wording in the actual Switchboard shell before labels become permanent.

Candidate authenticated navigation concepts:

Freelancer:

```text
Home or Dashboard
Find Gigs or Market
Applications or My Applications
Engagements
```

Client:

```text
Home or Dashboard
Gigs or Manage Gigs
Engagements
```

Admin:

```text
Evaluation or Admin
```

Locked IA principles:

- Applicants remain scoped under a real gig.
- Selection remains scoped under an application/applicant record.
- Q&A remains scoped under the relevant application.
- Reconsideration authority belongs to 7H even though its UI spans application, applicant, and engagement routes.
- Contact remains scoped to an authorized engagement.
- Profiles and parsing remain purposeful destinations, not top-level workflow claims unless Stage 1 evidence supports their placement.
- Navigation labels must be honest, concise, role-correct, and visually tested before being locked.

## 8. Migration operating rules

1. Implement exactly one approved stage at a time.
2. Do not begin the next stage until the current stage is reviewed and its required gates pass.
3. Preserve all unmigrated routes and workflows.
4. Do not change URLs as a side effect of visual redesign.
5. Preserve route-level lazy loading.
6. Preserve existing authorization and wrong-role behavior.
7. Use real data in every migrated surface; no concept fixtures may enter production.
8. Do not display mock scores, synthetic counts, or inferred actions.
9. Keep selectors semantically meaningful and accessibility-oriented where possible.
10. Treat regression failures as product evidence, not inconveniences to bypass.
11. Update UI-facing E2E locators when presentation changes, but preserve the semantic assertion.
12. Record approved stage-local deviations in that stage’s closure artifact. Modify this master plan and its decision log only when the user explicitly approves an architectural/source-of-truth change.
13. Inspect and record the current branch, HEAD, and worktree status at the beginning and end of every stage.
14. Run `git diff --check` and inspect `git status --short` before declaring a stage implementation complete.
15. Do not commit, push, deploy, apply hosted migrations, reset, restore, stash, discard, or overwrite user-owned work unless the user separately and explicitly authorizes that exact operation.

### 8.1 Locked sequence at a glance

```text
1  Switchboard shell + real dashboards

2  Freelancer discovery + gig detail + application submission

3  Client gig creation + management + lifecycle

4  Freelancer applications + immutable proposal versions

5  Client applicant inbox + review

6  Structured Q&A + proposal revision

7  Exact-version selection request + confirmation

8  Engagement lifecycle + failed-engagement Gig Reopening + reconsideration
   ↳ includes application, application-edit, applicant-detail, and engagement integration

9  Secure Contact Exchange
   ↳ isolated inside the stable Stage 8 Engagement Workspace

10 Profiles + resume/gig parsing + matching inputs

11 Public landing + authentication

12 Admin surfaces

SWITCHBOARD MIGRATION CLOSURE GATE
   Legacy convergence
   Full functional, security, and privacy regression
   Complete 7K-equivalent browser proof
   Responsive visual fidelity
   Bundle and lazy-loading proof
```

## 9. Locked implementation stages

### Stage 1 — Switchboard shell and real dashboards

**Goal:** Establish the production design foundation using real authenticated roles and real 7J dashboard data without changing workflow behavior.

Primary routes:

```text
/dashboard/freelancer
/dashboard/client
```

Primary implementation scope:

- introduce scoped production Switchboard tokens;
- resolve local production fonts or the deliberate fallback stack;
- build the authenticated top navigation and role display;
- build the non-mutating command/context surface;
- migrate both role dashboards using the real dashboard DTOs;
- establish editorial headings, operational lanes/rows, status presentation, loading, empty, and controlled error states;
- establish responsive shell behavior;
- add layout-only containment for unmigrated authenticated routes;
- preserve public/auth presentation until Stage 11;
- decide the visible IA labels after testing them in the real shell.

Explicit exclusions:

- no fake role switching;
- no active-record descriptor data;
- no global search;
- no workflow mutations from the command surface;
- no route renames;
- no generic record workspace, universal version component, universal action dialog, or schema-form system;
- no remote runtime fonts or CDN assets;
- no workflow refactor;
- no legacy deletion.

Acceptance criteria:

- authenticated role and navigation are derived from real auth state;
- freelancer and client dashboards preserve all real data, links, attention states, and consequences;
- command/context behavior follows Section 6.2 exactly;
- every legacy route remains reachable through the new shell or intentional public boundary;
- no unexpected external origin is introduced;
- typography is deterministic across machines;
- shell and dashboards pass visual review at 1440, 1024, 768, and 390 px;
- focus order, focus restoration, reduced motion, loading, empty, and error states work;
- lazy route splitting and failure recovery remain intact.

Risk: **Medium-high**, because the shell affects every route even though workflow behavior is unchanged.

### Stage 2 — Freelancer discovery, gig detail, and application submission

**Goal:** Migrate the primary freelancer acquisition flow from discovery through a truthful application submission.

Primary routes:

```text
/gigs
/gigs/:gigId
/gigs/:gigId/apply
```

Primary implementation scope:

- redesign gig discovery as dense Switchboard market lanes/rows;
- preserve real discovery, pagination, recommendation behavior, matching explanations, ranking evidence, keyword fallback behavior, and any currently implemented controls;
- redesign gig detail around real terms, lifecycle, deadlines, skills, deliverables, and authorized actions;
- introduce route-local gig context continuity;
- redesign the application form without changing canonical proposal payloads;
- present server-derived availability, closure, pause, tombstone, and application-context states honestly;
- preserve form validation and consequence text;
- retain loading, empty, missing, forbidden, and controlled failure behavior.

Shared-route requirement:

`/gigs/:gigId` is authorized for freelancer, client, and admin roles. Gig Detail must remain safe and usable for every currently authorized role. Role-specific actions and data must remain correctly scoped even if the visual emphasis is optimized for freelancer discovery.

Explicit exclusions:

- no fabricated match percentage;
- no client-only management controls exposed to freelancers;
- no applicant data on the shared detail route unless already authorized;
- no redesign of client gig management routes;
- no fake global market search;
- no route change.

Acceptance criteria:

- real discovery and matching behavior is preserved;
- shared Gig Detail passes cross-role and wrong-role checks;
- an eligible freelancer can submit the existing complete proposal contract;
- ineligible, closed, paused, filled, cancelled, and missing cases remain honest;
- page context clears when leaving the record;
- route loading remains lazy;
- focused browser coverage proves discovery, shared detail safety, and submission.

Risk: **High**, because one shared record route serves multiple authorized roles.

### Stage 3 — Client gig creation, management, and lifecycle

**Goal:** Migrate the client’s gig-authoring and ordinary gig-lifecycle workflow while preserving 7C-B authority.

Primary routes:

```text
/gigs/new
/gigs/manage
/gigs/:id/edit
/gigs/:gigId
```

The existing `/gigs/:id/parse` route remains functional under legacy containment until Stage 10.

Primary implementation scope:

- redesign new-gig authoring and canonical gig forms;
- redesign owned-gig management lanes;
- preserve draft, publish/upgrade, edit preview, immutable edit creation, intake close/reopen, pause/resume, and cancellation behavior;
- expose only server-authorized actions and consequences;
- display current/material gig version accurately;
- introduce a narrow gig-specific version reference if needed;
- preserve concurrency-safe responses and controlled conflicts;
- connect to the Stage 2 shared Gig Detail without changing its cross-role safety.

Boundary clarification:

“Ordinary lifecycle” here excludes 7H failed-engagement Gig Reopening. Gig Reopening after a cancelled engagement belongs to Stage 8.

Explicit exclusions:

- no generic version abstraction before Stage 4 validates repetition;
- no gig parsing redesign yet;
- no applicant review redesign;
- no client-side transition rules replacing server authority;
- no action-token persistence.

Acceptance criteria:

- all currently authorized gig actions remain available only in valid states;
- action confirmation communicates real consequences;
- immutable versions remain visible and correctly labeled;
- material changes and intake state are not visually conflated;
- cancelled, paused, filled, and closed-to-new-applications states remain distinct;
- the Gig Parse legacy route remains reachable and functional;
- focused lifecycle regression covers success and controlled conflict paths.

Risk: **High**, due to lifecycle, versioning, and concurrency semantics.

### Stage 4 — Freelancer applications and immutable proposal versions

**Goal:** Migrate the freelancer’s application record, version history, editing, withdrawal, gig-change response, and 7D material-gig-change reapplication behavior.

Primary routes:

```text
/applications
/applications/:applicationId
/applications/:applicationId/edit
```

Primary implementation scope:

- redesign the application list as record-aware operational lanes;
- redesign Application Detail around current stage, closure reason, proposal snapshot, version history, and available actions;
- redesign ordinary edits as new immutable versions;
- preserve withdrawal and the distinct 7D material-gig-change reapplication behavior;
- preserve gig-change reaffirm/update behavior;
- show selection-request invalidation caused by application edits when authoritative data exposes it;
- keep reconsideration presentation functional under legacy containment until Stage 8;
- compare application-version semantics with Stage 3’s gig-version reference before any generalization.

Explicit exclusions:

- no Q&A/revision redesign;
- no selection redesign;
- no reconsideration redesign;
- no mutation of historical versions;
- no generic version component unless Stage 3 and Stage 4 semantics genuinely align.

Acceptance criteria:

- version 1 and later immutable versions remain readable;
- editing creates the existing canonical new version rather than overwriting history;
- withdrawal, gig-change actions, and material-gig-change reapplication remain state-correct;
- invalidated selection state remains representable for the later Stage 7 flow;
- Closure reasons remain honest and role-safe;
- the final 7K application-detail scenario remains structurally supportable even before its final locator update.

Risk: **High**, due to immutable history and cross-authority invalidation effects.

### Stage 5 — Client applicant inbox and review

**Goal:** Migrate the 7E client-private applicant review workflow without leaking private ranking or shortlist state.

Primary routes:

```text
/gigs/:gigId/applicants
/gigs/:gigId/applicants/:applicationId
```

Primary implementation scope:

- redesign applicant inbox ranking, filtering, grouping, and state lanes using real backend projections;
- preserve honest keyword fallback and explainable matching evidence;
- redesign applicant detail around proposal/version evidence and client-authorized review actions;
- preserve shortlist, advance, return, Not Selected, and the controlled 7E **Reopen Application** action from Not Selected to Under Review;
- maintain private shortlist and decision boundaries;
- retain Q&A, selection, and reconsideration integrations under safe legacy containment until their owning stages.

Explicit exclusions:

- no mock percentages or synthesized rankings;
- no freelancer exposure to shortlist or private client reports;
- no Q&A, selection, or reconsideration workflow redesign;
- no frontend-computed eligibility in place of action projections.

Acceptance criteria:

- client A cannot read or mutate another client’s applicant records;
- freelancer users cannot reach client review routes;
- private shortlist state never appears in freelancer DTOs or surfaces;
- fallback ranking is labeled honestly;
- authorized review actions retain their real capacity, terminal, Reopen Application, withdrawal, and conflict behavior;
- record context clears across gig/applicant transitions.

Risk: **High**, because this stage contains client-private evidence and race-sensitive review actions.

### Stage 6 — Structured Q&A and proposal revision

**Goal:** Migrate the 7F clarification and proposal-revision workflow independently of selection.

Primary integration routes:

```text
/applications/:applicationId
/applications/:applicationId/edit
/gigs/:gigId/applicants/:applicationId
```

Primary implementation scope:

- redesign structured Q&A thread presentation;
- preserve server-derived thread modes and permissions, request-ID/idempotency behavior, exact application/material-version authority, blockers, rate/safety state, the optimistic application-version token exposed by revision submission, and server-projected available actions;
- present questions, answers, focused messages, closure, and revision state accurately;
- redesign client proposal-revision requests;
- redesign freelancer submission of a complete revised proposal version;
- preserve canonical complete proposal payloads and immutable version insertion;
- show source, requested consequence, current version, and resulting version clearly.

Explicit exclusions:

- no selection-request redesign;
- no engagement or reconsideration redesign;
- no client-side reconstruction of Q&A permissions;
- no partial proposal patch masquerading as a complete revision;
- no combined Q&A/selection super-panel.

Acceptance criteria:

- each actor sees only authorized Q&A actions;
- a revision request links to a complete proposal update flow;
- submitting a revision creates the authoritative new application version;
- review and Q&A state remain synchronized after refetch;
- stale/conflicting actions produce controlled UI outcomes;
- no private shortlist state crosses into the freelancer experience.

Risk: **High**, due to mode-specific permissions, revisions, and concurrency.

### Stage 7 — Exact-version selection request and confirmation

**Goal:** Migrate 7G selection as its own version-bound, concurrency-sensitive authority.

Primary integration routes:

```text
/applications/:applicationId
/gigs/:gigId/applicants/:applicationId
```

Primary implementation scope:

- redesign selection context and request history;
- present the exact bound application and gig versions;
- preserve client send and cancellation behavior plus expiry and invalidation;
- preserve the four distinct freelancer response semantics exactly: `accept` (**Accept Exact Terms**), `decline_remain_interested` (**Decline while Remaining Interested**), `decline_withdraw` (**Decline and Withdraw Completely**), and `request_revised_terms` (**Request Revised Terms**); user-facing wording may be refined without merging these consequences;
- preserve any additional server-projected selection action without collapsing distinct consequences into a generic response;
- communicate that acceptance applies only to unchanged exact terms;
- preserve fan-out closure for other applicants;
- preserve creation of exactly one valid engagement/current winner;
- make pending, accepted, declined, cancelled, expired, and invalidated outcomes distinguishable.

Explicit exclusions:

- no selection action from the global command surface;
- no hidden auto-acceptance;
- no acceptance against a newer or different proposal version;
- no client-side eligibility or winner selection;
- no engagement lifecycle redesign.

Acceptance criteria:

- application edits invalidate outdated pending requests as before;
- acceptance binds the exact unchanged terms;
- competing or stale operations have controlled outcomes;
- non-selected applicants receive the authoritative closure reason;
- unauthorized users cannot inspect or act on requests;
- focused regression preserves selection invalidation and confirmation semantics.

Risk: **Critical**, because exact-version, expiry, idempotency, concurrency, and fan-out closure meet here.

### Stage 8 — Engagement lifecycle, failed-engagement Gig Reopening, and reconsideration

**Goal:** Establish the final Engagement Workspace composition and migrate all 7H lifecycle and recovery behavior.

Primary routes:

```text
/engagements
/engagements/:engagementId
/applications/:applicationId
/applications/:applicationId/edit
/gigs/:gigId/applicants/:applicationId
```

Primary implementation scope:

- redesign the engagement list;
- establish the final Engagement Workspace structure;
- present immutable accepted terms and exact version bindings;
- migrate the lightweight lifecycle: confirmed, kickoff pending, in progress, completion pending, completed, cancellation pending, and cancelled;
- migrate lifecycle timeline presentation using the existing explicit event authority;
- preserve the exact projected lifecycle actions: `prepare_kickoff` (**Prepare for Kickoff**), `start_work` (**Mark Work Started**), `request_completion` (**Request Completion**), `confirm_completion` (**Confirm Completion**), `reject_completion` (return to In Progress), `request_cancellation` (**Request Cancellation**), `withdraw_cancellation` (**Withdraw Cancellation Request**), and `acknowledge_cancellation` (**Acknowledge Cancellation**);
- preserve the backend’s participant, counterparty, requester-only, current-state, action-token, and idempotency rules for those actions;
- migrate the distinct 7H failed-engagement **Gig Reopening** operation;
- migrate reconsideration invitation, cancellation, decline, reaffirmation, and updated proposal submission as exposed by real authority;
- integrate reconsideration back into application, application-edit, and applicant-detail surfaces;
- preserve application history when reconsideration creates a fresh version;
- create an isolated, stable integration region for the existing Secure Contact Exchange.

Cross-route requirement:

Reconsideration belongs architecturally to 7H but intentionally appears outside the engagement route. Stage 8 is incomplete unless all four owning presentations remain coherent:

```text
/applications/:applicationId
/applications/:applicationId/edit
/gigs/:gigId/applicants/:applicationId
/engagements/:engagementId
```

Contact-slot requirement:

Stage 8 finalizes the Engagement Workspace composition around an isolated contact region. The existing `SecureContactExchange` remains fully functional inside that region. Stage 9 changes contact presentation only and must not require another Engagement Workspace architecture rewrite.

Explicit exclusions:

- no project-management claims;
- no task boards, deliverable management, timesheets, milestones, payments, or work verification;
- no contact-domain refactor;
- no plaintext relocation or caching;
- no reconsideration grouping under 7F or 7G merely because it appears on application routes.

Acceptance criteria:

- both participants see the same authoritative engagement and accepted terms;
- lifecycle actions remain participant- and state-correct;
- completed and cancelled terminal behavior remains honest;
- failed-engagement Gig Reopening preserves historical winner/version evidence and reopens only the allowed gig dimension;
- reconsideration remains bound to the source cancelled engagement and its Gig Reopening;
- reconsideration updates create fresh immutable application versions through existing authority;
- all cross-route reconsideration entry points work;
- Secure Contact Exchange continues to pass its existing behavior inside the stable slot.

Risk: **Critical**, due to lifecycle concurrency, exact accepted terms, reopening, and cross-route recovery behavior.

### Stage 9 — Secure Contact Exchange

**Goal:** Migrate 7I contact presentation in isolation inside the stable Stage 8 Engagement Workspace.

Primary route:

```text
/engagements/:engagementId
```

Primary implementation scope:

- redesign masked contact share presentation;
- preserve verified source/status distinctions;
- redesign consent creation, reveal, hide, revocation, reshare history, block, and report interactions;
- keep each contact method and direction distinct;
- preserve controlled source invalidation and stale reveal denial;
- ensure warning and consequence language remains honest;
- retain contact-specific error handling and no-cache response expectations.

The exact contact method identifiers remain:

```text
verified_email
verified_phone
whatsapp_phone
meeting_link
professional_profile
```

`verified_phone` and `whatsapp_phone` are separate consents. WhatsApp availability remains self-declared on top of the confirmed phone source; it is not a separate phone-verification claim.

Non-negotiable security boundary:

- full contact values exist only in the reveal response and local reveal component state;
- reveal state is cleared on hide, unmount, route change, revocation, denial, and logout as appropriate;
- plaintext never enters the engagement DTO, timeline, global state, command context, logs, URL, cookies, local storage, session storage, or generic cache;
- Stage 9 does not generalize, relocate, or restructure plaintext ownership;
- contact RPCs do not mutate engagement lifecycle;
- the frontend never fetches or navigates to a revealed meeting URL automatically.

Explicit exclusions:

- no Engagement Workspace architecture rewrite;
- no contact value in shared record descriptors;
- no optimistic reveal replay;
- no persistence “for convenience”;
- no external network request caused by displayed contact content.

Acceptance criteria:

- reveal responses still require `Cache-Control: private, no-store`, `Pragma: no-cache`, and `Expires: 0`;
- revoked or stale reveal is denied without showing plaintext;
- blocking and reporting retain their separate authority and do not block mandatory engagement lifecycle actions;
- contact values remain absent after refresh and from browser artifacts;
- no unexpected external request is introduced;
- the complete existing contact proof remains semantically supportable.

Risk: **Critical security/privacy**.

### Stage 10 — Profiles, resume/gig parsing, and matching inputs

**Goal:** Migrate the profile and reviewed-input surfaces that feed discovery and matching without overstating raw extraction quality.

Primary routes:

```text
/profile/freelancer
/profile/client
/profile/resume-parse
/gigs/:id/parse
```

Primary implementation scope:

- redesign freelancer and client profiles;
- redesign resume document extraction and reviewed resume parse workflow;
- redesign gig requirement extraction and review workflow;
- present extracted, reviewed, missing, and saved states distinctly;
- clarify how profile and reviewed parse data contributes to matching;
- preserve privacy boundaries around raw text, vectors, internal fields, and restricted metadata;
- connect these surfaces back to real discovery/matching inputs without fabricating causality.

Explicit exclusions:

- no claim that extraction is infallible;
- no raw source or embedding exposure;
- no invented verification workflow;
- no matching score fabrication;
- no broad matching-algorithm rewrite for visual convenience.

Acceptance criteria:

- existing profile read/write behavior is preserved;
- extraction and review remain separate concepts;
- only reviewed/authorized fields enter normal product presentation;
- parsing errors and unsupported documents remain controlled;
- matching explanations remain honest about keyword, semantic, hybrid, or fallback evidence.

Risk: **Medium-high**, due to privacy and downstream matching implications.

### Stage 11 — Public landing and authentication

**Goal:** Complete the Switchboard visual system across public entry, login, and signup without changing authentication authority.

Primary routes:

```text
/
/login
/signup
```

Primary implementation scope:

- redesign the public landing page in the Switchboard editorial language;
- redesign login and signup forms;
- preserve the real freelancer/client signup-role selection and its authoritative profile persistence; admin signup remains unavailable;
- preserve real authentication and trusted role resolution;
- preserve authenticated redirect, wrong-role redirect, logout, and browser-back denial behavior;
- make product claims match implemented GigMatch scope;
- ensure the transition from public/auth pages into the authenticated shell is coherent.

Explicit exclusions:

- do not turn the Switchboard prototype role toggle into post-auth runtime role switching;
- do not expose admin signup;
- no unsupported product claims such as payments, contracts, delivery management, or universal AI ranking;
- no auth token persistence changes without separate security review;
- no remote marketing assets that violate the network-origin boundary.

Acceptance criteria:

- login/signup errors remain controlled and accessible;
- authenticated users land on the correct real role dashboard;
- logout and browser back do not restore protected content;
- public pages remain responsive at all representative widths;
- public messaging accurately describes the implemented marketplace.

Risk: **Medium**, with high sensitivity around auth regressions.

### Stage 12 — Admin surfaces

**Goal:** Apply Switchboard presentation to the isolated admin evaluation experience without mixing it with global cleanup.

Primary route:

```text
/dashboard/admin
```

Primary implementation scope:

- redesign evaluation summary, metric results, ranking comparisons, strategy comparisons, query comparisons, and limitations;
- preserve admin authorization;
- retain honest metric definitions and limitations;
- preserve large-table usability and accessible comparison structure;
- use Switchboard density without sacrificing analytical readability.

Explicit exclusions:

- no global legacy deletion;
- no matching/evaluation algorithm changes for presentation convenience;
- no admin workflow mutations that do not exist;
- no exposure of restricted internal data.

Acceptance criteria:

- only admin users can access the route;
- evaluation data and limitation language remain unchanged in meaning;
- tables and comparisons work at representative widths;
- frontend tests, lint, and build pass before entering the Closure Gate.

Risk: **Medium-low** relative to workflow stages, but analytically dense.

## 10. Per-stage verification policy

### 10.1 Required checks for every stage

At minimum:

- focused tests for new or changed presentation/view logic;
- existing frontend test suite;
- ESLint;
- TypeScript production build;
- manual route and role audit for the changed slice;
- loading, empty, controlled error, forbidden, and not-found states as relevant;
- representative-width visual inspection;
- keyboard and focus inspection for changed interactive surfaces;
- confirmation that untouched routes remain reachable;
- confirmation that route-level lazy imports remain intact.
- repository whitespace validation with `git diff --check`;
- beginning/end worktree inspection with `git status --short`.

Current frontend commands:

```bash
cd frontend
npm test
npm run lint
npm run build

cd ..
git diff --check
git status --short
```

`git status --short` is evidence, not a requirement for a clean tree. Pre-existing and unrelated changes belong to the user and must be preserved.

### 10.2 Backend verification

Backend tests use standard-library `unittest`, not pytest.

If a stage is presentation-only, run focused backend checks only when needed to diagnose a contract question. If an approved backend extension is introduced, run the relevant focused backend tests and the appropriate discovery suite.

Canonical full discovery shape:

```bash
cd backend
./.venv/bin/python -m unittest discover -s tests
```

Do not describe backend coverage as pytest coverage.

### 10.3 Browser verification and 7K compatibility

The current `frontend/e2e/milestone-7k.mjs` is a single orchestrated proof. It does not currently expose independent scenario-selection flags.

Locked policy:

- add focused redesign browser checks where useful;
- do not weaken, reinterpret, or replace `milestone-7k.mjs`;
- when redesign changes invalidate a selector, preserve the semantic assertion and update only the UI-facing locator;
- keep final 7K scenarios structurally supportable throughout the migration;
- do not postpone all compatibility thinking until closure;
- the complete 7K-equivalent security/integration proof is mandatory at the Closure Gate.

The reproducible full browser command documented by Milestone 7K is:

```bash
backend/.venv/bin/python scripts/run_milestone_7k_browser.py
```

The full proof must continue to cover:

- primary marketplace closure;
- selection invalidation;
- engagement lifecycle and secure contact;
- authentication and cross-user/cross-role isolation;
- controlled lazy-route failure;
- sanitized ordinary responses;
- no unexpected external requests;
- no retained contact sentinel in browser artifacts.

### 10.4 Visual acceptance gate

Each stage must compare the migrated slice to the selected Switchboard reference at 1440, 1024, 768, and 390 px.

Review:

- palette fidelity;
- actual production typography;
- border weight and continuity;
- offset-shadow discipline;
- information density;
- editorial header hierarchy;
- command/context integration;
- active-record continuity where applicable;
- lane/row behavior;
- absence of generic card proliferation;
- responsive recomposition;
- accessible focus, contrast, and reduced motion.

Visual fidelity does not authorize fake data, fake behavior, or a security regression.

#### Closure Gate browser-proof precision amendment

Previously approved per-stage browser, responsive, accessibility, and visual evidence remains valid unless final Closure Gate cleanup changes the relevant route/shared dependency or exposes a regression. Final browser verification focuses on cross-stage integration, role/security boundaries, the supplied real participant accounts, high-risk workflow continuity, and surfaces affected by final legacy removal. Existing `PARTIAL / NOT RUN` evidence is never silently promoted to PASS.

### 10.5 Durable per-stage closure artifacts

The locked plan preserves migration intent. Stage closure documents preserve what actually happened, allowing a future chat to recover execution history without relying on conversation memory.

Create one closure artifact after each implemented stage:

```text
docs/frontend/verification/switchboard-stage-01-closure.md
docs/frontend/verification/switchboard-stage-02-closure.md
docs/frontend/verification/switchboard-stage-03-closure.md
docs/frontend/verification/switchboard-stage-04-closure.md
docs/frontend/verification/switchboard-stage-05-closure.md
docs/frontend/verification/switchboard-stage-06-closure.md
docs/frontend/verification/switchboard-stage-07-closure.md
docs/frontend/verification/switchboard-stage-08-closure.md
docs/frontend/verification/switchboard-stage-09-closure.md
docs/frontend/verification/switchboard-stage-10-closure.md
docs/frontend/verification/switchboard-stage-11-closure.md
docs/frontend/verification/switchboard-stage-12-closure.md
docs/frontend/verification/switchboard-migration-closure.md
```

Each stage closure must record:

- stage number, name, and closure status;
- starting and ending branch, HEAD, and `git status --short` evidence;
- pre-existing user-owned changes that were preserved;
- exact scope completed and files changed by the stage;
- approved deviations from this locked plan;
- implementation decisions that do not alter the locked architecture;
- tests, commands, and results;
- browser, keyboard, accessibility, and representative-width visual checks;
- bundle delta where relevant;
- known limitations or deferred work;
- an explicit statement that later-stage work was not pulled forward;
- implementation-complete, verification-complete, and user-approval status as separate facts.

An implementation agent must not claim user approval merely because implementation and automated verification completed. Until approval is explicit, the closure artifact must say so.

## 11. Switchboard Migration Closure Gate

This is a formal milestone closure, not a cleanup or polish sprint.

Migration closes only when:

```text
all routes migrated
        +
legacy implementation proven unused
        +
full functional regression
        +
security and privacy regression
        +
responsive and visual proof
        +
bundle and lazy-loading proof
        =
Switchboard migration closed
```

### 11.1 Route and implementation convergence

- Every production route has an intentional final Switchboard presentation.
- No route depends on concept fixtures or prototype state.
- No route unexpectedly falls back to an unreviewed legacy canvas.
- Route URLs and protected-role behavior match the approved route inventory.
- All route imports remain intentionally split or have an explicitly approved reason not to be.

### 11.2 Legacy removal

- Audit imports, references, selectors, styles, and build output.
- Remove only components and styles proven unused.
- Do not delete based on naming or appearance alone.
- Re-run the full verification set after removals.
- Keep historical concept directories unless a separate task explicitly authorizes their removal.

### 11.3 Functional regression

All database resets, pgTAP checks, advisors, concurrency harnesses, and browser fixtures must run only against the fail-closed guarded local GigMatch stack. The Closure Gate never authorizes a hosted migration, hosted reset, deployment, or destructive operation against an unverified target.

- Run the complete frontend test suite, ESLint, TypeScript, and production Vite build.
- Run the full backend standard-library `unittest` discovery.
- Replay and run the complete database pgTAP gate; the 7K reference baseline was 10 files and 526 assertions, and the discovery/assertion total must not silently decrease.
- Run database schema lint and inspect database advisor output for security regressions.
- Run all eight existing independent-session concurrency harnesses: 7B, 7C-B, 7D, 7E, 7F, 7G, 7H, and 7I.
- Run the complete 7K-equivalent browser proof.
- Run `git diff --check` and inspect `git status --short` without discarding user-owned changes.
- Verify primary marketplace flow from gig publication through confirmed engagement.
- Verify application versioning, Q&A, revision, selection invalidation, confirmation, and closure.
- Verify engagement lifecycle, cancellation, failed-engagement Gig Reopening, and reconsideration.

### 11.4 Security and privacy regression

- Verify unauthenticated and wrong-role denial.
- Verify cross-client and cross-freelancer isolation.
- Verify private shortlist/report boundaries.
- Verify response sanitization and absence of forbidden fields.
- Verify contact reveal no-store behavior.
- Verify stale reveal denial, revocation, block, and report behavior.
- Verify contact plaintext is absent from URLs, cookies, local/session storage, ordinary responses, logs, and retained test artifacts.
- Verify zero unexpected external HTTP(S) origins.

### 11.5 Visual and responsive proof

- Audit every representative route at 1440, 1024, 768, and 390 px.
- Compare against the locked Switchboard design language rather than generic dashboard conventions.
- Verify navigation, command/context, record continuity, forms, dialogs, tables, lanes, empty states, and errors.
- Verify keyboard-only operation, focus restoration, contrast, reduced motion, and non-hover access.

### 11.6 Bundle and failure proof

Milestone 7K’s reference production bundle retained 40 JavaScript chunks, a 461,593-byte main JavaScript chunk, 736,206 total JavaScript bytes, and no greater-than-500 kB Vite warning.

These exact byte counts are a comparison baseline, not a permanent byte-for-byte invariant. Closure must:

- compare chunk count and main/total bundle deltas;
- investigate material growth, especially shell-wide dependencies and fonts;
- retain route-level splitting;
- retain no greater-than-500 kB warning unless separately justified and approved;
- prove a lazy-import failure produces a recoverable shell rather than a blank application.

### 11.7 Closure artifact

Create `docs/frontend/verification/switchboard-migration-closure.md` containing:

- final route matrix;
- tests and commands run;
- visual-width evidence;
- bundle comparison;
- full browser result;
- security/privacy result;
- legacy removal evidence;
- known limitations and explicitly deferred product extensions.

## 12. Non-negotiable exclusions

The migration does not authorize:

- fake role switching;
- mock applicant percentages or synthetic scores;
- invented global search;
- command-driven workflow mutations;
- client-side authorization or eligibility truth;
- global action-token storage;
- global contact plaintext storage;
- remote runtime fonts, CDNs, analytics, or unrelated network origins;
- payments, escrow, contracts, signatures, invoices, refunds, or dispute systems;
- task boards, detailed milestones, timesheets, or work-delivery management;
- automatic ranking by price;
- unsupported reviews, ratings, or behavioral-learning claims;
- giant one-pass frontend replacement;
- speculative universal architecture built before real repetition;
- weakening tests to accommodate the redesign.

## 13. Decision log

### Locked decisions

1. Switchboard is the design authority; the real application remains the product authority.
2. The exact concept path is `concepts-gpt-2/src/concepts/switchboard`.
3. The migration uses 12 implementation stages plus a formal closure gate.
4. Q&A/revision and selection are separate stages aligned with 7F and 7G.
5. Reconsideration belongs to Stage 8/7H even though its UI spans application and applicant routes.
6. Secure Contact Exchange is an isolated Stage 9/7I migration.
7. Stage 8 finalizes the Engagement Workspace composition and stable contact slot.
8. The correct term is Engagement Workspace, never Delivery Workspace.
9. Admin implementation is separate from legacy convergence/removal.
10. The command/context surface is non-mutating navigation/context, not a fake command engine.
11. Active-record context is route-local/derived by default and never persisted.
12. The legacy adapter is layout-only and does not translate state, data, APIs, tokens, or props.
13. Runtime external font/CDN dependencies are forbidden.
14. Production typography is resolved in Stage 1, preferably with approved local font packages/assets.
15. Navigation labels remain a Stage 1 design decision; route URLs remain stable.
16. Gig Detail is a shared authorized route and must be cross-role safe.
17. No-backend-change is a default; a genuinely missing authoritative capability requires a minimal approved extension.
18. Gig-version presentation starts narrow in Stage 3 and generalizes only after Stage 4 proves repetition.
19. The existing 7K proof remains semantically intact; focused redesign checks supplement it.
20. Closure is a milestone acceptance gate, not a cleanup phase.
21. Stage 1 installs a freelancer/client participant shell; admin remains isolated until Stage 12 and public/auth remain outside it until Stage 11.
22. Stage 2 is explicitly bound to 7C-A discovery, detail, pagination, recommendation, ranking-context, and fallback authority; no advanced filtering is implied.
23. Material-gig-change reapplication, 7E Reopen Application, and 7H failed-engagement Gig Reopening are separate operations and must be named distinctly.
24. Legitimate freelancer/client role choice remains part of signup; the concept role toggle never becomes post-auth runtime switching, and admin signup remains unavailable.
25. Every stage produces a durable closure artifact, while the master plan changes only through explicit source-of-truth approval.
26. The final Closure Gate reruns the complete frontend, backend, database, concurrency, browser, repository-hygiene, visual, and bundle proof.
27. Previously approved per-stage browser, responsive, accessibility, and visual evidence remains valid unless Closure Gate cleanup changes the relevant route/shared dependency or exposes a regression; Closure Gate browser work focuses on cross-stage integration, role/security boundaries, supplied real participant accounts, high-risk continuity, and legacy-removal surfaces, and never silently promotes existing `PARTIAL / NOT RUN` evidence to PASS.

### Rejected approaches

- copying Switchboard prototype state into production;
- merging Q&A, selection, and reconsideration into one stage;
- merging engagement and secure contact into one redesign stage;
- calling the engagement area a delivery workspace;
- removing the command surface merely because a global command API does not exist;
- turning the command surface into workflow execution;
- storing action tokens globally;
- exposing fake role toggles or fake ranking values;
- bundling admin work with cross-application legacy deletion;
- loading fonts from runtime external origins;
- postponing all 7K compatibility work until final closure;
- treating responsive work as desktop stacking only;
- allowing a layout adapter to become a data/contract translation layer.

## 14. Instructions for future agents and chats

Before implementing any stage, a new agent must:

1. read this document completely;
2. inspect the current worktree and preserve user-owned changes;
3. read the selected Switchboard concept without modifying it;
4. read the relevant frontend pages, API libraries, backend routes/contracts, and milestone invariant/closure documents for that stage;
5. confirm the previous migration stage is approved and closed;
6. produce a stage-specific implementation plan limited to that stage;
7. identify exact files likely to change, risks, and tests;
8. avoid pulling later-stage redesign work forward;
9. implement, verify, and report only the approved stage;
10. write ordinary implementation details, test evidence, and approved stage-local deviations to the stage closure artifact—not this master plan;
11. do not modify this locked plan during ordinary stage implementation;
12. modify this document only when the user explicitly approves changing the architecture/source of truth itself, then record that plan amendment in the decision log.

The next planned artifact after this locked roadmap is the **Stage 1 implementation prompt**. It must not regenerate or reinterpret the entire roadmap.

## 15. Authoritative repository references

Future work should consult at least the relevant subset of:

```text
milestone-7-product-spec.md
docs/verification/milestone-7-closure.md
docs/verification/milestone-7a-closure.md
docs/verification/milestone-7b-closure.md
docs/verification/milestone-7c-a-closure.md
docs/verification/milestone-7c-b-closure.md
docs/verification/milestone-7d-invariant-map.md
docs/verification/milestone-7e-invariant-map.md
docs/verification/milestone-7f-invariant-map.md
docs/verification/milestone-7g-invariant-map.md
docs/verification/milestone-7h-invariant-map.md
docs/verification/milestone-7i-invariant-map.md
docs/verification/milestone-7j-invariant-map.md
docs/verification/milestone-7k-invariant-map.md
docs/verification/milestone-7k-closure.md
frontend/src/App.tsx
frontend/src/context/AuthContext.tsx
frontend/src/lib/
frontend/src/pages/
frontend/e2e/milestone-7k.mjs
scripts/run_milestone_7k_browser.py
concepts-gpt-2/src/concepts/switchboard/
```

Repository evidence outranks assumptions. If implementation has evolved since this document was locked, reconcile the new evidence with these architectural decisions explicitly rather than silently following stale file names.
