# Matching and Explainability

Milestone 4 closes the backend matching foundation. Milestone 5 closes the explainability flow from backend explanation evidence through frontend recommendation UI. The backend builds safe deterministic `explanation` objects for both matching directions, the existing matching routes expose those objects additively, and the frontend renders them through shared explanation components on freelancer and client recommendation screens.

Milestone 5 does not add LLM explanation generation, admin analytics, ranking metrics, vector database retrieval, saved match history, behavioral learning, or marketplace actions.

Milestone 6A adds backend-only matching evaluation fixture contracts for future evaluation work. Milestone 6B adds pure metric calculation utilities over ranked candidate ids and explicit judgments. Milestone 6C adds a backend-only evaluation runner that compares keyword, semantic, and hybrid rankings over the same fixture candidate pools. Milestone 6D exposes that runner through an admin-only backend endpoint. Milestone 6E adds an internal admin evaluation console that renders the 6D response. Milestone 6F verifies and closes this evaluation slice. These milestones do not add final product analytics design or make accuracy/improvement claims.

## Implemented Flow

- 4A: normalized freelancer and gig matching entities.
- 4B: deterministic keyword baseline scoring and ranking.
- 4C: semantic text builders, embedding provider interface, deterministic fake provider for tests, and lazy optional sentence-transformers provider.
- 4D: runtime semantic similarity scoring and ranking with injected providers.
- 4E: hybrid ranking over keyword and semantic scores.
- 4F-A: auth-safe matching data access using verified Supabase tokens, trusted `user_profiles.role`, ownership checks, and read-only table access.
- 4F-B: authenticated bidirectional backend matching API routes.
- 4G: verification and documentation closure.
- 5A: backend-only explanation and skill-gap contract models/enums for future explanation data.
- 5B: backend-only explanation evidence builder over existing normalized profiles and hybrid results.
- 5C: backend-only deterministic skill-gap summary builder over existing missing-skill evidence.
- 5D: backend-only deterministic explanation text builder over existing structured evidence.
- 5E: additive matching API response extension with safe deterministic explanations.
- 5F-A: shared frontend explanation types, display helpers, and reusable explanation UI components.
- 5F-B: freelancer dashboard recommended gigs UI using backend-ranked results and shared explanations.
- 5F-C: client Manage Gigs recommended freelancers UI using backend-ranked results and shared explanations.
- 5G: end-to-end verification and documentation closure for Milestone 5.
- 6A: backend-only evaluation fixture contract, small seeded fixture set, loader, and validation.
- 6B: backend-only pure metric utilities for Precision@K, Recall@K, NDCG@K, Average Precision, and MAP availability checks.
- 6C: backend-only evaluation runner and ranking comparison builder for keyword, semantic, and hybrid strategies over seeded fixtures.
- 6D: admin-only backend evaluation endpoint that delegates to the 6C runner.
- 6E: modular admin evaluation console UI that calls the 6D endpoint and renders backend-provided seeded evaluation data.
- 6F: verification, limitations, and documentation closure for Milestone 6.

The default hybrid formula is:

```text
hybrid_score = (0.55 * keyword_score) + (0.45 * semantic_score)
```

The API response exposes compact score components only: `hybrid_score`, `keyword_score`, and `semantic_score`. Detailed internal scoring components remain backend internals for tests and future explainability work.

Milestones 5A through 5G do not change ranking behavior. 5A defines serializable backend contracts for reason codes, compact score evidence, skill evidence, skill-gap summaries, and neutral match explanations. 5B builds deterministic structured evidence for matched/missing required and preferred skills, compact scores, and evidence-supported reason codes for both freelancer-to-gig and gig-to-freelancer explanation flows. 5C summarizes missing-skill evidence with deterministic `none`, `low`, `medium`, or `high` severity and compact focus skills without adding non-missing skills. 5D renders short deterministic summary text from existing evidence without LLMs or network calls. 5E adds the resulting `explanation` object to each existing matching result item without removing or renaming existing fields. 5F-A through 5F-C render backend-provided explanation data in the frontend without generating new explanation text, recalculating scores, or re-ranking results. 5G verifies and documents the completed Milestone 5 flow.

## Routes

### GET /matching/recommended-gigs

Purpose: recommend open gigs for the authenticated freelancer.

Requirements:

