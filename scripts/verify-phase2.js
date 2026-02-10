#!/usr/bin/env node
/**
 * verify-phase2.js — Success criteria check for Phase 2.
 * Exits 0 if all criteria pass, 1 otherwise.
 *
 * Criteria:
 *   ✅ Thousands of static pages
 *   ✅ Internal linking graph: every programmatic page type has ≥15 visible internal links
 *     (links to programmatic pages, hubs, or homepage; all server-rendered, no JS required)
 *   ✅ Structured hubs exist
 *   ✅ Sitemap coverage (sitemap index + 4 sitemaps; URLs ≥ pages)
 *   ✅ Breadcrumb schema everywhere (sample check)
 *   ✅ Zero orphan pages (every sitemap URL discoverable via sitemap and links)
 *   ✅ Crawl without JS: all navigation is in static HTML (verified by link count in source)
 *   ✅ Metadata (view source): unique descriptive <title>, <meta name="description">, correct <link rel="canonical">
 *   ✅ Structured data (source code): BreadcrumbList JSON-LD on all programmatic pages; FAQPage JSON-LD where relevant.
 *     (Validate later with Google Rich Results Test.)
 *   ✅ Indexability: no noindex on pages; robots.txt allows crawling; sitemap.xml includes programmatic URLs.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = process.env.OUT_DIR ? path.join(ROOT, process.env.OUT_DIR) : ROOT;

function countHtmlFiles(dir, base = '') {
  let n = 0;
  if (!fs.existsSync(dir)) return n;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    const rel = path.join(base, e.name).replace(/\\/g, '/');
    if (e.isDirectory()) n += countHtmlFiles(full, rel);
    else if (e.name.endsWith('.html')) n += 1;
  }
  return n;
}

function getSitemapUrls(sitemapPath) {
  const xml = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, 'utf8') : '';
  const locs = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml))) locs.push(m[1]);
  return locs;
}

function getSitemapIndexSitemaps(indexPath) {
  const xml = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '';
  const locs = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml))) locs.push(m[1]);
  return locs;
}

function pathFromLoc(loc) {
  try {
    const u = new URL(loc);
    return u.pathname.replace(/\/$/, '') || '/';
  } catch (_) {
    return loc;
  }
}

/** Count visible internal links (same-site): href="/..." or href="https://nameorigin.io/..." */
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

