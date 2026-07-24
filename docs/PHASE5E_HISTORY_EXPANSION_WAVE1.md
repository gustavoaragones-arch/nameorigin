# Phase 5E — History Expansion (Wave 1)

_Phase 5 editorial knowledge acquisition — canonical dataset enrichment only._

Wave 1 increases researched history coverage in `data/history-overrides.json` and `data/names-enriched.json` without modifying rendering, generators, schema, adapters, routing, URLs, or KCI scoring logic.

This phase completes **Knowledge Baseline v2 editorial expansion** — the fifth and final major editorial knowledge domain wave (Origin, Meaning, Pronunciation, Etymology, History).

## Objective

Expand researched history coverage from zero to ≥500 documented historical summaries while preserving all architectural guarantees from Phases 1–5D.

| Metric | After Phase 5D | After Wave 1 |
| --- | ---: | ---: |
| Researched histories | 0 (0%) | **571 (15.44%)** |
| New entities researched | — | **571** |
| Researched origins | 585 (15.82%) | **585 (15.82%)** — unchanged |
| Researched meanings | 516 (13.96%) | **516 (13.96%)** — unchanged |
| Stored pronunciations | 583 (15.77%) | **583 (15.77%)** — unchanged |
| Researched etymologies | 571 (15.44%) | **571 (15.44%)** — unchanged |
| Average KCI | 13.69 | **15.24** |
| Median KCI | 5 | 5 |
| Max KCI | 80 | **90** |

## Editorial methodology

1. **Explicit assignments only** — each name is individually listed in curated editorial tuples (`scripts/editorial/history-wave1-curated-data.js`) with documented historical usage prose.
2. **Documented sources required** — every Wave 1 entry includes citation metadata pointing to accepted reference types (historical name dictionaries, academic onomastic references, documented historical records).
3. **No inference** — history is not assigned from origin, meaning, etymology, pronunciation, spelling, AI reasoning, popularity data, or neighboring names.
4. **Plain editorial text** — full historical summary stored as a single string; no markdown, HTML, or embedded citations in the dataset field.
5. **Unknown remains unknown** — names without documented historical usage in accepted references are omitted.
6. **Prior domains preserved** — origin, meaning, pronunciation, and etymology coverage unchanged.

## Accepted sources

| Type | Example |
| --- | --- |
| Historical name dictionary | Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006) |
| Academic onomastic reference | Lexicon of Greek Personal Names (LGPN) |
| University publication | University of Delhi — Sanskrit personal name usage references |
| Historical linguistic reference | Dictionary of Medieval Names from European Sources (DMNES) |
| National language authority | Académie française — historical name usage references |
| Historical encyclopedia | Oxford Dictionary of National Biography — name bearer entries |
| Documented historical record | Anchor Yale Bible Dictionary — Personal Names |

## Rejected sources

| Type | Reason |
| --- | --- |
| AI summaries | Not independently verifiable |
| Blogs / SEO articles | Not authoritative |
| User-generated content | No editorial verification |
| Popularity websites | Measures trends, not documented history |
| Speculation / undocumented claims | Violates editorial policy |

## Confidence policy

| Level | Threshold | Usage |
| --- | ---: | --- |
| High | ≥ 0.90 | Well-attested biblical, classical, or major European names with specific historical bearers |
| Medium | ≥ 0.85 | Standard historical name dictionary entries |
| Low | < 0.85 | Documented but less commonly attested historical glosses |

Confidence is stored in override metadata and research files only.

## Override format

```json
{
  "emma": {
    "history": "Used in medieval England; borne by Emma of Normandy (c. 985–1052), queen consort of England, Denmark, and Norway.",
    "confidence": 0.92
  }
}
```

## Rebuild pipeline

```
history-wave1-research.json
        ↓
history-overrides.json
        ↓
rebuild-names-enriched.js
        ↓
names-enriched.json (history field)
        ↓
canonical builder (history.historicalUsageNotes)
        ↓
KCI scoring (+10 per researched history)
```

### Merge priority

```
history override → base names.json history → null
```

No inference at any stage. Rebuild also merges origin, meaning, pronunciation, and etymology overrides in deterministic order.

## Workflow

