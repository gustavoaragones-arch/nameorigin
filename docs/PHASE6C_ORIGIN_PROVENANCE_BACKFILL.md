# Phase 6C — Origin Provenance Backfill

_Phase 6 editorial metadata completion — provenance only._

Phase 6C completes origin provenance metadata for Knowledge Record v2 entries that already had valid editorial origin values but lacked `sources` and `notes`. No origin values, confidence scores, enrichment output, rendering, schema, or KCI weights were changed.

## Objective

Bring the Origin domain to the same editorial metadata standard already achieved for Meaning, Pronunciation, Etymology, and History:

| Field | Required on every populated origin domain |
| --- | --- |
| `value` | ✅ (unchanged) |
| `confidence` | ✅ (unchanged) |
| `confidenceLevel` | ✅ (unchanged) |
| `sources` | ✅ backfilled |
| `notes` | ✅ backfilled |

## Problem statement

After Phase 6B QA, **167 of 585** origin records had structurally valid origin assignments but empty `sources` arrays and null `notes`. These records were present in `origin-overrides.json` but absent from `origin-wave1-research.json` (research file had 418 entries vs 585 overrides).

Other domains had complete provenance metadata; Origin was the sole gap.

## Scope

| In scope | Out of scope |
| --- | --- |
| Origin `sources` backfill | New names |
| Origin `notes` backfill | New origin assignments |
| `origin-wave1-research.json` completion | Confidence changes |
| `knowledge-records.json` regeneration | KCI changes |
| Audit verification | Rendering / HTML changes |

## Methodology

1. Identify origin overrides missing research provenance (167 records).
2. For each record, create or update a research entry using:
   - Existing origin values from overrides (unchanged)
   - Existing confidence (unchanged)
   - `sources` from `origin-wave1-sources.js` catalog (`sourcesForCluster`)
   - `researchNotes` using Wave 1 editorial assignment format
3. Merge into `data/sources/origin-wave1-research.json` (585 entries total).
4. Regenerate `data/knowledge-records.json` via `build-knowledge-records.js`.

No inferred origin values. No generated origin prose. Metadata only.

## Workflow

```bash
# Apply backfill
node scripts/editorial/backfill-origin-provenance.js

# Audit before/after metrics
node scripts/build/run-origin-provenance-backfill-audit.js

# Or combined
node scripts/build/run-origin-provenance-backfill-audit.js --apply

# Re-run editorial QA
node scripts/build/run-editorial-qa.js
```

## Results

| Metric | Before (6B) | After (6C) |
| --- | ---: | ---: |
| Origin records with sources | 418 | **585** |
| Origin records with notes | 418 | **585** |
| Empty origin source arrays | 167 | **0** |
| Empty origin notes | 167 | **0** |
| Research file entries | 418 | **585** |
| Enrichment differences | — | **0** |
| Editorial QA status | CLEAN | **CLEAN** |

## Validation

Audit artifact: `audit/origin-provenance-backfill.json`

| Check | Result |
| --- | --- |
| Target 585 origin sources | ✅ |
| Target 585 origin notes | ✅ |
| Zero empty origin sources | ✅ |
| Entity count 3,697 unchanged | ✅ |
| `names-enriched.json` unchanged | ✅ |
| Schema unchanged | ✅ |
| KCI unchanged | ✅ |

## Architectural boundaries

- Origin editorial **values** unchanged
- Confidence unchanged
- Enrichment merge output byte-identical
- Knowledge Record v2 schema unchanged
- Legacy override compatibility preserved

## Editorial platform status

After Phase 6C, every populated domain on every Knowledge Record has uniform metadata:

```
value + confidence + confidenceLevel + sources + notes
```

This establishes the **Editorial Architecture v2 baseline** — the editorial platform is structurally complete. Future work (Wave 2 expansion) adds content entries that pass the existing QA pipeline rather than evolving architecture.

## Related files

| File | Role |
| --- | --- |
| `scripts/editorial/backfill-origin-provenance.js` | Backfill runner |
| `scripts/build/run-origin-provenance-backfill-audit.js` | Audit |
| `audit/origin-provenance-backfill.json` | Audit artifact |
| `data/sources/origin-wave1-research.json` | Completed research provenance |
| `docs/EDITORIAL_QA.md` | QA gate for future batches |

## Next milestone

**Wave 2 expansion** — add new Knowledge Record entries using the established pipeline and QA gate. No architectural changes required.
