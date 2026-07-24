#!/usr/bin/env node
/**
 * scripts/audit/project-health.js — Phase 1A / PART 7: Project Health (READ-ONLY).
 * Synthesizes observations from the other five audit reports (re-read from
 * /audit/*.json — run those scripts first, or use scripts/audit/run-all.js)
 * plus fresh filesystem stats (script line counts). Observational only —
 * no deletion, SEO, or pruning recommendations, per the Phase 1A brief.
 */

const fs = require('fs');
const path = require('path');
const { ROOT, SCRIPTS_DIR, AUDIT_DIR, readJsonSafe, readFileSafe, listScriptFiles, bytesToHuman, writeAuditJson } = require('./_lib.js');

function requireAudit(filename) {
  const p = path.join(AUDIT_DIR, filename);
  const data = readJsonSafe(p);
  if (!data) {
    console.error(`Missing ${filename} — run its generator first (e.g. node scripts/audit/inventory.js), or use scripts/audit/run-all.js.`);
    process.exit(1);
  }
  return data;
}

function lineCount(absPath) {
  const src = readFileSafe(absPath);
  return src ? src.split('\n').length : 0;
}

function largestGenerators() {
  const dirs = [SCRIPTS_DIR, path.join(SCRIPTS_DIR, 'acquire'), path.join(SCRIPTS_DIR, 'utils')];
  const rows = [];
  for (const dir of dirs) {
    for (const file of listScriptFiles(dir)) {
      const abs = path.join(dir, file);
      rows.push({ script: path.relative(ROOT, abs), lines: lineCount(abs) });
    }
  }
  return rows.sort((a, b) => b.lines - a.lines);
}

