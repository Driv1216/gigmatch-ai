# GigMatch AI — Locked Milestone 7 Product Specification

## Application, Applicant Review, Selection and Engagement Workflow

**Status:** Locked product specification
**Implementation status:** Not started
**Product framing:** Serious product-grade workflow, not a presentation-only feature
**Milestone objective:** Connect the completed matching system to a complete, secure and auditable marketplace application workflow.

---

# 1. Product diagnosis

GigMatch AI already has a mature intelligence layer:

* Role-based authentication
* Freelancer and client profiles
* Client gig creation and management
* Resume and gig parsing
* Keyword matching
* Semantic matching
* Hybrid ranking
* Match explanations
* Skill-gap summaries
* Admin evaluation metrics and comparison tooling
* Strong backend test coverage

The current limitation is not insufficient ranking sophistication.

The limitation is that users cannot yet complete the main workflow that gives matching a product purpose:

```text
Client publishes a gig
        ↓
Freelancer discovers the gig
        ↓
Freelancer understands the match
        ↓
Freelancer applies
        ↓
Client reviews ranked applicants
        ↓
Client advances and selects one applicant
        ↓
Freelancer accepts the exact proposal terms
        ↓
Engagement is confirmed
```

Therefore, Milestone 7 must not add another ranking method, LLM-generated explanations, behavioural learning, vector infrastructure or additional evaluation dashboards.

The existing matching engine is mature enough for the next product stage.

---

# 2. Correct milestone objective

Milestone 7 will build the first complete:

> **Application-to-engagement workflow**

It should not be described as a complete marketplace transaction because GigMatch will still not manage:

* Contracts
* Payments
* Escrow
* Invoices
* Work delivery
* Disputes
* Refunds

The milestone completes the process of discovering, applying, reviewing, selecting and confirming an engagement.

---

# 3. Locked end-to-end user story

## Freelancer journey

```text
Complete freelancer profile
        ↓
Upload or paste resume
        ↓
Review extracted skills
        ↓
Browse recommended or open gigs
        ↓
Open full gig details
        ↓
Review match explanation and skill gaps
        ↓
Submit a structured application
        ↓
Track application status
        ↓
Answer limited client clarification questions
        ↓
Update proposal through versioned edits when required
        ↓
Advance to next stage
        ↓
Receive a selection request
        ↓
Accept, decline or request revised terms
        ↓
Enter confirmed Engagement Workspace
```

## Client journey

```text
Complete client/company profile
        ↓
Create and publish gig
        ↓
Receive applications
        ↓
View applicants ranked by suitability
        ↓
Compare matching evidence and commercial proposals
        ↓
Privately shortlist promising applicants
        ↓
Advance serious candidates
        ↓
Ask structured clarification questions
        ↓
Request proposal revisions
        ↓
Send one version-bound selection request
        ↓
Freelancer accepts exact terms
        ↓
Gig becomes filled
        ↓
Engagement Workspace is created
```

---

# 4. Scope boundaries

## Included

* Open gig discovery
* Full gig details
* Structured payment models
* Structured freelancer proposals
* Application submission
* Application editing with version history
* Application withdrawal
* Applicant ranking
* Applicant comparison
* Internal shortlisting
* Formal advancement
* Structured application Q&A
* Proposal-revision requests
* Selection requests
* Acceptance and decline handling
* Gig filling
* Lightweight engagement tracking
* Consent-based contact sharing
* Audit history
* Security and RLS verification
* End-to-end workflow testing

## Explicitly excluded

* Full real-time chat
* File attachments in Q&A
* Voice or video calls
* Contracts
* Digital signatures
* Payments
* Escrow
* Invoices
* Refunds
* Dispute resolution
* Task boards
* Detailed milestones
* Timesheets
* Work-delivery systems
* Reviews and ratings
* Behavioural-learning claims
* Automatic ranking based on price
* Enterprise hiring workspaces in the initial implementation

The architecture must remain expandable for company workspaces, but those workspaces will not be built now.

---

# 5. Core terminology

## Internal Shortlist

A private client-side organizational action.

* The freelancer is not notified.
* It does not alter the freelancer-visible application stage.
* It helps the client compare promising applicants.
* Initial capacity: 5.
* Expandable capacity: 10.
* Capacity must be configurable rather than hardcoded into the database.

## Advance to Next Stage

A formal, applicant-visible decision.

* The freelancer is notified.
* It indicates serious client interest.
* It unlocks fuller structured discussion.
* It does not guarantee final selection.
* Maximum actively advanced applicants should initially be configurable, with a default of 5.

## Selection Request

A formal offer to proceed with one exact application version.

* Only one may be active per gig at a time.
* It has a response deadline.
* It freezes the selected proposal version.
* Acceptance confirms the engagement only when the terms remain unchanged.

## Engagement

The record created after the freelancer accepts the exact selection-request terms.

