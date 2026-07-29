# Wave 2 Batch Specification

_Phase 16B — deterministic 100-record batch construction for Knowledge Record creation._

## Overview

Phase 15B Wave 2 creates Knowledge Records for 2,547 unresearched entities in **26 deterministic batches** of **100 records** each (47 in the final batch).

| Parameter | Value |
|-----------|-------|
| Phase | 15B Wave 2 |
| Operation | `create_knowledge_record` |
| Batch size | 100 |
| Final batch size | 47 |
| Total batches | 26 |
| Starting KR count | 1,150 |
| Final KR count | 3,697 |
| Selection source | `audit/phase16a-expansion-intelligence.json` → `creationOrder` |

## Batch numbering

Batches are numbered **1 through 26** sequentially. Each batch is independent and committed separately.

```
Wave 2 Batch 1  → creationOrder ranks 1–100    → KR count 1,150 → 1,250
Wave 2 Batch 2  → creationOrder ranks 101–200   → KR count 1,250 → 1,350
...
Wave 2 Batch 25 → creationOrder ranks 2,401–2,500 → KR count 3,600 → 3,650
Wave 2 Batch 26 → creationOrder ranks 2,501–2,547 → KR count 3,650 → 3,697
```

## Wave 2A entry

**Wave 2A Batch 1** is the first operational batch:

- Ranks: 1–100
- Expected KR count after apply: **1,250**
- Milestone: Wave 2A entry (Phase 16A expansion milestone)

## Selection algorithm

For batch *N* (1 ≤ N ≤ 26):

```javascript
const BATCH_SIZE = 100;
const startRank = (N - 1) * BATCH_SIZE + 1;
const endRank = Math.min(N * BATCH_SIZE, 2547);
const candidates = creationOrder.filter(row => row.rank >= startRank && row.rank <= endRank);
```

Rules:

1. Candidates come **only** from Phase 16A `creationOrder`.
2. Already-created entities (from prior Wave 2 batches) are excluded by rank progression.
3. Entities with existing Knowledge Records are never selected.
4. Batch size must match `endRank - startRank + 1` except batch 26 (47 records).

## Batch pipeline (per batch)

Each batch follows the Wave 1 four-part pattern, adapted for creation:

| Step | Artifact | Purpose |
|------|----------|---------|
| 1 | `scripts/editorial/phase15b-wave2-batchN-curated-data.js` | Six-domain editorial profiles |
| 2 | `scripts/editorial/build-phase15b-wave2-batchN-research.js` | Research artifact |
| 3 | `scripts/editorial/apply-phase15b-wave2-batchN-research.js` | Create KRs + overrides |
| 4 | `scripts/build/run-phase15b-wave2-batchN-audit.js` | Validation + audit JSON |

Apply command:

```bash
node scripts/build/run-phase15b-wave2-batchN-audit.js --apply
```

## Curated data requirements

Each profile in curated data must include all six editorial domains:

- `name`
- `origin` (origin_country, origin_cluster, language)
- `meaning`
- `pronunciation`
- `etymology`
- `history`

Variants are resolved via normalization unless explicitly overridden.

Use `makeCreationRecord()` from `scripts/editorial/phase15b-wave2-lib.js` (to be created at Wave 2 Batch 1 implementation).

## Apply behavior (creation mode)

Unlike Wave 1 apply scripts, Wave 2 apply:

1. **Creates** new Knowledge Records for entities without existing KRs.
2. **Writes** all six editorial override domains.
3. **Does not modify** any existing Knowledge Record.
4. Rebuilds: knowledge records → enriched names → citations → citation records.
5. Increases total KR count by exactly the batch size.

## Batch metadata

Each curated data file exports:

```javascript
BATCHN_SELECTION: {
  method: 'phase16a_creation_order',
  scope: 'create_knowledge_record_only',
  wave: 2,
  batch: N,
  rankStart: (N - 1) * 100 + 1,
  rankEnd: Math.min(N * 100, 2547),
  batchesCompleteBeforeSelection: N - 1,
  profilePattern: 'full_six_domain_creation',
  sourceArtifact: 'audit/phase16a-expansion-intelligence.json',
}
```

## Cumulative targets

| Batch | Ranks | KR count after | Unresearched after |
|-------|-------|----------------|-------------------|
| 1 | 1–100 | 1,250 | 2,447 |
| 2 | 101–200 | 1,350 | 2,347 |
| 5 | 401–500 | 1,650 | 2,047 |
| 10 | 901–1,000 | 2,150 | 1,547 |
| 15 | 1,401–1,500 | 2,650 | 1,047 |
| 20 | 1,901–2,000 | 3,150 | 547 |
| 25 | 2,401–2,500 | 3,650 | 47 |
| 26 | 2,501–2,547 | 3,697 | 0 |

## Milestone checkpoints

Recommended checkpoint audits (similar to Wave 1 Batch 8):

| Batch | Milestone | KR count |
|-------|-----------|----------|
| 1 | Wave 2A entry | 1,250 |
| 5 | Early expansion | 1,650 |
| 10 | Mid-expansion | 2,150 |
| 15 | Editorial milestone | 2,650 |
| 20 | Majority coverage | 3,150 |
| 26 | Full corpus | 3,697 |

## Exclusions

Wave 2 batches must **not**:

- Select entities outside `creationOrder` ranking.
- Re-select entities from prior batches.
- Select entities that already have Knowledge Records.
- Create partial Knowledge Records.
- Modify Wave 1 editorial content.

## Wave 2 Batch 1 entity preview

The first 100 entities (ranks 1–100) are defined in `audit/phase16b-governance-check.json` → `wave2Batch1.entities` and sourced from Phase 16A `creationOrder`.
