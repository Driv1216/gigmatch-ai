# Milestone 7F Invariant Map

This map was created before the Milestone 7F migration or implementation.
Repository preflight was performed on branch `main` at commit
`34ea1efa1afda60408afdb31700d86c434bc4ddd`.

The starting working tree is intentionally dirty. It contains the complete
uncommitted Milestone 7D and 7E implementations, their verification artifacts,
and unrelated untracked `concepts/` and `concepts-gpt/` directories. Those
changes are user-owned and must be preserved. No reset, restore, stash,
checkout, commit, push, hosted migration, or presentation-branch operation is
permitted.

The replay order before 7F is:

```text
20260714225130_baseline_m0_m3.sql
20260714225138_milestone_7b_database_foundation.sql
20260718120000_milestone_7c_b_gig_management.sql
20260718120001_milestone_7c_b_selection_fill_compatibility.sql
20260720064417_milestone_7d_freelancer_applications.sql
20260724105437_milestone_7e_client_applicant_review.sql
```

## Product and participant boundary

Milestone 7F is an application-specific, pre-selection structured Q&A and
proposal-revision workflow. It is not general messaging. One thread is shared
only by the client who owns the application's gig and the freelancer who owns
the application. An explicitly trusted admin backend path may read where
required; browser roles receive no direct access to new tables.

Ownership is derived exclusively from trusted persisted relationships:

```text
client:
verified token
-> user_profiles.id and role=client
-> gigs.client_id
-> applications.gig_id

freelancer:
verified token
-> user_profiles.id and role=freelancer
-> freelancer_profiles.user_id
-> applications.freelancer_profile_id
```

The request body never supplies trusted sender identity, role, owner,
application stage, message sequence, server time, question allowance, thread
mode, rate policy, application-version ordinal, revision status, or audit event.
Missing, guessed, cross-client, and cross-freelancer resources collapse to a
non-enumerating `application_qa_not_found`.

## Application and application-version authority

`public.applications` remains the mutable current-state aggregate. Its
authoritative identity is `(id, gig_id, freelancer_profile_id)`. It stores the
current applicant-visible stage, exact `current_version_id`, stage change
metadata, and submission idempotency identity. The stage graph remains:

- `under_review -> advanced | not_selected | withdrawn |
  closed_gig_cancelled`;
- `advanced -> under_review | not_selected | withdrawn | confirmed |
  closed_gig_cancelled`;
- controlled reopen/reactivation paths return eligible terminal applications
  to `under_review`;
- confirmed and gig-cancelled closure remain terminal.

`public.application_versions` is the only official proposal truth. Each row is
an immutable, complete applicant-authored snapshot bound to one application,
gig, and exact gig version. The current proposal is the exact row referenced by
`applications.current_version_id`. Q&A bodies, answers, clarifications,
declines, and revision-request details never update proposal projections.

The 7D insertion helper `private.insert_application_version` owns sequential
version allocation and complete split-snapshot persistence. The existing
`private.validate_application_snapshot` function owns fixed/hourly/open
financial, timeline, availability, and scope validation. A linked revision
response must reuse both rather than duplicate validation. It needs the
distinct origin `proposal_revision_response`.

Existing ordinary edit, changed-gig response, withdrawal, and reapplication
RPCs lock the gig, relevant stored pending selection request, application,
version, and events in that order. 7F must preserve their public signatures and
behavior while adding only revision supersession where a current proposal
changes outside the linked response.

## Gig and material-version authority

`public.gigs` owns the authoritative orthogonal state:

- `opportunity_lifecycle`: `draft | active | filled | cancelled`;
- `application_intake`: `accepting | closed`;
- `operational_state`: `active | paused`;
- exact display and material gig-version pointers.

Existing applicant Q&A may continue when intake is closed or the application
deadline has passed. A paused, filled, cancelled, or draft gig is not writable.
Paused threads retain stored open revision requests but block action. Filled or
cancelled gigs close open revision requests as `closed_by_gig_state`.

`gigs.current_material_gig_version_id` is current material authority. A
revision request binds that exact identity as well as the exact current
application version. A material gig edit supersedes an open revision request.
The existing changed-gig response must complete before a new revision request
can be created.

## Selection-request interaction

`public.selection_requests` binds an exact application and application/gig
version. A request is effective only when stored `status = 'pending'` and
`expires_at > clock_timestamp()` after relevant locks.

An effective request targeting the application blocks revision-request
creation. A linked proposal update follows 7D edit semantics: if an effective
selection request targets the application, it is invalidated atomically before
the new proposal version is committed. Selection functionality itself remains
out of scope.

## Q&A thread authority and lazy lifecycle

