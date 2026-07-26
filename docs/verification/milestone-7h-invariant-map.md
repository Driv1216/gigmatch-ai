# Milestone 7H invariant map

Date: 2026-07-26
Repository: `/Users/drivyaanshyadav/Desktop/Ai-Gig/gigmatch-ai`
Starting branch/commit: `main` at `34ea1efa1afda60408afdb31700d86c434bc4ddd`

## Preserved repository state

`main` is one commit ahead of `origin/main`. The starting worktree contains the
verified, uncommitted Milestone 7D–7G implementation plus unrelated
`concepts/` and `concepts-gpt/` directories. All of it is user-owned and is
preserved. No reset, restore, stash, checkout, commit, push, hosted migration,
deployment, or presentation-branch operation is permitted.

The migration stack before 7H ends with:

1. `20260720064417_milestone_7d_freelancer_applications.sql`
2. `20260724105437_milestone_7e_client_applicant_review.sql`
3. `20260725120246_milestone_7f_structured_qa_revision.sql`
4. `20260725173847_milestone_7g_selection_request_atomic_confirmation.sql`

## Existing engagement schema and accepted-term authority

`public.engagements` already stores the exact gig, application, selection
request, client and freelancer participants, accepted application/gig versions,
accepted snapshot and schema versions, confirmation time, lifecycle status,
work-start metadata, completion-request metadata, cancellation metadata, and
the exact prior active status. It already has:

- one engagement per selection request;
- exact application/gig/version foreign keys;
- distinct and participant-only actor checks;
- actor/timestamp pairing and chronological timestamp checks;
- status-specific lifecycle metadata checks;
- immutable identity, accepted terms, version bindings, and confirmation time;
- physical-delete rejection;
- one non-cancelled engagement per gig.

The missing persistence projection is a monotonic lifecycle version. Existing
lifecycle columns are otherwise sufficient and must not be duplicated.

The authority model remains:

```text
gig_versions          = immutable client terms
application_versions  = immutable freelancer proposals
selection_requests    = exact version-bound formal offers
engagements            = accepted terms plus current lifecycle
marketplace_events     = sole append-only workflow activity history
```

The shared `private.confirm_selection_request_core` is the sole engagement
creation and selection fan-out authority. Both the legacy 7B wrapper and 7G
idempotent acceptance call it. 7H must amend that core only to make its winner
check historical-cancellation aware; it must not create another confirmation
route, transaction, snapshot builder, or browser write.

## Accepted snapshot compatibility

Historical confirmation through the preserved 7B wrapper creates accepted
snapshot contract/schema version 1. It contains immutable client payment terms,
proposal, timeline, availability, scope fields and commercial acknowledgement,
but no `scope_notes` or participant identifiers.

7G acceptance creates contract/schema version 2, adding `scope_notes` and exact
aggregate/participant identifiers. Both versions use relational engagement
participant ownership for authorization. Neither version may be rewritten,
upgraded, or returned as raw JSON. The read model must normalize only the
allowlisted client terms, freelancer proposal, timeline, availability,
included/excluded work, assumptions, estimate-change factors and optional
scope notes.

## Existing application confirmation contradiction

Two database invariants currently overlap:

- `applications_one_confirmed_per_gig_idx` permanently permits only one
  historical `applications.stage = 'confirmed'` row per gig;
- `engagements_one_non_cancelled_per_gig_idx` permits only one current
  non-cancelled engagement per gig.

The first invariant conflicts with failed-engagement reopening because the
cancelled winner must remain historically Confirmed while a later applicant may
be confirmed. The second invariant is the correct current-winner authority and
is retained.

Before dropping the superseded partial unique application index, 7H must fail
closed if it finds a Confirmed application without an engagement, a
non-cancelled engagement whose application is not Confirmed, multiple
non-cancelled engagements for a gig, a Filled gig without exactly one
non-cancelled engagement, or broken application/gig/version bindings.
Ambiguous rows are never repaired automatically.

The 7G confirmation core currently rejects any Confirmed application on the
gig. That check must instead reject an existing non-cancelled engagement/current
winner. Historical Confirmed applications backed only by Cancelled engagements
must not block a later confirmation.

## Lifecycle rules and event authority

The existing seven-state vocabulary is exactly:

```text
confirmed -> kickoff_pending
confirmed | kickoff_pending -> in_progress
in_progress -> completion_pending
completion_pending -> completed | in_progress
active state -> cancellation_pending
cancellation_pending -> previous active state | cancelled
```

