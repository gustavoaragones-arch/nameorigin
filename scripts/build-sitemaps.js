#!/usr/bin/env node
/**
 * build-sitemaps.js
 * Generates sitemap.xml (and optional sitemap index) from programmatic output and static routes.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE_URL = process.env.SITE_URL || 'https://nameorigin.io';
// Scan this dir for generated HTML (name/, names/). Set SCAN_DIR=programmatic to scan only programmatic.
const SCAN_DIR = process.env.SCAN_DIR ? path.join(ROOT, process.env.SCAN_DIR) : ROOT;

function escapeXml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const SKIP_DIRS = new Set(['data', 'scripts', 'node_modules', '.git']);

function collectUrls(dir, basePath) {
  let urls = [];
  if (!fs.existsSync(dir)) return urls;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.join(basePath, e.name).replace(/\\/g, '/');
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      urls = urls.concat(collectUrls(full, rel));
    } else if (e.name.endsWith('.html')) {
      const urlPath = rel.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
      urls.push(urlPath ? (urlPath.startsWith('/') ? urlPath : '/' + urlPath) : '/');
    }
  }
  return urls;
}

function run() {
  const staticUrls = ['/', '/name-pages.html', '/country-name-pages.html', '/boy-name-pages.html', '/girl-name-pages.html', '/last-name-pages.html', '/legal/privacy.html', '/legal/terms.html'];
  const scannedUrls = collectUrls(SCAN_DIR, '');
  const programmaticUrls = scannedUrls.filter((p) => p && p !== '/' && p !== '/index');
  const allUrls = [...staticUrls, ...programmaticUrls.map((p) => (p.startsWith('/') ? p : '/' + p))];
  const seen = new Set();
  const uniqueUrls = allUrls.filter((u) => {
    const n = u.endsWith('/') ? u : u + '/';
    if (seen.has(n)) return false;
    seen.add(n);
    return true;
  });

  const lastmod = new Date().toISOString().slice(0, 10);
  const entries = uniqueUrls.map((u) => {
    const loc = u === '/' ? SITE_URL + '/' : SITE_URL + (u.endsWith('/') ? u : u + '/');
    return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${u === '/' ? '1.0' : '0.8'}</priority>\n  </url>`;
  });

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf8');
  console.log('Written sitemap.xml with', allUrls.length, 'URLs');
}

run();