* The gig becomes filled.
* Other applicants become Not Selected.
* The accepted proposal becomes immutable.
* Secure Contact Exchange becomes available.

---

# 6. Gig lifecycle

The target gig lifecycle is:

```text
Draft
Open
Paused
Closed to New Applications
Filled
Cancelled
```

These meanings must remain distinct.

## Draft

* Not publicly discoverable
* Cannot receive applications

## Open

* Discoverable
* Accepting applications

## Paused

* Temporarily not accepting applications
* Existing applications remain preserved
* Client review may continue in a limited or read-only state
* Selection actions are temporarily disabled

## Closed to New Applications

* No new applications
* Existing applicants remain under consideration
* Q&A and review may continue
* Does not mean applicants were rejected

## Filled

* A freelancer accepted an exact selection request
* Engagement created
* No further applications

## Cancelled

* Opportunity no longer exists
* Existing applications close as “Gig Cancelled”
* Applicants are not labelled Not Selected
* History remains preserved

Before implementation, the existing gig status vocabulary must be inspected and migrated carefully. Existing meanings must not be silently overwritten.

---

# 7. Gig payment structures

Every published gig must use one of three payment structures.

## 7.1 Fixed-price project

Use when the client expects a defined outcome for an agreed total price.

### Required client fields

* Currency
* Budget minimum
* Budget maximum
* Budget flexibility:

  * Strict
  * Slightly flexible
  * Flexible for the right applicant

### Freelancer response options

* Comfortable within posted budget
* Propose exact total
* Propose total range
* Requires scope clarification before final quote

When proposing above the client’s maximum, the freelancer must provide a short explanation.

### Timeline response

* Exact duration
* Duration range
* Requires discussion

---

## 7.2 Hourly engagement

Use when the workload may vary.

### Required client fields

* Currency
* Hourly-rate minimum
* Hourly-rate maximum
* Expected weekly commitment range
* Expected engagement duration or duration range

### Freelancer response

* Requested hourly rate
* Weekly availability
* Available-from date
* Rate flexibility:

  * Fixed
  * Negotiable
  * Depends on weekly commitment

Any estimated engagement value shown by GigMatch must be labelled informational rather than guaranteed.

---

## 7.3 Scope-based or open to proposals

This must not mean “no financial information.”

The client must provide at least one form of guidance:

* Indicative budget range
* Maximum budget ceiling
* Expected market range
* No reliable estimate yet, with a mandatory explanation

The client must also specify the preferred proposal form:

* Total project quote
* Phased pricing
* Hourly proposal
* Freelancer recommendation

### Freelancer response options

* Estimated fixed-price range
* Proposed hourly rate
* Phased estimate
* Initial discovery phase required

The freelancer must explain:

* Included work
* Excluded work
* Assumptions
* Information that could materially change the estimate

---

# 8. Shared financial safeguards

* Currency is selected by the client.
* Freelancer proposals use the same currency.
* Important financial values use structured numeric fields.
* Free text explains values but does not replace them.
* Amounts must be positive and validated.
* Minimum values cannot exceed maximum values.
* The original posted budget remains visible beside the freelancer’s proposal.
* Application history preserves the gig terms that the freelancer originally responded to.
* Financial proposals do not automatically influence the AI suitability score.
* Cheaper applicants must not be ranked as better applicants merely because of price.
* GigMatch records proposals but does not process or guarantee payments.

---

# 9. Gig discovery and recommendation reliability

Milestone 7 needs only enough discovery to support the application workflow.

## Required discovery capabilities

* List open gigs
* List recommended gigs
* Open a complete gig detail page
* Basic pagination
* Display client/company information that is safe to expose
* Display budget, work mode, deadline and required skills
* Apply from the gig detail page

A complex marketplace search engine should not block the initial application workflow.

Advanced filters may come later.

## Semantic-ranking fallback

If semantic ranking is unavailable, GigMatch may fall back to keyword ranking, but the response must remain honest.

Example:

```json
{
  "ranking_mode": "keyword_fallback",
  "semantic_status": "unavailable",
  "semantic_unavailable_reason": "embedding_provider_not_configured",
  "ranking_score": 0.74,
  "keyword_score": 0.74,
  "semantic_score": null,
  "hybrid_score": null
}
```

The frontend must not display a hybrid or semantic score when those values were not calculated.

---

# 10. Application submission

A freelancer may create only one application history for a gig.

The backend derives the freelancer identity from the verified user. It must never accept a trusted `freelancer_id` from the request body.

## Application contains

* Gig reference
* Freelancer reference derived from authentication
* Current stage
* Current application-version reference
* Submission timestamp
* Last-updated timestamp
* Internal-shortlist state
* Advancement information
* Gig-version response status
* Withdrawal or closure information where applicable

## Application version contains

* Cover note
* Structured financial response
* Proposed amount, range or hourly rate
* Timeline response
* Availability
* Included work
* Excluded work
* Assumptions
* Scope notes
* Gig version being responded to
* Version number
* Created timestamp

