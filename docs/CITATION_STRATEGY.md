# Citation Strategy

_Phase 13A — prioritization framework for Phase 13B expansion._

Phase 13A separates **operational measurement** from **strategic planning**. This document explains how priority scores work, how Phase 13B should consume the audit, and the deterministic expansion workflow.

## Two-report model

| Report | Question | Output |
| --- | --- | --- |
| `citation-coverage.json` | What is the current state? | Coverage %, distribution, registry quality, integrity |
| `citation-gap-analysis.json` | Where should we invest next? | Priority rankings, gap summaries, diversity analysis |

Never merge these concerns. Operational validation and strategic planning serve different audiences and different phase gates.

## Priority score methodology

Priority scores are computed **at audit time only**. They are **not** persisted to KCI, Knowledge Records, or Citation Records.

### Factors (deterministic weights)

| Factor | Signal |
| --- | --- |
| `zero_citations` | Entity has no Citation Record |
| `single_publication` | Entity cites only one unique publication |
| `low_kci` | KCI score below 30 |
| `uncited_editorial_domains` | Populated KR domain without citation IDs |
| `missing_editorial_domains` | Editorial domain not yet researched |
| `popularity_available` | Entity has popularity data (expansion leverage) |
| `low_publication_diversity` | Multiple cited domains but ≤2 unique publications |
| `knowledge_record_present` | Entity already has editorial investment |

Entities are ranked by total priority score, with slug as tiebreaker for deterministic ordering.

### Top-priority categories (baseline)

| Category | Count |
| --- | ---: |
| Zero-citation entities | 2,547 |
| Single-publication entities | 148 |
| Top 100 ranked for expansion | 100 |

The highest-priority entities are predominantly those **without Knowledge Records** — editorial expansion and citation assignment must proceed together for those names.

## Diversity guidance for Phase 13B

Phase 13A diversity analysis reveals publication concentration:

- Top publication (**Oxford Dictionary of First Names**): 4,757 references
- Top three publications: **~79%** of all assignments
- Publisher concentration: Oxford University Press dominates

Phase 13B should:

1. Prioritize entities from `top100HighestPriority` in rank order.
2. Prefer **new or underutilized registry publications** where editorial sources support them.
3. Avoid adding more Oxford FN references where alternative authoritative sources exist.
4. Target **single-publication entities** (148) for diversity improvement before bulk expansion.

## Phase 13B consumption workflow

```
Phase 13A (measure)
        ↓
audit/citation-coverage.json      ← validate integrity PASS
audit/citation-gap-analysis.json  ← select expansion targets
        ↓
Phase 13B (expand Citation Records only)
        ↓
validate + equivalence + audit
        ↓
freeze
```

### Expansion rules for 13B

1. **Do not modify** Knowledge Records, Citation Registry architecture, KCI weights, or presentation.
2. Work from the ranked list — never ad-hoc entity selection.
3. Re-run Phase 13A audits after 13B to measure improvement.
4. Confirm byte-identical preservation of unchanged frozen layers via equivalence audit.

## Growth Era pattern

Every expansion phase follows:

```
Audit → Prioritize → Expand → Validate → Freeze
```

Phase 13A establishes the **Audit** and **Prioritize** steps for citations. Phases 14A/15A will mirror this structure for popularity and editorial coverage.

## Freeze guarantees

Phase 13A success requires:

- Citation Records byte-identical
- Citation Registry byte-identical
- Knowledge Records unchanged
- KCI unchanged
- Presentation and Trust unchanged
- Coverage and gap reports generated
- Validation PASS
- Deterministic PASS
- Repository equivalence PASS

## Running the audit

```bash
node scripts/build/run-citation-coverage-audit.js
```

Expected output:

- Citation coverage: **31.11%** (entity universe)
- Integrity: **PASS**
- Repository unchanged: **PASS**

## Related documentation

- [CITATION_COVERAGE.md](./CITATION_COVERAGE.md) — metric definitions and current baseline
- [CITATION_RECORDS_V1.md](./CITATION_RECORDS_V1.md) — Citation Record architecture
- [ARCHITECTURE_VERSION_HISTORY.md](./ARCHITECTURE_VERSION_HISTORY.md) — frozen milestone context
