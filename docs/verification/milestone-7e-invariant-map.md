# Milestone 7E Invariant Map

This map was created before the Milestone 7E migration or implementation changes.
It records the repository on branch `main` at commit
`34ea1efa1afda60408afdb31700d86c434bc4ddd`. The branch is one commit ahead of
`origin/main`. The starting working tree contains 26 entries: the complete,
verified but uncommitted Milestone 7D implementation and two unrelated untracked
concept directories. Those changes are preserved. No reset, restore, stash,
checkout, commit, push, or presentation-branch operation is permitted.

## Application and application-version authority

`public.applications` is the mutable current-state aggregate. Its identity is
`id uuid`; it is bound to `gig_id -> public.gigs.id` and
`freelancer_profile_id -> public.freelancer_profiles.id`. It stores the current
applicant-visible `stage`, required `current_version_id`, `submitted_at`,
`last_updated_at`, `stage_changed_at`, acting-user projection, structured stage
reason projection, and nullable paired submission idempotency fields.

The database enforces:

- one history per `(gig_id, freelancer_profile_id)`;
- one current version belonging to the same application;
- one confirmed application per gig;
- immutable application identity, gig, freelancer, submission time, and
  submission-idempotency identity;
- no physical application deletion;
- active stages without terminal reason metadata and terminal stages with their
  exact structured reason origin.

`public.application_versions` is immutable applicant-authored history. Each row
has exact `(application_id, gig_id)` and `(gig_id, gig_version_id)` bindings,
positive sequential `version_number`, an allowed origin, complete split snapshot
fields (`cover_note`, proposal, timeline, availability, scope, and nullable
`scope_notes`), generated proposal/payment/currency projections, actor, and
timestamp. The parent row is locked for chronology; versions cannot be updated
or deleted.

The current application version is the exact row referenced by
`applications.current_version_id`. Milestone 7E list and detail DTOs must use
that retrieved identity consistently. It may not rank one version and display a
later refetch.

## Gig and gig-version authority

Gig ownership remains:

```text
public.gigs.client_id -> public.user_profiles.id
```

`client_profiles.id` is not ownership authority. `client_profiles.user_id` may
contribute sanitized presentation fields only.

`public.gigs` stores orthogonal authoritative state:

- `opportunity_lifecycle`: `draft | active | filled | cancelled`;
- `application_intake`: `accepting | closed`;
- `operational_state`: `active | paused`;
- the derived six-state product `status`;
- `current_gig_version_id` for display;
- `current_material_gig_version_id` for current material suitability authority.

Both pointers are exact same-gig foreign keys to immutable
`public.gig_versions`. A minor correction changes only the display pointer; a
material edit changes both and invalidates an effective selection request.

Milestone 7E suitability authority is the current material gig version.
Historical proposal and commercial authority is the current immutable
application version and its exact answered `gig_version_id`. These identities
must remain separate.

## Ownership relationships

The authenticated route chain is:

```text
verified Supabase bearer token
-> trusted public.user_profiles lookup
-> trusted role = client
-> authenticated user_profiles.id
-> gigs.client_id ownership predicate
-> application.gig_id binding
```

Freelancer application ownership remains
`applications.freelancer_profile_id -> freelancer_profiles.id ->
freelancer_profiles.user_id -> user_profiles.id`.

Missing, cross-client, guessed, and application/gig-mismatched resources must
collapse to public `404 applicant_review_not_found`. The browser supplies no
acting user, owner, freelancer, capacity, stage, score, mode, event, timestamp,
allowed action, blocker, review version, or material-version authority.

## Existing application transitions

The verified stage graph is:

- `under_review -> advanced | not_selected | withdrawn |
  closed_gig_cancelled`;
- `advanced -> under_review | not_selected | withdrawn | confirmed |
  closed_gig_cancelled`;
- `not_selected -> under_review` only through controlled reopen;
- `withdrawn -> under_review` only through reconsideration or the distinct
  material-gig reapplication action;
- confirmed and gig-cancelled closure remain terminal in 7E.

Milestone 7E adds no stage. Internal shortlist remains private state, not an
application stage. It adds only controlled client transitions already present
in the 7A graph: advance, return, Not Selected, and reopen.

The existing Not Selected vocabulary is:

`required_skills_mismatch`, `experience_level_mismatch`,
`proposal_exceeded_budget`, `timeline_or_availability_mismatch`,
`stronger_overall_match`, `gig_requirements_changed`, the system-reserved
`another_applicant_selected`, and `other`.

The existing reconsideration vocabulary is reused for reopen:
`gig_materially_changed`, `failed_engagement_reopened`,
`client_reconsideration`, `freelancer_invited_back`, and `other`.

## Selection-request blocking rules

`public.selection_requests` binds one exact application version and gig version.
Only one stored `pending` request per gig is allowed. An effective request is:

```text
status = pending AND expires_at > authoritative database time
```

Expired stored-pending rows are not effective. For 7E, an effective request
targeting the application blocks return-to-review and Not Selected. Reopen and
advance are valid only from stages that cannot carry an effective request.
Milestone 7E does not create, respond to, expire, or otherwise implement
selection-request UI or behavior.

## Marketplace event contract

`public.marketplace_events` is the existing append-only audit mechanism. It has
an event type, schema version, visibility, actor, optional aggregate references,
structured reason fields, sanitized object payload, and server timestamp.
Rows cannot be updated or deleted.

Visibility values are `participants`, `client_private`,
`freelancer_private`, and `admin_internal`. Existing RLS resolves visibility
through trusted participant/ownership helpers.

7E will use:

