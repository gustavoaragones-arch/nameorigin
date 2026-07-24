#!/usr/bin/env node
/**
 * Phase 4B — Meaning Activation audit.
 *
 * Compares baseline HTML (post–Phase 4A activation output when present) with
 * meaning-activation builds under build/meaning-activation/.
 *
 * Diff categories:
 *   semantic            — intended meaning truthfulness changes
 *   generator-drift     — href/layout changes unrelated to meaning policy
 *   build-environment   — timestamps or non-meaning schema churn
 *
 * Writes:
 *   audit/meaning-activation.json
 *   audit/meaning-fallback-reduction.json
 *   audit/meaning-truthfulness.json
 *   audit/meaning-render-differences.json
 *
 * Usage:
 *   node scripts/build/run-meaning-activation-audit.js
 *   node scripts/build/run-meaning-activation-audit.js --build
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const AUDIT_DIR = path.join(ROOT, 'audit');
const ORIGIN_ACTIVATION_DIR = path.join(ROOT, 'build', 'origin-activation');
const BASELINE_DIR = fs.existsSync(ORIGIN_ACTIVATION_DIR) ? ORIGIN_ACTIVATION_DIR : ROOT;
const ACTIVATION_DIR = path.join(ROOT, 'build', 'meaning-activation');

const {
  FALLBACK_MARKERS,
  DISCLOSED_UNKNOWN_SENTENCE,
  DISCLOSED_UNKNOWN_SHORT,
  resolveMeaning,
} = require('../../lib/render/meaning.js');
const { loadLegacyCollection } = require('../../lib/adapters/legacy-dataset-runtime.js');

const MEANING_GENERATORS = [
  { id: 'generate-programmatic-pages', script: 'scripts/generate-programmatic-pages.js' },
  { id: 'generate-names-like', script: 'scripts/generate-names-like.js' },
];

const FOOTER_DRIFT_MARKERS = [
  'mailto:contact@nameorigin.io',
  '/sitemap/',
  '/popularity/',
  '/names/',
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

function isMeaningAffectedPage(rel) {
  if (!rel.endsWith('index.html')) return false;
  if (rel.startsWith('name/') && rel.split('/').length === 3) return true;
  if (rel.startsWith('names-like/') && rel.split('/').length === 3) return true;
  return false;
}

function listMeaningPages(rootDir) {
  return walkHtml(rootDir).filter(isMeaningAffectedPage).sort();
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
  return countMarkers(text, [DISCLOSED_UNKNOWN_SENTENCE, DISCLOSED_UNKNOWN_SHORT]).total;
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

function normalizeJsonLdForMeaningCompare(jsonLdBlocks) {
  return jsonLdBlocks.map((block) => {
    try {
      const parsed = JSON.parse(block);
      const stripDates = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(stripDates);
        const out = {};
        Object.keys(obj).forEach((k) => {
          if (k === 'dateModified' || k === 'datePublished') return;
          out[k] = stripDates(obj[k]);
        });
        return out;
      };
      return JSON.stringify(stripDates(parsed));
    } catch (_) {
      return block;
    }
  });
}

function templateForPage(rel) {
  if (rel.startsWith('name/')) return 'name-detail-page';
  if (rel.startsWith('names-like/')) return 'names-like-page';
  return 'other';
}

function recordForPageRel(rel) {
  const slug = rel.split('/')[1];
  if (!slug) return null;
  const names = loadLegacyCollection('namesEnriched');
  return names.find((n) => String(n.name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') === slug) || null;
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

    const rec = recordForPageRel(rel);
    if (rec) {
      const m = resolveMeaning(rec);
      if (m.hasMeaning && text.toLowerCase().includes(m.displayText.toLowerCase().slice(0, 20))) {
        researchedPageCount += 1;
        byTemplate[tpl].researchedPages += 1;
      }
    }
  }

  const pageCount = pages.filter((p) => fs.existsSync(path.join(rootDir, p))).length;
  const truthfulPages = pageCount - fallbackPageCount;
  const truthfulnessRatioPct = pageCount ? Number(((100 * truthfulPages) / pageCount).toFixed(1)) : 0;

  return {
    pageCount,
    fallbackOccurrences: fallbackTotal,
    disclosedOccurrences: disclosedTotal,
    researchedMeaningPages: researchedPageCount,
    disclosedPages: disclosedPageCount,
    fallbackPages: fallbackPageCount,
    truthfulPages,
    truthfulnessRatioPct,
    fallbackByMarker,
    byTemplate,
  };
}

function classifyPageDiff(baselineHtml, activationHtml) {
  const baseText = visibleText(baselineHtml);
  const actText = visibleText(activationHtml);
  const baseFb = countMarkers(baseText, FALLBACK_MARKERS).total;
  const actFb = countMarkers(actText, FALLBACK_MARKERS).total;
  const baseDis = countDisclosed(baseText);
  const actDis = countDisclosed(actText);
  const semantic =
    baseFb !== actFb ||
    baseDis !== actDis ||
    (baseText.includes('documented given name') && !actText.includes('documented given name'));

  const baseLinks = extractHrefSet(baselineHtml);
  const actLinks = extractHrefSet(activationHtml);
  const linksChanged =
    baseLinks.size !== actLinks.size || [...baseLinks].some((u) => !actLinks.has(u));
  const generatorDrift = linksChanged && !semantic;

  const baseLd = normalizeJsonLdForMeaningCompare(extractJsonLd(baselineHtml));
  const actLd = normalizeJsonLdForMeaningCompare(extractJsonLd(activationHtml));
  const jsonLdChanged = JSON.stringify(baseLd) !== JSON.stringify(actLd);
  const buildEnvironment =
    jsonLdChanged &&
    !semantic &&
    baselineHtml.replace(/dateModified[^,}]+/g, '') === activationHtml.replace(/dateModified[^,}]+/g, '');

  let category = 'unchanged';
  if (baselineHtml === activationHtml) category = 'unchanged';
  else if (semantic) category = 'semantic';
  else if (generatorDrift) category = 'generator-drift';
  else if (buildEnvironment) category = 'build-environment';
  else if (jsonLdChanged) category = 'semantic';
  else category = 'other-html';

  return {
    category,
    semantic,
    generatorDrift,
    buildEnvironment,
    linksChanged,
    jsonLdChanged,
    canonicalUnchanged: extractCanonical(baselineHtml) === extractCanonical(activationHtml),
  };
}

function comparePages(baselineDir, activationDir, pages) {
  const diffs = [];
  const categories = {
    semantic: 0,
    'generator-drift': 0,
    'build-environment': 0,
    'other-html': 0,
    unchanged: 0,
  };
  let canonicalUnchanged = 0;
  let linksUnchanged = 0;
  let jsonLdMeaningStable = 0;

  for (const rel of pages) {
    const basePath = path.join(baselineDir, rel);
    const actPath = path.join(activationDir, rel);
    if (!fs.existsSync(basePath) || !fs.existsSync(actPath)) continue;

    const baseHtml = fs.readFileSync(basePath, 'utf8');
    const actHtml = fs.readFileSync(actPath, 'utf8');
    const cls = classifyPageDiff(baseHtml, actHtml);
    categories[cls.category] = (categories[cls.category] || 0) + 1;

    if (cls.canonicalUnchanged) canonicalUnchanged += 1;
    if (!cls.linksChanged) linksUnchanged += 1;
    if (!cls.jsonLdChanged || cls.semantic) jsonLdMeaningStable += 1;

    if (baseHtml !== actHtml) {
      diffs.push({
        path: rel,
        template: templateForPage(rel),
        category: cls.category,
        baselineSha256: sha256(baseHtml),
        activationSha256: sha256(actHtml),
      });
    }
  }

  const pagesCompared = pages.filter(
    (p) => fs.existsSync(path.join(baselineDir, p)) && fs.existsSync(path.join(activationDir, p)),
  ).length;

  return {
    baselineSource: path.relative(ROOT, baselineDir),
    pagesCompared,
    htmlPagesChanged: diffs.length,
    diffCategories: categories,
    canonicalUrlsUnchanged: pagesCompared ? canonicalUnchanged === pagesCompared : null,
    internalLinksUnchanged: pagesCompared ? linksUnchanged === pagesCompared : null,
    jsonLdStableExceptMeaning: pagesCompared ? jsonLdMeaningStable === pagesCompared : null,
    sampleDiffs: diffs.filter((d) => d.category === 'semantic').slice(0, 25),
    allDiffCount: diffs.length,
  };
}

function datasetUtilization() {
  const names = loadLegacyCollection('namesEnriched');
  let researched = 0;
  for (const rec of names) {
    if (resolveMeaning(rec).hasMeaning) researched += 1;
  }
  return {
    totalNames: names.length,
    canonicalMeaningAvailable: researched,
    canonicalMeaningMissing: names.length - researched,
    canonicalMeaningUtilizationPct: names.length ? Number(((100 * researched) / names.length).toFixed(2)) : 0,
  };
}

function runGenerators() {
  fs.mkdirSync(ACTIVATION_DIR, { recursive: true });
  return MEANING_GENERATORS.map((g) => {
    const started = Date.now();
    const result = spawnSync('node', [path.join(ROOT, g.script)], {
      cwd: ROOT,
      env: { ...process.env, OUT_DIR: path.relative(ROOT, ACTIVATION_DIR), NAMEORIGIN_LEGACY_DATA: '0' },
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
    });
    return {
      id: g.id,
      ok: result.status === 0,
      status: result.status,
      elapsedMs: Date.now() - started,
      stderrTail: (result.stderr || '').slice(-400),
    };
  });
}

function main() {
  const doBuild = process.argv.includes('--build');
  fs.mkdirSync(AUDIT_DIR, { recursive: true });

  if (doBuild) {
    console.log('Building meaning activation output under build/meaning-activation/ ...');
    const buildResults = runGenerators();
    fs.writeFileSync(
      path.join(AUDIT_DIR, 'meaning-activation-build-log.json'),
      JSON.stringify({ generatedAt: new Date().toISOString(), buildResults }, null, 2),
    );
  }

  const baselinePages = listMeaningPages(BASELINE_DIR);
  const activationPages = listMeaningPages(ACTIVATION_DIR);
  const pageUnion = [...new Set([...baselinePages, ...activationPages])].sort();

  const baselineAnalysis = analyzePageRoot(BASELINE_DIR, baselinePages);
  const activationAnalysis = fs.existsSync(ACTIVATION_DIR)
    ? analyzePageRoot(
        ACTIVATION_DIR,
        pageUnion.filter((p) => fs.existsSync(path.join(ACTIVATION_DIR, p))),
      )
    : null;

  const utilization = datasetUtilization();
  const fallbackReductionPct =
    baselineAnalysis.fallbackOccurrences > 0 && activationAnalysis
      ? Number(
          (
            (100 * (baselineAnalysis.fallbackOccurrences - activationAnalysis.fallbackOccurrences)) /
            baselineAnalysis.fallbackOccurrences
          ).toFixed(1),
        )
      : null;

  const renderDiff = comparePages(BASELINE_DIR, ACTIVATION_DIR, pageUnion);

  const meaningActivation = {
    phase: '4B',
    title: 'Meaning Activation',
    generatedAt: new Date().toISOString(),
    scope: {
      policyModule: 'lib/render/meaning.js',
      generators: MEANING_GENERATORS.map((g) => g.script),
      pagesInScope: pageUnion.length,
      baselineHtmlSource: renderDiff.baselineSource,
    },
    dataset: utilization,
    baseline: baselineAnalysis,
    activation: activationAnalysis,
    successMetrics: {
      fallbackReductionPct,
      researchedMeaningPageCoveragePct:
        activationAnalysis && activationAnalysis.pageCount
          ? Number(((100 * activationAnalysis.researchedMeaningPages) / activationAnalysis.pageCount).toFixed(2))
          : null,
      disclosedMissingPageCoveragePct:
        activationAnalysis && activationAnalysis.pageCount
          ? Number(((100 * activationAnalysis.disclosedPages) / activationAnalysis.pageCount).toFixed(1))
          : null,
      htmlPagesChanged: renderDiff.htmlPagesChanged,
      semanticDiffPages: renderDiff.diffCategories.semantic,
      canonicalMeaningUtilizationPct: utilization.canonicalMeaningUtilizationPct,
      activationTruthfulnessRatioPct: activationAnalysis?.truthfulnessRatioPct ?? null,
    },
    validation: {
      urlsUnchanged: renderDiff.canonicalUrlsUnchanged,
      internalLinksUnchanged: renderDiff.internalLinksUnchanged,
      diffCategoryBreakdown: renderDiff.diffCategories,
    },
  };

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

  const truthfulnessImprovement = {
    generatedAt: new Date().toISOString(),
    method:
      'Page-level meaning truthfulness ratio: share of meaning-affected pages with zero meaning-fallback-marker hits. Researched-meaning and disclosed-unknown pages count as truthful.',
    baseline: {
      meaningAffectedPages: baselineAnalysis.pageCount,
      fallbackOccurrences: baselineAnalysis.fallbackOccurrences,
      fallbackPages: baselineAnalysis.fallbackPages,
      disclosedPages: baselineAnalysis.disclosedPages,
      researchedMeaningPages: baselineAnalysis.researchedMeaningPages,
      truthfulPages: baselineAnalysis.truthfulPages,
      truthfulnessRatioPct: baselineAnalysis.truthfulnessRatioPct,
    },
    activation: activationAnalysis
      ? {
          meaningAffectedPages: activationAnalysis.pageCount,
          fallbackOccurrences: activationAnalysis.fallbackOccurrences,
          fallbackPages: activationAnalysis.fallbackPages,
          disclosedPages: activationAnalysis.disclosedPages,
          researchedMeaningPages: activationAnalysis.researchedMeaningPages,
          truthfulPages: activationAnalysis.truthfulPages,
          truthfulnessRatioPct: activationAnalysis.truthfulnessRatioPct,
        }
      : null,
    truthfulnessIncreasePct: activationAnalysis
      ? Number((activationAnalysis.truthfulnessRatioPct - baselineAnalysis.truthfulnessRatioPct).toFixed(1))
      : null,
  };

  fs.writeFileSync(path.join(AUDIT_DIR, 'meaning-activation.json'), JSON.stringify(meaningActivation, null, 2));
  fs.writeFileSync(
    path.join(AUDIT_DIR, 'meaning-fallback-reduction.json'),
    JSON.stringify(fallbackReduction, null, 2),
  );
  fs.writeFileSync(
    path.join(AUDIT_DIR, 'meaning-truthfulness.json'),
    JSON.stringify(truthfulnessImprovement, null, 2),
  );
  fs.writeFileSync(path.join(AUDIT_DIR, 'meaning-render-differences.json'), JSON.stringify(renderDiff, null, 2));

  console.log('Phase 4B meaning activation audit complete.');
  console.log('  Baseline:', renderDiff.baselineSource, '| pages:', baselineAnalysis.pageCount);
  console.log('  Baseline meaning fallback markers:', baselineAnalysis.fallbackOccurrences);
  if (activationAnalysis) {
    console.log('  Activation meaning fallback markers:', activationAnalysis.fallbackOccurrences);
    console.log('  Semantic HTML changes:', renderDiff.diffCategories.semantic);
    console.log('  Generator drift pages:', renderDiff.diffCategories['generator-drift']);
    console.log('  Fallback reduction:', fallbackReductionPct != null ? fallbackReductionPct + '%' : 'n/a');
  } else {
    console.log('  No activation build found. Re-run with --build.');
  }
}

main();