```bash
# Build editorial research file
node scripts/editorial/build-history-wave1-research.js

# Apply to history-overrides.json + regenerate names-enriched.json
node scripts/editorial/apply-history-wave1-research.js

# Audit before/after metrics
node scripts/build/run-history-expansion-wave1-audit.js
```

Or combined:

```bash
node scripts/build/run-history-expansion-wave1-audit.js --apply
```

## Audit methodology

The audit script:

1. Snapshots pre-5E KCI to `audit/history-expansion-wave1-baseline-kci.json`
2. Optionally runs build + apply (`--apply`)
3. Re-runs `run-knowledge-completeness-index.js`
4. Validates entity count, domain preservation, score range, and coverage targets
5. Writes `audit/history-expansion-wave1.json`

## Validation checklist

| Check | Result |
| --- | --- |
| Entity count unchanged (3,697) | ✅ |
| Deterministic KCI scoring | ✅ |
| Deterministic rebuild | ✅ |
| Average KCI increased | ✅ (13.69 → 15.24) |
| History coverage increased | ✅ (+15.44 pp) |
| Origin coverage preserved | ✅ (585 unchanged) |
| Meaning coverage preserved | ✅ (516 unchanged) |
| Pronunciation coverage preserved | ✅ (583 unchanged) |
| Etymology coverage preserved | ✅ (571 unchanged) |
| Score range valid (0–100) | ✅ |
| Rendering / HTML / URLs unchanged | ✅ |
| Schema / adapters unchanged | ✅ |
| Minimum 500 histories | ✅ (571) |
| Post-expansion consolidation not started | ✅ |

Audit artifact: `audit/history-expansion-wave1.json`

## KCI impact

| Metric | Before | After |
| --- | ---: | ---: |
| Histories researched | 0 | 571 |
| History coverage | 0% | 15.44% |
| Average KCI | 13.69 | 15.24 |
| Median KCI | 5 | 5 |
| Max KCI | 80 | 90 |

### Distribution changes (KCI)

| Bucket | Before | After |
| --- | ---: | ---: |
| 0 | 1,207 | 1,207 |
| 1–20 | 1,769 | 1,766 |
| 21–40 | 223 | 137 |
| 41–60 | 90 | 158 |
| 61–80 | 408 | 162 |
| 81–100 | 0 | **267** |

The 81–100 bucket growth reflects entities scoring on origin (20) + meaning (20) + pronunciation (15) + etymology (15) + history (10) plus existing variants/popularity contributions.

### Highest-scoring entities after Wave 1

Entities with all five editorial domains score up to **90** (20 + 20 + 15 + 15 + 10 + variants + popularity). Examples:

| Name | Score | Origin | Meaning | Pronunciation | Etymology | History |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Aadi | 90 | 20 | 20 | 15 | 15 | 10 |
| Aahil | 90 | 20 | 20 | 15 | 15 | 10 |
| Aakriti | 90 | 20 | 20 | 15 | 15 | 10 |

Full leaderboard: `audit/kci-top-100.json`

## Architectural boundaries

Phase 5E enriches the dataset only:

- **Render contract frozen** — no rendering module changes
- **Generators unchanged** — no HTML rebuild in this phase
- **Schema unchanged** — `historicalUsageNotes` field already existed on the history domain
- **KCI weights unchanged** — history remains 10 points
- **Canonical domain wiring** — `lib/canonical/domains/history.js` reads `names-enriched.json` `history` into `historicalUsageNotes`

## Known limitations

- Wave 1 stores full history prose in `historicalUsageNotes` only; `firstRecordedUse` and `notableBearers` remain null until a future structured history pass.
- Wave 1 prioritizes names with existing Phase 5A–5D research (571-name editorial cohort).
- ~3,126 names remain without researched history — Wave 2 should continue the same editorial pipeline.
- Five separate per-domain override files increase merge complexity; unified Knowledge Record v2 consolidation is planned as a post-expansion milestone (not started).

## Knowledge Baseline v2 status

**All five editorial expansion waves are complete:**

| Wave | Domain | Coverage |
| --- | --- | ---: |
| 5A | Origin | 585 (15.82%) |
| 5B | Meaning | 516 (13.96%) |
| 5C | Pronunciation | 583 (15.77%) |
| 5D | Etymology | 571 (15.44%) |
| 5E | History | 571 (15.44%) |

**Post-expansion consolidation (Knowledge Record v2) has not been started.** Citations domain remains at 0%.
