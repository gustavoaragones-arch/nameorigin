# Citation Coverage

_Phase 13A — measurement only. No Citation Record changes._

Phase 13A establishes a deterministic snapshot of citation coverage across the NameOrigin.io entity universe. This document explains current coverage, methodology, metrics, and how to interpret the audit artifacts.

## Purpose

Answer **“What is the current citation state?”** before any expansion work begins in Phase 13B.

Operational metrics live in `audit/citation-coverage.json`. Strategic prioritization lives separately in `audit/citation-gap-analysis.json`.

## Pipeline

```bash
node scripts/build/run-citation-coverage-audit.js
```

Individual reports:

```bash
node scripts/audit/citation-coverage.js
node scripts/audit/citation-gap-analysis.js
node scripts/build/validate-citation-coverage.js
```

## Current coverage (baseline)

| Metric | Value |
| --- | ---: |
| Total entities | **3,697** |
| Knowledge Records | **1,150** |
| Citation Records | **1,150** |
| Entity citation coverage | **31.11%** |
| KR → CR coverage | **100%** |
| Publications referenced | **17 / 17** |
| Registry utilization | **100%** |
| Avg publications per cited entity | **3.48** |
| Median publications per cited entity | **4** |
| Max publications on one entity | **6** |
| Integrity | **PASS** |

### Key insight

All **1,150** Knowledge Records have matching Citation Records with full domain-level citation assignment. The primary gap is **entity universe coverage**: **2,547** entities (68.89%) have no Knowledge Record and therefore no citations.

Among cited entities, editorial domains within the KR/CR subset show **100%** citation assignment for origin, meaning, pronunciation, etymology, and history.

## Publication distribution

| Bucket | Entities |
| --- | ---: |
| 0 publications | 2,547 |
| 1 publication | 148 |
| 2 publications | 96 |
| 3–5 publications | 893 |
| 6–10 publications | 13 |
| 10+ publications | 0 |

## Domain coverage

For each editorial domain among entities with Knowledge Records:

| Domain | Editorial | With citations | Coverage |
| --- | ---: | ---: | ---: |
| Origin | 978 | 978 | 100% |
| Meaning | 906 | 906 | 100% |
| Pronunciation | 976 | 976 | 100% |
| Etymology | 964 | 964 | 100% |
| History | 964 | 964 | 100% |

**Variants** are editorial-only in Citation Records v1. Variants contribute to KCI but are not citation-mapped per domain.

## Registry quality

- **17** canonical publications in the Citation Registry
- **17** referenced in Citation Records (100% utilization)
- **0** orphan registry entries
- **0** broken publication IDs

Top publication by usage: **Oxford Dictionary of First Names** (4,757 domain-level references). The top three publications account for **~79%** of all citation assignments — a concentration risk Phase 13B should address through publication diversity.

## Integrity checks

The coverage report includes PASS/FAIL integrity validation:

- No broken publication IDs
- Deterministic Citation Record ordering
- Duplicate-free entity references
- Registry consistency with Citation Records

## Methodology

1. Load the full **3,697-entity** universe from `names.json` and `normalized-names.json`.
2. Join Knowledge Records, Citation Records, and KCI scores.
3. Compute coverage, distribution, domain metrics, and registry utilization.
4. Validate structural integrity without modifying any frozen artifact.

Reports use a stable `generatedAt` timestamp derived from frozen Citation Record metadata to ensure deterministic reproducibility.

## Boundaries preserved

Phase 13A does **not** modify:

- Knowledge Records
- Citation Registry
- Citation Records
- Popularity Records
- KCI engine or weights
- Presentation or Trust layers

## Related files

| File | Role |
| --- | --- |
| `lib/analysis/citation-coverage-intelligence.js` | Shared read-only analysis |
| `scripts/audit/citation-coverage.js` | Coverage snapshot generator |
| `scripts/audit/citation-gap-analysis.js` | Gap analysis generator |
| `scripts/build/validate-citation-coverage.js` | Validation |
| `scripts/build/run-citation-coverage-audit.js` | Audit orchestrator |
| `audit/citation-coverage.json` | Operational metrics |
| `audit/citation-gap-analysis.json` | Strategic prioritization |
| `audit/citation-coverage-audit.json` | Phase 13A audit summary |

See also: [CITATION_STRATEGY.md](./CITATION_STRATEGY.md)
