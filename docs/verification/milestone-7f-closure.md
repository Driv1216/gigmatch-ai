# Milestone 7F closure — Structured Q&A and Proposal Revision

## Starting state and preservation

- Starting branch: `main`
- Starting commit: `34ea1efa1afda60408afdb31700d86c434bc4ddd`
- The working tree was intentionally dirty with the complete uncommitted
  Milestone 7D and 7E implementations and unrelated user-owned `concepts/` and
  `concepts-gpt/` directories.
- The migration order before 7F ended with
  `20260720064417_milestone_7d_freelancer_applications.sql` followed by
  `20260724105437_milestone_7e_client_applicant_review.sql`.
- No reset, restore, stash, discard, commit, push, hosted migration, or
  presentation-branch operation was performed. The existing 7A–7E
  implementation and unrelated concept work were preserved.

The pre-migration conclusion in
`docs/verification/milestone-7f-invariant-map.md` was that 7F could be added
without rewriting verified application, application-version, review-state,
selection-request, gig-lifecycle, event, RLS, or frontend authority. The
implementation is additive and preserves the established global lock order.

## Migration and authority model

The migration
`20260725120246_milestone_7f_structured_qa_revision.sql` adds:

- `application_qa_threads`, a lazy one-row-per-application projection for
  sequence allocation, the permanent two-turn allowance, pre-advancement stop,
  and permanent full-discussion unlock;
- `application_qa_messages`, immutable participant communication with strict
  kinds/topics, exact reply/correction references, positive per-application
  sequence, and mutation idempotency identity;
- `application_question_reports`, private immutable reporter history;
- `application_revision_requests`, exact-version structured revision
  lifecycle state;
- `application_qa_operations`, a durable idempotency result ledger for every
  mutation, including set-like and terminal actions;
- narrow service-only mutation RPCs and application/gig lifecycle integration;
- the honest application-version origin `proposal_revision_response`.

The locked authority map remains:

```text
applications                  = current application stage and version pointer
application_versions          = official immutable proposal truth
application_qa_threads        = current Q&A control projections only
application_qa_messages       = immutable participant communication
application_question_reports  = private report records
application_revision_requests = structured revision lifecycle
marketplace_events            = reference-oriented workflow audit history
```

A Q&A statement never changes proposal, financial, scope, timeline,
availability, gig-version, application-version, ranking, or stage authority.
Only a complete proposal validated by the existing 7D snapshot authority can
create a new immutable version and move the current pointer.

## Thread lifecycle, permissions, and message integrity

No thread rows are backfilled. Missing thread state means empty history,
sequence one, zero initial turns, no stop, and no advancement. The first Q&A
mutation creates the row; first advancement also establishes the permanent
`full_discussion_unlocked_at` history marker.

FastAPI derives and PostgreSQL revalidates:

- `initial_clarification` for an active never-advanced Under Review
  application;
- `initial_response_only` after the freelancer stops pre-advancement
  discussion;
- `advanced_discussion` after formal advancement;
- `read_only` after return from Advanced, terminal application state, pause,
  fill, or cancellation.

Intake closure and deadline passage do not close an existing active thread.
Reporting remains available in read-only mode. A prior stop never blocks
discussion after advancement.

The client has exactly two permanent pre-advancement turns. Initial questions
and client corrections both consume a turn. The count never resets through
answer, decline, report, shortlist, return, reopen, or the same application
history. Allocation occurs under the thread lock; committed messages have a
unique deterministic sequence. The UI also removes the client correction
control when both turns are exhausted.

Questions have one primary answer-or-decline resolution. Opposite-participant,
same-application, question-kind, and unresolved checks are database
authoritative. Corrections append a new row and preserve the original.
Message/thread/report update and physical delete operations are trigger
blocked.

Stop-pre-advancement is a freelancer-only set-like operation. It blocks new
client turns, preserves resolution of existing questions, creates at most one
safe participant event, and changes neither stage nor ranking.

## Reports, safeguards, rates, and idempotency

Reports are scoped to an incoming same-application message, unique per
reporter/message, private to the reporter/backend, and available after thread
closure. They never hide a message or mutate application/ranking state. Public
DTOs expose only whether the current viewer already reported a message, never
the category or detail.

The safety boundary is deliberately deterministic and high-confidence, not AI
moderation. Frontend warning, backend validation, and database defence in depth
cover email, phone, external URLs, off-platform/messaging solicitation,
password/OTP/key/token requests, bank/payment identifiers, and high-confidence
secret values. Generic technical discussion such as API-token authentication
or email-service design remains allowed. Rejected content creates no message,
sequence, allowance use, rate use, or event, and no raw match is returned.

Validated configuration defaults are:

```text
participant message writes: 8 per 10 minutes per application
participant message writes: 40 per 24 hours per application
client revision creates:    3 per 24 hours per application
message page size:          30, maximum 100
```

The browser supplies none of these values. PostgreSQL enforces the windows
with `clock_timestamp()` after locks and returns a safe retry interval.

