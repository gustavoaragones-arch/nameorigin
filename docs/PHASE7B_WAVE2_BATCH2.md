# Phase 7B — Editorial Expansion (Wave 2, Batch 2)

_Wave 2 continues — editorial data only, platform frozen._

Phase 7B expands the Knowledge Record corpus from **950 → 1,150** records using the existing deterministic pipeline. No rendering, schema, adapter, KCI weight, or QA rule changes were made.

## Objective

| Metric | Before | After | Target |
| --- | ---: | ---: | ---: |
| Knowledge Records | 950 | **1,150** | ~1,150 (~31% of entities) |
| Origin coverage | 778 (21.04%) | **978 (26.45%)** | ~978 |
| Meaning coverage | 706 (19.10%) | **906 (24.51%)** | ~906 |
| Pronunciation coverage | 776 (20.99%) | **976 (26.40%)** | ~976 |
| Etymology coverage | 764 (20.67%) | **964 (26.08%)** | ~964 |
| History coverage | 764 (20.67%) | **964 (26.08%)** | ~964 |

Entity-level Knowledge Record coverage: **1,150 / 3,697 = 31.1%**.

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

1. Curate **200** full five-domain Knowledge Records in `wave2-batch2-curated-data.js` (Bethlehem → Conrad).
2. Build research file: `node scripts/editorial/build-wave2-batch2-research.js`
3. Apply to legacy overrides + domain research files: `node scripts/editorial/apply-wave2-batch2-research.js`
4. Regenerate Knowledge Records and enriched names.
5. Run validation pipeline (see below).

Source policy: documented references only (Oxford Dictionary of First Names, Cambridge English Pronouncing Dictionary, etymological and historical name dictionaries). No AI-generated facts.

## Pipeline

```bash
node scripts/build/run-phase7b-wave2-audit.js --apply
```

Or step-by-step:

```bash
node scripts/editorial/build-wave2-batch2-research.js
node scripts/editorial/apply-wave2-batch2-research.js
node scripts/editorial/build-knowledge-records.js
node scripts/build/validate-knowledge-records.js
node scripts/build/run-editorial-qa.js
node scripts/build/run-knowledge-record-equivalence.js
node scripts/editorial/rebuild-names-enriched.js
node scripts/build/run-knowledge-completeness-index.js
node scripts/build/run-phase7b-wave2-audit.js
```

## Names researched

200 new full five-domain records (alphabetical batch: **Bethlehem** through **Conrad**). Full name list: `audit/phase7b-wave2.json` → `newEditorialRecords.names`.

## Editorial totals

| Metric | Before | After |
| --- | ---: | ---: |
| Knowledge Records | 950 | 1,150 |
| Full 5-domain records | 600 | 800 |
| Partial records | 350 | 350 |
| Average populated domains / record | 3.99 | 4.16 |
| Total provenance source entries | 6,314 | 7,886 |
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
| Average KCI | 19.41 | **23.74** |
| Median | 5 | 5 |
| Max | 90 | 90 |

KCI weights unchanged. Increase reflects expected coverage growth only.

## Performance observations

Full Phase 7B audit pipeline (apply + validate + QA + equivalence + rebuild + KCI) completes in **~5 seconds** on the current corpus. No performance regressions observed. Deterministic rebuild confirmed across consecutive QA runs.

## Validation

Audit artifact: `audit/phase7b-wave2.json`

| Success criterion | Result |
| --- | --- |
| ~1,150 Knowledge Records | ✅ 1,150 |
| ~31% entity coverage (KR count) | ✅ 31.1% |
| Domain targets (~978 / ~906 / ~976 / ~964 / ~964) | ✅ |
| 100% provenance on populated domains | ✅ |
| Editorial QA PASS | ✅ |
| Knowledge Record validation PASS | ✅ |
| Zero equivalence failures | ✅ |
| Deterministic rebuild | ✅ |
| No platform changes | ✅ |

## Related files

| File | Role |
| --- | --- |
| `scripts/editorial/wave2-batch2-lib.js` | Record builder helpers |
| `scripts/editorial/generate-wave2-batch2-curated-data.js` | Curated data generator |
| `scripts/editorial/wave2-batch2-curated-data.js` | 200 curated full records |
| `scripts/editorial/build-wave2-batch2-research.js` | Research file builder |
| `scripts/editorial/apply-wave2-batch2-research.js` | Override + research applier |
| `scripts/build/run-phase7b-wave2-audit.js` | Phase 7B audit runner |
| `audit/phase7b-wave2-baseline.json` | Pre-expansion snapshot |
| `audit/phase7b-wave2.json` | Post-expansion audit |
| `data/sources/wave2-batch2-research.json` | Batch research file |

## Recommended next milestone

With **1,150** curated Knowledge Records (~31% entity coverage), consider shifting priorities before additional Wave 2 batches:

1. **Phase 8A — Citation Infrastructure** — populate the citation dimension (currently 0% coverage, 10 KCI points).
2. **Phase 8B — Popularity Data Expansion** — expand beyond 5 populated popularity records (0.14% coverage).
3. Resume Wave 2 editorial batches (7C, 7D, etc.) after those dimensions are established.

This sequence should yield larger KCI gains than continuing to add only the five existing editorial domains.
