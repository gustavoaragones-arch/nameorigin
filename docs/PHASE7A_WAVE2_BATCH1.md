# Phase 7A — Editorial Expansion (Wave 2, Batch 1)

_Wave 2 begins — editorial data only, platform frozen._

Phase 7A is the first Wave 2 editorial batch. It expands the Knowledge Record corpus from **757 → 950** records using the existing deterministic pipeline. No rendering, schema, adapter, KCI weight, or QA rule changes were made.

## Objective

| Metric | Before | After | Target |
| --- | ---: | ---: | ---: |
| Knowledge Records | 757 | **950** | ~950 |
| Origin coverage | 585 (15.82%) | **778 (21.04%)** | ~750 (~20%) |
| Meaning coverage | 513 (13.88%) | **706 (19.10%)** | ~750 (~20%) |
| Pronunciation coverage | 583 (15.77%) | **776 (20.99%)** | ~750 (~20%) |
| Etymology coverage | 571 (15.44%) | **764 (20.67%)** | ~750 (~20%) |
| History coverage | 571 (15.44%) | **764 (20.67%)** | ~750 (~20%) |

Every new record includes all five editorial domains with full provenance metadata (`value`, `confidence`, `confidenceLevel`, `sources`, `notes`).

## Governance (Wave 2 frozen)

| Constraint | Status |
| --- | --- |
| No architecture changes | ✅ |
| No schema evolution | ✅ |
| No KCI weight changes | ✅ |
| No rendering changes | ✅ |
| QA + equivalence before merge | ✅ |

## Methodology

1. Curate **193** full five-domain Knowledge Records in `wave2-batch1-curated-data.js`.
2. Build research file: `node scripts/editorial/build-wave2-batch1-research.js`
3. Apply to legacy overrides + domain research files: `node scripts/editorial/apply-wave2-batch1-research.js`
4. Regenerate Knowledge Records and enriched names.
5. Run validation pipeline (see below).

Source policy: documented references only (Oxford Dictionary of First Names, Cambridge English Pronouncing Dictionary, etymological and historical name dictionaries). No AI-generated facts.

## Pipeline

```bash
node scripts/build/run-phase7a-wave2-audit.js --apply
```

Or step-by-step:

```bash
node scripts/editorial/build-wave2-batch1-research.js
node scripts/editorial/apply-wave2-batch1-research.js
node scripts/editorial/build-knowledge-records.js
node scripts/build/validate-knowledge-records.js
node scripts/build/run-editorial-qa.js
node scripts/build/run-knowledge-record-equivalence.js
node scripts/editorial/rebuild-names-enriched.js
node scripts/build/run-knowledge-completeness-index.js
node scripts/build/run-phase7a-wave2-audit.js
```

## Names researched

193 new full five-domain records (alphabetical batch: **Abtin** through **Bethanie**). Full name list: `audit/phase7a-wave2.json` → `newEditorialRecords.names`.

## Editorial totals

| Metric | Before | After |
| --- | ---: | ---: |
| Knowledge Records | 757 | 950 |
| Full 5-domain records | 407 | 600 |
| Partial records | 350 | 350 |
| Average populated domains / record | 3.73 | 3.99 |
| Total provenance source entries | 4,801 | 6,314 |
| Entity count | 3,697 | 3,697 |

## QA summary

Audit artifact: `audit/editorial-qa.json`

| Check | Result |
| --- | --- |
| Overall status | **PASS** |
| Schema validation | **PASS** |
| Missing metadata | 0 issues |
| Source completeness (all domains) | 100% on populated domains |
| Determinism | **PASS** |
| Duplicate text clusters | 5 clusters flagged (template cluster assignments — informational) |

Editorial quality status: **NEEDS_ATTENTION** (duplicate cluster warnings only; no blocking issues).

## Equivalence summary

Audit artifact: `audit/knowledge-record-migration.json`

| Check | Result |
| --- | --- |
| Legacy vs Knowledge Record pipeline | **PASS** (0 differences) |
| Baseline enriched vs rebuild | **PASS** (0 differences) |

## KCI impact

| Metric | Before | After |
| --- | ---: | ---: |
| Average KCI | 15.24 | **19.41** |
| Median | 5 | 5 |
| Max | 90 | 90 |

KCI weights unchanged. Increase reflects expected coverage growth only.

## Performance observations

Full Phase 7A audit pipeline (apply + validate + QA + equivalence + rebuild + KCI) completes in **~5 seconds** on the current corpus. No performance regressions observed. Deterministic rebuild confirmed across two consecutive QA runs.

## Validation

Audit artifact: `audit/phase7a-wave2.json`

| Success criterion | Result |
| --- | --- |
| ~950 Knowledge Records | ✅ 950 |
| ~20% domain coverage | ✅ 19.1–21.0% |
| 100% provenance on populated domains | ✅ |
| Editorial QA PASS | ✅ |
| Knowledge Record validation PASS | ✅ |
| Zero equivalence failures | ✅ |
| Deterministic rebuild | ✅ |
| No platform changes | ✅ |

## Related files

| File | Role |
| --- | --- |
| `scripts/editorial/wave2-batch1-lib.js` | Record builder helpers |
| `scripts/editorial/wave2-batch1-curated-data.js` | 193 curated full records |
| `scripts/editorial/build-wave2-batch1-research.js` | Research file builder |
| `scripts/editorial/apply-wave2-batch1-research.js` | Override + research applier |
| `scripts/build/run-phase7a-wave2-audit.js` | Phase 7A audit runner |
| `audit/phase7a-wave2-baseline.json` | Pre-expansion snapshot |
| `audit/phase7a-wave2.json` | Post-expansion audit |
| `data/sources/wave2-batch1-research.json` | Batch research file |

## Next milestone

**Phase 7B** — expand to ~25% coverage (~1,150 Knowledge Records) using the same frozen pipeline.