- `Authorization: Bearer <TOKEN>` header.
- Authenticated user must have `user_profiles.role = freelancer`.
- `limit` query parameter is optional, defaults to `10`, and must be between `1` and `50`.

High-level data flow:

1. Verify the bearer token with Supabase Auth.
2. Load the trusted role from `user_profiles`.
3. Load the authenticated freelancer profile and latest usable resume parse data.
4. Load open gig candidates and latest usable gig parse data.
5. Build normalized matching profiles.
6. Rank candidates with the hybrid ranker.
7. Return a compact response envelope.

Envelope shape:

```json
{
  "items": [],
  "count": 0,
  "limit": 10,
  "ranking_method": "hybrid"
}
```

Item fields:

- `gig_id`
- `title`
- `category`
- `status`
- `rank`
- `hybrid_score`
- `keyword_score`
- `semantic_score`
- `explanation`

Common errors:

- `401`: missing, malformed, or invalid bearer token.
- `403`: authenticated user is not a freelancer, has an unsupported role, or has no required matching profile.
- `422`: invalid `limit`.
- `503`: embedding provider is not configured after auth/data access succeeds.

Explanation fields:

- `summary`
- `subject_id`
- `subject_type`
- `candidate_id`
- `candidate_type`
- `rank`
- `reasons`
- `score`
- `skill_gap`

Privacy boundary:

- Does not return raw resume text, raw parse rows, gig descriptions, client ids, email addresses, auth metadata, service-role details, embedding text, raw semantic text, or private account fields.

### GET /matching/gigs/{gig_id}/recommended-freelancers

Purpose: recommend freelancers for a gig owned by the authenticated client.

Requirements:

- `Authorization: Bearer <TOKEN>` header.
- Authenticated user must have `user_profiles.role = client`.
- `gig_id` must belong to that client.
- `limit` query parameter is optional, defaults to `10`, and must be between `1` and `50`.

High-level data flow:

1. Verify the bearer token with Supabase Auth.
2. Load the trusted role from `user_profiles`.
3. Load the requested gig and enforce ownership.
4. Load the latest usable gig parse data.
5. Load matchable freelancer candidates and latest usable resume parse data.
6. Build normalized matching profiles.
7. Rank candidates with the hybrid ranker.
8. Return a compact response envelope.

Envelope shape:

```json
{
  "items": [],
  "count": 0,
  "limit": 10,
  "ranking_method": "hybrid"
}
```

Item fields:

- `freelancer_id`
- `headline`
- `primary_role`
- `rank`
- `hybrid_score`
- `keyword_score`
- `semantic_score`
- `explanation`

Common errors:

- `401`: missing, malformed, or invalid bearer token.
- `403`: authenticated user is not a client, admin attempted to bypass a client path, profile is missing, or the gig belongs to another client.
- `404`: requested gig does not exist.
- `422`: invalid `limit`.
- `503`: embedding provider is not configured after auth/data access succeeds.

Explanation fields:

- `summary`
- `subject_id`
- `subject_type`
- `candidate_id`
- `candidate_type`
- `rank`
- `reasons`
- `score`
- `skill_gap`

Privacy boundary:

- Does not return raw resume text, raw parse rows, freelancer bios, project links, email addresses, auth metadata, service-role details, embedding text, raw semantic text, or private account fields.

## Milestone 5 Explanation Object

Each matching result item includes a safe additive `explanation` object. The object is generated after ranking and does not affect score calculation or ordering.

Top-level fields:

- `summary`: deterministic backend text built from available evidence.
- `subject_id` and `subject_type`: the authenticated matching side, either `freelancer` or `gig`.
- `candidate_id` and `candidate_type`: the returned recommendation side.
- `rank`: copied from the ranked result.
- `reasons`: evidence-backed reason objects with human-readable frontend labels.
- `score`: compact score evidence such as hybrid, keyword, semantic, weights, coverage, category alignment, and missing-required-skill penalty where available.
- `skill_gap`: severity plus matched required skills, matched preferred skills, missing required skills, missing preferred skills, and focus skills.

Reason codes are deterministic internal values such as `required_skill_match` or `semantic_score_support`. The frontend maps these to human-readable labels such as "Required skill overlap" and "Semantic similarity contributed" rather than showing raw codes as the primary UI.

## Frontend Explanation UI

Shared frontend files:

