# Milestone 7K invariant map

## Gate purpose and preserved state

Milestone 7K is a verification-and-repair gate for the implemented 7B–7J
application-to-engagement workflow. It may add local test orchestration,
security assertions, browser coverage, and the smallest repair for a confirmed
blocker. It must not add another workflow or product state.

Preflight state:

- repository: `/Users/drivyaanshyadav/Desktop/Ai-Gig/gigmatch-ai`
- branch: `main`
- starting HEAD: `6461e5d582f803a885b61f9fc976c13013d8fd49`
- `origin/main...HEAD`: `0 0`
- the complete uncommitted 7J implementation is present and must be preserved
- `concepts/`, `concepts-gpt/`, and `concepts-gpt-forge/` are pre-existing
  untracked work and are excluded

No reset, cleanup, browser run, fixture mutation, or service startup is allowed
until the effective runtime configuration passes the local-only guard.

## Verified local topology

The only accepted data path is:

```text
ephemeral Chromium context
-> http://127.0.0.1:5173 (Vite)
-> http://127.0.0.1:8000 (FastAPI)
-> http://127.0.0.1:54321 (Supabase Auth and Data API)
-> postgresql://...@127.0.0.1:54322/postgres
```

The guard derives local API, REST, database, publishable, and service credentials
from `supabase status --output json`. It requires:

- Supabase project ID `gigmatch-ai`
- API/Auth/REST port `54321`
- PostgreSQL port `54322`
- backend port `8000`
- Vite port `5173`
- loopback hostnames only
- identical effective Supabase URLs for frontend and backend
- keys matching the running local project
- no `.supabase.co`, remote database hostname, or unexpected service origin

The ignored frontend and backend `.env` files are the local configuration
boundary. Secrets must never enter a committed file, command output, closure
document, browser artifact, URL, or test report.

The browser network allowlist contains only the three loopback HTTP origins
above. All other HTTP(S) requests fail the suite and are aborted. The unique
meeting URL is displayed and revealed as plain text but is never navigated to or
fetched.

## Accounts and permitted fixture setup

Four independent, confirmed local Auth identities are required:

| Identity | Trusted role | Purpose |
|---|---|---|
| Client A | `client` | owns the two workflow gigs |
| Client B | `client` | cross-client isolation |
| Freelancer A | `freelancer` | selected applicant and invalidation applicant |
| Freelancer B | `freelancer` | second applicant and cross-freelancer isolation |

Provisioning may create Auth identities, `user_profiles`, complete role
profiles, and deterministic reviewed `resume_parses`. Passwords and contact keys
are generated in memory. Each identity uses a separate non-persistent browser
context; no storage-state file is retained.

The setup boundary does not create gigs, applications, review decisions, Q&A,
revision requests, selection requests, engagements, or contact shares. Those
authorities must be exercised through visible application UI. A reviewed
`gig_parse` may be a prerequisite fixture, but the planned proof creates and
reviews it through Client A's UI after publication.

## Protected frontend routes

Unauthenticated access must redirect to `/login`. A verified wrong role must
return to its own dashboard without importing or rendering the forbidden page.

Client-only routes:

- `/dashboard/client`
- `/profile/client`
- `/gigs/new`
- `/gigs/manage`
- `/gigs/:id/edit`
- `/gigs/:id/parse`
- `/gigs/:gigId/applicants`
- `/gigs/:gigId/applicants/:applicationId`

Freelancer-only routes:

- `/dashboard/freelancer`
- `/profile/freelancer`
- `/profile/resume-parse`
- `/gigs`
- `/gigs/:gigId/apply`
- `/applications`
- `/applications/:applicationId`
- `/applications/:applicationId/edit`

Participant routes:

- `/gigs/:gigId`
- `/engagements`
- `/engagements/:engagementId`

The lazy-page boundary must render a recoverable error panel after an induced
module-load failure; a blank application shell is a failure.

## Database, RLS, and RPC boundary

The browser may directly use only the intentionally narrow legacy/profile,
draft-gig, and reviewed-parse paths. Marketplace workflow mutation is owned by
FastAPI plus service-only fixed-search-path RPCs.

The explicit protected table set is:

- `gig_versions`
- `applications`
- `application_versions`
- `selection_requests`
- `engagements`
- `marketplace_events`
- `application_review_states`
- `application_qa_threads`
- `application_qa_messages`
- `application_question_reports`
- `application_revision_requests`
- `application_qa_operations`
- `engagement_reopenings`
- `application_reconsideration_invitations`
- `contact_shares`
- `contact_reveals`
- `engagement_contact_blocks`
- `engagement_contact_reports`
- private selection, engagement, contact-material, and contact-operation tables

RLS must remain enabled. Browser roles may not directly mutate protected
authorities. Private operation ledgers and private contact material must not be
browser-readable. Participant reads must remain owner/participant isolated.
Internal shortlist state and private reports must not leak to freelancers.
Immutable versions, append-only events, and physical-delete guards must remain
effective.