Profile changes must not rewrite previous application versions.

---

# 11. Application versioning

Freelancers may edit submitted applications, but edits create new versions.

```text
Application Version 1
        ↓
Freelancer edits
        ↓
Application Version 2
```

Previous versions remain immutable and viewable.

The client should be able to compare important changes:

```text
Proposed amount: ₹40,000 → ₹48,000
Timeline: 4 weeks → 5–6 weeks
Deployment: Included → Excluded
```

The client is notified whenever an application is updated.

## Editing during a selection request

Every selection request is linked to one exact application version.

Any application edit while a selection request is active must:

```text
Cancel or invalidate the pending selection request
        ↓
Create a new application version
        ↓
Notify the client
        ↓
Require a fresh client review
        ↓
Require a new selection request
```

For the first implementation, any application edit cancels the selection request. This avoids loopholes around deciding whether an edit was “minor.”

---

# 12. Application stages

The applicant-visible stages are:

```text
Under Review
Advanced
Confirmed
Not Selected
Withdrawn
Closed — Gig Cancelled
```

`Selection Pending` should be derived from an active selection-request record rather than treated as the only source of application state.

`Internal Shortlist` remains a private client-side flag and is not an applicant-visible stage.

A separate flag may indicate:

```text
Response to Updated Gig Required
```

This avoids overloading the application stage when the client materially changes the gig.

---

# 13. Ranking actual applicants

Once freelancers apply, GigMatch should reuse the existing matching engine to rank only the applicants for that gig.

```text
Current capability:
Eligible freelancers → ranked for a gig

Milestone 7 capability:
Applicants for this gig → ranked for the client
```

## Default applicant-list views

* Best Match
* Newest
* Internal Shortlist
* Advanced

Best Match is the default.

The client retains control and may switch sorting modes.

## Ranking rules

* Price must not automatically raise or lower suitability score.
* The ranking must identify which ranking mode was used.
* Existing match explanations and skill-gap evidence should be reused.
* The AI ranking assists review; it does not make the hiring decision.

---

# 14. Enhanced applicant card

Each applicant card should contain:

## Candidate summary

* Name
* Professional headline
* Experience level
* Safe location or work preference where relevant
* Top job-relevant skills

## Match summary

```text
Strong Match · 84%
```

* Match label
* Exact score when honestly available
* Required skills matched
* Preferred skills matched
* Strongest matching evidence
* Required skill gaps
* Preferred skill gaps
* Expandable explanation

The card must state that matching is AI-assisted and the complete application should be reviewed.

## Commercial summary

* Client’s posted budget or rate
* Freelancer’s proposal
* Estimated timeline
* Availability
* Cover-note preview
* Current application-version number
* Whether proposal response is required after a gig update

## Actions

Depending on stage:

* View Full Application
* Save to Internal Shortlist
* Remove from Internal Shortlist
* Advance to Next Stage
* Ask Initial Clarification
* Request Proposal Revision
* Return to General Review
* Mark Not Selected
* Send Selection Request

No private contact information appears on applicant cards.

---

# 15. Internal shortlist and advancement

## Internal shortlist

* Private to client
* Applicant not notified
* Initial limit: 5
* Expandable to 10
* Limits are configurable
* No database schema should permanently assume 5 or 10

The limit applies only to active internal shortlist entries, not total applicants.

## Advance to Next Stage

When the client is genuinely interested:

```text
Client advances applicant
        ↓
Applicant notified
        ↓
Application stage becomes Advanced
        ↓
Full structured Q&A becomes available
```

Advancement is not a guarantee of selection.

If the client removes advancement:

### Return to General Review

* Application returns to Under Review
* Freelancer is notified
* Q&A becomes read-only until advanced again

### Mark Not Selected

* Terminal negative decision
* Structured feedback required

Every advance, removal and reopening event is audited.

---

# 16. Structured pre-selection Q&A

Every application receives a private Q&A thread between:

* The freelancer applicant
* The client who owns the gig

It is not a general messaging system.

## Before advancement

The client may ask up to two focused initial clarification questions.

Allowed subjects:

* Proposal scope
* Budget
* Timeline
* Availability
* Relevant experience
* Included or excluded work
* Important technical assumptions

The interface should limit each clarification to one focused question and prevent large bundled questionnaires.

After two questions:

```text
Initial clarification allowance exhausted
        ↓
Client must Advance to Next Stage
        ↓
Further structured discussion becomes available
```

A private internal shortlist alone does not unlock unlimited Q&A.

## Freelancer protections

The freelancer may:

* Answer
* Decline to answer
* Report the question
* Stop further pre-advancement discussion

Declining must not automatically change match score or application status.

Clients must not request:

* Free prototypes
* Complete solutions
* Unpaid architecture designs
* Full project plans
* Personal contact details
* Banking details
* Passwords, OTPs or secrets

## After advancement

The client may:

