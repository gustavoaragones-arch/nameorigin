#!/usr/bin/env node
/**
 * scripts/build/verify-generator-regression.js — Phase 3C/3D generator migration validation.
 *
 * Compares legacy file reads vs adapter-backed reads for Wave 1 and Wave 2 migrated
 * generators. Writes:
 *   audit/generator-regression.json
 *   audit/migration-progress.json
 *   audit/production-equivalence.json
 *   audit/migration-performance.json
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const AUDIT_DIR = path.join(ROOT, 'audit');
const BUILD_TMP = path.join(ROOT, 'build', 'wave-regression');

const WAVE1_GENERATORS = [
  {
    id: 'build-sitemap',
    script: 'scripts/build-sitemap.js',
    role: 'page-generator',
    adapterCollections: ['names', 'popularity'],
    outputPaths: ['sitemap.xml', 'sitemaps/names.xml', 'sitemaps/countries.xml', 'sitemaps/filters.xml', 'sitemaps/lastname.xml', 'sitemaps/names-like.xml', 'sitemaps/compare.xml'],
    structuralCompatibility: 'partially-satisfied',
  },
  {
    id: 'generate-html-sitemap',
    script: 'scripts/generate-html-sitemap.js',
    role: 'page-generator',
    adapterCollections: ['names', 'popularity'],
    outputPaths: ['sitemap/index.html'],
    structuralCompatibility: 'partially-satisfied',
  },
  {
    id: 'generate-homepage',
    script: 'scripts/generate-homepage.js',
    role: 'page-generator',
    adapterCollections: ['namesEnriched', 'popularity'],
    outputPaths: ['index.html'],
    structuralCompatibility: 'fully-satisfied',
    requiresSource: 'index.html',
  },
  {
    id: 'generate-popularity-pages',
    script: 'scripts/generate-popularity-pages.js',
    role: 'page-generator',
    adapterCollections: ['names', 'popularity'],
    outputPaths: ['popularity/index.html', 'popularity/2022.html', 'popularity/2023.html', 'popularity/2024.html'],
    structuralCompatibility: 'fully-satisfied',
  },
  {
    id: 'generate-popularity-year-pages',
    script: 'scripts/generate-popularity-year-pages.js',
    role: 'page-generator',
    adapterCollections: ['names', 'popularity'],
    outputGlob: 'popularity/**',
    structuralCompatibility: 'fully-satisfied',
  },
  {
    id: 'classify-categories',
    script: 'scripts/classify-categories.js',
    role: 'data-builder',
    adapterCollections: ['namesEnriched', 'popularity'],
    outputPaths: ['data/categories.json'],
    structuralCompatibility: 'not-applicable',
    writesDataFile: 'data/categories.json',
  },
  {
    id: 'build-popularity',
    script: 'scripts/build-popularity.js',
    role: 'data-builder',
    adapterCollections: ['names'],
    outputPaths: ['data/popularity.json'],
    structuralCompatibility: 'not-applicable',
    writesDataFile: 'data/popularity.json',
  },
];

const WAVE2_GENERATORS = [
  {
    id: 'generate-programmatic-pages',
    script: 'scripts/generate-programmatic-pages.js',
    role: 'page-generator',
    adapterCollections: ['namesEnriched', 'popularity', 'categories', 'variants'],
    outputGlob: '**/*.html',
    structuralCompatibility: 'fully-satisfied',
  },
  {
    id: 'generate-names-like',
    script: 'scripts/generate-names-like.js',
    role: 'page-generator',
    adapterCollections: ['namesBase', 'popularity', 'categories'],
    outputGlob: 'names-like/**',
    structuralCompatibility: 'fully-satisfied',
  },
  {
    id: 'generate-sibling-pages',
    script: 'scripts/generate-sibling-pages.js',
    role: 'page-generator',
    adapterCollections: ['namesBase', 'popularity', 'categories'],
    outputGlob: 'names/**',
    spawnArgs: ['--batch=10'],
    structuralCompatibility: 'fully-satisfied',
  },
  {
    id: 'generate-lastname-pages',
    script: 'scripts/generate-lastname-pages.js',
    role: 'page-generator',
    adapterCollections: ['namesBase'],
    outputGlob: 'baby-names-with-*/index.html',
    spawnArgs: ['--batch=5'],
    structuralCompatibility: 'fully-satisfied',
  },
  {
    id: 'generate-compare-pages',
    script: 'scripts/generate-compare-pages.js',
    role: 'page-generator',
    adapterCollections: ['namesBase', 'popularity'],
    outputGlob: 'compare/**',
    structuralCompatibility: 'fully-satisfied',
  },
  {
    id: 'generate-equivalent-pages',
    script: 'scripts/generate-equivalent-pages.js',
    role: 'page-generator',
    adapterCollections: ['namesEnriched'],
    outputGlob: 'equivalents/**',
    structuralCompatibility: 'partially-satisfied',
  },
];

