#!/usr/bin/env node
/**
 * Phase 3.7 — Crawl Accelerator: Homepage Explorer Grid.
 * Injects a grid of 100 name links into the homepage for faster crawl propagation.
 * No URL/sitemap/JS changes. All links are standard HTML anchors.
 *
 * Requires: data/names-enriched.json or data/names.json, data/popularity.json.
 * Writes: OUT_DIR/index.html (default ROOT).
 * Guard: throws if homepage internal links < 120.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const OUT_DIR = process.env.OUT_DIR ? path.join(ROOT, process.env.OUT_DIR) : ROOT;

const HOMEPAGE_MIN_INTERNAL_LINKS = 120;
const EXPLORER_GRID_SIZE = 100;

function loadJson(name) {
  const p = path.join(DATA_DIR, name + '.json');
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadNames() {
  const enrichedPath = path.join(DATA_DIR, 'names-enriched.json');
  const basePath = path.join(DATA_DIR, 'names.json');
  if (fs.existsSync(enrichedPath)) {
    return JSON.parse(fs.readFileSync(enrichedPath, 'utf8'));
  }
  return JSON.parse(fs.readFileSync(basePath, 'utf8'));
}

function slug(str) {
  return String(str).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/** USA latest year, top N by rank. */
function getPopularNameIds(popularity, limit) {
  const usa = (popularity || []).filter((p) => p.country === 'USA' && p.rank != null);
  const byYear = new Map();
  usa.forEach((r) => {
    const y = r.year || 0;
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(r);
  });
  const latestYear = Math.max(0, ...byYear.keys());
  const latest = byYear.get(latestYear) || [];
  latest.sort((a, b) => (a.rank || 9999) - (b.rank || 9999));
  return latest.slice(0, limit).map((r) => r.name_id);
}

function countInternalLinks(html, siteHost = 'nameorigin.io') {
  if (!html || typeof html !== 'string') return 0;
  let count = 0;
  const re = /<a\s+[^>]*href\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const href = (m[1] || '').trim();
    if (href.startsWith('/') || href.includes(siteHost)) count += 1;
  }
  return count;
}

function run() {
  const names = loadNames();
  const popularity = loadJson('popularity');
  const nameById = new Map(names.map((n) => [n.id, n]));

  const popularIds = getPopularNameIds(popularity, EXPLORER_GRID_SIZE);
  const explorerNames = popularIds
    .map((id) => nameById.get(id))
    .filter(Boolean);
  if (explorerNames.length < EXPLORER_GRID_SIZE) {
    const have = new Set(explorerNames.map((n) => n.id));
    const rest = names.filter((n) => !have.has(n.id)).slice(0, EXPLORER_GRID_SIZE - explorerNames.length);
    explorerNames.push(...rest);
  }
  const top100 = explorerNames.slice(0, EXPLORER_GRID_SIZE);

  const intro =
    'Our directory includes thousands of baby names with meanings, origin analysis, and popularity data. ' +
    'Each name has a dedicated page with cultural context, related suggestions, and how it ranks by country and year. ' +
    'Below are 100 popular names to explore; use the search and browse links to discover more.';

  const gridLinks = top100
    .map((n) => {
      const s = slug(n.name);
      const label = (n.name || '').charAt(0).toUpperCase() + (n.name || '').slice(1).toLowerCase();
      return `<a href="/name/${s}/">${label}</a>`;
    })
    .join('\n  ');

  const explorerSection = `
      <section class="section section--tight" aria-labelledby="explore-names-heading">
        <h2 id="explore-names-heading" class="section-heading">Explore Baby Names</h2>
        <p class="name-explorer-intro">${intro}</p>
        <div class="name-explorer-grid">
  ${gridLinks}
        </div>
      </section>
`;

  const indexPath = path.join(OUT_DIR, 'index.html');
  const templatePath = path.join(ROOT, 'index.html');
  const sourcePath = fs.existsSync(indexPath) ? indexPath : templatePath;
  if (!fs.existsSync(sourcePath)) {
    throw new Error('Phase 3.7: No index.html found at ' + sourcePath);
  }

  let html = fs.readFileSync(sourcePath, 'utf8');

  const markerStart = '<!-- HOMEPAGE_EXPLORER_SECTION -->';
  const markerEnd = '<!-- /HOMEPAGE_EXPLORER_SECTION -->';
  if (html.includes(markerStart) && html.includes(markerEnd)) {
    const re = new RegExp(
      markerStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + markerEnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'g'
    );
    html = html.replace(re, markerStart + '\n' + explorerSection.trim() + '\n      ' + markerEnd);
  } else {
    html = html.replace(/\s*<\/main>/, '\n' + explorerSection.trim() + '\n  </main>');
  }

  const linkCount = countInternalLinks(html);
  if (linkCount < HOMEPAGE_MIN_INTERNAL_LINKS) {
    throw new Error(
      `Phase 3.7 internal link guard: homepage has ${linkCount} internal links (min ${HOMEPAGE_MIN_INTERNAL_LINKS})`
    );
  }

  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('Homepage explorer grid: 100 names, total internal links =', linkCount);
}

run();
