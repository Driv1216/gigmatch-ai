# R1 — Production Semantic Intelligence Closure

## Status

R1 is complete as one continuous audit, benchmark, selection, integration, and verification cycle.

- Final external verification: **PASS**
- Verification branch: `main`
- Verification HEAD: `8896b515050e0430ff1ac9787bdc9c4eb6daf789`
- Production semantic model: `intfloat/e5-small-v2`
- Model revision: `ffb93f3bd4047442299a41ebb6fa998a38507c52`
- Input policy: `e5_retrieval`
- Production weighting: keyword `0.75`, semantic `0.25`
- Verified semantic runtime: Python `3.13.13`, CPU
- Python 3.14 semantic runtime: currently unverified

No deployment, hosted-data mutation, database change, or frontend contract change was part of R1.

## Original state before R1

GigMatch already had sound matching boundaries before this refinement:

- Structured freelancer and gig records were combined with the latest reviewed parse data.
- Taxonomy aliases were normalized and evidence was deduplicated.
- Private and raw fields were excluded from matching inputs.
- Keyword ranking was deterministic: required skills carried 70%, preferred skills 20%, and category alignment 10%, with a bounded missing-required-skills penalty.
- Canonical semantic text covered roles, skills, experience, domain evidence, descriptions, deliverables, and seniority without including rationales or evaluation metadata.
- Semantic similarity used cosine similarity normalized to `[0,1]`.
- Explanations and skill gaps were derived after ranking from structured evidence and computed scores.
- Matching and applicant-review flows already had honest keyword fallback contracts.

The semantic runtime was not production-ready, however:

- No production model or immutable model revision was configured.
- Transformer dependencies were absent from the normal backend installation.
- Providers were reconstructed per request.
- Candidate embeddings were produced through repeated single encodes rather than one request-level batch.
- Batch cardinality, dimension stability, and vector finiteness were not fully validated.
- Provider construction was duplicated across matching, applicant review, and evaluation.
- Admin evaluation did not consistently sanitize provider failures.
- Ordinary tests used deterministic fake embeddings, and no opt-in real-model integration smoke existed.
- The existing evaluation corpus contained only six judgments and was not suitable for model selection.

The repository's runtime authority remained Python 3.11+. R1 did not turn semantic integration into a general Python-version migration.

## Frozen benchmark v1

Benchmark v1 contains exactly 24 complete queries and 120 relevance judgments, with five candidates per query. Every query and all its candidates remain in one query-level split:

| Split | Queries | Judgments | Freelancer → gigs | Gig → freelancers |
| --- | ---: | ---: | ---: | ---: |
| Selection/development | 16 | 80 | 8 | 8 |
| Locked holdout | 8 | 40 | 4 | 4 |

The fixture includes stable case IDs, graded `0/1/2` labels, rationales, scenario tags, split metadata, and both ranking directions. It covers exact and alias skills, semantic relationships, frameworks and APIs, cloud and containers, databases, frontend and backend distinctions, ML/NLP evidence, seniority, and domain mismatch hard negatives.

- Benchmark version: `1`
- Fixture SHA-256: `652e7439f8f43e1e0d402e57f83625e42c572c91ac930165f1c9e543056cd4d5`
- Benchmark lock SHA-256: `6d4a99f27be10133e41231e6a2e79751721590a4d3b284cabdb65de54385ccf2`
- Model manifest SHA-256: `1d713577b862415aa1eb16f91d24b8f4a3e1fe7f8d7572a6e58c31cf02c1d48f`
- Dependency lock SHA-256: `48049b59b66f97e6e4ac66ff9c8f9e3b77e71c156adf305be7705c3c3d7c1e4d`

The fixture, labels, rationales, tags, and split were frozen before real-model execution. Rationales and evaluation metadata are not provided to builders, canonical semantic text, providers, or model encoding. Any future judgment correction requires a later benchmark version; benchmark v1 and its conclusions must not be silently rewritten.

## Selection evidence