* Continue reasonable structured Q&A
* Clarify commercial terms
* Request proposal revision
* Discuss assumptions
* Ask the freelancer to update the official application

Messages cannot silently modify the official proposal.

```text
Q&A statement ≠ official proposal update
```

The freelancer must create a new application version when financial, scope, timeline or availability terms change.

## Message integrity

* Messages cannot be edited after sending.
* Users may send corrections.
* Users cannot permanently delete messages.
* Harmful content may be hidden by moderation while preserving internal records.
* No file attachments initially.
* Contact-pattern warnings and rate limits should be implemented.
* Threads become read-only when the application is withdrawn, rejected, closed or another freelancer is confirmed.

---

# 17. Proposal-revision requests

The client may request a structured revision.

Reasons include:

* Clarify scope
* Revise budget
* Revise timeline
* Explain exclusions
* Update availability
* Correct assumptions
* Other

The freelancer’s existing version remains active until a new version is submitted.

Every revision request and response is audited.

---

# 18. Marking an applicant Not Selected

The user-facing term is:

> **Not Selected**

Avoid harsh language such as “Rejected” in the freelancer interface.

## Before advancement

The client must choose at least one structured reason:

* Required skills did not align closely enough
* Experience level did not match
* Proposal exceeded available budget
* Timeline or availability did not fit
* Another applicant was a stronger overall match
* Gig requirements changed
* Gig was paused or cancelled
* Other

An optional respectful note may be added.

## After advancement

The client must provide:

* One primary structured reason
* At least one meaningful feedback point
* Optional personal note
* Confirmation that the decision is final

Feedback must remain professional and job-related.

It must not contain:

* Personal insults
* Discriminatory comments
* Appearance-based judgments
* Threats
* Unsupported allegations
* Sensitive personal information

## Reopening a Not Selected application

The client may reconsider an applicant only through:

```text
Reopen Application
        ↓
Reason recorded
        ↓
Freelancer notified
        ↓
Application returns to Under Review
```

The original decision remains visible in history.

Rejection feedback must not automatically retrain or alter the matching engine during this milestone.

---

# 19. Freelancer withdrawal

## Before a selection request

The freelancer may withdraw freely while Under Review or Advanced.

A structured reason is selected, but an explanation remains optional.

The application and Q&A become read-only.

## During an active selection request

The freelancer does not use ordinary withdrawal.

They choose:

* Accept exact terms
* Decline current request and remain interested
* Decline and withdraw completely
* Request revised terms

## Decline current request and remain interested

* Selection request becomes Declined
* Application returns to Advanced or Under Review
* Gig remains open
* Client may reconsider later
* Client should not repeatedly resend the same unchanged request

## Decline and withdraw completely

* Application becomes Withdrawn
* Future selection requests are blocked
* History remains preserved

## After engagement confirmation

Leaving is no longer an application withdrawal.

It becomes:

> Request Engagement Cancellation

---

# 20. Selection request workflow

A client may review, internally shortlist and advance several applicants.

At the final stage:

```text
Maximum active selection requests per gig = 1
```

This prevents multiple freelancers from simultaneously believing they have been selected.

## Sending the request

The selection request must reference:

* Exact application
* Exact application version
* Exact gig version
* Exact financial proposal
* Exact timeline
* Exact scope assumptions
* Response deadline

## Deadline choices

* 24 hours
* 48 hours, default
* 72 hours

The freelancer sees the exact timezone-aware expiry date and time.

## While selection is pending

* The gig may continue accepting applications if still open.
* Existing applicants remain active.
* The client may continue reviewing other applicants.
* No second final selection request may be sent.
* The selected application version is frozen.
* Relevant material gig edits invalidate the request.

Applications remain open because pausing them would create an unfair first-come-first-served dynamic.

## Expiry

If no response is received:

```text
Selection Request → Expired
Application → Previous active stage
Gig → Remains open
Other applicants → Unaffected
```

The client may later send a fresh request.

## Client cancellation

The client may cancel an active selection request only with a recorded reason.

The application returns to its previous active stage.

---

# 21. Freelancer response to a selection request

## Accept exact terms

When the freelancer accepts the exact unchanged application version:

```text
Selection Request → Accepted
Application → Confirmed
Gig → Filled
Engagement → Created
Other active applicants → Not Selected
```

No extra client confirmation is required because the client already approved the exact frozen version when sending the request.

## Request revised terms

The freelancer cannot press Accept while attaching new conditions.

They must request revised terms:

```text
Current request cannot finalize
        ↓
Proposed changes discussed
        ↓
Application updated as new version
        ↓
Client reviews new version
        ↓
Client sends a new selection request
```

## Decline and remain interested

The current request ends, but the application remains available for future consideration.

## Decline and withdraw

The application closes permanently for that gig unless the client later sends a controlled reconsideration invitation.

---

# 22. What happens to other applicants

Other applicants become Not Selected only when:

```text
Selected freelancer accepts the exact frozen terms
```

