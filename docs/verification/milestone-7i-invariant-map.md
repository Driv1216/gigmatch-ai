# Milestone 7I invariant map

Date: 2026-07-26
Repository: `/Users/drivyaanshyadav/Desktop/Ai-Gig/gigmatch-ai`
Starting branch/commit: `main` at `34ea1efa1afda60408afdb31700d86c434bc4ddd`

## Preserved repository state

`main` is one commit ahead of `origin/main` (`origin/main...main = 0 1`).
The starting worktree is intentionally dirty with the verified, uncommitted
Milestone 7D–7H stack and unrelated user-owned `concepts/`, `concepts-gpt/`
and `concepts-gpt-forge/` trees. All are preserved. No reset, restore, stash,
discard, checkout, commit, push, deployment, hosted migration, presentation
work or concept work is permitted.

The migration stack before 7I ends with:

```text
20260720064417_milestone_7d_freelancer_applications.sql
20260724105437_milestone_7e_client_applicant_review.sql
20260725120246_milestone_7f_structured_qa_revision.sql
20260725173847_milestone_7g_selection_request_atomic_confirmation.sql
20260726090000_milestone_7h_engagement_workspace_lifecycle.sql
```

## Existing engagement and participant authority

`public.engagements` is the exact authority for the contact-exchange
participants:

```text
engagements.client_participant_user_id
engagements.freelancer_participant_user_id
```

Both are foreign-key bound to `public.user_profiles`, must be distinct, and
are immutable with the engagement identity and accepted terms. Engagements
also own the current seven-state lifecycle and monotonic `lifecycle_version`.
The 7H service-only lifecycle RPCs lock the gig before the engagement.

Contact exchange is available in every state except `cancelled`. Completed
and cancellation-pending engagements remain eligible. Cancellation removes
reveal/new-share eligibility only when the engagement reaches `cancelled`.
Revocation and reporting remain available in every state.

The contact domain must remain separate. The existing engagement list/detail
RPCs normalize accepted-snapshot versions 1 and 2 and intentionally contain no
contact field. The engagement timeline reads an explicit lifecycle-event
allowlist from `marketplace_events`. Neither DTO nor timeline will be amended
with contact values, masks, consent, reveals, reports or blocks.

## Existing identity and verified-source authority

FastAPI verifies the bearer token through Supabase Auth `/auth/v1/user`, then
loads the trusted `public.user_profiles.role`. `public.user_profiles.email` is
a profile projection, not sufficient verified-contact authority.

Supabase Auth `auth.users` is the authoritative database source for:

- exact current email plus `email_confirmed_at`;
- exact current phone plus `phone_confirmed_at`.

Verified email, phone and WhatsApp sharing must therefore resolve the value
inside the service-only PostgreSQL transaction from the sharer's
`auth.users` row. The browser and FastAPI will not send those values,
verification flags, digests or masks.

WhatsApp uses the same confirmed phone source but is a separate consent. Its
presentation must distinguish:

```text
phone ownership = verified
WhatsApp availability = self-declared
```

No phone verification workflow exists in the repository and none will be
invented.

## User-provided URL boundary

Meeting links and professional profiles are the only browser-provided contact
values. The current backend has no encryption configuration and no
authenticated-encryption dependency. Milestone 7I therefore needs:

- strict canonical HTTPS URL validation without fetching or resolving it;
- rejection of credentials, control characters, localhost/local suffixes,
  IP literals and oversized input;
- backend-only authenticated encryption with a configured key ID and key;
- associated data binding the share, engagement, sharer, recipient and method;
- a separate keyed canonical fingerprint for idempotency;
- a safe backend-derived host mask.

Ciphertext, nonce, key ID, associated-data inputs and keyed fingerprints are
private persistence internals and cannot enter ordinary DTOs or errors.
Revocation must erase ciphertext and nonce while preserving the non-sensitive
share history.

## Existing audit and safety boundary

`public.marketplace_events` is the append-only workflow timeline authority, but
its payload constraint already rejects `contact_value`, passwords, OTPs,
access tokens and secrets. Contact activity must not be added to this table.

Reveal audit therefore needs a dedicated immutable table. A reveal row means
that PostgreSQL authorized release to the trusted backend; it does not claim
that the recipient viewed, copied or used the value. Participant reveal
history is not a product read model.

Reports also need a separate private immutable authority. They do not alter
engagement lifecycle, consent, applications, ranking, selection or events.