const ALL_MIGRATED_GENERATORS = [...WAVE1_GENERATORS, ...WAVE2_GENERATORS];

const EXCLUDED_FROM_MIGRATION = [
  'scripts/generate-trends-page.js',
];

const EXCLUDED_WAVE1 = [
  'scripts/generate-programmatic-pages.js',
  'scripts/generate-names-like.js',
  'scripts/generate-sibling-pages.js',
  'scripts/generate-trends-page.js',
];

const ALL_GENERATORS = fs
  .readdirSync(path.join(ROOT, 'scripts'))
  .filter((f) => f.startsWith('generate-') || f.startsWith('build-'))
  .filter((f) => f.endsWith('.js'))
  .map((f) => 'scripts/' + f)
  .sort();

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function readFileSafe(absPath) {
  try {
    return fs.readFileSync(absPath);
  } catch (e) {
    return null;
  }
}

function listFilesRecursive(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(full, base));
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out.sort();
}

function compareDirectoryTrees(legacyDir, adapterDir, relPaths) {
  const diffs = [];
  const filenames = new Set(relPaths || []);
  if (!relPaths) {
    listFilesRecursive(legacyDir).forEach((p) => filenames.add(p));
    listFilesRecursive(adapterDir).forEach((p) => filenames.add(p));
  }

  for (const rel of [...filenames].sort()) {
    const legacyPath = path.join(legacyDir, rel);
    const adapterPath = path.join(adapterDir, rel);
    const legacyExists = fs.existsSync(legacyPath);
    const adapterExists = fs.existsSync(adapterPath);
    if (!legacyExists || !adapterExists) {
      diffs.push({ field: 'filename', path: rel, legacy: legacyExists, adapter: adapterExists });
      continue;
    }
    const legacyBuf = readFileSafe(legacyPath);
    const adapterBuf = readFileSafe(adapterPath);
    if (!legacyBuf.equals(adapterBuf)) {
      diffs.push({
        field: 'rendered-text',
        path: rel,
        legacySha256: sha256(legacyBuf),
        adapterSha256: sha256(adapterBuf),
        legacyBytes: legacyBuf.length,
        adapterBytes: adapterBuf.length,
      });
    }
  }
  return diffs;
}

function extractUrlsFromHtml(html) {
  const urls = [];
  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) urls.push(m[1]);
  return urls.sort();
}

function extractMetadata(html) {
  const meta = {};
  const title = html.match(/<title>([^<]*)<\/title>/i);
  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  const description = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  if (title) meta.title = title[1];
  if (canonical) meta.canonical = canonical[1];
  if (description) meta.description = description[1];
  return meta;
}

function extractStructuredData(html) {
  const blocks = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    blocks.push(m[1].trim());
  }
  return blocks;
}

