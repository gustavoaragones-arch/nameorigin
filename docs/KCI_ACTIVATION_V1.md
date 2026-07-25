# KCI Activation v1

_Phase 10A — engine activation only, all data architectures frozen._

Phase 10A connects the Knowledge Completeness Index (KCI) to the completed Citation Records and Popularity Records data models. No editorial content, record payloads, registries, rendering, or KCI weights are modified.

## Objective

Activate the previously reserved **Citation** (10 points) and **Popularity** (5 points) KCI dimensions using frozen record artifacts.

| Dimension | Weight | Activation source |
| --- | ---: | --- |
| Citation | 10 | `data/citation-records.json` |
| Popularity | 5 | `data/popularity-records.json` |

All other dimensions continue to score from canonical entity fields unchanged.

## Scoring flow

```
Canonical entities (3697)
        │
        ├── origin, meaning, pronunciation, etymology, history, variants
        │       └── scored from entity fields (unchanged)
        │
        ├── citations (10 pts)
        │       └── Citation Records lookup by name
        │           • valid record with citation IDs → 10
        │           • no record → 0
        │
        └── popularity (5 pts)
                └── Popularity Records lookup by name
                    • record with ≥1 canonical source ID → 5
                    • no record → 0
                    • unresolved-only record (e.g. India) → 0
```

## Citation scoring

An entity receives citation points when a Citation Record exists with at least one populated domain containing citation IDs.

- **No Citation Record** → 0 points
- **Valid Citation Record** → 10 points (full citation weight)

No per-domain weighting. No citation ID weighting.

## Popularity scoring

An entity receives popularity points when a Popularity Record exists with at least one canonical source ID in `sources`.

- **No Popularity Record** → 0 points
- **Popularity Record with canonical sources** → 5 points
- **Popularity Record with unresolved authorities only** (e.g. `sourceId: null` for India) → 0 points

No source weighting. No regional weighting. No trend weighting.

## Handling missing records

All 3,697 entities are scored deterministically. Missing Citation or Popularity Records never throw errors — they contribute zero points for that dimension.

## Handling unresolved authorities

Popularity Records may preserve regional data for countries without registry sources (Phase 9B India example). These records retain `sourceId: null` and an empty `sources` array. KCI treats them as zero popularity points without error.

## Deterministic guarantees

- Same inputs → identical scores
- `validate-kci-activation.js` verifies deterministic rebuild
- KCI report semantic hash excludes timestamp-only drift on rebuild

## Pipeline

```bash
node scripts/build/run-kci-activation-audit.js
```

Or step-by-step:

```bash
node scripts/build/run-kci.js
node scripts/build/validate-kci-activation.js
node scripts/build/run-editorial-qa.js
node scripts/build/run-kci-activation-equivalence.js
```

## Future extensibility

Phase 10A activates binary presence scoring only. Future phases may introduce:

- Per-source popularity weighting
- Regional coverage weighting
- Trend-based scoring
- Citation domain weighting

Those require explicit scope and must not modify frozen record schemas.

## Phase 10A results

| Metric | Value |
| --- | ---: |
| Entities scored | **3,697** |
| Average KCI before activation | **23.74** |
| Average KCI after activation | **26.85** (+3.11) |
| Max score achieved | **100** |
| Citation coverage | **1,150** (31.11%) |
| Popularity coverage | **4** (0.11%) |
| Citation scoring | **Active** |
| Popularity scoring | **Active** |
| Unresolved authority handling | **PASS** (Aakriti → 0 popularity pts) |
| Deterministic rebuild | **PASS** |
| Editorial QA | **PASS** |
| Equivalence | **PASS** |

## Boundaries preserved

- Knowledge Architecture unchanged
- Citation Infrastructure unchanged
- Citation Records unchanged
- Popularity Infrastructure unchanged
- Popularity Records unchanged
- KCI weights unchanged
- Rendering unchanged

## Related files

| File | Role |
| --- | --- |
| `lib/analysis/kci-activation-v1.js` | Record loading and activation helpers |
| `lib/analysis/knowledge-completeness.js` | KCI scoring engine (extended) |
| `scripts/build/run-kci.js` | KCI runner with activation enabled |
| `scripts/build/validate-kci-activation.js` | Activation validation |
| `scripts/build/run-kci-activation-equivalence.js` | Equivalence audit |
| `scripts/build/run-kci-activation-audit.js` | Phase 10A audit runner |
| `audit/kci-activation.json` | Phase 10A audit artifact |
| `audit/kci-activation-equivalence.json` | Equivalence artifact |
