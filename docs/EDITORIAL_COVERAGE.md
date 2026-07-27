# Editorial Coverage

_Phase 15A — measurement only. No Knowledge Record changes._

Phase 15A provides a deterministic assessment of editorial completeness across all **3,697** entities. Operational metrics live in `audit/editorial-coverage.json`. Strategic prioritization lives in `audit/editorial-gap-analysis.json`.

## Purpose

Answer **“Where is editorial investment most valuable?”** before Phase 15B Knowledge Record expansion begins.

## Pipeline

```bash
node scripts/build/run-editorial-coverage-audit.js
```

Individual reports:

```bash
node scripts/audit/editorial-coverage.js
node scripts/audit/editorial-gap-analysis.js
node scripts/build/validate-editorial-coverage.js
```

## Current coverage (baseline)

| Metric | Value |
| --- | ---: |
| Total entities | **3,697** |
| Knowledge Records | **1,150** (31.11%) |
| Unresearched entities | **2,547** (68.89%) |
| Fully researched (6/6 domains) | **800** (21.64%) |
| Partial Knowledge Records | **350** (30.43% of KR) |
| Integrity | **PASS** |

### Key insight

Phase 15A confirms what Phases 13A and 14A implied: **editorial coverage is the dominant bottleneck** for platform growth.

| Layer | Infrastructure | Data gap |
| --- | --- | --- |
| Citations | Complete for researched corpus | 2,547 entities lack Knowledge Records |
| Popularity | Complete for legacy data | 3,692 entities lack popularity data |
| **Editorial** | **Knowledge Record v2 frozen** | **2,547 unresearched + 350 partial** |

Among the **1,150** researched entities, average editorial completeness is **5.16 domains** per record. **800** entities are fully researched across origin, meaning, pronunciation, etymology, history, and variants.

## Domain coverage (entity universe)

| Domain | Entities with editorial | Coverage |
| --- | ---: | ---: |
| Origin | 978 | 26.45% |
| Meaning | 906 | 24.51% |
| Pronunciation | 976 | 26.40% |
| Etymology | 964 | 26.08% |
| History | 964 | 26.08% |
| Variants (among KR) | 1,150 | 100% |

## Editorial completeness distribution

| Domains populated | Entities |
| --- | ---: |
| 0 (no Knowledge Record) | 2,547 |
| 2 | 111 |
| 3 | 67 |
| 4 | 145 |
| 5 | 27 |
| 6 (fully researched) | 800 |

## Partial Knowledge Records

**350** entities have Knowledge Records but missing editorial domains:

| Missing domain | Count (among partial) |
| --- | ---: |
| Meaning | 244 |
| Etymology | 186 |
| History | 186 |
| Pronunciation | 174 |
| Origin | 172 |

## Coverage by gender

| Gender | KR coverage | Fully researched |
| --- | ---: | ---: |
| Boy | 28.14% | 19.35% |
| Girl | 28.35% | 20.61% |
| Unisex | 44.31% | 29.44% |

## Methodology

1. Load the full **3,697-entity** universe with metadata from `names.json`, `normalized-names.json`, and `names-enriched.json`.
2. Join Knowledge Records, Citation Records, Popularity Records, and KCI scores.
3. Compute editorial completeness across six domains: origin, meaning, pronunciation, etymology, history, variants.
4. Validate structural integrity without modifying any frozen artifact.

## Boundaries preserved

Phase 15A does **not** modify:

- Knowledge Records
- Citation Records or Registry
- Popularity Records or Registry
- KCI engine or weights
- Presentation or Trust layers

## Related files

| File | Role |
| --- | --- |
| `lib/analysis/editorial-coverage-intelligence.js` | Shared read-only analysis |
| `scripts/audit/editorial-coverage.js` | Coverage snapshot generator |
| `scripts/audit/editorial-gap-analysis.js` | Gap analysis generator |
| `scripts/build/validate-editorial-coverage.js` | Validation |
| `scripts/build/run-editorial-coverage-audit.js` | Audit orchestrator |
| `audit/editorial-coverage.json` | Operational metrics |
| `audit/editorial-gap-analysis.json` | Strategic prioritization |
| `audit/editorial-coverage-audit.json` | Phase 15A audit summary |

See also: [EDITORIAL_STRATEGY.md](./EDITORIAL_STRATEGY.md)