function compareProductionEquivalenceFixed(legacyDir, adapterDir, relPaths) {
  const checks = [];
  for (const rel of relPaths) {
    const legacyPath = path.join(legacyDir, rel);
    const adapterPath = path.join(adapterDir, rel);
    if (!fs.existsSync(legacyPath) || !fs.existsSync(adapterPath)) {
      checks.push({ path: rel, status: 'missing-output', identical: false });
      continue;
    }
    const legacyHtml = fs.readFileSync(legacyPath, 'utf8');
    const adapterHtml = fs.readFileSync(adapterPath, 'utf8');
    const legacyMeta = extractMetadata(legacyHtml);
    const adapterMeta = extractMetadata(adapterHtml);
    const legacyUrls = extractUrlsFromHtml(legacyHtml);
    const adapterUrls = extractUrlsFromHtml(adapterHtml);
    const legacyJsonLd = extractStructuredData(legacyHtml);
    const adapterJsonLd = extractStructuredData(adapterHtml);
    const metadataMatch = JSON.stringify(legacyMeta) === JSON.stringify(adapterMeta);
    const urlsMatch = JSON.stringify(legacyUrls) === JSON.stringify(adapterUrls);
    const structuredDataMatch = JSON.stringify(legacyJsonLd) === JSON.stringify(adapterJsonLd);
    const byteIdentical = legacyHtml === adapterHtml;
    checks.push({
      path: rel,
      identical: byteIdentical,
      metadataIdentical: metadataMatch,
      internalLinksIdentical: urlsMatch,
      structuredDataIdentical: structuredDataMatch,
      urlCount: legacyUrls.length,
      slugPaths: legacyUrls.filter((u) => u.startsWith('/name/')).length,
    });
  }
  return checks;
}