The external selection run evaluated only the 16-query, 80-judgment selection partition. It completed all four locked candidates on CPU with exact revisions and `trust_remote_code=False`:

- `sentence-transformers/all-MiniLM-L6-v2`
- `BAAI/bge-small-en-v1.5`
- `thenlper/gte-small`
- `intfloat/e5-small-v2`

The benchmark reused production builders and scoring behavior. It compared keyword, semantic-only, the existing hybrid, and the predefined bounded weight sweep. Query and candidate embeddings were computed once per model and reused when recombining weights.

### Principal selection metrics

| Configuration | NDCG@3 | MAP | Pairwise inversion rate | Hard-negative inversions | Precision@3 / Recall@3 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Keyword baseline | **0.993930** | **1.000000** | **0.015625** | 0 | **1.000000 / 1.000000** |
| E5 semantic-only | 0.985376 | 0.989583 | 0.023438 | 0 | 0.958333 / 0.958333 |
| Frozen selection configuration, 1.00/0.00 | 0.988136 | 0.994792 | 0.023438 | 0 | 0.979167 / 0.979167 |

Keyword matching performed extremely strongly on this controlled benchmark and led the primary selection aggregate. The benchmark does not support claiming that semantic-only or a positive hybrid contribution was selection-optimal.

Among the semantic providers, E5 was the strongest and safest tested candidate. It led semantic-only NDCG@3, MAP, Precision/Recall@3, and pairwise ordering among the four candidates. It produced no label-0-over-label-2 inversion, no label-0 top result, and no strong exact-alias rank drop on selection. E5 semantic-only recorded two query wins, eleven ties, and three losses against keyword by NDCG@3.

The alternatives had meaningful tradeoffs:

- MiniLM was smaller and faster but had weaker aggregate semantic quality, one hard-negative inversion, and one substantial exact-skill rank loss.
- BGE was the nearest quality alternative and avoided hard-negative inversions, but trailed E5 on semantic aggregate quality and pairwise ordering without a meaningful operational advantage.
- GTE had the smallest cache but weaker aggregate quality and retained a hard-negative inversion.

The immutable selection decision recorded E5 as the selected semantic provider and froze the evaluated `1.00/0.00` configuration for the locked holdout. That historical decision remains unchanged. Its decision checksum is `703662255cb2b8967f8de7b9e594ed42c56f05d699378c40fe481acec22e5e18`.

## Locked holdout evidence

The external holdout run verified all benchmark, dependency, model, and decision checksums. It loaded only the selected E5 model and evaluated the frozen configuration against exactly eight queries and 40 judgments. No other model or hybrid-weight matrix was executed.

| Metric | Keyword baseline | Frozen 1.00/0.00 | E5 semantic reference |
| --- | ---: | ---: | ---: |
| MAP | 0.989583 | 0.989583 | 1.000000 |
| Pairwise inversion rate | 0.031250 | 0.046875 | 0.031250 |
| NDCG@1 | 1.000000 | 1.000000 | 1.000000 |
| NDCG@3 | 0.982341 | 0.976271 | 0.987861 |
| NDCG@5 | 0.992323 | 0.986254 | 0.987861 |
| Precision@3 | 0.958333 | 0.958333 | 1.000000 |
| Recall@3 | 0.958333 | 0.958333 | 1.000000 |

The frozen 1.00/0.00 path was not byte-for-byte equivalent to standalone keyword ranking because the evaluated hybrid sorter still used E5 similarity to break equal keyword-score ties. It could not overturn unequal keyword scores, but it retained secondary semantic ordering authority and the operational cost of model inference. This behavior explained its small difference from the keyword baseline and is part of the historical benchmark evidence.

The holdout artifact also reported an E5 semantic-only reference derived from the E5 component scores already computed for the frozen ranking path. No additional model or weight was executed, but reporting that reference exposed an exploratory alternative to holdout labels. It was not used to reselect or retune the configuration and must not be treated as independent selection evidence.

Selection and holdout therefore show mixed query-level semantic value rather than general superiority. E5 sometimes improved semantic relationships that literal overlap missed and sometimes lost ordering quality. The holdout is only eight controlled queries and cannot establish statistical generalization.

