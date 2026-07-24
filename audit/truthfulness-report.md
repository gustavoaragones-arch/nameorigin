# NameOrigin — Truthfulness Intelligence Report

_Generated 2026-07-21T18:25:47.655Z by scripts/audit/truthfulness-report.js (Phase 1C — read-only). Regenerate with `node scripts/audit/run-truthfulness.js`._

## What truthfulness means here

This report classifies every rendered factual-statement mechanism on the site into exactly one of four states:

- **Supported** — the statement comes directly from structured data (e.g. "Gender: Boy" ← `data/names.json`).
- **Computed** — the statement is derived deterministically and always reproducible, with no missing-data state (e.g. a compatibility score, a first-letter grouping, a spelling-variant list).
- **Disclosed-missing** — the page honestly states that a value is unknown, or silently omits the section entirely, rather than asserting something specific.
- **Fallback** — the generator substitutes generic prose that reads as if it were a specific, researched claim about this particular entity.

This is not a quality, SEO, or hallucination-detection audit. It does not evaluate grammar, usefulness, or intent — only whether a given statement is backed, derived, honestly absent, or substituted.

## Supported vs. computed

The following concepts carry the **supported** classification in every template they appear in — each traces to a real, populated dataset field, verified either by a live coverage count (Phase 1B's audit/knowledge-coverage.json) or a direct grep against generated HTML:

- **Category / style tag**
- **Equivalent names (cross-linguistic)**
- **Gender**
- **Surname origin**

Assertions classified **computed** — letter grouping, syllable count, spelling variants, compatibility/harmony scores, the names-like phonetic-similarity pool, and the compare-page cultural-context paragraphs — share one property: they cannot be "missing," because they are produced by a deterministic function rather than looked up. The Phase 1C brief's own examples (compatibility score, similarity score, letter, variants) match this category exactly.

## Disclosed unknowns

- **meaning** (`buildDefinitionBlock() / buildNameFactsTable() / buildQuickFaqForName()`, name-detail-page): 3697 of 3697 pages (100%) render the honest placeholder `"—</p>"` or omit the section outright.
- **popularity** (`buildDirectAnswers()`, name-detail-page): 3692 of 3697 pages (99.86%) render the honest placeholder `"does not yet show a stable rank band"` or omit the section outright.

These mechanisms make no claim when data is absent — either an explicit "—"/omission, or, in one case (the popularity FAQ answer), a sentence that plainly states the name "does not yet show a stable rank band." Per the Phase 1C classification rules, this is considered truthful.

## Fallback substitutions

- **origin_country / language (sibling-harmony page)** (`sibling-explanation-renderer.js :: buildContext()`, sibling-harmony-page): 150 of 150 pages (100%) contain the literal substitute `"various origins"`.
- **country-comparison rank/movement** (`generate-compare-pages.js :: getTrendDeltaSection()`, compare-name-country-pair-page): 20 of 20 pages (100%) contain the literal substitute `"Rank and movement data are available for our covered countries"`.
- **meaning** (`buildMetaDescription() / buildDirectAnswer() / buildDirectAnswers()`, name-detail-page): 3694 of 3697 pages (99.92%) contain the literal substitute `"documented given name"`.
- **origin_country / language / origin_cluster** (`buildNameUsageContextSection() / buildQuickFaqForName()`, name-detail-page): 3534 of 3697 pages (95.59%) contain the literal substitute `"multiple traditions"`.
- **origin_country / language** (`buildOriginLineage()`, name-detail-page): 3534 of 3697 pages (95.59%) contain the literal substitute `"various linguistic traditions"`.
- **origin_country / language** (`buildCulturalContext()`, name-detail-page): 3534 of 3697 pages (95.59%) contain the literal substitute `"various cultural traditions"`.
- **popularity** (`buildPopularityRegionsPhrase()`, name-detail-page): 0 of 3697 pages (0%) contain the literal substitute `"the United States and other regions"`.

One of these — `compare-rank-movement-fallback-data-available` — fires on 100% of its template's pages (20 of 20), because no name in `data/popularity.json` has a year-2015 row, so the 10-year-movement calculation can never succeed for any comparison page; the fallback text nonetheless asserts that "data are available for our covered countries."

## Page-level observations

The site-wide rollup across all 34 cataloged assertion instances: **58.8%** are supported-or-computed (10 supported + 10 computed, out of 34 total). This rollup weights every template's assertions equally regardless of how many live pages that template has — it is not the same as "58.8% of all rendered sentences site-wide," since name-detail-page alone accounts for 3,697 of the site's ~7,832 pages but is only 1 of 11 templates in this rollup.

The **highest-fallback template is name-detail-page**, at 38.5% fallback assertions (5 of 13) and a truthfulness ratio of 38.5%. This is also, by page count, the largest template on the site (name-detail-page and its data-identical sibling names-like-page together account for the large majority of all generated pages per audit/project-inventory.json) — so this template's ratio is the one most representative of a typical page view on the site.

6 templates reach a 100% truthfulness ratio. Of these, 5 (equivalents-page, names-country-page, names-style-page, popularity-year-page, trend-page) have only a single cataloged assertion, so 100% reflects a small denominator as much as a strong result. The more notable case is names-lastname-filter-page, which reaches 100% across 2 assertions — still a small number, but not a single trivial one. In every 100%-ratio template, the underlying dataset is small and fully curated (e.g. 75 surnames, 27 equivalent-name anchors, 5 supported countries), unlike the 3,697-name catalog that name-detail-page and names-like-page draw on.

## Template observations

| Template | Total assertions | Supported | Computed | Disclosed-missing | Fallback | Truthfulness ratio |
| --- | --- | --- | --- | --- | --- | --- |
| compare-name-country-pair-page | 3 | 1 | 1 | 0 | 1 | 66.7% |
| equivalents-page | 1 | 1 | 0 | 0 | 0 | 100% |
| name-detail-page | 13 | 2 | 3 | 3 | 5 | 38.5% |
| names-country-page | 1 | 1 | 0 | 0 | 0 | 100% |
| names-lastname-filter-page | 2 | 1 | 1 | 0 | 0 | 100% |
| names-like-page | 4 | 0 | 2 | 2 | 0 | 50% |
| names-style-page | 1 | 1 | 0 | 0 | 0 | 100% |
| popularity-year-page | 1 | 1 | 0 | 0 | 0 | 100% |
| sibling-harmony-page | 4 | 0 | 2 | 1 | 1 | 50% |
| surname-compatibility-page | 3 | 1 | 1 | 1 | 0 | 66.7% |
| trend-page | 1 | 1 | 0 | 0 | 0 | 100% |

Internal validation (required by the Phase 1C brief): for every template above, supported + computed + fallback + disclosed-missing exactly equals total assertions — confirmed programmatically in audit/truthfulness-matrix.json's `validation` array (all templates pass), with no assertion left uncategorized and no assertion counted twice within a template.

## Assertion (claim-type) observations

audit/assertion-catalog.json groups the same 34 assertion instances into 17 distinct claim concepts (meaning, origin, popularity, syllables, ...) rather than by template. 4 of those concepts — Meaning, Origin, Popularity, Trend / rank movement — are classified **differently depending on which template or generator function renders them**:

- **Meaning**: fallback / disclosed-missing
- **Origin**: fallback / disclosed-missing / supported
- **Popularity**: disclosed-missing / supported
- **Trend / rank movement**: fallback / supported

The clearest example is **meaning**: on name-detail-page, the exact same empty `meaning` field produces a *fallback* ("a documented given name") in the meta description and direct-answer text, and a *disclosed-missing* placeholder ("—") in the Quick Facts table — two independently-coded sections of the same page handling the same absent field two different ways. **Origin** shows a related but distinct pattern: on name-detail-page it is classified fallback (three sections substitute "multiple traditions" / "various linguistic traditions" / "various cultural traditions"), while on sibling-harmony-page the identical concept is *also* fallback but for a different reason — that generator reads the unenriched `data/names.json` rather than `data/names-enriched.json`, so its fallback rate (100% of 150 pages) is higher than name-detail-page's (95.6% of 3,697 pages) even though both draw on the same underlying enrichment effort.

## Limitations (reported as Unknown, not a fifth category)

- The sibling-harmony popularity-band factor (`sibling-harmony-popularity-factor`) could not be measured by exact page count: the true 150-name sibling batch is selected by a popularity ranking that only 5 names in the committed dataset actually have, so which specific 150 names the live batch contains cannot be reconstructed from committed data alone (same limitation already noted in Phase 1B's audit/knowledge-density.json). Its classification (disclosed-missing) is verified by source code; its exact page count is Unknown.
- The names-style-page empty-state message ("No names in this style yet.") was verified to exist in source but was not individually confirmed against all 7 live style pages in this pass — all 7 are recorded as supported pending that specific check.
- Phase 1B's audit/knowledge-dependencies.json attributed compare-name-country-pair-page to `data/country-differentials.json`; Phase 1C source verification found this to be incorrect — `scripts/generate-compare-pages.js` computes rank/movement/volatility directly from `data/popularity.json` and never reads `country-differentials.json`. This correction is recorded in audit/truthfulness-matrix.json rather than silently edited into the Phase 1B file.

---

### How to regenerate this report and its data

```bash
node scripts/audit/run-truthfulness.js
```

This runs, in order: `truthfulness-matrix.js` → `page-truthfulness.js` → `fallback-taxonomy.js` → `assertion-catalog.js` → `truthfulness-hotspots.js` → `truthfulness-report.js`. Like Phases 1A and 1B, every script here only reads the repository and only writes into `/audit/`. See `docs/TRUTHFULNESS_AUDIT.md` for the full methodology and terminology specification.
