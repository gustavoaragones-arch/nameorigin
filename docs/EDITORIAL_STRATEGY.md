# Editorial Strategy

_Phase 15A — prioritization framework for Phase 15B Knowledge Record expansion._

Phase 15A is the most consequential intelligence audit of the Expansion era. It produces the definitive editorial roadmap that drives Citation and Popularity enrichment downstream.

## Two-report model

| Report | Question | Output |
| --- | --- | --- |
| `editorial-coverage.json` | What is the current editorial state? | KR coverage, domain breakdown, partial records, integrity |
| `editorial-gap-analysis.json` | Where should editorial investment go first? | Priority rankings, deserts, Phase 15B expansion roadmap |

## Priority score methodology

Priority scores are computed **at audit time only**. They are **not** persisted to Knowledge Records or KCI.

### Factors (deterministic weights)

| Factor | Signal |
| --- | --- |
| `no_knowledge_record` | Entity lacks a Knowledge Record (+100) |
| `partial_knowledge_record` | KR exists but domains missing (+60 + 8 per domain) |
| `missing_editorial_domains` | Specific domains absent |
| `popularity_available` | Legacy popularity data exists |
| `citation_without_full_editorial` | Citation Record exists but editorial incomplete |
| `legacy_metadata_available` | Legacy meaning/origin in names-enriched |
| `low_kci` | KCI below 30 |
| `near_complete_research` | KR with KCI ≥ 80 (completion candidates) |
| `missing_core_domains` | Origin or meaning missing |

### Top 100 interpretation

The current top 100 highest-priority entities are predominantly **partial Knowledge Records with Citation Records** — entities where completing missing domains yields immediate citation and KCI improvements without creating records from scratch.

Examples: `abbygail`, `abd`, `achilles` — origin populated, meaning/pronunciation/etymology/history missing, citation already assigned.

This does **not** diminish the **2,547 unresearched entities**. Bulk Knowledge Record creation remains the largest expansion body of work. The ranked list optimizes for **near-term editorial ROI**; Phase 15B should use both:

1. **Top 100 ranked list** — complete or create records in priority order
2. **`totals.unresearchedEntities`** — plan waves for the 2,547-entity editorial desert

## Phase 15A strategic findings

1. **Editorial coverage is the upstream bottleneck.** Citation and popularity infrastructure are sound; they await Knowledge Records.
2. **2,547 entities (68.89%)** have zero editorial domains — no Knowledge Record exists.
3. **350 partial records (30.43% of KR)** need domain completion before they are fully researched.
4. **800 entities (21.64%)** are fully researched — the quality benchmark for Phase 15B.
5. **Meaning** is the most commonly missing domain among partial records (244 entities).

## Phase 15B expansion workflow

```
Phase 15A (measure)
        ↓
audit/editorial-coverage.json
audit/editorial-gap-analysis.json
        ↓
Phase 15B (expand Knowledge Records)
        ↓
Citation enrichment (as needed)
        ↓
Popularity enrichment (as needed)
        ↓
Validation → Equivalence → Freeze
```

### Expansion rules for 15B

1. Work from `expansionRoadmap.phase15BInput` in the gap analysis report.
2. Each entry specifies `create_knowledge_record` or `complete_domains`.
3. Do not modify Knowledge Record schema or KCI weights.
4. After each editorial batch: rebuild Citation Records, run QA, validate equivalence.
5. Re-run Phase 15A to measure improvement.

### Per-entity Phase 15B input fields

| Field | Purpose |
| --- | --- |
| `slug` / `name` | Entity identifier |
| `currentEditorialCompleteness` | Percent of 6 domains populated |
| `populatedDomains` / `missingDomains` | Domain-level gap detail |
| `hasCitationRecord` / `hasPopularity` | Downstream enrichment signals |
| `currentKci` | Completeness context |
| `priorityScore` / `priorityReasons` | Deterministic ranking |
| `action` | `create_knowledge_record` or `complete_domains` |

## Relationship to Phases 13A and 14A

| Phase | Finding | Implication for 15B |
| --- | --- | --- |
| 13A | Citation complete for researched corpus | New KRs trigger Citation Record creation |
| 14A | Popularity infrastructure ready, data sparse | New KRs enable popularity attribution |
| **15A** | **2,547 editorial desert** | **Primary expansion target** |

## Growth Era pattern

```
Audit → Prioritize → Expand → Validate → Freeze
```

Phases 13A, 14A, and 15A complete the **Audit** and **Prioritize** steps for all three data layers. Phase 15B begins the largest **Expand** step.

## Freeze guarantees

Phase 15A success requires:

- Knowledge Records byte-identical
- Citation and Popularity Records unchanged
- KCI unchanged
- Coverage and gap reports generated
- Validation PASS
- Deterministic PASS
- Repository equivalence PASS

## Running the audit

```bash
node scripts/build/run-editorial-coverage-audit.js
```

Expected output:

- Knowledge record coverage: **31.11%**
- Unresearched entities: **2,547**
- Integrity: **PASS**
- Repository unchanged: **PASS**

## Related documentation

- [EDITORIAL_COVERAGE.md](./EDITORIAL_COVERAGE.md) — metric definitions and baseline
- [CITATION_COVERAGE.md](./CITATION_COVERAGE.md) — Phase 13A citation intelligence
- [POPULARITY_COVERAGE.md](./POPULARITY_COVERAGE.md) — Phase 14A popularity intelligence
- [ARCHITECTURE_VERSION_HISTORY.md](./ARCHITECTURE_VERSION_HISTORY.md) — Platform Expansion lifecycle
