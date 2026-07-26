# Milestone 7G invariant map

Date: 2026-07-25
Repository: `/Users/drivyaanshyadav/Desktop/Ai-Gig/gigmatch-ai`
Starting branch/commit: `main` at `34ea1efa1afda60408afdb31700d86c434bc4ddd`

## Preserved repository state

The worktree already contains verified, uncommitted Milestone 7D–7F work plus unrelated
`concepts/` and `concepts-gpt/` trees. Milestone 7G is additive. No existing work is reset,
stashed, committed, pushed, or rewritten, and the concept trees are out of scope.

The applied migration order before 7G is:

1. `20260714225130_baseline_m0_m3.sql`
2. `20260714225138_milestone_7b_database_foundation.sql`
3. `20260718120000_milestone_7c_b_gig_management.sql`
4. `20260718120001_milestone_7c_b_selection_fill_compatibility.sql`
5. `20260720064417_milestone_7d_freelancer_applications.sql`
6. `20260724105437_milestone_7e_client_applicant_review.sql`
7. `20260725120246_milestone_7f_structured_qa_revision.sql`

## Existing authority and exact-version bindings

- `gig_versions` is the immutable authority for client terms.
- `application_versions` is the immutable authority for freelancer proposals.
- `selection_requests` is the exact formal offer, bound by foreign keys to one gig,
  one application, one application version, and the application version's answered gig
  version.
- `engagements` is the immutable accepted-terms authority.
- `marketplace_events` is append-only workflow history.
- Q&A, ranking evidence, mutable profiles, and browser summaries are not terms authority.

`selection_requests` currently stores immutable identity/version/expiry/acknowledgement
bindings, lifecycle status, terminal metadata, decline disposition, structured cancellation
metadata, invalidation reason, and an optional prior-request link. A partial unique index
allows at most one stored `pending` row per gig. The immutable trigger prevents changes to
bindings, acknowledgement, creation time, and expiry.

## Existing confirmation transaction

`public.confirm_selection_request(uuid, uuid)` is the existing service-only,
`SECURITY DEFINER`, empty-search-path confirmation authority. It locks:

```text
gig
→ request
→ selected application
→ remaining active applications ordered by UUID
→ trigger-owned child rows for each application update
→ engagement
→ events
```

It revalidates the freelancer, exact current application/material-gig versions, contract
versions, acknowledgement, active/unpaused gig state, and absence of a winner/engagement.
It then accepts the request, confirms the selected application, fills the gig, creates one
engagement, closes only other active applications with
`another_applicant_selected`, and appends events in one transaction.

7G will not create a second confirmation implementation. The body becomes one private
confirmation core called by both the legacy 7B wrapper and the new idempotent 7G accept
RPC. The legacy signature and grants remain intact so the 7B suite remains authoritative.

## Expiry and effective status

Before 7G, effective pending is derived inconsistently in several functions as:

```text
status = 'pending' and expires_at > a database wall-clock call
```

Expired stored-pending rows can remain stored as `pending`; no single projection helper or
singular expiry-event authority exists. 7G introduces one locked helper. Every 7G mutation
locks the gig, locks the relevant request, captures one `authoritative_now`, projects a due
stored-pending row exactly once, and uses that same timestamp for the remaining checks.
Reads may derive `expired` without writing.

The 7C lifecycle RPC will be updated additively so pause and cancellation use the same
locked expiry projection. Intake closure remains independent and does not block selection.

## Readiness and resend rules

Send readiness is recomputed under locks from authoritative rows:

- trusted client ownership;
- active and unpaused gig, irrespective of intake state or deadline;
- application belongs to gig, is `advanced`, is selection-ready, and answers the current
  material gig version;
- no current gig-change response is required;
- valid payment/currency/financial/timeline/availability/scope contract;
- required commercial warning acknowledgement;
- no effective selection request, open 7F revision request, confirmed winner, or active
  engagement;
- current send token.

Unanswered Q&A is deliberately absent from readiness.

Selection-term identity is application version + material gig version + warning requirement.
The latest relevant request is linked on resend. Same-term resend is allowed after expiry;
structured 7A cancellation reasons govern cancelled resends; unchanged remain-interested
declines are blocked; `revision_requested` requires a committed new application version;
withdrawn applications remain blocked; minor display corrections do not change terms.

## Idempotency

7D stores submission idempotency on the application aggregate. 7F has a private operation
ledger for Q&A/revision operations. Selection currently has no durable operation ledger.

7G adds a private, service-only selection operation ledger keyed by actor and request UUID,
with canonical operation fingerprint, operation kind, aggregate references, and an
authoritative result reference. Idempotency claim/replay/conflict resolution happens within
the same PostgreSQL transaction as send, cancellation, or response. Exact replay is checked
after authorization/resource resolution but before ordinary current-state validation, so a
retry can return a now-terminal result. A key reused for another canonical operation fails
with a stable conflict.

## Token design

All tokens are opaque SHA-256 hashes of canonical locked state and have separate domains:

- send token: gig/application identity, stage/current application version, material gig
  version, gig lifecycle/operations, effective request, open revision, response-to-change
  state, and commercial acknowledgement requirement;
- management token: request identity/status/expiry/exact versions, current application/gig
  state, and client ownership;
- response token: request identity/status/expiry/bound and current versions, application
  stage, gig state, open revision state, and winner/engagement state.

Backend reads reproduce the same canonical construction. Mutation RPCs recompute it under
locks; the browser never supplies trusted identity, versions, snapshots, expiry, financial
terms, warning metadata, or events.

## Engagement snapshot contract

Existing 7B engagements use accepted-terms contract version 1 and snapshot schema version 1.
That snapshot includes immutable client payment, proposal, timeline, availability, structured
scope, included/excluded work, assumptions, estimate change factors, and commercial
acknowledgement. It does not include `scope_notes`.

New 7G acceptance adds `scope_notes`, exact participant/aggregate identifiers, and retains
the existing immutable terms fields. That is a shape change, so new 7G engagements use
accepted-terms contract version 2 and snapshot schema version 2. Historical version-1 rows
are neither migrated nor reinterpreted. Both versions remain valid and readable.

## RLS, grants, and mutation boundary

Participant RLS already limits reads of requests and engagements to the gig client,
application owner, or admin. Direct insert/update/delete is revoked from browser roles and
service role for protected aggregates. The legacy confirmation RPC is service-only.

All new mutation RPCs are `SECURITY DEFINER` with `search_path = ''`, revoked from
`PUBLIC`, `anon`, and `authenticated`, and executable only by `service_role`. New private
ledger data has RLS enabled, no browser grants, and no direct service-role writes. Existing
participant-safe select policies remain unchanged.

## Trigger and cross-milestone conclusions

- 7E `clear_terminal_application_shortlist` updates only the current application's review row.
- 7F application-stage/Q&A/revision lifecycle triggers update only child state for the
  currently updated application.
- 7F gig lifecycle trigger may inspect applications on fill, but confirmation already locks
  all affected applications in deterministic UUID order before changing the gig.
- 7D application edit and 7C material edit already invalidate an effective request.
- Minor gig edits preserve the material-version pointer and therefore preserve the request.

7G adds no cross-aggregate scanning trigger. Confirmation retains the global lock order;
non-accepting responses lock only the request's own application child aggregate. Events are
inserted last. This extends rather than redesigns the verified 7B–7F architecture.
