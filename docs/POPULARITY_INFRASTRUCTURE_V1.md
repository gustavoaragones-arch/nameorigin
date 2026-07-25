# Popularity Infrastructure v1

_Phase 9A — infrastructure only, no popularity values._

Phase 9A introduces a canonical, deterministic popularity source registry that future editorial and dataset work can populate without requiring architectural changes. No entity popularity values are added. Knowledge Records, Citation artifacts, enrichment, rendering, and KCI remain unchanged.

## Objective

Build the popularity **engine** only — mirroring the Phase 8A citation infrastructure pattern.

| Capability | Status |
| --- | --- |
| Canonical Popularity Registry | ✅ `data/popularity-registry.json` |
| Deterministic source IDs | ✅ |
| Authority normalization | ✅ |
| Resolver compatibility index | ✅ |
| Validation + equivalence audits | ✅ |
| Entity popularity values | ❌ Deferred to Phase 9B |

## Architecture

```
Future popularity datasets / editorial research
        │
        ▼
Popularity Registry v1 (Phase 9A)
        │  canonical source definitions
        ▼
authorityResolutionIndex
        │  normalized authority key → source ID
        ▼
Phase 9B: Popularity Records (not started)
        │
        ▼
Phase 10A: KCI activation (future)
```

## Registry model

```json
{
  "id": "SSA_US_BABY_NAMES",
  "title": "Social Security Administration Baby Names",
  "type": "government_statistics",
  "publisher": "U.S. Social Security Administration",
  "country": "USA",
  "coverage": "United States national baby name rankings and counts",
  "license": "public_domain",
  "url": "https://www.ssa.gov/oact/babynames/",
  "retrieved": null,
  "canonicalAuthority": "Social Security Administration Baby Names (USA)",
  "aliases": ["SSA Baby Names (USA)", "SSA_USA", "US SSA Baby Names"]
}
```

Schema: `schemas/popularity-registry-v1.schema.json`

## Supported authority classes

The registry is designed to support multiple authority classes from the outset:

| Class | Purpose |
| --- | --- |
| `government_statistics` | National government baby name statistics |
| `civil_registration` | Civil registration birth-name records |
| `national_statistics` | National statistics office datasets |
| `population_registry` | Population / vital statistics registries |
| `official_name_statistics` | Official national name ranking publications |
| `historical_name_dataset` | Historical name time series |
| `academic_dataset` | Academic research name datasets |
| `international_dataset` | Cross-national demographic datasets |

Phase 9A registers canonical source definitions only. No ranking rows or counts are populated.

## Normalization

Multiple authority aliases referencing the same publisher dataset collapse to a single deterministic source ID.

Example: `SSA Baby Names (USA)` and `U.S. Social Security Administration Official Name Statistics` → `SSA_US_BABY_NAMES`.

## Deterministic ID generation

1. Load canonical authority catalog (`popularity-infrastructure-v1.js`).
2. Normalize authority names to canonical keys.
3. Assign predefined IDs from the catalog.
4. Merge duplicate IDs deterministically.
5. Sort sources by `id`.
6. Emit stable `authorityResolutionIndex`.

## Pipeline

```bash
node scripts/build/run-popularity-infrastructure-audit.js
```

Or step-by-step:

```bash
node scripts/editorial/build-popularity-registry.js
node scripts/build/validate-popularity-registry.js
node scripts/build/run-editorial-qa.js
node scripts/build/run-popularity-equivalence.js
```

## Validation

`validate-popularity-registry.js` verifies:

- Unique source IDs
- Required metadata on every source
- Schema compliance
- Stable deterministic ordering
- No duplicate canonical authorities
- Valid authority resolution index
- Deterministic rebuild equivalence

## Equivalence

`run-popularity-equivalence.js` verifies after registry build:

- Knowledge Records unchanged
- Citation Registry unchanged
- Citation Records unchanged
- `names-enriched.json` unchanged
- KCI unchanged (popularity scoring still disabled)
- Rendering unchanged

## Future Phase 9B integration

Phase 9B will populate entity-level **Popularity Records** using:

- `data/popularity-registry.json` (frozen)
- Existing legacy popularity rows in `data/popularity.json` as a migration source
- The authority resolution index for deterministic source attribution

Phase 9C+ will emit popularity source IDs natively during editorial research.

## Related files

| File | Role |
| --- | --- |
| `scripts/editorial/popularity-infrastructure-v1.js` | Shared registry + resolver library |
| `scripts/editorial/build-popularity-registry.js` | Registry builder |
| `scripts/build/validate-popularity-registry.js` | Registry validation |
| `scripts/build/run-popularity-equivalence.js` | Equivalence audit |
| `scripts/build/run-popularity-infrastructure-audit.js` | Phase 9A audit runner |
| `audit/popularity-infrastructure.json` | Phase 9A audit artifact |
| `audit/popularity-equivalence.json` | Equivalence audit artifact |

## Phase 9A results

| Metric | Value |
| --- | ---: |
| Canonical sources in registry | **9** |
| Raw authority entries | 10 |
| Duplicate authorities normalized | **1** |
| Authority resolution index entries | 31 |
| Authority classes supported (schema) | 8 |
| Authority classes in registry | 7 |
| Editorial QA | **PASS** (0 issues) |
| Popularity equivalence | **PASS** |
| Deterministic rebuild | **PASS** |
| KCI average | **23.74** (unchanged) |
| KCI popularity coverage | 5 entities (0.14%, scoring disabled) |
| Pipeline runtime | ~1.3s |

Primary normalization win: `SSA Baby Names (USA)` and `U.S. Social Security Administration Official Name Statistics` collapse to `SSA_US_BABY_NAMES`.

## Boundaries preserved

- Knowledge Record v2 unchanged
- Citation Infrastructure v1 unchanged
- Citation Population v1 unchanged
- No popularity values added
- KCI weights unchanged
- Popularity scoring disabled
- Rendering unchanged
