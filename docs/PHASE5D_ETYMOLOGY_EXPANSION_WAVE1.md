# Phase 5D — Etymology Expansion (Wave 1)

_Phase 5 editorial knowledge acquisition — canonical dataset enrichment only._

Wave 1 increases researched etymology coverage in `data/etymology-overrides.json` and `data/names-enriched.json` without modifying rendering, generators, schema, adapters, routing, URLs, or KCI scoring logic.

## Objective

Expand researched etymology coverage from zero to ≥500 documented etymologies while preserving all architectural guarantees from Phases 1–5C.

| Metric | After Phase 5C | After Wave 1 |
| --- | ---: | ---: |
| Researched etymologies | 0 (0%) | **571 (15.44%)** |
| New entities researched | — | **571** |
| Researched origins | 585 (15.82%) | **585 (15.82%)** — unchanged |
| Researched meanings | 516 (13.96%) | **516 (13.96%)** — unchanged |
| Stored pronunciations | 583 (15.77%) | **583 (15.77%)** — unchanged |
| Average KCI | 11.38 | **13.69** |
| Median KCI | 5 | 5 |
| Max KCI | 65 | **80** |

## Editorial methodology

1. **Explicit assignments only** — each name is individually listed in curated editorial tuples (`scripts/editorial/etymology-wave1-curated-data.js`) with documented etymology prose.
2. **Documented sources required** — every Wave 1 entry includes citation metadata pointing to accepted reference types (etymological dictionaries, historical name dictionaries, academic references).
3. **No inference** — etymologies are not assigned from spelling, apparent roots, translation software, AI reasoning, neighboring names, or morphology guessing.
4. **Plain editorial text** — full etymology prose stored as a single string; no markdown, HTML, or embedded citations in the dataset field.
5. **Unknown remains unknown** — names without documented etymology in accepted references are omitted.
6. **Prior domains preserved** — origin, meaning, and pronunciation coverage unchanged.

## Accepted sources

| Type | Example |
| --- | --- |
| Etymological dictionary | Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006) |
| Historical name dictionary | Dictionary of Medieval Names from European Sources (DMNES) |
| Academic reference | Lexicon of Greek Personal Names (LGPN) |
| Linguistic reference | Behind the Name — editorial etymology entries |
| National language authority | Académie française — name etymology references |

## Confidence policy

| Level | Threshold | Usage |
| --- | ---: | --- |
| High | ≥ 0.90 | Well-attested biblical, classical, or major European names |
| Medium | ≥ 0.85 | Standard etymological dictionary entries |
| Low | < 0.85 | Documented but less commonly attested glosses |

Confidence is stored in override metadata and research files only.

## Override format

```json
{
  "joseph": {
    "etymology": "From the Hebrew name יוֹסֵף (Yosef), meaning \"he will add.\"",
    "confidence": 0.92
  }
}
```

## Rebuild pipeline

```
etymology-wave1-research.json
        ↓
etymology-overrides.json
        ↓
rebuild-names-enriched.js
        ↓
names-enriched.json (etymology field)
        ↓
canonical builder (etymology.derivationNotes)
        ↓
KCI scoring (+15 per researched etymology)
```

### Merge priority

```
etymology override → base names.json etymology → null
```

No inference at any stage. Rebuild also merges origin, meaning, and pronunciation overrides in deterministic order.

## Workflow

```bash
# Build editorial research file
node scripts/editorial/build-etymology-wave1-research.js

# Apply to etymology-overrides.json + regenerate names-enriched.json
node scripts/editorial/apply-etymology-wave1-research.js

# Audit before/after metrics
node scripts/build/run-etymology-expansion-wave1-audit.js
```

Or combined:

```bash
node scripts/build/run-etymology-expansion-wave1-audit.js --apply
```

## Audit methodology

The audit script:

1. Snapshots pre-5D KCI to `audit/etymology-expansion-wave1-baseline-kci.json`
2. Optionally runs build + apply (`--apply`)
3. Re-runs `run-knowledge-completeness-index.js`
4. Validates entity count, domain preservation, score range, and coverage targets
5. Writes `audit/etymology-expansion-wave1.json`

## Validation checklist

| Check | Result |
| --- | --- |
| Entity count unchanged (3,697) | ✅ |
| Deterministic KCI scoring | ✅ |
| Average KCI increased | ✅ (11.38 → 13.69) |
| Etymology coverage increased | ✅ (+15.44 pp) |
| Origin coverage preserved | ✅ (585 unchanged) |
| Meaning coverage preserved | ✅ (516 unchanged) |
| Pronunciation coverage preserved | ✅ (583 unchanged) |
| Score range valid (0–100) | ✅ |
| Rendering / HTML / URLs unchanged | ✅ |
| Schema / adapters unchanged | ✅ |
| Minimum 500 etymologies | ✅ (571) |
| Phase 5E not started | ✅ |

Audit artifact: `audit/etymology-expansion-wave1.json`

## KCI impact

| Metric | Before | After |
| --- | ---: | ---: |
| Etymologies researched | 0 | 571 |
| Etymology coverage | 0% | 15.44% |
| Average KCI | 11.38 | 13.69 |
| Median KCI | 5 | 5 |

### Distribution changes (KCI)

| Bucket | Before | After |
| --- | ---: | ---: |
| 0 | 1,208 | 1,207 |
| 1–20 | 1,901 | 1,769 |
| 21–40 | 116 | 223 |
| 41–60 | 467 | 90 |
| 61–80 | 5 | **408** |
| 81–100 | 0 | 0 |

The 61–80 bucket growth reflects entities scoring on origin (20) + meaning (20) + pronunciation (15) + etymology (15) plus existing variants/popularity contributions.

### Highest-scoring entities after Wave 1

Entities with origin, meaning, pronunciation, and etymology score up to **80** (20 + 20 + 15 + 15 + variants + popularity). Examples:

| Name | Score | Origin | Meaning | Pronunciation | Etymology |
| --- | ---: | ---: | ---: | ---: | ---: |
| Aadi | 80 | 20 | 20 | 15 | 15 |
| Aahil | 80 | 20 | 20 | 15 | 15 |
| Aakriti | 80 | 20 | 20 | 15 | 15 |

Full leaderboard: `audit/kci-top-100.json`

## Architectural boundaries

Phase 5D enriches the dataset only:

- **Render contract frozen** — no rendering module changes
- **Generators unchanged** — no HTML rebuild in this phase
- **Schema unchanged** — `derivationNotes` field already existed on the etymology domain
- **KCI weights unchanged** — etymology remains 15 points
- **Canonical domain wiring** — `lib/canonical/domains/etymology.js` reads `names-enriched.json` `etymology` into `derivationNotes`

## Known limitations

- Wave 1 stores full etymology prose in `derivationNotes` only; `rootWord` and `rootLanguage` remain null until a future structured etymology pass.
- Wave 1 prioritizes names with existing Phase 5A–5C origin, meaning, and pronunciation research.
- ~3,126 names remain without researched etymologies — Wave 2 should continue the same editorial pipeline.
- Multiple per-domain override files (`origin-overrides.json`, `meaning-overrides.json`, etc.) increase merge complexity; a unified Knowledge Record v2 is planned after Phase 5E.

## Preparation for Phase 5E

Phase 5E (History Expansion) should:

1. Continue explicit tuple curation with source citations — no inference
2. Target names with researched origin/meaning/pronunciation/etymology but no history
3. Re-run the same audit pipeline with a new baseline snapshot
4. Extend `rebuild-names-enriched.js` with the same merge precedence pattern

## Phase 5E status

**History Expansion (Phase 5E) has not been started.** History coverage remains 0%.