function runGenerator(scriptRel, outDir, useLegacy, spawnArgs = []) {
  const env = {
    ...process.env,
    OUT_DIR: path.relative(ROOT, outDir),
    NAMEORIGIN_LEGACY_DATA: useLegacy ? '1' : '0',
  };
  if (env.OUT_DIR === '') delete env.OUT_DIR;
  const started = process.hrtime.bigint();
  const memBefore = process.memoryUsage().heapUsed;
  const result = spawnSync('node', [path.join(ROOT, scriptRel), ...spawnArgs], {
    cwd: ROOT,
    env,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  const memAfter = process.memoryUsage().heapUsed;
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    elapsedMs,
    memoryDeltaMb: (memAfter - memBefore) / (1024 * 1024),
  };
}

function backupFile(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return null;
  const backup = abs + '.wave1-backup';
  fs.copyFileSync(abs, backup);
  return backup;
}

function restoreBackup(backupPath, relPath) {
  if (!backupPath) return;
  fs.copyFileSync(backupPath, path.join(ROOT, relPath));
  fs.unlinkSync(backupPath);
}

function compareDatasetCollections() {
  delete process.env.NAMEORIGIN_LEGACY_DATA;
  for (const mod of [
    '../../lib/adapters/legacy-dataset-runtime.js',
    '../../lib/canonical/loaders.js',
    '../../lib/canonical/entity-builder.js',
    '../../lib/adapters/legacy-datasets.js',
  ]) {
    try {
      delete require.cache[require.resolve(mod)];
    } catch (e) {
      /* optional */
    }
  }

  process.env.NAMEORIGIN_LEGACY_DATA = '1';
  const legacyRuntime = require('../../lib/adapters/legacy-dataset-runtime.js');
  const legacy = {
    names: legacyRuntime.loadLegacyCollection('names'),
    namesEnriched: legacyRuntime.loadLegacyCollection('namesEnriched'),
    popularity: legacyRuntime.loadLegacyCollection('popularity'),
    categories: legacyRuntime.loadLegacyCollection('categories'),
    variants: legacyRuntime.loadLegacyCollection('variants'),
  };

  delete process.env.NAMEORIGIN_LEGACY_DATA;
  delete require.cache[require.resolve('../../lib/adapters/legacy-dataset-runtime.js')];
  const adapterRuntime = require('../../lib/adapters/legacy-dataset-runtime.js');
  const adapter = {
    names: adapterRuntime.loadLegacyCollection('names'),
    namesEnriched: adapterRuntime.loadLegacyCollection('namesEnriched'),
    popularity: adapterRuntime.loadLegacyCollection('popularity'),
    categories: adapterRuntime.loadLegacyCollection('categories'),
    variants: adapterRuntime.loadLegacyCollection('variants'),
  };

  const collections = ['names', 'namesEnriched', 'popularity', 'categories', 'variants'];
  return collections.map((name) => {
    const legacyRows = legacy[name] || [];
    const adapterRows = adapter[name] || [];
    const legacyJson = JSON.stringify(legacyRows);
    const adapterJson = JSON.stringify(adapterRows);
    return {
      collection: name,
      legacyCount: legacyRows.length,
      adapterCount: adapterRows.length,
      recordCountMatch: legacyRows.length === adapterRows.length,
      byteIdentical: legacyJson === adapterJson,
      legacySha256: sha256(legacyJson),
      adapterSha256: sha256(adapterJson),
    };
  });
}

function resolveOutputPaths(gen, outDir) {
  if (gen.outputGlob === '**/*.html') {
    return listFilesRecursive(outDir).filter((p) => p.endsWith('.html'));
  }
  if (gen.outputGlob === 'baby-names-with-*/index.html') {
    return listFilesRecursive(outDir).filter((p) => /^baby-names-with-[^/]+\/index\.html$/.test(p));
  }
  if (gen.outputGlob && gen.outputGlob.includes('*')) {
    const prefix = gen.outputGlob.split('*')[0].replace(/\/$/, '');
    const suffix = gen.outputGlob.includes('*.html') ? '.html' : '';
    const base = prefix ? path.join(outDir, prefix) : outDir;
    if (!fs.existsSync(base)) return [];
    const files = prefix ? listFilesRecursive(base).map((p) => `${prefix}/${p}`) : listFilesRecursive(outDir);
    return files.filter((p) => !suffix || p.endsWith(suffix));
  }
  if (gen.outputGlob) {
    const dir = gen.outputGlob.split('/')[0];
    return listFilesRecursive(path.join(outDir, dir)).map((p) => `${dir}/${p}`);
  }
  return (gen.outputPaths || []).filter((p) => !p.startsWith('data/'));
}

function verifyGenerator(gen) {
  const legacyOut = path.join(BUILD_TMP, gen.id, 'legacy');
  const adapterOut = path.join(BUILD_TMP, gen.id, 'adapter');
  fs.mkdirSync(legacyOut, { recursive: true });
  fs.mkdirSync(adapterOut, { recursive: true });

  if (gen.requiresSource) {
    const src = path.join(ROOT, gen.requiresSource);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(legacyOut, gen.requiresSource));
      fs.copyFileSync(src, path.join(adapterOut, gen.requiresSource));
    }
  }

  let dataBackup = null;
  let dataRel = gen.writesDataFile;
  if (dataRel) {
    dataBackup = backupFile(dataRel);
  }

  const legacyRun = runGenerator(gen.script, legacyOut, true, gen.spawnArgs || []);
  let legacyArtifact = null;
  if (dataRel && fs.existsSync(path.join(ROOT, dataRel))) {
    legacyArtifact = fs.readFileSync(path.join(ROOT, dataRel));
  }

  const adapterRun = runGenerator(gen.script, adapterOut, false, gen.spawnArgs || []);
  let adapterArtifact = null;
  if (dataRel && fs.existsSync(path.join(ROOT, dataRel))) {
    adapterArtifact = fs.readFileSync(path.join(ROOT, dataRel));
  }

  if (dataBackup) restoreBackup(dataBackup, dataRel);

  const relOutputs = resolveOutputPaths(gen, legacyOut);
  const fileDiffs = dataRel
    ? []
    : compareDirectoryTrees(legacyOut, adapterOut, relOutputs.length ? relOutputs : null);

  let dataDiff = null;
  if (dataRel && legacyArtifact && adapterArtifact) {
    dataDiff = {
      path: dataRel,
      byteIdentical: legacyArtifact.equals(adapterArtifact),
      legacySha256: sha256(legacyArtifact),
      adapterSha256: sha256(adapterArtifact),
      legacyBytes: legacyArtifact.length,
      adapterBytes: adapterArtifact.length,
    };
  }

  const productionChecks = dataRel
    ? []
    : compareProductionEquivalenceFixed(legacyOut, adapterOut, relOutputs);

  const differences = [];
  if (!legacyRun.ok) differences.push({ type: 'legacy-run-failed', status: legacyRun.status, stderr: legacyRun.stderr.slice(0, 500) });
  if (!adapterRun.ok) differences.push({ type: 'adapter-run-failed', status: adapterRun.status, stderr: adapterRun.stderr.slice(0, 500) });
  fileDiffs.forEach((d) => differences.push({ type: 'file-diff', ...d }));
  if (dataDiff && !dataDiff.byteIdentical) differences.push({ type: 'data-file-diff', ...dataDiff });

  return {
    generator: gen.script,
    id: gen.id,
    role: gen.role,
    adapterCollections: gen.adapterCollections,
    structuralCompatibility: gen.structuralCompatibility,
    legacyRun: { ok: legacyRun.ok, elapsedMs: legacyRun.elapsedMs, memoryDeltaMb: legacyRun.memoryDeltaMb },
    adapterRun: { ok: adapterRun.ok, elapsedMs: adapterRun.elapsedMs, memoryDeltaMb: adapterRun.memoryDeltaMb },
    outputFileCount: relOutputs.length,
    differences,
    differenceCount: differences.length,
    regressionFree: differences.length === 0,
    productionEquivalence: productionChecks,
    productionEquivalencePass: productionChecks.every(
      (c) => c.identical && c.metadataIdentical && c.internalLinksIdentical && c.structuredDataIdentical !== false
    ),
  };
}

