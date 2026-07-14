# Milestone 7A Verification Closure

Milestone 7A is complete and tested. Milestone 7 as a whole remains in progress.

## Repository inspection

- Runtime: Python 3.14.6.
- Installed Pydantic: 2.13.4. Pydantic settings use `SettingsConfigDict`, but the existing
  pure matching/evaluation contracts use frozen standard-library dataclasses.
- Pure contract convention: `@dataclass(frozen=True)`, `str` plus `Enum`, tuples for
  immutable collections, and small explicit builder/validator functions.
- Domain error convention: focused exception types at domain/data-access boundaries;
  value-focused utilities sometimes subclass `ValueError`.
- Tests: standard-library `unittest` under `backend/tests`.
- Existing persisted/frontend gig vocabulary: `draft`, `open`, and `closed`.
- Existing matching route responses: hybrid ranking with separate keyword, semantic,
  and hybrid scores; internal score values are floats normalised to 0-1.
- Existing privacy-safe matching responses expose compact profile/gig fields and
  explanation evidence, not contact details, raw parse text, vectors, auth metadata, or
  secrets.
- Existing immutable internal contracts use frozen dataclasses. Existing matching data
  access normalises parsed datetimes to timezone-aware UTC values.
- Existing application configuration uses Pydantic settings and `.env`; 7A does not
  load configuration or environment values.

The legacy three-value gig status is not a 7A architectural contradiction. Milestone 7A
does not migrate or reinterpret storage. Its isolated domain model represents lifecycle,
application intake, and operational pause as orthogonal concepts; later Milestone 7B/7C
work must map or migrate persisted values explicitly.

No genuine repository contradiction prevented the locked 7A architecture.

## Focused code-review closure patch

A focused post-implementation review reopened 7A before 7B and identified eleven
contract defects. The architecture did not require redesign. The closure patch now:

- Preserves the structured client payment contract beside the freelancer proposal in
  every immutable accepted engagement snapshot. Commercial warnings that required
  client acknowledgement must also be acknowledged in the snapshot.
- Never compares an hourly rate directly with a total open-project budget ceiling.
  This combination is explicitly unresolved and requires client acknowledgement.
- Requires `ranking_score` to equal the component selected by Hybrid, Semantic,
  Keyword, or Keyword Fallback mode.
- Fixes automatic closure effects to carry `SELECTION_CONFIRMED` and
  `ANOTHER_APPLICANT_SELECTED` as immutable metadata.
- Enforces monotonic engagement action timestamps and application-version creation
  timestamps.
- Rejects duplicate application IDs in a pure shortlist input.
- Always rejects a second request while the prior selection request is pending and
  restricts unchanged terminal resends by the prior outcome and structured reason.
- Rejects leading or trailing whitespace instead of retaining ambiguous identity/text
  values.
- Rejects impossible application-stage response flags, mutable skill lists, reversed
  commercial ranges, and duplicate engagement participant identities.
- Keeps paused-with-closed-intake as internal orthogonal state while exposing the locked
  public `PAUSED` product status. `GigProductState` therefore has exactly six values.

Each correction has focused regression coverage. Milestone 7B was not started while
these findings were open.

## Entry-gate baseline

Before implementation:

```bash
cd backend
./.venv/bin/python -m unittest discover -s tests
```

Result: `Ran 236 tests ... OK (skipped=3)`.

```bash
cd frontend
npm run lint
npm run build
```

Result: both passed. Vite emitted the existing non-blocking warning that a generated
chunk exceeds 500 kB after minification.

Manual admin, freelancer, and client browser smoke was not run. The repository contains
local Supabase configuration, but it does not provide verified role-specific test-account
credentials for a real end-to-end session. Browser smoke therefore remains pending; no
successful manual result is claimed.

## Implemented architecture

The pure `app.marketplace` package contains:

- Orthogonal gig lifecycle, intake, and operational state with derived product-facing
  state. Pause/resume preserves intake without `status_before_pause`.
- Application stages and explicit valid/invalid transition rules. Selection Pending and
  Internal Shortlist are not application stages.
- Separate internal-shortlist eligibility, active-entry counting, and configurable
  capacity validation.
- Immutable application versions with positive version numbers, exact gig-version
  linkage, version origin, structured proposal, concrete or unresolved timeline,
  availability, scope, and acting-user/timestamp metadata. Currentness remains derived
  from the parent application's `current_version_id`.
