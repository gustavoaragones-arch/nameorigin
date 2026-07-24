# Knowledge Completeness Index (KCI)

_Phase 5.0 — internal quality metric. Not user-facing._

The Knowledge Completeness Index measures how complete each canonical entity's **verified knowledge** is. It is the operational dashboard for Phase 5 knowledge acquisition, measured against the frozen [Knowledge Baseline 1.0](KNOWLEDGE_BASELINE_1.0.md).

## Philosophy

KCI scores **verified knowledge completeness**, not:

- SEO performance
- page popularity
- rendering quality
- disclosed-unknown presentation (disclosure is truthful but scores zero)

Missing knowledge is acceptable. Fabricated or fallback-marker content scores **zero** for the affected field.

KCI is:

- **Internal** — not rendered to users
- **Deterministic** — identical canonical inputs always produce identical scores
- **Canonical-only** — derived from assembled Name Entities, not HTML or adapters
- **Non-destructive** — no dataset, schema, rendering, or URL changes

## Scoring model

**KCI version:** `1.0` (frozen at Knowledge Baseline 1.0). Weights below are immutable for longitudinal comparison. Any future weight revision must ship as **KCI v2** while retaining v1 audit artifacts.

Maximum score: **100**

| Field | Weight | Researched when | Missing / disclosed |
| --- | ---: | --- | --- |
| Origin | 20 | `origin.country` or `origin.cluster` populated | 0 |
| Meaning | 20 | `meaning.primary` populated and not a fallback marker | 0 |
| Pronunciation | 15 | `pronunciation.ipa` or `pronunciation.phoneticSpelling` stored | 0 |
| Etymology | 15 | any etymology root / language / notes field populated | 0 |
| History | 10 | first recorded use, usage notes, or notable bearers populated | 0 |
| Citations | 10 | `citations.sources[]` with documented references | 0 |
| Variants | 5 | `variants.spellingVariants[]` non-empty | 0 |
| Popularity | 5 | `popularity.records[]` non-empty | 0 |

Fields not yet present in the canonical model contribute zero until real data exists. **No values are invented.**

### Deterministic guarantees

- One score per canonical entity (3,697 names)
- Scores always in range **0–100**
- Fallback markers in meaning (or pronunciation text) score **zero** for that field
- Syllable count alone does **not** count toward pronunciation (structural metadata, not stored pronunciation)
- Re-running the audit on unchanged data produces byte-identical breakdowns

## Implementation

| Component | Path |
| --- | --- |
| Scoring module | `lib/analysis/knowledge-completeness.js` |
| Audit runner | `scripts/build/run-knowledge-completeness-index.js` |

```bash
node scripts/build/run-knowledge-completeness-index.js
```

## Audit outputs

| File | Purpose |
| --- | --- |
| `audit/knowledge-completeness.json` | Full entity scores, summary, distribution, weights |
| `audit/kci-top-100.json` | Highest-scoring entities (tie-break: slug A→Z) |
| `audit/kci-bottom-100.json` | Lowest-scoring entities (tie-break: slug A→Z) |
| `audit/domain-coverage.json` | Per-domain coverage counts and percentages |

### Distribution buckets

- `0`
- `1–20`
- `21–40`
- `41–60`
- `61–80`
- `81–100`

## Intended editorial usage

1. **Prioritize work** — start with lowest KCI entities in domains targeted by the active Phase 5 sub-phase (e.g. 5A origin expansion).
2. **Track progress** — re-run KCI after editorial batches; compare against Baseline 1.0 snapshots.
3. **Internal QA** — monitor average/median KCI and domain coverage over time.
4. **Optional future exposure** — completeness could become an internal confidence indicator; it is **not** exposed to users or search ranking today.

## What KCI does not do

- Does not change HTML, generators, templates, or routing
- Does not modify canonical schema, builder, adapters, or datasets
- Does not affect SEO or public page ranking
- Does not replace truthfulness audits (Baseline 1.0 rendering policy remains separate)

## Roadmap context

KCI is the first Phase 5 activity. Next: **Phase 5A — Origin Expansion** (canonical dataset enrichment only).
