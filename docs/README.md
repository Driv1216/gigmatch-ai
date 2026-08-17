# GigMatch AI Documentation

## Current documentation

- [Project README](../README.md): product, setup, configuration, verification, security, and limitations.
- [Architecture](architecture/README.md): runtime boundaries, data authority, workflows, matching, and contact security.
- [Matching and explainability](matching.md): ranking, APIs, evidence, evaluation, and privacy.
- [Parsing pipeline](parsing.md): extraction, taxonomy, persistence, and limitations.
- [Capability history](milestones.md): evolution to the current baseline.
- [Portfolio and resume guide](portfolio-resume.md): evidence-based descriptions and ATS-ready bullets.

## Database sources

`../supabase/migrations/` is the authoritative ordered schema. `../supabase/tests/` verifies database policies and invariants. SQL files under `database/` are legacy bootstrap references; do not apply them over the migration chain.

## Historical engineering evidence

Files under `verification/` preserve milestone preflights, invariant maps, commands, results, limitations, and closure decisions. They support code archaeology and verification provenance but are not canonical product documentation.

The root `milestone-7-product-spec.md` records the detailed workflow design. `frontend/switchboard-migration-plan.md` and associated verification records preserve the frontend migration.

Historical documents intentionally retain original milestone language. If they conflict with current documentation, the current README, architecture guide, source, and migrations take precedence.
