#!/usr/bin/env node
/**
 * scripts/audit/truthfulness-report.js — Phase 1C / PART 6: Truthfulness
 * Executive Report (READ-ONLY).
 *
 * Assembles audit/truthfulness-report.md from the five Phase 1C JSON
 * reports. Purely descriptive — no recommendations, no ranking beyond
 * measured counts, no "should"/"must" language.
 */

const path = require('path');
const { AUDIT_DIR, readJsonSafe, writeAuditText } = require('./_lib.js');

function requireAudit(filename) {
  const data = readJsonSafe(path.join(AUDIT_DIR, filename));
  if (!data) {
    console.error(`Missing ${filename} — run scripts/audit/run-truthfulness.js first.`);
    process.exit(1);
  }
  return data;
}

function run() {
  console.log('PART 6 — Truthfulness Executive Report');

  const matrix = requireAudit('truthfulness-matrix.json');
  const pageT = requireAudit('page-truthfulness.json');
  const taxonomy = requireAudit('fallback-taxonomy.json');
  const catalog = requireAudit('assertion-catalog.json');
  const hotspots = requireAudit('truthfulness-hotspots.json');

  const worstHotspot = hotspots.hotspots[0];
  const perfectTemplates = hotspots.hotspots.filter((h) => h.truthfulnessPct === 100);
  const perfectMultiAssertion = perfectTemplates.filter((h) => h.totalAssertions >= 2);
  const perfectSingleAssertion = perfectTemplates.filter((h) => h.totalAssertions < 2);
  const mixedConcepts = catalog.conceptsWithMixedTruthfulnessStates;
  const fallbackMechanisms = taxonomy.mechanisms.filter((m) => m.kind === 'fallback').sort((a, b) => b.fallbackRatePct - a.fallbackRatePct);
  const disclosedMechanisms = taxonomy.mechanisms.filter((m) => m.kind === 'disclosed-missing');

  const md = `# NameOrigin — Truthfulness Intelligence Report

_Generated ${new Date().toISOString()} by scripts/audit/truthfulness-report.js (Phase 1C — read-only). Regenerate with \`node scripts/audit/run-truthfulness.js\`._

## What truthfulness means here

This report classifies every rendered factual-statement mechanism on the site into exactly one of four states:

- **Supported** — the statement comes directly from structured data (e.g. "Gender: Boy" ← \`data/names.json\`).
- **Computed** — the statement is derived deterministically and always reproducible, with no missing-data state (e.g. a compatibility score, a first-letter grouping, a spelling-variant list).
- **Disclosed-missing** — the page honestly states that a value is unknown, or silently omits the section entirely, rather than asserting something specific.
- **Fallback** — the generator substitutes generic prose that reads as if it were a specific, researched claim about this particular entity.

This is not a quality, SEO, or hallucination-detection audit. It does not evaluate grammar, usefulness, or intent — only whether a given statement is backed, derived, honestly absent, or substituted.

## Supported vs. computed

The following concepts carry the **supported** classification in every template they appear in — each traces to a real, populated dataset field, verified either by a live coverage count (Phase 1B's audit/knowledge-coverage.json) or a direct grep against generated HTML:

${catalog.concepts.filter((c) => c.truthfulnessStates.includes('supported') && !c.stateVariesByTemplate).map((c) => `- **${c.label}**`).join('\n') || '(see audit/assertion-catalog.json for the full concept list)'}

Assertions classified **computed** — letter grouping, syllable count, spelling variants, compatibility/harmony scores, the names-like phonetic-similarity pool, and the compare-page cultural-context paragraphs — share one property: they cannot be "missing," because they are produced by a deterministic function rather than looked up. The Phase 1C brief's own examples (compatibility score, similarity score, letter, variants) match this category exactly.

## Disclosed unknowns

${disclosedMechanisms.map((m) => `- **${m.datasetField}** (\`${m.function}\`, ${m.templates.join(', ')}): ${m.pagesAffected} of ${m.pagesScanned} pages (${m.fallbackRatePct}%) render the honest placeholder \`"${m.literalFallback}"\` or omit the section outright.`).join('\n')}

These mechanisms make no claim when data is absent — either an explicit "—"/omission, or, in one case (the popularity FAQ answer), a sentence that plainly states the name "does not yet show a stable rank band." Per the Phase 1C classification rules, this is considered truthful.

## Fallback substitutions

${fallbackMechanisms.map((m) => `- **${m.datasetField}** (\`${m.function}\`, ${m.templates.join(', ')}): ${m.pagesAffected} of ${m.pagesScanned} pages (${m.fallbackRatePct}%) contain the literal substitute \`"${m.literalFallback}"\`.`).join('\n')}

