#!/usr/bin/env node
/**
 * build-sitemap.js
 * Generates:
 *   /sitemap.xml          — Sitemap index (references the 4 sitemaps below)
 *   /sitemaps/names.xml   — All /name/{slug} URLs
 *   /sitemaps/countries.xml — Country pages + gender+country
 *   /sitemaps/filters.xml — /names, gender, style, letters, trending, popular, hub pages
 *   /sitemaps/lastname.xml — Last name compatibility pages
 *
 * Uses same OUT_DIR and SITE_URL as generate-programmatic-pages.js.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const OUT_DIR = process.env.OUT_DIR ? path.join(ROOT, process.env.OUT_DIR) : ROOT;
const SITE_URL = process.env.SITE_URL || 'https://nameorigin.io';
// Must match generate-programmatic-pages.js: static .html URLs for crawlable pages
const EXT = '.html';

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const STYLE_CONFIG = [
  { slug: 'nature' },
  { slug: 'classic' },
  { slug: 'modern' },
  { slug: 'rare' },
  { slug: 'biblical' },
  { slug: 'popular' },
  { slug: 'traditional' },
];
const COUNTRY_SLUG_MAP = { USA: 'usa', CAN: 'canada', IND: 'india', FRA: 'france', IRL: 'ireland' };

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

function escapeXml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(loc, priority = '0.8', changefreq = 'weekly') {
  const lastmod = new Date().toISOString().slice(0, 10);
  const fullLoc = loc.startsWith('http') ? loc : SITE_URL + (loc.startsWith('/') ? loc : '/' + loc);
  return `  <url>\n    <loc>${escapeXml(fullLoc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

function writeUrlset(filePath, urls, priority = '0.8') {
  const entries = urls.map((loc) => urlEntry(loc, priority));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, xml, 'utf8');
  return urls.length;
}

function run() {
  const names = loadJson('names');
  const countries = loadJson('countries');
  const lastNames = loadJson('last-names');

  const sitemapsDir = path.join(OUT_DIR, 'sitemaps');
  if (!fs.existsSync(sitemapsDir)) fs.mkdirSync(sitemapsDir, { recursive: true });

  const lastmod = new Date().toISOString().slice(0, 10);

  // --- /sitemaps/names.xml: all /name/{slug}.html ---
  const nameUrls = names.map((n) => '/name/' + slug(n.name) + EXT).filter((u) => u.length > 1);
  const namesCount = writeUrlset(path.join(sitemapsDir, 'names.xml'), nameUrls, '0.8');
  console.log('Written sitemaps/names.xml with', namesCount, 'URLs');

  // --- /sitemaps/countries.xml: country pages + gender+country (.html) ---
  const countryUrls = [];
  countries.forEach((c) => {
    const slugKey = (c.code && COUNTRY_SLUG_MAP[c.code]) || slug(c.name);
    countryUrls.push('/names/' + slugKey + EXT);
    ['boy', 'girl', 'unisex'].forEach((gender) => {
      countryUrls.push('/names/' + gender + '/' + slugKey + EXT);
    });
  });
  const countriesCount = writeUrlset(path.join(sitemapsDir, 'countries.xml'), countryUrls);
  console.log('Written sitemaps/countries.xml with', countriesCount, 'URLs');

  // --- /sitemaps/filters.xml: homepage, names index, gender, style, letters, trending, popular, hub pages ---
  const filterUrls = [
    '/',
    '/names',
    '/names/boy' + EXT,
    '/names/girl' + EXT,
    '/names/unisex' + EXT,
    '/names/trending' + EXT,
    '/names/popular' + EXT,
    '/names/style' + EXT,
    '/names/letters' + EXT,
  ];
  STYLE_CONFIG.forEach((s) => filterUrls.push('/names/style/' + s.slug + EXT));
  LETTERS.forEach((l) => filterUrls.push('/names/' + l + EXT));
  filterUrls.push('/all-name-pages.html', '/country-name-pages.html', '/style-name-pages.html', '/last-name-pages.html', '/alphabet-name-pages.html');
  filterUrls.push('/legal/privacy.html', '/legal/terms.html');
  const filtersCount = writeUrlset(path.join(sitemapsDir, 'filters.xml'), filterUrls);
  console.log('Written sitemaps/filters.xml with', filtersCount, 'URLs');

  // --- /sitemaps/lastname.xml: last name compatibility ---
  const lastnameUrls = ['/names/with-last-name' + EXT];
  lastNames.forEach((s) => {
    const sslug = slug(s.name);
    if (sslug) lastnameUrls.push('/names/with-last-name-' + sslug + EXT);
  });
  const lastnameCount = writeUrlset(path.join(sitemapsDir, 'lastname.xml'), lastnameUrls);
  console.log('Written sitemaps/lastname.xml with', lastnameCount, 'URLs');

  // --- /sitemap.xml: sitemap index ---
  const indexEntries = [
    ['names', 'sitemaps/names.xml'],
    ['countries', 'sitemaps/countries.xml'],
    ['filters', 'sitemaps/filters.xml'],
    ['lastname', 'sitemaps/lastname.xml'],
  ].map(([_, rel]) => `  <sitemap>\n    <loc>${escapeXml(SITE_URL + '/' + rel)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>`);

  const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexEntries.join('\n')}
</sitemapindex>`;

  fs.writeFileSync(path.join(OUT_DIR, 'sitemap.xml'), indexXml, 'utf8');
  console.log('Written sitemap.xml (index with 4 sitemaps)');
  console.log('Total URLs:', namesCount + countriesCount + filtersCount + lastnameCount);
}

run();