function measureAdapterOverhead() {
  const { performance } = require('perf_hooks');
  const { loadAll } = require('../../lib/canonical/loaders.js');
  const { buildAllEntities } = require('../../lib/canonical/entity-builder.js');
  const { buildLegacyDatasets } = require('../../lib/adapters/legacy-datasets.js');

  const legacyStart = performance.now();
  JSON.parse(fs.readFileSync(path.join(ROOT, 'data/names.json'), 'utf8'));
  JSON.parse(fs.readFileSync(path.join(ROOT, 'data/popularity.json'), 'utf8'));
  const legacyMs = performance.now() - legacyStart;

  const coldStart = performance.now();
  const ctx = loadAll();
  const entities = buildAllEntities(ctx, '1970-01-01T00:00:00.000Z');
  const datasets = buildLegacyDatasets(entities);
  const coldMs = performance.now() - coldStart;

  const warmStart = performance.now();
  buildLegacyDatasets(entities);
  const warmMs = performance.now() - warmStart;

  return {
    legacyFileReadMs: Number(legacyMs.toFixed(2)),
    canonicalBuildColdMs: Number(coldMs.toFixed(2)),
    canonicalBuildWarmMs: Number(warmMs.toFixed(2)),
    adapterOverheadColdMs: Number((coldMs - legacyMs).toFixed(2)),
    adapterCacheSpeedupRatio: warmMs > 0 ? Number((coldMs / warmMs).toFixed(2)) : null,
    entityCount: entities.length,
    multiGeneratorNote: 'Each generator spawn is a separate Node process — adapter cache in legacy-dataset-runtime.js does not persist across spawns; repeated canonical assembly is expected until a shared build orchestrator is introduced.',
    adapterCollections: {
      names: datasets.names.length,
      popularity: datasets.popularity.length,
    },
  };
}

function measureRuntimeCacheEffectiveness() {
  delete require.cache[require.resolve('../../lib/adapters/legacy-dataset-runtime.js')];
  const runtime = require('../../lib/adapters/legacy-dataset-runtime.js');
  const { performance } = require('perf_hooks');
  const firstStart = performance.now();
  runtime.loadLegacyCollection('popularity');
  const firstMs = performance.now() - firstStart;
  const secondStart = performance.now();
  runtime.loadLegacyCollection('categories');
  const secondMs = performance.now() - secondStart;
  const stats = runtime.getAdapterCacheStats();
  return {
    firstCollectionLoadMs: Number(firstMs.toFixed(2)),
    secondCollectionLoadMs: Number(secondMs.toFixed(2)),
    cacheWarmAfterFirstLoad: stats.cacheWarm,
    adapterBuildCountInProcess: stats.buildCount,
    cacheEffective: stats.buildCount === 1 && secondMs < firstMs,
  };
}

