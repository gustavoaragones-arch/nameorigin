# NameOrigin — Knowledge Coverage Report

_Generated 2026-07-21T18:25:10.963Z by scripts/audit/knowledge-report.js (Phase 1B — read-only). Regenerate with `node scripts/audit/run-knowledge.js`._

This is a **knowledge availability** report, not a quality or SEO report. It measures how much structured information the project actually holds about each entity it publishes a page for, and how much of what appears on a page is real data versus a generic substitute rendered when real data is absent. It makes no recommendation to fix, prune, or re-rank anything — that is intentionally deferred to a later phase.

## 1. How much structured knowledge exists

The project tracks 13 entity-level knowledge attributes across its core dataset of 3,697 names. Coverage is bimodal — there is essentially no middle ground:

**Near-universal (≥95% of names):**

| Attribute | Coverage |
| --- | --- |
| syllables | 100% |
| gender | 100% |
| category_assignment | 100% |
| variant_record | 100% |

**Near-absent (<10% of names):**

| Attribute | Coverage |
| --- | --- |
| phonetic | 0% |
| country_differential_entry | 0.03% |
| meaning | 0.08% |
| popularity_record | 0.14% |
| equivalent_group | 0.73% |
| heraldry_record | 2.67% |
| origin_country_or_language | 4.41% |
| origin_cluster | 4.52% |
| origin_override | 4.52% |