They are not cleared when the client merely sends a selection request.

This avoids prematurely rejecting everyone when the selected freelancer may decline, request different terms or let the request expire.

After confirmation, other applicants should receive an appropriate structured reason such as:

> Another applicant was selected for this gig.

---

# 23. Gig edits after applications exist

Once applications exist, the gig cannot be silently rewritten.

Every material edit creates an immutable gig version.

## Material changes

* Payment structure
* Budget or hourly-rate range
* Required skills
* Scope
* Deliverables
* Experience requirement
* Work mode
* Location requirement
* Weekly commitment
* Application deadline
* Project deadline

## Minor changes

Typographical or formatting corrections may avoid the full material-change flow when they do not alter meaning.

## Applicant notification

Applicants receive a clear comparison:

```text
Budget: ₹80,000–₹1,00,000 → ₹20,000–₹30,000
Timeline: 8 weeks → 5 weeks
Required skill added: AWS
```

The applicant chooses:

* Keep existing proposal
* Update proposal
* Withdraw without penalty

For substantial commercial or scope changes, the application receives:

> Response to Updated Gig Required

Until the freelancer responds:

* The client cannot send a new selection request to them.
* The old application remains attached to the old gig version.
* The applicant is not automatically withdrawn.
* Their ranking may remain visible with a clear warning.

## Anti–bait-and-switch accountability

Patterns such as:

```text
Post attractive budget
        ↓
Collect many applications
        ↓
Drastically lower budget
```

must be preserved in audit history and may be flagged for moderation review.

The system must record:

* Previous gig version
* New gig version
* Changed fields
* Change timestamp
* Number of affected applicants
* Applicant responses

---

# 24. Application deadline management

Every published gig should have an application deadline.

The client may:

* Close applications early
* Extend the deadline
* Reopen applications when appropriate

## Closing early

A structured reason is required.

Existing applications remain valid.

```text
Applications closed
≠ Applicants rejected
```

## Extending

Existing applicants are notified.

Submitted applications remain unchanged.

## Deadline reached

* New applications blocked
* Existing applications preserved
* Review and Q&A may continue
* Client may still advance and select applicants
* Gig does not automatically become cancelled

Deadlines use exact timezone-aware date and time values.

---

# 25. Reapplication and reconsideration

Normal rule:

```text
One application history per freelancer per gig
```

Freelancers cannot repeatedly withdraw and create fresh applications.

Reapplication is allowed only when:

* The client explicitly invites the freelancer back
* The gig materially changes
* A failed engagement causes the opportunity to reopen
* The client reopens a previously Not Selected application

Reapplication creates a new version within the original application history rather than an unrelated duplicate.

---

# 26. Pausing and cancelling a gig

Once applications exist, the client cannot delete the gig.

## Pause

The client provides a structured reason:

* Internal approval pending
* Budget temporarily unavailable
* Requirements under revision
* Hiring paused
* Business delay
* Other

Effects:

* New applications blocked
* Existing applications preserved
* Selection disabled
* Applicants notified
* Resuming the gig creates notifications
* Material changes on resume create a new gig version

## Cancel

The client provides:

* Structured reason
* Short applicant-facing explanation
* Confirmation that active applications and selection requests will close

Effects:

* Gig becomes Cancelled
* Applications become Closed — Gig Cancelled
* Active selection requests cancelled
* Applicants are not marked Not Selected
* History remains immutable

Repeated suspicious posting, cancellation and reposting patterns should be auditable.

---

# 27. Engagement Workspace

An Engagement Workspace is created after a freelancer accepts an exact selection request.

Its purpose is to preserve the confirmed terms and provide lightweight status tracking.

It is not a project-management platform.

## Engagement summary

* Gig
* Client
* Freelancer
* Confirmation date
* Current engagement status

## Immutable proposal snapshot

The workspace preserves:

* Accepted application version
* Payment type
* Agreed amount or rate
* Timeline
* Availability
* Included work
* Excluded work
* Assumptions
* Gig version

The snapshot cannot be edited.

It is a product record, not a legal-contract guarantee.

## Engagement lifecycle

```text
Confirmed
Kickoff Pending
In Progress
Completion Pending
Completed
Cancellation Pending
Cancelled
```

### Confirmed

Selection accepted and engagement created.

### Kickoff Pending

Both sides are preparing to begin.

### In Progress

Work has reportedly started.

The system records who marked it as started.

### Completion Pending

One party marked the engagement complete and awaits the other party’s confirmation.

### Completed

Both parties confirmed completion.

### Cancellation Pending

One party requested cancellation and the other has not yet acknowledged it.

### Cancelled

Engagement ended before completion.

GigMatch does not resolve financial or contractual disputes.

## Activity history

Record meaningful events such as:

* Selection request sent
* Freelancer accepted
* Engagement confirmed
* Work marked started
* Completion requested
* Completion confirmed
* Cancellation requested
* Cancellation acknowledged

