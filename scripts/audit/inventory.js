#!/usr/bin/env node
/**
 * scripts/audit/inventory.js — Phase 1A / PART 1: Project Inventory (READ-ONLY).
 * Walks the repo, classifies every generated HTML page, inventories JSON
 * datasets, and produces audit/project-inventory.json.
 *
 * This script never writes outside of /audit/. See scripts/audit/_lib.js.
 */

const path = require('path');
const {
  ROOT,
  DATA_DIR,
  SCRIPTS_DIR,
  allFiles,
  allHtmlFiles,
  fileSize,
  listDataJsonFiles,
  readJsonSafe,
  listScriptFiles,
  writeAuditJson,
  bytesToHuman,
} = require('./_lib.js');
const { classify, CATEGORY_LABELS, GROUP_LABELS } = require('./classify.js');

// Which generator script owns each fine-grained page category. Derived by
// reading each generator's header comment and its fs.writeFileSync output
// paths (see audit/build-pipeline.json for the full generator catalog).
const GENERATOR_BY_CATEGORY = {
  'homepage': 'scripts/generate-homepage.js (grid injection) + hand-authored base',
  'root-hub-page': 'scripts/generate-programmatic-pages.js',
  'name-detail-page': 'scripts/generate-programmatic-pages.js (generateNamePage)',
  'names-like-page': 'scripts/generate-programmatic-pages.js (generateNamesLikePage) — also scripts/generate-names-like.js standalone runner',
  'sibling-harmony-page': 'scripts/generate-sibling-pages.js',
  'names-hub': 'scripts/generate-programmatic-pages.js',
  'names-letter-page': 'scripts/generate-programmatic-pages.js (generateLetterPage)',
  'names-letters-hub': 'scripts/generate-programmatic-pages.js',
  'names-gender-country-page': 'scripts/generate-programmatic-pages.js (generateGenderCountryPage)',
  'names-gender-page': 'scripts/generate-programmatic-pages.js',
  'names-country-page': 'scripts/generate-programmatic-pages.js (generateCountryPage)',
  'names-style-page': 'scripts/generate-programmatic-pages.js (generateStylePage)',
  'names-style-hub': 'scripts/generate-programmatic-pages.js',
  'names-curated-list-page': 'scripts/generate-programmatic-pages.js (generateListPage)',
  'names-lastname-filter-page': 'scripts/generate-programmatic-pages.js (generateLastNamePage)',
  'names-lastname-hub': 'scripts/generate-programmatic-pages.js',
  'surname-compatibility-page': 'scripts/generate-lastname-pages.js',
  'compare-name-country-pair-page': 'scripts/generate-compare-pages.js',
  'compare-country-pair-hub': 'scripts/generate-compare-pages.js',
  'compare-hub': 'scripts/generate-compare-pages.js',
  'equivalents-page': 'scripts/generate-equivalent-pages.js',
  'compatibility-tool-page': 'scripts/generate-programmatic-pages.js',
  'popularity-year-page': 'scripts/generate-popularity-pages.js / scripts/generate-popularity-year-pages.js',
  'popularity-hub': 'scripts/generate-popularity-pages.js',
  'trend-page': 'scripts/generate-trends-page.js',
  'trends-hub': 'scripts/generate-trends-page.js',
  'tool-landing-page': 'scripts/generate-tool-pages.js',
  'legal-page': 'scripts/generate-legal-pages.js',
  'about-page': 'scripts/generate-legal-pages.js',
  'html-sitemap': 'scripts/generate-html-sitemap.js',
  'template-source': 'n/a (hand-authored template; see templates/README.md)',
  'other-static': 'unclassified — needs manual review',
};

function buildPageInventory() {
  const htmlFiles = allHtmlFiles();
  const byCategory = {};
  const byGroup = {};

  for (const f of htmlFiles) {
    const { category, group } = classify(f);
    byCategory[category] = (byCategory[category] || 0) + 1;
    byGroup[group] = (byGroup[group] || 0) + 1;
  }

  const categories = Object.keys(byCategory)
    .sort((a, b) => byCategory[b] - byCategory[a])
    .map((category) => ({
      category,
      label: CATEGORY_LABELS[category] || category,
      count: byCategory[category],
      generated_by: GENERATOR_BY_CATEGORY[category] || 'unknown',
    }));

  const groups = Object.keys(byGroup)
    .sort((a, b) => byGroup[b] - byGroup[a])
    .map((group) => ({ group, label: GROUP_LABELS[group] || group, count: byGroup[group] }));

  const totalPages = htmlFiles.length - (byCategory['template-source'] || 0);

  return { totalHtmlFilesOnDisk: htmlFiles.length, totalGeneratedPages: totalPages, categories, groups };
}

