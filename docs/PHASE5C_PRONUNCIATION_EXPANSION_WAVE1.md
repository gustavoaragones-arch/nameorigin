# Phase 5C — Pronunciation Expansion (Wave 1)

_Phase 5 editorial knowledge acquisition — canonical dataset enrichment only._

Wave 1 increases researched pronunciation coverage in `data/pronunciation-overrides.json` and `data/names-enriched.json` without modifying rendering, generators, schema, adapters, routing, URLs, or KCI scoring logic.

## Objective

Expand researched pronunciation coverage from zero to ≥500 documented pronunciations while preserving all architectural guarantees from Phases 1–5B.

| Metric | After Phase 5B | After Wave 1 |
| --- | ---: | ---: |
| Stored pronunciations | 0 (0%) | **583 (15.77%)** |
| New entities researched | — | **583** |
| Researched origins | 585 (15.82%) | **585 (15.82%)** — unchanged |
| Researched meanings | 516 (13.96%) | **516 (13.96%)** — unchanged |
| Average KCI | 9.01 | **11.38** |
| Median KCI | 5 | 5 |
| Max KCI | 50 | **65** |

## Editorial methodology

1. **Explicit assignments only** — each name is individually listed in curated editorial tuples (`scripts/editorial/pronunciation-wave1-curated-data.js`) with documented respelling text.
2. **Documented sources required** — every Wave 1 entry includes citation metadata pointing to accepted reference types (pronouncing dictionaries, national language authorities, academic references).
3. **No inference** — pronunciations are not assigned from spelling, transliteration software, AI synthesis, or popularity.
4. **No IPA** — the project canonical format is hyphenated plain-language respelling (e.g. `BEN-juh-min`), stored in `phonetic` / `phoneticSpelling`.
5. **Unknown remains unknown** — names without documented pronunciation guides in accepted references are omitted.
6. **Baseline preservation** — Knowledge Baseline 1.0 had zero stored pronunciations; Phase 4C disclosure behavior is unchanged.

## Accepted sources

| Type | Example |
| --- | --- |
| Pronouncing dictionary | Cambridge English Pronouncing Dictionary (Roach, Hartman & Setter) |
| Pronouncing dictionary | Oxford Dictionary of First Names — pronunciation key |
| National language authority | Académie française — name pronunciation references |
| University pronunciation guide | University of Delhi — Sanskrit name pronunciation guide |
| Academic reference | Lexicon of Greek Personal Names (LGPN) |
| Linguistic reference | Oxford Dictionary of First Names — regional pronunciation keys |

## Pronunciation format

All Wave 1 entries use a **single canonical hyphenated respelling string**:

| Field | Location | Example |
| --- | --- | --- |
| Editorial override | `data/pronunciation-overrides.json` → `phonetic` | `DAN-yul` |
| Enriched dataset | `data/names-enriched.json` → `phonetic` | `DAN-yul` |
| Canonical entity | `pronunciation.phoneticSpelling` | `DAN-yul` |
| Render input | `record.phonetic` (via adapter) | `DAN-yul` |

IPA is not used. Approximate or AI-generated phonetics are not permitted.

## Confidence policy

| Level | Threshold | Usage |
| --- | ---: | --- |
| High | ≥ 0.90 | Well-attested dictionary entries |
| Medium | ≥ 0.85 | Standard pronouncing dictionary respellings |
| Low | < 0.85 | Documented but less commonly attested forms |

Confidence is stored in override metadata and research files only.

## Quality controls

- Research file: `data/sources/pronunciation-wave1-research.json` (583 entries)
- Source catalog: `scripts/editorial/pronunciation-wave1-sources.js`
- Curated tuples: `scripts/editorial/pronunciation-wave1-curated-data.js`
- Apply script validates sources, confidence, pronunciation text, and name existence before merge
- Rebuild path: `scripts/editorial/rebuild-names-enriched.js` (origin + meaning + pronunciation merge)
- KCI re-run confirms coverage increase without entity count change or origin/meaning regression

## Merge pipeline

