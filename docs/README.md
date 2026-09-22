# GigMatch AI Documentation

## Current documentation

- [Project README](../README.md): product, setup, configuration, verification, security, and limitations.
- [Architecture](architecture/README.md): runtime boundaries, data authority, workflows, matching, and contact security.
- [Matching and explainability](matching.md): ranking, APIs, evidence, evaluation, and privacy.
- [Parsing pipeline](parsing.md): extraction, taxonomy, persistence, and limitations.
- [Capability history](milestones.md): evolution to the current baseline.
- [Portfolio and resume guide](portfolio-resume.md): evidence-based descriptions and ATS-ready bullets.

## Product evidence

- [R1 semantic refinement closure](verification/semantic-matching-refinement-closure.md): frozen benchmark design, selection and holdout evidence, production E5 integration, runtime measurements, final verification, and claim boundaries.
- [R1 production configuration](evaluation/semantic-r1/production-configuration.json): machine-readable production model, revision, policy, weights, and evidence qualification.
- [Frozen R1 selection decision](evaluation/semantic-r1/selection-decision.json): immutable selection-stage decision bound to benchmark and dependency checksums.

The R1 production weighting is a conservative product policy, not a benchmark-superiority claim. Keyword matching was the strongest controlled selection aggregate; E5 was the strongest semantic provider tested.

## Database sources

`../supabase/migrations/` is the authoritative ordered schema. `../supabase/tests/` verifies database policies and invariants. SQL files under `database/` are legacy bootstrap references; do not apply them over the migration chain.

## Historical engineering evidence

Files under `verification/` preserve milestone preflights, invariant maps, commands, results, limitations, and closure decisions. They support code archaeology and verification provenance. The R1 semantic closure is also the canonical evidence record for the current production semantic configuration.

The root `milestone-7-product-spec.md` records the detailed workflow design. `frontend/switchboard-migration-plan.md` and associated verification records preserve the frontend migration.

Historical documents intentionally retain original milestone language. If they conflict with current documentation, the current README, architecture guide, source, and migrations take precedence.
