# Canonical Platform — Version 1 (Infrastructure Complete)

_Archived milestone: Phases 2A through 3D. The migration roadmap is complete. Further work shifts to knowledge activation (Phase 4+), not infrastructure._

## What V1 delivers

| Milestone | Evidence |
| --- | --- |
| Canonical entity schema | `schemas/name-entity.schema.json` — 18 domains, 3,697 entities, full schema compliance (`audit/canonical-validation.json`) |
| Canonical entity builder | `lib/canonical/entity-builder.js` — additive assembly from read-only datasets |
| Adapter layer | `lib/adapters/legacy-datasets.js` — row-level parity with legacy collections (`audit/adapter-validation.json`) |
| Generator migration Wave 1 | 7 low-risk generators (`docs/WAVE1_GENERATOR_MIGRATION.md`) |
| Generator migration Wave 2 | 6 page generators (`docs/WAVE2_GENERATOR_MIGRATION.md`) |
| Production equivalence | Zero regressions, byte-identical output through Wave 2 (`audit/generator-regression.json`) |
| Rollback | Per-generator `NAMEORIGIN_LEGACY_DATA=1` |

## Intentionally outside V1

- **`scripts/generate-trends-page.js`** — requires structural refactor (Phase 2B); remains on legacy reads until refactored.
- **Reference datasets without adapters** — countries, last-names, name-equivalents, topic-clusters, trend/differential files.
- **`namesBase` runtime routing** — behavior-preservation shim for unenriched reads; retired in Phase 4A where origin is activated.

## What V1 does not claim

- Maximum knowledge coverage on rendered pages (that is Phase 4+).
- Elimination of fallback prose site-wide (origin activation begins in Phase 4A).
- A shared build orchestrator amortizing canonical assembly across generator spawns (measured in `audit/migration-performance.json`, deferred).

## Next: Phase 4 — Knowledge Activation

Use the canonical model to show truthful, structured knowledge and reduce fallback language — starting with origin (Phase 4A). See `docs/PHASE4A_ORIGIN_ACTIVATION.md`.