Every dense attribute above is either a structural fact captured at ingestion time (gender, first letter, syllable count) or a field that a build script populates unconditionally for every record (e.g. `is_traditional`/`is_modern` flags, or the near-total variants coverage from the normalization step). Every sparse attribute is one that requires per-name research or curation — meaning, real origin, real popularity, cross-linguistic equivalents — and only a hand-curated subset (the top 150–300 names by various scripts' own stated scope) has ever received that curation.

## 2. Where knowledge is dense

- **Structural/derived fields are complete.** first_letter, gender, syllables, and spelling variants are populated for all 3,697 names — these come from deterministic transformation of the name string itself, not from research.
- **Surnames are fully described.** All 4 core fields in `data/last-names.json` (name, origin, syllables, compatibility note) are 100% populated across all 75 surnames — this is the one entity type in the project with complete hand-curated coverage.
- **Category tagging is near-universal**, which is why the computed per-name knowledge-density floor (see Section 4) never drops below 5 attributes even for names with no other enrichment.

## 3. Where knowledge is sparse

- **Meaning: 0.08%** (3 of 3697 names).
- **Origin (country or language): 4.41%** (163 of 3697 names).
- **Popularity: 0.14%** (5 of 3697 names have any row at all, out of 7 total rows in the dataset).
- **Phonetic/pronunciation: 0%** — this field has never been populated for any name in the dataset.
- **Country × name comparison data: 0.03%** (5 of 18,485 possible name/country pairs).

**The rendered-page consequence of this sparsity is the central finding of Phase 1B:** 3694 of 3697 name-detail pages (99.92%) contain the literal fallback phrase "documented given name" as the stated meaning of the name, in the meta description and/or on-page direct-answer text. A further 3697 of 3697 pages (100%) show an explicit "—" placeholder for meaning in the on-page facts table — an honest gap disclosure, distinct from the fabricated phrase above, but confirming the same underlying scarcity from a second, independently-coded section of the same template. Separately, three origin-dependent sections (Name Usage & Cultural Context, Origin and Linguistic Lineage, Historical and Cultural Context) substitute generic phrases — "multiple traditions," "various linguistic traditions," "various cultural traditions" — on 3534 of 3697 pages (95.59%) each. These sections are never omitted — they always render, with either real or substituted content — so the sparsity is invisible from the page structure alone; it only shows up when the actual rendered text is checked against the source dataset, which is what audit/empty-knowledge.json does mechanically for every page.

## 4. Knowledge density, computed per page

For the two templates that account for 94% of all generated pages (name-detail-page and names-like-page, 3,697 pages each, both drawn from the same underlying name record), the exact computed distribution across all 3,697 names is:

| Statistic | Value (of 13 tracked attributes) |
| --- | --- |
| Minimum | 5 |
| Maximum | 10 |
| Average | 5.134 |
| Median | 5 |

No name page carries more than 10 of the 13 tracked attributes, and the typical (median) page carries 5 — almost entirely the structural fields from Section 2, not the researched ones from Section 3. Surname pages (`surname-compatibility-page`, `names-lastname-filter-page`) are denser and more consistent: 4–5 of 5 attributes, because that entity type (75 surnames) received complete curation while the 3,697-name entity type did not.

List/aggregation templates (country, style, letter, popularity-year, trend pages) are structurally uniform by construction — every instance carries the same fixed attribute set — so no distribution applies to them; they are reported as constants in audit/knowledge-density.json rather than force-fit into a min/max spread.

## 5. Which templates depend most on structured data

From audit/page-knowledge-matrix.json, ranked by how many of their attributes are marked `always-with-fallback` (i.e. the template's own text asserts something even when the backing field is empty):

- **name-detail-page** — 3 of its 14 tracked attributes (meaning, origin, historical/cultural context) always render with a fallback. This is the single most data-dependent template on the site and the one carrying the sparsest data (Section 3).
- **names-like-page** — depends on the same underlying record as name-detail-page, but degrades more gracefully: its similarity "pools" (phonetic, origin, popularity, alternatives) are drawn from whichever dimensions have data, and the phonetic-match pool alone is guaranteed non-empty since it only requires the name string itself.
- **compare-name-country-pair-page** — always renders rank/delta/volatility figures, substituting null/0 when `data/country-differentials.json` lacks a historical rank; only 5 of the 20 live pages could be checked against real entries (audit/knowledge-density.json documents this as a stated limitation rather than an estimate).
- **surname-compatibility-page / names-lastname-filter-page** — the least data-dependent of the entity-detail templates in the sense that their core fields are 100% populated; only the optional heraldry section (2 of 75 surnames) has any gap.

## 6. How knowledge flows through the project

audit/knowledge-dependencies.json traces 12 fields end-to-end from dataset to page type; every generator script named in those chains was cross-checked against the Phase 1A generator catalog (audit/build-pipeline.json) with zero unresolved references. The shape that recurs across almost every chain:

```
raw/curated source (often hand-curated, small scope)
        │
        ▼
data/*.json  (e.g. origin-overrides.json: 167 names, name-equivalents.json: 27 anchors)
        │
        ▼
merge/derive step (e.g. apply-origin-enrichment.js)
        │
        ▼
generate-programmatic-pages.js (or a dedicated generate-*.js)
        │
        ▼
template section — ALWAYS renders, with real data or a substitute
        │
        ▼
thousands of pages inherit whatever coverage the curation step achieved
```

The bottleneck is consistently the same: a small, explicitly-scoped curation step (origin-overrides.json's own header states "top 300 names only") feeds a generator that was built to serve the full 3,697-name catalog. The generator code itself is not the constraint — audit/entity-knowledge-graph.json shows every relationship type is implemented and every generator runs cleanly — the constraint is the volume of curated knowledge behind it.

## 7. Entity relationships at a glance

audit/entity-knowledge-graph.json models 16 entity/page-type node kinds and 15 relationship types. Two relationship types have no stored/missing-data state at all because they are computed live at build time rather than looked up: Name↔Surname compatibility and Name↔Name sibling pairing. Every other edge type has a computed coveragePct, and — consistent with everything above — the edges tied to curated fields (Name→Origin, Name→OriginCountry, Name→Language, Name→EquivalentGroup) sit in the low single digits, while the edges tied to deterministic derivation (Name→Letter at 100%) or bulk-generated data (Name→Variant, effectively 100%) are complete.

---

### How to regenerate this report and its data

```bash
node scripts/audit/run-knowledge.js
```

This runs, in order: `knowledge-coverage.js` → `page-knowledge-matrix.js` → `entity-knowledge-graph.js` → `knowledge-dependencies.js` → `knowledge-density.js` → `empty-knowledge.js` → `knowledge-report.js`. Like Phase 1A, every script here only reads the repository and only writes into `/audit/`.
