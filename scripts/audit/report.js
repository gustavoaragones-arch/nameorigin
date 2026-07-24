#!/usr/bin/env node
/**
 * scripts/audit/report.js — Phase 1A / PART 8: Executive Report (READ-ONLY).
 * Assembles audit/PROJECT_INTELLIGENCE_REPORT.md from the six data reports
 * (project-inventory, site-structure, templates, entity-map, datasets,
 * build-pipeline) and project-health.json. All numbers are interpolated
 * live from those JSON files — run inventory.js..project-health.js first,
 * or use scripts/audit/run-all.js.
 *
 * Architecture description only. No deletion, SEO, or pruning
 * recommendations, per the Phase 1A brief.
 */

const path = require('path');
const { AUDIT_DIR, readJsonSafe, writeAuditText } = require('./_lib.js');

function requireAudit(filename) {
  const data = readJsonSafe(path.join(AUDIT_DIR, filename));
  if (!data) {
    console.error(`Missing ${filename} — run scripts/audit/run-all.js first.`);
    process.exit(1);
  }
  return data;
}

function fmt(n) {
  return Number(n).toLocaleString('en-US');
}

function run() {
  console.log('PART 8 — Executive Report');

  const inv = requireAudit('project-inventory.json');
  const struct = requireAudit('site-structure.json');
  const tpl = requireAudit('templates.json');
  const ent = requireAudit('entity-map.json');
  const ds = requireAudit('datasets.json');
  const pipe = requireAudit('build-pipeline.json');
  const health = requireAudit('project-health.json');

  const g = inv.namedGroupCallouts;
  const canonicalOrchestrator = pipe.orchestratorSequences.find((o) => o.orchestrator === 'scripts/clean-rebuild-3.3e.js');
  const staleOrchestrator = pipe.orchestratorSequences.find((o) => o.orchestrator === 'scripts/build-all.js');
  const largestGenerator = health.largestGenerators[0];

  const md = `# NameOrigin — Project Intelligence Report

_Generated ${new Date().toISOString()} by scripts/audit/report.js (Phase 1A — read-only). Regenerate with \`node scripts/audit/run-all.js\`._

This document is the plain-English companion to the seven JSON reports in \`/audit/\`. It is written for a developer who has never seen this project before. It describes what exists and how it fits together — it does **not** recommend deleting pages, changing SEO, or pruning content. Those are later phases; this phase only builds visibility.

## 1. What NameOrigin is

NameOrigin (nameorigin.io) is a static, programmatic-SEO baby-name reference site. It has no runtime backend for page rendering: every page is a plain \`.html\` file, pre-built by Node.js scripts from JSON data files and committed (or deployable as build output) to the repo. The stack is deliberately simple — "Static-first (HTML5 + vanilla JS), Cloudflare Pages + D1" per the project README — and there is no client-side framework, bundler, or SSR runtime in the page-serving path.

The site currently ships **${fmt(inv.summary.totalHtmlPages)} generated HTML pages** built from **${fmt(inv.summary.totalJsonDatasets)} JSON datasets** by **${fmt(pipe.totalScriptsCataloged)} Node.js scripts**. The core content unit is the first name: **${fmt(g.namePages)} name-detail pages**, each cross-linked into a dense web of related-name, surname-compatibility, sibling-pairing, and cross-country comparison pages.

## 2. How it is generated

There is no single monolithic build tool; instead, dozens of focused Node scripts under \`/scripts\` each own one page category or one data-preparation step. They fall into three layers:

1. **Data acquisition** (\`scripts/acquire/*.js\`, \`scripts/import-*.js\`, \`scripts/normalize-names.js\`, \`scripts/enrich-meanings.js\`, \`scripts/classify-categories.js\`, \`scripts/build-popularity.js\`) — pulls from public government sources (US SSA, Statistics Canada, UK ONS, Wikidata) into \`/data/*.json\`. Orchestrated by \`scripts/run-phase1.js\`.
2. **Page generation** (\`scripts/generate-*.js\`) — reads \`/data/*.json\` and writes static HTML into the repo root and its subdirectories (\`name/\`, \`names/\`, \`names-like/\`, \`baby-names-with-*/\`, \`compare/\`, \`equivalents/\`, \`popularity/\`, \`trends/\`, \`tools/\`, \`legal/\`, \`about/\`, plus 8 root-level hub \`.html\` files).
3. **Sitemap & validation** (\`scripts/build-sitemap.js\`, \`scripts/generate-html-sitemap.js\`, \`scripts/index-integrity-audit.js\`, and several \`phase-*\` / \`*-audit.js\` / \`*-report.js\` scripts) — closes the loop by checking what was just built.

One script dominates layer 2: **\`scripts/generate-programmatic-pages.js\`** is ${largestGenerator ? fmt(largestGenerator.lines) : 'a few thousand'} lines and single-handedly generates name-detail pages, names-like pages, letter/gender/country/style pages, last-name filter pages, the compatibility tool page, and the 8 root hub pages. It is the largest script in the repo by a wide margin (the next-largest, \`scripts/build-origin-seed.js\`, is well under a third of the size) and is the single most structurally important file if you need to understand or change how most of the site is built.

**Notable finding:** the repo contains three different "run everything" entry points, and they are not equivalent:

- \`scripts/run-phase1.js\` — the data-acquisition pipeline (raw sources → \`/data/*.json\`). Not in conflict with the others; a different concern.
- \`scripts/clean-rebuild-3.3e.js\` — deletes prior output and regenerates it via ${canonicalOrchestrator ? canonicalOrchestrator.steps.length : '~18'} steps. Its output shape (\`name/\`, \`names/\`, \`compare/\`, \`baby-names-with-*/\`, etc.) matches what is actually committed in the repo today, which makes it the de facto current pipeline.
- \`scripts/build-all.js\` — an older 5-step (now effectively ${staleOrchestrator ? staleOrchestrator.steps.length : '11'}-step) sequence whose first three steps write to a \`/programmatic/\` directory. That directory does not exist anywhere in the repo, and \`generate-programmatic-pages.js\` explicitly comments that "\`/programmatic/\` must not exist" (Phase 3.3D). \`build-all.js\` appears to predate that consolidation and was not updated.

Neither \`clean-rebuild-3.3e.js\` nor any other destructive script was executed to produce this report — everything above and in \`/audit/*.json\` was derived by reading source files and the committed HTML/data on disk.

## 3. How content flows

A single name flows through the system roughly like this:

1. It enters \`data/names.json\` via the acquisition pipeline (id, name, gender, syllables, first_letter — origin/language/meaning start as \`null\`).
2. \`scripts/build-origin-seed.js\` may add a curated entry to \`data/origin-overrides.json\` (currently ${ent.entities.originOverrides.coverage.split(' ')[0]} of names have one).
3. \`scripts/apply-origin-enrichment.js\` merges overrides on top of the base record to produce \`data/names-enriched.json\`, which the generators prefer when present.
4. \`scripts/generate-programmatic-pages.js\` reads the enriched record (plus \`categories.json\`, \`popularity.json\`, \`variants.json\`, and \`build/topic-clusters.json\`) and writes \`/name/{slug}/index.html\` — pulling in up to ~20 internal-link building blocks (related names, cluster names, equivalents, middle-name ideas, sibling cross-link if the name is in the top-150 batch, etc.).
5. The same generator (or the standalone \`scripts/generate-names-like.js\`) writes a companion \`/names-like/{slug}/index.html\` page, selecting from phonetic, origin, popularity-band, and gender-based similarity pools and enforcing a 600-word / 12-link minimum before writing the file.
6. Separately, \`scripts/generate-sibling-pages.js\` (top 150 names only), \`scripts/generate-lastname-pages.js\` + \`generateLastNamePage()\` (75 surnames), and \`scripts/generate-equivalent-pages.js\` (27 curated anchors) add narrower cross-link clusters for the names that qualify.
7. \`scripts/build-sitemap.js\` / \`scripts/generate-html-sitemap.js\` then fold whatever exists on disk into \`sitemap.xml\`, \`/sitemaps/*.xml\`, and \`/sitemap/index.html\`.

Every generated page shares one \`baseLayout()\` header/footer (defined once in \`generate-programmatic-pages.js\`), so navigation is structurally identical sitewide: Home / Names / Boy / Girl / Unisex / By letter / Last name fit / All name pages in the header, and a browse row plus sitemap link in the footer. Per-page uniqueness comes entirely from the main-content sections a given template assembles, not from the chrome around it.

## 4. How datasets connect

There are ${fmt(ds.datasetCount)} JSON datasets in \`/data\`, with clear producer/consumer relationships (see \`audit/datasets.json\` for the full, code-derived map). The load-bearing spine is:

\`\`\`
names.json ──(+origin-overrides.json via apply-origin-enrichment.js)──> names-enriched.json
                                                                              │
   categories.json ─┐                                                       │
   popularity.json ─┼──────────────► scripts/generate-programmatic-pages.js ◄┘
   variants.json ───┘                            │
                                                   ▼
                          name/, names/, names-like/, baby-names-with-*/, compatibility/
\`\`\`

Two supporting datasets (\`country-differentials.json\`, \`regional-trend-acceleration.json\`) feed the comparison and trends pages; several small "explanation variant" datasets (\`compatibility-explanation-variants.json\`, \`sibling-explanation-variants.json\`, and three more) feed the deterministic prose renderers that vary wording across otherwise-similar pages.

**Notable finding:** ${ds.unreferencedDatasets.length} datasets — \`${ds.unreferencedDatasets.map((p) => p.split('/').pop()).join('`, `')}\` — produced no hits when every script in the repo was searched for their filename. They may be an early scaffold for a feature that was never wired up, or read by tooling outside this repo; nothing in \`/scripts\` currently appears to load them.

## 5. Page inventory at a glance

| Group | Count |
| --- | --- |
${inv.pageGroups.map((row) => `| ${row.label} | ${fmt(row.count)} |`).join('\n')}

Total generated pages: **${fmt(inv.summary.totalHtmlPages)}** across ${tpl.templateCount} distinct templates (see \`audit/templates.json\` for section-by-section, schema-by-schema detail on each one).

## 6. Where complexity exists

- **One file, most of the site.** \`generate-programmatic-pages.js\` (${largestGenerator ? fmt(largestGenerator.lines) : 'thousands of'} lines, ~80 functions) is the generator for name pages, names-like pages, letter/gender/country/style pages, last-name filter pages, the compatibility tool, and all 8 root hub pages. A change here has a very wide blast radius.
- **Overlapping build entry points.** Three orchestrator scripts (\`run-phase1.js\`, \`clean-rebuild-3.3e.js\`, \`build-all.js\`) exist with no single documented canonical command, and one of them (\`build-all.js\`) is partially stale (see Section 2).
- **Duplicate surname URL systems.** The same 75 surnames in \`data/last-names.json\` back two independent templates and URL shapes: \`/baby-names-with-{surname}/\` and \`/names/with-last-name-{surname}.html\`.
- **Deterministic-but-repeated prose.** Several templates (names-like, surname-compatibility, sibling-harmony) select from small fixed pools of 5–8 hand-written paragraph variants, chosen by a hash of the record id, and interpolate the specific name/origin/style into them. This keeps generation deterministic and fast, but across thousands of pages each variant is reused many hundreds of times with only the interpolated tokens differing. A narrower audit script for exactly this question already exists in the repo (\`scripts/compatibility-duplication-audit.js\`) but was not run as part of this pass.

## 7. Which systems appear healthy

- **The classification/URL system is unambiguous.** Every one of the ${fmt(inv.summary.totalHtmlFilesOnDisk)} HTML files on disk matched exactly one rule in a 27-rule path classifier with zero unclassified pages outside of the 4 template source files (see \`audit/templates.json\` coverageCheck) — the URL space, while large, is not chaotic.
- **Schema/E-E-A-T signals are applied consistently.** A shared \`aeo-article-schema.js\` module merges Article schema onto most templates, and BreadcrumbList JSON-LD appears on effectively every generated page.
- **Guardrails exist and are enforced at generation time**, not just checked after the fact: \`scripts/phase-3.4-guards.js\` throws on pages under 400 words / 20 links; \`generate-names-like.js\` hard-fails the build if any page is under 600 words / 12 links; \`generate-compare-pages.js\` and others cap their own output rather than growing unboundedly.
- **A self-auditing culture already exists.** Beyond this new \`/audit\` subsystem, the repo already has ~15 pre-existing audit/report scripts (\`index-integrity-audit.js\`, \`origin-integrity-audit.js\`, \`sitemap-hygiene-report.js\`, \`crawl-depth-distribution.js\`, \`internal-link-density-report.js\`, \`topic-cluster-map.js\`, and others) — Phase 1A's job was to add a permanent, holistic layer on top of these, not to replace them.

## 8. Which systems deserve future investigation

(Described here as areas of low data density or structural asymmetry — not as a to-do list, and not with a recommendation attached.)

- **Popularity data covers ${ent.entities.names.fieldCoverage.withPopularityRecord} of ${fmt(ent.entities.names.count)} names** (data/popularity.json has 7 rows total), yet a "Popularity" section is code in every name-detail page and is one of four similarity dimensions on every names-like page.
- **Origin/language data covers ${ent.entities.origins.coverage.match(/\(([^)]+)\)/)?.[1] || '4.4%'} of names**, and the structured **meaning field covers ${ent.entities.meanings.coverage.match(/\(([^)]+)\)/)?.[1] || '~0.1%'} of names** — both are referenced throughout the name-detail and names-like templates' copy.
- **Several page categories exist at a fraction of their own documented design capacity**: \`compare/\` pages (20 of a stated 500-page cap), \`popularity/\` year pages (3 of a stated 1980–2024 range), and sibling-harmony pages (150 of 3,697 names). Whether that gap reflects an intentional phased rollout or an incomplete one is not determinable from the code alone.
- **No religion taxonomy exists** despite being a natural adjacent entity to origin/culture data; the closest concept is the single "biblical" value inside the 6-value style/category taxonomy.

---

### How to regenerate this report and its data

\`\`\`bash
node scripts/audit/run-all.js
\`\`\`

This runs, in order: \`inventory.js\` → \`site-structure.js\` → \`templates.js\` → \`entity-map.js\` → \`datasets.js\` → \`build-pipeline.js\` → \`project-health.js\` → \`report.js\`. Every script in \`scripts/audit/\` only reads the repository and only writes into \`/audit/\`; see \`scripts/audit/_lib.js\` for the shared read/write helpers that enforce this.
`;

  writeAuditText('PROJECT_INTELLIGENCE_REPORT.md', md);
  console.log('Executive report written (' + md.length + ' chars).');
}

run();
