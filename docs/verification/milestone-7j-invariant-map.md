# Milestone 7J invariant map

Date: 2026-07-26
Repository: `/Users/drivyaanshyadav/Desktop/Ai-Gig/gigmatch-ai`
Starting branch/commit: `main` at
`6461e5d582f803a885b61f9fc976c13013d8fd49`

## Preserved repository state

`main` starts synchronized with `origin/main`
(`origin/main...main = 0 0`). The only starting worktree entries are the
unrelated, untracked `concepts/`, `concepts-gpt/`, and
`concepts-gpt-forge/` trees. They are user-owned and remain outside Milestone
7J. No reset, restore, stash, discard, checkout, commit, push, deployment,
hosted migration, concept work, or presentation work is permitted.

Milestones 7B–7I are committed and form the locked authority stack. Milestone
7J is a read-model and navigation consolidation only.

## Existing dashboard and route map

The authenticated role routes already exist:

```text
/dashboard/freelancer
/dashboard/client
/dashboard/admin
```

`FreelancerDashboardPage` currently loads only the independent matching
recommendation endpoint. `ClientDashboardPage` is a placeholder. The admin
route is the verified matching-evaluation console and must remain unchanged.

Existing authoritative workflow destinations are:

```text
Freelancer
  /gigs
  /gigs/:gigId
  /applications
  /applications/:applicationId
  /engagements
  /engagements/:engagementId

Client
  /gigs/manage
  /gigs/new
  /gigs/:gigId/applicants
  /gigs/:gigId/applicants/:applicationId
  /engagements
  /engagements/:engagementId
```

Dashboard cards must only navigate to these routes. Destination pages reload
their own current authority and action tokens before mutation.

`ProtectedRoute` resolves the authenticated persisted profile and role before
rendering children. `AuthProvider`, `AppLayout`, `Navbar`, and
`ProtectedRoute` are shell/authorization modules and must remain eager.
Substantial page modules are currently eager imports in `App.tsx`.

## Existing role navigation

The current navbar presents workflow links in an inconsistent order and labels
the role dashboard as `freelancer Dashboard` or `client Dashboard`.
Milestone 7J will normalize it to:

```text
Freelancer: Dashboard · Find Gigs · My Applications · Engagements
Client:     Dashboard · Manage Gigs · Engagements · Create Gig
```

Admin navigation and the admin evaluation dashboard remain intact.

## Locked workflow authorities

The dashboard is not an aggregate authority. Current truth remains in:

```text
gig_versions
applications / application_versions
application_review_states
application_qa_threads / application_qa_messages
application_revision_requests
selection_requests
application_reconsideration_invitations
engagements
marketplace_events
contact_*
```

No dashboard table, mutable counter, event, expiry projection, notification,
read/seen state, action token, mutation endpoint, or persistence layer is
needed.

## Ownership and private boundaries

Persisted `user_profiles.id` and role are the dashboard identity authority.

```text
Freelancer application ownership
  applications.freelancer_profile_id
  -> freelancer_profiles.id
  -> freelancer_profiles.user_id

Client gig/application ownership
  gigs.client_id
  -> user_profiles.id

Engagement participation
  engagements.client_participant_user_id
  engagements.freelancer_participant_user_id
```

Client shortlist state is private and may appear only in the client dashboard.
The freelancer dashboard cannot contain shortlist presence or counts.

Dashboard responses must exclude proposal snapshots, cover notes, Q&A bodies,
revision reasons, accepted-term snapshots, private feedback, action tokens,
contact values/masks/consent, event payloads, Auth metadata, ranking internals,
and raw database rows.

## Canonical actionability rules

An effective selection request is exactly a stored `pending` row with
`expires_at > authoritative_now`. Dashboard reads never project stored expiry.

The existing canonical rules inspected before implementation are:

- `private.engagement_allowed_actions` for lifecycle permissions;
- the actor-specific resolution conditions in the engagement lifecycle;
- `private.reconsideration_result` for invitation availability;
- selection-response mutation checks for effective state, role, stage,
  current version bindings, active gig, open revisions, and existing winners;
- Q&A `thread_mode`/`thread_permissions` plus the matching PostgreSQL mutation
  checks for unresolved question response;
- revision-response mutation checks for open state, active gig, Advanced
  stage, and exact application/material-version bindings;
- the 7D updated-gig response rule based on the current application version's
  `gig_version_id` versus `gigs.current_material_gig_version_id`.

Dashboard attention will use shared private read helpers for reusable
engagement/reconsideration rules and narrow relational predicates identical to
the canonical mutation preconditions for selection, revision, Q&A, and
updated-gig responses. It will not manufacture action tokens.

One application can contribute several `action_kind + resource_id` items.
Action totals count rows; resource totals count distinct workflow resources.
The freelancer `response_required_applications` summary counts distinct
applications.

## Count populations

Freelancer:

```text
total_applications             all owned application histories
under_review_applications      owned current stage = under_review
advanced_applications          owned current stage = advanced
response_required_applications distinct owned applications with attention
effective_selection_requests   effective requests targeting the freelancer
active_engagements             participant engagements in five active states
```

Client:

```text
active_owned_gigs              owned opportunity_lifecycle = active
active_applications            owned applications in under_review or advanced
under_review_applications      owned current stage = under_review
advanced_applications          owned current stage = advanced
shortlisted_applications       private active shortlist on an active application
effective_selection_requests   effective requests for owned gigs
active_engagements             owned participant engagements in five active states
```

Engagement counts come only from `engagements`, never Confirmed application
history. Preview limits cannot affect totals.

## Read architecture

Two additive service-only functions are sufficient:

```text
dashboard_freelancer_get(uuid)
dashboard_client_get(uuid)
```

Each will:

- validate persisted role;
- capture one `authoritative_now`;
- use one SQL statement with shared CTEs;
- return complete totals plus bounded, deterministic previews;
- perform no write, lock, expiry projection, or event insertion;
- be `SECURITY DEFINER` with `search_path = ''`;
- be revoked from `PUBLIC`, `anon`, and `authenticated`;
- be executable only by `service_role`.

FastAPI will make one RPC call per core dashboard, validate a strict recursive
safe DTO, and send `Cache-Control: no-store, private` plus
`Pragma: no-cache`. Freelancer recommendations remain a separate existing
matching request and cannot fail the core dashboard.

## Existing bundle baseline

Before changing route imports:

```text
Vite modules transformed: 157
Main JS entry:             705.63 kB minified / 185.90 kB gzip
Emitted JS route chunks:  0
>500 kB warning:          present
```

The route graph imports every page eagerly. Milestone 7J can improve this with
role-authorized lazy page modules and a consistent loading/error boundary,
without manual chunk rules or splitting small components.

## Gate conclusion

No locked database state machine or mutation path requires redesign.
Milestone 7J is additive: two coherent service-only read projections, a strict
backend boundary, workflow dashboards, normalized role navigation, and
route-level lazy loading. Recommendations remain independent and the admin
evaluation dashboard remains preserved.
