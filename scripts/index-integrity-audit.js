#!/usr/bin/env node
/**
 * index-integrity-audit.js — Step 8 build validation.
 * Scans generated HTML for indexability and content integrity.
 * Output: build/index-integrity-report.json
 *
 * Checks:
 * - Missing canonical
 * - Duplicate titles
 * - Missing meta descriptions
 * - Pages < 400 words
 * - Pages with < 8 internal links
 * - Canonical pointing to homepage (non-home pages)
 * - Duplicate canonical collisions (two+ pages with same canonical)
 * - noindex meta (indexability safety)
 * - Core Web Vitals: references to styles.css (should use styles.min.css), <script src=> without defer
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = process.env.OUT_DIR ? path.join(ROOT, process.env.OUT_DIR) : ROOT;
const REPORT_PATH = path.join(ROOT, 'build', 'index-integrity-report.json');
const MIN_WORDS = 400;
const MIN_INTERNAL_LINKS = 20;
const HOMEPAGE_CANONICAL = /^https:\/\/nameorigin\.io\/?$/;

const SKIP_DIRS = new Set(['templates', 'node_modules', 'docs', '.git', 'build']);

function getAllHtmlFiles(dir, base = '') {
  const list = [];
  if (!fs.existsSync(dir)) return list;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory() && SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    const rel = base ? path.join(base, e.name) : e.name;
    if (e.isDirectory()) {
      list.push(...getAllHtmlFiles(full, rel));
    } else if (e.name.endsWith('.html')) {
      list.push({ full, rel: rel.replace(/\\/g, '/') });
    }
  }
  return list;
}

function getPageMetadata(html) {
  if (!html || typeof html !== 'string') return { title: '', description: '', canonical: '', noindex: false };
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/&amp;/g, '&').trim() : '';
  const descMatch = html.match(/<meta\s+name=["']description["'][^>]*content=["']([^"']*)["']/i) || html.match(/<meta\s+content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const description = descMatch ? descMatch[1].trim() : '';
  const canonMatch = html.match(/<link\s+rel=["']canonical["'][^>]*href=["']([^"']*)["']/i) || html.match(/<link\s+href=["']([^"']*)["'][^>]*rel=["']canonical["']/i);
  const canonical = canonMatch ? canonMatch[1].trim() : '';
  const noindex = /<meta\s+[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html) || /<meta\s+[^>]*content=["'][^"']*noindex[^>]*name=["']robots["']/i.test(html);
  return { title, description, canonical, noindex };
}

function getMainContentText(html) {
  if (!html || typeof html !== 'string') return '';
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const block = mainMatch ? mainMatch[1] : html;
  return block.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function countWords(text) {
  return (text || '').split(/\s+/).filter(Boolean).length;
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

/** Extract internal link pathnames (normalized: no hash, no trailing slash for comparison). */
function getInternalLinkPaths(html, siteHost = 'nameorigin.io') {
  const paths = new Set();
  if (!html || typeof html !== 'string') return paths;
  const re = /<a\s+[^>]*href\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const href = (m[1] || '').trim();
    let p = '';
    if (href.startsWith('/')) {
      p = href.replace(/#.*$/, '').replace(/\/$/, '') || '/';
    } else if (href.includes(siteHost)) {
      try {
        const u = new URL(href);
        p = u.pathname.replace(/\/$/, '') || '/';
      } catch (_) {}
    }
    if (p) paths.add(p);
  }
  return paths;
}

