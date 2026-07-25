# Popularity Records v1

_Phase 9B — popularity population only, popularity infrastructure frozen._

Phase 9B populates entity-level Popularity Records from legacy `data/popularity.json` using the frozen Popularity Registry from Phase 9A. No editorial content, Knowledge Record schema, Citation artifacts, rendering, or KCI weights are modified.

## Relationship between artifacts

```
Legacy popularity rows (data/popularity.json — unchanged)
        │
        ▼
Popularity Registry v1 (frozen)
        │  9 canonical sources
        ▼
Country → source ID normalization
        │
        ▼
Popularity Records v1 (Phase 9B output)
        │  per-entity sources + regional payloads
        ▼
Future: KCI popularity scoring (Phase 10A)
```

| Artifact | Path | Role |
| --- | --- | --- |
| Legacy popularity | `data/popularity.json` | Existing rank/count rows (unchanged) |
| Popularity Registry | `data/popularity-registry.json` | Canonical source definitions (frozen) |
| Popularity Records | `data/popularity-records.json` | Entity-level source assignments + regional data |

## Record model

```json
{
  "name": "Aadi",
  "popularity": {
    "sources": ["SSA_US_BABY_NAMES"],
    "regions": {
      "USA": {
        "sourceId": "SSA_US_BABY_NAMES",
        "records": [
          { "year": 2022, "rank": 1, "count": 20143, "trendDirection": null },
          { "year": 2023, "rank": 1, "count": 19542, "trendDirection": null }
        ]
      }
    }
  }
}
```

Rules:

- One Popularity Record per entity with legacy popularity rows.
- `sources` lists sorted, deduplicated canonical source IDs from attributed regions.
- `regions` preserves the legacy row shape (`year`, `rank`, `count`, optional `trendDirection`).
- Each region references a canonical `sourceId` when the country maps to the Popularity Registry.
- Regions without a registry mapping retain data with `sourceId: null` and are tracked as unresolved authorities.
- Popularity Registry is not modified during population.

Schema: `schemas/popularity-records-v1.schema.json`

## Country → source mapping

| Country | Canonical source ID |
| --- | --- |
| USA | `SSA_US_BABY_NAMES` |
| UK | `ONS_ENGLAND_WALES_BABY_NAMES` |
| CAN | `STATCAN_CANADA_FIRST_NAMES` |
| AUS | `ABS_AUSTRALIA_BABY_NAMES` |

## Deterministic build workflow

```bash
node scripts/build/run-popularity-records-audit.js
```

Or step-by-step:

```bash
node scripts/editorial/build-popularity-records.js
node scripts/build/validate-popularity-records.js
node scripts/build/run-editorial-qa.js
node scripts/build/run-popularity-records-equivalence.js
```

`build-popularity-records.js`:

1. Reads `data/popularity.json` (legacy rows, unchanged).
2. Reads `data/popularity-registry.json` (frozen).
3. Maps countries to canonical source IDs.
4. Writes `data/popularity-records.json`.

## Validation

`validate-popularity-records.js` verifies:

- Schema compliance
- Every source ID exists in the Popularity Registry
- No duplicate source IDs per entity
- Deterministic record and source ordering
- Complete migration of all legacy popularity rows
- Deterministic rebuild equivalence

## Future KCI integration

Popularity Records provide the data layer for entity-level popularity scoring (5 KCI points). KCI popularity weighting remains **disabled** until Phase 10A explicitly enables scoring against `popularity-records.json`.

Phase 9B completes the popularity **data model**. Future editorial research (Phase 9C+) should emit Popularity Registry source IDs natively rather than requiring a separate migration pass.

## Phase 9B results

| Metric | Value |
| --- | ---: |
| Popularity Records generated | **5** |
| Legacy popularity rows migrated | 7 |
| Registry-attributable rows | 6 |
| Registry-unattributable rows | 1 (India — no registry source yet) |
| Source IDs assigned | **4** |
| Average sources per entity | 0.8 |
| Unresolved authorities | **1** (`India`) |
| Source resolution (attributable rows) | **100%** |
| Duplicate removals | 0 |
| Popularity validation | **PASS** |
| Editorial QA | **PASS** (0 issues) |
| Popularity equivalence | **PASS** |
| KCI average | **23.74** (unchanged) |
| KCI popularity coverage | 5 entities (0.14%, scoring still disabled) |
| Pipeline runtime | ~2s |

## Boundaries preserved

- Knowledge Record v2 unchanged
- Citation Infrastructure v1 unchanged
- Citation Population v1 unchanged
- Popularity Infrastructure v1 unchanged
- Legacy `data/popularity.json` unchanged
- KCI weights unchanged
- Popularity scoring disabled
- Rendering unchanged

## Related files

| File | Role |
| --- | --- |
| `scripts/editorial/popularity-records-v1.js` | Shared records builder library |
| `scripts/editorial/build-popularity-records.js` | Records builder |
| `scripts/build/validate-popularity-records.js` | Records validation |
| `scripts/build/run-popularity-records-equivalence.js` | Equivalence audit |
| `scripts/build/run-popularity-records-audit.js` | Phase 9B audit runner |
| `audit/popularity-records.json` | Phase 9B audit artifact |
| `audit/popularity-equivalence.json` | Equivalence audit artifact (Phase 9B) |
