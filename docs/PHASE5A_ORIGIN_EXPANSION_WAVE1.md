# Phase 5A — Origin Expansion (Wave 1)

_Phase 5 editorial knowledge acquisition — canonical dataset enrichment only._

Wave 1 increases researched origin coverage in `data/origin-overrides.json` and `data/names-enriched.json` without modifying rendering, generators, schema, adapters, routing, URLs, or KCI scoring logic.

## Objective

Expand researched origin coverage beyond Knowledge Baseline 1.0 while preserving all architectural guarantees from Phases 1–5.0.

| Metric | Baseline 1.0 | After Wave 1 |
| --- | ---: | ---: |
| Researched origins | 167 (4.52%) | **585 (15.82%)** |
| New entities researched | — | **418** |
| Average KCI | 3.97 | **6.23** |
| Median KCI | 5 | 5 |

## Editorial methodology

1. **Explicit assignments only** — each name is individually listed in curated editorial batches or imported from the Phase 3.3 seed preview with verified cluster metadata.
2. **Documented sources required** — every Wave 1 entry includes citation metadata pointing to accepted reference types (onomastic dictionaries, academic references, biblical onomastics).
3. **No inference** — origins are not assigned from spelling, popularity, neighboring names, or AI reasoning.
4. **Unknown remains unknown** — names without documented etymology are omitted.
5. **Baseline preservation** — all 167 Knowledge Baseline 1.0 origin entries are preserved unchanged.

## Accepted sources

| Type | Example |
| --- | --- |
| Onomastic dictionary | Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006) |
| Academic reference | Lexicon of Greek Personal Names (LGPN) |
| Biblical onomastics | Anchor Yale Bible Dictionary — Personal Names |
| National naming authority | Irish Genealogical Research Society — Gaelic name forms |
| Historical name dictionary | Dictionary of Medieval Names from European Sources (DMNES) |

## Research criteria

An origin is added only when:

- The name exists in `data/names.json`
- Origin country, cluster, or language is documented in accepted references
- A confidence score (0–1) and confidence level (`high` / `medium` / `low`) is assigned
- At least one supporting citation object is recorded in the research file
- The name is **not** already in the Baseline 1.0 override set

## Quality controls

- Research file: `data/sources/origin-wave1-research.json` (418 entries)
- Source catalog: `scripts/editorial/origin-wave1-sources.js`
- Apply script validates sources, confidence, and name existence before merge
- Existing merge path: `scripts/apply-origin-enrichment.js` (unchanged)
- KCI re-run confirms coverage increase without entity count change

## Workflow

```bash
# Build editorial research file
node scripts/editorial/build-origin-wave1-research.js

# Apply to origin-overrides.json + regenerate names-enriched.json
node scripts/editorial/apply-origin-wave1-research.js

# Audit before/after metrics
node scripts/build/run-origin-expansion-wave1-audit.js
```

Or combined:

```bash
node scripts/build/run-origin-expansion-wave1-audit.js --apply
```

## Validation

| Check | Result |
| --- | --- |
| Entity count unchanged (3,697) | ✅ |
| Deterministic KCI scoring | ✅ |
| Average KCI increased | ✅ (3.97 → 6.23) |
| Origin coverage increased | ✅ (+11.30 pp) |
| No reduction in existing researched fields | ✅ (meanings still 3) |
| Score range valid (0–100) | ✅ |
| Rendering / HTML / URLs unchanged | ✅ |
| Schema / builder / adapters unchanged | ✅ |
| Minimum 500 origins | ✅ (585) |
| Phase 5B not started | ✅ |

Audit artifact: `audit/origin-expansion-wave1.json`

## Distribution changes (KCI)

| Bucket | Before | After |
| --- | ---: | ---: |
| 0 | 1,397 | 1,260 |
| 1–20 | 2,177 | 2,034 |
| 21–40 | 123 | 402 |
| 41–60 | 0 | 1 |
| 61–80 | 0 | 0 |
| 81–100 | 0 | 0 |

## Files modified (Wave 1)

| File | Change |
| --- | --- |
| `data/sources/origin-wave1-research.json` | New editorial research (418 entries) |
| `data/origin-overrides.json` | +418 researched origins |
| `data/names-enriched.json` | Regenerated via existing merge |
| `scripts/editorial/*` | Editorial build/apply tooling |
| `scripts/build/run-origin-expansion-wave1-audit.js` | Wave 1 audit |
| `audit/origin-expansion-wave1.json` | Before/after metrics |
| `audit/origin-expansion-wave1-baseline-kci.json` | Pre-wave KCI snapshot |
| `audit/knowledge-completeness.json` | Post-wave KCI (re-run) |

## Files intentionally untouched

- `lib/render/**` — rendering policy frozen at Baseline 1.0
- `lib/analysis/knowledge-completeness.js` — KCI v1.0 weights unchanged
- `lib/canonical/**` — builder and domain modules unchanged
- `lib/adapters/**` — adapter layer unchanged
- `scripts/generate-*.js` — no generator modifications
- `templates/**`, production HTML, routing, URLs
- `schemas/name-entity.schema.json`

## Limitations

- Wave 1 uses cluster-level source citations for efficiency; per-name citation expansion is deferred to Phase 5E (Citations & Provenance).
- Confidence reflects editorial review against dictionary sources, not automated verification against primary texts.
- Coverage remains low relative to entity count (15.82%); additional waves are required.
- Some classic names in the dataset were omitted when etymology is disputed or undocumented — sparse + accurate over full + wrong.

## Next waves

- **Wave 2+** — continue origin expansion toward higher coverage targets
- **Phase 5B** — Meaning Research (not started)
- **Phase 5E** — per-field citation provenance on all researched facts

## Architectural note

Phase 5A increases **knowledge quality in the canonical dataset** without changing **platform behavior**. Pages continue to use the same rendering policy (`lib/render/origin.js`): researched origins display stored values; missing origins disclose explicitly. The only change is that more names now have stored origin data available when generators next rebuild HTML.