- `frontend/src/lib/matchingExplanations.ts`: mirrors the backend explanation shape, formats score values, normalizes nullable arrays, and maps severity/reason/score labels.
- `frontend/src/components/MatchExplanationPanel.tsx`: renders summary text, matched and missing skills, skill-gap severity, focus skills, score evidence, and secondary reason details.
- `frontend/src/lib/matching.ts`: calls the matching API routes with the current Supabase access token.

Freelancer flow:

- `frontend/src/pages/FreelancerDashboardPage.tsx` calls `GET /matching/recommended-gigs`.
- The request uses `Authorization: Bearer <access_token>` from `supabase.auth.getSession()`.
- The page renders recommendation cards in the order returned by the backend.
- Each card renders `MatchExplanationPanel` with the backend-provided `explanation`.

Client flow:

- `frontend/src/pages/ManageGigsPage.tsx` lists client-owned gigs using the existing Supabase frontend client.
- The client selects a gig with the View Recommendations action.
- The page calls `GET /matching/gigs/{gig_id}/recommended-freelancers` for the selected client-owned gig.
- The request uses `Authorization: Bearer <access_token>` from `supabase.auth.getSession()`.
- The page renders recommended freelancer cards in the order returned by the backend.
- Each card renders `MatchExplanationPanel` with the backend-provided `explanation`.

Frontend boundaries:

- The frontend does not sort or re-rank recommendations.
- The frontend does not recalculate hybrid, keyword, semantic, or skill-gap values.
- The frontend does not generate explanation text or call an LLM.
- The frontend does not render raw resume text, raw gig description text, emails, auth metadata, service-role details, embedding vectors, raw semantic text, or private profile fields.
- The frontend handles loading, error, empty, and select-gig states with neutral copy.

## Milestone 6A Evaluation Fixtures

Milestone 6A defines a small backend-only evaluation data contract for future matching evaluation. The contract answers which direction is being evaluated, what the query entity is, which candidates are judged, what relevance label each judged candidate has, where the label came from, and whether the query's judgment set is complete enough for future recall/MAP decisions.

The implemented query directions are:

- `freelancer_to_gigs`
- `gig_to_freelancers`

The implemented relevance labels intentionally use a 0-2 scale:

- `0`: not relevant
- `1`: partially relevant
- `2`: strongly relevant

The implemented label sources are:

- `seeded_fixture`
- `manual_review`

The seeded fixture file is a small deterministic local/demo dataset used to validate the evaluation data contract. Fixture entities are normalized through the existing matching entity builders so a later evaluation runner can use the same query/candidate pool for keyword, semantic, and hybrid ranking comparisons.

Validation checks include non-empty fixture/query ids, at least one query, unique query ids within a fixture, allowed query directions, at least one candidate and judgment per query, unique candidate ids, no duplicate judgments for the same candidate, judgment candidate ids that exist in the candidate pool, relevance labels limited to 0/1/2, allowed label sources, complete-judgment-set coverage, and unique fixture ids across seeded fixture files.

Milestone 6A does not calculate Precision@K, Recall@K, NDCG, MAP, query timing, or any ranking metric. It does not run keyword, semantic, or hybrid rankers, does not use existing route output as a ranking comparison, does not add dashboard UI, and does not make production-scale or improvement claims. Future milestones should calculate metrics only when the fixture judgment completeness and label source make the metric valid.

## Milestone 6B Evaluation Metrics

Milestone 6B adds `backend/app/evaluation/metrics.py`, a pure utility module that consumes ranked candidate ids plus explicit relevance judgments from 6A, or an equivalent candidate-id-to-label mapping. The output contract is `MetricResult`, with `metric_name`, `value`, `is_available`, `reason`, `k`, and `details` fields.

Availability rules are intentionally conservative:

- Precision@K requires a non-empty ranking, positive `k`, at least one judgment, unique ranked ids, and judgments for every evaluated top-K candidate.
- Recall@K requires a complete judgment set, a non-empty ranking, positive `k`, known relevant candidates, unique ranked ids, and judged top-K candidates.
- NDCG@K requires a non-empty ranking, positive `k`, valid 0-2 graded labels, unique ranked ids, and judged top-K candidates.
- Average Precision requires a complete judgment set, a non-empty ranking, unique ranked ids, judged evaluated candidates, and at least one relevant candidate.
- MAP requires at least two available query-level Average Precision results. Callers should include only queries with complete judgments and at least one relevant candidate.