Every Q&A/revision mutation carries a UUID request ID. The database builds a
canonical fingerprint from trusted actor/application/operation/reference/
version identities and canonical content. Exact replay returns the recorded
result without another row, event, sequence, allowance, or rate use. Reusing
the ID for different content returns `idempotency_conflict`. Linked-update
replay remains valid after the successful current-version pointer move because
its fingerprint is based on the immutable requested version identities.

## Revision-request lifecycle and application versions

Revision creation requires the owned application to remain Advanced on an
active, unpaused, unfilled, uncancelled gig; exact current application and
material-gig version bindings; no effective selection request; no stale
material-change response; no other open request; the creation rate; and
idempotency. A partial unique index independently enforces one open request.
The existing proposal remains current while the request is open.

The freelancer may decline with a structured reason or submit a complete
proposal. Linked submission reuses
`private.validate_application_snapshot` and
`private.insert_application_version`, then atomically:

```text
lock gig
-> lock relevant effective selection request
-> lock application
-> lock Q&A thread
-> lock revision request
-> validate exact application/material versions and optimistic token
-> insert one proposal_revision_response application version
-> fulfil and link the request
-> move applications.current_version_id
-> invalidate a relevant selection request
-> append reference-only events
-> record idempotent result
```

An ordinary application edit or material gig edit supersedes an open request.
Leaving Advanced closes it as `closed_by_stage_change`; filled/cancelled closes
it as `closed_by_gig_state`. Pause preserves the stored open request but blocks
both participants until a valid resume. Fulfilled, declined, superseded, and
closed requests are non-actionable. Events contain IDs, safe codes, versions,
and statuses only—never message bodies or proposal snapshots.

Forced final-step failures prove that question thread/message/allowance/
operation writes and revision request/version/pointer/event writes roll back as
one transaction.

## RLS, privileges, lock order, and database time

RLS is enabled on every new public table. `anon` and `authenticated` have no
direct SELECT or DML. `service_role` has controlled reads but no direct
message/report/revision mutation. All writes use schema-qualified
`SECURITY DEFINER` RPCs with fixed empty `search_path`; execution is revoked
from `PUBLIC`, `anon`, and `authenticated` and granted only to
`service_role`.

The preserved order is:

```text
gig
-> relevant selection request
-> application
-> Q&A thread
-> target message/question
-> revision request
-> immutable application-version insert
-> marketplace events
```

Eligibility, rate-window, expiry, action timestamp, and retry-after decisions
use PostgreSQL `clock_timestamp()`. Browser and API-host clocks are not
authoritative.

## API and sanitized read model

The dedicated route module exposes:

```text
GET  /applications/{application_id}/qa
GET  /applications/{application_id}/qa/messages
POST /applications/{application_id}/qa/questions
POST /applications/{application_id}/qa/messages
POST /applications/{application_id}/qa/questions/{message_id}/answer
POST /applications/{application_id}/qa/questions/{message_id}/decline
POST /applications/{application_id}/qa/messages/{message_id}/correct
POST /applications/{application_id}/qa/messages/{message_id}/report
POST /applications/{application_id}/qa/stop-pre-advancement
POST /applications/{application_id}/revision-requests
POST /applications/{application_id}/revision-requests/{request_id}/decline
POST /applications/{application_id}/revision-requests/{request_id}/submit-update
```

The boundary is verified token, trusted profile/role, participant resolution,
strict request contract, domain/safety validation, service-only RPC,
authoritative reload, and sanitized DTO. Cross-client, cross-freelancer,
guessed, and missing resources return a non-enumerating 404 after trusted role
resolution. Raw database markers, SQL, detector matches, report details,
service credentials, browser-controlled identity, and policy values are not
returned.

The thread DTO contains derived mode/permissions, exact current versions,
allowance, stop state, viewer-specific pending action counts, safe revision
summary/history, blockers, deterministic cursor page, and latest activity.
Pending counts use the complete lightweight message summary even when message
bodies are paginated, preventing an older unresolved question from being
miscounted.

## Frontend surfaces and indicators

The structured, non-chat Q&A panel is integrated into:

```text
Freelancer: My Applications, Application Detail
Client:     Applicant Inbox, Applicant Detail
```

It provides loading, unavailable, lazy-empty, initial, response-only,
advanced, and read-only presentation; topic-constrained questions and
clarifications; answer/decline; append-only correction; private report; stop;
cursor history; proposal-authority notice; safe blockers; and responsive
controls. Stale/conflict errors preserve drafts, reload authoritative state,
and require review. Rate errors preserve drafts and show retry timing.
Safety warnings provide no bypass.

Client applicant detail supports structured exact-version revision creation.
Freelancer detail supports request decline and a linked route into the existing
complete application form. The form submits a new immutable version through
the revision endpoint; it does not edit proposal fields inside Q&A. The old
proposal remains current until success.

