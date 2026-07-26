# Milestone 7D Invariant Map

This map was created before the 7D migration. It records the schema produced by a
clean local replay through `20260718120001_milestone_7c_b_selection_fill_compatibility.sql`
on branch `main` at commit `34ea1ef`.

## Aggregate tables

### `public.applications`

Columns:

- Identity: `id uuid` primary key, `gig_id uuid`, and
  `freelancer_profile_id uuid`.
- Current state: `stage text` and required `current_version_id uuid`.
- Time projections: `submitted_at`, `last_updated_at`, and `stage_changed_at`, all
  required `timestamptz` values.
- Acting projection: required `stage_changed_by_actor_type`; nullable
  `stage_changed_by_user_id`.
- Structured reason projection: nullable `stage_reason_origin`,
  `stage_reason_code`, and object-valued `stage_reason_payload`.

Constraints:

- Primary key on `id`; FKs to `gigs`, `freelancer_profiles`, and
  `user_profiles` use `ON DELETE RESTRICT`.
- `UNIQUE (gig_id, freelancer_profile_id)` is the authoritative one-history rule.
- `UNIQUE (id, gig_id)` supports exact aggregate/version bindings.
- `UNIQUE (id, current_version_id)` plus the deferred
  `(id, current_version_id) -> application_versions(application_id, id)` FK makes
  the current pointer belong to the same application.
- Allowed stages are `under_review`, `advanced`, `confirmed`, `not_selected`,
  `withdrawn`, and `closed_gig_cancelled`.
- Exactly one confirmed application per gig is enforced by the partial unique
  index `applications_one_confirmed_per_gig_idx`.
- Actor checks require a user ID for user actions and forbid one for system
  actions. Time checks keep `last_updated_at` and `stage_changed_at` at or after
  submission.
- Active stages have no stage reason. Not-selected rows require a client-decision
  or selection-confirmed reason. Withdrawn rows require
  `freelancer_withdrawal`; cancellation closure requires `gig_cancelled`.
- The protection trigger prevents physical deletion and changes to identity,
  gig, freelancer, or submission time.

Indexes: primary/unique indexes above plus indexes on `gig_id`,
`freelancer_profile_id`, `stage`, and `current_version_id`.

Triggers: `protect_application_mutation` runs before update/delete.

### `public.application_versions`

Columns:

- Identity/binding: `id`, `application_id`, `gig_id`, positive
  `version_number`, and exact `gig_version_id`.
- Origin: `initial_submission`, `freelancer_edit`,
  `gig_change_terms_reaffirmed`, `gig_change_proposal_updated`, or
  `reconsideration`.
- Historical applicant snapshot: required `cover_note`, `proposal_snapshot`,
  `timeline_snapshot`, `availability_snapshot`, and `scope_snapshot`.
- Contract projections: generated `proposal_contract_version`,
  `payment_structure`, and `currency`; explicit positive
  `snapshot_schema_version`.
- Audit: required `created_by_user_id` and `created_at`.

Constraints:

- Primary key on `id`; unique `(application_id, id)`,
  `(application_id, id, gig_version_id)`, `(id, gig_id)`, and
  `(application_id, version_number)` bindings.
- Deferred `(application_id, gig_id) -> applications(id, gig_id)` and
  `(gig_id, gig_version_id) -> gig_versions(gig_id, id)` FKs preserve exact
  aggregate and answered-gig identity.
- Snapshot columns must be JSON objects. The proposal contract and snapshot
  schema version must be present and positive. Generated payment structure is
  restricted to the three marketplace structures and currency to three
  uppercase ASCII letters.
- The chronology trigger locks the parent application, requires version 1 first,
  then exact `previous + 1`, and forbids backwards creation time.
- The immutable-row trigger rejects all updates and deletes.

Indexes: the primary/unique indexes above plus indexes on `application_id`,
`gig_id`, and `gig_version_id`.

Triggers: `enforce_application_version_chronology` before insert and
`reject_application_version_mutation` before update/delete.

### `public.selection_requests`

Columns:

- Exact binding: `gig_id`, `application_id`, `application_version_id`, and
  `gig_version_id`.
- Creation/expiry: `created_by_user_id`, `created_at`, and `expires_at`.
- State: `pending`, `accepted`, `declined`, `revision_requested`, `expired`,
  `cancelled`, or `invalidated`, with nullable `terminal_at`.