`public.application_qa_threads` will be a mutable projection with at most one
row per application and exact composite application/gig binding. Absence means:

```text
empty history
next sequence = 1
initial client turns used = 0
pre-advancement discussion not stopped
full discussion never unlocked
```

The row is created only by the first Q&A mutation or first advancement
integration. It stores sequence/allowance/control projections, never message
bodies or proposal content. Identity is immutable and physical deletion is
blocked.

The permanent `full_discussion_unlocked_at` projection distinguishes never
advanced `under_review` from returned-to-review `under_review`. First entry to
`advanced` establishes it. It is never reset by return, Not Selected, reopen,
withdrawal, cancellation, or reapplication in the same application history.

## Derived interaction modes

Mode is derived in the backend and revalidated in every database mutation:

- `initial_clarification`: active, operational gig; stage `under_review`;
  never advanced; stop not effective.
- `initial_response_only`: the same historical/stage conditions with stop
  effective. Only freelancer resolution of already-open questions remains
  writable.
- `advanced_discussion`: active, operational gig; stage `advanced`.
- `read_only`: returned-to-review after prior advancement; paused/filled/
  cancelled gig; or confirmed, Not Selected, withdrawn, or gig-cancelled
  application.

Reporting an existing other-participant message remains available in every
mode. Intake closure and deadline passage do not make a valid existing thread
read-only.

## Immutable message model

`public.application_qa_messages` will be append-only with:

- UUID identity and exact application/gig binding;
- positive per-application `sequence_number`;
- trusted sender user and role;
- kind `initial_question | question | answer | clarification | decline |
  correction`;
- fixed topic vocabulary and optional bounded `other_job_related` label;
- plain-text body only;
- exact same-application reply/correction references;
- structured decline reason;
- paired operation `request_id` and server-generated fingerprint;
- database timestamp.

`UNIQUE (application_id, sequence_number)` provides deterministic ordering.
Sequence allocation occurs under the thread lock. Update/delete and physical
deletion are rejected. Cursor reads use `sequence_number < before_sequence`,
descending stable order, and a bounded limit.

Initial questions are client-only, consume one of two permanent initial client
turns, and may receive one answer or decline. Pre-advancement client correction
also consumes a turn, preventing correction bypass. Advanced questions may be
sent by either participant. Answers must be from the opposite participant and
question resolution has one unique primary answer-or-decline row. Corrections
reference the sender's own prior message and preserve the original.

## Stop, reports, and safety

Stop-pre-advancement is a freelancer-only set-like mutation for never-advanced
`under_review`. It updates the thread projection and appends one participant
workflow event. Exact or later retries return success without another event.
It never changes stage, suitability, or proposal state; existing unanswered
questions remain resolvable.

`public.application_question_reports` is append-only and private to the
reporter/backend. It binds one reporter to one other-participant message,
enforces one report per reporter/message, requires structured categories, and
requires bounded detail for `other`. It never updates the message, application,
ranking, or other participant view. Reporting remains available after closure.

Frontend detection is advisory. FastAPI validation is authoritative at the API
boundary, and the RPC repeats high-confidence deterministic checks before
sequence allocation. Rejected contact, external-communication, credential, OTP,
token, bank, or payment-identifier content creates no message, allowance use,
rate usage, or event. Marketplace events never contain message bodies or
detector details.

## Rate limits and idempotency

Trusted settings provide validated defaults:

```text
message writes: 8 / 10 minutes / participant / application
message writes: 40 / 24 hours / participant / application
revision creates: 3 / 24 hours / client / application
```

The backend passes policy values; the browser does not. PostgreSQL enforces
them using `clock_timestamp()` after the thread/application locks. Counts use
committed immutable messages and revision requests. Exact idempotent replays
are detected before rate accounting. Rejected content and reads do not count.

Every mutation stores a UUID request ID with a SHA-256 fingerprint covering
trusted actor, application, operation kind, canonical content, referenced
identity, and relevant version identity. Same ID/fingerprint replays the
existing result; same ID/different fingerprint returns
`idempotency_conflict`.

Message/report/revision rows provide durable idempotency. The set-like stop
operation stores its request ID/fingerprint on the thread so an exact replay is
distinguished from conflicting reuse.

## Revision-request authority

`public.application_revision_requests` is the structured mutable lifecycle
aggregate. Identity, application/gig binding, requested application version,
requested material gig version, client actor, reason, created time, and
creation idempotency are immutable. Status is:

```text
open | fulfilled | declined | superseded
| closed_by_stage_change | closed_by_gig_state
```

A partial unique index enforces one `open` row per application. Creation is
client-only and requires active/operational gig, `advanced` application,
current proposal already answering current material terms, no effective
selection request, no existing open request, exact current version bindings,
idempotency, and the revision-create daily limit.

