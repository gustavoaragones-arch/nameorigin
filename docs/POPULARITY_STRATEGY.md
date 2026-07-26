# Popularity Strategy

_Phase 14A — prioritization framework for Phase 14B expansion._

Phase 14A separates **operational measurement** from **strategic planning** for popularity data, mirroring the Citation Coverage Intelligence pattern established in Phase 13A.

## Two-report model

| Report | Question | Output |
| --- | --- | --- |
| `popularity-coverage.json` | What is the current state? | Coverage %, country/gender breakdown, registry utilization, integrity |
| `popularity-gap-analysis.json` | Where should we invest next? | Priority rankings, popularity deserts, regional gaps |

## Priority score methodology

Priority scores are computed **at audit time only**. They are **not** persisted to KCI or Popularity Records.

### Factors (deterministic weights)

| Factor | Signal |
| --- | --- |
| `no_popularity_record` | Entity has no Popularity Record |
| `unresolved_legacy_authority` | Legacy row maps to country without registry resolution (e.g. India) |
| `legacy_data_without_attribution` | Legacy rows exist but zero canonical sources assigned |
| `researched_without_popularity_points` | Knowledge Record present but KCI popularity = 0 |
| `knowledge_record_present` | Entity already has editorial investment |
| `single_source_only` | Only one canonical source attributed |
| `low_kci` | KCI score below 40 |
| `origin_country_without_popularity` | Origin country lacks legacy popularity data |

### Top-priority baseline

| Category | Count |
| --- | ---: |
| Zero-source entities | 3,693 |
| Single-source entities | 4 |
| Unresolved legacy authority | 1 (Aakriti / India) |
| Top 100 ranked for expansion | 100 |

**Highest immediate priority:** Aakriti — researched entity with India legacy data but unresolved authority mapping (no KCI popularity points).

## Phase 14A strategic findings

1. **Infrastructure is ready.** Nine canonical sources are registered; attribution mechanics work for USA data.
2. **Data population is the bottleneck.** Only 7 legacy rows exist across 5 entities — not a mechanics problem.
3. **Authority resolution gap.** India requires a registry mapping before legacy data can contribute KCI points.
4. **Regional desert.** UK, CAN, and AUS registry sources exist but have zero entity data.
5. **Diversity is premature.** With one source in use, Phase 14B should prioritize **data ingestion and authority resolution** before regional diversity optimization.

## Phase 14B consumption workflow

```
Phase 14A (measure)
        ↓
audit/popularity-coverage.json      ← validate integrity PASS
audit/popularity-gap-analysis.json  ← select expansion targets
        ↓
Phase 14B (expand Popularity Records / resolve authorities)
        ↓
validate + equivalence + audit
        ↓
freeze
```

### Expansion rules for 14B

1. **Do not modify** Popularity Registry architecture, KCI weights, Knowledge Records, or Citation Records.
2. Work from the ranked list — prioritize unresolved authorities and researched entities first.
3. Ingest legacy popularity data for supported countries (USA, UK, CAN, AUS) before optimizing diversity.
4. Re-run Phase 14A audits after 14B to measure improvement.

## Relationship to editorial expansion (15A → 15B)

Popularity expansion and editorial expansion are **sequential, not parallel**:

```
Knowledge Record (15B)
        ↓
Citation Record
        ↓
Popularity attribution (14B)
        ↓
Validation → Freeze
```

Phase 14B improves popularity for entities that **already have** editorial and citation coverage. Phase 15B creates new Knowledge Records for the 2,547 unresearched entities — after which popularity attribution can follow the pipeline above.

## Growth Era pattern

```
Audit → Prioritize → Expand → Validate → Freeze
```

Phase 14A completes **Audit** and **Prioritize** for popularity.

## Freeze guarantees

Phase 14A success requires:

- Popularity Records byte-identical
- Popularity Registry byte-identical
- Knowledge and Citation Records unchanged
- KCI unchanged
- Coverage and gap reports generated
- Validation PASS
- Deterministic PASS
- Repository equivalence PASS

## Running the audit

```bash
node scripts/build/run-popularity-coverage-audit.js
```

Expected output:

- Popularity record coverage: **0.14%**
- KCI popularity coverage: **0.11%**
- Integrity: **PASS**
- Repository unchanged: **PASS**

## Related documentation

- [POPULARITY_COVERAGE.md](./POPULARITY_COVERAGE.md) — metric definitions and current baseline
- [CITATION_COVERAGE.md](./CITATION_COVERAGE.md) — parallel citation intelligence phase
- [ARCHITECTURE_VERSION_HISTORY.md](./ARCHITECTURE_VERSION_HISTORY.md) — lifecycle and roadmap context