- Terminal metadata: `decline_disposition`, cancellation code/detail, and
  invalidation reason (`application_version_changed` or
  `gig_version_changed`).
- Resend/commercial metadata: previous request ID, commercial warning code,
  acknowledgement actor, and acknowledgement time.

Constraints:

- The application/gig, gig version, and exact application-version/gig-version
  triples are all FK-bound with `ON DELETE RESTRICT`.
- `expires_at > created_at`; terminal and acknowledgement timestamps cannot
  precede creation.
- Status-specific checks require exactly the matching terminal metadata and
  reject contradictory metadata.
- A partial unique index permits only one stored `pending` request per gig.
- The protection trigger rejects deletion and changes to immutable bindings,
  creation/expiry, resend identity, or commercial acknowledgement.

Indexes: primary key, unique pending-per-gig, and indexes on `gig_id`,
`application_id`, `status`, and `expires_at`.

Triggers: `protect_selection_request_mutation` before update/delete.

### `public.gigs`

The pre-marketplace content projections remain beside authoritative marketplace
state. Identity/content columns are `id`, `client_id`, title, description,
category, skills, legacy numeric budget projections, difficulty, seniority,
deliverables, work mode, legacy date deadline, and timestamps.

Authoritative current-state columns are:

- `opportunity_lifecycle`: `draft`, `active`, `filled`, or `cancelled`.
- `application_intake`: `accepting` or `closed`.
- `operational_state`: `active` or `paused`.
- `status`: the six-value product projection.
- Required `current_gig_version_id` and
  `current_material_gig_version_id`.

The two deferred composite FKs require both pointers to reference a version of
the same gig. Marketplace-state and status-projection checks preserve valid
orthogonal combinations. Existing content checks and client FK remain.

Indexes: primary key; client, status, category, both version pointers, and GIN
indexes for required/preferred skills.

Triggers:

- `sync_gig_marketplace_state_and_legacy_version` controls aggregate creation,
  status projection, legacy contract-zero versions, and version pointers.
- `authorize_selection_fill_projection` permits the narrow verified 7B atomic
  selection fill update while rejecting other uncontrolled published writes.
- `set_gigs_updated_at` maintains the update timestamp.

### `public.gig_versions`

Columns include `id`, `gig_id`, positive `version_number`, complete immutable
`terms_snapshot`, `snapshot_schema_version`, unique `changed_fields`, actor
metadata, and `created_at`. Generated projections are `version_kind`,
`terms_contract_version`, `payment_structure`, and currency.

Constraints bind each version to its gig, enforce unique `(gig_id,
version_number)` and `(gig_id, id)`, actor consistency, supported version kinds,
contract-zero only for `legacy_import`, contract one for product versions,
snapshot/schema equality, unique changed fields, and valid payment/currency
projections. The immutable trigger rejects update/delete.

Indexes: primary key, unique gig ordinal/binding, and `gig_id`.

Triggers: `reject_gig_version_mutation` before update/delete.

### `public.marketplace_events`

Columns include event identity/type/schema version, visibility, actor, optional
gig/application/selection/engagement references, structured reason,
object-valued reference-oriented payload, and `occurred_at`.

Constraints require a valid actor, at least one aggregate anchor, additional
references for selection/engagement/automatic-closure events, and reject
top-level payload keys for proposal/accepted snapshots, parser/resume content,
contact values, credentials, tokens, service role, embeddings, semantic text,
and secrets. Every reference uses `ON DELETE RESTRICT`.

Indexes: primary key plus gig, application, request, engagement, visibility, and
occurrence time. `reject_marketplace_event_mutation` makes rows append-only.

## Snapshot authority and version vocabulary

The authoritative model is:

```text
application_versions complete canonical snapshot
= historical applicant-authored truth

applications
= current stage and current-version pointer

generated projections
= independently validated contract/payment/currency discriminators
```

The complete applicant snapshot is split across `cover_note`,
`proposal_snapshot`, `timeline_snapshot`, `availability_snapshot`, and
`scope_snapshot`. `scope_snapshot` carries included work, excluded work,
assumptions, and estimate-change factors. `proposal_snapshot` carries proposal
contract/schema versions, the authoritative gig-compatible payment
discriminator/currency, and exactly one structured financial variant.