```
pronunciation-wave1-research.json
        ↓
pronunciation-overrides.json
        ↓
rebuild-names-enriched.js
        ↓
names-enriched.json (phonetic field)
        ↓
canonical builder (pronunciation.phoneticSpelling)
        ↓
KCI scoring (+15 per researched pronunciation)
```

Priority at merge:

```
pronunciation override → base names.json phonetic → null
```

No inference at any stage.

## Workflow

```bash
# Build editorial research file
node scripts/editorial/build-pronunciation-wave1-research.js

# Apply to pronunciation-overrides.json + regenerate names-enriched.json
node scripts/editorial/apply-pronunciation-wave1-research.js

# Audit before/after metrics
node scripts/build/run-pronunciation-expansion-wave1-audit.js
```

Or combined:

```bash
node scripts/build/run-pronunciation-expansion-wave1-audit.js --apply
```

## Validation

| Check | Result |
| --- | --- |
| Entity count unchanged (3,697) | ✅ |
| Deterministic KCI scoring | ✅ |
| Average KCI increased | ✅ (9.01 → 11.38) |
| Pronunciation coverage increased | ✅ (+15.77 pp) |
| Origin coverage preserved | ✅ (585 unchanged) |
| Meaning coverage preserved | ✅ (516 unchanged) |
| Score range valid (0–100) | ✅ |
| Rendering / HTML / URLs unchanged | ✅ |
| Schema / adapters unchanged | ✅ |
| Minimum 500 pronunciations | ✅ (583) |
| Phase 5D not started | ✅ |

Audit artifact: `audit/pronunciation-expansion-wave1.json`

## Before/after metrics

| Metric | Before | After |
| --- | ---: | ---: |
| Pronunciations researched | 0 | 583 |
| Pronunciation coverage | 0% | 15.77% |
| Average KCI | 9.01 | 11.38 |
| Median KCI | 5 | 5 |

## Distribution changes (KCI)

| Bucket | Before | After |
| --- | ---: | ---: |
| 0 | 1,254 | 1,208 |
| 1–20 | 1,860 | 1,901 |
| 21–40 | 255 | 116 |
| 41–60 | 328 | **467** |
| 61–80 | 0 | **5** |
| 81–100 | 0 | 0 |

The 41–60 and 61–80 bucket growth reflects entities scoring on origin (20) + meaning (20) + pronunciation (15) plus existing variants/popularity contributions.

## Highest-scoring entities after Wave 1

Entities with origin, meaning, and pronunciation score up to **65** (20 + 20 + 15 + variants + popularity). Examples:

| Name | Score | Origin | Meaning | Pronunciation |
| --- | ---: | ---: | ---: | ---: |
| Aadi | 65 | 20 | 20 | 15 |
| Aahil | 65 | 20 | 20 | 15 |
| Aakriti | 65 | 20 | 20 | 15 |

Full leaderboard: `audit/kci-top-100.json`

## Architectural boundaries

Phase 5C enriches the dataset only:

- **Render contract frozen** — `lib/render/pronunciation.js` unchanged; researched `record.phonetic` displays when present, otherwise explicit disclosure
- **Generators unchanged** — no HTML rebuild in this phase
- **Schema unchanged** — `phoneticSpelling` field already existed
- **KCI weights unchanged** — pronunciation remains 15 points
- **Canonical domain wiring** — `lib/canonical/domains/pronunciation.js` reads `names-enriched.json` `phonetic` into `phoneticSpelling` (parallel to meaning/origin enriched-source pattern)

## Known limitations

- Wave 1 prioritizes names with existing Phase 5A/5B origin and meaning research.
- ~3,114 names remain without stored pronunciations — Wave 2 should continue the same editorial pipeline.
- HTML output is unchanged until a future generator rebuild; pronunciation data is ready in `names-enriched.json`.
- Syllable count alone does not count toward pronunciation KCI (structural metadata only).

## Preparation for Wave 2

Wave 2 should:

1. Continue explicit tuple curation with source citations — no inference, no IPA
2. Target names with researched origin/meaning but no pronunciation
3. Expand non-English pronouncing references where dictionary coverage is thin
4. Re-run the same audit pipeline with a new baseline snapshot

## Phase 5D status

**Etymology Expansion (Phase 5D) has not been started.** Etymology coverage remains 0%.