/** Map URL pathname to file path under OUT_DIR. Must match verify-phase2 / build-sitemap (name/slug/ -> name/slug/index.html). */
function pathToFilePath(pathname) {
  const p = pathname.replace(/^\//, '').replace(/\/$/, '');
  if (!p) return path.join(OUT_DIR, 'index.html');
  if (p === 'names') return path.join(OUT_DIR, 'names', 'index.html');
  return path.join(OUT_DIR, p.includes('.html') ? p : p + '/index.html');
}

/** File rel (e.g. name/liam/index.html) to URL path (e.g. /name/liam). */
function relToPath(rel) {
  if (rel === 'index.html') return '/';
  const s = rel.replace(/\/index\.html$/, '').replace(/index\.html$/, '');
  return '/' + s;
}

function getSitemapPaths() {
  const indexPath = path.join(OUT_DIR, 'sitemap.xml');
  if (!fs.existsSync(indexPath)) return [];
  const indexXml = fs.readFileSync(indexPath, 'utf8');
  const sitemapLocs = [];
  const locRe = /<loc>([^<]+)<\/loc>/g;
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
  return allPaths;
}

function run() {
  const buildDir = path.join(ROOT, 'build');
  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

  const htmlFiles = getAllHtmlFiles(OUT_DIR, '');
  if (htmlFiles.length === 0 && fs.existsSync(path.join(OUT_DIR, 'index.html'))) {
    htmlFiles.push({ full: path.join(OUT_DIR, 'index.html'), rel: 'index.html' });
  }

  const missingCanonical = [];
  const missingMetaDescription = [];
  const duplicateTitles = {};
  const under400Words = [];
  const under20InternalLinks = [];
  const canonicalToHomepage = [];
  const duplicateCanonicals = {};
  const hasNoindex = [];
  const referencesStylesCss = [];
  const scriptSrcWithoutDefer = [];
  const titleToPaths = {};
  const canonicalToPaths = {};
  const pageData = [];

  for (const { full, rel } of htmlFiles) {
    let html;
    try {
      html = fs.readFileSync(full, 'utf8');
    } catch (_) {
      continue;
    }
    const pathname = relToPath(rel);
    const linkPaths = getInternalLinkPaths(html);
    pageData.push({ pathname, full, linkPaths });

    const meta = getPageMetadata(html);
    const isHomePage = rel === 'index.html';

    if (!meta.canonical || meta.canonical.length < 10) missingCanonical.push(rel);
    if (!meta.description || meta.description.trim().length === 0) missingMetaDescription.push(rel);
    if (meta.noindex) hasNoindex.push(rel);
    if (!isHomePage && meta.canonical && HOMEPAGE_CANONICAL.test(meta.canonical)) canonicalToHomepage.push(rel);

    if (meta.title) {
      if (!titleToPaths[meta.title]) titleToPaths[meta.title] = [];
      titleToPaths[meta.title].push(rel);
    }
    if (meta.canonical) {
      if (!canonicalToPaths[meta.canonical]) canonicalToPaths[meta.canonical] = [];
      canonicalToPaths[meta.canonical].push(rel);
    }

    const text = getMainContentText(html);
    const words = countWords(text);
    if (words < MIN_WORDS) under400Words.push({ path: rel, words });

    const linkCount = countInternalLinks(html);
    if (linkCount < MIN_INTERNAL_LINKS) under20InternalLinks.push({ path: rel, count: linkCount });

    if (/<link[^>]+href=["'][^"']*styles\.css["']/i.test(html)) referencesStylesCss.push(rel);
    const scriptSrcMatch = html.match(/<script[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi);
    if (scriptSrcMatch) {
      scriptSrcMatch.forEach(function (tag) {
        if (!/defer/i.test(tag)) scriptSrcWithoutDefer.push(rel);
      });
    }
  }

  const pathnameToFull = {};
  pageData.forEach((p) => { pathnameToFull[p.pathname] = p.full; });

  let brokenInternalLinks = 0;
  pageData.forEach((p) => {
    p.linkPaths.forEach((linkPath) => {
      const fp = pathToFilePath(linkPath);
      if (!fs.existsSync(fp)) brokenInternalLinks += 1;
    });
  });

  const sitemapPaths = getSitemapPaths();
  const reachable = new Set(['/']);
  const queue = [{ path: '/', depth: 0 }];
  const seen = new Set(['/']);
  const maxDepth = 3;
  while (queue.length > 0) {
    const { path: p, depth } = queue.shift();
    if (depth > maxDepth) continue;
    const full = pathnameToFull[p];
    if (full && fs.existsSync(full)) {
      try {
        const html = fs.readFileSync(full, 'utf8');
        getInternalLinkPaths(html).forEach((linkPath) => {
          const norm = linkPath === '' ? '/' : linkPath;
          reachable.add(norm);
          if (!seen.has(norm)) {
            seen.add(norm);
            queue.push({ path: norm, depth: depth + 1 });
          }
        });
      } catch (_) {}
    }
  }
  const pathnameSet = new Set(pageData.map((p) => p.pathname));
  const orphanPaths = sitemapPaths.filter((sp) => pathnameSet.has(sp) && !reachable.has(sp));
  const orphanPages = orphanPaths.length;

  Object.entries(titleToPaths).forEach(([title, paths]) => {
    if (paths.length > 1) duplicateTitles[title] = paths;
  });
  Object.entries(canonicalToPaths).forEach(([canonical, paths]) => {
    if (paths.length > 1) duplicateCanonicals[canonical] = paths;
  });

  const refStylesCssUnique = [...new Set(referencesStylesCss)];
  const scriptNoDeferUnique = [...new Set(scriptSrcWithoutDefer)];

  const duplicateCanonicalPages = Object.values(duplicateCanonicals).reduce((sum, paths) => sum + (paths.length - 1), 0);
  const totalPages = htmlFiles.length;
  const authorityCoverageScore = totalPages === 0 ? 1 : Math.max(0, 1 - (orphanPages + missingCanonical.length + canonicalToHomepage.length + duplicateCanonicalPages) / totalPages);

  const summary = {
    totalPages,
    missingCanonical: missingCanonical.length,
    duplicateTitles: Object.keys(duplicateTitles).length,
    missingMetaDescription: missingMetaDescription.length,
    under400Words: under400Words.length,
    under20InternalLinks: under20InternalLinks.length,
    canonicalToHomepage: canonicalToHomepage.length,
    duplicateCanonicals: Object.keys(duplicateCanonicals).length,
    hasNoindex: hasNoindex.length,
    referencesStylesCss: refStylesCssUnique.length,
    scriptSrcWithoutDefer: scriptNoDeferUnique.length,
    orphanPages,
    brokenInternalLinks,
    authorityCoverageScore,
  };

  const integritySummary = {
    orphan_pages: orphanPages,
    broken_internal_links: brokenInternalLinks,
    duplicate_titles: Object.keys(duplicateTitles).length,
    missing_canonical: missingCanonical.length,
    canonical_to_homepage: canonicalToHomepage.length,
    pages_under_400_words: under400Words.length,
    pages_with_less_than_20_internal_links: under20InternalLinks.length,
    authority_coverage_score: Math.round(authorityCoverageScore * 1000) / 1000,
    max_hops_from_home: maxDepth,
  };

  const report = {
    timestamp: new Date().toISOString(),
    outDir: OUT_DIR,
    summary,
    integritySummary,
    missingCanonical,
    duplicateTitles: Object.keys(duplicateTitles).length ? duplicateTitles : undefined,
    missingMetaDescription,
    under400Words: under400Words.length ? under400Words : undefined,
    under20InternalLinks: under20InternalLinks.length ? under20InternalLinks : undefined,
    canonicalToHomepage: canonicalToHomepage.length ? canonicalToHomepage : undefined,
    duplicateCanonicals: Object.keys(duplicateCanonicals).length ? duplicateCanonicals : undefined,
    hasNoindex: hasNoindex.length ? hasNoindex : undefined,
    referencesStylesCss: refStylesCssUnique.length ? refStylesCssUnique : undefined,
    scriptSrcWithoutDefer: scriptNoDeferUnique.length ? scriptNoDeferUnique : undefined,
    orphanPaths: orphanPaths.length ? orphanPaths : undefined,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
  console.log('Index integrity audit complete.');
  console.log('Scanned', htmlFiles.length, 'pages. Report:', REPORT_PATH);
  console.log('Summary:', JSON.stringify(summary, null, 2));
  console.log('');
  console.log('Integrity (clean targets: all 0, authority_coverage_score >= 0.995):');
  console.log(JSON.stringify(integritySummary, null, 2));
  const integrityOk =
    integritySummary.orphan_pages === 0 &&
    integritySummary.broken_internal_links === 0 &&
    integritySummary.duplicate_titles === 0 &&
    integritySummary.missing_canonical === 0 &&
    integritySummary.canonical_to_homepage === 0 &&
    integritySummary.pages_under_400_words === 0 &&
    integritySummary.pages_with_less_than_20_internal_links === 0 &&
    integritySummary.authority_coverage_score >= 0.995;
  if (!integrityOk) {
    console.log('');
    console.log('One or more integrity targets not met. See integritySummary above.');
  }
  if (summary.missingCanonical > 0 || summary.duplicateTitles > 0 || summary.missingMetaDescription > 0 ||
      summary.under400Words > 0 || summary.under20InternalLinks > 0 || summary.canonicalToHomepage > 0 ||
      summary.duplicateCanonicals > 0 || summary.hasNoindex > 0 ||
      summary.referencesStylesCss > 0 || summary.scriptSrcWithoutDefer > 0 || !integrityOk) {
    process.exit(1);
  }
  process.exit(0);
}

run();