These four version concepts are distinct:

- `proposal_contract_version` is the application contract schema version.
- `application_versions.version_number` is the per-application history ordinal.
- `gig_versions.version_number` is the per-gig history ordinal.
- `gig_versions.terms_contract_version` is the gig terms contract schema version.

None may be substituted for another.

## Application transitions and origins

Existing 7A transitions are:

- `under_review -> advanced | not_selected | withdrawn | closed_gig_cancelled`.
- `advanced -> under_review | not_selected | withdrawn | confirmed |
  closed_gig_cancelled`.
- `not_selected -> under_review` only through controlled reopen.
- `withdrawn -> under_review` only through acceptance of reconsideration.
- Confirmed and gig-cancelled closure are terminal.

A pending request blocks return-to-review, not-selected, and ordinary
withdrawal. 7D must add a narrow material-change reapplication transition rather
than misuse reconsideration.

Existing application-version origins are initial submission, freelancer edit,
changed-gig reaffirmation, changed-gig proposal update, and reconsideration. 7D
requires one additive material-change reapplication origin.

## Withdrawal and selection state

Withdrawal is represented entirely by current application projections:
`stage = withdrawn`, `stage_reason_origin = freelancer_withdrawal`, a required
reason code, object payload, acting user, and stage-change timestamp. No separate
mutable withdrawal boolean exists. Current active stages must have those reason
columns clear.

An effective selection request is a stored `pending` row whose `expires_at` is
later than authoritative database wall-clock time. Expired pending rows are not
effective, even though cleanup may not yet have projected `expired`. The stored
status/terminal metadata checks and invalidation reasons listed above remain
authoritative. A request targeting this application must be invalidated before
an edit version is inserted; a request targeting another application must not
block this application.

## RLS, grants, and mutation authority

RLS is enabled on all six marketplace tables. Authenticated users have SELECT
only on applications, application versions, gig versions, selection requests,
and events. Participant-safe policies allow admin reads, client reads for owned
gigs, and freelancer reads only for the application history resolved through
`freelancer_profiles.user_id`. Event reads additionally respect visibility.

Normal browser roles and `service_role` have no direct INSERT/UPDATE/DELETE on
the five non-gig marketplace tables. Physical deletion is also trigger-blocked.
The existing `gigs` grants are legacy/draft-compatible and constrained by RLS
and write-authorization triggers; published state/version mutation remains RPC
controlled.

Existing public mutation RPCs are owned by `postgres`, use `SECURITY DEFINER`,
set `search_path = ''`, schema-qualify referenced objects, revoke execution from
`PUBLIC`, `anon`, and `authenticated`, and grant only `service_role`. They emit
stable marker messages which FastAPI maps to sanitized public errors.

Private boolean RLS helpers are also fixed-search-path security-definer
functions. The private schema is not exposed and usage is revoked from public,
anon, and authenticated except the explicit authenticated helper grants needed
by policies.

## Lock and time authority

The established global order is:

```text
gig
-> effective selection request when relevant
-> target application(s) in deterministic UUID order
-> immutable version insert
-> events
```

Existing 7B/7C mutation RPCs use row-exclusive `FOR UPDATE` locks on the gig,
then request/application rows when required. Application-version chronology also
locks the parent application. 7D will preserve those modes and order; immutable
historical version rows need no lock.

Selection acceptance already uses `clock_timestamp()` after gig and request
locks. Some 7C-B lifecycle code uses `statement_timestamp()` for effective
request checks; 7D will not rewrite verified 7C behavior. New 7D eligibility and
expiry decisions will use `clock_timestamp()` after all materially blocking
locks and revalidate later deadline-sensitive conditions when blocking can occur.

## Gate conclusion

The repository does not contradict the locked 7D invariants and does not require
rewriting 7B or 7C. The required changes are additive: idempotency storage,
application RPCs/read support, stricter complete-snapshot validation, one precise
reapplication action/origin, additional reference-oriented events, and focused
RLS/privilege/index additions.

The implementation adds a nullable, nonblank `application_versions.scope_notes`
column because the pre-7D split snapshot had no authoritative storage location
for that applicant-authored field. New versions persist it, compatible
reaffirmation copies it, and legacy versions remain valid with `NULL`.
