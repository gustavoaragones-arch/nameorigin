#!/usr/bin/env node
/**
 * Phase 3.1 — Internal Link Equity Distribution (MODULE B)
 *
 * Measures average internal links per page type (outbound) and average inbound links per page type.
 * Goal: No page type should receive < 8 inbound links on average.
 *
 * Usage: node scripts/internal-link-density-report.js
 * Output: build/internal-link-density-report.json (if BUILD_REPORT=1)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = process.env.OUT_DIR ? path.join(ROOT, process.env.OUT_DIR) : ROOT;
const SITE_HOST = 'nameorigin.io';
const MIN_AVG_INBOUND = 8;

function getInternalLinkPaths(html) {
  const paths = new Set();
  if (!html || typeof html !== 'string') return paths;
  const re = /<a\s+[^>]*href\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const href = (m[1] || '').trim();
    let p = '';
    if (href.startsWith('/')) {
      p = href.replace(/#.*$/, '').replace(/\/$/, '') || '/';
    } else if (href.includes(SITE_HOST)) {
      try {
        const u = new URL(href);
        p = u.pathname.replace(/\/$/, '') || '/';
      } catch (_) {}
    }
    if (p) paths.add(p);
  }
  return paths;
}

function relToPath(rel) {
  if (rel === 'index.html') return '/';
  const s = rel.replace(/\/index\.html$/, '').replace(/index\.html$/, '');
  return '/' + s;
}

/** Classify path into page type for equity reporting. */
function getPageType(pathname) {
  const p = pathname.replace(/^\//, '').replace(/\/$/, '');
  if (!p || p === 'names') return 'hub';
  if (/^name\/[^/]+\/?$/.test(p) && !/\/siblings/.test(p)) return 'name';
  if (/^names\/with-last-name/.test(p)) return 'compatibility';
  if (/^baby-names-with-[^/]+\/?$/.test(p)) return 'compatibility';
  if (/^names\/[^/]+\/siblings/.test(p)) return 'sibling';
  if (/^compare\//.test(p) || /^names-like\//.test(p)) return 'comparison';
  if (/^names\/(us|canada)\/[^/]+/.test(p)) return 'jurisdiction';
  if (/^names\//.test(p) || /^popularity\//.test(p) || /^legal\//.test(p) || /^compatibility\/?$/.test(p) || /^trends\//.test(p)) return 'hub';
  return 'other';
}

function getAllHtmlPathnames() {
  const list = [];
  function scan(dir, base) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      const rel = base ? path.join(base, e.name) : e.name;
      if (e.isDirectory()) scan(full, rel);
      else if (e.name.endsWith('.html')) {
        const pathname = relToPath(rel.replace(/\\/g, '/'));
        list.push({ pathname, full });
      }
    }
  }
  scan(OUT_DIR, '');
  return list;
}

function run() {
  console.log('Phase 3.1 — Internal Link Density Report');
  console.log('');

  const pages = getAllHtmlPathnames();
  const pathnameToFull = {};
  pages.forEach(({ pathname, full }) => { pathnameToFull[pathname] = full; });

  const outboundByPath = {};
  const inboundByPath = {};

  for (const { pathname, full } of pages) {
    let html;
    try {
      html = fs.readFileSync(full, 'utf8');
    } catch (_) {
      continue;
    }
    const links = getInternalLinkPaths(html);
    outboundByPath[pathname] = links.size;
    links.forEach((target) => {
      inboundByPath[target] = (inboundByPath[target] || 0) + 1;
    });
  }

  const byType = {};
  function ensureType(t) {
    if (!byType[t]) byType[t] = { paths: [], outbound: [], inbound: [] };
    return byType[t];
  }

  for (const pathname of Object.keys(outboundByPath)) {
    const type = getPageType(pathname);
    const rec = ensureType(type);
    rec.paths.push(pathname);
    rec.outbound.push(outboundByPath[pathname]);
    rec.inbound.push(inboundByPath[pathname] || 0);
  }

  const typeOrder = ['name', 'compatibility', 'sibling', 'comparison', 'jurisdiction', 'hub', 'other'];
  const summary = [];
  let anyUnderLinked = false;

  for (const type of typeOrder) {
    const rec = byType[type];
    if (!rec || rec.paths.length === 0) continue;
    const avgOut = rec.outbound.reduce((a, b) => a + b, 0) / rec.paths.length;
    const avgIn = rec.inbound.reduce((a, b) => a + b, 0) / rec.paths.length;
    const minIn = Math.min(...rec.inbound);
    const underLinked = avgIn < MIN_AVG_INBOUND;
    if (underLinked) anyUnderLinked = true;
    summary.push({
      type,
      page_count: rec.paths.length,
      avg_outbound: Math.round(avgOut * 10) / 10,
      avg_inbound: Math.round(avgIn * 10) / 10,
      min_inbound: minIn,
      goal_met: !underLinked,
    });
    console.log('%s: pages=%s  avg_outbound=%s  avg_inbound=%s  min_inbound=%s  %s',
      type, rec.paths.length, avgOut.toFixed(1), avgIn.toFixed(1), minIn, underLinked ? '❌ < 8' : '✅');
  }

  const totalOut = Object.values(outboundByPath).reduce((a, b) => a + b, 0);
  const totalIn = Object.values(inboundByPath).reduce((a, b) => a + b, 0);
  const totalPages = Object.keys(outboundByPath).length;
  const globalAvgIn = totalPages ? totalIn / totalPages : 0;
  console.log('');
  console.log('Global: total pages=%s  total outbound=%s  total inbound sum=%s  avg inbound (per page)=%s',
    totalPages, totalOut, totalIn, globalAvgIn.toFixed(1));
  console.log('Outbound vs inbound ratio (total): %s', totalOut > 0 ? (totalIn / totalOut).toFixed(2) : 0);
  console.log('');

  if (anyUnderLinked) {
    console.log('WARNING: At least one page type has average inbound < 8. Consider mesh reinforcement (MODULE C).');
  } else {
    console.log('PASS: All page types have average inbound ≥ 8.');
  }

  const report = {
    by_type: summary,
    total_pages: totalPages,
    total_outbound: totalOut,
    total_inbound_sum: totalIn,
    outbound_inbound_ratio: totalOut > 0 ? Math.round((totalIn / totalOut) * 100) / 100 : 0,
    min_avg_inbound_goal: MIN_AVG_INBOUND,
    all_goals_met: !anyUnderLinked,
  };
  if (process.env.BUILD_REPORT === '1') {
    const buildDir = path.join(ROOT, 'build');
    if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
    fs.writeFileSync(path.join(buildDir, 'internal-link-density-report.json'), JSON.stringify(report, null, 2), 'utf8');
    console.log('Written build/internal-link-density-report.json');
  }
}

run();
