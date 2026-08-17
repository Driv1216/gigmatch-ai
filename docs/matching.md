# Matching and Explainability

GigMatch AI ranks gigs for freelancers and freelancers for client-owned gigs using one normalized, bidirectional system. Ranking is backend-authoritative and accompanied by privacy-safe explanations.

## Pipeline

```text
Supabase records -> reviewed parse data -> normalized profiles
  -> keyword + semantic scores -> hybrid order
  -> evidence and skill-gap explanation -> role-safe response
```

Builders normalize skills, aliases, categories, roles, experience, deliverables, and allowed text. Missing fields are handled explicitly; matching does not infer absent/private information.

## Ranking

### Keyword

The deterministic baseline measures canonical skill coverage and structured alignment, including missing-required-skill penalties. It needs no model call and provides an explainable signal.

### Semantic

Stable text is assembled from allowed matching fields, embedded through the `EmbeddingProvider` interface, and compared with cosine similarity. Runtime matching uses the optional `SentenceTransformerEmbeddingProvider`; deterministic fake embeddings are limited to tests and fixtures.

When the optional dependency/model is unavailable or returns invalid vectors, the system exposes a typed availability reason instead of fabricating a result.

### Hybrid

```text
hybrid_score = (0.55 * keyword_score) + (0.45 * semantic_score)
```

Compact component scores remain available for explanation and evaluation. Fallback context is recorded where supported by the contract.

## API surface

- `GET /matching/recommended-gigs`: authenticates a freelancer, loads their match profile, ranks eligible open gigs, and returns bounded results.
- `GET /matching/gigs/{gig_id}/recommended-freelancers`: authenticates a client, verifies gig ownership, ranks eligible freelancers, and returns safe summaries.

Both accept `limit` from 1 to 50 (default 10). Typical errors are `401` authentication, `403` role/ownership/profile policy, `404` missing gig, `422` invalid input, and `503` required embedding infrastructure unavailable. The frontend preserves returned order.

## Explanation contract

Every recommendation contains an explanation created from the computed result after ranking. It cannot influence order. The contract includes deterministic summary text; subject and candidate types; rank; compact score/weight/coverage evidence; reason codes; matched and missing required/preferred skills; and `none`, `low`, `medium`, or `high` gap severity.

No LLM writes these explanations. Every statement comes from structured evidence.

## Privacy boundary

Responses exclude full resume text, raw parse rows, non-approved profile details, source content not required by the model, contact details, auth metadata, secrets, embedding text, vectors, and provider internals. Authorization runs before candidate data is returned.

## Evaluation

The administrator-only evaluator compares keyword, semantic, and hybrid strategies over seeded fixtures. Relevance labels are `0` (not relevant), `1` (partially relevant), and `2` (strongly relevant), with a recorded source.

Metrics include Precision@K, Recall@K, NDCG@K, Average Precision, and MAP availability. Recall/MAP are reported only for sufficiently complete judgments. Results describe fixtures, not real-world accuracy or business impact.

## Testing and limitations

Tests cover builders, scoring, providers, cosine similarity, hybrid ranking, data access, authorization, explanation contracts, fixtures, metrics, and evaluation UI behavior.

```bash
cd backend
.venv/bin/python -m unittest discover -s tests -v
```

The taxonomy is curated, semantic quality depends on the model and input, production-scale vector retrieval/behavioral learning are not included, and evidence-based explanations do not certify candidate ability or client suitability.
