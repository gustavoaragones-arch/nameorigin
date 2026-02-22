#!/usr/bin/env node
/**
 * Phase 3.4 — Thin Page Analysis
 * Parses index-integrity-report.json and groups thin pages by type.
 * Output: build/thin-page-analysis.json
 *
 * Usage: node scripts/thin-page-reinforcement.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REPORT_PATH = path.join(ROOT, 'build', 'index-integrity-report.json');
const OUTPUT_PATH = path.join(ROOT, 'build', 'thin-page-analysis.json');

/** Classify path into page type for grouping. */
function pageType(relPath) {
  const p = (relPath || '').replace(/\\/g, '/');
  if (p.startsWith('name/') && p.includes('/') && !p.startsWith('names/')) return 'name';
  if (p.startsWith('names-like/')) return 'names-like';
  if (p.startsWith('compare/')) return 'compare';
  if (p.match(/^names\/(boy|girl|unisex)\.html$/)) return 'filters';
  if (p.match(/^names\/[a-z]\.html$/)) return 'filters';
  if (p.match(/^names\/letters\.html$/)) return 'filters';
  if (p.match(/^names\/style\.html$/)) return 'filters';
  if (p.match(/^names\/popular\.html$/) || p.match(/^names\/trending\.html$/)) return 'filters';
  if (p.match(/^names\/[a-z]+\/(usa|canada|uk|france|ireland|india|australia)\.html$/)) return 'filters';
  if (p.match(/^names\/[a-z]+\.html$/)) return 'filters';
  if (p.startsWith('names/')) return 'filters';
  if (p.match(/-name-pages\.html$/) || p.match(/-pages\.html$/)) return 'hubs';
  if (p === 'compatibility/index.html') return 'hubs';
  if (p.startsWith('popularity/')) return 'popularity';
  if (p.startsWith('trends/')) return 'trends';
  if (p.startsWith('legal/')) return 'legal';
  return 'others';
}

function run() {
  if (!fs.existsSync(REPORT_PATH)) {
    console.error('ERROR: index-integrity-report.json not found. Run index-integrity-audit.js first.');
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
  const under400 = report.under400Words || [];
  const under20 = report.under20InternalLinks || [];
  const missingDesc = report.missingMetaDescription || [];

  const byType = {};
  function ensure(type) {
    if (!byType[type]) {
      byType[type] = { under400Words: [], under20InternalLinks: [], missingMetaDescription: [] };
    }
  }

  under400.forEach(({ path: p, words }) => {
    const type = pageType(p);
    ensure(type);
    byType[type].under400Words.push({ path: p, words });
  });

  under20.forEach(({ path: p, count }) => {
    const type = pageType(p);
    ensure(type);
    byType[type].under20InternalLinks.push({ path: p, count });
  });

  missingDesc.forEach((p) => {
    const type = pageType(p);
    ensure(type);
    byType[type].missingMetaDescription.push(p);
  });

  const summary = {};
  Object.keys(byType).sort().forEach((t) => {
    const d = byType[t];
    summary[t] = {
      under400Words: d.under400Words.length,
      under20InternalLinks: d.under20InternalLinks.length,
      missingMetaDescription: d.missingMetaDescription.length,
    };
  });

  const output = {
    timestamp: new Date().toISOString(),
    summary: report.summary || {},
    byType: byType,
    summaryByType: summary,
  };

  const outDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  console.log('Written', OUTPUT_PATH);
}

run();
