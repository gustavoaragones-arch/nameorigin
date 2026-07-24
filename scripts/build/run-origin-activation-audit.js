#!/usr/bin/env node
/**
 * Phase 4A — Origin Activation audit.
 *
 * Compares baseline HTML (pre-activation output in repo root) with activation
 * builds under build/origin-activation/ after running origin-affected generators.
 *
 * Writes:
 *   audit/origin-activation.json
 *   audit/fallback-reduction.json
 *   audit/truthfulness-improvement.json
 *   audit/render-differences.json
 *
 * Usage:
 *   node scripts/build/run-origin-activation-audit.js              # analyze only
 *   node scripts/build/run-origin-activation-audit.js --build        # rebuild activation output first
 *   node scripts/build/run-origin-activation-audit.js --build --quick  # sibling + compare only
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const AUDIT_DIR = path.join(ROOT, 'audit');
const BASELINE_DIR = ROOT;
const ACTIVATION_DIR = path.join(ROOT, 'build', 'origin-activation');

const {
  FALLBACK_MARKERS,
  DISCLOSED_UNKNOWN_SENTENCE,
  DISCLOSED_UNKNOWN_SHORT,
  DISCLOSED_UNKNOWN_TABLE,
  resolveOrigin,
  isFallbackMarker,
} = require('../../lib/render/origin.js');
const { loadLegacyCollection } = require('../../lib/adapters/legacy-dataset-runtime.js');

const ORIGIN_PAGE_PREFIXES = ['name/', 'names-like/', 'names/'];
const ORIGIN_PAGE_SUFFIX = 'index.html';

const ACTIVATION_GENERATORS = [
  { id: 'generate-programmatic-pages', script: 'scripts/generate-programmatic-pages.js', quick: false },
  { id: 'generate-names-like', script: 'scripts/generate-names-like.js', quick: false },
  { id: 'generate-sibling-pages', script: 'scripts/generate-sibling-pages.js', quick: true },
  { id: 'generate-compare-pages', script: 'scripts/generate-compare-pages.js', quick: true },
];

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function walkHtml(dir, base = dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, base, out);
    else if (entry.isFile() && entry.name === 'index.html') out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

function isOriginAffectedPage(rel) {
  if (!rel.endsWith(ORIGIN_PAGE_SUFFIX)) return false;
  if (rel.startsWith('name/') && rel.split('/').length === 3) return true;
  if (rel.startsWith('names-like/') && rel.split('/').length === 3) return true;
  if (/^names\/[^/]+\/siblings\/index\.html$/.test(rel)) return true;
  return false;
}

function listOriginPages(rootDir) {
  const all = walkHtml(rootDir);
  return all.filter(isOriginAffectedPage).sort();
}

function stripScripts(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '');
}

function visibleText(html) {
  return stripScripts(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function countMarkers(text, markers) {
  const lower = text.toLowerCase();
  let total = 0;
  const byMarker = {};
  for (const marker of markers) {
    let count = 0;
    let idx = 0;
    const m = marker.toLowerCase();
    while ((idx = lower.indexOf(m, idx)) !== -1) {
      count += 1;
      idx += m.length;
    }
    if (count > 0) byMarker[marker] = count;
    total += count;
  }
  return { total, byMarker };
}

function countDisclosed(text) {
  const markers = [DISCLOSED_UNKNOWN_SENTENCE, DISCLOSED_UNKNOWN_SHORT, 'origin not recorded in our sources'];
  return countMarkers(text, markers).total;
}

function extractHrefSet(html) {
  const urls = new Set();
  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) urls.add(m[1]);
  return urls;
}

function extractCanonical(html) {
  const m = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function extractJsonLd(html) {
  const blocks = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) blocks.push(m[1].trim());
  return blocks;
}

function templateForPage(rel) {
  if (rel.startsWith('name/')) return 'name-detail-page';
  if (rel.startsWith('names-like/')) return 'names-like-page';
  if (rel.includes('/siblings/')) return 'sibling-harmony-page';
  return 'other';
}

function analyzePageRoot(rootDir, pages) {
  const byTemplate = {};
  let fallbackTotal = 0;
  let disclosedTotal = 0;
  let researchedPageCount = 0;
  let disclosedPageCount = 0;
  let fallbackPageCount = 0;
  const fallbackByMarker = {};

  for (const rel of pages) {
    const abs = path.join(rootDir, rel);
    if (!fs.existsSync(abs)) continue;
    const html = fs.readFileSync(abs, 'utf8');
    const text = visibleText(html);
    const tpl = templateForPage(rel);
    if (!byTemplate[tpl]) {
      byTemplate[tpl] = {
        pages: 0,
        fallbackOccurrences: 0,
        disclosedOccurrences: 0,
        researchedPages: 0,
        disclosedPages: 0,
        fallbackPages: 0,
      };
    }
    byTemplate[tpl].pages += 1;

    const fb = countMarkers(text, FALLBACK_MARKERS);
    fallbackTotal += fb.total;
    byTemplate[tpl].fallbackOccurrences += fb.total;
    Object.entries(fb.byMarker).forEach(([k, v]) => {
      fallbackByMarker[k] = (fallbackByMarker[k] || 0) + v;
    });
    if (fb.total > 0) {
      fallbackPageCount += 1;
      byTemplate[tpl].fallbackPages += 1;
    }

    const disclosed = countDisclosed(text);
    disclosedTotal += disclosed;
    byTemplate[tpl].disclosedOccurrences += disclosed;
    if (disclosed > 0) {
      disclosedPageCount += 1;
      byTemplate[tpl].disclosedPages += 1;
    }

    const slug = rel.split('/')[1];
    let pageResearched = false;
    if (slug) {
      const names = loadLegacyCollection('namesEnriched');
      const rec = names.find((n) => String(n.name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') === slug);
      if (rec) {
        const o = resolveOrigin(rec);
        if (o.hasOrigin && text.toLowerCase().includes(o.displayLabel.toLowerCase())) {
          pageResearched = true;
          researchedPageCount += 1;
          byTemplate[tpl].researchedPages += 1;
        }
      }
    }
  }

  const pageCount = pages.filter((p) => fs.existsSync(path.join(rootDir, p))).length;
  const truthfulPages = pageCount - fallbackPageCount;
  const truthfulnessRatioPct = pageCount
    ? Number(((100 * truthfulPages) / pageCount).toFixed(1))
    : 0;

  return {
    pageCount,
    fallbackOccurrences: fallbackTotal,
    disclosedOccurrences: disclosedTotal,
    researchedOriginPages: researchedPageCount,
    disclosedPages: disclosedPageCount,
    fallbackPages: fallbackPageCount,
    truthfulPages,
    truthfulnessRatioPct,
    fallbackByMarker,
    byTemplate,
  };
}

function comparePages(baselineDir, activationDir, pages) {
  const diffs = [];
  let unchangedLinks = 0;
  let unchangedCanonical = 0;
  let unchangedStructuredData = 0;
  let byteIdentical = 0;
  let htmlChanged = 0;
  let missingActivation = 0;

  for (const rel of pages) {
    const basePath = path.join(baselineDir, rel);
    const actPath = path.join(activationDir, rel);
    if (!fs.existsSync(basePath)) continue;
    if (!fs.existsSync(actPath)) {
      missingActivation += 1;
      continue;
    }
    const baseHtml = fs.readFileSync(basePath, 'utf8');
    const actHtml = fs.readFileSync(actPath, 'utf8');
    if (baseHtml === actHtml) {
      byteIdentical += 1;
    } else {
      htmlChanged += 1;
      diffs.push({
        path: rel,
        template: templateForPage(rel),
        baselineSha256: sha256(baseHtml),
        activationSha256: sha256(actHtml),
        baselineBytes: baseHtml.length,
        activationBytes: actHtml.length,
      });
    }

    const baseLinks = extractHrefSet(baseHtml);
    const actLinks = extractHrefSet(actHtml);
    if (baseLinks.size === actLinks.size && [...baseLinks].every((u) => actLinks.has(u))) unchangedLinks += 1;

    if (extractCanonical(baseHtml) === extractCanonical(actHtml)) unchangedCanonical += 1;

    const baseLd = JSON.stringify(extractJsonLd(baseHtml));
    const actLd = JSON.stringify(extractJsonLd(actHtml));
    if (baseLd === actLd) unchangedStructuredData += 1;
  }

  return {
    pagesCompared: pages.filter((p) => fs.existsSync(path.join(baselineDir, p))).length,
    htmlPagesChanged: htmlChanged,
    htmlPagesByteIdentical: byteIdentical,
    missingActivationOutput: missingActivation,
    internalLinksUnchanged: unchangedLinks,
    canonicalUrlsUnchanged: unchangedCanonical,
    structuredDataUnchanged: unchangedStructuredData,
    sampleDiffs: diffs.slice(0, 25),
    allDiffCount: diffs.length,
  };
}

function datasetUtilization() {
  const names = loadLegacyCollection('namesEnriched');
  let researched = 0;
  let unknown = 0;
  for (const rec of names) {
    if (resolveOrigin(rec).hasOrigin) researched += 1;
    else unknown += 1;
  }
  return {
    totalNames: names.length,
    canonicalOriginAvailable: researched,
    canonicalOriginMissing: unknown,
    canonicalOriginUtilizationPct: names.length ? Number(((100 * researched) / names.length).toFixed(1)) : 0,
  };
}

function runGenerators(quick) {
  fs.mkdirSync(ACTIVATION_DIR, { recursive: true });
  const gens = ACTIVATION_GENERATORS.filter((g) => !quick || g.quick);
  const results = [];
  for (const g of gens) {
    const started = Date.now();
    const result = spawnSync('node', [path.join(ROOT, g.script)], {
      cwd: ROOT,
      env: { ...process.env, OUT_DIR: path.relative(ROOT, ACTIVATION_DIR), NAMEORIGIN_LEGACY_DATA: '0' },
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
    });
    results.push({
      id: g.id,
      ok: result.status === 0,
      status: result.status,
      elapsedMs: Date.now() - started,
      stderrTail: (result.stderr || '').slice(-500),
    });
    if (result.status !== 0) {
      console.error('Generator failed:', g.id, result.stderr);
    }
  }
  return results;
}

function main() {
  const doBuild = process.argv.includes('--build');
  const quick = process.argv.includes('--quick');

  fs.mkdirSync(AUDIT_DIR, { recursive: true });

  if (doBuild) {
    console.log('Building activation output under build/origin-activation/ ...');
    const buildResults = runGenerators(quick);
    fs.writeFileSync(
      path.join(AUDIT_DIR, 'origin-activation-build-log.json'),
      JSON.stringify({ generatedAt: new Date().toISOString(), quick, buildResults }, null, 2)
    );
  }

  const baselinePages = listOriginPages(BASELINE_DIR);
  const activationPages = listOriginPages(ACTIVATION_DIR);
  const pageUnion = [...new Set([...baselinePages, ...activationPages])].sort();

  const baselineAnalysis = analyzePageRoot(BASELINE_DIR, baselinePages);
  const activationAnalysis = fs.existsSync(ACTIVATION_DIR)
    ? analyzePageRoot(ACTIVATION_DIR, pageUnion.filter((p) => fs.existsSync(path.join(ACTIVATION_DIR, p))))
    : null;

  const utilization = datasetUtilization();

  const fallbackReductionPct = baselineAnalysis.fallbackOccurrences
    ? Number(
        (
          (100 * (baselineAnalysis.fallbackOccurrences - (activationAnalysis?.fallbackOccurrences || 0))) /
          baselineAnalysis.fallbackOccurrences
        ).toFixed(1)
      )
    : null;

  const originActivation = {
    phase: '4A',
    title: 'Origin Activation',
    generatedAt: new Date().toISOString(),
    scope: {
      generators: [
        'scripts/generate-programmatic-pages.js',
        'scripts/generate-names-like.js',
        'scripts/generate-sibling-pages.js',
        'scripts/generate-compare-pages.js',
      ],
      dataSource: 'namesEnriched (canonical enriched origin)',
      policyModule: 'lib/render/origin.js',
      pagesInScope: pageUnion.length,
    },
    dataset: utilization,
    baseline: baselineAnalysis,
    activation: activationAnalysis,
    successMetrics: {
      fallbackReductionPct,
      researchedOriginCoveragePct: activationAnalysis && activationAnalysis.pageCount
        ? Number(((100 * activationAnalysis.researchedOriginPages) / activationAnalysis.pageCount).toFixed(1))
        : null,
      disclosedMissingPageCoveragePct: activationAnalysis && activationAnalysis.pageCount
        ? Number(((100 * activationAnalysis.disclosedPages) / activationAnalysis.pageCount).toFixed(1))
        : null,
      disclosedMissingOccurrences: activationAnalysis?.disclosedOccurrences ?? null,
      htmlPagesChanged: null,
      canonicalOriginUtilizationPct: utilization.canonicalOriginUtilizationPct,
      activationTruthfulnessRatioPct: activationAnalysis?.truthfulnessRatioPct ?? null,
    },
    validation: {
      urlsUnchanged: null,
      internalLinksUnchanged: null,
      structuredDataUnchangedExceptOrigin: null,
    },
  };

  const renderDiff = comparePages(BASELINE_DIR, ACTIVATION_DIR, pageUnion);
  originActivation.successMetrics.htmlPagesChanged = renderDiff.htmlPagesChanged;
  originActivation.validation.urlsUnchanged = renderDiff.pagesCompared
    ? renderDiff.canonicalUrlsUnchanged === renderDiff.pagesCompared
    : null;
  originActivation.validation.internalLinksUnchanged = renderDiff.pagesCompared
    ? renderDiff.internalLinksUnchanged === renderDiff.pagesCompared
    : null;
  originActivation.validation.structuredDataUnchangedExceptOrigin = renderDiff.pagesCompared
    ? renderDiff.structuredDataUnchanged === renderDiff.pagesCompared
    : null;

  const fallbackReduction = {
    generatedAt: new Date().toISOString(),
    baselineFallbackOccurrences: baselineAnalysis.fallbackOccurrences,
    activationFallbackOccurrences: activationAnalysis?.fallbackOccurrences ?? null,
    fallbackReductionPct,
    baselineByMarker: baselineAnalysis.fallbackByMarker,
    activationByMarker: activationAnalysis?.fallbackByMarker ?? null,
    byTemplate: {
      baseline: baselineAnalysis.byTemplate,
      activation: activationAnalysis?.byTemplate ?? null,
    },
  };

  const baselineTruth = baselineAnalysis.truthfulnessRatioPct;
  const activationTruth = activationAnalysis?.truthfulnessRatioPct ?? null;

  const truthfulnessImprovement = {
    generatedAt: new Date().toISOString(),
    method:
      'Page-level origin truthfulness ratio: share of origin-affected pages with zero fallback-marker hits. Researched and disclosed-unknown pages both count as truthful; fallback prose counts against the ratio. Assertion-level detail remains in audit/truthfulness-matrix.json (Phase 1C).',
    baseline: {
      originAffectedPages: baselineAnalysis.pageCount,
      fallbackOccurrences: baselineAnalysis.fallbackOccurrences,
      fallbackPages: baselineAnalysis.fallbackPages,
      disclosedOccurrences: baselineAnalysis.disclosedOccurrences,
      disclosedPages: baselineAnalysis.disclosedPages,
      researchedOriginPages: baselineAnalysis.researchedOriginPages,
      truthfulPages: baselineAnalysis.truthfulPages,
      truthfulnessRatioPct: baselineTruth,
    },
    activation: activationAnalysis
      ? {
          originAffectedPages: activationAnalysis.pageCount,
          fallbackOccurrences: activationAnalysis.fallbackOccurrences,
          fallbackPages: activationAnalysis.fallbackPages,
          disclosedOccurrences: activationAnalysis.disclosedOccurrences,
          disclosedPages: activationAnalysis.disclosedPages,
          researchedOriginPages: activationAnalysis.researchedOriginPages,
          truthfulPages: activationAnalysis.truthfulPages,
          truthfulnessRatioPct: activationTruth,
        }
      : null,
    truthfulnessIncreasePct:
      activationTruth != null ? Number((activationTruth - baselineTruth).toFixed(1)) : null,
  };

  fs.writeFileSync(path.join(AUDIT_DIR, 'origin-activation.json'), JSON.stringify(originActivation, null, 2));
  fs.writeFileSync(path.join(AUDIT_DIR, 'fallback-reduction.json'), JSON.stringify(fallbackReduction, null, 2));
  fs.writeFileSync(
    path.join(AUDIT_DIR, 'truthfulness-improvement.json'),
    JSON.stringify(truthfulnessImprovement, null, 2)
  );
  fs.writeFileSync(path.join(AUDIT_DIR, 'render-differences.json'), JSON.stringify(renderDiff, null, 2));

  console.log('Phase 4A origin activation audit complete.');
  console.log('  Baseline pages:', baselineAnalysis.pageCount, '| fallback markers:', baselineAnalysis.fallbackOccurrences);
  if (activationAnalysis) {
    console.log('  Activation pages:', activationAnalysis.pageCount, '| fallback markers:', activationAnalysis.fallbackOccurrences);
    console.log('  HTML pages changed:', renderDiff.htmlPagesChanged);
    console.log('  Fallback reduction:', fallbackReductionPct != null ? fallbackReductionPct + '%' : 'n/a');
  } else {
    console.log('  No activation build found. Re-run with --build to populate build/origin-activation/.');
  }
  console.log('Wrote audit/origin-activation.json, fallback-reduction.json, truthfulness-improvement.json, render-differences.json');
}

main();
