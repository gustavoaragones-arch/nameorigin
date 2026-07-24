# Roadmap Status

_Last updated: Phase 6C — Origin provenance backfill complete (2026-07-24)_

## Completed

| Milestone | Description | Reference |
| --- | --- | --- |
| **Infrastructure Migration** | Canonical schema, builder, adapters, generator waves | `docs/CANONICAL_PLATFORM_V1.md` |
| **Canonical Platform V1** | 3,697 entities, adapter parity, production equivalence | `audit/canonical-validation.json` |
| **Phase 4A–4C Activation** | Origin, meaning, pronunciation rendering policy | `docs/PHASE4A_ORIGIN_ACTIVATION.md` |
| **Knowledge Baseline 1.0** | Production freeze, audit archive | `docs/KNOWLEDGE_BASELINE_1.0.md` |
| **KCI v1.0** | Knowledge Completeness Index (weights frozen) | `audit/knowledge-completeness.json` |
| **Phase 5A–5E Wave 1** | Origin, meaning, pronunciation, etymology, history expansion | `docs/PHASE5E_HISTORY_EXPANSION_WAVE1.md` |
| **Knowledge Baseline v2** | All five editorial domains populated (Wave 1) | `docs/KNOWLEDGE_RECORD_V2.md` |
| **Phase 6A — Knowledge Record v2** | Unified editorial record per name; legacy compatibility active | `docs/KNOWLEDGE_RECORD_V2.md` |
| **Phase 6B — Editorial QA** | Knowledge Record v2 quality audit; deterministic reporting | `docs/EDITORIAL_QA.md` |
| **Phase 6C — Origin Provenance Backfill** | Complete origin sources/notes for all 585 records | `docs/PHASE6C_ORIGIN_PROVENANCE_BACKFILL.md` |
| **Editorial Architecture v2** | Uniform metadata across all five domains; platform structurally complete | This document |

## Current coverage (post–Phase 6A)

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

## Editorial architecture

| Component | Status |
| --- | --- |
| **Knowledge Record v2** | ✅ Implemented (`data/knowledge-records.json`) |
| **Legacy override compatibility** | ✅ Active (fallback supported) |
| **Deterministic rebuild** | ✅ Verified (0 equivalence differences) |
| **Editorial QA baseline** | ✅ Phase 6B audit (`audit/editorial-qa.json`) |
| **Origin provenance complete** | ✅ 585/585 origin records with sources + notes |
| **Canonical editorial source** | Knowledge Record v2 (preferred) |

## Upcoming

| Item | Notes |
| --- | --- |
| **Wave 2 expansion** | Increase coverage beyond ~15% per domain (QA baseline established) |
| **Citation expansion** | Provenance on researched fields (0% today) |
| **Legacy override retirement** | Remove per-domain files after extended validation |
| **Generator rebuild** | Surface new knowledge once model is stable |

## Deferred

| Item | Notes |
| --- | --- |
| Phase 4D (Popularity Activation) | Retired — rendering architecture complete |
| HTML regeneration | Deferred until post-consolidation QA |

## Architectural note

Knowledge Baseline v2 editorial expansion is **complete**. Phase 6A–6C establish Knowledge Record v2, editorial QA, and uniform provenance metadata across all five domains. The editorial platform is **structurally complete** — Wave 2 adds content through the existing pipeline and QA gate, not architectural changes.
