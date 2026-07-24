#!/usr/bin/env node
/**
 * scripts/audit/build-pipeline.js — Phase 1A / PART 6: Build Pipeline (READ-ONLY).
 * Catalogs every generator/build script (header comment extracted live from
 * source), documents the known orchestrator sequences found in the repo
 * (run-phase1.js, clean-rebuild-3.3e.js, build-all.js), and lists shared
 * utility modules.
 */

const path = require('path');
const { SCRIPTS_DIR, listScriptFiles, extractHeaderComment, readFileSafe, writeAuditJson } = require('./_lib.js');

const SHARED_UTILITIES = [
  { file: 'scripts/lib.js', role: 'Legacy Phase 2 shared helpers (baseLayout, slug, breadcrumb) targeting the /programmatic/ output tree. Still required by the orphaned generate-name-pages.js / generate-filter-pages.js / generate-hubs.js (see status below).' },
  { file: 'scripts/url-helpers.js', role: 'Normalizes internal URL formats, e.g. namesLikeUrl() used by both generate-names-like.js and generate-programmatic-pages.js.' },
  { file: 'scripts/aeo-article-schema.js', role: 'Shared Article JSON-LD (author + dateModified) merged into most page templates for sitewide E-E-A-T signals.' },
  { file: 'scripts/build-date.js', role: 'Shared build-date stamp used for "last updated" freshness signals.' },
  { file: 'scripts/utils/name-equivalents.js', role: 'Sync, closed-set loader for data/name-equivalents.json; hard-filters invalid slugs.' },
  { file: 'scripts/phase-3.4-guards.js', role: 'Hard guard called before writing HTML: throws if word count < 400 or internal links < 20.' },
  { file: 'scripts/compatibility-explanation-renderer.js', role: 'Deterministic (hash-based, no random()) prose-variant renderer for surname compatibility pages.' },
  { file: 'scripts/sibling-explanation-renderer.js', role: 'Deterministic prose-variant renderer for sibling-harmony pages.' },
  { file: 'scripts/generate-smoothness-score.js', role: 'Deterministic first+last name phonetic "smoothness" scoring engine, consumed by generate-programmatic-pages.js.' },
  { file: 'scripts/generate-sibling-harmony.js', role: 'Deterministic sibling-pair compatibility scoring engine, consumed by generate-sibling-pages.js.' },
];

