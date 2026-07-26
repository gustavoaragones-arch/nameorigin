# Popularity Coverage

_Phase 14A — measurement only. No Popularity Record changes._

Phase 14A provides a deterministic snapshot of popularity coverage across the NameOrigin.io entity universe. Operational metrics live in `audit/popularity-coverage.json`. Strategic prioritization lives in `audit/popularity-gap-analysis.json`.

## Purpose

Answer **“What is the current popularity state?”** before any expansion work begins in Phase 14B.

## Pipeline

```bash
node scripts/build/run-popularity-coverage-audit.js
```

Individual reports:

```bash
node scripts/audit/popularity-coverage.js
node scripts/audit/popularity-gap-analysis.js
node scripts/build/validate-popularity-coverage.js
```

## Current coverage (baseline)

| Metric | Value |
| --- | ---: |
| Total entities | **3,697** |
| Popularity Records | **5** |
| Legacy popularity rows | **7** |
| Entity popularity record coverage | **0.14%** |
| Attributable source coverage | **0.11%** |
| KCI popularity point coverage | **0.11%** |
| Registry sources referenced | **1 / 9** (11.11% utilization) |
| Integrity | **PASS** |

### Key insight

Popularity **infrastructure is complete**, but **data population is minimal**:

- All **5** entities with legacy popularity rows have Popularity Records (**100%** legacy → record coverage).
- Only **4** entities earn KCI popularity points (India authority unresolved for Aakriti).
- The dominant gap is **absence of popularity data**, not attribution mechanics.
- **USA** accounts for all attributable legacy rows (6 of 7 rows); **India** has 1 unresolved row.
- **8 of 9** registry sources are unused — infrastructure exists but no entity data is loaded yet.

Unlike citations (where editorial coverage was the bottleneck), popularity expansion requires **both data ingestion and authority resolution** before diversity optimization matters.

## Publication distribution

| Bucket (canonical sources) | Entities |
| --- | ---: |
| 0 sources | 3,693 |
| 1 source | 4 |
| 2 sources | 0 |
| 3+ sources | 0 |

## Coverage by dimension

### Gender

| Gender | Entities | With popularity record | Coverage |
| --- | ---: | ---: | ---: |
| Boy | 1,592 | 3 | 0.19% |
| Girl | 1,446 | 2 | 0.14% |
| Unisex | 659 | 0 | 0% |

### Country (legacy data)

| Country | Entities with legacy rows | Attributable | Legacy rows |
| --- | ---: | ---: | ---: |
| USA | 4 | 4 | 6 |
| India | 1 | 0 | 1 |
| UK, CAN, AUS | 0 | 0 | 0 |

## Registry quality

- **9** canonical sources in Popularity Registry
- **1** referenced (`SSA_US_BABY_NAMES`)
- **8** unused registry entries (CAN, UK, AUS, EUROSTAT, etc.)
- **1** unresolved authority: **India**
- **100%** regional concentration in USA for attributable data

## Integrity checks

- No broken source IDs
- Deterministic Popularity Record ordering
- Duplicate-free entity references
- Registry consistency with Popularity Records

## Methodology

1. Load the full **3,697-entity** universe from `names.json` and `normalized-names.json`.
2. Join Popularity Records, legacy `popularity.json` rows, Knowledge Records, and KCI scores.
3. Compute coverage by gender, language, origin country, and legacy country.
4. Validate structural integrity without modifying any frozen artifact.

Reports use a stable `generatedAt` timestamp derived from frozen Popularity Record metadata.

## Boundaries preserved

Phase 14A does **not** modify:

- Popularity Records or Registry
- Knowledge Records
- Citation Records
- KCI engine or weights
- Presentation or Trust layers

## Related files

| File | Role |
| --- | --- |
| `lib/analysis/popularity-coverage-intelligence.js` | Shared read-only analysis |
| `scripts/audit/popularity-coverage.js` | Coverage snapshot generator |
| `scripts/audit/popularity-gap-analysis.js` | Gap analysis generator |
| `scripts/build/validate-popularity-coverage.js` | Validation |
| `scripts/build/run-popularity-coverage-audit.js` | Audit orchestrator |
| `audit/popularity-coverage.json` | Operational metrics |
| `audit/popularity-gap-analysis.json` | Strategic prioritization |
| `audit/popularity-coverage-audit.json` | Phase 14A audit summary |

See also: [POPULARITY_STRATEGY.md](./POPULARITY_STRATEGY.md)