function buildDatasetInventory() {
  const files = listDataJsonFiles();
  const datasets = files.map((name) => {
    const abs = path.join(DATA_DIR, name);
    const data = readJsonSafe(abs);
    const rel = 'data/' + name;
    let rows = null;
    let shape = 'unknown';
    if (Array.isArray(data)) {
      rows = data.length;
      shape = 'array';
    } else if (data && typeof data === 'object') {
      rows = Object.keys(data).length;
      shape = 'object';
    }
    return { path: rel, sizeBytes: fileSize(rel), sizeHuman: bytesToHuman(fileSize(rel)), shape, rows };
  });
  datasets.sort((a, b) => b.sizeBytes - a.sizeBytes);
  return datasets;
}

function buildGeneratorOutputs() {
  const genScripts = listScriptFiles(SCRIPTS_DIR).filter((f) => f.startsWith('generate-') || f.startsWith('build-'));
  return genScripts;
}

function buildStats(pageInventory, datasetInventory) {
  const all = allFiles();
  const htmlBytes = allHtmlFiles().reduce((sum, f) => sum + fileSize(f), 0);
  const dataBytes = datasetInventory.reduce((sum, d) => sum + d.sizeBytes, 0);
  const scriptCount = listScriptFiles(SCRIPTS_DIR).length + listScriptFiles(path.join(SCRIPTS_DIR, 'acquire')).length + listScriptFiles(path.join(SCRIPTS_DIR, 'utils')).length;

  return {
    totalFilesInRepo: all.length,
    totalHtmlBytes: htmlBytes,
    totalHtmlBytesHuman: bytesToHuman(htmlBytes),
    totalDataJsonBytes: dataBytes,
    totalDataJsonBytesHuman: bytesToHuman(dataBytes),
    totalScriptFiles: scriptCount,
    averageHtmlFileSizeBytes: Math.round(htmlBytes / pageInventory.totalHtmlFilesOnDisk),
  };
}

function run() {
  console.log('PART 1 — Project Inventory');
  const pageInventory = buildPageInventory();
  const datasetInventory = buildDatasetInventory();
  const generatorOutputs = buildGeneratorOutputs();
  const stats = buildStats(pageInventory, datasetInventory);

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    root: ROOT,
    summary: {
      totalHtmlPages: pageInventory.totalGeneratedPages,
      totalHtmlFilesOnDisk: pageInventory.totalHtmlFilesOnDisk,
      totalJsonDatasets: datasetInventory.length,
      totalGeneratorScripts: generatorOutputs.length,
    },
    pageCategories: pageInventory.categories,
    pageGroups: pageInventory.groups,
    namedGroupCallouts: {
      countryPages: pageInventory.groups.find((g) => g.group === 'country')?.count || 0,
      namePages: pageInventory.groups.find((g) => g.group === 'name')?.count || 0,
      surnamePages: pageInventory.groups.find((g) => g.group === 'surname')?.count || 0,
      namesLikePages: pageInventory.groups.find((g) => g.group === 'names-like')?.count || 0,
      pairPages: pageInventory.groups.find((g) => g.group === 'pair')?.count || 0,
      hubPages: pageInventory.groups.find((g) => g.group === 'hub')?.count || 0,
      staticPages: pageInventory.groups.find((g) => g.group === 'static')?.count || 0,
      utilityPages: pageInventory.groups.find((g) => g.group === 'utility')?.count || 0,
    },
    generatorOutputScripts: generatorOutputs,
    dataSources: {
      jsonDatasets: datasetInventory,
      largestDatasets: datasetInventory.slice(0, 5),
    },
    buildStatistics: stats,
    notes: [
      'Page counts reflect the current committed repository state on disk, not a live crawl.',
      'templates/*.html are template sources, not live pages, and are excluded from totalHtmlPages.',
      'This report is regenerated by re-running: node scripts/audit/inventory.js',
    ],
  };

  writeAuditJson('project-inventory.json', report);
  console.log('Total generated pages:', report.summary.totalHtmlPages);
}

run();