My Applications and Applicant Inbox expose response/action counts, open
revision state, attention state, and latest Q&A activity. They are explicitly
action indicators, not unread, seen, delivered, presence, or read-receipt
claims.

The final React review retained named components, semantic controls,
deterministic keys, colocated state, and stable effect dependencies. It also
aligned the frontend safeguard with backend phone/off-platform/payment
detection and centralized testable loading/error/empty/ready and composer
derivation.

## Automated verification

Database:

```text
supabase db reset --local
  PASS — complete migration replay through 7F

supabase test db
  PASS — 326 assertions across five unchanged-or-additive suites
  7B:   90
  7C-B: 45
  7D:   55
  7E:   59
  7F:   77

python3 scripts/verify_milestone_7f_concurrency.py
  PASS — 16 separate-PostgreSQL-session race families

supabase db lint --local --level warning --fail-on error
  PASS — No schema errors found

supabase db advisors --local --type all --level warn
  PASS — no 7F warning introduced
```

Backend and frontend:

```text
cd backend && .venv/bin/python -m unittest tests.test_qa -v
  PASS — 19 focused tests

cd backend && .venv/bin/python -m unittest discover -s tests -v
  PASS — 396 tests, 3 intentionally skipped live Supabase smokes

cd frontend && npm test
  PASS — 37 tests, including 8 focused 7F tests

cd frontend && npm run lint
  PASS

cd frontend && npm run build
  PASS

cd backend && .venv/bin/python -m compileall -q app tests \
  ../scripts/verify_milestone_7f_concurrency.py
  PASS

git diff --check
  PASS
```

The separate-session verifier uses independent PostgreSQL connections and
covers:

1. final initial-question slot;
2. two sends from zero used turns;
3. exact duplicate request;
4. conflicting request-ID reuse;
5. question versus stop;
6. initial question versus advancement;
7. advanced message versus return to review;
8. message versus terminal withdrawal;
9. answer versus decline;
10. two answers;
11. final rate slot;
12. two revision creations;
13. revision creation versus ordinary edit;
14. linked fulfilment versus ordinary edit;
15. linked fulfilment versus material gig edit;
16. revision response versus incompatible stage transition.

Each family asserts the committed serial outcome: stage, version pointer and
ordinal, message count/sequence, allowance, stop state, request state, event
singularity, and absence of duplicate or mixed projections.

## Existing warnings and honest limitations

Supabase advisors report the same three pre-existing performance warnings for
multiple permissive authenticated SELECT policies on `client_profiles`,
`freelancer_profiles`, and `gigs`. No 7F object introduced a security or
performance advisor warning.

Non-failing toolchain output contains existing Starlette/SWIG deprecation
notices, Node's experimental type-stripping notice, and Vite's existing
minified-bundle-size warning.

Authenticated browser smoke was not run. The user explicitly said browser
verification was unnecessary, and the repository has no provisioned genuine
paired client/freelancer browser sessions connected to the same verified local
frontend/backend/database environment. No session result was fabricated and
no hosted migration was applied.

The safeguards are intentionally deterministic high-confidence checks; they
do not claim perfect detection or AI moderation. No general chat, realtime,
read receipts, contact exchange, attachments, selection, engagement, payment,
notification infrastructure, or 7G control was introduced.

## Complete Milestone 7F changed-file list

```text
backend/.env.example
backend/app/api/routes/applications.py
backend/app/api/routes/qa.py
backend/app/config.py
backend/app/main.py
backend/app/marketplace/applicant_review.py
backend/app/marketplace/applicant_review_data_access.py
backend/app/marketplace/application_data_access.py
backend/app/marketplace/qa.py
backend/app/marketplace/qa_contracts.py
backend/app/marketplace/qa_data_access.py
backend/app/marketplace/qa_safety.py
backend/tests/test_qa.py
docs/verification/milestone-7f-closure.md
docs/verification/milestone-7f-invariant-map.md
frontend/src/components/StructuredQaPanel.tsx
frontend/src/lib/applicantReviewContracts.ts
frontend/src/lib/applicationContracts.ts
frontend/src/lib/qa.ts
frontend/src/lib/qaContracts.ts
frontend/src/lib/qaView.ts
frontend/src/pages/ApplicantInboxPage.tsx
frontend/src/pages/ApplicationDetailPage.tsx
frontend/src/pages/ClientApplicantDetailPage.tsx
frontend/src/pages/EditApplicationPage.tsx
frontend/src/pages/MyApplicationsPage.tsx
frontend/tests/qa.test.mjs
scripts/verify_milestone_7f_concurrency.py
supabase/migrations/20260725120246_milestone_7f_structured_qa_revision.sql
supabase/tests/milestone_7f.sql
```

Milestone 7F implementation and automated verification complete.
Authenticated browser smoke: not run; no genuine paired client/freelancer sessions were provisioned for the verified local environment, and the user requested no browser verification.
Milestone 7G not started.
Milestone 7 remains in progress.