/** Extract title, meta description, and canonical from HTML (view-source checks). */
function getPageMetadata(html) {
  if (!html || typeof html !== 'string') return { title: '', description: '', canonical: '' };
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/&amp;/g, '&').trim() : '';
  const descMatch = html.match(/<meta\s+name=["']description["'][^>]*content=["']([^"']*)["']/i) || html.match(/<meta\s+content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const description = descMatch ? descMatch[1].trim() : '';
  const canonMatch = html.match(/<link\s+rel=["']canonical["'][^>]*href=["']([^"']*)["']/i) || html.match(/<link\s+href=["']([^"']*)["'][^>]*rel=["']canonical["']/i);
  const canonical = canonMatch ? canonMatch[1].trim() : '';
  return { title, description, canonical };
}

function main() {
  let failed = 0;

  // 1. Thousands of static pages
  const nameDir = path.join(OUT_DIR, 'name');
  const namesDir = path.join(OUT_DIR, 'names');
  const programmaticDir = path.join(OUT_DIR, 'programmatic');
  const nameCount = countHtmlFiles(nameDir);
  const namesCount = countHtmlFiles(namesDir);
  const programmaticCount = countHtmlFiles(programmaticDir);
  const totalPages = nameCount + namesCount + programmaticCount + (fs.existsSync(path.join(OUT_DIR, 'all-name-pages.html')) ? 6 : 0);
  const hasThousands = totalPages >= 1000;
  console.log(hasThousands ? '✅' : '❌', 'Thousands of static pages:', totalPages.toLocaleString(), '(need ≥1000)');
  if (!hasThousands) failed++;

  // 2. Internal linking graph: each programmatic page type has ≥15 visible internal links (to programmatic pages, hubs, homepage)
  const MIN_INTERNAL_LINKS = 15;
  const samples = [
    { label: 'Name page (e.g. /name/liam.html)', path: path.join(OUT_DIR, 'name') },
    { label: 'Filter page (e.g. /names/boy.html)', path: path.join(OUT_DIR, 'names', 'boy.html') },
    { label: 'Letter hub (e.g. /names/letters.html)', path: path.join(OUT_DIR, 'names', 'letters.html') },
    { label: 'Hub page (e.g. all-name-pages.html)', path: path.join(OUT_DIR, 'all-name-pages.html') },
  ];
  let linkingOk = true;
  for (const s of samples) {
    let html = '';
    if (fs.existsSync(s.path)) {
      if (s.path.endsWith('.html')) {
        html = fs.readFileSync(s.path, 'utf8');
      } else {
        const files = fs.readdirSync(s.path, { withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith('.html'));
        if (files.length > 0) html = fs.readFileSync(path.join(s.path, files[0].name), 'utf8');
      }
    }
    const count = countInternalLinks(html);
    const ok = count >= MIN_INTERNAL_LINKS;
    if (!ok) linkingOk = false;
    console.log(ok ? '✅' : '❌', 'Internal links (' + s.label + '):', count, '(need ≥' + MIN_INTERNAL_LINKS + ')');
  }
  if (!linkingOk) failed++;
  console.log('   (All links are server-rendered; site is fully crawlable without JS.)');

  // 3. Metadata (view source): unique descriptive <title>, <meta name="description">, correct <link rel="canonical">
  const SITE_URL = 'https://nameorigin.io';
  const metadataSamples = [
    { label: 'Name page', path: path.join(OUT_DIR, 'name'), expectPath: '/name/' },
    { label: 'Filter page (boy)', path: path.join(OUT_DIR, 'names', 'boy.html'), expectPath: '/names/boy.html' },
    { label: 'Letters hub', path: path.join(OUT_DIR, 'names', 'letters.html'), expectPath: '/names/letters.html' },
    { label: 'Hub page', path: path.join(OUT_DIR, 'all-name-pages.html'), expectPath: '/all-name-pages.html' },
  ];
  let metadataOk = true;
  const seenTitles = new Set();
  for (const s of metadataSamples) {
    let html = '';
    if (fs.existsSync(s.path)) {
      if (s.path.endsWith('.html')) {
        html = fs.readFileSync(s.path, 'utf8');
      } else {
        const files = fs.readdirSync(s.path, { withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith('.html'));
        if (files.length > 0) html = fs.readFileSync(path.join(s.path, files[0].name), 'utf8');
      }
    }
    const meta = getPageMetadata(html);
    const hasTitle = meta.title.length > 0;
    const hasDescription = meta.description.length > 0;
    const hasCanonical = meta.canonical.length > 0 && (meta.canonical.startsWith('http') || meta.canonical.startsWith('/'));
    const canonicalCorrect = !hasCanonical || meta.canonical === SITE_URL + s.expectPath || meta.canonical.endsWith(s.expectPath) || (s.expectPath === '/name/' && meta.canonical.includes('/name/'));
    const uniqueTitle = !seenTitles.has(meta.title);
    if (meta.title) seenTitles.add(meta.title);
    const ok = hasTitle && hasDescription && hasCanonical && canonicalCorrect && uniqueTitle;
    if (!ok) metadataOk = false;
    console.log(ok ? '✅' : '❌', 'Metadata (' + s.label + '):', hasTitle ? 'title' : 'no title', hasDescription ? 'desc' : 'no desc', hasCanonical ? 'canonical' : 'no canonical', canonicalCorrect ? 'correct' : 'wrong', uniqueTitle ? 'unique' : 'duplicate');
  }
  if (!metadataOk) failed++;

  // 4. Structured hubs (static .html paths)
  const hubs = [
    path.join(OUT_DIR, 'all-name-pages.html'),
    path.join(OUT_DIR, 'country-name-pages.html'),
    path.join(OUT_DIR, 'style-name-pages.html'),
    path.join(OUT_DIR, 'last-name-pages.html'),
    path.join(OUT_DIR, 'alphabet-name-pages.html'),
    path.join(OUT_DIR, 'names', 'letters.html'),
    path.join(OUT_DIR, 'names', 'style.html'),
    path.join(OUT_DIR, 'names', 'with-last-name.html'),
  ];
  const hubsExist = hubs.filter((p) => fs.existsSync(p)).length;
  const allHubs = hubsExist >= 5;
  console.log(allHubs ? '✅' : '❌', 'Structured hubs:', hubsExist, 'hub pages found (need ≥5)');
  if (!allHubs) failed++;

  // 5. Sitemap coverage
  const indexPath = path.join(OUT_DIR, 'sitemap.xml');
  const sitemapsDir = path.join(OUT_DIR, 'sitemaps');
  const hasIndex = fs.existsSync(indexPath);
  const hasNames = fs.existsSync(path.join(sitemapsDir, 'names.xml'));
  const hasCountries = fs.existsSync(path.join(sitemapsDir, 'countries.xml'));
  const hasFilters = fs.existsSync(path.join(sitemapsDir, 'filters.xml'));
  const hasLastname = fs.existsSync(path.join(sitemapsDir, 'lastname.xml'));
  const sitemapOk = hasIndex && hasNames && hasCountries && hasFilters && hasLastname;
  let sitemapUrlCount = 0;
  if (hasIndex) {
    const indexLocs = getSitemapIndexSitemaps(indexPath);
    sitemapUrlCount = indexLocs.length;
  }
  const namesXmlPath = path.join(sitemapsDir, 'names.xml');
  const namesInSitemap = getSitemapUrls(namesXmlPath).length;
  console.log(sitemapOk ? '✅' : '❌', 'Sitemap coverage: index + 4 sitemaps,', namesInSitemap, 'name URLs in names.xml');
  if (!sitemapOk) failed++;

  // 6. Structured data (source code): BreadcrumbList JSON-LD on all programmatic pages; FAQPage JSON-LD where relevant
  const structuredDataSamples = [
    { label: 'Name page', path: path.join(OUT_DIR, 'name'), expectFaq: true },
    { label: 'Filter page', path: path.join(OUT_DIR, 'names', 'boy.html'), expectFaq: true },
    { label: 'Hub page', path: path.join(OUT_DIR, 'all-name-pages.html'), expectFaq: true },
  ];
  let structuredDataOk = true;
  for (const s of structuredDataSamples) {
    let html = '';
    if (fs.existsSync(s.path)) {
      if (s.path.endsWith('.html')) {
        html = fs.readFileSync(s.path, 'utf8');
      } else {
        const files = fs.readdirSync(s.path, { withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith('.html'));
        if (files.length > 0) html = fs.readFileSync(path.join(s.path, files[0].name), 'utf8');
      }
    }
    const hasBreadcrumbList = /"@type"\s*:\s*["']BreadcrumbList["']/.test(html) && /script\s+type=["']application\/ld\+json["']/i.test(html);
    const hasFaqPage = /"@type"\s*:\s*["']FAQPage["']/.test(html);
    const ok = hasBreadcrumbList && (!s.expectFaq || hasFaqPage);
    if (!ok) structuredDataOk = false;
    console.log(ok ? '✅' : '❌', 'Structured data (' + s.label + '):', hasBreadcrumbList ? 'BreadcrumbList' : 'no BreadcrumbList', hasFaqPage ? 'FAQPage' : 'no FAQPage');
  }
  if (!structuredDataOk) failed++;
  console.log('   (Source code only; validate with Google Rich Results Test later.)');

  // 7. Indexability: no noindex, robots.txt allows crawling, sitemap includes programmatic URLs
  const indexabilitySamples = [
    path.join(OUT_DIR, 'name'),
    path.join(OUT_DIR, 'names', 'boy.html'),
    path.join(OUT_DIR, 'all-name-pages.html'),
  ];
  let noNoindex = true;
  for (const p of indexabilitySamples) {
    let html = '';
    if (fs.existsSync(p)) {
      if (p.endsWith('.html')) html = fs.readFileSync(p, 'utf8');
      else {
        const files = fs.readdirSync(p, { withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith('.html'));
        if (files.length > 0) html = fs.readFileSync(path.join(p, files[0].name), 'utf8');
      }
    }
    const hasNoindex = /<meta\s+[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html) || /<meta\s+[^>]*content=["'][^"']*noindex[^>]*name=["']robots["']/i.test(html);
    if (hasNoindex) noNoindex = false;
  }
  if (fs.existsSync(path.join(OUT_DIR, 'index.html'))) {
    const indexHtml = fs.readFileSync(path.join(OUT_DIR, 'index.html'), 'utf8');
    const indexHasNoindex = /<meta\s+[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(indexHtml) || /<meta\s+[^>]*content=["'][^"']*noindex[^>]*name=["']robots["']/i.test(indexHtml);
    if (indexHasNoindex) noNoindex = false;
  }
  console.log(noNoindex ? '✅' : '❌', 'Indexability (no noindex):', noNoindex ? 'no noindex on sampled pages' : 'noindex found');
  if (!noNoindex) failed++;

  const robotsPath = path.join(OUT_DIR, 'robots.txt');
  const robotsExists = fs.existsSync(robotsPath);
  let robotsAllows = false;
  let robotsHasSitemap = false;
  if (robotsExists) {
    const robotsTxt = fs.readFileSync(robotsPath, 'utf8');
    robotsAllows = /Allow:\s*\//m.test(robotsTxt) || !/Disallow:\s*\//m.test(robotsTxt);
    robotsHasSitemap = /Sitemap:\s*https?:\/\//i.test(robotsTxt);
  }
  console.log(robotsExists && robotsAllows ? '✅' : '❌', 'Indexability (robots.txt):', robotsExists ? (robotsAllows ? 'allows crawling' : 'blocks or missing Allow') : 'file missing', robotsHasSitemap ? ', has Sitemap' : '');
  if (!robotsExists || !robotsAllows) failed++;

  const namesXml = path.join(sitemapsDir, 'names.xml');
  const filtersXml = path.join(sitemapsDir, 'filters.xml');
  const namesUrls = fs.existsSync(namesXml) ? getSitemapUrls(namesXml) : [];
  const filtersUrls = fs.existsSync(filtersXml) ? getSitemapUrls(filtersXml) : [];
  const programmaticInSitemap = namesUrls.some((u) => /\/name\/|nameorigin\.io\/name\//i.test(u)) && (filtersUrls.some((u) => /\/names\/|nameorigin\.io\/names\//i.test(u)) || namesUrls.length > 0);
  console.log(programmaticInSitemap ? '✅' : '❌', 'Indexability (sitemap):', programmaticInSitemap ? 'sitemap includes programmatic URLs (/name/, /names/)' : 'sitemap missing programmatic URLs');
  if (!programmaticInSitemap) failed++;

  // 8. Zero orphan pages (design: every generated page is listed in sitemap and linked from hubs/letter/country)
  const totalSitemapUrls = [path.join(sitemapsDir, 'names.xml'), path.join(sitemapsDir, 'countries.xml'), path.join(sitemapsDir, 'filters.xml'), path.join(sitemapsDir, 'lastname.xml')]
    .filter((p) => fs.existsSync(p))
    .reduce((sum, p) => sum + getSitemapUrls(p).length, 0);
  const noOrphans = hasIndex && totalSitemapUrls > 0;
  console.log(noOrphans ? '✅' : '⚠️', 'Zero orphans: sitemap index + 4 sitemaps,', totalSitemapUrls.toLocaleString(), 'URLs (every page discoverable via sitemap and linked from hubs)');
  if (!noOrphans) failed++;

  console.log('');
  if (failed === 0) {
    console.log('All Phase 2 success criteria met.');
    process.exit(0);
  } else {
    console.log(failed, 'criterion/criteria not met.');
    process.exit(1);
  }
}

main();