- `application_shortlisted` / `application_unshortlisted` as `client_private`;
- `application_advanced`, `application_returned_to_review`,
  `application_not_selected`, and `application_reopened` as `participants`.

Structured feedback can be stored in the reference-oriented event payload
without adding a second audit system. Existing payload safety rejects proposal
or accepted snapshots, raw resume/parse content, contact values, credentials,
tokens, service-role data, embeddings, raw semantic text, and secrets.

## Matching input and ranking architecture

The current matching engine is pure and reusable:

```text
loaded structured profile + latest reviewed/parsed resume parse
-> build_freelancer_match_profile

loaded gig + latest reviewed/parsed gig parse
-> build_gig_match_profile

normalized gig + normalized freelancers
-> existing keyword or hybrid ranker
-> deterministic explanation and skill-gap pipeline
```

Keyword, semantic, hybrid weighting, normalization, embedding text,
explanation, skill-gap, and safe provider-fallback reason vocabularies are
locked. Price and application proposal content are absent from matching
profiles and therefore cannot influence suitability.

The existing client recommendation path ranks every platform freelancer and is
not a valid applicant-inbox source. 7E must instead start with every application
for the owned gig, hydrate the exact current version, answered version, safe
profile summary, current matching inputs, and optional private review state,
rank only the rankable applicant subset against the current material gig, then
left-join results onto the complete pool before sorting and pagination.

The current `RankingMetadata` contract requires a real numeric score. That is
not a contradiction: 7E will add an applicant-specific `ranking_status` and
nullable applicant evidence DTO while leaving existing scored matching
contracts unchanged. One recognized provider-level semantic failure converts
the complete rankable subset to keyword fallback; a candidate-specific missing
input leaves only that candidate unrankable.

## RLS and database privileges

RLS is enabled on all marketplace tables. Browser roles have participant-safe
SELECT only on applications, versions, gig versions, selection requests,
engagements, and visibility-scoped events. Direct marketplace DML is revoked.
The backend service path has controlled reads and only narrow backend RPC
execution.

Existing public mutation functions are owned by the trusted database owner,
`SECURITY DEFINER`, use `search_path = ''`, fully qualify relations, revoke
execution from `PUBLIC`, `anon`, and `authenticated`, and grant only
`service_role`.

The new private review-state table must follow a stricter model: RLS enabled;
no direct browser SELECT or DML; no `anon` or `authenticated` grants; controlled
service reads; service-only fixed-empty-search-path RPC mutations; immutable
identity and physical-delete protection. No RLS or event policy may leak
shortlist state to the freelancer.

## FastAPI boundaries

FastAPI verifies the Supabase token through `/auth/v1/user`, then loads the
trusted `user_profiles.role`. Marketplace repositories use the backend secret
for explicit REST reads and narrow RPC calls. Route dependencies are injectable
for database-independent `unittest` coverage.

Existing freelancer application routes build sanitized DTOs from a batched
hydrated aggregate, reuse exact application/gig version history, and expose
paginated immutable versions. 7E will use separate focused modules for:

- normalized owned-gig applicant-pool reads;
- applicant-only ranking orchestration;
- strict read and mutation contracts;
- stable review error mapping;
- owned applicant list/detail/version routes;
- review mutations and authoritative reload.

No raw database row is a public response contract.

## Lock order and time authority

The established global order is:

```text
gig
-> effective selection request when relevant
-> target applications in deterministic UUID order
-> private review-state row
-> immutable/reference-oriented event
```

7D uses `clock_timestamp()` after material locks for deadline and eligibility
decisions. 7E RPCs will acquire the gig lock first, acquire the relevant pending
request before the target application when applicable, then lock the target
application and review state. Capacity checks occur while the gig lock is held.
Action time is generated by PostgreSQL and never accepted from FastAPI or the
browser.

Terminal shortlist cleanup must run in the same transaction as every stage
transition, including existing 7C cancellation, 7D withdrawal, 7E Not Selected,
and future selection confirmation. It must not create rows and must change and
version only an active shortlist row.

## Frontend application-detail and comparison architecture

The frontend is React 19, React Router 7, Vite, TypeScript, and Tailwind. It uses
small fetch modules with Supabase-session bearer tokens, explicit runtime type
guards, pure view-model helpers tested through Node's built-in test runner, and
route-level protected-role wrappers.

Current freelancer routes are `/applications`,
`/applications/:applicationId`, and `/applications/:applicationId/edit`.
Application detail displays the exact current version, original submission,
answered/current material version context, material-change comparison,
response-required state, actions, blockers, and paginated immutable history.

7E will add distinct client routes:

```text
/gigs/:gigId/applicants
/gigs/:gigId/applicants/:applicationId
```

The client detail will reuse the same sanitized snapshot, version-history, and
gig-comparison shapes while adding current suitability evidence, private
review state, participant-visible review history, blockers, and separate
shortlist/decision tokens. The current score will never be attached to
historical application versions.

## Gig-state review policy

- Active/accepting and active/intake-closed: reads, shortlist organization, and
  valid stage decisions are allowed.
- Paused: reads and shortlist organization are allowed; applicant-visible stage
  decisions are blocked.
- Filled or cancelled: reads/history are allowed; every 7E mutation is blocked.
- Draft: a valid applicant-review aggregate should not exist and mutations fail
  closed.

## Conclusion

No genuine contradiction requires rewriting verified 7A-7D architecture.
Milestone 7E is additive: one private lazy review-state table, terminal cleanup,
service-only review RPCs, applicant-scoped read/ranking modules, client routes
and UI, and focused tests. Existing application/gig version authority,
ownership, matching algorithms, event history, RLS, privileges, lock order, and
freelancer contracts remain intact.