The timeline must not store passwords, tokens, OTPs or private contact values.

---

# 28. Failed engagement and reopening the gig

If an engagement fails:

* Previous applicants are not automatically reactivated.
* Their prior Not Selected decisions remain historical.
* The client may reopen the gig.
* The client may selectively send reconsideration invitations.

The invited freelancer chooses:

* Reopen application
* Submit updated proposal
* Decline invitation

Nobody is assumed to remain available.

---

# 29. Secure Contact Exchange

Private contact information becomes available only after engagement confirmation.

Before confirmation, contact information must not appear in:

* Recommendation cards
* Applicant cards
* Public profiles
* Gig pages
* Q&A
* Evaluation APIs
* Admin evaluation UI

## Consent-based sharing

Each party separately chooses which details to share:

* Verified email
* Verified phone number
* WhatsApp-enabled number
* Meeting link
* Professional profile

Only genuinely verified details receive a Verified badge.

A meeting link or external professional profile must not be labelled verified unless GigMatch actually verifies it.

## Engagement-specific permission

Sharing applies only to the current engagement.

It does not publish contact information globally or expose it to future clients automatically.

## Masked display

Shared details initially appear masked:

```text
p•••••@example.com
+91 ••••• ••482
```

The authorized user deliberately chooses Reveal.

## Backend-authorized reveal

The frontend must not receive full values and merely hide them visually.

The correct flow is:

```text
User clicks Reveal
        ↓
Backend verifies authentication
        ↓
Backend verifies engagement membership
        ↓
Backend verifies sharing consent
        ↓
Reveal event recorded
        ↓
Full value returned
```

## Revocation

Users may stop future display inside GigMatch.

The UI must honestly explain:

> Revoking access hides the detail inside GigMatch but cannot erase information already viewed, copied or saved.

## Safety actions

Both sides may:

* Stop sharing
* Block further platform interaction
* Report user

Possible report categories:

* Harassment
* Spam
* Fraudulent request
* Identity misrepresentation
* Abusive communication
* Suspicious payment request
* Request for credentials
* Other

Blocking must not delete engagement history.

## Financial safety warning

The workspace should state:

> GigMatch does not currently process payments or provide escrow. Never share passwords, OTPs, access tokens or sensitive banking credentials.

---

# 30. Privacy and safe public models

Create explicit sanitized models such as:

* PublicFreelancerProfile
* PublicClientProfile
* GigSummary
* GigDetail
* ApplicantSummary
* ApplicationDetail
* EngagementSummary
* ContactShareStatus

Never expose:

* Raw resume text
* Raw gig-parse text
* Raw parse rows
* Authentication metadata
* Access tokens
* Service-role information
* Private emails or phone numbers before consent
* Embedding vectors
* Internal semantic text
* Backend secrets

---

# 31. Company and enterprise scalability

The initial implementation targets individual client accounts.

However, the schema and policies must not permanently assume:

* One reviewer per client account
* Maximum five applicants forever
* One human managing every gig
* No company teams

Future expansion may introduce:

```text
Company Workspace
├── Owner
├── Recruiter
├── Hiring Manager
└── Reviewer
```

Future capabilities may include:

* Multiple reviewers
* Assigned applicants
* Larger shortlist capacities
* Internal notes
* Reviewer activity history
* Configurable hiring policies

These features are deferred.

For Milestone 7:

* Shortlist limits must be configuration-driven.
* Activity records must identify the acting user.
* Applicant and gig ownership logic should be structured so a future organization layer can replace direct ownership without rewriting the entire domain.

---

# 32. Recommended database domains

The exact names may change during implementation, but the domain separation should remain.

## Core records

* `applications`
* `application_versions`
* `application_questions`
* `application_revision_requests`
* `selection_requests`
* `engagements`
* `engagement_events`
* `contact_shares`
* `contact_reveals`
* `gig_versions`

## State and history strategy

Use:

* Current-state columns for efficient queries
* Append-only history/event rows for important transitions
* Database constraints for critical invariants
* Server-side business logic for transitions
* RLS for defence in depth

Do not attempt full event sourcing.

---

# 33. Critical database invariants

The database and backend must enforce:

* One application history per freelancer per gig
* Only open gigs accept new applications
* Only the gig owner may review its applicants
* A freelancer may access only their own applications
* Only one active selection request per gig
* Only one confirmed applicant per gig
* Confirming selection fills the gig atomically
* Application versions are immutable
* Gig versions are immutable
* Accepted proposal snapshot is immutable
* Private contact details are not returned without authorized consent
* Cancelled or withdrawn records are preserved rather than deleted

Selecting a freelancer must happen through an atomic database transaction or controlled PostgreSQL function/RPC.

The transaction must:

1. Verify gig ownership.
2. Verify gig remains eligible.
3. Verify the selection request remains active.
4. Verify the exact proposal version has not changed.
5. Mark the request accepted.
6. Mark the application confirmed.
7. Mark the gig filled.
8. Create the engagement.
9. Mark remaining active applications Not Selected.
10. Prevent a second confirmation from succeeding.

