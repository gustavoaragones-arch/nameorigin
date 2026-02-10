#!/usr/bin/env node
/**
 * Phase 2 — Build sitemap.xml from programmatic/ output and static routes.
 * Safe canonical structure: one URL per page, trailing slashes for directories.
 */

const fs = require('fs');
const path = require('path');
const lib = require('./lib.js');

const { ROOT, PROGRAMMATIC_DIR, SITE_URL } = lib;

const SKIP_DIRS = new Set(['data', 'scripts', 'node_modules', '.git', 'js', 'templates']);
const STATIC_URLS = [
  '/',
  '/name-pages.html',
  '/country-name-pages.html',
  '/boy-name-pages.html',
  '/girl-name-pages.html',
  '/last-name-pages.html',
  '/legal/privacy.html',
  '/legal/terms.html',
];

function escapeXml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function collectUrls(dir, basePath) {
  let urls = [];
  if (!fs.existsSync(dir)) return urls;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    const rel = path.join(basePath, e.name).replace(/\\/g, '/');
    if (e.isDirectory()) {
      urls = urls.concat(collectUrls(full, rel));
    } else if (e.name.endsWith('.html')) {
      const urlPath = rel.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
      urls.push(urlPath ? (urlPath.startsWith('/') ? urlPath : '/' + urlPath) : '/');
    }
  }
  return urls;
}

function run() {
  const programmaticUrls = collectUrls(PROGRAMMATIC_DIR, '/programmatic');
  const allUrls = [...STATIC_URLS, ...programmaticUrls.map((u) => (u.startsWith('/') ? u : '/' + u))];
  const seen = new Set();
  const uniqueUrls = allUrls.filter((u) => {
    const n = u.endsWith('/') ? u : (u === '/' ? u : u + '/');
    if (seen.has(n)) return false;
    seen.add(n);
    return true;
  });

  const lastmod = new Date().toISOString().slice(0, 10);
  const entries = uniqueUrls.map((u) => {
    const isRoot = u === '/';
    const isHtml = u.endsWith('.html') || u.includes('.html');
    const loc = isRoot ? SITE_URL + '/' : isHtml ? SITE_URL + u : SITE_URL + (u.endsWith('/') ? u : u + '/');
    const priority = u === '/' ? '1.0' : u.startsWith('/programmatic/') ? '0.8' : '0.7';
    return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
  });

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf8');
  console.log('Written sitemap.xml with', uniqueUrls.length, 'URLs');
}

run();
