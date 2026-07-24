# Roadmap Status

_Last updated: Knowledge Baseline v2 editorial expansion complete (2026-07-24)_

## Completed

| Milestone | Description | Reference |
| --- | --- | --- |
| **Infrastructure Migration** | Canonical schema, builder, adapters, generator waves | `docs/CANONICAL_PLATFORM_V1.md` |
| **Canonical Platform V1** | 3,697 entities, adapter parity, production equivalence | `audit/canonical-validation.json` |
| **Phase 4A — Origin Activation** | Researched / disclosed / computed origin policy | `docs/PHASE4A_ORIGIN_ACTIVATION.md` |
| **Phase 4B — Meaning Activation** | Researched / disclosed / computed meaning policy | `docs/PHASE4B_MEANING_ACTIVATION.md` |
| **Phase 4C — Pronunciation Activation** | Available / disclosed / computed pronunciation policy | `docs/PHASE4C_PRONUNCIATION_ACTIVATION.md` |
| **Knowledge Baseline 1.0** | Production freeze, audit archive, permanent reference point | `docs/KNOWLEDGE_BASELINE_1.0.md` |
| **KCI v1.0** | Knowledge Completeness Index — internal scoring (weights frozen) | `audit/knowledge-completeness.json` |
| **Phase 5A — Origin Expansion (Wave 1)** | +585 researched origins (15.82%) | `docs/PHASE5A_ORIGIN_EXPANSION_WAVE1.md` |
| **Phase 5B — Meaning Expansion (Wave 1)** | +516 researched meanings (13.96%) | `docs/PHASE5B_MEANING_EXPANSION_WAVE1.md` |
| **Phase 5C — Pronunciation Expansion (Wave 1)** | +583 stored pronunciations (15.77%) | `docs/PHASE5C_PRONUNCIATION_EXPANSION_WAVE1.md` |
| **Phase 5D — Etymology Expansion (Wave 1)** | +571 researched etymologies (15.44%) | `docs/PHASE5D_ETYMOLOGY_EXPANSION_WAVE1.md` |
| **Phase 5E — History Expansion (Wave 1)** | +571 researched histories (15.44%) | `docs/PHASE5E_HISTORY_EXPANSION_WAVE1.md` |
| **Knowledge Baseline v2 — Editorial Expansion** | All five editorial domains populated (Wave 1) | This document |

## Current coverage (post–Phase 5E)

| Domain | Researched | Coverage |
| --- | ---: | ---: |
| Origin | 585 / 3,697 | 15.82% |
| Meaning | 516 / 3,697 | 13.96% |
| Pronunciation | 583 / 3,697 | 15.77% |
| Etymology | 571 / 3,697 | 15.44% |
| History | 571 / 3,697 | 15.44% |
| Citations | 0 / 3,697 | 0% |
| **Average KCI** | — | **15.24** |
| **Max KCI** | — | **90** |

## Upcoming

### Post-expansion consolidation (not started)

| Item | Notes |
| --- | --- |
| **Knowledge Record v2** | Unify per-domain override files into a single editorial record per name — after editorial model stabilizes |
| **Citation system** | Provenance on every researched field (0% today) |
| **Wave 2+ expansion** | Continue editorial acquisition for remaining ~3,100 names per domain |

## Deferred

| Item | Notes |
| --- | --- |
| Phase 4D (Popularity Activation) | Retired — rendering architecture complete; popularity largely computed already |
| Phase 6 work | Not started — separate milestone after post-expansion validation |

## Architectural note

Rendering architecture is **complete**. Phase 4 activation roadmap is **retired**. Knowledge Baseline v2 editorial expansion (Phases 5A–5E Wave 1) is **complete**. All five editorial domains now feed a deterministic enrichment pipeline via per-domain override files and `rebuild-names-enriched.js`. Future work should prioritize citation provenance, Wave 2+ coverage expansion, and Knowledge Record v2 consolidation rather than rendering or schema changes.