// Known orchestrator sequences, read directly from the STEPS/SCRIPTS arrays
// inside each orchestrator script (not re-typed by hand where avoidable).
function extractStepsArray(absPath, arrayVarPattern) {
  const src = readFileSafe(absPath);
  if (!src) return null;
  const namesRe = /['"`]([a-zA-Z0-9_.\-]+\.js)['"`]/g;
  const stepsBlockMatch = src.match(arrayVarPattern);
  if (!stepsBlockMatch) return null;
  const block = stepsBlockMatch[0];
  const steps = [];
  let m;
  while ((m = namesRe.exec(block))) steps.push(m[1]);
  return steps;
}

function buildOrchestrators() {
  const dataAcquisitionSteps = extractStepsArray(path.join(SCRIPTS_DIR, 'run-phase1.js'), /const SCRIPTS = \[[\s\S]*?\];/);
  const cleanRebuildSteps = extractStepsArray(path.join(SCRIPTS_DIR, 'clean-rebuild-3.3e.js'), /const STEPS = \[[\s\S]*?\];/);
  const legacyBuildAllSteps = extractStepsArray(path.join(SCRIPTS_DIR, 'build-all.js'), /const STEPS = \[[\s\S]*?\];/);

  return [
    {
      orchestrator: 'scripts/run-phase1.js',
      purpose: extractHeaderComment(path.join(SCRIPTS_DIR, 'run-phase1.js')),
      steps: dataAcquisitionSteps,
      status: 'Data-acquisition pipeline (raw sources -> data/*.json). Independent of the page-generation pipeline below.',
    },
    {
      orchestrator: 'scripts/clean-rebuild-3.3e.js',
      purpose: extractHeaderComment(path.join(SCRIPTS_DIR, 'clean-rebuild-3.3e.js')),
      steps: cleanRebuildSteps,
      status: 'Current/canonical full-site rebuild sequence — its outputs (name/, names/, compare/, baby-names-with-*, etc.) match what is actually on disk today. NOTE: this script is destructive (rm -rf on generated output dirs before rebuilding) — cataloged here for documentation only, never executed by the audit subsystem.',
    },
    {
      orchestrator: 'scripts/build-all.js',
      purpose: extractHeaderComment(path.join(SCRIPTS_DIR, 'build-all.js')),
      steps: legacyBuildAllSteps,
      status: 'Appears STALE: 3 of its 5 steps (generate-name-pages.js, generate-filter-pages.js, generate-hubs.js) write to PROGRAMMATIC_DIR via scripts/lib.js, i.e. a /programmatic/ directory. That directory does not exist anywhere in the repo, and generate-programmatic-pages.js contains the comment "Phase 3.3D: single canonical tree; /programmatic/ must not exist." This suggests build-all.js predates the Phase 3.3D consolidation and was not updated to reflect it.',
    },
  ];
}

function buildDependencyNotes() {
  return [
    { script: 'scripts/generate-equivalent-pages.js', dependsOn: ['scripts/generate-programmatic-pages.js'], reason: 'Header comment: "Run after generate-programmatic-pages.js (name pages must exist)."' },
    { script: 'scripts/apply-origin-enrichment.js', dependsOn: ['scripts/build-origin-seed.js'], reason: 'Merges data/origin-overrides.json (produced by build-origin-seed.js) into names-enriched.json.' },
    { script: 'scripts/generate-programmatic-pages.js', dependsOn: ['scripts/apply-origin-enrichment.js (optional)'], reason: 'loadNames() prefers names-enriched.json when present; falls back to names.json otherwise.' },
    { script: 'scripts/generate-homepage.js', dependsOn: ['data/names-enriched.json or data/names.json', 'data/popularity.json'], reason: 'Header comment: "Requires: ..."' },
    { script: 'scripts/phase-3.5-validate-audit.js', dependsOn: ['scripts/index-integrity-audit.js'], reason: 'Reads build/index-integrity-report.json produced by index-integrity-audit.js.' },
    { script: 'scripts/post-2.25a-audit.js', dependsOn: ['scripts/build-sitemap.js', 'sitemap + generated pages'], reason: 'Header comment: "re-run sitemap, internal link audit, canonical audit."' },
    { script: 'scripts/thin-page-reinforcement.js', dependsOn: ['scripts/index-integrity-audit.js'], reason: 'Parses build/index-integrity-report.json.' },
    { script: 'scripts/seed-d1.js', dependsOn: ['data/names.json', 'data/popularity.json', 'data/categories.json', 'data/variants.json'], reason: 'Reads all four to generate SQL seed statements.' },
  ];
}

function buildGeneratorCatalog() {
  const dirs = [
    { dir: SCRIPTS_DIR, prefix: 'scripts/' },
    { dir: path.join(SCRIPTS_DIR, 'acquire'), prefix: 'scripts/acquire/' },
    { dir: path.join(SCRIPTS_DIR, 'utils'), prefix: 'scripts/utils/' },
  ];
  const catalog = [];
  for (const { dir, prefix } of dirs) {
    for (const file of listScriptFiles(dir)) {
      catalog.push({
        script: prefix + file,
        purpose: extractHeaderComment(path.join(dir, file)) || '(no header comment found)',
      });
    }
  }
  return catalog.sort((a, b) => a.script.localeCompare(b.script));
}

function run() {
  console.log('PART 6 — Build Pipeline');
  const generatorCatalog = buildGeneratorCatalog();
  const orchestrators = buildOrchestrators();
  const dependencies = buildDependencyNotes();

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    totalScriptsCataloged: generatorCatalog.length,
    generatorCatalog,
    orchestratorSequences: orchestrators,
    explicitDependencies: dependencies,
    sharedUtilities: SHARED_UTILITIES,
    notes: [
      'purpose text is extracted live from each script\'s leading /** ... */ or // header comment block — it reflects what the author wrote, not independently verified behavior.',
      'This report identifies three competing "master build" scripts (run-phase1.js for data, clean-rebuild-3.3e.js and build-all.js for pages) rather than a single canonical entry point; see orchestratorSequences[].status for the evidence behind each.',
    ],
  };

  writeAuditJson('build-pipeline.json', report);
  console.log('Scripts cataloged:', generatorCatalog.length, '| orchestrators:', orchestrators.length);
}

run();
