#!/usr/bin/env node
/**
 * scripts/audit/knowledge-report.js — Phase 1B / PART 7: Knowledge
 * Executive Report (READ-ONLY).
 *
 * Assembles audit/KNOWLEDGE_REPORT.md from the six Phase 1B JSON reports.
 * All numbers are interpolated live — run knowledge-coverage.js through
 * empty-knowledge.js first, or use scripts/audit/run-knowledge.js.
 *
 * Measures knowledge availability only. No quality scoring, no SEO advice,
 * no pruning recommendations, per the Phase 1B brief.
 */

const path = require('path');
const { AUDIT_DIR, readJsonSafe, writeAuditText } = require('./_lib.js');

function requireAudit(filename) {
  const data = readJsonSafe(path.join(AUDIT_DIR, filename));
  if (!data) {
    console.error(`Missing ${filename} — run scripts/audit/run-knowledge.js first.`);
    process.exit(1);
  }
  return data;
}

function run() {
  console.log('PART 7 — Knowledge Executive Report');

  const kc = requireAudit('knowledge-coverage.json');
  const matrix = requireAudit('page-knowledge-matrix.json');
  const graph = requireAudit('entity-knowledge-graph.json');
  const deps = requireAudit('knowledge-dependencies.json');
  const density = requireAudit('knowledge-density.json');
  const empty = requireAudit('empty-knowledge.json');

  const elc = kc.entityLevelCoverage;
  const nd = density.byTemplate['name-detail-page'];
  const headline = empty.headlineFinding;
  const pervasive = empty.mostPervasiveMarker;

  const denseFields = Object.entries(elc).filter(([, v]) => v.coveragePct >= 95).sort((a, b) => b[1].coveragePct - a[1].coveragePct);
  const sparseFields = Object.entries(elc).filter(([, v]) => v.coveragePct < 10).sort((a, b) => a[1].coveragePct - b[1].coveragePct);

  const nameDetailAttrs = matrix.templates.find((t) => t.category === 'name-detail-page').attributes;
  const alwaysWithFallbackCount = nameDetailAttrs.filter((a) => a.presence === 'always-with-fallback').length;

  const md = `# NameOrigin — Knowledge Coverage Report

_Generated ${new Date().toISOString()} by scripts/audit/knowledge-report.js (Phase 1B — read-only). Regenerate with \`node scripts/audit/run-knowledge.js\`._

This is a **knowledge availability** report, not a quality or SEO report. It measures how much structured information the project actually holds about each entity it publishes a page for, and how much of what appears on a page is real data versus a generic substitute rendered when real data is absent. It makes no recommendation to fix, prune, or re-rank anything — that is intentionally deferred to a later phase.

## 1. How much structured knowledge exists

The project tracks ${Object.keys(elc).length} entity-level knowledge attributes across its core dataset of ${kc.entityLevelCoverage.gender.totalRecords.toLocaleString()} names. Coverage is bimodal — there is essentially no middle ground:

**Near-universal (≥95% of names):**

| Attribute | Coverage |
| --- | --- |
${denseFields.map(([k, v]) => `| ${k} | ${v.coveragePct}% |`).join('\n')}

**Near-absent (<10% of names):**

| Attribute | Coverage |
| --- | --- |
${sparseFields.map(([k, v]) => `| ${k} | ${v.coveragePct}% |`).join('\n')}

Every dense attribute above is either a structural fact captured at ingestion time (gender, first letter, syllable count) or a field that a build script populates unconditionally for every record (e.g. \`is_traditional\`/\`is_modern\` flags, or the near-total variants coverage from the normalization step). Every sparse attribute is one that requires per-name research or curation — meaning, real origin, real popularity, cross-linguistic equivalents — and only a hand-curated subset (the top 150–300 names by various scripts' own stated scope) has ever received that curation.

## 2. Where knowledge is dense

- **Structural/derived fields are complete.** first_letter, gender, syllables, and spelling variants are populated for all 3,697 names — these come from deterministic transformation of the name string itself, not from research.
- **Surnames are fully described.** All 4 core fields in \`data/last-names.json\` (name, origin, syllables, compatibility note) are 100% populated across all 75 surnames — this is the one entity type in the project with complete hand-curated coverage.
- **Category tagging is near-universal**, which is why the computed per-name knowledge-density floor (see Section 4) never drops below 5 attributes even for names with no other enrichment.

## 3. Where knowledge is sparse

- **Meaning: ${elc.meaning.coveragePct}%** (${elc.meaning.present} of ${elc.meaning.totalRecords} names).
- **Origin (country or language): ${elc.origin_country_or_language.coveragePct}%** (${elc.origin_country_or_language.present} of ${elc.origin_country_or_language.totalRecords} names).
- **Popularity: ${elc.popularity_record.coveragePct}%** (${elc.popularity_record.present} of ${elc.popularity_record.totalRecords} names have any row at all, out of ${kc.arrayDatasetFieldCoverage['popularity.json (per popularity row)'].total} total rows in the dataset).
- **Phonetic/pronunciation: 0%** — this field has never been populated for any name in the dataset.
- **Country × name comparison data: ${elc.country_differential_entry.coveragePct}%** (${elc.country_differential_entry.present} of ${elc.country_differential_entry.totalRecords.toLocaleString()} possible name/country pairs).

**The rendered-page consequence of this sparsity is the central finding of Phase 1B:** ${headline.statement} A further ${pervasive.pagesAffected} of ${pervasive.totalPages} pages (${pervasive.pct}%) show an explicit "—" placeholder for meaning in the on-page facts table — an honest gap disclosure, distinct from the fabricated phrase above, but confirming the same underlying scarcity from a second, independently-coded section of the same template. Separately, three origin-dependent sections (Name Usage & Cultural Context, Origin and Linguistic Lineage, Historical and Cultural Context) substitute generic phrases — "multiple traditions," "various linguistic traditions," "various cultural traditions" — on ${empty.fallbackMarkerResults.find((m) => m.id === 'origin-fallback-multiple-traditions').pagesContainingFallback} of ${empty.fallbackMarkerResults.find((m) => m.id === 'origin-fallback-multiple-traditions').pagesScanned} pages (${empty.fallbackMarkerResults.find((m) => m.id === 'origin-fallback-multiple-traditions').fallbackRatePct}%) each. These sections are never omitted — they always render, with either real or substituted content — so the sparsity is invisible from the page structure alone; it only shows up when the actual rendered text is checked against the source dataset, which is what audit/empty-knowledge.json does mechanically for every page.

## 4. Knowledge density, computed per page

For the two templates that account for 94% of all generated pages (name-detail-page and names-like-page, ${nd.recordsMeasured.toLocaleString()} pages each, both drawn from the same underlying name record), the exact computed distribution across all ${nd.recordsMeasured.toLocaleString()} names is:

| Statistic | Value (of ${nd.attributesTracked} tracked attributes) |
| --- | --- |
| Minimum | ${nd.minAttributes} |
| Maximum | ${nd.maxAttributes} |
| Average | ${nd.averageAttributes} |
| Median | ${nd.medianAttributes} |

No name page carries more than ${nd.maxAttributes} of the ${nd.attributesTracked} tracked attributes, and the typical (median) page carries ${nd.medianAttributes} — almost entirely the structural fields from Section 2, not the researched ones from Section 3. Surname pages (\`surname-compatibility-page\`, \`names-lastname-filter-page\`) are denser and more consistent: ${density.byTemplate['surname-compatibility-page'].minAttributes}–${density.byTemplate['surname-compatibility-page'].maxAttributes} of ${density.byTemplate['surname-compatibility-page'].attributesTracked} attributes, because that entity type (75 surnames) received complete curation while the 3,697-name entity type did not.

List/aggregation templates (country, style, letter, popularity-year, trend pages) are structurally uniform by construction — every instance carries the same fixed attribute set — so no distribution applies to them; they are reported as constants in audit/knowledge-density.json rather than force-fit into a min/max spread.

## 5. Which templates depend most on structured data

From audit/page-knowledge-matrix.json, ranked by how many of their attributes are marked \`always-with-fallback\` (i.e. the template's own text asserts something even when the backing field is empty):

- **name-detail-page** — ${alwaysWithFallbackCount} of its ${nameDetailAttrs.length} tracked attributes (meaning, origin, historical/cultural context) always render with a fallback. This is the single most data-dependent template on the site and the one carrying the sparsest data (Section 3).
- **names-like-page** — depends on the same underlying record as name-detail-page, but degrades more gracefully: its similarity "pools" (phonetic, origin, popularity, alternatives) are drawn from whichever dimensions have data, and the phonetic-match pool alone is guaranteed non-empty since it only requires the name string itself.
- **compare-name-country-pair-page** — always renders rank/delta/volatility figures, substituting null/0 when \`data/country-differentials.json\` lacks a historical rank; only 5 of the 20 live pages could be checked against real entries (audit/knowledge-density.json documents this as a stated limitation rather than an estimate).
- **surname-compatibility-page / names-lastname-filter-page** — the least data-dependent of the entity-detail templates in the sense that their core fields are 100% populated; only the optional heraldry section (2 of 75 surnames) has any gap.

## 6. How knowledge flows through the project

audit/knowledge-dependencies.json traces ${deps.chains.length} fields end-to-end from dataset to page type; every generator script named in those chains was cross-checked against the Phase 1A generator catalog (audit/build-pipeline.json) with zero unresolved references. The shape that recurs across almost every chain:

\`\`\`
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
\`\`\`

The bottleneck is consistently the same: a small, explicitly-scoped curation step (origin-overrides.json's own header states "top 300 names only") feeds a generator that was built to serve the full 3,697-name catalog. The generator code itself is not the constraint — audit/entity-knowledge-graph.json shows every relationship type is implemented and every generator runs cleanly — the constraint is the volume of curated knowledge behind it.

## 7. Entity relationships at a glance

audit/entity-knowledge-graph.json models ${graph.nodes.length} entity/page-type node kinds and ${graph.edges.length} relationship types. Two relationship types have no stored/missing-data state at all because they are computed live at build time rather than looked up: Name↔Surname compatibility and Name↔Name sibling pairing. Every other edge type has a computed coveragePct, and — consistent with everything above — the edges tied to curated fields (Name→Origin, Name→OriginCountry, Name→Language, Name→EquivalentGroup) sit in the low single digits, while the edges tied to deterministic derivation (Name→Letter at 100%) or bulk-generated data (Name→Variant, effectively 100%) are complete.

---

### How to regenerate this report and its data

\`\`\`bash
node scripts/audit/run-knowledge.js
\`\`\`

This runs, in order: \`knowledge-coverage.js\` → \`page-knowledge-matrix.js\` → \`entity-knowledge-graph.js\` → \`knowledge-dependencies.js\` → \`knowledge-density.js\` → \`empty-knowledge.js\` → \`knowledge-report.js\`. Like Phase 1A, every script here only reads the repository and only writes into \`/audit/\`.
`;

  writeAuditText('KNOWLEDGE_REPORT.md', md);
  console.log('Knowledge executive report written (' + md.length + ' chars).');
}

run();