Decline is freelancer-only and closes an exactly current, actionable request
without creating a version. Linked update is freelancer-only, validates a
complete proposal through 7D authority, inserts one
`proposal_revision_response` version, moves the current pointer, marks the
request `fulfilled`, links the response version, invalidates an applicable
effective selection request, and appends reference-oriented events atomically.

An unlinked application version change makes an open request `superseded`.
Material gig-version change also makes it `superseded`. Leaving Advanced closes
it as `closed_by_stage_change`; filled/cancelled closes it as
`closed_by_gig_state`. Pausing preserves the row as open but blocks action.
Lifecycle events carry only request/version references and safe reason codes,
never proposal snapshots or message bodies.

## Marketplace event contract

`public.marketplace_events` remains the sole append-only cross-workflow audit
log. Existing visibility resolution and payload safety remain authoritative.
7F adds reference-oriented event types:

```text
qa_pre_advance_discussion_stopped
revision_request_created
revision_request_declined
revision_request_fulfilled
revision_request_superseded
revision_request_closed_by_stage_change
revision_request_closed_by_gig_state
```

Q&A message rows are already their immutable communication history and do not
need body-bearing marketplace events. Revision events may include request,
application-version, material-version, and status references only.

## RLS and privilege model

RLS is enabled on every new public table. The initial model is intentionally
stricter than participant table policies:

```text
anon/authenticated browser: no direct SELECT or DML
service_role: explicit controlled SELECT
mutation: narrow SECURITY DEFINER RPC only
```

All new public RPCs are owned by the trusted migration owner, use
`SECURITY DEFINER`, set `search_path = ''`, and fully qualify every object.
Execution is revoked from `PUBLIC`, `anon`, and `authenticated`, then granted
only to `service_role`. Direct INSERT/UPDATE/DELETE is denied even to
`service_role`. Table triggers reject message/report update or delete, thread
identity mutation/delete, and revision identity mutation/delete.

## Lock order and time authority

The preserved global order for new paths is:

```text
gig
-> relevant stored pending selection request
-> application
-> Q&A thread
-> target message/question
-> revision request
-> immutable application-version insert
-> marketplace events
```

Where multiple rows of one type are locked, UUID order is deterministic.
Thread lazy creation occurs after the application lock using conflict-safe
insert followed by `FOR UPDATE`. Stage integration executes while the
application update already owns the application lock and then touches thread
and revision rows, which is a suffix of the global order.

New eligibility, expiry, rate-window, action timestamp, and retry-after
decisions use PostgreSQL `clock_timestamp()` after material locks. Browser and
FastAPI timestamps are not authoritative.

## FastAPI architecture

The current FastAPI boundary verifies the Supabase bearer token, loads trusted
`user_profiles`, and uses explicit service-key REST reads plus service-only RPC
calls. Route dependencies remain injectable for unit tests.

7F will use focused modules rather than enlarge the 7D or 7E controllers:

- strict Q&A and revision contracts;
- high-confidence message safety;
- participant-aware batched data access;
- thread mode/permission/read DTO derivation;
- mutation RPC orchestration and stable error mapping;
- dedicated Q&A/revision routes.

After every mutation, FastAPI reloads the authoritative sanitized thread and,
for linked proposal updates, the authoritative application detail. Raw
database rows, report-private data, detector matches, configuration, and
service metadata never enter public DTOs.

## Frontend integration architecture

The frontend is React 19, React Router 7, TypeScript, Vite, and Tailwind. It
uses bearer-token fetch modules, runtime response guards, pure view helpers
tested with Node's built-in runner, protected role routes, and route-local
state.

The integration points are:

```text
freelancer:
/applications
/applications/:applicationId
/applications/:applicationId/edit?revision_request_id=...

client:
/gigs/:gigId/applicants
/gigs/:gigId/applicants/:applicationId
```

A shared structured Q&A panel renders loading, empty, error,
initial-clarification, response-only, advanced, and read-only states. It uses
topic/kind forms and timeline rows, not casual chat styling. It displays the
proposal-authority warning, cursor pagination, safe blockers, pending-response
indicators, report/correction controls, and role-specific revision cards.
Stale/rate/safety failures preserve draft text and reload authority without
automatic replay.

## Gate conclusion

No contradiction requires rewriting verified 7A–7E architecture. Milestone 7F
can be additive: three strict backend-only tables, focused service-only RPCs,
one permanent advancement projection, narrow revision supersession/closure
integration, participant-safe read modules/routes, and focused frontend
surfaces. Existing application/gig version authority, stage graph, matching,
selection, event history, RLS, direct-DML restrictions, lock order, and current
frontend routes remain intact.