Either participant may prepare kickoff, start work, request completion, or
request cancellation. Only the other participant may resolve completion or
acknowledge cancellation. Only the cancellation requester may withdraw.
Completed and Cancelled are terminal.

All new timestamps and actors are PostgreSQL-derived after locks. The
marketplace timeline uses only the explicit engagement-event allowlist and
never pulls Q&A, proposal, shortlist, review, or unrelated gig events.

## RLS, grants, and mutation authority

Engagement participant SELECT RLS already exists through trusted relational
ownership. Direct lifecycle DML is not a supported authority, but the existing
trigger currently permits valid owner-role updates if table privileges were
ever granted. 7H adds an RPC-only mutation guard and keeps all public mutation
RPCs `SECURITY DEFINER`, fixed `search_path = ''`, schema-qualified, revoked
from `PUBLIC`, `anon`, and `authenticated`, and granted only to `service_role`.

New operation, reopening, and reconsideration tables use RLS with no browser
table access, controlled service reads only, immutable identity/history,
physical-delete rejection, and service-only RPC mutation.

## Failed-engagement reopening

`public.engagement_reopenings` is a one-row-per-source-engagement authority,
bound to the Cancelled engagement, gig, owning client, operation identity and
database timestamp. Reopening locks gig, selected application, engagement,
then reopening/event/operation suffixes. It changes only:

```text
opportunity_lifecycle: filled -> active
application_intake:    closed (unchanged)
operational_state:     active
```

It preserves gig versions, application stages, and the historical Confirmed
winner. The resulting product state is Closed to New Applications.

## Reconsideration invitations

`public.application_reconsideration_invitations` is a dedicated lifecycle
aggregate bound to one reopening, source Cancelled engagement, gig, historical
application, invited current application version, invited current material gig
version, client actor, structured reason, response version and timestamps.

Allowed states are `pending`, `accepted`, `declined`, `cancelled`,
`superseded`, and `closed_by_gig_state`; one pending invitation per application
is enforced. The failed engagement's Confirmed application is ineligible.
Only Not Selected or Withdrawn applications may be invited.

Acceptance always creates a fresh immutable application version with origin
`reconsideration`, reuses the existing 7D snapshot validation/version insertion
authority, moves the original application history to Under Review, clears only
terminal reason projections, and preserves Q&A, review, revision, and prior
application history. Reaffirmation copies the complete previous proposal;
updated submission accepts the same complete canonical snapshot contract used
by the existing application form. Decline does not alter application state.

Material gig edits and ordinary application-version changes must supersede
affected pending invitations; successful selection and gig cancellation must
close them. Pause preserves invitations but blocks actions. These effects are
implemented in existing locked mutation paths or narrow helpers, not
cross-aggregate scanning triggers that acquire locks in reverse order.

## Idempotency, tokens, lock order, and time

Every mutation uses a browser UUID request ID and an opaque server action token.
`private.engagement_operations` is the separate immutable operation ledger.
Canonical fingerprints bind trusted actor, operation, aggregate and strict
input. Exact replay returns the authoritative result; conflicting reuse returns
`idempotency_conflict`.

Tokens are domain-separated SHA-256 hashes recomputed from locked relational
state. The browser does not supply trusted actor role, status/version, gig or
application authority, timestamps, previous state, permitted action, or events.

The compatible global order is:

```text
gig
-> effective selection request when relevant
-> applications in UUID order
-> review / Q&A / revision children
-> engagement
-> reopening
-> reconsideration invitation
-> immutable application version
-> marketplace events
-> operation ledger
```

Lifecycle-only actions use `gig -> engagement -> events -> operation`.
Cancellation acknowledgement and reopening lock the selected application
before the engagement. Reconsideration response uses
`gig -> application -> child rows -> invitation -> version -> events ->
operation`. New actions use `clock_timestamp()` after material locks.

## Gate conclusion

The schema is already deliberately prepared for the seven-state engagement
lifecycle and both accepted-snapshot versions. The genuine contradiction is
only the permanent one-Confirmed-history index and corresponding 7G winner
check. Milestone 7H can otherwise be additive: lifecycle version/guard,
service-only engagement reads and mutations, an operation ledger, one-time
reopening, invitation aggregate and responses, explicit event reads, focused
FastAPI/frontend surfaces, and verification.
