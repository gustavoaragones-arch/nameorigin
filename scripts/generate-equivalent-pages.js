#!/usr/bin/env node
/**
 * Phase 5.2 — Equivalent Name Pages
 * /equivalents/{slug}/index.html — controlled dataset only, static HTML.
 *
 * Usage: node scripts/generate-equivalent-pages.js
 * Run after generate-programmatic-pages.js (name pages must exist).
 */

const fs = require('fs');
const path = require('path');
const { mergeArticleSchema } = require('./aeo-article-schema.js');
const { getBuildDate } = require('./build-date.js');
const { getEquivalents, normSlug } = require('./utils/name-equivalents.js');

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

function loadNames() {
  const enrichedPath = path.join(DATA_DIR, 'names-enriched.json');
  const basePath = path.join(DATA_DIR, 'names.json');
  if (fs.existsSync(enrichedPath)) return JSON.parse(fs.readFileSync(enrichedPath, 'utf8'));
  return JSON.parse(fs.readFileSync(basePath, 'utf8'));
}

function htmlEscape(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function displayNameForSlug(slugStr, nameBySlug) {
  const r = nameBySlug.get(slugStr);
  return r ? r.name : slugStr.charAt(0).toUpperCase() + slugStr.slice(1);
}

function breadcrumbJsonLd(items) {
  const list = items.map((item, i) => {
    const url = item.url && !item.url.startsWith('http') ? SITE_URL + (item.url.startsWith('/') ? item.url : '/' + item.url) : (item.url || SITE_URL + '/');
    return {
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: url,
    };
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: list,
  };
}

/** Static explanation block (~120–180 words) for AI/SEO. */
function whyEquivalentBlock(displayName) {
  return (
    `<section aria-labelledby="why-equivalent-heading">` +
    `<h2 id="why-equivalent-heading">Why These Names Are Equivalent</h2>` +
    `<p class="contextual">` +
    `Personal names often travel across languages through translation, religious texts, and migration. ` +
    `The forms listed for ${htmlEscape(displayName)} reflect historically related spellings or well-attested ` +
    `cognates used in different speech communities—not random sound-alikes. Sound change, spelling conventions, ` +
    `and local pronunciation habits produce recognizable variants: the same underlying name may appear with ` +
    `different vowels or endings while remaining etymologically aligned. Clerical and civil records also ` +
    `standardized names differently by country, which is why you may see parallel forms in neighboring regions. ` +
    `When parents search for a name in another language, they are usually choosing among these established ` +
    `equivalents rather than inventing new ones. NameOrigin documents only curated pairs from our controlled ` +
    `dataset so that each link points to a verified name profile. For pronunciation, popularity, and cultural ` +
    `context for each form, follow the links in the table above. ` +
    `This page is informational and does not replace linguistic or genealogical research for legal naming decisions.` +
    `</p>` +
    `<p class="contextual">` +
    `Search engines and reference works often list these forms under “${htmlEscape(displayName)} in Spanish,” ` +
    `“${htmlEscape(displayName)} equivalent,” or similar queries; this hub answers that intent with explicit language labels ` +
    `and stable URLs you can cite. We refresh listings when our name database updates, but equivalence membership changes only ` +
    `when the editorial dataset changes—never from automated similarity scores.` +
    `</p></section>`
  );
}

/** Intro ~80–120 words (before table). */
function buildIntroParagraph(displayName, anchorSlug) {
  return (
    `<p class="contextual">` +
    `This page lists established written forms of <a href="/name/${htmlEscape(anchorSlug)}/">${htmlEscape(displayName)}</a> ` +
    `used in other languages or regions. Each equivalent links to our full profile for that spelling, with meaning, etymology, and popularity. ` +
    `Equivalents here are curated—not inferred—so you can trust that each name exists in our directory. ` +
    `Families comparing bilingual options, researchers mapping cognates, and parents choosing a cross-border name ` +
    `can use the table below as a concise map. For similar-sounding names that are not historical equivalents, ` +
    `use the “Names like” and related sections on the individual name pages instead of this list.` +
    `</p>`
  );
}

/** Link mesh for ≥15 internal links and total word count ≥500. */
function buildExploreMesh(displayName, anchorSlug, equivSlugs, nameBySlug) {
  const nameLink = (s) => `<a href="/name/${htmlEscape(s)}/">${htmlEscape(displayNameForSlug(s, nameBySlug))}</a>`;
  const meshIntro = `<p class="contextual">Browse more on NameOrigin: hubs, tools, and directories.</p>`;
  const links = [
    `<a href="/name/${htmlEscape(anchorSlug)}/">Full profile for ${htmlEscape(displayName)}</a>`,
    ...equivSlugs.slice(0, 6).map((s) => nameLink(s)),
    '<a href="/names">Baby names hub</a>',
    '<a href="/names/boy' + EXT + '">Boy names</a>',
    '<a href="/names/girl' + EXT + '">Girl names</a>',
    '<a href="/names/unisex' + EXT + '">Unisex names</a>',
    '<a href="/names/letters' + EXT + '">Browse by letter</a>',
    '<a href="/names/popular' + EXT + '">Popular names</a>',
    '<a href="/names/trending' + EXT + '">Trending names</a>',
    '<a href="/popularity/">Popularity by year</a>',
    '<a href="/compare/">Compare countries</a>',
    '<a href="/names/with-last-name' + EXT + '">Last name compatibility</a>',
    '<a href="/compatibility/">Compatibility tool</a>',
    '<a href="/tools/name-certificate/">Name certificate tool</a>',
    '<a href="/">Homepage</a>',
    '<a href="/all-name-pages.html">All name pages</a>',
    '<a href="/legal/privacy.html">Privacy</a>',
    '<a href="/legal/terms.html">Terms</a>',
  ];
  const mesh = `<p class="internal-links">${links.join(' · ')}</p>`;
  const extraCopy = (
    `<section aria-labelledby="equivalents-more-heading">` +
    `<h2 id="equivalents-more-heading">More ways to explore ${htmlEscape(displayName)}</h2>` +
    `<p class="contextual">` +
    `Name choices often involve more than etymology: rhythm with the surname, sibling sets, and cultural fit all matter. ` +
    `After reviewing ${htmlEscape(displayName)} in other languages, you may want to compare popularity curves by country, ` +
    `see names from the same origin cluster, or test how ${htmlEscape(displayName)} pairs with common last names. ` +
    `Our site links these workflows from each name page so you can move from equivalence lists to deeper research without leaving the directory. ` +
    `Bookmark this page if you need a stable reference for multilingual naming discussions.` +
    `</p></section>`
  );
  return meshIntro + mesh + extraCopy;
}

function countWords(html) {
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.split(/\s+/).filter(Boolean).length;
}

function countInternalLinks(html) {
  let n = 0;
  const re = /<a\s+[^>]*href\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const href = (m[1] || '').trim();
    if (href.startsWith('/') || href.includes('nameorigin.io')) n += 1;
  }
  return n;
}

function run() {
  const names = loadNames();
  const nameBySlug = new Map(names.map((n) => [normSlug(n.name), n]));
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'name-equivalents.json'), 'utf8'));
  } catch (e) {
    console.error('Phase 5.2: missing or invalid data/name-equivalents.json');
    process.exit(1);
  }

  const keys = Object.keys(raw || {}).sort();
  let written = 0;
  for (const key of keys) {
    const anchorSlug = normSlug(key);
    if (!anchorSlug || !nameBySlug.has(anchorSlug)) continue;
    const equivs = getEquivalents(anchorSlug);
    if (!equivs.length) continue;

    const record = nameBySlug.get(anchorSlug);
    const displayName = record.name;
    const pathSeg = '/equivalents/' + anchorSlug + '/';
    const canonical = SITE_URL + pathSeg;
    const equivSlugs = equivs.map((e) => e.slug);

    const tableRows = equivs
      .map((e) => {
        const s = e.slug;
        const dn = displayNameForSlug(s, nameBySlug);
        return `<tr><td>${htmlEscape(e.lang)}</td><td><a href="/name/${htmlEscape(s)}/">${htmlEscape(dn)}</a></td></tr>`;
      })
      .join('\n');

    const table = `<table class="name-facts" aria-label="Equivalent names for ${htmlEscape(displayName)}"><thead><tr><th>Language</th><th>Name</th></tr></thead><tbody>${tableRows}</tbody></table>`;

    const buildDate = getBuildDate();
    const mainInner =
      `<h1>${htmlEscape(displayName)} in Other Languages</h1>` +
      buildIntroParagraph(displayName, anchorSlug) +
      table +
      whyEquivalentBlock(displayName) +
      `<p class="last-updated"><time datetime="${buildDate.iso}">Last updated: ${buildDate.display}</time></p>` +
      buildExploreMesh(displayName, anchorSlug, equivSlugs, nameBySlug);

    const breadcrumbItems = [
      { name: 'Home', url: '/' },
      { name: 'Baby Names', url: '/names' },
      { name: displayName + ' — equivalents', url: pathSeg },
    ];
    const breadcrumbHtml =
      '<nav aria-label="Breadcrumb" class="breadcrumb">' +
      breadcrumbItems
        .map((item, i) => {
          const u = item.url.startsWith('/') ? item.url : '/' + item.url;
          if (i === breadcrumbItems.length - 1) return `<span aria-current="page">${htmlEscape(item.name)}</span>`;
          return `<a href="${htmlEscape(u)}">${htmlEscape(item.name)}</a>`;
        })
        .join(' / ') +
      '</nav>';

    const description = `${displayName} equivalent names in other languages — curated forms with links to full name meanings and origins on NameOrigin.`;
    const articleLd = mergeArticleSchema({
      headline: `${displayName} in Other Languages`,
      description,
      mainEntityOfPage: canonical,
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index, follow">
  <meta name="description" content="${htmlEscape(description.slice(0, 160))}">
  <title>${htmlEscape(displayName)} in Other Languages | NameOrigin</title>
  <link rel="stylesheet" href="/styles.min.css">
  <link rel="canonical" href="${htmlEscape(canonical)}" />
  <script type="application/ld+json">${JSON.stringify(breadcrumbJsonLd(breadcrumbItems))}</script>
  <script type="application/ld+json">${JSON.stringify(articleLd)}</script>
</head>
<body>
  <header class="site-header" role="banner">
    <div class="container">
      <a href="/" class="site-logo">nameorigin.io</a>
      <nav class="site-nav" aria-label="Main navigation">
        <button class="mobile-menu-toggle" aria-label="Open menu">
  ☰
        </button>
        <div class="nav-inner">
        <a href="/names">Names</a>
        <a href="/names/boy${EXT}">Boy Names</a>
        <a href="/names/girl${EXT}">Girl Names</a>
        <a href="/names/unisex${EXT}">Unisex Names</a>
        <a href="/names/letters${EXT}">By letter</a>
        <a href="/all-name-pages.html">All name pages</a>
        </div>
      </nav>
    </div>
  </header>
  <main class="container section">
    ${breadcrumbHtml}
    ${mainInner}
  </main>
  <footer class="site-footer" role="contentinfo">
    <div class="container">
      <div class="footer__bottom">
        <p class="mb-0">© 2026 nameorigin.io. All rights reserved.<br>
nameorigin.io is owned and operated by Albor Digital LLC, an independent product studio based in Wyoming, USA.</p>
        <p>Contact: <a href="mailto:contact@nameorigin.io">contact@nameorigin.io</a></p>
        <p class="crawl-links">Browse: <a href="/names/">All names</a> | <a href="/names/boy${EXT}">Boy names</a> | <a href="/names/girl${EXT}">Girl names</a> | <a href="/popularity/">Popular names</a></p>
        <p><a href="/sitemap/">Sitemap</a></p>
      </div>
    </div>
  </footer>
  <script src="/assets/js/navigation.js" defer></script>
</body>
</html>`;

    const wc = countWords(html);
    const ic = countInternalLinks(html);
    if (wc < 500) {
      console.warn('Phase 5.2: word count low for', anchorSlug, wc);
    }
    if (ic < 15) {
      console.warn('Phase 5.2: internal links low for', anchorSlug, ic);
    }

    const outDir = path.join(OUT_DIR, 'equivalents', anchorSlug);
    ensureDir(outDir);
    fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
    written += 1;
  }

  console.log('Phase 5.2: wrote', written, 'equivalent pages under /equivalents/{slug}/');
}

run();
