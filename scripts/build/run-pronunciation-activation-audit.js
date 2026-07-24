#!/usr/bin/env node
/**
 * Phase 4C — Pronunciation Activation audit.
 *
 * Compares baseline HTML (post–Phase 4B activation output when present) with
 * pronunciation-activation builds under build/pronunciation-activation/.
 *
 * Diff categories:
 *   semantic            — intended pronunciation truthfulness changes
 *   generator-drift     — href/layout changes unrelated to pronunciation policy
 *   build-environment   — timestamps or non-pronunciation schema churn
 *
 * Writes:
 *   audit/pronunciation-activation.json
 *   audit/pronunciation-truthfulness.json
 *   audit/pronunciation-render-differences.json
 *   audit/pronunciation-normalization.json
 *
 * Usage:
 *   node scripts/build/run-pronunciation-activation-audit.js
 *   node scripts/build/run-pronunciation-activation-audit.js --build
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const AUDIT_DIR = path.join(ROOT, 'audit');
const MEANING_ACTIVATION_DIR = path.join(ROOT, 'build', 'meaning-activation');
const BASELINE_DIR = fs.existsSync(MEANING_ACTIVATION_DIR) ? MEANING_ACTIVATION_DIR : ROOT;
const ACTIVATION_DIR = path.join(ROOT, 'build', 'pronunciation-activation');

const {
  FALLBACK_MARKERS,
  DISCLOSED_UNKNOWN_SENTENCE,
  DISCLOSED_UNKNOWN_SHORT,
  resolvePronunciation,
} = require('../../lib/render/pronunciation.js');
const { loadLegacyCollection } = require('../../lib/adapters/legacy-dataset-runtime.js');

const PRONUNCIATION_GENERATORS = [
  { id: 'generate-programmatic-pages', script: 'scripts/generate-programmatic-pages.js' },
];

const RETIRED_PLACEHOLDERS = [
  'easy pronunciation and spelling',
  'easy to pronounce',
  'phonetic guide on file',
  'ask speakers you trust',
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

function isPronunciationAffectedPage(rel) {
  if (!rel.endsWith('index.html')) return false;
  if (rel.startsWith('name/') && rel.split('/').length === 3) return true;
  return false;
}

function listPronunciationPages(rootDir) {
  return walkHtml(rootDir).filter(isPronunciationAffectedPage).sort();
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

function normalizeJsonLdForPronunciationCompare(jsonLdBlocks) {
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

function recordForPageRel(rel) {
  const slug = rel.split('/')[1];
  if (!slug) return null;
  const names = loadLegacyCollection('namesEnriched');
  return (
    names.find(
      (n) =>
        String(n.name || '')
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '') === slug,
    ) || null
  );
}

function analyzePageRoot(rootDir, pages) {
  let fallbackTotal = 0;
  let disclosedTotal = 0;
  let availablePageCount = 0;
  let disclosedPageCount = 0;
  let fallbackPageCount = 0;
  let pronunciationBlockCount = 0;
  const fallbackByMarker = {};
  const retiredPlaceholderByMarker = {};

  for (const rel of pages) {
    const abs = path.join(rootDir, rel);
    if (!fs.existsSync(abs)) continue;
    const html = fs.readFileSync(abs, 'utf8');
    const text = visibleText(html);

    const fb = countMarkers(text, FALLBACK_MARKERS);
    fallbackTotal += fb.total;
    Object.entries(fb.byMarker).forEach(([k, v]) => {
      fallbackByMarker[k] = (fallbackByMarker[k] || 0) + v;
    });
    if (fb.total > 0) fallbackPageCount += 1;

    const retired = countMarkers(text, RETIRED_PLACEHOLDERS);
    Object.entries(retired.byMarker).forEach(([k, v]) => {
      retiredPlaceholderByMarker[k] = (retiredPlaceholderByMarker[k] || 0) + v;
    });

    const disclosed = countDisclosed(text);
    disclosedTotal += disclosed;
    if (disclosed > 0) disclosedPageCount += 1;

    if (text.includes('Pronunciation:')) pronunciationBlockCount += 1;

    const rec = recordForPageRel(rel);
    if (rec) {
      const p = resolvePronunciation(rec);
      if (p.hasPronunciation && text.includes(p.displayText)) availablePageCount += 1;
    }
  }

  const pageCount = pages.filter((p) => fs.existsSync(path.join(rootDir, p))).length;
  const truthfulPages = pageCount - fallbackPageCount;
  const truthfulnessRatioPct = pageCount ? Number(((100 * truthfulPages) / pageCount).toFixed(1)) : 0;

  return {
    pageCount,
    fallbackOccurrences: fallbackTotal,
    disclosedOccurrences: disclosedTotal,
    availablePronunciationPages: availablePageCount,
    disclosedPages: disclosedPageCount,
    fallbackPages: fallbackPageCount,
    pronunciationBlockPages: pronunciationBlockCount,
    truthfulPages,
    truthfulnessRatioPct,
    fallbackByMarker,
    retiredPlaceholderByMarker,
    retiredPlaceholderOccurrences: countMarkers(
      pages
        .filter((p) => fs.existsSync(path.join(rootDir, p)))
        .map((p) => visibleText(fs.readFileSync(path.join(rootDir, p), 'utf8')))
        .join(' '),
      RETIRED_PLACEHOLDERS,
    ).total,
  };
}

function analyzeNormalization(rootDir, pages) {
  let disclosedExact = 0;
  let disclosedMissingBlock = 0;
  let availableExact = 0;
  let availableMismatch = 0;
  let emptyWithoutDisclosed = 0;

  for (const rel of pages) {
    const abs = path.join(rootDir, rel);
    if (!fs.existsSync(abs)) continue;
    const html = fs.readFileSync(abs, 'utf8');
    const text = visibleText(html);
    const rec = recordForPageRel(rel);
    if (!rec) continue;
    const p = resolvePronunciation(rec);

    if (p.hasPronunciation) {
      if (text.includes(p.displayText)) availableExact += 1;
      else availableMismatch += 1;
    } else {
      if (text.includes(DISCLOSED_UNKNOWN_SENTENCE)) disclosedExact += 1;
      else emptyWithoutDisclosed += 1;
      if (!text.includes('Pronunciation:')) disclosedMissingBlock += 1;
    }
  }

  const pageCount = pages.filter((p) => fs.existsSync(path.join(rootDir, p))).length;
  return {
    pageCount,
    availableExactMatchPages: availableExact,
    availableMismatchPages: availableMismatch,
    emptyDisclosedExactPages: disclosedExact,
    emptyWithoutDisclosedPages: emptyWithoutDisclosed,
    missingPronunciationBlockPages: disclosedMissingBlock,
    disclosedSentencePolicy: DISCLOSED_UNKNOWN_SENTENCE,
    singlePolicyCompliancePct:
      pageCount && !availableExact
        ? Number(((100 * disclosedExact) / pageCount).toFixed(1))
        : pageCount
          ? Number((((availableExact + disclosedExact) * 100) / pageCount).toFixed(1))
          : 0,
  };
}

function classifyPageDiff(baselineHtml, activationHtml) {
  const baseText = visibleText(baselineHtml);
  const actText = visibleText(activationHtml);
  const baseFb = countMarkers(baseText, [...FALLBACK_MARKERS, ...RETIRED_PLACEHOLDERS]).total;
  const actFb = countMarkers(actText, [...FALLBACK_MARKERS, ...RETIRED_PLACEHOLDERS]).total;
  const baseDis = countDisclosed(baseText);
  const actDis = countDisclosed(actText);
  const semantic =
    baseFb !== actFb ||
    baseDis !== actDis ||
    baseText.includes('Easy pronunciation and spelling') ||
    actText.includes(DISCLOSED_UNKNOWN_SENTENCE) !== baseText.includes(DISCLOSED_UNKNOWN_SENTENCE);

  const baseLinks = extractHrefSet(baselineHtml);
  const actLinks = extractHrefSet(activationHtml);
  const linksChanged =
    baseLinks.size !== actLinks.size || [...baseLinks].some((u) => !actLinks.has(u));
  const generatorDrift = linksChanged && !semantic;

  const baseLd = normalizeJsonLdForPronunciationCompare(extractJsonLd(baselineHtml));
  const actLd = normalizeJsonLdForPronunciationCompare(extractJsonLd(activationHtml));
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
  let jsonLdPronunciationStable = 0;

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
    if (!cls.jsonLdChanged || cls.semantic) jsonLdPronunciationStable += 1;

    if (baseHtml !== actHtml) {
      diffs.push({
        path: rel,
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
    jsonLdStableExceptPronunciation: pagesCompared ? jsonLdPronunciationStable === pagesCompared : null,
    sampleDiffs: diffs.filter((d) => d.category === 'semantic').slice(0, 25),
    allDiffCount: diffs.length,
  };
}

function datasetUtilization() {
  const names = loadLegacyCollection('namesEnriched');
  let available = 0;
  for (const rec of names) {
    if (resolvePronunciation(rec).hasPronunciation) available += 1;
  }
  return {
    totalNames: names.length,
    storedPronunciationAvailable: available,
    storedPronunciationMissing: names.length - available,
    storedPronunciationUtilizationPct: names.length ? Number(((100 * available) / names.length).toFixed(2)) : 0,
  };
}

function verifyGeneratorPolicy() {
  const scriptPath = path.join(ROOT, 'scripts/generate-programmatic-pages.js');
  const src = fs.readFileSync(scriptPath, 'utf8');
  const usesPolicyModule = src.includes("require('../lib/render/pronunciation.js')");
  const rawPhoneticDisplay =
    /record\.phonetic\s*\?\s*[`'"]/.test(src) ||
    (/record\.phonetic/.test(src) && !src.includes('resolvePronunciation(record)'));
  return {
    policyModule: 'lib/render/pronunciation.js',
    generatorUsesPolicyModule: usesPolicyModule,
    rawPhoneticDisplayInGenerator: rawPhoneticDisplay,
    renderingFlowsThroughPolicyModule: usesPolicyModule && !rawPhoneticDisplay,
  };
}

function runGenerators() {
  fs.mkdirSync(ACTIVATION_DIR, { recursive: true });
  return PRONUNCIATION_GENERATORS.map((g) => {
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
    console.log('Building pronunciation activation output under build/pronunciation-activation/ ...');
    const buildResults = runGenerators();
    fs.writeFileSync(
      path.join(AUDIT_DIR, 'pronunciation-activation-build-log.json'),
      JSON.stringify({ generatedAt: new Date().toISOString(), buildResults }, null, 2),
    );
  }

  const baselinePages = listPronunciationPages(BASELINE_DIR);
  const activationPages = listPronunciationPages(ACTIVATION_DIR);
  const pageUnion = [...new Set([...baselinePages, ...activationPages])].sort();

  const baselineAnalysis = analyzePageRoot(BASELINE_DIR, baselinePages);
  const activationAnalysis = fs.existsSync(ACTIVATION_DIR)
    ? analyzePageRoot(
        ACTIVATION_DIR,
        pageUnion.filter((p) => fs.existsSync(path.join(ACTIVATION_DIR, p))),
      )
    : null;

  const utilization = datasetUtilization();
  const policyCheck = verifyGeneratorPolicy();
  const fallbackReductionPct =
    baselineAnalysis.fallbackOccurrences + baselineAnalysis.retiredPlaceholderOccurrences > 0 &&
    activationAnalysis
      ? Number(
          (
            (100 *
              (baselineAnalysis.fallbackOccurrences +
                baselineAnalysis.retiredPlaceholderOccurrences -
                activationAnalysis.fallbackOccurrences -
                activationAnalysis.retiredPlaceholderOccurrences)) /
            (baselineAnalysis.fallbackOccurrences + baselineAnalysis.retiredPlaceholderOccurrences)
          ).toFixed(1),
        )
      : null;

  const renderDiff = comparePages(BASELINE_DIR, ACTIVATION_DIR, pageUnion);
  const baselineNorm = analyzeNormalization(BASELINE_DIR, baselinePages);
  const activationNorm = fs.existsSync(ACTIVATION_DIR)
    ? analyzeNormalization(
        ACTIVATION_DIR,
        pageUnion.filter((p) => fs.existsSync(path.join(ACTIVATION_DIR, p))),
      )
    : null;

  const pronunciationActivation = {
    phase: '4C',
    title: 'Pronunciation Activation',
    generatedAt: new Date().toISOString(),
    scope: {
      policyModule: 'lib/render/pronunciation.js',
      generators: PRONUNCIATION_GENERATORS.map((g) => g.script),
      generatorsSkipped: ['scripts/generate-names-like.js (no pronunciation display snippets)'],
      pagesInScope: pageUnion.length,
      baselineHtmlSource: renderDiff.baselineSource,
      phase4DNotStarted: true,
    },
    dataset: utilization,
    policy: policyCheck,
    baseline: baselineAnalysis,
    activation: activationAnalysis,
    successMetrics: {
      fallbackReductionPct,
      pronunciationBlockCoveragePct:
        activationAnalysis && activationAnalysis.pageCount
          ? Number(
              ((100 * activationAnalysis.pronunciationBlockPages) / activationAnalysis.pageCount).toFixed(1),
            )
          : null,
      disclosedMissingPageCoveragePct:
        activationAnalysis && activationAnalysis.pageCount
          ? Number(((100 * activationAnalysis.disclosedPages) / activationAnalysis.pageCount).toFixed(1))
          : null,
      htmlPagesChanged: renderDiff.htmlPagesChanged,
      semanticDiffPages: renderDiff.diffCategories.semantic,
      generatorDriftPages: renderDiff.diffCategories['generator-drift'],
      storedPronunciationUtilizationPct: utilization.storedPronunciationUtilizationPct,
      activationTruthfulnessRatioPct: activationAnalysis?.truthfulnessRatioPct ?? null,
    },
    validation: {
      urlsUnchanged: renderDiff.canonicalUrlsUnchanged,
      internalLinksUnchanged: renderDiff.internalLinksUnchanged,
      diffCategoryBreakdown: renderDiff.diffCategories,
      renderingFlowsThroughPolicyModule: policyCheck.renderingFlowsThroughPolicyModule,
    },
  };

  const truthfulnessImprovement = {
    generatedAt: new Date().toISOString(),
    method:
      'Page-level pronunciation truthfulness ratio: share of pronunciation-affected pages with zero pronunciation-fallback-marker hits and zero retired placeholder phrases. Available and disclosed-empty pages count as truthful.',
    baseline: {
      pronunciationAffectedPages: baselineAnalysis.pageCount,
      fallbackOccurrences: baselineAnalysis.fallbackOccurrences,
      retiredPlaceholderOccurrences: baselineAnalysis.retiredPlaceholderOccurrences,
      fallbackPages: baselineAnalysis.fallbackPages,
      disclosedPages: baselineAnalysis.disclosedPages,
      availablePronunciationPages: baselineAnalysis.availablePronunciationPages,
      truthfulPages: baselineAnalysis.truthfulPages,
      truthfulnessRatioPct: baselineAnalysis.truthfulnessRatioPct,
    },
    activation: activationAnalysis
      ? {
          pronunciationAffectedPages: activationAnalysis.pageCount,
          fallbackOccurrences: activationAnalysis.fallbackOccurrences,
          retiredPlaceholderOccurrences: activationAnalysis.retiredPlaceholderOccurrences,
          fallbackPages: activationAnalysis.fallbackPages,
          disclosedPages: activationAnalysis.disclosedPages,
          availablePronunciationPages: activationAnalysis.availablePronunciationPages,
          truthfulPages: activationAnalysis.truthfulPages,
          truthfulnessRatioPct: activationAnalysis.truthfulnessRatioPct,
        }
      : null,
    truthfulnessIncreasePct: activationAnalysis
      ? Number((activationAnalysis.truthfulnessRatioPct - baselineAnalysis.truthfulnessRatioPct).toFixed(1))
      : null,
  };

  const normalization = {
    generatedAt: new Date().toISOString(),
    objective: 'Single pronunciation rendering policy — stored values rendered exactly; empty values use one disclosed sentence.',
    disclosedSentence: DISCLOSED_UNKNOWN_SENTENCE,
    baseline: baselineNorm,
    activation: activationNorm,
    retiredPlaceholders: RETIRED_PLACEHOLDERS,
    baselineRetiredPlaceholderOccurrences: baselineAnalysis.retiredPlaceholderOccurrences,
    activationRetiredPlaceholderOccurrences: activationAnalysis?.retiredPlaceholderOccurrences ?? null,
  };

  fs.writeFileSync(
    path.join(AUDIT_DIR, 'pronunciation-activation.json'),
    JSON.stringify(pronunciationActivation, null, 2),
  );
  fs.writeFileSync(
    path.join(AUDIT_DIR, 'pronunciation-truthfulness.json'),
    JSON.stringify(truthfulnessImprovement, null, 2),
  );
  fs.writeFileSync(
    path.join(AUDIT_DIR, 'pronunciation-render-differences.json'),
    JSON.stringify(renderDiff, null, 2),
  );
  fs.writeFileSync(
    path.join(AUDIT_DIR, 'pronunciation-normalization.json'),
    JSON.stringify(normalization, null, 2),
  );

  console.log('Phase 4C pronunciation activation audit complete.');
  console.log('  Baseline:', renderDiff.baselineSource, '| pages:', baselineAnalysis.pageCount);
  console.log('  Baseline pronunciation fallback markers:', baselineAnalysis.fallbackOccurrences);
  console.log('  Baseline retired placeholders:', baselineAnalysis.retiredPlaceholderOccurrences);
  if (activationAnalysis) {
    console.log('  Activation pronunciation fallback markers:', activationAnalysis.fallbackOccurrences);
    console.log('  Activation retired placeholders:', activationAnalysis.retiredPlaceholderOccurrences);
    console.log('  Semantic HTML changes:', renderDiff.diffCategories.semantic);
    console.log('  Generator drift pages:', renderDiff.diffCategories['generator-drift']);
    console.log('  Policy module exclusive:', policyCheck.renderingFlowsThroughPolicyModule);
  } else {
    console.log('  No activation build found. Re-run with --build.');
  }
}

main();
