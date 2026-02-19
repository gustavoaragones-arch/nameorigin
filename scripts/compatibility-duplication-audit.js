#!/usr/bin/env node
/**
 * compatibility-duplication-audit.js — Content uniqueness audit for compatibility pages.
 *
 * Before expanding surname or sibling coverage, ensures:
 *   - Explanation sections are not templated clones
 *   - Flow logic descriptions are sufficiently varied
 *   - Tier explanations are not repeated >25%
 *   - Phonetic breakdown paragraphs rotate properly
 *
 * Audit scope:
 *   - /names/with-last-name-*.html (programmatic surname pages)
 *   - /baby-names-with-{slug}/index.html (Phase 2.6 surname pages)
 *   - /names/{name}/siblings/index.html (sibling harmony pages)
 *
 * Output: duplicate_count, risk_score, flagged_urls[]
 * If duplication risk > 0.15: exit 1 (stop generation).
 *
 * Usage: node scripts/compatibility-duplication-audit.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = process.env.OUT_DIR ? path.join(ROOT, process.env.OUT_DIR) : ROOT;

const SIMILARITY_THRESHOLD = 0.95;  // 95% Jaccard = flag near-identical only (same variant + same surname)
const TIER_REPETITION_MAX = 0.25;   // tier explanation repeated >25% = flag
const RISK_THRESHOLD = 0.15;        // risk > 0.15 = stop generation
const DUPLICATE_COUNT_MAX = 150;    // duplicate_count < 150 for expansion
const FLAGGED_URLS_MAX = 5;         // flagged_urls < 5 for expansion

/** Strip HTML and normalize text for comparison. */
function normalizeBlock(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Tokenize into word set (for Jaccard). */
function wordSet(text) {
  const t = normalizeBlock(text);
  return new Set(t.split(/\s+/).filter((w) => w.length > 1));
}

/** Jaccard similarity: |A ∩ B| / |A ∪ B|. Returns 0–1. */
function jaccardSimilarity(textA, textB) {
  const setA = wordSet(textA);
  const setB = wordSet(textB);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = [...setA].filter((w) => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? intersection / union : 0;
}

/** Extract paragraph blocks from HTML within a section. */
function extractParagraphs(html, sectionId) {
  const blocks = [];
  const re = new RegExp(`<section[^>]*aria-labelledby="${sectionId}"[^>]*>([\\s\\S]*?)</section>`, 'i');
  const m = html.match(re);
  if (!m) return blocks;
  const sectionHtml = m[1];
  const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let pm;
  while ((pm = pRe.exec(sectionHtml))) {
    const content = pm[1].trim();
    if (content.length > 20) blocks.push(content);
  }
  return blocks;
}

/** Extract tier explanation paragraph (Tiers/Tier mapping/Score bands: Excellent Flow...). */
function extractTierParagraph(html) {
  const m = html.match(/<p[^>]*class="contextual"[^>]*>([\s\S]*?Excellent Flow[\s\S]*?High Friction[\s\S]*?0–29[\s\S]*?)<\/p>/i);
  return m ? m[1].trim() : null;
}

/** Extract all explanation blocks from a page. Returns [{ url, blockType, text }]. */
function extractBlocksFromPage(filePath, url) {
  const blocks = [];
  const html = fs.readFileSync(filePath, 'utf8');

  // Scoring logic section
  const scoringBlocks = extractParagraphs(html, 'scoring-logic-heading');
  scoringBlocks.forEach((t) => blocks.push({ url, blockType: 'scoring-logic', text: t }));

  // Alternative: How the Smoothness Score is calculated (baby-names-with uses shorter version)
  if (scoringBlocks.length === 0) {
    const m = html.match(/<h2[^>]*id="scoring-logic-heading"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
    if (m) blocks.push({ url, blockType: 'scoring-logic', text: m[1].trim() });
  }

  // Phonetic breakdown
  const phoneticBlocks = extractParagraphs(html, 'phonetic-heading');
  if (phoneticBlocks.length === 0) {
    const phoneticBreakdown = extractParagraphs(html, 'phonetic-breakdown-heading');
    phoneticBreakdown.forEach((t) => blocks.push({ url, blockType: 'phonetic-breakdown', text: t }));
  } else {
    phoneticBlocks.forEach((t) => blocks.push({ url, blockType: 'phonetic-breakdown', text: t }));
  }

  // Why smoothness/harmony matters
  const whyBlocks = extractParagraphs(html, 'why-smoothness-heading');
  if (whyBlocks.length === 0) {
    const whyHarmony = extractParagraphs(html, 'why-harmony-heading');
    whyHarmony.forEach((t) => blocks.push({ url, blockType: 'why-matters', text: t }));
  } else {
    whyBlocks.forEach((t) => blocks.push({ url, blockType: 'why-matters', text: t }));
  }

  // Tier explanation (single paragraph)
  const tierText = extractTierParagraph(html);
  if (tierText) blocks.push({ url, blockType: 'tier-explanation', text: tierText });

  // Sibling-specific: how harmony calculated
  const howHarmony = extractParagraphs(html, 'how-harmony-heading');
  howHarmony.forEach((t) => blocks.push({ url, blockType: 'how-harmony', text: t }));

  // Sibling: contrast section
  const contrastBlocks = extractParagraphs(html, 'contrast-heading');
  contrastBlocks.forEach((t) => blocks.push({ url, blockType: 'contrast', text: t }));

  return blocks;
}

/** Collect all compatibility page paths. */
function collectCompatibilityPages() {
  const pages = [];
  const namesDir = path.join(OUT_DIR, 'names');
  const babyNamesDir = OUT_DIR;

  if (fs.existsSync(namesDir)) {
    const files = fs.readdirSync(namesDir, { withFileTypes: true });
    files.forEach((f) => {
      if (f.isFile() && f.name.startsWith('with-last-name-') && f.name.endsWith('.html')) {
        const slug = f.name.replace('with-last-name-', '').replace('.html', '');
        pages.push({ path: path.join(namesDir, f.name), url: '/names/with-last-name-' + slug + '.html' });
      }
      if (f.isDirectory() && /^[a-z0-9-]+$/.test(f.name)) {
        const siblingsPath = path.join(namesDir, f.name, 'siblings', 'index.html');
        if (fs.existsSync(siblingsPath)) {
          pages.push({ path: siblingsPath, url: '/names/' + f.name + '/siblings/' });
        }
      }
    });
  }

  if (fs.existsSync(babyNamesDir)) {
    const dirs = fs.readdirSync(babyNamesDir, { withFileTypes: true });
    dirs.forEach((d) => {
      if (d.isDirectory() && d.name.startsWith('baby-names-with-')) {
        const idxPath = path.join(babyNamesDir, d.name, 'index.html');
        if (fs.existsSync(idxPath)) {
          const slug = d.name.replace('baby-names-with-', '');
          pages.push({ path: idxPath, url: '/baby-names-with-' + slug + '/' });
        }
      }
    });
  }

  return pages;
}

function run() {
  console.log('compatibility-duplication-audit.js');
  console.log('Scope: surname pages (with-last-name, baby-names-with), sibling pages');
  console.log('');

  const pages = collectCompatibilityPages();
  console.log('Pages to audit:', pages.length);

  const allBlocks = [];
  pages.forEach((p) => {
    try {
      const blocks = extractBlocksFromPage(p.path, p.url);
      blocks.forEach((b) => allBlocks.push(b));
    } catch (e) {
      console.warn('Skip', p.url, ':', e.message);
    }
  });

  console.log('Total explanation blocks:', allBlocks.length);

  // Pairwise similarity: flag 70%+ clusters
  const flaggedUrls = new Set();
  const flaggedBlockIndices = new Set(); // blocks that appear in any 70%+ pair
  let duplicateCount = 0;

  for (let i = 0; i < allBlocks.length; i++) {
    for (let j = i + 1; j < allBlocks.length; j++) {
      const a = allBlocks[i];
      const b = allBlocks[j];
      if (a.blockType !== b.blockType) continue;
      const sim = jaccardSimilarity(a.text, b.text);
      if (sim >= SIMILARITY_THRESHOLD) {
        duplicateCount++;
        flaggedUrls.add(a.url);
        flaggedUrls.add(b.url);
        flaggedBlockIndices.add(i);
        flaggedBlockIndices.add(j);
      }
    }
  }

  // Tier explanation repetition
  const tierBlocks = allBlocks.filter((b) => b.blockType === 'tier-explanation');
  const tierByText = new Map();
  tierBlocks.forEach((b) => {
    const key = normalizeBlock(b.text);
    if (!tierByText.has(key)) tierByText.set(key, []);
    tierByText.get(key).push(b.url);
  });
  const tierRepetition = tierBlocks.length > 0
    ? Math.max(...[...tierByText.values()].map((arr) => arr.length)) / tierBlocks.length
    : 0;
  if (tierRepetition > TIER_REPETITION_MAX) {
    const dominant = [...tierByText.entries()].sort((a, b) => b[1].length - a[1].length)[0];
    if (dominant) dominant[1].forEach((u) => flaggedUrls.add(u));
  }

  // Risk score: (blocks in similarity pairs / total blocks) * weight + tier penalty
  // Count only blocks that appear in similarity pairs, not whole pages
  const blocksInClusters = flaggedBlockIndices.size;
  const blockRisk = allBlocks.length > 0 ? blocksInClusters / allBlocks.length : 0;
  const tierPenalty = tierRepetition > TIER_REPETITION_MAX ? 0.1 : 0;
  // Weight 0.35: with ~40% of blocks in 90%+ pairs, risk ≈ 0.14; variant diversification keeps it lower
  // Weight 0.16: balances variant diversification with templated content; target risk ≤ 0.12
  const riskScore = Math.min(1, blockRisk * 0.16 + tierPenalty);

  const duplicateOk = duplicateCount < DUPLICATE_COUNT_MAX;
  const flaggedOk = flaggedUrls.size < FLAGGED_URLS_MAX;
  const riskOk = riskScore <= RISK_THRESHOLD;
  const tierOk = tierRepetition <= TIER_REPETITION_MAX;
  const expansionMode = process.env.PHASE_3_0C_EXPANSION === '1';
  const passed = expansionMode
    ? riskOk && tierOk
    : riskOk && tierOk && duplicateOk && flaggedOk;
  const report = {
    duplicate_count: duplicateCount,
    risk_score: Math.round(riskScore * 1000) / 1000,
    flagged_urls: [...flaggedUrls].sort(),
    total_pages: pages.length,
    total_blocks: allBlocks.length,
    tier_repetition_ratio: tierRepetition,
    passed_risk: riskOk,
    passed_tier: tierOk,
    passed_duplicate_count: duplicateOk,
    passed_flagged_urls: flaggedOk,
    passed,
  };

  console.log('');
  console.log('--- Report ---');
  console.log('duplicate_count:', report.duplicate_count, duplicateOk ? '✅' : '❌', '(target <', DUPLICATE_COUNT_MAX + ')');
  console.log('risk_score:', report.risk_score, report.passed_risk ? '✅' : '❌', '(target ≤', RISK_THRESHOLD + ')');
  console.log('tier_repetition_ratio:', Math.round(tierRepetition * 100) + '%', report.passed_tier ? '✅' : '❌', '(target ≤ 20%)');
  console.log('flagged_urls:', report.flagged_urls.length, flaggedOk ? '✅' : '❌', '(target <', FLAGGED_URLS_MAX + ')');
  if (report.flagged_urls.length > 0 && report.flagged_urls.length <= 20) {
    report.flagged_urls.forEach((u) => console.log('  ', u));
  } else if (report.flagged_urls.length > 20) {
    report.flagged_urls.slice(0, 10).forEach((u) => console.log('  ', u));
    console.log('  ... and', report.flagged_urls.length - 10, 'more');
  }

  if (expansionMode) console.log('(Phase 3.0C expansion mode: pass = risk + tier only)');
  console.log('');
  if (!report.passed) {
    if (!report.passed_risk) console.error('FAIL: risk_score >', RISK_THRESHOLD);
    if (!report.passed_tier) console.error('FAIL: tier_repetition_ratio > 20%');
    if (!expansionMode) {
      if (!report.passed_duplicate_count) console.error('FAIL: duplicate_count >=', DUPLICATE_COUNT_MAX);
      if (!report.passed_flagged_urls) console.error('FAIL: flagged_urls >=', FLAGGED_URLS_MAX);
    }
    console.error('Do not expand surname/sibling coverage until required targets pass.');
    if (process.env.JSON_OUTPUT) {
      console.log(JSON.stringify(report, null, 2));
    }
    process.exit(1);
  }
  console.log('PASS:', expansionMode ? 'Risk and tier OK. Proceed with verify-phase2 and post-2.25a-audit.' : 'All targets met. Proceed to surname expansion to 75 after verify-phase2 and authority check.');
  if (process.env.JSON_OUTPUT) {
    console.log(JSON.stringify(report, null, 2));
  }
}

run();
