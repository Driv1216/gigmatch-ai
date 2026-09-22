# Matching and Explainability

GigMatch AI ranks gigs for freelancers and freelancers for client-owned gigs using one normalized, bidirectional system. Ranking is backend-authoritative and accompanied by privacy-safe explanations.

## Pipeline

```text
Supabase records -> reviewed parse data -> normalized profiles
  -> model-independent semantic text
  -> keyword score + batched E5 semantic score -> hybrid order
  -> evidence and skill-gap explanation -> role-safe response
```

Builders normalize skills, aliases, categories, roles, experience, deliverables, and allowed text. Missing fields are handled explicitly; matching does not infer absent/private information.

## Ranking

### Keyword

The deterministic baseline measures canonical skill coverage and structured alignment, including missing-required-skill penalties. It needs no model call and provides an explainable signal.

### Semantic

Stable text is assembled from allowed matching fields, embedded through the `EmbeddingProvider` interface, and compared with cosine similarity normalized to `[0,1]`. Runtime matching uses `intfloat/e5-small-v2` pinned to revision `ffb93f3bd4047442299a41ebb6fa998a38507c52` on CPU with remote code disabled. Deterministic fake embeddings remain limited to ordinary tests and controlled fixtures.

Canonical semantic text is model-independent. The provider's `e5_retrieval` policy adds `query:` only to the active query and `passage:` to candidates:

- Freelancer → gigs: the freelancer is the query and gigs are passages.
- Gig → freelancers: the gig is the query and freelancers are passages.

One query and its candidate pool are encoded in one request-level batch. The runtime rejects cardinality mismatch, empty vectors, inconsistent dimensions, non-numeric values, NaN/infinity, or a dimension that changes during the provider lifetime.

The provider is constructed centrally and reused at process scope. When dependencies, configuration, the pinned model, cache/download, or encoding are unavailable—or vectors are invalid—the system exposes a typed availability reason instead of fabricating a result.

### Hybrid

```text
hybrid_score = (0.75 * keyword_score) + (0.25 * semantic_score)
```

This keyword-majority weighting is a conservative product decision. It is not a claim that the weight was benchmark-optimal. Compact component scores remain available for explanation and evaluation.

If semantic execution fails, matching and applicant review recompute the complete candidate ordering with the deterministic keyword ranker. The response identifies `keyword_fallback`, includes the safe unavailability reason, and does not claim semantic or hybrid scores. Administrator evaluation returns a sanitized `503` semantic-unavailable response rather than internal loader details.

## API surface

- `GET /matching/recommended-gigs`: authenticates a freelancer, loads their match profile, ranks eligible open gigs, and returns bounded results.
- `GET /matching/gigs/{gig_id}/recommended-freelancers`: authenticates a client, verifies gig ownership, ranks eligible freelancers, and returns safe summaries.

Both accept `limit` from 1 to 50 (default 10). Typical errors are `401` authentication, `403` role/ownership/profile policy, `404` missing gig, and `422` invalid input. Semantic infrastructure failure on these recommendation paths produces an honest keyword response rather than a failed request. The frontend preserves returned order.

## Explanation contract

Every recommendation contains an explanation created from the computed result after ranking. It cannot influence order. The contract includes deterministic summary text; subject and candidate types; rank; compact score/weight/coverage evidence; reason codes; matched and missing required/preferred skills; and `none`, `low`, `medium`, or `high` gap severity.

No LLM writes these explanations. Every statement comes from structured evidence.

## Privacy boundary

Responses exclude full resume text, raw parse rows, non-approved profile details, source content not required by the model, contact details, auth metadata, secrets, embedding text, vectors, and provider internals. Authorization runs before candidate data is returned.

## Evaluation

The administrator-only evaluator compares keyword, semantic, and hybrid strategies over small seeded fixtures. Relevance labels are `0` (not relevant), `1` (partially relevant), and `2` (strongly relevant), with a recorded source.

The separate frozen R1 benchmark contains 24 complete queries and 120 judgments: 16 queries/80 judgments for selection and eight queries/40 judgments for a locked holdout, balanced across both ranking directions. It reports Precision@K, Recall@K, NDCG@K, Average Precision/MAP, graded pairwise inversions, per-query rankings, failures, latency, memory, and model size.

Keyword was the strongest selection aggregate. E5 was the strongest semantic provider among MiniLM, BGE-small, GTE-small, and E5-small-v2. The final production `0.75/0.25` weight is an explicit conservative product choice and is not described as benchmark-optimal. Full evidence and limitations are preserved in the [R1 closure](verification/semantic-matching-refinement-closure.md).

## Testing and limitations

Tests cover builders, scoring, providers, cosine similarity, hybrid ranking, data access, authorization, explanation contracts, fixtures, metrics, and evaluation UI behavior.

```bash
cd backend
.venv/bin/python -m unittest discover -s tests -v
```

The taxonomy is curated, semantic quality depends on the model and input, and the controlled benchmark is too small to establish real-user or business outcomes. Production-scale vector retrieval, persistent embeddings, behavioral learning, remote embedding APIs, fine-tuning, and GPU assumptions are not included. Evidence-based explanations do not certify candidate ability or client suitability.