## Production configuration decision

The final production configuration is:

```text
Model:          intfloat/e5-small-v2
Revision:       ffb93f3bd4047442299a41ebb6fa998a38507c52
Input policy:   e5_retrieval
Device:         CPU
Remote code:    disabled
Keyword weight: 0.75
Semantic weight: 0.25
```

The final `0.75/0.25` weighting is a deliberate conservative product decision made after the frozen benchmark cycle. It is not presented as the benchmark-optimal weight and does not rewrite the immutable `1.00/0.00` selection decision. Benchmark v1 did not demonstrate that this positive semantic contribution outperformed keyword ranking.

The product choice gives deterministic keyword evidence majority authority while enabling bounded semantic contribution from the strongest semantic provider tested. Claims about the production weighting are therefore architectural and product-policy claims, not empirical superiority claims.

## Production integration

R1 integrated semantic matching without changing canonical builders, privacy boundaries, explanation authority, public fallback contracts, application workflows, database schema, or frontend contracts.

### Provider and model lifecycle

- Provider construction is centralized for matching routes, applicant review, and admin evaluation.
- The model ID, immutable revision, input policy, cache/offline behavior, and hybrid weights are supplied through backend settings.
- The selected provider is loaded lazily and reused as a single process-level instance for a given immutable configuration.
- Execution is fixed to CPU with `trust_remote_code=False`.
- The validated sentence-transformers stack is included in the normal backend dependency installation.

### Model-input isolation

- Canonical freelancer and gig semantic-text builders remain model-independent.
- E5 formatting exists only at the provider boundary.
- The active query receives the `query:` prefix and candidates receive `passage:`.
- Freelancer → gigs treats the freelancer as the query.
- Gig → freelancers treats the gig as the query.
- Model names and provider instructions are not scattered through builders, ranking logic, routes, or evaluation fixtures.

### Request-level execution and validation

- Each ranking request embeds one active query and its complete candidate pool in one batch.
- Returned batch cardinality must match the submitted text count.
- Vectors must be numeric, finite, nonempty, and equal-dimensional.
- The observed dimension must remain stable for the provider process lifetime.
- Semantic and hybrid ranking continue to recompute current request inputs; R1 added no persistent embeddings or application-level embedding cache.

### Failure behavior

Expected missing-dependency, configuration, model-load, cache/download, encoding, cardinality, dimension, empty-vector, NaN, and infinity failures map to existing safe semantic-unavailable reason codes.

- Matching recommendations fall back globally and honestly to keyword ranking.
- Applicant review falls back globally and honestly to keyword ranking.
- Fallback responses do not expose semantic or hybrid values that were not computed.
- Admin evaluation returns a sanitized semantic-unavailable response rather than leaking internal model or loader exceptions.
- Unexpected non-semantic failures remain real errors and are not mislabeled as semantic fallback.

## Real-model smoke evidence

The opt-in real-model smoke completed **3/3 PASS** using the selected E5 revision with `EMBEDDING_LOCAL_FILES_ONLY=true`. This proved that verification used the externally populated, revision-locked cache rather than silently fetching or changing the model.

The smoke verified:

- Exact model ID, revision, `e5_retrieval` policy, CPU device, and remote-code prohibition.
- Process-level provider reuse.
- Numeric, finite, nonempty 384-dimensional vectors with coherent batch dimensions.
- Correct `query:` and `passage:` preparation.
- Real semantic and hybrid ranking in both supported directions.
- Propagation of the production `0.75/0.25` weights.
- Existing typed provider failures mapping to keyword fallback.
- A broad related-versus-unrelated ordering sanity check without imposing a brittle quality margin.

The permanent benchmark remains the quality authority; the smoke is an integration check rather than a second benchmark.

## Runtime evidence

The controlled benchmark and final real-model verification established Python `3.13.13` as a working semantic runtime for the selected stack.

Recorded E5 selection-run evidence on Apple arm64 CPU included:

- Observed dimension: 384
- Model cache: 134,478,697 bytes
- Cold load: approximately 35.23 seconds
- Warm query-plus-five batch mean: approximately 32.0 ms
- Representative 10-candidate ranking: approximately 50.8 ms
- Representative 50-candidate ranking: approximately 198.8 ms
- Baseline RSS: 40,288,256 bytes
- Peak RSS: 708,214,784 bytes

These measurements are environment-specific and are not production-scale throughput claims.

Python 3.14 remains currently unverified. The optional Python 3.14 dependency environment could not be installed during external verification because sandbox network access was unavailable. This is not evidence that Python 3.14 is incompatible. R1 made no broad Python migration and did not narrow the repository's general Python 3.11+ guidance without deployment-specific compatibility evidence.

## Final verification

Handoff 2 was run manually in the separate Antigravity application. The verification gate did not rewrite repository files.

| Verification area | Result |
| --- | --- |
| Frozen benchmark and checksum verification | PASS |
| Focused R1 tests | 218/218 PASS |
| Real E5 smoke | 3/3 PASS |
| Full backend unittest discovery | 458 passed, 6 skipped, 0 failed |
| Python compilation | PASS |
| Python 3.13.13 semantic runtime | VERIFIED |
| Python 3.14 semantic runtime | Currently unverified due sandboxed dependency installation |
| Frontend tests | 189/189 PASS |
| ESLint | PASS |
| Frontend production build | PASS |
| `git diff --check` | PASS |
| Repository state before/after verification | Identical |

No unexpected tracked or untracked files were created or changed by verification. No database suite was required because R1 changed no migrations, schema, RLS policies, RPCs, or hosted data.

## Supported claims

R1 supports the following claims:

- GigMatch has a reproducibly configured, revision-pinned local E5 semantic provider on CPU.
- E5 was the strongest semantic provider among the four locked models on benchmark-v1 selection evidence.
- Keyword ranking performed extremely strongly on the controlled benchmark and remained stronger on the primary selection aggregate.
- Production uses a deliberate keyword-majority `0.75/0.25` hybrid policy.
- Canonical semantic text remains model-independent, with E5-specific preparation isolated at the provider boundary.
- Both ranking directions use correct asymmetric E5 query/candidate preparation.
- Production requests use batch embedding and process-level provider reuse.
- Vector cardinality, numeric type, finiteness, nonempty dimensions, equal dimensions, and lifetime dimension stability are validated.
- Matching and applicant review retain honest keyword fallback, and admin evaluation sanitizes expected semantic failures.
- The selected model loads and executes semantic and hybrid ranking in both directions under controlled Python 3.13.13.
- Benchmark v1, its selection/holdout split, and its historical decision remain frozen and checksummed.

## Unsupported claims and remaining limitations

R1 does not support claims that:

- E5 is universally superior to keyword matching or to all other embedding models.
- The production `0.75/0.25` weighting is benchmark-optimal.
- Hybrid ranking produced a statistically significant improvement over keyword ranking.
- Benchmark results generalize to real users, all occupations, all languages, or all gig categories.
- The controlled 24-query corpus measures fairness, production accuracy, hiring outcomes, conversion, time-to-hire, or business value.
- Recorded laptop CPU latency, memory, or model size represents production-scale throughput or capacity.
- Python 3.14 semantic compatibility has been verified.
- R1 validates GPU operation, remote embedding APIs, or persistent-vector retrieval.

Remaining limitations include the small controlled corpus, eight-query holdout, environment-specific performance measurements, mixed semantic wins and losses, and the lack of real-user outcome data. Future product evidence may justify later benchmark versions, but benchmark v1 and this R1 conclusion remain preserved.

## Explicit exclusions

R1 did not add pgvector, FAISS/ANN search, persistent embeddings, application-level embedding caches, database migrations, GPU assumptions, remote embedding APIs, fine-tuning, LLM-generated explanations, `trust_remote_code=True`, deployment changes, hosted-data mutation, or production-scale/business-outcome claims.

This document is the sole final R1 closure artifact.
