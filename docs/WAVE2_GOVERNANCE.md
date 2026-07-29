# Wave 2 Governance

_Phase 16B — frozen governance contract for Knowledge Record creation._

Phase 16B formalizes the rules that all Phase 15B Wave 2 batches must follow. This document is the authoritative governance contract. Implementation must not begin until `audit/phase16b-governance-check.json` reports `status: FROZEN`.

## Scope shift

| Dimension | Wave 1 | Wave 2 |
|-----------|--------|--------|
| Operation | `complete_domains` | `create_knowledge_record` |
| KR count | Fixed at 1,150 | Monotonic increase |
| Target entities | Partial records only | Unresearched entities only |
| Editorial action | Fill missing domains | Assign all six domains at creation |
| Equivalence baseline | Fixed 1,150-record corpus | Cumulative baseline after each batch |

Wave 2 is a **Knowledge Record creation program**, not a completion program. Phase 16A confirmed that all 2,547 unresearched entities require full six-domain editorial assignment.

## Frozen architectural invariants

The following remain **unchanged** throughout Wave 2:

- Knowledge Record schema (KR v2)
- KCI engine and weights
- Citation architecture and registry
- Popularity registry and record schema
- Editorial domain definitions (origin, meaning, pronunciation, etymology, history, variants)
- Entity universe (3,697 total entities)

Wave 2 must **not** modify schema, KCI weights, citation registry, or popularity registry.

## Wave 2 creation invariants

### 1. Monotonic Knowledge Record growth

- Starting baseline: **1,150** Knowledge Records (Wave 1 closed state).
- Each batch adds a positive, bounded number of new records.
- Final target: **3,697** Knowledge Records.
- KR count never decreases during Wave 2.

### 2. Entity accounting

At all times:

```
Knowledge Records + Unresearched Entities = 3,697
```

After batch *N*:

```
KR count = 1,150 + (records created in batches 1..N)
Unresearched = 2,547 − (records created in batches 1..N)
```

### 3. No overlap with existing records

- Wave 2 must never create a Knowledge Record for an entity that already has one.
- Wave 2 must never overwrite an existing Knowledge Record's editorial content.
- The 1,150 Wave 1 records are immutable editorial baselines.

### 4. Full six-domain standard at creation

Every new Knowledge Record must satisfy the six-domain editorial standard at creation:

- origin
- meaning
- pronunciation
- etymology
- history
- variants (via normalization or explicit assignment)

Partial Knowledge Records are **not permitted** in Wave 2 output.

### 5. Deterministic selection

- Entity selection uses `audit/phase16a-expansion-intelligence.json` → `creationOrder`.
- Batch *N* selects ranks `(N−1)×100+1` through `N×100` (47 in final batch 26).
- Tie-breaking: expansion priority score DESC, slug ASC (frozen in Phase 16A).
- No ad-hoc entity selection outside `creationOrder`.

### 6. Slug and identity policy

- Entity identity: `normalizeKey(name)` (trimmed, lowercased name).
- Slug: from normalized-names universe (Phase 16A `creationOrder.slug`).
- Duplicate detection: no two Knowledge Records may share the same normalized name key.
- ID generation: deterministic lookup by name key; no random or sequential synthetic IDs.

### 7. Audit-before-commit

Every batch follows the Wave 1 discipline:

1. Curated editorial data
2. Research artifact build
3. Apply (create records + editorial overrides)
4. Full validation suite
5. Batch audit JSON
6. Commit only after validation PASS

No batch commits without passing QA, equivalence, editorial integrity, and frozen-layer checks.

## Batch parameters (frozen)

| Parameter | Value |
|-----------|-------|
| Records per batch | 100 (47 in batch 26) |
| Total batches | 26 |
| Selection source | Phase 16A `creationOrder` |
| Action | `create_knowledge_record` |
| Wave 2A entry (Batch 1) | Ranks 1–100 → KR count 1,250 |

See `docs/WAVE2_BATCH_SPECIFICATION.md` for batch construction rules.

## Validation requirements

See `docs/WAVE2_VALIDATION_PROTOCOL.md` for per-batch and cumulative validation rules.

Every batch must verify:

- QA PASS
- Equivalence PASS (against cumulative baseline)
- Editorial integrity PASS
- Frozen layers unchanged
- Entity accounting balanced
- No duplicate Knowledge Records
- Monotonic KR growth

## Success criteria (per batch)

A Wave 2 batch is successful when:

1. Exactly the specified number of new fully researched Knowledge Records were created.
2. KR count increased by the batch size; unresearched count decreased by the same amount.
3. All validation checks PASS.
4. No existing Wave 1 editorial content was modified.
5. Batch audit artifact written to `audit/phase15b-wave2-batchN.json`.

## Success criteria (Wave 2 complete)

Wave 2 is complete when:

- Knowledge Records: **3,697 / 3,697**
- Unresearched entities: **0**
- Partial Knowledge Records: **0**
- All 26 batches validated and committed
- Wave 2 Final Report and Completion Manifest published

## Prerequisites

| Prerequisite | Artifact | Status required |
|--------------|----------|-----------------|
| Wave 1 closed | `audit/phase15b-wave1-completion-manifest.json` | `CLOSED` |
| Expansion intelligence | `audit/phase16a-expansion-intelligence.json` | `COMPLETE` |
| Governance frozen | `audit/phase16b-governance-check.json` | `FROZEN` |

## References

- Phase 16A intelligence: `docs/PHASE16A_EXPANSION_INTELLIGENCE.md`
- Wave 1 manifest: `docs/PHASE15B_WAVE1_COMPLETION_MANIFEST.md`
- Batch specification: `docs/WAVE2_BATCH_SPECIFICATION.md`
- Validation protocol: `docs/WAVE2_VALIDATION_PROTOCOL.md`