Precision@K and NDCG@K do not silently treat unjudged top-K candidates as not relevant. Relevance labels use the 6A scale directly: `0` not relevant, `1` partially relevant, and `2` strongly relevant. NDCG@K uses graded relevance in the standard DCG formula and returns available `0.0` when IDCG is zero because all judged candidates have relevance `0`. Average Precision uses binary relevance, where labels `1` and `2` count as relevant.

Milestone 6B does not run keyword, semantic, or hybrid ranking, does not load matching API routes, does not compare ranking methods, does not create an evaluation runner, does not add admin APIs or dashboard UI, and does not make production-scale metric or improvement claims.

## Milestone 6C Evaluation Runner

Milestone 6C adds `backend/app/evaluation/runner.py`, a backend-only runner that consumes loaded 6A fixtures and an injected embedding provider. For each query it runs the internal keyword, semantic, and hybrid rankers separately over the same query entity and candidate pool, then evaluates each ranked candidate list with the 6B metric utilities.

The runner returns structured dataclass results:

- `EvaluationStrategy`: `keyword`, `semantic`, or `hybrid`.
- `RankedEvaluationCandidate`: candidate id, rank, strategy, score, and compact score breakdown.
- `StrategyEvaluationResult`: ranked ids, ranked candidates, metric results, unavailable metric reasons, and limitations.
- `RankingComparisonRow`: one candidate's rank across strategies.
- `QueryEvaluationComparison`: per-query metadata, strategy results, comparison rows, and limitations.
- `EvaluationSummary`: fixture ids, counts, top-K values, query results, aggregate results, and limitations.

Per strategy and per query, the runner calculates:

- Precision@K for each requested K.
- Recall@K for each requested K.
- NDCG@K for each requested K.
- Average Precision for the full ranking.

Aggregate results are intentionally conservative. MAP is calculated from available AP values using the 6B `mean_average_precision` helper. Mean Precision@K, Recall@K, and NDCG@K average only available query-level values and include `included_query_count`, `excluded_query_count`, and `total_query_count` details. Unavailable query metrics are not treated as zero.

The runner validates each strategy ranking against the fixture candidate pool by reporting limitations for duplicate ids, missing fixture candidates, or candidates outside the fixture pool. It preserves existing ranker behavior instead of inventing missing candidates.

Milestone 6C does not call FastAPI matching routes, does not reuse the hybrid API response as a fake comparison, does not add API routes, does not create admin UI, does not write to Supabase, does not add dependencies, and does not claim one strategy is better than another. Semantic and hybrid ranking require an injected embedding provider; tests use the existing deterministic fake provider.

## Milestone 6D Admin Evaluation API

Milestone 6D adds `GET /evaluation/matching`, a thin admin-only backend API over the 6C runner.

Request requirements:

- `Authorization: Bearer <TOKEN>` header.
- Authenticated user must have `user_profiles.role = admin`.
- Optional repeated `top_k` query values, for example `?top_k=1&top_k=3`.

High-level route flow:

1. Verify the bearer token.
2. Load the trusted role from `user_profiles.role`.
3. Reject missing/invalid auth with 401 and non-admin users with 403.
4. Load seeded evaluation fixtures from the backend evaluation package.
5. Resolve the injected embedding provider after auth succeeds.
6. Call the 6C `run_evaluation` helper.
7. Return the structured evaluation summary plus `generated_from: seeded_evaluation_fixtures`.

The route returns factual runner fields such as fixture ids, query counts, candidate counts, judgment counts, top-K values, query results, strategy results, metric results, aggregate results, ranking comparison rows, limitations, and generated source. It does not manually calculate Precision@K, Recall@K, NDCG@K, AP, or MAP inside the route. It does not run keyword, semantic, or hybrid rankers inline outside the runner.

The endpoint does not expose raw resume text, raw gig descriptions, emails, auth metadata, service-role secrets, embedding vectors, raw semantic text, production accuracy, winner strategies, improvement percentages, fairness scores, or dashboard-specific chart data.

Milestone 6D does not add frontend UI, admin signup, database migrations, Supabase evaluation-data reads/writes, new dependencies, dashboard-specific transformations, or production benchmark claims.

## Milestone 6E Admin Evaluation Console

Milestone 6E adds a simple internal admin evaluation console to the existing protected admin dashboard route. The console is intended to prove the backend evaluation flow works end-to-end and to give technical visibility into seeded matching evaluation results. It is not the final team-approved dashboard design.

Frontend structure:

- `frontend/src/lib/evaluationTypes.ts`: typed response models for the 6D evaluation API.
- `frontend/src/lib/evaluation.ts`: `fetchEvaluationSummary`, which reads the current Supabase session and calls `GET /evaluation/matching` with `Authorization: Bearer <access_token>`.
- `frontend/src/lib/evaluationDisplay.ts`: display-only formatting helpers.
- `frontend/src/components/admin/evaluation/*`: modular sections for summary cards, metric results, query comparison, ranking comparison rows, and limitations.
- `frontend/src/pages/AdminDashboardPage.tsx`: page-level loading, error, empty, refresh, and composition logic.

The console renders backend-provided fields only: source, fixture ids, query counts, candidate counts, judgment counts, top-K values, aggregate metric results by strategy, unavailable metric reasons, query-level strategy summaries, per-candidate rank comparison rows, and limitations. Loading states use text, not placeholder fake metrics.

The frontend does not calculate Precision@K, Recall@K, NDCG, AP, MAP, candidate ranks, or strategy comparisons. It does not hardcode metric values, create fake charts, add improvement percentages, claim a winning strategy, or transform the response into final dashboard analytics. Backend authorization remains enforced by the 6D API; the frontend uses the existing protected admin route for sensible navigation.

Milestone 6E does not add backend routes, database migrations, Supabase writes, saved evaluation history, manual label editing, production analytics filters, new dependencies, or Milestone 6F verification closure.

## Milestone 6F Verification Closure

Milestone 6F closes the seeded evaluation workflow after verification and documentation updates.

Automated verification completed:

```bash
cd backend
./.venv/bin/python -m unittest tests.test_evaluation_fixtures tests.test_evaluation_metrics tests.test_evaluation_runner tests.test_evaluation_routes
```

Result: passed, 51 tests. Starlette emitted a dependency deprecation warning only.

```bash
cd backend
./.venv/bin/python -m unittest tests.test_matching_builders tests.test_keyword_matching tests.test_semantic_matching tests.test_semantic_ranker tests.test_hybrid_matching tests.test_matching_data_access tests.test_matching_routes
```

Result: passed, 99 tests. Starlette emitted a dependency deprecation warning only.

```bash
cd backend
./.venv/bin/python -m unittest discover -s tests
```

Result: passed, 236 tests, 3 skipped. Python/SWIG and Starlette dependency deprecation warnings were non-blocking.

```bash
cd frontend
npm run build
npm run lint
```

Result: both passed. Vite emitted the existing non-blocking chunk-size warning during build.

Manual browser smoke was not run during Milestone 6F because verified local admin/freelancer/client accounts and end-to-end local Supabase credentials were not available in this session. Automated route tests verify admin-only API behavior, non-admin denial, invalid auth denial, invalid `top_k` rejection, runner delegation, and response privacy checks. Manual browser verification remains a follow-up before demo/deployment.

Milestone 6 is limited to seeded local/demo evaluation visibility. It does not provide production-scale evaluation, large dataset claims, fairness guarantees, saved evaluation history, behavioral learning, pgvector/FAISS retrieval, final dashboard design, or claims that one ranking strategy is objectively better.

## Verification

Normal backend unit tests use fake auth, fake repositories, and fake embedding providers. They do not require live Supabase, do not call the network, and do not load a real embedding model.

Milestone 5G automated verification run:

```bash
cd frontend
npm run build
npm run lint

cd backend
./.venv/bin/python -m unittest tests.test_matching_explanation_contracts tests.test_matching_explanations tests.test_matching_routes
./.venv/bin/python -m unittest tests.test_matching_data_access tests.test_hybrid_matching tests.test_keyword_matching tests.test_semantic_matching
```

Results during 5G closure:

- Frontend build passed. Vite emitted a chunk-size warning, but production build completed.
- Frontend lint passed.
- Focused backend explanation/routes tests passed: 51 tests.
- Focused backend matching/data/scoring tests passed: 59 tests.
- `pytest` was not available in the local backend virtual environment, so focused backend tests were run through the existing `unittest` pattern.

Milestone 6A automated verification adds:

```bash
cd backend
./.venv/bin/python -m unittest tests.test_evaluation_fixtures
```

Run:

```bash
cd backend
./.venv/bin/python -m unittest tests.test_matching_builders
./.venv/bin/python -m unittest tests.test_keyword_matching
./.venv/bin/python -m unittest tests.test_semantic_matching
./.venv/bin/python -m unittest tests.test_semantic_ranker
./.venv/bin/python -m unittest tests.test_hybrid_matching
./.venv/bin/python -m unittest tests.test_matching_explanation_contracts
./.venv/bin/python -m unittest tests.test_matching_explanations
./.venv/bin/python -m unittest tests.test_matching_data_access
./.venv/bin/python -m unittest tests.test_matching_routes
./.venv/bin/python -m unittest tests.test_evaluation_fixtures
./.venv/bin/python -m unittest discover -s tests
```

The opt-in Supabase smoke tests live in `backend/tests/test_matching_data_access_supabase_smoke.py`. They are skipped by default unless `RUN_SUPABASE_SMOKE=1` and all smoke credentials are provided in the environment.

## Manual Backend Smoke Checklist

These checks are for local/manual verification only, not normal CI.

1. Put real backend values in `backend/.env` or export them in the shell. Keep `SUPABASE_SECRET_KEY` out of frontend env files.
2. Start the backend:

```bash
cd backend
uvicorn app.main:app --reload
```

3. Confirm health:

```bash
curl http://127.0.0.1:8000/health
```

4. Log in as a freelancer through the frontend or Supabase Auth and obtain a bearer token.
5. Call:

```bash
curl -H "Authorization: Bearer <TOKEN>" \
  "http://127.0.0.1:8000/matching/recommended-gigs?limit=5"
```

6. Confirm the response has `items`, `count`, `limit`, `ranking_method`, rank and compact score fields, and no raw private data.
7. Log in as a client and obtain a bearer token.
8. Call:

```bash
curl -H "Authorization: Bearer <TOKEN>" \
  "http://127.0.0.1:8000/matching/gigs/<GIG_ID>/recommended-freelancers?limit=5"
```

9. Confirm the response has `items`, `count`, `limit`, `ranking_method`, rank and compact score fields, and no raw private data.
10. Try the freelancer route with a client token and confirm rejection.
11. Try the client route with a freelancer token and confirm rejection.
12. Try a client token against another client's `gig_id` and confirm rejection.
13. Try missing and invalid tokens and confirm rejection.
14. Try `limit=0` and `limit=51` and confirm validation errors.

## Manual Frontend Smoke Checklist

These checks are to verify manually with real local accounts and data. They are not claimed as completed by the automated 5G verification run.

Freelancer recommended gigs:

1. Start the backend with matching configuration available.
2. Start the frontend with `VITE_API_BASE_URL` pointing at the backend.
3. Log in as a freelancer.
4. Ensure the freelancer has a saved freelancer profile.
5. Open the freelancer dashboard.
6. Confirm recommended gigs load or an understandable empty/error state appears.
7. Confirm each recommended gig card shows compact safe fields only.
8. Confirm an explanation panel appears per recommended gig when explanation data is available.
9. Confirm recommendation order matches the backend response order.
10. Confirm no raw resume text, raw gig description text, emails, auth metadata, service-role details, embedding vectors, raw semantic text, or private fields appear.

Client recommended freelancers:

1. Start the backend with matching configuration available.
2. Start the frontend with `VITE_API_BASE_URL` pointing at the backend.
3. Log in as a client.
4. Ensure at least one client-owned gig exists.
5. Open Manage Gigs.
6. Click View Recommendations on an owned gig.
7. Confirm recommended freelancers load or an understandable empty/error state appears.
8. Confirm each recommended freelancer card shows compact safe fields only.
9. Confirm an explanation panel appears per recommended freelancer when explanation data is available.
10. Confirm recommendation order matches the backend response order.
11. Confirm no emails, raw resume text, raw semantic text, embedding vectors, auth metadata, service-role details, or private profile fields appear.

## Current Limitations

- No LLM explanation generation.
- No frontend-generated explanation text.
- No client-side ranking, weighting, or score recalculation.
- No skill-gap learning paths, courses, career advice, or improvement percentages.
- No final team-approved admin evaluation dashboard design yet.
- No production-scale ranking metric claims beyond seeded local/demo evaluation fixtures.
- No pgvector or FAISS retrieval yet.
- No saved match history yet.
- No behavioral feedback learning.
- No guarantee of fairness.
- No production-scale claims.

## Next Milestone

Milestone 7 is the next planned Deployment and Black Book step. It should not convert seeded evaluation results into production-scale claims.