All public workflow RPCs used by FastAPI must remain unavailable to `PUBLIC`,
`anon`, and `authenticated`, available only to `service_role`, and use
`SECURITY DEFINER` with `search_path = ''`. Relevant private definer helpers
must also retain a fixed empty search path.

## Existing concurrency authorities

The final automated gate must run each independent-session harness once:

- 7B selection confirmation:
  `scripts/verify_milestone_7b_concurrency.py`
- 7C-B gig lifecycle/edit:
  `supabase/tests/milestone_7c_b_concurrency.sh`
- 7D applications:
  `scripts/verify_milestone_7d_concurrency.py`
- 7E applicant review:
  `scripts/verify_milestone_7e_concurrency.py`
- 7F Q&A and revisions:
  `scripts/verify_milestone_7f_concurrency.py`
- 7G selections:
  `scripts/verify_milestone_7g_concurrency.py`
- 7H engagement/reconsideration:
  `scripts/verify_milestone_7h_concurrency.py`
- 7I secure contact:
  `scripts/verify_milestone_7i_concurrency.py`

7J is a read-only projection and adds no race harness.

## Browser proof scenarios

### Primary closure

Client A must publish the main fixed-price gig through the UI and review its
deterministic parse. Freelancers A and B must independently discover and apply.
Client A must see both with honest hybrid-or-keyword-fallback evidence, privately
shortlist A, complete one Q&A round, advance A, request an official revision,
review A's new immutable proposal version, and send an exact-version request.
Freelancer A must accept unchanged terms.

The final observable state must be one accepted request, A confirmed, the gig
filled, one non-cancelled engagement, and the same workspace accessible to both
participants. Freelancer B must see Not Selected with the system
`another_applicant_selected` reason, no engagement, and no actionable Q&A.
Internal shortlist state must never appear in A's freelancer session.

### Selection invalidation

An isolated UI-created gig must receive one application. After advancement and
a pending request, Freelancer A edits the official proposal. The old request
must become invalidated, acceptance must disappear, application version 2 must
remain historical beside version 1, and Client A must review version 2 before a
fresh exact-version request can be sent.

### Engagement and secure contact

The confirmed participants must prepare kickoff, start work, request completion,
and have the other party confirm completion through UI actions. Verified email
and one unique canonical meeting URL must be shared, deliberately revealed,
immediately hidden, and never fetched. After the sharer revokes the URL, a stale
UI reveal attempt must receive a controlled denial and plaintext must remain
hidden.

No trace, video, HAR/network archive, persistent profile, or plaintext
screenshot is permitted for this scenario.

### Authentication and isolation

The suite must cover unauthenticated denial, both wrong-role directions,
Client B against Client A's gig/applicant URLs, Freelancer B against Freelancer
A's application, non-enumerating guessed URLs, logout plus browser-back denial,
and recoverable lazy-import failure.

Every scenario fails on uncaught page errors, unexpected console errors, Vite
overlays, blank protected routes, or unexpected external requests.

## Sanitised-response rules

Representative real-bearer success and failure responses are checked with
endpoint-specific allowlists and exact recursive forbidden keys. Ordinary
responses must not expose raw source text/parse rows, Auth metadata, service
credentials, access/refresh tokens, embeddings or raw semantic content, private
reports, contact ciphertext/nonce/key IDs/digests/fingerprints, SQL markers, or
stack traces.

Structured proposal and accepted engagement terms are permitted only on their
authorized routes. Contact reveal is the sole full-value exception and must
return `private, no-store`; the value must not appear in ordinary subsequent
responses or captured server logs.

## Post-browser evidence

Read-only database assertions must prove:

- sequential immutable gig and application versions
- accepted request exact version bindings
- automatic closure of Freelancer B using the system reason
- exactly one non-cancelled main engagement
- no URL plaintext in persisted public/private tables
- encrypted URL material existed before revocation
- URL ciphertext and nonce are retired after revocation
- marketplace events and operation ledgers contain no contact plaintext
- the unique contact sentinel is absent from retained logs, browser storage,
  URLs, and retained test artifacts

Only observable persistence and retained-artifact absence may be claimed.
Ephemeral process memory is explicitly outside the claim.

## Conditions for Milestone 7 closure

Milestone 7 may be closed only after:

1. clean migration replay, full database/backend/frontend gates, and all eight
   concurrency harnesses pass without decreasing the 7J baseline totals;
2. the focused security/RLS and sanitized-response audits pass;
3. a second clean reset is followed by all four real local browser scenarios
   and the post-E2E read-only evidence;
4. both selected participants open the same Engagement Workspace;
5. Freelancer B receives correct system closure;
6. secure reveal, hide, revocation, and later denial work through the UI;
7. no critical or applicable high-severity security/integration defect remains;
8. nothing is committed, pushed, deployed, or applied to hosted Supabase.

If any mandatory browser/security proof is simulated, skipped, or fails,
Milestone 7 remains open.