---

# 34. Backend ownership

Important marketplace operations must go through FastAPI rather than relying on direct browser-side Supabase mutations.

The backend must:

* Verify the Supabase access token
* Load the trusted role from `user_profiles`
* Derive freelancer and client identities
* Check gig ownership
* Validate state transitions
* Apply rate limits where appropriate
* Return sanitized contracts
* Fail closed

RLS and database constraints remain required even when FastAPI performs authorization.

---

# 35. Target API surface

Exact route names may be refined, but the capability boundaries should remain.

## Gig discovery

* List open gigs
* Retrieve gig detail
* Pause, resume or cancel owned gig
* Create a new gig version after material edit

## Freelancer applications

* Submit application
* View My Applications
* View application detail
* Create application version
* Withdraw application
* Respond to changed gig terms
* Respond to reconsideration invitation

## Client applicant review

* List applications for owned gig
* Retrieve sanitized applicant detail
* Add/remove internal shortlist
* Advance applicant
* Return applicant to review
* Mark applicant Not Selected
* Reopen application

## Q&A

* Ask initial clarification
* Reply
* Request proposal revision
* View thread

## Selection requests

* Send request
* Cancel request
* Accept
* Decline and remain interested
* Decline and withdraw
* Request revised terms

## Engagement

* View engagement
* Update high-level status
* Request completion
* Confirm completion
* Request cancellation
* Acknowledge cancellation

## Contact exchange

* Share contact method
* Stop sharing
* List masked shared methods
* Reveal authorized method
* Report or block

---

# 36. Frontend product surfaces

## Freelancer

* Open-gig discovery
* Recommended gigs
* Gig detail
* Application form
* My Applications
* Application detail and version history
* Q&A
* Selection request response
* Engagement Workspace
* Secure Contact Exchange

## Client

* Real client dashboard
* Gig overview
* Applicant inbox
* Best Match/Newest/Shortlist/Advanced sorting
* Full applicant detail
* Application-version comparison
* Structured Q&A
* Proposal-revision requests
* Selection request flow
* Engagement Workspace
* Secure Contact Exchange

## Shared frontend requirements

* Consistent loading states
* Honest empty states
* Accessible confirmation dialogs
* Clear destructive-action warnings
* Responsive layout
* Status badges
* Audit/activity timeline
* Error handling
* Toasts where useful
* Route-level lazy loading where beneficial

Frontend foundations should be built when required by these workflows, not as an unrelated design-system exercise.

---

# 37. Verification requirements

## Backend tests

* Applying to open gig
* Applying to draft, paused, closed, filled or cancelled gig
* Duplicate application
* Wrong-role access
* Cross-user application access
* Cross-client applicant access
* Application-version creation
* Version immutability
* Editing during selection invalidates request
* Material gig edit creates new version
* Applicant response to changed gig
* Initial Q&A allowance
* Q&A authorization
* Internal shortlist limit
* Advancement transitions
* Not Selected feedback requirements
* Withdrawal rules
* Reapplication rules
* Selection-request deadline
* Only one active selection request
* Decline and remain interested
* Decline and withdraw
* Expiry
* Atomic acceptance
* Concurrent acceptance attempts
* Gig filling
* Remaining applicant closure
* Engagement creation
* Engagement-status transitions
* Contact-sharing authorization
* Reveal authorization
* Contact masking
* Revocation behaviour
* Sanitized response contracts
* RLS policies

## Frontend tests

At minimum, add focused tests for:

* Application form validation
* Financial-field behaviour
* Applicant-card rendering
* Sorting controls
* Status transitions
* Selection-request warnings
* Gig-change comparison
* Application-version comparison
* Contact masking and reveal states

## End-to-end test

The primary story:

```text
Client publishes open gig
        ↓
Freelancer discovers gig
        ↓
Freelancer submits application
        ↓
Client sees applicant ranked
        ↓
Client advances applicant
        ↓
Client sends selection request
        ↓
Freelancer accepts exact terms
        ↓
Gig becomes filled
        ↓
Other applicant becomes Not Selected
        ↓
Engagement Workspace appears for both users
```

Additional E2E case:

```text
Client sends selection request
        ↓
Freelancer edits proposal
        ↓
Request is invalidated
        ↓
Client reviews new version
        ↓
Fresh selection request required
```

---

# 38. Milestone 7 implementation split

This scope is too large for one implementation task.

It should be treated as one product milestone with tightly separated submilestones.

## Milestone 7 Entry Gate — Existing Product Smoke Baseline

Before changing the product:

* Run current admin, freelancer and client browser flows
* Confirm existing authentication and role routing
* Confirm current matching pages
* Record failures honestly
* Do not mix unrelated redesign work into this gate

This closes the currently pending manual-browser verification gap.

---

## 7A — Marketplace Domain Contracts and State Machines

Define only:

* Gig lifecycle
* Application lifecycle
* Selection-request lifecycle
* Engagement lifecycle
* Transition matrices
* Structured rejection reasons
* Structured withdrawal reasons
* Structured cancellation reasons
* Payment contracts
* Proposal contracts
* Public/private DTOs
* Ranking fallback contract
* Policy configuration contracts

No database migration, routes or frontend.

---

## 7B — Database Foundation, Versioning, RLS and Constraints

Implement:

* Applications
* Application versions
* Gig versions
* Selection requests
* Engagement records
* Essential audit events
* Required RLS
* Unique constraints
* Atomic confirmation transaction
* Database tests

Do not implement Q&A or contact exchange yet.

---

## 7C — Gig Discovery, Gig Detail and Ranking Reliability

Implement:

* Open-gig listing
* Gig detail
* Sanitized client/company data
* Recommendation links to detail
* Explicit ranking-mode fallback
* Basic pagination
* Material gig-version creation
* Deadline, pause and cancellation rules

Avoid advanced search/filter scope.

---

## 7D — Freelancer Application Vertical Slice

Implement backend and frontend together:

* Structured application form
* Fixed/hourly/open proposal fields
* Application submission
* My Applications
* Application detail
* Application version editing
* Version history
* Withdrawal
* Gig-change response

At the end of 7D, the freelancer must be able to apply and manage the complete pre-selection application record.

---

## 7E — Client Applicant Inbox and Ranked Review

Implement:

* Applicant list for owned gig
* Best Match/Newest/Internal Shortlist/Advanced views
* Enhanced applicant cards
* Full applicant detail
* Matching evidence
* Commercial proposal comparison
* Internal shortlist
* Configurable shortlist limits
* Advance to Next Stage
* Return to review
* Not Selected workflow
* Structured feedback
* Reopening applications

---

## 7F — Structured Q&A and Proposal Revision

Implement:

* Two initial clarification questions
* Freelancer decline/report controls
* Full post-advancement Q&A
* Immutable messages
* Proposal-revision requests
* Contact-pattern warnings
* Rate limits
* Read-only closure states
* Dashboard indicators for unanswered questions

No general chat, files or calls.

---

## 7G — Selection Request and Confirmation Transaction

Implement:

* One active request per gig
* 24/48/72-hour deadlines
* Version-bound frozen terms
* Accept exact terms
* Decline and remain interested
* Decline and withdraw
* Request revised terms
* Edit invalidation
* Expiry
* Client cancellation
* Atomic confirmation
* Gig filling
* Remaining applicants marked Not Selected

This submilestone requires especially strong concurrency and authorization tests.

---

## 7H — Engagement Workspace

Implement:

* Engagement creation
* Immutable accepted proposal snapshot
* Confirmed/Kickoff/In Progress/Completion/Cancelled lifecycle
* Shared activity timeline
* Completion confirmation
* Cancellation request and acknowledgement
* Reopening gig after failed engagement
* Selective reconsideration invitations

Do not add work-delivery management.

---

## 7I — Secure Contact Exchange

Implement:

* Engagement-specific consent
* Verified-status display
* Masked values
* Backend-authorized reveal
* Reveal audit
* Sharing revocation
* Honest revocation warning
* Report and block controls
* Financial-safety messaging

Do not automatically expose stored contact details.

---

## 7J — Dashboard Consolidation and Product Workflow Polish

Only after the workflows are stable:

* Real freelancer dashboard
* Real client dashboard
* Application counts
* Applicant-review indicators
* Selection-request indicators
* Active Engagements
* Loading/error/empty states
* Responsive layouts
* Accessibility checks
* Necessary reusable components
* Bundle/lazy-loading improvements

---

## 7K — Security, Integration and End-to-End Closure

Run:

* Complete backend suite
* Frontend lint and build
* Frontend focused tests
* RLS verification
* Concurrency tests
* Sanitized-response checks
* Real local Supabase browser smoke
* Main E2E journey
* Failure-path E2E journey
* Documentation updates
* Honest limitation recording

Milestone 7 is complete only when both client and freelancer can perform the complete workflow through the real UI.

---

# 39. Final locked direction

Milestone 7 is not:

```text
More matching
More metrics
A generic frontend redesign
A complete freelancing platform
```

It is:

```text
Reliable discovery
        +
Structured applications
        +
Ranked applicant review
        +
Versioned commercial proposals
        +
Fair selection safeguards
        +
Confirmed engagement record
        +
Consent-based contact exchange
```

The completed product story must be:

> A client publishes a financially clear gig. Suitable freelancers discover it, understand why it matches and submit structured proposals. The client reviews actual applicants using explainable ranking, advances serious candidates, clarifies terms, and sends one version-bound selection request. The freelancer accepts the exact unchanged terms, the gig becomes filled, other applicants receive closure, and both parties enter a secure lightweight Engagement Workspace.

That is the locked Milestone 7 product direction.