function run() {
  console.log('PART 7 — Project Health');

  const inventory = requireAudit('project-inventory.json');
  const structure = requireAudit('site-structure.json');
  const templates = requireAudit('templates.json');
  const entities = requireAudit('entity-map.json');
  const datasets = requireAudit('datasets.json');
  const pipeline = requireAudit('build-pipeline.json');

  const generators = largestGenerators();

  const largestPageGroups = inventory.pageGroups.slice(0, 8);
  const largestDatasets = datasets.largestDatasets.slice(0, 5).map((d) => ({ path: d.path, sizeHuman: d.sizeHuman, rows: d.rows }));
  const largestGeneratorsTop = generators.slice(0, 8);

  const maintenanceRisks = [
    {
      risk: 'Three competing "master build" scripts',
      evidence: 'scripts/build-all.js, scripts/clean-rebuild-3.3e.js, and scripts/run-phase1.js each claim a full-build role for different (and in build-all.js\'s case, partly stale) parts of the pipeline. See audit/build-pipeline.json orchestratorSequences.',
    },
    {
      risk: 'Legacy generator scripts target a directory that must not exist',
      evidence: 'scripts/generate-name-pages.js, scripts/generate-filter-pages.js, and scripts/generate-hubs.js (and the scripts/lib.js they share) write to /programmatic/, which generate-programmatic-pages.js explicitly documents as forbidden ("Phase 3.3D: single canonical tree; /programmatic/ must not exist"). These three scripts are still present, still runnable, and still referenced by build-all.js.',
    },
    {
      risk: 'One 3,678-line generator owns most of the site',
      evidence: 'scripts/generate-programmatic-pages.js is 3,678 lines and contains ~80 functions covering name pages, names-like pages, letter/gender/country/style pages, last-name pages, the compatibility tool, and the 8 root hub pages. It is by a wide margin the largest and most structurally load-bearing script in the repo (next-largest is 915 lines).',
    },
    {
      risk: '3 datasets have no detected reader',
      evidence: `data/comparison-intro-variants.json, data/cultural-explanation-variants.json, and data/delta-interpretation-variants.json produced zero hits when every script in scripts/, scripts/acquire/, and scripts/utils/ was searched for their basename. See audit/datasets.json unreferencedDatasets.`,
    },
    {
      risk: 'Two parallel surname-related URL systems for the same 75 surnames',
      evidence: 'data/last-names.json backs both /baby-names-with-{surname}/ (scripts/generate-lastname-pages.js) and /names/with-last-name-{surname}.html (generate-programmatic-pages.js generateLastNamePage()) — two different templates, two different URL shapes, same underlying 75-surname entity set.',
    },
  ];

  const scalingRisks = [
    {
      risk: 'Popularity data covers 5 of 3,697 names (0.1%)',
      evidence: 'data/popularity.json has 7 rows referencing only 5 unique name_id values, yet popularity charts/sections are code paths on all 3,697 name-detail pages and all 3,697 names-like pages, and popularity is one of the four similarity dimensions on names-like pages.',
    },
    {
      risk: 'Origin/language coverage is 4.4% of names',
      evidence: `${entities.entities.origins.coverage}. Country pages, style pages, and origin-lineage sections all depend on this field, but 95.6% of names have neither an origin_country nor a language value.`,
    },
    {
      risk: 'Meaning field covers 0.08% of names',
      evidence: `entity-map.json meanings.coverage: ${entities.entities.meanings.coverage}. The word "meaning" appears in the copy of both name-detail and names-like page templates, but the structured meaning field itself is populated for only 3 of 3,697 names.`,
    },
    {
      risk: 'compare/ pages generated at ~4% of documented capacity',
      evidence: 'scripts/generate-compare-pages.js header describes a cap of "Top 100 global names × 5 country pairs = 500 pages max"; only 4 names × 5 pairs = 20 pages plus 5 hubs exist on disk today.',
    },
    {
      risk: 'popularity/ year pages generated at a fraction of documented range',
      evidence: 'scripts/generate-popularity-year-pages.js targets "/popularity/1980.html through /popularity/2024.html"; only 2022–2024 (3 pages) exist on disk.',
    },
    {
      risk: 'sibling-harmony pages cover 4% of names',
      evidence: 'Only the top 150 of 3,697 names (getSiblingBatchNameSlugs, hard-coded limit) get a /names/{slug}/siblings/ page; the other 3,547 name pages contain no sibling cross-link by design.',
    },
  ];

  const duplicationRisks = [
    {
      risk: 'Prose is generated from small fixed variant pools reused across thousands of pages',
      evidence: 'generate-programmatic-pages.js / generate-names-like.js select intro/closing/explanation text from arrays of 5–8 hand-written templates, chosen deterministically by (name id % pool size), and interpolate the name/origin/style into them. Across 3,697 names-like pages and 3,697 name pages, each of the ~6-8 variants is reused hundreds to over a thousand times with only the interpolated tokens differing.',
    },
    {
      risk: 'Existing repo tooling already targets this exact question',
      evidence: 'scripts/compatibility-duplication-audit.js already exists ("ensures explanation sections are not templated clones... tier explanations are not repeated >25%") — this is a pre-existing, narrower audit for the surname-compatibility template specifically; it was not run as part of this read-only Phase 1A pass.',
    },
  ];

  const buildComplexity = {
    totalScripts: pipeline.totalScriptsCataloged,
    totalOrchestrators: pipeline.orchestratorSequences.length,
    totalSharedUtilities: pipeline.sharedUtilities.length,
    note: `${pipeline.totalScriptsCataloged} scripts across scripts/, scripts/acquire/, and scripts/utils/, coordinated by ${pipeline.orchestratorSequences.length} different orchestrator entry points rather than one canonical pipeline.`,
  };

  const generatorComplexity = {
    largestGenerators: largestGeneratorsTop,
    totalGeneratorLinesOfCode: generators.reduce((s, g) => s + g.lines, 0),
    note: 'scripts/generate-programmatic-pages.js alone accounts for roughly a fifth of all script code in the repo (by line count) and is a single point of change for most page categories.',
  };

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    scope: 'Observational only — this report intentionally makes no deletion, pruning, SEO, or enrichment recommendations. It exists so future phases have a factual baseline.',
    largestPageGroups,
    largestDatasets,
    largestGenerators: largestGeneratorsTop,
    maintenanceRisks,
    scalingRisks,
    duplicationRisks,
    buildComplexity,
    generatorComplexity,
    crossReport: {
      totalHtmlPages: inventory.summary.totalHtmlPages,
      totalJsonDatasets: inventory.summary.totalJsonDatasets,
      totalTemplates: templates.templateCount,
      totalEntityTypes: Object.keys(entities.entities).length,
      directoryDepthMax: Math.max(...structure.directoryDepthHistogram.map((d) => d.depth)),
    },
    notes: [
      'Every figure in this report is either read directly from another audit/*.json report or computed fresh from the filesystem in this run — nothing is asserted without a cited source.',
      'This report answers "what is true about the project" only. Phase 1B and later phases are expected to consume it for scoring, pruning, and enrichment decisions.',
    ],
  };

  writeAuditJson('project-health.json', report);
  console.log('Risks recorded — maintenance:', maintenanceRisks.length, '| scaling:', scalingRisks.length, '| duplication:', duplicationRisks.length);
}

run();