- Structured fixed-price, hourly, and open client payment contracts and compatible
  freelancer proposal variants using `Decimal` for financial values.
- Currency, financial range, duration, phased estimate, discovery phase, out-of-range
  warning, client acknowledgement, and explicit ceiling validation.
- Version-bound selection requests with timezone-aware deadlines, one-active-request
  readiness guards, terminal response states, decline disposition, cancellation detail,
  invalidation reasons, and unchanged-resend protection.
- Selection readiness validation for application stage/currentness, gig operability,
  latest gig-version response, concrete commercial/timeline terms, compatibility,
  active-request exclusivity, and out-of-range acknowledgement.
- Two-party engagement state transitions, immutable accepted proposal snapshots with
  both posted client payment terms and the accepted freelancer proposal,
  participant actor metadata, other-party confirmation rules, and reversible
  cancellation requests.
- Context-specific Not Selected, withdrawal, pause, cancellation, reconsideration, and
  resend reasons. `OTHER` requires explanation. Advanced Not Selected decisions require
  feedback and finality; automatic closure does not fabricate feedback.
- Honest hybrid, semantic, keyword, and keyword-fallback metadata with safe semantic
  unavailable reason codes. Applicant sorting and filtering are separate.
- Validated product-policy defaults for shortlist, advancement, clarification, and
  selection deadlines. Ten is an expanded option, not an enterprise maximum.
- Minimal sanitised client/freelancer, proposal, stage, selection, ranking, and
  engagement response primitives without contact, raw parsing, auth, vector, or secret
  fields.
- Narrow effects for accepted selection, gig cancellation, application-version change,
  material gig-version change, and failed-engagement reopening. No repository, command
  bus, event framework, or persistence layer exists.

## Automated verification

Focused Milestone 7A suite:

```bash
cd backend
./.venv/bin/python -m unittest \
  tests.test_marketplace_gigs_applications \
  tests.test_marketplace_payments_selections \
  tests.test_marketplace_engagements \
  tests.test_marketplace_contracts
```

Result: `Ran 87 tests ... OK`.

The focused tests cover valid and invalid state transitions, terminal states, version
immutability, derived state, shortlist policy, payment/proposal validation, financial
compatibility, selection readiness and invalidation, two-party engagement rules,
structured reasons, ranking honesty, sanitised fields, policy expansion, narrow effects,
and framework-free imports.

Relevant existing matching contract, ranking, data-access, and route regression suite:

```bash
cd backend
./.venv/bin/python -m unittest \
  tests.test_matching_builders \
  tests.test_keyword_matching \
  tests.test_semantic_matching \
  tests.test_semantic_ranker \
  tests.test_hybrid_matching \
  tests.test_matching_data_access \
  tests.test_matching_routes \
  tests.test_matching_explanation_contracts
```

Result: `Ran 106 tests ... OK`. Starlette emitted its existing
`asyncio.iscoroutinefunction` deprecation warning.

Full backend discovery:

```bash
cd backend
./.venv/bin/python -m unittest discover -s tests
```

Result: `Ran 323 tests ... OK (skipped=3)`. The three skips remain the opt-in
Supabase smoke tests. Existing Python/SWIG and Starlette dependency deprecation warnings
were non-blocking; 7A introduced no new warning.

Frontend closure checks:

```bash
cd frontend
npm run lint
npm run build
```

Result: both passed. Build retained the existing non-blocking Vite chunk-size warning.

## Explicit exclusions

Milestone 7A added no:

- Database migration, SQL schema, Supabase table/query, RLS policy, PostgreSQL function,
  or RPC.
- FastAPI route, API handler, frontend page, or frontend TypeScript contract.
- Notification, audit persistence, Q&A storage/message, proposal-revision persistence,
  selection transaction, engagement persistence, or contact exchange.
- Payment processing, escrow, invoice, legal contract, chat, company workspace, reviewer
  assignment, ranking algorithm, price-based ranking, behavioural learning, or
  LLM-generated explanation.

## Next boundary

Milestone 7B remains not started and is the next implementation boundary: database
foundation, versioning, RLS, constraints, and atomic invariants. Milestone 7 must not be
marked complete until the later workflow milestones and end-to-end closure are verified.