## Required separate contact authorities

The additive domain will use:

```text
public.contact_shares
  = immutable share identity plus mutable consent/source projections

private.contact_share_material
  = auth-source digest or encrypted URL material

public.contact_reveals
  = immutable backend-release authorization audit

public.engagement_contact_blocks
  = immutable one-way engagement-scoped block

public.engagement_contact_reports
  = immutable private safety report

private.contact_operations
  = transactional non-plaintext idempotency ledger
```

Phone and WhatsApp rows are distinct. A share can be `active` or `revoked`
independently of `current` or `invalidated` source status. At most one
consent-status `active` share may exist for an engagement, sharer and method.
Revoked rows are never reactivated; reshare creates a new row linked to the
prior history row. Identity, participants, method, mask and verification
evidence are immutable. Physical deletion is rejected.

## Blocking semantics

A block is engagement-scoped and permanent for this milestone. It is not a
global account block and there is no unblock flow.

When either participant blocks:

- reveal and new sharing fail in both directions;
- the blocker's own active shares are revoked and encrypted URL material is
  retired;
- the other participant's consent history is unchanged;
- engagement history and mandatory lifecycle actions remain available;
- report and revocation remain available.

Contact RPCs cannot modify engagement state. Existing 7H lifecycle RPCs do not
consult contact blocks, so required completion/cancellation actions remain
available by construction.

## Reveal and critical retry semantics

The reveal route body contains only a UUID request ID and a server-issued
reveal token. The path supplies the untrusted share identifier. PostgreSQL
must lock and revalidate membership, recipient identity, engagement
eligibility, blocks, consent, source status, current Auth digest, state
version/token and rate limit before every release.

Ordinary terminal-operation replay is unsafe for plaintext. A prior reveal
audit may deduplicate the audit row and rate accounting, but it never stores
the value. Same-key retry must run the complete authorization path again.
Revocation, block, cancellation or source change after an earlier success must
deny the retry and return no plaintext.

Auth-source mismatch must commit an `invalidated` source projection rather
than raise an exception that rolls the update back. FastAPI can then map the
sanitized denial result to a conflict response.

Reveal responses require `Cache-Control: no-store` and must be the only public
response containing the full value.

## RLS, grants and sanitization

The 7F–7H pattern is stricter than participant table reads and is retained:

```text
anon/authenticated: no direct table SELECT or DML
service_role: controlled SELECT where backend reads are necessary
mutation: fixed-empty-search-path SECURITY DEFINER RPC only
```

All new mutation RPC execution must be revoked from `PUBLIC`, `anon` and
`authenticated`, and granted only to `service_role`. Direct table mutation is
revoked from the service role as well. Private material and operation tables
receive no service SELECT; decryption material may leave PostgreSQL only in the
single trusted reveal RPC result.

Ordinary read DTOs expose only masks, labels, consent/source states,
availability, server-authorized actions and opaque action tokens. Recursive
sanitization tests must reject full values, ciphertext, nonce, key IDs,
digests, fingerprints and audit internals in ordinary responses, events and
errors.

## Compatible lock order

The verified 7H global order extends as:

```text
gig
-> engagement
-> contact block rows in deterministic user-ID order
-> contact share rows in deterministic UUID order
-> reveal or report
-> operation ledger
```

Auth source is read/locked only after the contact-share locks and before
release. Contact RPCs never acquire application or selection locks. Existing
engagement lifecycle paths stop at engagement/events/operation and never lock
contact rows, so block versus required lifecycle actions serialize at the gig
and engagement without reverse acquisition.

## Frontend integration boundary

The existing `EngagementWorkspacePage` is the sole integration point. Its
engagement fetch and lifecycle timeline remain unchanged. A dedicated contact
component will independently load the contact-exchange DTO and implement
loading, unavailable, empty, masked, revealed, revoked, blocked and error
states.

Revealed values must remain component-local ephemeral state and be cleared on
hide, unmount, route/engagement change and every authority refresh. They must
not enter Supabase storage, local/session storage, URLs, global context,
query caches, analytics, toasts or error metadata.

## Gate conclusion

No verified 7B–7H authority requires redesign. Milestone 7I is additive. The
only genuine implementation gap is the absent authenticated-encryption
configuration/dependency for user-provided URLs. Verified Auth values can be
resolved directly and authoritatively inside PostgreSQL, while URL plaintext
exists only at the strict FastAPI encryption/reveal boundary.