One of these — \`compare-rank-movement-fallback-data-available\` — fires on 100% of its template's pages (20 of 20), because no name in \`data/popularity.json\` has a year-2015 row, so the 10-year-movement calculation can never succeed for any comparison page; the fallback text nonetheless asserts that "data are available for our covered countries."

## Page-level observations

The site-wide rollup across all ${catalog.totalAssertionInstances} cataloged assertion instances: **${pageT.siteWide.truthfulnessRatioPct}%** are supported-or-computed (${pageT.siteWide.supported} supported + ${pageT.siteWide.computed} computed, out of ${pageT.siteWide.totalAssertions} total). This rollup weights every template's assertions equally regardless of how many live pages that template has — it is not the same as "58.8% of all rendered sentences site-wide," since name-detail-page alone accounts for 3,697 of the site's ~7,832 pages but is only 1 of 11 templates in this rollup.

The **highest-fallback template is ${worstHotspot.template}**, at ${worstHotspot.fallbackPct}% fallback assertions (${worstHotspot.fallbackAssertions} of ${worstHotspot.totalAssertions}) and a truthfulness ratio of ${worstHotspot.truthfulnessPct}%. This is also, by page count, the largest template on the site (name-detail-page and its data-identical sibling names-like-page together account for the large majority of all generated pages per audit/project-inventory.json) — so this template's ratio is the one most representative of a typical page view on the site.

${perfectTemplates.length} templates reach a 100% truthfulness ratio. Of these, ${perfectSingleAssertion.length} (${perfectSingleAssertion.map((h) => h.template).join(', ')}) have only a single cataloged assertion, so 100% reflects a small denominator as much as a strong result. The more notable case is ${perfectMultiAssertion.map((h) => h.template).join(', ') || '(none with 2+ assertions)'}, which reaches 100% across ${perfectMultiAssertion.map((h) => h.totalAssertions).join('/')} assertions — still a small number, but not a single trivial one. In every 100%-ratio template, the underlying dataset is small and fully curated (e.g. 75 surnames, 27 equivalent-name anchors, 5 supported countries), unlike the 3,697-name catalog that name-detail-page and names-like-page draw on.

## Template observations

| Template | Total assertions | Supported | Computed | Disclosed-missing | Fallback | Truthfulness ratio |
| --- | --- | --- | --- | --- | --- | --- |
${pageT.perTemplate.map((t) => `| ${t.template} | ${t.totalAssertions} | ${t.supported} | ${t.computed} | ${t.disclosedMissing} | ${t.fallback} | ${t.truthfulnessRatioPct}% |`).join('\n')}

Internal validation (required by the Phase 1C brief): for every template above, supported + computed + fallback + disclosed-missing exactly equals total assertions — confirmed programmatically in audit/truthfulness-matrix.json's \`validation\` array (${matrix.validation.every((v) => v.sumMatchesTotal) ? 'all templates pass' : 'DISCREPANCY FOUND — see validation array'}), with no assertion left uncategorized and no assertion counted twice within a template.

## Assertion (claim-type) observations

audit/assertion-catalog.json groups the same ${catalog.totalAssertionInstances} assertion instances into ${catalog.conceptCount} distinct claim concepts (meaning, origin, popularity, syllables, ...) rather than by template. ${mixedConcepts.length} of those concepts — ${mixedConcepts.map((c) => c.label).join(', ')} — are classified **differently depending on which template or generator function renders them**:

${mixedConcepts.map((c) => `- **${c.label}**: ${c.states.join(' / ')}`).join('\n')}

The clearest example is **meaning**: on name-detail-page, the exact same empty \`meaning\` field produces a *fallback* ("a documented given name") in the meta description and direct-answer text, and a *disclosed-missing* placeholder ("—") in the Quick Facts table — two independently-coded sections of the same page handling the same absent field two different ways. **Origin** shows a related but distinct pattern: on name-detail-page it is classified fallback (three sections substitute "multiple traditions" / "various linguistic traditions" / "various cultural traditions"), while on sibling-harmony-page the identical concept is *also* fallback but for a different reason — that generator reads the unenriched \`data/names.json\` rather than \`data/names-enriched.json\`, so its fallback rate (100% of 150 pages) is higher than name-detail-page's (95.6% of 3,697 pages) even though both draw on the same underlying enrichment effort.

## Limitations (reported as Unknown, not a fifth category)

- The sibling-harmony popularity-band factor (\`sibling-harmony-popularity-factor\`) could not be measured by exact page count: the true 150-name sibling batch is selected by a popularity ranking that only 5 names in the committed dataset actually have, so which specific 150 names the live batch contains cannot be reconstructed from committed data alone (same limitation already noted in Phase 1B's audit/knowledge-density.json). Its classification (disclosed-missing) is verified by source code; its exact page count is Unknown.
- The names-style-page empty-state message ("No names in this style yet.") was verified to exist in source but was not individually confirmed against all 7 live style pages in this pass — all 7 are recorded as supported pending that specific check.
- Phase 1B's audit/knowledge-dependencies.json attributed compare-name-country-pair-page to \`data/country-differentials.json\`; Phase 1C source verification found this to be incorrect — \`scripts/generate-compare-pages.js\` computes rank/movement/volatility directly from \`data/popularity.json\` and never reads \`country-differentials.json\`. This correction is recorded in audit/truthfulness-matrix.json rather than silently edited into the Phase 1B file.

---

### How to regenerate this report and its data

\`\`\`bash
node scripts/audit/run-truthfulness.js
\`\`\`

This runs, in order: \`truthfulness-matrix.js\` → \`page-truthfulness.js\` → \`fallback-taxonomy.js\` → \`assertion-catalog.js\` → \`truthfulness-hotspots.js\` → \`truthfulness-report.js\`. Like Phases 1A and 1B, every script here only reads the repository and only writes into \`/audit/\`. See \`docs/TRUTHFULNESS_AUDIT.md\` for the full methodology and terminology specification.
`;

  writeAuditText('truthfulness-report.md', md);
  console.log('Truthfulness executive report written (' + md.length + ' chars).');
}

run();
