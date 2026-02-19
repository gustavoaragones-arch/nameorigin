#!/usr/bin/env node
/**
 * Phase 3.1 — Crawl Depth Distribution Audit (MODULE A)
 *
 * BFS from homepage; reports % of sitemap pages at depth 1, 2, 3, 4, and any at depth ≥5.
 * Success: 100% of pages at depth ≤ 4; any at depth ≥5 triggers structural correction.
 *
 * Usage: node scripts/crawl-depth-distribution.js
 * Output: build/crawl-depth-distribution.json (optional, if BUILD_REPORT=1)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = process.env.OUT_DIR ? path.join(ROOT, process.env.OUT_DIR) : ROOT;
const SITE_HOST = 'nameorigin.io';

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

function pathToFilePath(pathname) {
  const p = pathname.replace(/^\//, '').replace(/\/$/, '');
  if (!p) return path.join(OUT_DIR, 'index.html');
  if (p === 'names') return path.join(OUT_DIR, 'names', 'index.html');
  return path.join(OUT_DIR, p.includes('.html') ? p : p + '/index.html');
}

function relToPath(rel) {
  if (rel === 'index.html') return '/';
  const s = rel.replace(/\/index\.html$/, '').replace(/index\.html$/, '');
  return '/' + s;
}

function getSitemapPaths() {
  const indexPath = path.join(OUT_DIR, 'sitemap.xml');
  if (!fs.existsSync(indexPath)) return [];
  const indexXml = fs.readFileSync(indexPath, 'utf8');
  const locRe = /<loc>([^<]+)<\/loc>/g;
  const sitemapLocs = [];
  let match;
  while ((match = locRe.exec(indexXml))) sitemapLocs.push(match[1]);
  const sitemapsDir = path.join(OUT_DIR, 'sitemaps');
  const allPaths = [];
  for (const loc of sitemapLocs) {
    try {
      const u = new URL(loc);
      const name = path.basename(u.pathname);
      const fp = path.join(sitemapsDir, name);
      if (!fs.existsSync(fp)) continue;
      const xml = fs.readFileSync(fp, 'utf8');
      const subRe = /<loc>([^<]+)<\/loc>/g;
      let subMatch;
      while ((subMatch = subRe.exec(xml))) {
        try {
          const pu = new URL(subMatch[1]);
          const p = pu.pathname.replace(/\/$/, '') || '/';
          allPaths.push(p);
        } catch (_) {}
      }
    } catch (_) {}
  }
  return [...new Set(allPaths)];
}

function getAllHtmlPathnames() {
  const pathnameToFull = {};
  function scan(dir, base) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      const rel = base ? path.join(base, e.name) : e.name;
      if (e.isDirectory()) scan(full, rel);
      else if (e.name.endsWith('.html')) {
        const pathname = relToPath(rel.replace(/\\/g, '/'));
        pathnameToFull[pathname] = full;
      }
    }
  }
  scan(OUT_DIR, '');
  return pathnameToFull;
}

function run() {
  console.log('Phase 3.1 — Crawl Depth Distribution Audit');
  console.log('');

  const sitemapPaths = getSitemapPaths();
  const pathnameToFull = getAllHtmlPathnames();

  const depthByPath = {};
  const queue = [{ path: '/', depth: 0 }];
  const seen = new Set(['/']);
  depthByPath['/'] = 0;

  while (queue.length > 0) {
    const { path: p, depth } = queue.shift();
    const full = pathnameToFull[p];
    if (!full || !fs.existsSync(full)) continue;
    let html;
    try {
      html = fs.readFileSync(full, 'utf8');
    } catch (_) {
      continue;
    }
    const links = getInternalLinkPaths(html);
    for (const linkPath of links) {
      const norm = linkPath === '' ? '/' : linkPath;
      if (!seen.has(norm)) {
        seen.add(norm);
        const nextDepth = depth + 1;
        depthByPath[norm] = nextDepth;
        queue.push({ path: norm, depth: nextDepth });
      }
    }
  }

  const atDepth1 = [];
  const atDepth2 = [];
  const atDepth3 = [];
  const atDepth4 = [];
  const atDepth5Plus = [];
  const unreachable = [];

  for (const sp of sitemapPaths) {
    const d = depthByPath[sp];
    if (d === undefined) {
      unreachable.push(sp);
      continue;
    }
    if (d >= 5) atDepth5Plus.push(sp);
    else if (d === 1) atDepth1.push(sp);
    else if (d === 2) atDepth2.push(sp);
    else if (d === 3) atDepth3.push(sp);
    else if (d === 4) atDepth4.push(sp);
  }

  const total = sitemapPaths.length;
  const reachable = total - unreachable.length;
  const pct1 = total ? (atDepth1.length / total * 100).toFixed(1) : '0';
  const pct2 = total ? (atDepth2.length / total * 100).toFixed(1) : '0';
  const pct3 = total ? (atDepth3.length / total * 100).toFixed(1) : '0';
  const pct4 = total ? (atDepth4.length / total * 100).toFixed(1) : '0';
  const pct5Plus = total ? (atDepth5Plus.length / total * 100).toFixed(1) : '0';
  const pctUnreachable = total ? (unreachable.length / total * 100).toFixed(1) : '0';

  console.log('--- Crawl depth distribution (sitemap pages) ---');
  console.log('Total sitemap URLs:', total);
  console.log('Reachable from homepage:', reachable);
  console.log('');
  console.log('Depth 1: %s%% (%s)', pct1, atDepth1.length);
  console.log('Depth 2: %s%% (%s)', pct2, atDepth2.length);
  console.log('Depth 3: %s%% (%s)', pct3, atDepth3.length);
  console.log('Depth 4: %s%% (%s)', pct4, atDepth4.length);
  console.log('Depth ≥5: %s%% (%s)', pct5Plus, atDepth5Plus.length);
  if (unreachable.length > 0) {
    console.log('Unreachable: %s%% (%s)', pctUnreachable, unreachable.length);
    if (unreachable.length <= 10) unreachable.forEach((u) => console.log('  ', u));
    else unreachable.slice(0, 5).forEach((u) => console.log('  ', u)) && console.log('  ... and', unreachable.length - 5, 'more');
  }
  console.log('');

  const passed = atDepth5Plus.length === 0;
  if (!passed) {
    console.error('FAIL: Pages at depth ≥5 must be 0. Immediate structural correction required.');
    if (atDepth5Plus.length <= 15) atDepth5Plus.forEach((u) => console.error('  ', u));
    else atDepth5Plus.slice(0, 10).forEach((u) => console.error('  ', u)) && console.error('  ... and', atDepth5Plus.length - 10, 'more');
    process.exit(1);
  }
  console.log('PASS: 100% of pages at depth ≤ 4.');

  const report = {
    total_sitemap_urls: total,
    reachable,
    unreachable: unreachable.length,
    depth_1: { count: atDepth1.length, pct: parseFloat(pct1) },
    depth_2: { count: atDepth2.length, pct: parseFloat(pct2) },
    depth_3: { count: atDepth3.length, pct: parseFloat(pct3) },
    depth_4: { count: atDepth4.length, pct: parseFloat(pct4) },
    depth_5_plus: { count: atDepth5Plus.length, pct: parseFloat(pct5Plus) },
    passed,
  };
  if (process.env.BUILD_REPORT === '1') {
    const buildDir = path.join(ROOT, 'build');
    if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
    fs.writeFileSync(path.join(buildDir, 'crawl-depth-distribution.json'), JSON.stringify(report, null, 2), 'utf8');
    console.log('Written build/crawl-depth-distribution.json');
  }
}

run();
