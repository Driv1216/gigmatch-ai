# Backend Matching

Milestone 4 closes the backend matching foundation. It is backend-only: no frontend recommendation UI, natural-language explanations, skill-gap recommendations, admin analytics, ranking metrics, vector database retrieval, saved match history, or behavioral learning are implemented yet.

## Implemented Flow

- 4A: normalized freelancer and gig matching entities.
- 4B: deterministic keyword baseline scoring and ranking.
- 4C: semantic text builders, embedding provider interface, deterministic fake provider for tests, and lazy optional sentence-transformers provider.
- 4D: runtime semantic similarity scoring and ranking with injected providers.
- 4E: hybrid ranking over keyword and semantic scores.
- 4F-A: auth-safe matching data access using verified Supabase tokens, trusted `user_profiles.role`, ownership checks, and read-only table access.
- 4F-B: authenticated bidirectional backend matching API routes.
- 4G: verification and documentation closure.

The default hybrid formula is:

```text
hybrid_score = (0.55 * keyword_score) + (0.45 * semantic_score)
```

The API response exposes compact score components only: `hybrid_score`, `keyword_score`, and `semantic_score`. Detailed internal scoring components remain backend internals for tests and future explainability work.

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

Common errors:

- `401`: missing, malformed, or invalid bearer token.
- `403`: authenticated user is not a freelancer, has an unsupported role, or has no required matching profile.
- `422`: invalid `limit`.
- `503`: embedding provider is not configured after auth/data access succeeds.

Privacy boundary:

- Does not return raw resume text, raw parse rows, gig descriptions, client ids, email addresses, auth metadata, service-role details, embedding text, matched/missing skill explanation copy, or private account fields.

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

Common errors:

- `401`: missing, malformed, or invalid bearer token.
- `403`: authenticated user is not a client, admin attempted to bypass a client path, profile is missing, or the gig belongs to another client.
- `404`: requested gig does not exist.
- `422`: invalid `limit`.
- `503`: embedding provider is not configured after auth/data access succeeds.

Privacy boundary:

- Does not return raw resume text, raw parse rows, freelancer bios, project links, email addresses, auth metadata, service-role details, embedding text, matched/missing skill explanation copy, or private account fields.

## Verification

Normal backend unit tests use fake auth, fake repositories, and fake embedding providers. They do not require live Supabase, do not call the network, and do not load a real embedding model.

Run:

```bash
cd backend
./.venv/bin/python -m unittest tests.test_matching_builders
./.venv/bin/python -m unittest tests.test_keyword_matching
./.venv/bin/python -m unittest tests.test_semantic_matching
./.venv/bin/python -m unittest tests.test_semantic_ranker
./.venv/bin/python -m unittest tests.test_hybrid_matching
./.venv/bin/python -m unittest tests.test_matching_data_access
./.venv/bin/python -m unittest tests.test_matching_routes
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

## Current Limitations

- No frontend recommendation UI yet.
- No natural-language match explanations yet.
- No skill-gap recommendations yet.
- No admin evaluation dashboard yet.
- No ranking metrics yet.
- No pgvector or FAISS retrieval yet.
- No saved match history yet.
- No behavioral feedback learning.
- No guarantee of fairness.
- No production-scale claims.

## Next Milestone

Milestone 5 is Explainability and Skill Gap. It should build on the verified backend matching outputs without changing the Milestone 4 API privacy boundary accidentally.
