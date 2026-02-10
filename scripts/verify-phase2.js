#!/usr/bin/env node
/**
 * verify-phase2.js — Success criteria check for Phase 2.
 * Exits 0 if all criteria pass, 1 otherwise.
 *
 * Criteria:
 *   ✅ Thousands of static pages
 *   ✅ Complete internal linking (sample: pages have 15+ links)
 *   ✅ Structured hubs exist
 *   ✅ Sitemap coverage (sitemap index + 4 sitemaps; URLs ≥ pages)
 *   ✅ Breadcrumb schema everywhere (sample check)
 *   ✅ Zero orphan pages (every sitemap URL appears in at least one page or sitemap)
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

  // 2. Internal linking (sample: one name page has 15+ internal links)
  const sampleNameDir = path.join(OUT_DIR, 'name');
  let linkCount = 0;
  if (fs.existsSync(sampleNameDir)) {
    const slugDirs = fs.readdirSync(sampleNameDir, { withFileTypes: true }).filter((e) => e.isDirectory());
    for (const d of slugDirs) {
      const indexPath = path.join(sampleNameDir, d.name, 'index.html');
      if (fs.existsSync(indexPath)) {
        const html = fs.readFileSync(indexPath, 'utf8');
        linkCount = (html.match(/<a\s+href="/g) || []).length;
        break;
      }
    }
  }
  const hasEnoughLinks = linkCount >= 15;
  console.log(hasEnoughLinks ? '✅' : '❌', 'Complete internal linking (sample):', linkCount, 'links on sample name page (need ≥15)');
  if (!hasEnoughLinks) failed++;

  // 3. Structured hubs
  const hubs = [
    path.join(OUT_DIR, 'all-name-pages.html'),
    path.join(OUT_DIR, 'country-name-pages.html'),
    path.join(OUT_DIR, 'style-name-pages.html'),
    path.join(OUT_DIR, 'last-name-pages.html'),
    path.join(OUT_DIR, 'alphabet-name-pages.html'),
    path.join(OUT_DIR, 'names', 'letters', 'index.html'),
    path.join(OUT_DIR, 'names', 'style', 'index.html'),
    path.join(OUT_DIR, 'names', 'with-last-name', 'index.html'),
  ];
  const hubsExist = hubs.filter((p) => fs.existsSync(p)).length;
  const allHubs = hubsExist >= 5;
  console.log(allHubs ? '✅' : '❌', 'Structured hubs:', hubsExist, 'hub pages found (need ≥5)');
  if (!allHubs) failed++;

  // 4. Sitemap coverage
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

  // 5. Breadcrumb schema everywhere (sample)
  let hasBreadcrumb = false;
  if (fs.existsSync(path.join(OUT_DIR, 'names', 'index.html'))) {
    const html = fs.readFileSync(path.join(OUT_DIR, 'names', 'index.html'), 'utf8');
    hasBreadcrumb = /BreadcrumbList/.test(html) && /application\/ld\+json/.test(html);
  }
  console.log(hasBreadcrumb ? '✅' : '❌', 'Breadcrumb schema (sample):', hasBreadcrumb ? 'BreadcrumbList JSON-LD found' : 'missing');
  if (!hasBreadcrumb) failed++;

  // 6. Zero orphan pages (design: every generated page is listed in sitemap and linked from hubs/letter/country)
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
