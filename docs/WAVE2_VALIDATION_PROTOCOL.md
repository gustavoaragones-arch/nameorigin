# Wave 2 Validation Protocol

_Phase 16B — validation rules for cumulative Knowledge Record expansion._

## Purpose

Wave 1 validated against a **fixed** 1,150-record corpus. Wave 2 introduces **monotonic growth**. This protocol defines how validation evolves while preserving architectural guarantees.

## Validation evolution summary

| Check | Wave 1 | Wave 2 |
|-------|--------|--------|
| Knowledge Record count | Fixed at 1,150 | Increases by batch size each batch |
| Equivalence | Zero diff vs fixed baseline | Zero diff vs cumulative baseline |
| Duplicate prevention | N/A | Required every batch |
| Entity accounting | 1,150 + 2,547 = 3,697 | KR + unresearched = 3,697 |
| Partial records | Completion target → 0 | Not permitted at creation |
| Frozen layers | Unchanged | Unchanged |

## Per-batch validation suite

Every Wave 2 batch runs the following pipeline **before commit**:

```
1. build-phase15b-wave2-batchN-research.js     (if --apply)
2. apply-phase15b-wave2-batchN-research.js     (if --apply)
3. validate-knowledge-records.js
4. run-editorial-qa.js
5. validate-citation-records.js
6. run-knowledge-record-equivalence.js
7. run-knowledge-completeness-index.js
8. editorial-coverage.js
9. editorial-gap-analysis.js
10. validate-editorial-coverage.js
```

All steps must complete without error.

## Required PASS criteria

### QA

- `audit/editorial-qa.json` → `totals.totalIssueCount === 0`
- Status: **PASS**

### Equivalence

- `audit/knowledge-record-migration.json` → zero differences against cumulative baseline
- Existing Wave 1 records must produce zero diffs
- Newly created records are additive only

### Editorial integrity

- `audit/editorial-coverage.json` → `integrity.status === 'PASS'`

### Frozen layers

SHA-256 hashes unchanged for:

- `lib/analysis/knowledge-completeness.js` (KCI engine)
- `lib/analysis/kci-activation-v1.js` (KCI activation)
- Popularity registry

### Entity count

- Total entities: **3,697** (unchanged)

## Wave 2-specific checks

### Monotonic growth

```
knowledgeRecordsAfter === knowledgeRecordsBefore + batchSize
knowledgeRecordsAfter > knowledgeRecordsBefore
```

Batch 26 exception: `batchSize === 47`.

### Entity accounting

```
fullyResearchedAfter + unresearchedAfter === 3697
fullyResearchedAfter === knowledgeRecordsAfter
partialKnowledgeRecords === 0
```

### Duplicate prevention

- No two Knowledge Records share the same `normalizeKey(name)`.
- No batch entity appears in the pre-batch Knowledge Record set.
- No batch entity appears in any prior Wave 2 batch audit.

### No Wave 1 mutation

- The 1,150 Wave 1 Knowledge Records retain identical editorial content post-batch.
- Equivalence diff for Wave 1 subset must be zero.

### Full six-domain creation

- Every newly created record has all six editorial domains populated.
- `fullyResearchedEntities` increases by exactly `batchSize`.

## Cumulative baseline management

After each batch, the cumulative baseline advances:

| After batch | Expected KR count | Cumulative baseline artifact |
|-------------|-------------------|------------------------------|
| 0 (Wave 1 end) | 1,150 | `audit/phase15b-wave1-batch14-baseline.json` |
| 1 | 1,250 | `audit/phase15b-wave2-batch1-baseline.json` |
| N | 1,150 + (N × 100)* | `audit/phase15b-wave2-batchN-baseline.json` |

*Batch 26 adds 47, not 100.

Equivalence compares against the **pre-batch baseline** captured at the start of each batch audit. Differences must be zero for all records that existed before the batch; new records are additive.

## Batch audit artifact

Each batch produces `audit/phase15b-wave2-batchN.json` containing:

- `batchSelection` metadata
- `knowledgeRecordsBefore` / `knowledgeRecordsAfter`
- `editorialCoverage` before/after
- `entityAccounting` verification
- `duplicateCheck` results
- `qaStatus`, `equivalenceStatus`
- `frozenLayerVerification`
- `validation` object with all PASS flags

## Failure handling

If any validation check fails:

1. Do **not** commit.
2. Fix the issue in curated data or apply logic.
3. Re-run the full audit suite.
4. Only commit after all checks PASS.

Never amend a committed batch. Create a corrective batch only through governance review.

## Checkpoint validation

At milestone batches (1, 5, 10, 15, 20, 26), run an additional consolidated checkpoint audit (similar to `run-phase15b-wave1-checkpoint-audit.js`) verifying cumulative progress against Phase 16A forecasts.

## Wave 2 completion validation

Wave 2 is validated complete when:

| Metric | Expected |
|--------|----------|
| Knowledge Records | 3,697 |
| Fully researched | 3,697 |
| Unresearched | 0 |
| Partial | 0 |
| QA (all batches) | 26/26 PASS |
| Equivalence (all batches) | 26/26 PASS |
| Frozen layers (all batches) | 26/26 unchanged |
| Entity accounting | 3,697 = 3,697 |

## Governance reference

This protocol implements the validation targets defined in:

- `audit/phase16a-expansion-intelligence.json` → `validationTargets`
- `docs/WAVE2_GOVERNANCE.md`

Implementation must not deviate from this protocol without a new governance phase.
