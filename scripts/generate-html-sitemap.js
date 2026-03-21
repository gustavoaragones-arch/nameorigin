#!/usr/bin/env node
/**
 * Phase 5.5: HTML Sitemap — crawlable hub with 200+ links
 * Generates /sitemap/index.html
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const OUT_DIR = process.env.OUT_DIR ? path.join(ROOT, process.env.OUT_DIR) : ROOT;
const SITE_URL = process.env.SITE_URL || 'https://nameorigin.io';
const EXT = '.html';

function loadJson(name) {
  const p = path.join(DATA_DIR, name + '.json');
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function slug(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function htmlEscape(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getPopularNameIds(popularity, limit = 200) {
  const usa = (popularity || []).filter((p) => p.country === 'USA' && p.rank != null);
  const byId = new Map();
  usa.forEach((p) => {
    const score = 1 / (p.rank || 9999);
    byId.set(p.name_id, (byId.get(p.name_id) || 0) + score);
  });
  return [...byId.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).slice(0, limit);
}

function run() {
  const names = loadJson('names');
  const popularity = loadJson('popularity');
  const countries = loadJson('countries');
  const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const COUNTRY_SLUG_MAP = { USA: 'usa', CAN: 'canada', IND: 'india', FRA: 'france', IRL: 'ireland' };

  const nameById = new Map(names.map((n) => [n.id, n]));
  const popularIds = getPopularNameIds(popularity, 250);
  let popularNames = popularIds.map((id) => nameById.get(id)).filter(Boolean);
  if (popularNames.length < 200) {
    const usedIds = new Set(popularNames.map((n) => n.id));
    const extra = names.filter((n) => !usedIds.has(n.id)).slice(0, 200 - popularNames.length);
    popularNames = [...popularNames, ...extra];
  }
  popularNames = popularNames.slice(0, 200);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index, follow">
  <meta name="description" content="HTML sitemap for nameorigin.io — browse all names, countries, letters, tools, and special pages.">
  <title>NameOrigin Sitemap | nameorigin.io</title>
  <link rel="stylesheet" href="/styles.min.css">
  <link rel="canonical" href="${SITE_URL}/sitemap/" />
</head>
<body>
  <header class="site-header" role="banner">
    <div class="container">
      <a href="/" class="site-logo">nameorigin.io</a>
      <nav class="site-nav" aria-label="Main navigation">
        <a href="/names">Names</a>
        <a href="/names/boy${EXT}">Boy Names</a>
        <a href="/names/girl${EXT}">Girl Names</a>
        <a href="/names/unisex${EXT}">Unisex Names</a>
        <a href="/names/letters${EXT}">By letter</a>
        <a href="/names/with-last-name${EXT}">Last name fit</a>
        <a href="/all-name-pages.html">All name pages</a>
      </nav>
    </div>
  </header>
  <main class="container section">
    <h1>NameOrigin Sitemap</h1>
    <p class="contextual">This HTML sitemap helps search engines and visitors discover all pages on nameorigin.io. Browse names, countries, letters, tools, and special pages.</p>

    <h2>Names</h2>
    <ul class="name-list">
${popularNames.map((n) => `      <li><a href="/name/${slug(n.name)}/">${htmlEscape(n.name)}</a></li>`).join('\n')}
    </ul>

    <h2>Browse by Letter</h2>
    <ul class="name-list">
${LETTERS.map((l) => `      <li><a href="/names/${l}${EXT}">${l.toUpperCase()}</a></li>`).join('\n')}
    </ul>

    <h2>Countries</h2>
    <ul class="name-list">
${countries.map((c) => {
  const slugKey = (c.code && COUNTRY_SLUG_MAP[c.code]) || slug(c.name);
  return `      <li><a href="/names/${slugKey}${EXT}">${htmlEscape(c.name)}</a></li>`;
}).join('\n')}
    </ul>

    <h2>Tools</h2>
    <ul class="name-list">
      <li><a href="/tools/name-report/">Name Report</a></li>
      <li><a href="/tools/sibling-report/">Sibling Report</a></li>
      <li><a href="/tools/name-certificate/">Name Certificate</a></li>
    </ul>

    <h2>Special Pages</h2>
    <ul class="name-list">
      <li><a href="/compare/">Compare Names</a></li>
      <li><a href="/trends/">Name Trends</a></li>
      <li><a href="/popularity/">Popularity Hub</a></li>
      <li><a href="/names/">All Names</a></li>
      <li><a href="/names/boy${EXT}">Boy Names</a></li>
      <li><a href="/names/girl${EXT}">Girl Names</a></li>
      <li><a href="/names/unisex${EXT}">Unisex Names</a></li>
      <li><a href="/names/trending${EXT}">Trending Names</a></li>
      <li><a href="/names/popular${EXT}">Popular Names</a></li>
      <li><a href="/names/letters${EXT}">Browse by Letter</a></li>
      <li><a href="/names/style${EXT}">Browse by Style</a></li>
      <li><a href="/names/with-last-name${EXT}">Last Name Compatibility</a></li>
      <li><a href="/compatibility/">Compatibility Tool</a></li>
    </ul>
  </main>
  <footer class="site-footer" role="contentinfo">
    <div class="container">
      <div class="footer__bottom">
        <p class="mb-0">© 2026 nameorigin.io. All rights reserved.<br>
nameorigin.io is owned and operated by Albor Digital LLC, an independent product studio based in Wyoming, USA.</p>
        <p>Contact: <a href="mailto:contact@nameorigin.io">contact@nameorigin.io</a></p>
        <p class="crawl-links">Browse: <a href="/names/">All names</a> | <a href="/names/boy${EXT}">Boy names</a> | <a href="/names/girl${EXT}">Girl names</a> | <a href="/popularity/">Popular names</a></p>
      </div>
    </div>
  </footer>
</body>
</html>`;

  const sitemapDir = path.join(OUT_DIR, 'sitemap');
  fs.mkdirSync(sitemapDir, { recursive: true });
  fs.writeFileSync(path.join(sitemapDir, 'index.html'), html, 'utf8');
  console.log('Written sitemap/index.html');
  const linkCount = popularNames.length + LETTERS.length + countries.length + 3 + 13;
  console.log(`Total links: ${linkCount} (target: ≥200)`);
}

run();
