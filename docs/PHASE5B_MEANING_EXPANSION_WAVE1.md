# Phase 5B — Meaning Expansion (Wave 1)

_Phase 5 editorial knowledge acquisition — canonical dataset enrichment only._

Wave 1 increases researched meaning coverage in `data/meaning-overrides.json` and `data/names-enriched.json` without modifying rendering, generators, schema, adapters, routing, URLs, or KCI scoring logic.

## Objective

Expand researched meaning coverage beyond Knowledge Baseline 1.0 while preserving all architectural guarantees from Phases 1–5A.

| Metric | After Phase 5A | After Wave 1 |
| --- | ---: | ---: |
| Researched meanings | 3 (0.08%) | **516 (13.96%)** |
| New entities researched | — | **513** |
| Researched origins | 585 (15.82%) | **585 (15.82%)** — unchanged |
| Average KCI | 6.23 | **9.01** |
| Median KCI | 5 | 5 |
| Max KCI | 30 | **50** |

## Editorial methodology

1. **Explicit assignments only** — each name is individually listed in curated editorial tuples (`scripts/editorial/meaning-wave1-curated-data.js`) with documented gloss text.
2. **Documented sources required** — every Wave 1 entry includes citation metadata pointing to accepted reference types (onomastic dictionaries, academic references, biblical onomastics).
3. **No inference** — meanings are not assigned from spelling, apparent roots, translation software, modern internet summaries, AI reasoning, neighboring names, or popularity.
4. **Unknown remains unknown** — names without documented meaning glosses in accepted references are omitted.
5. **Baseline preservation** — all 3 Knowledge Baseline 1.0 meaning entries (Emma, Noah, Olivia) are preserved unchanged from `data/names.json`.

## Accepted sources

| Type | Example |
| --- | --- |
| Onomastic dictionary | Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006) |
| Academic reference | Lexicon of Greek Personal Names (LGPN) |
| Biblical onomastics | Anchor Yale Bible Dictionary — Personal Names |
| National naming authority | Irish Genealogical Research Society — Gaelic name forms |
| Historical name dictionary | Dictionary of Medieval Names from European Sources (DMNES) |

## Research standards

A meaning is added only when:

- The name exists in `data/names.json`
- A primary meaning gloss is documented in accepted references
- A confidence score (0–1) and confidence level (`high` / `medium` / `low`) is assigned
- At least one supporting citation object is recorded in the research file
- The name is **not** already in the Baseline 1.0 meaning set (Emma, Noah, Olivia)

## Confidence policy

| Level | Threshold | Usage |
| --- | ---: | --- |
| High | ≥ 0.90 | Well-attested biblical, classical, or major European names |
| Medium | ≥ 0.85 | Standard onomastic dictionary entries |
| Low | < 0.85 | Documented but less commonly attested glosses |

Confidence is stored in override metadata and research files only. The canonical `meaning` domain currently exposes `primary` text only — no schema changes were made.

## Quality controls

- Research file: `data/sources/meaning-wave1-research.json` (513 entries)
- Source catalog: `scripts/editorial/meaning-wave1-sources.js`
- Curated tuples: `scripts/editorial/meaning-wave1-curated-data.js`
- Apply script validates sources, confidence, meaning text, and name existence before merge
- Rebuild path: `scripts/editorial/rebuild-names-enriched.js` (origin + meaning merge)
- KCI re-run confirms coverage increase without entity count change or origin regression

## Workflow

```bash
# Build editorial research file
node scripts/editorial/build-meaning-wave1-research.js

# Apply to meaning-overrides.json + regenerate names-enriched.json
node scripts/editorial/apply-meaning-wave1-research.js

# Audit before/after metrics
node scripts/build/run-meaning-expansion-wave1-audit.js
```

Or combined:

```bash
node scripts/build/run-meaning-expansion-wave1-audit.js --apply
```

## Validation

| Check | Result |
| --- | --- |
| Entity count unchanged (3,697) | ✅ |
| Deterministic KCI scoring | ✅ |
| Average KCI increased | ✅ (6.23 → 9.01) |
| Meaning coverage increased | ✅ (+13.88 pp) |
| Origin coverage preserved | ✅ (585 unchanged) |
| No reduction in existing researched fields | ✅ |
| Score range valid (0–100) | ✅ |
| Rendering / HTML / URLs unchanged | ✅ |
| Schema / builder / adapters unchanged | ✅ |
| Minimum 500 meanings | ✅ (516) |
| Phase 5C not started | ✅ |

Audit artifact: `audit/meaning-expansion-wave1.json`

## Before/after metrics

| Metric | Before | After |
| --- | ---: | ---: |
| Meanings researched | 3 | 516 |
| Meaning coverage | 0.08% | 13.96% |
| Average KCI | 6.23 | 9.01 |
| Median KCI | 5 | 5 |

## Distribution changes (KCI)

| Bucket | Before | After |
| --- | ---: | ---: |
| 0 | 1,260 | 1,254 |
| 1–20 | 2,034 | 1,860 |
| 21–40 | 402 | 255 |
| 41–60 | 1 | **328** |
| 61–80 | 0 | 0 |
| 81–100 | 0 | 0 |

The 41–60 bucket growth reflects entities that now score on both origin (20) and meaning (20) plus existing variants/popularity contributions.

## Highest-scoring entities after Wave 1

Entities with both researched origin and meaning score **50** (origin 20 + meaning 20 + variants 5 + popularity 5 where applicable). Examples:

| Name | Score | Origin | Meaning |
| --- | ---: | ---: | ---: |
| Aadi | 50 | 20 | 20 |
| Aahil | 50 | 20 | 20 |
| Benjamin | 50 | 20 | 20 |
| Daniel | 50 | 20 | 20 |
| Elizabeth | 50 | 20 | 20 |

Full leaderboard: `audit/kci-top-100.json`

## Known limitations

- Only `meaning.primary` is populated; alternates and meaning-specific confidence are not yet exposed in the canonical schema.
- Wave 1 prioritizes names with existing Phase 5A origin research plus curated high-frequency Western and South Asian names.
- ~3,181 names remain without researched meanings — Wave 2 should continue the same editorial pipeline.
- `scripts/apply-origin-enrichment.js` remains origin-only; future origin applies should use `rebuild-names-enriched.js` to preserve meaning overrides.

## Preparation for Wave 2

Wave 2 should:

1. Continue explicit tuple curation with source citations — no inference
2. Target names with researched origins but no meaning (overlap opportunity)
3. Expand non-English onomastic references where ODFN coverage is thin
4. Re-run the same audit pipeline with a new baseline snapshot

## Phase 5C status

**Pronunciation Expansion (Phase 5C) has not been started.** Stored pronunciation coverage remains 0%.

## Architectural note

Phase 5B increases canonical knowledge without changing platform behavior. The canonical builder, adapters, render layer, generators, templates, schema, and KCI weights are unchanged. Only `data/meaning-overrides.json`, `data/names-enriched.json`, editorial scripts, audit artifacts, and documentation were touched.