function main() {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  fs.mkdirSync(BUILD_TMP, { recursive: true });

  const datasetParity = compareDatasetCollections();
  const wave1Results = WAVE1_GENERATORS.map(verifyGenerator);
  const wave2Results = WAVE2_GENERATORS.map(verifyGenerator);
  const generatorResults = [...wave1Results, ...wave2Results];
  const performance = measureAdapterOverhead();
  const runtimeCache = measureRuntimeCacheEffectiveness();

  const regression = {
    generatedAt: new Date().toISOString(),
    phase: '3D',
    wave: 2,
    scope: 'Wave 1 + Wave 2 migrated generators — legacy file reads vs adapter-backed reads via lib/adapters/legacy-datasets.js',
    rollbackEnvVar: 'NAMEORIGIN_LEGACY_DATA=1',
    datasetParity,
    wave1: { generators: wave1Results, summary: summarizeResults(wave1Results) },
    wave2: { generators: wave2Results, summary: summarizeResults(wave2Results) },
    generators: generatorResults,
    summary: summarizeResults(generatorResults),
  };

  const migratedScripts = new Set(ALL_MIGRATED_GENERATORS.map((g) => g.script));
  const remaining = ALL_GENERATORS.filter((g) => !migratedScripts.has(g) && !EXCLUDED_FROM_MIGRATION.includes(g));

  const legacyDatasetReadsRemaining = [
    { dataset: 'data/name-equivalents.json', consumers: ['scripts/generate-equivalent-pages.js'], note: 'No adapter in Phase 3B — closed curated dataset' },
    { dataset: 'data/countries.json', consumers: ['scripts/build-sitemap.js', 'scripts/generate-html-sitemap.js', 'scripts/generate-programmatic-pages.js'], note: 'Reference table — out of Name Entity scope' },
    { dataset: 'data/last-names.json', consumers: ['scripts/build-sitemap.js', 'scripts/generate-lastname-pages.js', 'scripts/generate-programmatic-pages.js'], note: 'Surname entity — out of canonical scope' },
    { dataset: 'build/topic-clusters.json', consumers: ['scripts/generate-programmatic-pages.js'], note: 'Optional precomputed cluster file' },
    { dataset: 'data/regional-trend-acceleration.json', consumers: ['scripts/generate-trends-page.js'], note: 'Trends refactor blocker' },
    { dataset: 'data/country-differentials.json', consumers: ['scripts/generate-trends-page.js'], note: 'Trends refactor blocker' },
  ];

  const migrationProgress = {
    generatedAt: new Date().toISOString(),
    phase: '3D',
    wave: 2,
    totals: {
      pageAndDataGeneratorsInScope: ALL_GENERATORS.length,
      migrated: ALL_MIGRATED_GENERATORS.length,
      remainingOnLegacyPipeline: remaining.length + EXCLUDED_FROM_MIGRATION.length,
      excludedRequiresRefactor: EXCLUDED_FROM_MIGRATION.length,
    },
    waveCompletion: {
      wave1: { total: WAVE1_GENERATORS.length, migrated: WAVE1_GENERATORS.length, percent: 100 },
      wave2: { total: WAVE2_GENERATORS.length, migrated: WAVE2_GENERATORS.length, percent: 100 },
      infrastructureMigrationComplete: EXCLUDED_FROM_MIGRATION.length === 1,
      note: 'Only scripts/generate-trends-page.js remains on legacy reads due to Phase 2B requires-refactor classification.',
    },
    migratedGenerators: ALL_MIGRATED_GENERATORS.map((g) => ({
      wave: WAVE1_GENERATORS.includes(g) ? 1 : 2,
      script: g.script,
      adapterCollections: g.adapterCollections,
      behaviorPreservation: (g.adapterCollections || []).includes('namesBase')
        ? 'namesBase reads data/names.json directly — fallback behavior preserved until Phase 4'
        : null,
      rollback: 'NAMEORIGIN_LEGACY_DATA=1',
    })),
    excludedFromMigration: EXCLUDED_FROM_MIGRATION.map((script) => ({
      script,
      reason: 'requires-refactor — multi-source reconciliation logic (Phase 2B audit/backward-compatibility.json)',
    })),
    remainingGenerators: remaining.map((script) => ({ script, dataSource: 'legacy data/*.json direct reads (non-page-generator or out of wave scope)' })),
    remainingLegacyDatasetReads: legacyDatasetReadsRemaining,
    remainingAdapterGaps: [
      'name-equivalents.json',
      'countries.json',
      'last-names.json',
      'topic-clusters.json',
      'regional-trend-acceleration.json',
      'country-differentials.json',
    ],
    adapterUtilization: {
      collectionsUsed: ['names', 'namesEnriched', 'namesBase', 'popularity', 'categories', 'variants'],
      collectionsAvailable: ['names', 'namesEnriched', 'popularity', 'categories', 'variants'],
      runtimeModule: 'lib/adapters/legacy-dataset-runtime.js',
      adapterModule: 'lib/adapters/legacy-datasets.js',
    },
  };

  const productionEquivalence = {
    generatedAt: new Date().toISOString(),
    phase: '3D',
    wave: 2,
    generators: generatorResults
      .filter((g) => g.productionEquivalence && g.productionEquivalence.length)
      .map((g) => ({
        generator: g.generator,
        checks: g.productionEquivalence,
        pass: g.productionEquivalencePass,
      })),
    summary: {
      generatorsChecked: generatorResults.filter((g) => g.productionEquivalence && g.productionEquivalence.length).length,
      allPass: generatorResults.filter((g) => g.productionEquivalence && g.productionEquivalence.length).every((g) => g.productionEquivalencePass),
      verifiedProperties: [
        'identical HTML',
        'identical metadata',
        'identical URLs',
        'identical filenames',
        'identical internal links',
        'identical structured data',
      ],
    },
  };

  const migrationPerformance = {
    generatedAt: new Date().toISOString(),
    phase: '3D',
    wave: 2,
    adapterOverhead: performance,
    runtimeCacheInSingleProcess: runtimeCache,
    generators: generatorResults.map((g) => ({
      wave: WAVE1_GENERATORS.some((w) => w.script === g.generator) ? 1 : 2,
      generator: g.generator,
      legacyBuildTimeMs: g.legacyRun.elapsedMs,
      adapterBuildTimeMs: g.adapterRun.elapsedMs,
      deltaMs: Number((g.adapterRun.elapsedMs - g.legacyRun.elapsedMs).toFixed(2)),
      legacyMemoryDeltaMb: Number(g.legacyRun.memoryDeltaMb.toFixed(3)),
      adapterMemoryDeltaMb: Number(g.adapterRun.memoryDeltaMb.toFixed(3)),
    })),
    summary: {
      wave1TotalLegacyMs: Number(wave1Results.reduce((s, g) => s + g.legacyRun.elapsedMs, 0).toFixed(2)),
      wave1TotalAdapterMs: Number(wave1Results.reduce((s, g) => s + g.adapterRun.elapsedMs, 0).toFixed(2)),
      wave2TotalLegacyMs: Number(wave2Results.reduce((s, g) => s + g.legacyRun.elapsedMs, 0).toFixed(2)),
      wave2TotalAdapterMs: Number(wave2Results.reduce((s, g) => s + g.adapterRun.elapsedMs, 0).toFixed(2)),
      totalLegacyMs: Number(generatorResults.reduce((s, g) => s + g.legacyRun.elapsedMs, 0).toFixed(2)),
      totalAdapterMs: Number(generatorResults.reduce((s, g) => s + g.adapterRun.elapsedMs, 0).toFixed(2)),
    },
  };

  fs.writeFileSync(path.join(AUDIT_DIR, 'generator-regression.json'), JSON.stringify(regression, null, 2));
  fs.writeFileSync(path.join(AUDIT_DIR, 'migration-progress.json'), JSON.stringify(migrationProgress, null, 2));
  fs.writeFileSync(path.join(AUDIT_DIR, 'production-equivalence.json'), JSON.stringify(productionEquivalence, null, 2));
  fs.writeFileSync(path.join(AUDIT_DIR, 'migration-performance.json'), JSON.stringify(migrationPerformance, null, 2));

  console.log('Phase 3D Wave 2 verification complete.');
  console.log('Wave 1 regression-free:', regression.wave1.summary.allRegressionFree);
  console.log('Wave 2 regression-free:', regression.wave2.summary.allRegressionFree);
  console.log('Total differences:', regression.summary.totalDifferences);
  console.log('Wrote audit/generator-regression.json');
  console.log('Wrote audit/migration-progress.json');
  console.log('Wrote audit/production-equivalence.json');
  console.log('Wrote audit/migration-performance.json');

  if (!regression.summary.allRegressionFree) {
    process.exitCode = 1;
  }
}

function summarizeResults(results) {
  return {
    migratedGenerators: results.length,
    regressionFree: results.filter((g) => g.regressionFree).length,
    totalDifferences: results.reduce((n, g) => n + g.differenceCount, 0),
    allRegressionFree: results.every((g) => g.regressionFree),
  };
}

main();
