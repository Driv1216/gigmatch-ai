# BE Project Source Context

**Last updated:** 7 July 2026  
**Current milestone:** Milestone 6 — Admin Evaluation Dashboard complete and tested  
**Current status:** Milestone 0 through Milestone 6 are complete. Milestone 7 — Deployment and Black Book is next.  
**Primary project rule:** This source context overrides old report/PPT/paper content unless the user explicitly says otherwise.  
**Use rule:** Future chats should treat this file as project memory, not as a task prompt.

---

## Project Title

**An AI-Powered Platform for Intelligent Gig Discovery and Matching**

This is the fixed official title for the final-year Bachelor of Engineering project. The title should not be changed for college submission.

---

## Repository

**Internal product/repo name:** GigMatch AI  
**Repository path:** `/Users/drivyaanshyadav/Desktop/Ai-Gig/gigmatch-ai`

This project is intended to be a serious, product-grade, deployed AI SaaS-style prototype, not a basic college CRUD app.

---

## Completed Milestone Status

- Milestone 0 — Foundation: complete
- Milestone 1 — Supabase Auth and Role Routing: complete
- Milestone 2A — Freelancer and Client Profile Setup: complete
- Milestone 2B — Gig Posting: complete
- Milestone 3 — Resume/Gig Parsing: complete
- Milestone 4 — Matching Engine: complete
- Milestone 5 — Explainability and Skill Gap: complete
- Milestone 6 — Admin Evaluation Dashboard: complete
- Milestone 7 — Deployment and Black Book: planned next

Milestone 6 is closed only as a seeded, internal evaluation workflow. It is not a production-scale benchmark and is not the final team-approved analytics dashboard design.

---

## Milestone 6 Completion Summary

Milestone 6 completed:

- 6A — Evaluation Dataset, Relevance Label Contract, and Seeded Fixtures
- 6B — Pure Metric Calculation Utilities
- 6C — Evaluation Runner and Ranking Comparison Builder
- 6D — Admin-Only Evaluation API
- 6E — Admin Evaluation Console UI
- 6F — Verification, Limitations, and Docs Closure

Milestone 6 added backend-only evaluation contracts, seeded local/demo fixtures, pure metric utilities, a backend runner that separately compares keyword, semantic, and hybrid rankings over the same candidate pools, an admin-only `GET /evaluation/matching` endpoint, and an internal admin evaluation console at `/dashboard/admin`.

The admin evaluation console calls the real 6D endpoint with the current Supabase access token, renders backend-provided evaluation data, shows unavailable metric reasons, and does not calculate metrics in the frontend.

---

## Latest Verification Results

Backend evaluation suite:

```bash
cd backend
./.venv/bin/python -m unittest tests.test_evaluation_fixtures tests.test_evaluation_metrics tests.test_evaluation_runner tests.test_evaluation_routes
```

Result: passed, 51 tests.

Selected matching/auth regression suite:

```bash
cd backend
./.venv/bin/python -m unittest tests.test_matching_builders tests.test_keyword_matching tests.test_semantic_matching tests.test_semantic_ranker tests.test_hybrid_matching tests.test_matching_data_access tests.test_matching_routes
```

Result: passed, 99 tests.

Full backend discovery:

```bash
cd backend
./.venv/bin/python -m unittest discover -s tests
```

Result: passed, 236 tests, 3 skipped. Python/SWIG and Starlette dependency deprecation warnings were non-blocking.

Frontend:

```bash
cd frontend
npm run build
npm run lint
```

Result: both passed. Vite emitted the existing non-blocking chunk-size warning during build.

Manual browser smoke was not run during Milestone 6F because verified local admin/freelancer/client accounts and end-to-end local Supabase credentials were not available in this session. Do not claim manual browser smoke has passed until it is actually performed.

---

## Current Evaluation Scope

Milestone 6 uses seeded local/demo fixtures only.

Evaluation metrics are calculated only from explicit relevance labels:

- `0`: not relevant
- `1`: partially relevant
- `2`: strongly relevant

Unavailable metrics are returned and rendered honestly when judgments are incomplete or a metric is not mathematically valid. Unavailable metrics are not silently treated as zero.

The 6D API is admin-only and uses the trusted `user_profiles.role` lookup. Public signup does not create admin accounts.

---

## Privacy and Safety Boundaries

The matching, explanation, and evaluation UI/API must not expose:

- raw resume text
- raw gig description text
- raw parse rows
- emails in recommendation or evaluation surfaces
- auth metadata
- service-role details
- backend secrets
- embedding vectors
- raw semantic text
- private profile fields
- `.env` values
- Supabase secret keys
- access tokens

Do not put real secrets into documentation, source context, prompts, or committed files.

---

## No-Fake-Claims Rules

Do not add or claim:

- fake production-scale datasets
- fake evaluation metrics
- fake improvement percentages
- fake case-study results
- fake dashboards pretending to be final analytics
- fake behavioral learning
- fake reinforcement learning
- fake fairness guarantees
- unverified large-scale numbers
- LLM-generated explanations unless explicitly scoped later
- pgvector or FAISS retrieval unless explicitly scoped later
- saved match history unless explicitly scoped later
- payments, bidding, chat, contract management, or marketplace operations

Old report/PPT/paper claims such as 500,000 freelancer profiles, 120,000 job descriptions, NDCG/MAP improvements, time-to-hire reductions, trust-score improvements, and production-scale behavioral learning are legacy-only and unsafe unless reproduced by the actual implementation.

---

## Known Limitations

- Manual browser smoke for Milestone 6 remains pending.
- Evaluation fixtures are small seeded local/demo data, not production benchmarks.
- The admin evaluation console is internal and technical, not final dashboard design.
- No production-scale ranking metric claims.
- No pgvector/FAISS retrieval.
- No saved match history.
- No behavioral feedback learning.
- No fairness guarantee.
- No payment, bidding, chat, contract, or marketplace operation flows.

---

## Current Next Action

Milestone 7 — Deployment and Black Book.

Before Milestone 7, run manual browser smoke with real local admin/freelancer/client accounts and document the result honestly. Do not turn seeded evaluation output into production-scale claims in deployment, report, PPT, or black book materials.
