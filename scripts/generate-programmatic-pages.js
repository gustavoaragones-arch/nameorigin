#!/usr/bin/env node
/**
 * generate-programmatic-pages.js
 * Generates all SEO programmatic pages: names list, country, gender, combined filters,
 * last-name compatibility, and individual name pages.
 * Output: static .html with breadcrumbs, JSON-LD, canonical, meta, internal links.
 *
 * Structured data: every page has exactly one Breadcrumb JSON-LD, one canonical URL,
 * FAQ JSON-LD when applicable, and a unique <title> per page.
 */

const fs = require('fs');
const path = require('path');

let computeSmoothness;
try {
  computeSmoothness = require('./generate-smoothness-score.js').computeSmoothness;
} catch (_) {
  computeSmoothness = () => ({ score: 50, tier: 'Neutral', explanation_components: [] });
}

let explanationRenderer;
try {
  explanationRenderer = require('./compatibility-explanation-renderer.js');
} catch (_) {
  explanationRenderer = null;
}

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
// Output at project root. Name detail URLs: /name/<slug>/ (directory); other programmatic: /names/canada.html etc. Use OUT_DIR=programmatic to nest under /programmatic.
const OUT_DIR = process.env.OUT_DIR ? path.join(ROOT, process.env.OUT_DIR) : ROOT;

const SITE_URL = process.env.SITE_URL || 'https://nameorigin.io';
// Static .html URLs for crawlable programmatic pages (names, countries, etc.). Name detail: directory-only /name/<slug>/ (Phase 2.25A).
const EXT = '.html';
/** URL path for a name detail page (directory-based, no .html). Use for all links and canonical. */
function nameDetailPath(s) { return '/name/' + slug(s) + '/'; }
/** URL path for Names Like page. Mesh: horizontal (semantic) axis. */
function namesLikePath(s) { return '/names-like/' + slug(s) + '/'; }
/** Top compatibility surnames for mesh links (4–6 links; controlled set, no combinatorial explosion). */
const TOP_COMPATIBILITY_SURNAMES = ['smith', 'garcia', 'johnson', 'williams'];
// Step 7: Breadcrumb label for names index (Home > Baby Names > …)
const BREADCRUMB_NAMES_LABEL = 'Baby Names';

function loadJson(name) {
  const p = path.join(DATA_DIR, name + '.json');
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function slug(str) {
  return String(str).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function htmlEscape(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

function faqJsonLd(faqs) {
  if (!faqs || faqs.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: { '@type': 'Answer', text: q.answer },
    })),
  };
}

function defaultFaqForPage(path, title) {
  const faqs = [
    { question: 'What is nameorigin.io?', answer: 'nameorigin.io helps you discover the meaning and origin of first names. Browse by gender, country, style, or letter.' },
    { question: 'How can I find names that go with my last name?', answer: 'Use the Last name compatibility section to see first names that sound good with your surname, plus phonetic and cultural tips.' },
  ];
  if (path && path.includes('/name/')) {
    faqs.unshift({ question: 'What does this name mean?', answer: 'See the Meaning & origin section above for the meaning, origin, and gender of this name.' });
  }
  if (path && path.includes('/names/with-last-name')) {
    faqs.unshift({ question: 'How does first and last name compatibility work?', answer: 'Names that end in a vowel often flow well with last names starting with a consonant, and vice versa. Similar syllable count also helps.' });
  }
  if (path && path.match(/\/names\/[a-z]\.html?$/)) {
    faqs.unshift({ question: 'How do I browse names by letter?', answer: 'Use the A–Z links on this page or go to Browse by letter to see all names starting with each letter of the alphabet.' });
  }
  if (path && path.match(/\/names\/(usa|canada|france|india|ireland)\.html$/)) {
    faqs.unshift({ question: 'What names are popular in this country?', answer: 'This page shows trending, popular, and rising names for the country. Each name links to its full meaning and origin.' });
  }
  return faqJsonLd(faqs);
}

function personJsonLd(nameRecord) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: nameRecord.name,
    description: nameRecord.meaning || ('Meaning and origin of the name ' + nameRecord.name),
  };
}

/** Structured data for popularity by year on name pages. */
function popularityJsonLd(nameRecord, chartData, peakYear, latestRank) {
  if (!chartData || chartData.length === 0) return null;
  const analyzed = analyzeTrend(chartData);
  const listItems = chartData.map((d, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: d.year + (d.rank != null ? ': Rank ' + d.rank : ''),
  }));
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Popularity of ' + nameRecord.name + ' by year',
    description: 'Baby name popularity rankings by year.',
    numberOfItems: listItems.length,
    itemListElement: listItems,
  };
  if (peakYear != null || latestRank != null || analyzed.trend) {
    schema.additionalProperty = [];
    if (peakYear != null) schema.additionalProperty.push({ '@type': 'PropertyValue', name: 'peakYear', value: peakYear });
    if (latestRank != null) schema.additionalProperty.push({ '@type': 'PropertyValue', name: 'latestRank', value: latestRank });
    if (analyzed.trend) schema.additionalProperty.push({ '@type': 'PropertyValue', name: 'trend', value: analyzed.trend });
  }
  return schema;
}

const ORIGIN_BADGES = {
  ireland: { flag: '🇮🇪', label: 'Irish', hint: 'Irish and Celtic origins; common in Ireland and the diaspora.' },
  italy: { flag: '🇮🇹', label: 'Italian', hint: 'From Latin and Italian tradition; used across Romance-language cultures.' },
  india: { flag: '🇮🇳', label: 'Sanskrit', hint: 'Sanskrit and Indian origins; classical and modern usage.' },
  germany: { flag: '🇩🇪', label: 'German', hint: 'Germanic roots; widespread in German-speaking and European naming.' },
  hebrew: { flag: '🇮🇱', label: 'Hebrew', hint: 'Hebrew and biblical tradition; used in Jewish and broader contexts.' },
  latin: { flag: '🇮🇹', label: 'Latin', hint: 'Latin origin; classical and Romance-language naming.' },
  sanskrit: { flag: '🇮🇳', label: 'Sanskrit', hint: 'Sanskrit origin; traditional and contemporary Indian names.' },
  german: { flag: '🇩🇪', label: 'German', hint: 'Germanic origin; common in German and European naming.' },
  irish: { flag: '🇮🇪', label: 'Irish', hint: 'Irish and Celtic origins; popular in Ireland and abroad.' },
  french: { flag: '🇫🇷', label: 'French', hint: 'French tradition; used in France and Francophone regions.' },
  english: { flag: '🇬🇧', label: 'English', hint: 'English-speaking usage; often from Old English or adopted from other languages.' },
};

function getOriginBadge(record) {
  if (!record) return null;
  const country = (record.origin_country || '').toLowerCase().replace(/\s+/g, '');
  const lang = (record.language || '').toLowerCase().replace(/\s+/g, '');
  return ORIGIN_BADGES[country] || ORIGIN_BADGES[lang] || null;
}

function originBadgeHtml(record) {
  const badge = getOriginBadge(record);
  if (!badge) return '';
  return `<div class="origin-badges" aria-label="Cultural origin"><span class="origin-badge" title="${htmlEscape(badge.hint)}">${badge.flag} ${htmlEscape(badge.label)}</span></div>`;
}

function baseLayout(opts) {
  // Step 1 (SSG): Canonical must be exact URL path for this page — never homepage for non-home. Written at build time.
  const title = opts.title || 'Name Origin';
  const description = opts.description || 'Discover the meaning and origin of first names.';
  const pathSeg = opts.path || '/';
  const canonical = opts.canonical != null ? opts.canonical : SITE_URL + pathSeg;
  // Step 5: BreadcrumbList JSON-LD + visible breadcrumb (Home > Baby Names > Canada > Girl Names) on name, country, gender pages
  const breadcrumbItems = opts.breadcrumb && opts.breadcrumb.length ? opts.breadcrumb : [{ name: 'Home', url: SITE_URL + '/' }, { name: title.replace(/\s*\|\s*nameorigin\.io\s*$/i, '').trim() || 'Names', url: SITE_URL + pathSeg }];
  const breadcrumbSchema = JSON.stringify(breadcrumbJsonLd(breadcrumbItems));
  const faqSchemaObj = opts.faqSchema !== undefined ? opts.faqSchema : defaultFaqForPage(pathSeg, title);
  const faqSchema = faqSchemaObj ? JSON.stringify(faqSchemaObj) : '';
  let extraSchemaHtml = '';
  if (opts.extraSchema) {
    const arr = Array.isArray(opts.extraSchema) ? opts.extraSchema : [opts.extraSchema];
    extraSchemaHtml = arr.filter(Boolean).map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n  ');
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index, follow">
  <meta name="description" content="${htmlEscape(description)}">
  <title>${htmlEscape(title)}</title>
  <link rel="stylesheet" href="/styles.min.css">
  <link rel="canonical" href="${htmlEscape(canonical)}" />
  <script type="application/ld+json">${breadcrumbSchema}</script>
  ${faqSchema ? `<script type="application/ld+json">${faqSchema}</script>` : ''}
  ${extraSchemaHtml}
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
    ${opts.breadcrumbHtml || ''}
    ${opts.mainContent || ''}
  </main>
  <footer class="site-footer" role="contentinfo">
    <div class="container">
      <div class="footer__bottom">
        <p class="mb-0"><a href="/">nameorigin.io</a> — Curated name meanings and origins.</p>
      </div>
    </div>
  </footer>
</body>
</html>`;
}

function breadcrumbHtml(items) {
  const links = items.map((item, i) => {
    const isLast = i === items.length - 1;
    if (isLast) return `<span aria-current="page">${htmlEscape(item.name)}</span>`;
    return `<a href="${htmlEscape(item.url)}">${htmlEscape(item.name)}</a>`;
  });
  return '<nav aria-label="Breadcrumb" class="breadcrumb">' + links.join(' / ') + '</nav>';
}

function getTrendingNameIds(popularity, limit = 80) {
  const rising = (popularity || []).filter((p) => p.trend_direction === 'rising');
  const byId = new Map();
  rising.forEach((p) => byId.set(p.name_id, (byId.get(p.name_id) || 0) + 1));
  return [...byId.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).slice(0, limit);
}

function getPopularNameIds(popularity, limit = 100) {
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

const CATEGORY_TO_STYLE_SLUG = { classical: 'classic' };

function internalLinksForName(record, names, popularity, categories, variants) {
  const links = [];
  const nameSlug = (n) => nameDetailPath(n.name);
  const len = (record.name || '').length;
  const letter = (record.first_letter || '').toLowerCase();
  const originKey = (record.origin_country || '').toLowerCase() || (record.language || '').toLowerCase();
  const recordSyllables = record.syllables != null ? record.syllables : 0;
  const recordEndsVowel = /[aeiouy]$/i.test(String(record.name || '').trim());

  // --- Core links (4) ---
  links.push({ href: '/', text: 'Home' });
  links.push({ href: '/programmatic/', text: 'Name generator & tools' });
  links.push({ href: '/names/trending' + EXT, text: 'Trending names' });
  links.push({ href: '/names/popular' + EXT, text: 'Top names' });
  links.push({ href: '/names', text: 'All names' });

  // --- Contextual: same gender ---
  links.push({ href: '/names/' + (record.gender || '') + EXT, text: (record.gender || '') + ' names' });
  const sameGender = names.filter((n) => n.gender === record.gender && n.id !== record.id);
  sameGender.slice(0, 4).forEach((n) => links.push({ href: nameSlug(n), text: n.name }));

  // --- Contextual: same origin / country page ---
  if (originKey) {
    const countrySlug = slug(record.origin_country || record.language);
    links.push({ href: '/names/' + countrySlug + EXT, text: 'Names from ' + (record.origin_country || record.language) });
    const sameOrigin = names.filter(
      (n) => n.id !== record.id && ((n.origin_country || '').toLowerCase() === originKey || (n.language || '').toLowerCase() === originKey)
    );
    sameOrigin.slice(0, 4).forEach((n) => links.push({ href: nameSlug(n), text: n.name }));
  }

  // --- Contextual: same style (link to style pages for this name's categories) ---
  const nameCategories = (categories || []).filter((c) => c.name_id === record.id).map((c) => c.category);
  nameCategories.slice(0, 3).forEach((cat) => {
    const styleSlug = CATEGORY_TO_STYLE_SLUG[cat] || cat;
    links.push({ href: '/names/style/' + styleSlug + EXT, text: cat.charAt(0).toUpperCase() + cat.slice(1) + ' names' });
  });

  // --- Contextual: similar phonetics (syllables or vowel ending) ---
  const similarPhonetics = names.filter(
    (n) =>
      n.id !== record.id &&
      (Math.abs((n.syllables != null ? n.syllables : 0) - recordSyllables) <= 1 ||
        (recordEndsVowel && /[aeiouy]$/i.test(String(n.name || '').trim())))
  );
  similarPhonetics.slice(0, 4).forEach((n) => links.push({ href: nameSlug(n), text: n.name }));

  // --- Contextual: alphabet page ---
  if (letter) {
    links.push({ href: '/names/' + letter + EXT, text: 'Names starting with ' + (record.first_letter || letter) });
    const sameLetter = names.filter((n) => (n.first_letter || '').toLowerCase() === letter && n.id !== record.id);
    sameLetter.slice(0, 4).forEach((n) => links.push({ href: nameSlug(n), text: n.name }));
  }

  // --- Contextual: similar length ---
  const similarLength = names.filter((n) => n.id !== record.id && Math.abs((n.name || '').length - len) <= 1);
  similarLength.slice(0, 3).forEach((n) => links.push({ href: nameSlug(n), text: n.name }));

  // --- Trending names (contextual) ---
  const trendingIds = getTrendingNameIds(popularity);
  const trending = names.filter((n) => n.id !== record.id && trendingIds.includes(n.id));
  trending.slice(0, 4).forEach((n) => links.push({ href: nameSlug(n), text: n.name }));

  return links;
}

function getSimilarNamesForName(record, names, popularity, categories, limit = 8) {
  const nameSlug = (n) => nameDetailPath(n.name);
  const ids = new Set();
  const similar = [];
  const letter = (record.first_letter || '').toLowerCase();
  const len = (record.name || '').length;
  const nameCats = new Set((categories || []).filter((c) => c.name_id === record.id).map((c) => c.category));
  const trendingIds = getTrendingNameIds(popularity, 50);

  const add = (list, max) => {
    for (const n of list) {
      if (n.id === record.id || ids.has(n.id)) continue;
      ids.add(n.id);
      similar.push(n);
      if (similar.length >= limit) return;
    }
  };

  const sameGender = names.filter((n) => n.gender === record.gender && n.id !== record.id);
  const sameLetter = sameGender.filter((n) => (n.first_letter || '').toLowerCase() === letter);
  const sameStyle = nameCats.size
    ? names.filter((n) => n.id !== record.id && (categories || []).some((c) => c.name_id === n.id && nameCats.has(c.category)))
    : [];
  const similarLen = sameGender.filter((n) => Math.abs((n.name || '').length - len) <= 1);
  const trending = names.filter((n) => trendingIds.includes(n.id) && n.id !== record.id);

  add(sameLetter, 3);
  add(sameStyle, 2);
  add(similarLen, 2);
  add(trending, 2);
  add(sameGender, limit - similar.length);
  return similar.slice(0, limit);
}

function coreLinksHtml() {
  const core = [
    { href: '/', text: 'Home' },
    { href: '/programmatic/', text: 'Name generator & tools' },
    { href: '/names/trending' + EXT, text: 'Trending names' },
    { href: '/names/popular' + EXT, text: 'Top names' },
    { href: '/names', text: 'All names' },
    { href: '/names/boy' + EXT, text: 'Boy names' },
    { href: '/names/girl' + EXT, text: 'Girl names' },
    { href: '/names/unisex' + EXT, text: 'Unisex names' },
    { href: '/names/style' + EXT, text: 'Names by style' },
    { href: '/names/with-last-name' + EXT, text: 'Last name compatibility' },
    { href: '/names/letters' + EXT, text: 'Browse by letter' },
  ];
  return core.map((l) => `<a href="${l.href}">${htmlEscape(l.text)}</a>`).join(' · ');
}

// Shared internal-link sections for filter pages (15–25 links target)
const FILTER_COUNTRY_SLUGS = [{ slug: 'usa', label: 'USA' }, { slug: 'canada', label: 'Canada' }, { slug: 'france', label: 'France' }, { slug: 'india', label: 'India' }, { slug: 'ireland', label: 'Ireland' }];
function alphabetSectionHtml() {
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  return '<section aria-labelledby="alphabet-heading"><h2 id="alphabet-heading">Browse by letter (A–Z)</h2><p class="letters-hub">' + letters.map((l) => '<a href="/names/' + l + EXT + '">' + l.toUpperCase() + '</a>').join(' ') + '</p></section>';
}
function genderSectionHtml() {
  return '<section aria-labelledby="gender-heading"><h2 id="gender-heading">Browse by gender</h2><p class="name-links"><a href="/names/boy' + EXT + '">Boy names</a> · <a href="/names/girl' + EXT + '">Girl names</a> · <a href="/names/unisex' + EXT + '">Unisex names</a></p></section>';
}
function countrySectionHtml() {
  return '<section aria-labelledby="country-heading"><h2 id="country-heading">Browse by country</h2><p class="name-links">' + FILTER_COUNTRY_SLUGS.map((c) => '<a href="/names/' + c.slug + EXT + '">' + htmlEscape(c.label) + '</a>').join(' · ') + '</p></section>';
}

/** Phase 2.7 — Lightweight line chart (inline SVG, no external libs). data: [{ year, rank }, ...] sorted by year ASC. Lower rank = more popular. */
function generateLineChart(data) {
  if (!data || data.length < 2) return '';
  const width = 320;
  const height = 120;
  const pad = { top: 8, right: 8, bottom: 20, left: 0 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const ranks = data.map((d) => d.rank != null ? Math.max(1, d.rank) : 1000);
  const minRank = Math.min(...ranks);
  const maxRank = Math.max(...ranks);
  const rankRange = maxRank - minRank || 1;
  const yearMin = Math.min(...data.map((d) => d.year));
  const yearMax = Math.max(...data.map((d) => d.year));
  const yearRange = yearMax - yearMin || 1;
  const points = data.map((d) => {
    const x = pad.left + (d.year - yearMin) / yearRange * innerW;
    const r = d.rank != null ? Math.max(1, d.rank) : 1000;
    const y = pad.top + innerH * (1 - (r - minRank) / rankRange);
    return `${Math.round(x)},${Math.round(y)}`;
  }).join(' ');
  const step = Math.max(1, Math.floor(data.length / 6));
  const yearTicks = data.filter((_, i) => i % step === 0 || i === data.length - 1);
  const labels = yearTicks.map((d) => {
    const x = pad.left + (d.year - yearMin) / yearRange * innerW;
    return `<text x="${x}" y="${height - 2}" font-size="9" text-anchor="middle">${d.year}</text>`;
  }).join('');
  return `<svg class="popularity-chart-svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Popularity over time"><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>${labels}</svg>`;
}

/** Trend Summary Engine — detect trend from sorted rows [{ year, rank }, ...]. */
function analyzeTrend(rows) {
  if (!rows || rows.length < 2) return { trend: 'stable' };
  const first = rows[0];
  const last = rows[rows.length - 1];
  const firstRank = first.rank != null ? first.rank : 9999;
  const lastRank = last.rank != null ? last.rank : 9999;
  const peakEntry = rows.reduce((best, d) => (d.rank != null && d.rank < best.rank ? d : best), rows[0]);
  const peakYear = peakEntry.year;

  if (lastRank < firstRank) {
    return { trend: 'rising', sinceYear: first.year, peakYear };
  }
  if (lastRank > firstRank) {
    if (peakYear === first.year) {
      return { trend: 'declining', sinceYear: peakYear, peakYear };
    }
    return { trend: 'peaked', sinceYear: peakYear, peakYear };
  }
  return { trend: 'stable', sinceYear: first.year, peakYear };
}

/** Short unique sentence from analyzeTrend result. Reduces template feel. */
function getTrendSummary(name, data, peakYear, latestRank) {
  if (!data || data.length < 2) return '';
  const analyzed = analyzeTrend(data);
  const nameEsc = htmlEscape(name);
  switch (analyzed.trend) {
    case 'rising':
      return analyzed.sinceYear
        ? nameEsc + ' has risen steadily since ' + analyzed.sinceYear + '.'
        : nameEsc + ' has reached peak popularity in ' + (peakYear || '') + '.';
    case 'declining':
      return analyzed.sinceYear
        ? nameEsc + ' has steadily declined since ' + analyzed.sinceYear + '.'
        : nameEsc + ' has declined in rank in recent years.';
    case 'peaked':
      return analyzed.peakYear
        ? nameEsc + ' peaked in ' + analyzed.peakYear + ' and has declined since.'
        : nameEsc + ' has declined from its peak.';
    case 'stable':
    default:
      return nameEsc + ' has stayed stable in popularity' + (analyzed.peakYear ? ' with a peak in ' + analyzed.peakYear + '.' : '.');
  }
}

function generateNamePage(record, names, popularity, categories, variants) {
  const nameSlug = slug(record.name);
  const pathSeg = nameDetailPath(record.name);
  const url = SITE_URL + pathSeg;
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL + '/' },
    { name: BREADCRUMB_NAMES_LABEL, url: SITE_URL + '/names' },
    { name: record.name, url },
  ];
  const similarNames = getSimilarNamesForName(record, names, popularity, categories, 10);
  const similarNamesHtml =
    similarNames.length > 0
      ? '<ul class="name-list">' +
        similarNames.map((n) => `<li><a href="${nameDetailPath(n.name)}">${htmlEscape(n.name)}</a></li>`).join('') +
        '</ul>'
      : '';

  const letter = (record.first_letter || (record.name || '').charAt(0) || '').toLowerCase();
  const originKey = (record.origin_country || '').toLowerCase().replace(/\s+/g, '') || (record.language || '').toLowerCase().replace(/\s+/g, '');
  const countrySlugForOrigin = slug(record.origin_country || record.language);
  const countryCodeForPopular = countrySlugForOrigin ? (POP_COUNTRY_BY_SLUG[countrySlugForOrigin.toLowerCase()] || null) : null;
  const sameOrigin = names.filter(
    (n) => n.id !== record.id && ((n.origin_country || '').toLowerCase() === (record.origin_country || '').toLowerCase() || (n.language || '').toLowerCase() === (record.language || '').toLowerCase())
  );
  const sameGender = names.filter((n) => n.gender === record.gender && n.id !== record.id);
  const sameLetter = names.filter((n) => (n.first_letter || (n.name || '').charAt(0) || '').toLowerCase() === letter && n.id !== record.id);
  const nameById = new Map(names.map((n) => [n.id, n]));
  const popularInCountryIds = countryCodeForPopular ? getPopularNameIdsForCountry(popularity, countryCodeForPopular, 12) : [];
  const popularInCountry = popularInCountryIds.map((id) => nameById.get(id)).filter((n) => n && n.id !== record.id).slice(0, 10);
  const nameLink = (n) => `<a href="${nameDetailPath(n.name)}">${htmlEscape(n.name)}</a>`;
  const sectionList = (arr, max) => arr.slice(0, max).map(nameLink).join(', ');

  // Mesh B: Names Like Cluster (Semantic Axis) — 8–12 links
  const namesLikeLink = `<a href="${namesLikePath(record.name)}">Names similar to ${htmlEscape(record.name)}</a>`;
  const similarSection =
    `<section aria-labelledby="similar-heading"><h2 id="similar-heading">Names Similar to ${htmlEscape(record.name)}</h2><p class="contextual">${namesLikeLink}.</p>${similarNames.length > 0 ? '<ul class="name-list">' + similarNames.slice(0, 10).map((n) => `<li>${nameLink(n)}</li>`).join('') + '</ul>' : ''}</section>`;
  const sameOriginSection = sameOrigin.length > 0
    ? `<section aria-labelledby="same-origin-heading"><h2 id="same-origin-heading">Same origin names</h2><p class="name-links">${sectionList(sameOrigin, 8)}</p><p><a href="/names/${countrySlugForOrigin}${EXT}">Names from ${htmlEscape(record.origin_country || record.language)}</a></p></section>`
    : (countrySlugForOrigin ? `<section aria-labelledby="same-origin-heading"><h2 id="same-origin-heading">Same origin names</h2><p><a href="/names/${countrySlugForOrigin}${EXT}">Names from ${htmlEscape(record.origin_country || record.language)}</a></p></section>` : '');
  const sameGenderSection = sameGender.length > 0
    ? `<section aria-labelledby="same-gender-heading"><h2 id="same-gender-heading">Same gender names</h2><p class="name-links">${sectionList(sameGender, 8)}</p><p><a href="/names/${record.gender || ''}${EXT}">All ${record.gender || ''} names</a></p></section>`
    : (record.gender ? `<section aria-labelledby="same-gender-heading"><h2 id="same-gender-heading">Same gender names</h2><p><a href="/names/${record.gender}${EXT}">All ${record.gender} names</a></p></section>` : '');
  const letterSection = letter && LETTERS.includes(letter)
    ? (sameLetter.length > 0
      ? `<section aria-labelledby="letter-heading"><h2 id="letter-heading">Names starting with ${letter.toUpperCase()}</h2><p class="name-links">${sectionList(sameLetter, 8)}</p><p><a href="/names/${letter}${EXT}">All names starting with ${letter.toUpperCase()}</a></p></section>`
      : `<section aria-labelledby="letter-heading"><h2 id="letter-heading">Names starting with ${letter.toUpperCase()}</h2><p><a href="/names/${letter}${EXT}">All names starting with ${letter.toUpperCase()}</a></p></section>`)
    : '';
  const popularCountrySection = popularInCountry.length > 0 && countrySlugForOrigin
    ? `<section aria-labelledby="popular-country-heading"><h2 id="popular-country-heading">Popular names in ${htmlEscape(record.origin_country || record.language)}</h2><p class="name-links">${sectionList(popularInCountry, 10)}</p><p><a href="/names/${countrySlugForOrigin}${EXT}">Names from ${htmlEscape(record.origin_country || record.language)}</a></p></section>`
    : (countrySlugForOrigin ? `<section aria-labelledby="popular-country-heading"><h2 id="popular-country-heading">Popular names in ${htmlEscape(record.origin_country || record.language)}</h2><p><a href="/names/${countrySlugForOrigin}${EXT}">Names from ${htmlEscape(record.origin_country || record.language)}</a></p></section>` : '');
  // Mesh D: Category + Origin (Authority Axis) — 4–6 links
  const moreAboutLinks = [`<a href="/names/${record.gender || 'boy'}${EXT}">${(record.gender || 'boy').charAt(0).toUpperCase() + (record.gender || 'boy').slice(1)} names</a>`];
  if (countrySlugForOrigin && countrySlugForOrigin !== 'null') moreAboutLinks.push(`<a href="/names/${countrySlugForOrigin}${EXT}">Names from ${htmlEscape(record.origin_country || record.language)}</a>`);
  moreAboutLinks.push(`<a href="/names/usa${EXT}">USA</a>`, `<a href="/names/canada${EXT}">Canada</a>`, `<a href="/names/ireland${EXT}">Ireland</a>`, `<a href="/names/letters${EXT}">By letter (A–Z)</a>`);
  const moreAboutSection = `<section aria-labelledby="more-about-heading"><h2 id="more-about-heading">More About ${htmlEscape(record.name)}</h2><p class="name-links">${moreAboutLinks.slice(0, 6).join(' · ')}</p></section>`;

  const browseSection = `<section aria-labelledby="browse-heading"><h2 id="browse-heading">Browse the site</h2><p class="internal-links"><a href="/">Home</a> · <a href="/names">Baby names hub</a> · <a href="/names/trending${EXT}">Trending names</a> · <a href="/names/popular${EXT}">Popular names</a> · <a href="/names/letters${EXT}">By letter (A–Z)</a> · <a href="/names/style${EXT}">By style</a> · <a href="/names/with-last-name${EXT}">Last name compatibility</a></p></section>`;

  // Step 4: At least 3 related name links (similar, then same letter, then same gender)
  const relatedNames = [...similarNames];
  if (relatedNames.length < 3 && sameLetter.length > 0) {
    sameLetter.filter((n) => !relatedNames.find((r) => r.id === n.id)).forEach((n) => { if (relatedNames.length < 6) relatedNames.push(n); });
  }
  if (relatedNames.length < 3 && sameGender.length > 0) {
    sameGender.filter((n) => !relatedNames.find((r) => r.id === n.id)).forEach((n) => { if (relatedNames.length < 6) relatedNames.push(n); });
  }
  const relatedSection = relatedNames.length > 0
    ? `<section aria-labelledby="related-names-heading"><h2 id="related-names-heading">Related names</h2><p class="name-links">${relatedNames.slice(0, 8).map(nameLink).join(', ')}</p></section>`
    : '';

  const popRows = (popularity || []).filter((p) => p.name_id === record.id);
  const popByYear = new Map();
  popRows.forEach((p) => {
    const y = p.year;
    if (!popByYear.has(y)) popByYear.set(y, []);
    popByYear.get(y).push(p);
  });
  const years = [...popByYear.keys()].sort((a, b) => b - a).slice(0, 15);
  const popTable =
    years.length > 0
      ? '<table class="popularity-chart" aria-label="Popularity by year"><thead><tr><th>Year</th><th>Country</th><th>Rank</th><th>Count</th></tr></thead><tbody>' +
        years
          .flatMap((y) =>
            popByYear.get(y).map((p) => `<tr><td>${y}</td><td>${htmlEscape(p.country)}</td><td>${p.rank != null ? p.rank : '—'}</td><td>${p.count != null ? p.count : '—'}</td></tr>`)
          )
          .join('') +
        '</tbody></table>'
      : '';

  // Phase 2.7 — Popularity Over Time: line chart, peak year, latest rank, trend summary
  const chartData = [...popByYear.entries()]
    .map(([y, rows]) => {
      const bestRank = Math.min(...rows.filter((r) => r.rank != null).map((r) => r.rank), 9999);
      return { year: y, rank: bestRank < 9999 ? bestRank : null };
    })
    .filter((d) => d.rank != null)
    .sort((a, b) => a.year - b.year);
  const peakEntry = chartData.length > 0 ? chartData.reduce((best, d) => (d.rank != null && d.rank < best.rank ? d : best), chartData[0]) : null;
  const peakYear = peakEntry ? peakEntry.year : null;
  const latestEntry = chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const latestRank = latestEntry ? latestEntry.rank : null;
  const trendSummary = chartData.length >= 2 && peakYear ? getTrendSummary(record.name, chartData, peakYear, latestRank) : '';
  const chartSvg = generateLineChart(chartData);
  const popularityOverTimeSection =
    chartData.length >= 2
      ? `<section aria-labelledby="popularity-over-time-heading" class="popularity-over-time"><h2 id="popularity-over-time-heading">Popularity Over Time</h2>${chartSvg}<p class="popularity-stats">${peakYear ? 'Peak year: ' + peakYear + '. ' : ''}${latestRank != null ? 'Latest rank: ' + latestRank + '. ' : ''}</p><div class="ad-slot ad-slot--after-chart" data-ad-slot="name-popularity-chart" aria-label="Advertisement"></div>${trendSummary ? '<p class="contextual">' + trendSummary + '</p><div class="ad-slot ad-slot--after-trend" data-ad-slot="name-trend" aria-label="Advertisement"></div>' : ''}</section>`
      : '';

  // Mesh A: Popularity Cluster (Vertical Axis) — 4–6 links
  const peakYearsSorted = chartData.length ? [...chartData].sort((a, b) => (a.rank || 9999) - (b.rank || 9999)).slice(0, 5).map((d) => d.year) : [];
  const allYearsInData = (popularity || []).map((p) => p.year).filter(Boolean);
  const currentYear = allYearsInData.length > 0 ? Math.max(...allYearsInData) : new Date().getFullYear();
  const peakRank = peakYear && chartData.length ? (chartData.find((d) => d.year === peakYear) || {}).rank : null;
  const yearLinks = [];
  if (peakYear) yearLinks.push('<a href="/popularity/' + peakYear + EXT + '">' + htmlEscape(record.name) + (peakRank ? ' ranked #' + peakRank + ' in ' : ' in ') + peakYear + '</a>');
  yearLinks.push('<a href="/popularity/' + currentYear + EXT + '">Top names of ' + currentYear + '</a>');
  peakYearsSorted.filter((y) => y !== peakYear && y !== currentYear).slice(0, 3).forEach((y) => {
    yearLinks.push('<a href="/popularity/' + y + EXT + '">See top names in ' + y + '</a>');
  });
  if (chartData.length >= 2) {
    const yearsAsc = chartData.map((d) => d.year).sort((a, b) => a - b);
    const firstY = yearsAsc[0];
    const lastY = yearsAsc[yearsAsc.length - 1];
    if (firstY && firstY !== peakYear && firstY !== currentYear && !yearLinks.some((l) => l.includes(firstY))) yearLinks.push('<a href="/popularity/' + firstY + EXT + '">' + firstY + '</a>');
    if (lastY && lastY !== firstY && lastY !== peakYear && lastY !== currentYear && !yearLinks.some((l) => l.includes(lastY))) yearLinks.push('<a href="/popularity/' + lastY + EXT + '">' + lastY + '</a>');
  }
  yearLinks.push('<a href="/popularity/">Explore trends by year</a>');
  const popularYearsSection =
    '<section aria-labelledby="popular-years-heading"><h2 id="popular-years-heading">' + htmlEscape(record.name) + ' Popularity Over Time</h2><p class="contextual">' +
    yearLinks.slice(0, 6).join('. ') + '.</p></section>';

  const popHtml = popTable ? '<section aria-labelledby="popularity-heading"><h2 id="popularity-heading">Popularity</h2>' + popTable + '</section>' : '';

  const nameVariants = (variants || []).filter((v) => v.name_id === record.id);
  const variantsHtml =
    nameVariants.length > 0
      ? '<section aria-labelledby="variants-heading"><h2 id="variants-heading">Variants</h2><p>' +
        nameVariants.map((v) => htmlEscape(v.variant) + (v.language ? ' <span class="variant-lang">(' + htmlEscape(v.language) + ')</span>' : '')).join(', ') +
        '</p></section>'
      : '';

  const nameCategories = (categories || []).filter((c) => c.name_id === record.id).map((c) => c.category);
  const styleTagsHtml =
    nameCategories.length > 0
      ? '<section aria-labelledby="styles-heading"><h2 id="styles-heading">Style &amp; tags</h2><p>' +
        nameCategories.map((c) => '<span class="tag">' + htmlEscape(c) + '</span>').join(' ') +
        '</p></section>'
      : '';

  // Mesh C: Compatibility Cluster (Intent Axis) — 4–6 links, anchor #name for filtered view
  const compatLinks = TOP_COMPATIBILITY_SURNAMES.map((s) => '<a href="/names/with-last-name-' + s + EXT + '#' + nameSlug + '">' + s.charAt(0).toUpperCase() + s.slice(1) + '</a>').join(', ');
  const compatibilityTips =
    '<section aria-labelledby="compatibility-heading"><h2 id="compatibility-heading">How ' + htmlEscape(record.name) + ' Sounds With Popular Last Names</h2><p class="contextual">See how ' + htmlEscape(record.name) + ' pairs with common surnames: ' + compatLinks + '. <a href="/names/with-last-name' + EXT + '">Browse last name compatibility</a>. <a href="/compatibility/">Try the compatibility tool</a>.</p></section>';

  // Step 3: Minimum content floor — intro, meaning context, popularity context, internal linking (400+ words)
  const nameIntro = `<p class="contextual">This page shows the meaning, origin, and popularity of the name ${htmlEscape(record.name)}. Use the sections below to explore related names, names from the same country or language, and names with the same gender or first letter.</p>`;
  const meaningContext = `<section aria-labelledby="meaning-context-heading"><h2 id="meaning-context-heading">About name meanings and origins</h2><p class="contextual">Name meanings and origins come from linguistic and historical sources: etymology, traditional use, and cultural adoption. The meaning given here reflects the most widely cited interpretation for ${htmlEscape(record.name)}. Origin may refer to the language or region where the name first became established. For more names from the same background, use the same-origin and country links below.</p></section>`;
  const popularityContext = `<section aria-labelledby="popularity-context-heading"><h2 id="popularity-context-heading">Understanding popularity data</h2><p class="contextual">When available, the popularity table shows how often ${htmlEscape(record.name)} was used in a given country and year, often based on official birth statistics (e.g. Social Security in the US, ONS in the UK). Rank is the name’s position among all names; count is the number of births. Trends vary by region and year. Browse <a href="/names/popular${EXT}">popular names</a> and <a href="/names/trending${EXT}">trending names</a> for more context.</p></section>`;
  const internalLinkingPara = `<p class="contextual">Explore the <a href="/">homepage</a> to search names, or the <a href="/names">baby names hub</a> to browse by gender, country, letter, and style. Below you will find related names, same-origin and same-gender options, and links to country and gender hubs.</p>`;

  const mainContent = `
    <h1>${htmlEscape(record.name)}</h1>
    ${originBadgeHtml(record)}
    ${nameIntro}
    <p><strong>Meaning:</strong> ${htmlEscape(record.meaning || '—')}</p>
    <p><strong>Origin:</strong> ${htmlEscape([record.origin_country, record.language].filter(Boolean).join(' · ') || '—')}</p>
    <p><strong>Gender:</strong> ${htmlEscape(record.gender || '—')}</p>
    ${record.phonetic ? `<p><strong>Pronunciation:</strong> ${htmlEscape(record.phonetic)}</p>` : ''}
    ${meaningContext}
    ${popularityContext}
    ${popularityOverTimeSection}
    ${popularYearsSection}
    ${popHtml}
    ${variantsHtml}
    ${styleTagsHtml}
    ${compatibilityTips}
    ${relatedSection}
    ${similarSection}
    ${sameOriginSection}
    ${sameGenderSection}
    ${letterSection}
    ${popularCountrySection}
    ${moreAboutSection}
    <section aria-labelledby="sibling-harmony-heading"><h2 id="sibling-harmony-heading">Sibling Name Harmony</h2><p class="contextual">Looking for sibling names that pair well with ${htmlEscape(record.name)}? See <a href="/names/${nameSlug}/siblings/">sibling names that pair well with ${htmlEscape(record.name)}</a> for harmony scores and suggestions.</p></section>
    ${genderSectionHtml()}
    ${countrySectionHtml()}
    ${internalLinkingPara}
    ${browseSection}
  `;

  const descParts = [];
  if (record.meaning) descParts.push(record.meaning);
  const originLabel = record.origin_country || record.language;
  if (originLabel) descParts.push(originLabel + ' origin');
  if (record.gender) descParts.push(record.gender + ' name');
  const uniqueDescription = descParts.length > 0
    ? record.name + ': ' + descParts.join('. ') + '. Meaning, origin & popularity on NameOrigin.'
    : record.name + ' — meaning, origin and popularity. Baby name details on NameOrigin.';

  const namePageSchemas = [personJsonLd(record)];
  const popSchema = popularityJsonLd(record, chartData, peakYear, latestRank);
  if (popSchema) namePageSchemas.push(popSchema);

  const html = baseLayout({
    title: record.name + ' — Meaning, Origin & Popularity',
    description: uniqueDescription.slice(0, 160),
    path: pathSeg,
    canonical: SITE_URL + pathSeg,
    breadcrumb: breadcrumbItems,
    breadcrumbHtml: breadcrumbHtml(breadcrumbItems.map((i) => ({ ...i, url: i.url.replace(SITE_URL, '') }))),
    mainContent,
    extraSchema: namePageSchemas,
  });

  const outPath = path.join(OUT_DIR, 'name', nameSlug, 'index.html');
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, html, 'utf8');
}

/** Phase 2.5: Find 8-15 names similar to base name for "Names Like X" pages. */
function getNamesLikeSimilarity(baseRecord, names, popularity, minCount = 8, maxCount = 15) {
  const ids = new Set();
  const similar = [];
  const nameStr = (baseRecord.name || '').toLowerCase();
  const firstLetter = (baseRecord.first_letter || nameStr.charAt(0) || '').toLowerCase();
  const firstTwo = nameStr.slice(0, 2);
  const firstThree = nameStr.slice(0, 3);
  const originKey = (baseRecord.origin_country || '').toLowerCase().replace(/\s+/g, '') || (baseRecord.language || '').toLowerCase().replace(/\s+/g, '');
  const gender = baseRecord.gender || '';
  const nameById = new Map(names.map((n) => [n.id, n]));
  const basePopRows = (popularity || []).filter((p) => p.name_id === baseRecord.id);
  const basePopRank = basePopRows.length > 0 ? Math.min(...basePopRows.map((p) => p.rank || 9999)) : 9999;
  const basePopBand = basePopRank < 100 ? 'top100' : basePopRank < 500 ? 'top500' : basePopRank < 1000 ? 'top1000' : 'other';

  const add = (list, max) => {
    for (const n of list) {
      if (n.id === baseRecord.id || ids.has(n.id)) continue;
      ids.add(n.id);
      similar.push(n);
      if (similar.length >= maxCount) return;
    }
  };

  // 1. Same origin
  if (originKey) {
    const sameOrigin = names.filter(
      (n) => n.id !== baseRecord.id && ((n.origin_country || '').toLowerCase().replace(/\s+/g, '') === originKey || (n.language || '').toLowerCase().replace(/\s+/g, '') === originKey)
    );
    add(sameOrigin, 4);
  }

  // 2. Same first letter + phonetic similarity (first 2-3 letters match)
  const sameLetter = names.filter((n) => {
    const nFirst = (n.first_letter || (n.name || '').charAt(0) || '').toLowerCase();
    return nFirst === firstLetter && n.id !== baseRecord.id;
  });
  const phoneticMatch = sameLetter.filter((n) => {
    const nStr = (n.name || '').toLowerCase();
    return nStr.startsWith(firstTwo) || nStr.startsWith(firstThree);
  });
  add(phoneticMatch, 3);
  add(sameLetter, 2);

  // 3. Similar popularity band
  if (basePopRank < 9999) {
    const similarPop = names.filter((n) => {
      if (n.id === baseRecord.id) return false;
      const nPopRows = (popularity || []).filter((p) => p.name_id === n.id);
      if (nPopRows.length === 0) return false;
      const nPopRank = Math.min(...nPopRows.map((p) => p.rank || 9999));
      const nPopBand = nPopRank < 100 ? 'top100' : nPopRank < 500 ? 'top500' : nPopRank < 1000 ? 'top1000' : 'other';
      return nPopBand === basePopBand;
    });
    add(similarPop, 3);
  }

  // 4. Same gender
  if (gender) {
    const sameGender = names.filter((n) => n.gender === gender && n.id !== baseRecord.id);
    add(sameGender, 3);
  }

  // 5. Fallback: same country popularity cluster
  if (similar.length < minCount && basePopRows.length > 0) {
    const countryCodes = [...new Set(basePopRows.map((p) => p.country))];
    for (const country of countryCodes.slice(0, 2)) {
      const countryPop = (popularity || []).filter((p) => p.country === country && p.name_id !== baseRecord.id);
      const countryPopIds = countryPop.map((p) => p.name_id).slice(0, 10);
      const countryNames = countryPopIds.map((id) => nameById.get(id)).filter(Boolean);
      add(countryNames, 5);
      if (similar.length >= minCount) break;
    }
  }

  return similar.slice(0, maxCount);
}

/** Phase 2.5: Generate "Names Like X" page at /names-like/<slug>/index.html */
function generateNamesLikePage(baseRecord, names, popularity, categories) {
  const nameSlug = slug(baseRecord.name);
  const pathSeg = '/names-like/' + nameSlug + '/';
  const url = SITE_URL + pathSeg;
  const baseNameUrl = SITE_URL + nameDetailPath(baseRecord.name);
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL + '/' },
    { name: BREADCRUMB_NAMES_LABEL, url: SITE_URL + '/names' },
    { name: baseRecord.name, url: baseNameUrl },
    { name: 'Names Like ' + baseRecord.name, url },
  ];

  const nameStr = (baseRecord.name || '').toLowerCase();
  const firstLetter = (baseRecord.first_letter || nameStr.charAt(0) || '').toLowerCase();
  const firstTwo = nameStr.slice(0, 2);
  const firstThree = nameStr.slice(0, 3);
  const originKey = (baseRecord.origin_country || '').toLowerCase().replace(/\s+/g, '') || (baseRecord.language || '').toLowerCase().replace(/\s+/g, '');
  const gender = baseRecord.gender || '';
  const nameById = new Map(names.map((n) => [n.id, n]));
  const basePopRows = (popularity || []).filter((p) => p.name_id === baseRecord.id);
  const basePopRank = basePopRows.length > 0 ? Math.min(...basePopRows.map((p) => p.rank || 9999)) : 9999;
  const basePopBand = basePopRank < 100 ? 'top100' : basePopRank < 500 ? 'top500' : basePopRank < 1000 ? 'top1000' : 'other';

  // Categorize similar names
  const phoneticMatches = [];
  const sameOriginMatches = [];
  const similarPopMatches = [];
  const otherAlternatives = [];
  const seenIds = new Set([baseRecord.id]);

  // Names similar in sound (phonetic: same first letter + first 2-3 letters match)
  const sameLetter = names.filter((n) => {
    const nFirst = (n.first_letter || (n.name || '').charAt(0) || '').toLowerCase();
    return nFirst === firstLetter && n.id !== baseRecord.id && !seenIds.has(n.id);
  });
  sameLetter.forEach((n) => {
    const nStr = (n.name || '').toLowerCase();
    if (nStr.startsWith(firstTwo) || nStr.startsWith(firstThree)) {
      if (phoneticMatches.length < 8) {
        phoneticMatches.push(n);
        seenIds.add(n.id);
      }
    }
  });
  sameLetter.forEach((n) => {
    if (!seenIds.has(n.id) && phoneticMatches.length < 8) {
      phoneticMatches.push(n);
      seenIds.add(n.id);
    }
  });

  // Names with same origin
  if (originKey) {
    const sameOrigin = names.filter(
      (n) => n.id !== baseRecord.id && !seenIds.has(n.id) && ((n.origin_country || '').toLowerCase().replace(/\s+/g, '') === originKey || (n.language || '').toLowerCase().replace(/\s+/g, '') === originKey)
    );
    sameOrigin.slice(0, 6).forEach((n) => {
      sameOriginMatches.push(n);
      seenIds.add(n.id);
    });
  }

  // Names with similar popularity
  if (basePopRank < 9999) {
    const similarPop = names.filter((n) => {
      if (n.id === baseRecord.id || seenIds.has(n.id)) return false;
      const nPopRows = (popularity || []).filter((p) => p.name_id === n.id);
      if (nPopRows.length === 0) return false;
      const nPopRank = Math.min(...nPopRows.map((p) => p.rank || 9999));
      const nPopBand = nPopRank < 100 ? 'top100' : nPopRank < 500 ? 'top500' : nPopRank < 1000 ? 'top1000' : 'other';
      return nPopBand === basePopBand;
    });
    similarPop.slice(0, 5).forEach((n) => {
      similarPopMatches.push(n);
      seenIds.add(n.id);
    });
  }

  // Other alternatives (same gender, trending, or country cluster)
  if (gender) {
    const sameGender = names.filter((n) => n.gender === gender && n.id !== baseRecord.id && !seenIds.has(n.id));
    sameGender.slice(0, 5).forEach((n) => {
      otherAlternatives.push(n);
      seenIds.add(n.id);
    });
  }
  if (otherAlternatives.length < 5 && basePopRows.length > 0) {
    const countryCodes = [...new Set(basePopRows.map((p) => p.country))];
    for (const country of countryCodes.slice(0, 2)) {
      const countryPop = (popularity || []).filter((p) => p.country === country && p.name_id !== baseRecord.id && !seenIds.has(p.name_id));
      const countryPopIds = countryPop.map((p) => p.name_id).slice(0, 4);
      countryPopIds.forEach((id) => {
        const n = nameById.get(id);
        if (n && !seenIds.has(n.id) && otherAlternatives.length < 8) {
          otherAlternatives.push(n);
          seenIds.add(n.id);
        }
      });
      if (otherAlternatives.length >= 5) break;
    }
  }

  const nameLink = (n) => `<a href="${nameDetailPath(n.name)}">${htmlEscape(n.name)}</a>`;
  const nameCategories = (categories || []).filter((c) => c.name_id === baseRecord.id).map((c) => c.category);
  const styleLabel = nameCategories.length > 0 ? nameCategories[0] : (gender === 'boy' ? 'classic' : gender === 'girl' ? 'elegant' : 'modern');
  const originLabel = baseRecord.origin_country || baseRecord.language || 'various origins';

  // Intro paragraph (~150-200 words)
  const intro = `<p class="contextual">If you're considering the name ${htmlEscape(baseRecord.name)}, you might be looking for alternatives that share similar style, origin, or sound. ${htmlEscape(baseRecord.name)} has a ${htmlEscape(styleLabel)} feel and ${originLabel ? 'originates from ' + htmlEscape(originLabel) : 'has roots in multiple cultures'}. When choosing a name, many parents seek options that match their preferred style—whether that's ${htmlEscape(styleLabel)}, ${gender === 'boy' ? 'strong and traditional' : gender === 'girl' ? 'elegant and timeless' : 'versatile and modern'}—or that honor a specific cultural or linguistic heritage. Some parents also want names that sound similar phonetically, sharing the same first letter or similar opening sounds, which can create a cohesive feel when considering sibling names or family naming patterns. Others prioritize popularity, looking for names in a similar popularity band—whether that's top 100, top 500, or less common choices. This page curates names similar to ${htmlEscape(baseRecord.name)} across these dimensions, helping you discover alternatives that might resonate with your preferences while offering variety and meaning.</p>`;

  // Names Similar in Sound section
  const phoneticSectionHtml = phoneticMatches.length > 0
    ? `<section aria-labelledby="sound-heading"><h2 id="sound-heading">Names Similar in Sound</h2><ul class="name-list">${phoneticMatches.map((n) => {
        const nStr = (n.name || '').toLowerCase();
        const explanation = nStr.startsWith(firstTwo) || nStr.startsWith(firstThree)
          ? `${htmlEscape(n.name)} shares the same first letter and similar opening sounds as ${htmlEscape(baseRecord.name)}, creating a phonetic connection.`
          : `${htmlEscape(n.name)} starts with the same letter as ${htmlEscape(baseRecord.name)} and has a similar rhythm and feel.`;
        return `<li><strong>${nameLink(n)}</strong> — ${explanation} ${n.meaning ? htmlEscape(n.meaning.slice(0, 80)) + (n.meaning.length > 80 ? '…' : '') : ''}</li>`;
      }).join('')}</ul></section>`
    : '';

  // Names with Same Origin section
  const originSectionHtml = sameOriginMatches.length > 0
    ? `<section aria-labelledby="origin-heading"><h2 id="origin-heading">Names with the Same Origin</h2><ul class="name-list">${sameOriginMatches.map((n) => {
        const explanation = `${htmlEscape(n.name)} shares the same ${originLabel ? htmlEscape(originLabel) : 'cultural'} origin as ${htmlEscape(baseRecord.name)}, reflecting similar linguistic roots and cultural traditions.`;
        return `<li><strong>${nameLink(n)}</strong> — ${explanation} ${n.meaning ? htmlEscape(n.meaning.slice(0, 80)) + (n.meaning.length > 80 ? '…' : '') : ''}</li>`;
      }).join('')}</ul></section>`
    : '';

  // Names with Similar Popularity section
  const popularitySectionHtml = similarPopMatches.length > 0
    ? `<section aria-labelledby="popularity-heading"><h2 id="popularity-heading">Names with Similar Popularity</h2><ul class="name-list">${similarPopMatches.map((n) => {
        const nPopRows = (popularity || []).filter((p) => p.name_id === n.id);
        const nPopRank = nPopRows.length > 0 ? Math.min(...nPopRows.map((p) => p.rank || 9999)) : 9999;
        const popLabel = nPopRank < 100 ? 'top 100' : nPopRank < 500 ? 'top 500' : nPopRank < 1000 ? 'top 1000' : 'less common';
        const explanation = `${htmlEscape(n.name)} is in a similar popularity band as ${htmlEscape(baseRecord.name)}, appearing in the ${popLabel} names, which means it has comparable usage and recognition.`;
        return `<li><strong>${nameLink(n)}</strong> — ${explanation} ${n.meaning ? htmlEscape(n.meaning.slice(0, 80)) + (n.meaning.length > 80 ? '…' : '') : ''}</li>`;
      }).join('')}</ul></section>`
    : '';

  // Other Alternatives section
  const alternativesSectionHtml = otherAlternatives.length > 0
    ? `<section aria-labelledby="alternatives-heading"><h2 id="alternatives-heading">Other Alternatives You Might Like</h2><ul class="name-list">${otherAlternatives.map((n) => {
        const explanation = `${htmlEscape(n.name)} offers a similar ${gender ? gender + ' name' : 'style'} option that might appeal if you're drawn to ${htmlEscape(baseRecord.name)}'s characteristics.`;
        return `<li><strong>${nameLink(n)}</strong> — ${explanation} ${n.meaning ? htmlEscape(n.meaning.slice(0, 80)) + (n.meaning.length > 80 ? '…' : '') : ''}</li>`;
      }).join('')}</ul></section>`
    : '';

  // Closing paragraph (~120-150 words)
  const closing = `<p class="contextual">Exploring name meanings and origins can help you find the perfect name that resonates with your values, heritage, and style preferences. Each name carries its own history, cultural significance, and meaning, which can add depth and intention to your choice. Whether you're drawn to ${htmlEscape(baseRecord.name)} for its sound, origin, popularity, or meaning, the alternatives above offer similar qualities while giving you variety to consider. We encourage you to explore the full meaning and origin details for each name by visiting their individual pages, where you'll find comprehensive information about popularity trends, cultural context, and related names. Understanding a name's background can help you make an informed decision that feels right for your family. For more details about ${htmlEscape(baseRecord.name)} itself, including its complete meaning, origin story, and popularity data, visit the <a href="${nameDetailPath(baseRecord.name)}">${htmlEscape(baseRecord.name)} name page</a>.</p>`;

  const mainContent = `
    <h1>Names Like ${htmlEscape(baseRecord.name)} — Similar Names &amp; Alternatives</h1>
    ${intro}
    ${phoneticSectionHtml}
    ${originSectionHtml}
    ${popularitySectionHtml}
    ${alternativesSectionHtml}
    ${closing}
    ${genderSectionHtml()}
    ${countrySectionHtml()}
    ${alphabetSectionHtml()}
    <section aria-labelledby="browse-heading"><h2 id="browse-heading">Browse the site</h2><p class="internal-links">${coreLinksHtml()}</p></section>
  `;

  const genderLabel = gender === 'boy' ? 'Boy' : gender === 'girl' ? 'Girl' : gender === 'unisex' ? 'Unisex' : '';
  const totalSimilar = phoneticMatches.length + sameOriginMatches.length + similarPopMatches.length + otherAlternatives.length;
  const description = `Looking for names like ${baseRecord.name}? Discover ${totalSimilar} similar ${genderLabel ? genderLabel.toLowerCase() : ''} names in sound, origin, and popularity${genderLabel ? ' for ' + genderLabel.toLowerCase() + 's' : ''} with detailed explanations. Each alternative includes meaning, origin, and links to full name details.`;

  const html = baseLayout({
    title: 'Names Like ' + baseRecord.name + (genderLabel ? ' — Similar ' + genderLabel + ' Names & Alternatives' : ' — Similar Names & Alternatives') + ' | nameorigin.io',
    description: description.slice(0, 160),
    path: pathSeg,
    canonical: SITE_URL + pathSeg,
    breadcrumb: breadcrumbItems,
    breadcrumbHtml: breadcrumbHtml(breadcrumbItems.map((i) => ({ ...i, url: i.url.replace(SITE_URL, '') }))),
    mainContent,
  });

  const outPath = path.join(OUT_DIR, 'names-like', nameSlug, 'index.html');
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, html, 'utf8');
}

function generateListPage(title, description, pathSeg, names, listTitle) {
  const url = SITE_URL + pathSeg;
  const secondLabel = pathSeg === '/names' ? BREADCRUMB_NAMES_LABEL : (listTitle || 'Names');
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL + '/' },
    { name: secondLabel, url },
  ];
  const listHtml =
    '<ul class="name-list">' +
    names.map((n) => `<li><a href="${nameDetailPath(n.name)}">${htmlEscape(n.name)}</a> — ${htmlEscape(n.meaning || '')}</li>`).join('') +
    '</ul>';
  const listIntro = '<p class="contextual">Browse first names with meaning and origin. Each name links to a detail page. Use the sections below to filter by gender, country, or letter, or explore trending and popular names.</p>';
  const html = baseLayout({
    title: title + ' | nameorigin.io',
    description,
    path: pathSeg,
    breadcrumb: breadcrumbItems,
    breadcrumbHtml: breadcrumbHtml(breadcrumbItems.map((i) => ({ ...i, url: i.url.replace(SITE_URL, '') }))),
    mainContent: `<h1>${htmlEscape(title)}</h1>
    ${listIntro}
    <p class="core-links">${coreLinksHtml()}</p>
    ${alphabetSectionHtml()}
    ${genderSectionHtml()}
    ${countrySectionHtml()}
    <section aria-labelledby="names-list-heading"><h2 id="names-list-heading">Names</h2>${listHtml}</section>`,
  });
  return html;
}

// --- Alphabet / letter pages: /names/a.html, /names/b.html — internal link hubs ---
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

function generateLetterPage(letter, subset, allLettersWithNames) {
  const pathSeg = '/names/' + letter + EXT;
  const letterUpper = letter.toUpperCase();
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL + '/' },
    { name: BREADCRUMB_NAMES_LABEL, url: SITE_URL + '/names' },
    { name: 'Browse by letter', url: SITE_URL + '/names/letters' + EXT },
    { name: 'Names starting with ' + letterUpper, url: SITE_URL + pathSeg },
  ];

  const filterLinks = [
    { href: '/names', text: 'All names' },
    { href: '/names/boy' + EXT, text: 'Boy names' },
    { href: '/names/girl' + EXT, text: 'Girl names' },
    { href: '/names/unisex' + EXT, text: 'Unisex names' },
    { href: '/names/style' + EXT, text: 'Names by style' },
    { href: '/names/with-last-name' + EXT, text: 'Last name compatibility' },
  ];

  const listHtml =
    subset.length > 0
      ? '<ul class="name-list">' +
        subset.map((n) => `<li><a href="${nameDetailPath(n.name)}">${htmlEscape(n.name)}</a>${n.meaning ? ' — ' + htmlEscape((n.meaning || '').slice(0, 55)) + ((n.meaning || '').length > 55 ? '…' : '') : ''}</li>`).join('') +
        '</ul>'
      : '<p>No names starting with ' + letterUpper + ' in our list. <a href="/names/letters' + EXT + '">Browse by letter</a> or <a href="/names">see all names</a>.</p>';

  const otherLettersHtml = allLettersWithNames
    .map((l) => (l === letter ? '<strong>' + l.toUpperCase() + '</strong>' : '<a href="/names/' + l + EXT + '">' + l.toUpperCase() + '</a>'))
    .join(' ');

  const mainContent = `
    <h1>Names starting with ${letterUpper}</h1>
    <p>${subset.length} first name${subset.length !== 1 ? 's' : ''} starting with ${letterUpper}. Each links to meaning and origin.</p>
    ${LETTER_PAGE_INTRO_BLOCK}
    <section aria-labelledby="letters-nav-heading"><h2 id="letters-nav-heading">Browse by letter (A–Z)</h2>
    <p class="letters-hub">${otherLettersHtml}</p>
    </section>
    ${genderSectionHtml()}
    ${countrySectionHtml()}
    <section aria-labelledby="names-heading"><h2 id="names-heading">Names</h2>
    ${listHtml}
    </section>
    <section aria-labelledby="core-heading"><h2 id="core-heading">Explore more</h2><p class="core-links">${coreLinksHtml()}</p></section>
  `;

  const html = baseLayout({
    title: 'Names starting with ' + letterUpper + ' | nameorigin.io',
    description: 'Browse ' + subset.length + ' first names starting with ' + letterUpper + '. Meaning and origin for each name.',
    path: pathSeg,
    canonical: SITE_URL + pathSeg,
    breadcrumb: breadcrumbItems,
    breadcrumbHtml: breadcrumbHtml(breadcrumbItems.map((i) => ({ ...i, url: i.url.replace(SITE_URL, '') }))),
    mainContent,
  });
  return html;
}

const POP_COUNTRY_BY_SLUG = { usa: 'USA', canada: 'CAN', unitedstates: 'USA', uk: 'UK', australia: 'AUS', ireland: 'IRL', india: 'IND', france: 'FRA' };

function getPopularNameIdsForCountry(popularity, countryCode, limit = 25) {
  const rows = (popularity || []).filter((p) => p.country === countryCode && p.rank != null);
  const byYear = new Map();
  rows.forEach((r) => {
    const y = r.year || 0;
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(r);
  });
  const latestYear = Math.max(0, ...byYear.keys());
  const latest = byYear.get(latestYear) || [];
  latest.sort((a, b) => (a.rank || 9999) - (b.rank || 9999));
  return latest.slice(0, limit).map((r) => r.name_id);
}

function getRisingNameIdsForCountry(popularity, countryCode, limit = 25) {
  const rows = (popularity || []).filter((p) => p.country === countryCode && p.trend_direction === 'rising');
  const byId = new Map();
  rows.forEach((r) => byId.set(r.name_id, (byId.get(r.name_id) || 0) + 1));
  return [...byId.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).slice(0, limit);
}

const LOCAL_NAMING_CULTURE = {
  usa: 'In the United States, naming trends are tracked by the Social Security Administration. Parents often blend traditional names with modern and culturally diverse choices.',
  canada: 'Canadian naming reflects both English and French heritage, with regional preferences and a growing diversity of cultural names.',
  france: 'French names often have legal limits (approved lists in some regions) and favor traditional, often Catholic or classical, names alongside modern choices.',
  india: 'Indian names draw from Sanskrit, regional languages, and religious traditions, with meaning and family significance playing a strong role.',
  ireland: 'Irish names emphasize Gaelic roots and heritage, with many names enjoying revival in Ireland and the diaspora.',
  uk: 'In England and Wales, naming trends are published by the ONS. Classic and shortened names remain popular alongside newer trends.',
  australia: 'Australian naming blends British heritage with multicultural influences and a fondness for nature and place-inspired names.',
};

// Step 5: Contextual content for programmatic pages (400–600 words target; no thin pages).
const COUNTRY_PAGE_INTRO_BLOCK = `
<p class="contextual">On this page you will find first names linked to this country by origin, language, or popularity there. We group them into trending names (rising in use), popular names (current top ranks), and a longer list by origin so you can explore meaning and cultural context. Each name links to a detail page with full meaning, origin, and popularity data.</p>
<p class="contextual">Names are included when they are traditionally or currently associated with this region—by language, cultural use, or official popularity data. You can narrow by gender using the links below, or browse by letter and style from the main names section. If you are pairing a first name with a last name, try our last name compatibility tool for phonetic and cultural fit.</p>
<p class="contextual">Trending names show first names that have been rising in use in recent years in this country, based on official statistics where available. Popular names list current top-ranked choices. The origin list includes names tied to this region by language or tradition, even if they are less common in rankings. Click any name to read its full meaning, origin story, and popularity over time.</p>
<p class="contextual">We recommend combining this page with our gender filters (boy, girl, unisex) and letter index (A–Z) to narrow your search. The homepage and names index offer more ways to explore: trending and popular lists, style categories like classic or nature-inspired, and last name compatibility for finding first names that sound good with your surname.</p>
<p class="contextual">Whether you are looking for a name that reflects your heritage, fits current trends, or has a meaning you love, the lists on this page are a practical starting point. Use the explore links to move between countries, genders, and letters without leaving the site.</p>`;
const GENDER_COUNTRY_INTRO_BLOCK = `
<p class="contextual">This page lists first names that are both in this gender category and associated with this country—by origin, language, or regional use. Each name links to its detail page for meaning, origin, and popularity. Use the links below to switch to other countries, other genders, or to browse by letter and style. All names on nameorigin.io are curated for meaning and origin so you can choose with context in mind.</p>
<p class="contextual">You can explore boy names, girl names, and unisex names from the gender links, or jump to country-only pages to see all names from a region regardless of gender. The letter and style hubs help you browse by first letter or by category such as classic, modern, or nature-inspired names.</p>
<p class="contextual">Choosing a name by both gender and country helps when you want to honor heritage or match a naming tradition. The list below includes names that fit this combination; each links to a full profile with meaning, origin, and popularity. For more options, use the country page (all genders) or the gender page (all countries), or start from the homepage to see trending and popular names worldwide.</p>
<p class="contextual">The filter and explore sections on this page link to all gender and country combinations so you can move between related lists in one or two clicks. Every name in the list is clickable for full details.</p>
<p class="contextual">If you do not find enough options here, open the country page (all genders) or the gender page (all countries) from the links below. The homepage and names index also list trending and popular names, and the last name compatibility tool helps when you are pairing a first name with a surname.</p>`;
const STYLE_PAGE_INTRO_BLOCK = `
<p class="contextual">Names in this style are grouped by theme or category—whether classic, modern, nature-inspired, or another style we track. Each name links to its full detail page with meaning, origin, and popularity. Use the gender and country links below to combine this style with boy, girl, or unisex names, or with names from a specific country.</p>
<p class="contextual">Style categories help you narrow choices when you have a vibe in mind. You can also browse by letter for a given style or explore our last name compatibility tool to see how first names in this style pair with common surnames.</p>
<p class="contextual">If you are looking for a name that fits a particular feeling—timeless, fresh, rare, or rooted in nature or tradition—this list is a good starting point. Every name on nameorigin.io has a dedicated page with meaning, origin, and popularity, so you can dig deeper once you find options you like. The hubs for letters and countries give you more ways to filter and discover names.</p>
<p class="contextual">Use the A–Z links above to switch to another letter, or the gender and country links to filter this style by boy, girl, unisex, or by region. The main names index and homepage link to trending, popular, and last name compatibility tools as well. Each name in the list below links to its full profile with meaning and origin.</p>
<p class="contextual">Style lists are curated so you can quickly find names that match a theme. Combine with gender or country using the links on this page, or browse the letter hub and country pages for more discovery paths. Every name here has a full profile on nameorigin.io with meaning, origin, and popularity.</p>`;
const LETTER_PAGE_INTRO_BLOCK = `
<p class="contextual">Here you can browse first names that start with this letter. Each name links to a detail page with meaning, origin, and popularity. Below you will find links to browse by gender (boy, girl, unisex), by country, and by style, so you can combine letter with other filters. Our hub pages list all letters and all name pages for easy discovery.</p>
<p class="contextual">Browsing by letter is useful when you have a preferred first letter or want to explore names in alphabetical order. You can then narrow by gender or country using the links in this page, or jump to trending and popular names from the main names section. Every name in the list below goes to a full profile with meaning, origin, and popularity data.</p>`;
const LASTNAME_PAGE_INTRO_EXTRA = `
<p class="contextual">We score first names by how well they pair with this last name using syllable balance, vowel and consonant flow, and length. Cultural matching suggests names from the same or related traditions. Use the links below to browse by gender or country, or try the main last name compatibility hub for other surnames.</p>
<p class="contextual">A first name that flows well with your last name is easier to say and remember. The phonetic tips above explain how the sound of your surname affects which first names tend to work best. The compatible names list combines those factors with syllable balance and length. For more options, use the gender and country filters or the main names index; each name links to its full meaning and origin.</p>
<p class="contextual">You can try other surnames from the last name compatibility hub linked below, or browse by gender and country to find names that match your style and heritage.</p>`;

function generateCountryPage(c, slugKey, names, popularity) {
  const countryLabel = c.name || c.code || slugKey;
  const pathSeg = '/names/' + slugKey + EXT;
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL + '/' },
    { name: BREADCRUMB_NAMES_LABEL, url: SITE_URL + '/names' },
    { name: 'Names from ' + countryLabel, url: SITE_URL + pathSeg },
  ];

  const subsetByOrigin = names.filter(
    (n) =>
      (n.origin_country || '').toLowerCase() === (c.name || '').toLowerCase() ||
      (n.origin_country || '').toLowerCase() === (c.code || '').toLowerCase() ||
      (n.language || '').toLowerCase() === (c.primary_language || '').toLowerCase()
  );
  const popCode = POP_COUNTRY_BY_SLUG[slugKey.toLowerCase()];
  const popularIds = popCode ? getPopularNameIdsForCountry(popularity, popCode, 25) : [];
  const risingIds = popCode ? getRisingNameIdsForCountry(popularity, popCode, 25) : [];
  const nameById = new Map(names.map((n) => [n.id, n]));
  const popularNames = popularIds.map((id) => nameById.get(id)).filter(Boolean);
  const risingNames = risingIds.map((id) => nameById.get(id)).filter(Boolean);
  const trendingNames = risingNames.length ? risingNames : popularNames.slice(0, 15);

  const cultureText = LOCAL_NAMING_CULTURE[slugKey.toLowerCase()] || `Explore first names associated with ${countryLabel} and its naming traditions.`;

  const filterLinks = [
    { href: '/names', text: 'All names' },
    { href: '/names/boy' + EXT, text: 'Boy names' },
    { href: '/names/girl' + EXT, text: 'Girl names' },
    { href: '/names/unisex' + EXT, text: 'Unisex names' },
    { href: '/names/with-last-name' + EXT, text: 'Last name compatibility' },
    { href: '/names/style' + EXT, text: 'Names by style' },
    { href: '/names/letters' + EXT, text: 'Browse by letter' },
  ];

  const coreSection = '<section aria-labelledby="explore-heading"><h2 id="explore-heading">Explore</h2><p class="core-links">' + coreLinksHtml() + '</p></section>';

  const list = (arr) => arr.map((n) => `<a href="${nameDetailPath(n.name)}">${htmlEscape(n.name)}</a>`).join(', ');
  const section = (id, title, items) =>
    items.length > 0
      ? `<section aria-labelledby="${id}"><h2 id="${id}">${htmlEscape(title)}</h2><p class="name-links">${list(items)}</p></section>`
      : '';

  const mainContent = `
    <h1>Names from ${htmlEscape(countryLabel)}</h1>
    <p class="local-culture">${htmlEscape(cultureText)}</p>
    ${COUNTRY_PAGE_INTRO_BLOCK}

    ${alphabetSectionHtml()}
    ${genderSectionHtml()}
    <section aria-labelledby="filter-links-heading"><h2 id="filter-links-heading">Filter &amp; explore</h2>
    <p>${filterLinks.map((l) => `<a href="${l.href}">${htmlEscape(l.text)}</a>`).join(' · ')}</p>
    </section>

    ${section('trending-heading', 'Trending names', trendingNames)}
    ${section('popular-heading', 'Popular names', popularNames)}
    ${section('rising-heading', 'Rising names', risingNames)}
    ${slugKey === 'usa' ? `<section aria-labelledby="jurisdiction-heading"><h2 id="jurisdiction-heading">By state</h2><p class="name-links"><a href="/names/us/california/">California</a> · <a href="/names/us/texas/">Texas</a> · <a href="/names/us/florida/">Florida</a> · <a href="/names/us/new-york/">New York</a> · <a href="/names/us/pennsylvania/">Pennsylvania</a> · <a href="/names/us/illinois/">Illinois</a> · <a href="/names/us/ohio/">Ohio</a> · <a href="/names/us/georgia/">Georgia</a> · <a href="/names/us/north-carolina/">North Carolina</a> · <a href="/names/us/michigan/">Michigan</a></p></section>` : ''}
    ${slugKey === 'canada' ? `<section aria-labelledby="jurisdiction-heading"><h2 id="jurisdiction-heading">By province</h2><p class="name-links"><a href="/names/canada/ontario/">Ontario</a> · <a href="/names/canada/quebec/">Quebec</a> · <a href="/names/canada/british-columbia/">British Columbia</a> · <a href="/names/canada/alberta/">Alberta</a> · <a href="/names/canada/manitoba/">Manitoba</a></p></section>` : ''}

    <section aria-labelledby="origin-heading"><h2 id="origin-heading">Names from ${htmlEscape(countryLabel)} (by origin)</h2>
    <p class="name-links">${subsetByOrigin.length ? list(subsetByOrigin.slice(0, 80)) : '—'}</p>
    ${subsetByOrigin.length > 80 ? `<p><a href="/names">Browse all names</a></p>` : ''}
    </section>
    ${coreSection}
  `;

  const countryDescription = 'Popular baby names in ' + countryLabel + '. Trending, popular, and rising names with meaning and origin. ' + (cultureText.length > 90 ? cultureText.slice(0, 87) + '…' : cultureText);
  const html = baseLayout({
    title: 'Popular Baby Names in ' + countryLabel + ' — NameOrigin',
    description: countryDescription.slice(0, 160),
    path: pathSeg,
    canonical: SITE_URL + pathSeg,
    breadcrumb: breadcrumbItems,
    breadcrumbHtml: breadcrumbHtml(breadcrumbItems.map((i) => ({ ...i, url: i.url.replace(SITE_URL, '') }))),
    mainContent,
  });
  return html;
}

function generateGenderCountryPage(gender, c, slugKey, names) {
  const countryLabel = c.name || c.code || slugKey;
  const genderLabel = gender.charAt(0).toUpperCase() + gender.slice(1);
  const pathSeg = '/names/' + gender + '/' + slugKey + EXT;
  // Step 7: Home > Baby Names > Canada > Girl Names
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL + '/' },
    { name: BREADCRUMB_NAMES_LABEL, url: SITE_URL + '/names' },
    { name: countryLabel, url: SITE_URL + '/names/' + slugKey + EXT },
    { name: genderLabel + ' names', url: SITE_URL + pathSeg },
  ];

  const subset = names.filter(
    (n) =>
      n.gender === gender &&
      ((n.origin_country || '').toLowerCase() === (c.name || '').toLowerCase() ||
        (n.origin_country || '').toLowerCase() === (c.code || '').toLowerCase() ||
        (n.language || '').toLowerCase() === (c.primary_language || '').toLowerCase())
  );

  const filterLinks = [
    { href: '/names', text: 'All names' },
    { href: '/names/' + gender + EXT, text: genderLabel + ' names' },
    { href: '/names/' + slugKey + EXT, text: 'Names from ' + countryLabel },
    { href: '/names/boy' + EXT, text: 'Boy names' },
    { href: '/names/girl' + EXT, text: 'Girl names' },
    { href: '/names/unisex' + EXT, text: 'Unisex names' },
    { href: '/names/with-last-name' + EXT, text: 'Last name compatibility' },
    { href: '/names/style' + EXT, text: 'Names by style' },
    { href: '/names/letters' + EXT, text: 'Browse by letter' },
  ];

  const listHtml =
    subset.length > 0
      ? '<ul class="name-list">' + subset.map((n) => `<li><a href="${nameDetailPath(n.name)}">${htmlEscape(n.name)}</a>${n.meaning ? ' — ' + htmlEscape(n.meaning.slice(0, 60)) + (n.meaning.length > 60 ? '…' : '') : ''}</li>`).join('') + '</ul>'
      : '<p>No ' + gender + ' names from ' + countryLabel + ' in our list yet. <a href="/names/' + gender + EXT + '">Browse all ' + gender + ' names</a> or <a href="/names/' + slugKey + EXT + '">names from ' + countryLabel + '</a>.</p>';

  const mainContent = `
    <h1>${htmlEscape(genderLabel)} names from ${htmlEscape(countryLabel)}</h1>
    <p>Browse first names that are ${gender} and associated with ${htmlEscape(countryLabel)}.</p>
    ${GENDER_COUNTRY_INTRO_BLOCK}
    ${alphabetSectionHtml()}
    ${genderSectionHtml()}
    ${countrySectionHtml()}
    <section aria-labelledby="names-heading"><h2 id="names-heading">Names</h2>
    ${listHtml}
    </section>
    <section aria-labelledby="explore-heading"><h2 id="explore-heading">Explore</h2><p class="core-links">${coreLinksHtml()}</p></section>
  `;

  const html = baseLayout({
    title: genderLabel + ' names from ' + countryLabel + ' | nameorigin.io',
    description: 'Browse ' + gender + ' names from ' + countryLabel + '. ' + subset.length + ' names.',
    path: pathSeg,
    canonical: SITE_URL + pathSeg,
    breadcrumb: breadcrumbItems,
    breadcrumbHtml: breadcrumbHtml(breadcrumbItems.map((i) => ({ ...i, url: i.url.replace(SITE_URL, '') }))),
    mainContent,
  });
  return html;
}

// --- Style pages: /names/style/nature.html, /names/style/classic.html, etc. ---
const STYLE_CONFIG = [
  { slug: 'nature', label: 'Nature names', description: 'First names inspired by nature: plants, animals, landscapes, and the natural world.' },
  { slug: 'classic', label: 'Classic names', description: 'Timeless, classical names with enduring appeal across cultures and generations.', category: 'classical' },
  { slug: 'modern', label: 'Modern names', description: 'Contemporary first names that feel fresh and of-the-moment.' },
  { slug: 'rare', label: 'Rare names', description: 'Uncommon and distinctive names for parents seeking something unique.' },
  { slug: 'biblical', label: 'Biblical names', description: 'Names from the Bible and religious tradition.' },
  { slug: 'popular', label: 'Popular names', description: 'Well-loved names that rank highly in current naming trends.' },
  { slug: 'traditional', label: 'Traditional names', description: 'Established names with long-standing use and heritage.' },
];

function getNamesForStyle(styleSlug, styleCategory, names, categories) {
  if (styleSlug === 'modern') {
    return names.filter((n) => n.is_modern === 1 || n.is_modern === true);
  }
  const categoryToMatch = styleCategory || styleSlug;
  const nameIdsWithCategory = new Set((categories || []).filter((c) => c.category === categoryToMatch).map((c) => c.name_id));
  return names.filter((n) => nameIdsWithCategory.has(n.id));
}

function generateStylePage(styleSlug, styleLabel, styleDescription, subset, names) {
  const pathSeg = '/names/style/' + styleSlug + EXT;
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL + '/' },
    { name: BREADCRUMB_NAMES_LABEL, url: SITE_URL + '/names' },
    { name: 'Names by style', url: SITE_URL + '/names/style' + EXT },
    { name: styleLabel, url: SITE_URL + pathSeg },
  ];

  const filterLinks = [
    { href: '/names', text: 'All names' },
    { href: '/names/boy' + EXT, text: 'Boy names' },
    { href: '/names/girl' + EXT, text: 'Girl names' },
    { href: '/names/unisex' + EXT, text: 'Unisex names' },
    { href: '/names/style' + EXT, text: 'Names by style' },
    { href: '/names/with-last-name' + EXT, text: 'Last name compatibility' },
  ];

  const listHtml =
    subset.length > 0
      ? '<ul class="name-list">' +
        subset.map((n) => `<li><a href="${nameDetailPath(n.name)}">${htmlEscape(n.name)}</a>${n.meaning ? ' — ' + htmlEscape((n.meaning || '').slice(0, 55)) + ((n.meaning || '').length > 55 ? '…' : '') : ''}</li>`).join('') +
        '</ul>'
      : '<p>No names in this style yet. <a href="/names">Browse all names</a> or try another <a href="/names/style' + EXT + '">style</a>.</p>';

  const mainContent = `
    <h1>${htmlEscape(styleLabel)}</h1>
    <p class="local-culture">${htmlEscape(styleDescription)}</p>
    ${STYLE_PAGE_INTRO_BLOCK}
    ${alphabetSectionHtml()}
    ${genderSectionHtml()}
    ${countrySectionHtml()}
    <section aria-labelledby="filter-links-heading"><h2 id="filter-links-heading">Explore</h2>
    <p>${filterLinks.map((l) => `<a href="${l.href}">${htmlEscape(l.text)}</a>`).join(' · ')}</p>
    </section>
    <section aria-labelledby="names-heading"><h2 id="names-heading">Names</h2>
    ${listHtml}
    </section>
    <section aria-labelledby="core-heading"><h2 id="core-heading">Explore more</h2><p class="core-links">${coreLinksHtml()}</p></section>
  `;

  const html = baseLayout({
    title: styleLabel + ' | nameorigin.io',
    description: styleDescription.slice(0, 155) + (styleDescription.length > 155 ? '…' : '') + ' ' + subset.length + ' names.',
    path: pathSeg,
    canonical: SITE_URL + pathSeg,
    breadcrumb: breadcrumbItems,
    breadcrumbHtml: breadcrumbHtml(breadcrumbItems.map((i) => ({ ...i, url: i.url.replace(SITE_URL, '') }))),
    mainContent,
  });
  return html;
}

// --- Last name compatibility (phonetic + cultural) ---
function syllableCount(word) {
  if (!word) return 1;
  const s = String(word).toLowerCase();
  const v = s.match(/[aeiouy]+/g);
  return v ? Math.max(1, v.length) : 1;
}

function endsWithVowel(name) {
  return /[aeiouy]$/i.test(String(name || '').trim());
}

function startsWithVowel(name) {
  return /^[aeiouy]/i.test(String(name || '').trim());
}

function lastChar(name) {
  const s = String(name || '').trim().toLowerCase();
  return s[s.length - 1] || '';
}

function firstChar(name) {
  const s = String(name || '').trim().toLowerCase();
  return s[0] || '';
}

function scoreCompatibility(firstName, lastNameMeta) {
  const first = (firstName.name || '').trim();
  const last = (lastNameMeta.name || '').trim();
  if (!first || !last) return 0;

  const firstSyl = firstName.syllables != null ? firstName.syllables : syllableCount(first);
  const lastSyl = lastNameMeta.syllables != null ? lastNameMeta.syllables : syllableCount(last);
  const firstEndsV = endsWithVowel(first);
  const lastStartsV = startsWithVowel(last);
  const firstLastChar = lastChar(first);
  const lastFirstChar = firstChar(last);

  let score = 0;
  // Vowel/consonant: first ends vowel + last starts consonant (or vice versa) = good
  if (firstEndsV && !lastStartsV) score += 1;
  if (!firstEndsV && lastStartsV) score += 1;
  // Syllable balance: difference <= 1 is good
  const sylDiff = Math.abs(firstSyl - lastSyl);
  if (sylDiff <= 1) score += 1;
  if (sylDiff >= 3) score -= 0.5;
  // Boundary: avoid same/repeated consonant at boundary
  if (firstLastChar && lastFirstChar && firstLastChar === lastFirstChar) score -= 0.5;
  // Length harmony: ratio between 0.5 and 2
  const ratio = first.length / Math.max(last.length, 1);
  if (ratio >= 0.5 && ratio <= 2) score += 0.5;
  if (ratio > 3 || ratio < 0.33) score -= 0.3;
  return score;
}

function getCompatibleNames(names, lastNameMeta, limit = 60) {
  const scored = names.map((n) => ({ name: n, score: scoreCompatibility(n, lastNameMeta) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.name);
}

function generateLastNamePage(surnameMeta, names) {
  const surname = surnameMeta.name || '';
  const slugKey = slug(surname);
  const pathSeg = '/names/with-last-name-' + slugKey + EXT;
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL + '/' },
    { name: BREADCRUMB_NAMES_LABEL, url: SITE_URL + '/names' },
    { name: 'Last name compatibility', url: SITE_URL + '/names/with-last-name' + EXT },
    { name: surname, url: SITE_URL + pathSeg },
  ];

  const compatible = getCompatibleNames(names, surnameMeta, 60);
  const originLower = (surnameMeta.origin || '').toLowerCase();
  const culturalMatches = names.filter(
    (n) =>
      (n.origin_country || '').toLowerCase() === originLower ||
      (n.language || '').toLowerCase() === originLower ||
      (n.origin_country || '').toLowerCase().includes(originLower) ||
      (n.language || '').toLowerCase().includes(originLower)
  );
  const culturalSlice = culturalMatches.slice(0, 30);

  const lastStartsV = startsWithVowel(surname);
  const lastSyl = surnameMeta.syllables != null ? surnameMeta.syllables : syllableCount(surname);
  const esc = (s) => htmlEscape(s);

  // Phase 3.0B: Explanation variant engine — deterministic, hash-based rotation
  const tierBlock = explanationRenderer
    ? explanationRenderer.getTierBlockParagraph(surname)
    : 'Tiers: <strong>Excellent Flow</strong> (85–100), <strong>Strong Flow</strong> (70–84), <strong>Neutral</strong> (50–69), <strong>Slight Friction</strong> (30–49), <strong>High Friction</strong> (0–29). Higher scores indicate smoother phonetic flow when the first and last names are said together.';

  const transitionP = explanationRenderer
    ? explanationRenderer.getTransitionParagraph(surname, lastStartsV, esc)
    : lastStartsV ? 'Since ' + htmlEscape(surname) + ' starts with a vowel, first names that end in a consonant (e.g. James, Oliver, Ethan) often create a smooth transition and avoid running the two names together.' : 'Since ' + htmlEscape(surname) + ' starts with a consonant, first names that end in a vowel (e.g. Emma, Olivia, Noah) tend to flow well and create a clear break between first and last name.';
  const syllableP = explanationRenderer
    ? explanationRenderer.getSyllableParagraph(surname, lastSyl, esc)
    : htmlEscape(surname) + ' has ' + lastSyl + ' syllable' + (lastSyl !== 1 ? 's' : '') + '. First names with a similar syllable count (or within one) often sound balanced when paired with it.';
  const rhythmP = explanationRenderer
    ? explanationRenderer.getRhythmParagraph(surname, esc)
    : 'Stress and rhythm: names with alternating stress (e.g. two syllables in the first name, one or two in the last) often feel balanced. Avoiding repeated consonants at the boundary (where the first name ends and ' + htmlEscape(surname) + ' begins) keeps the full name from sounding choppy or tongue-twisting. Soft consonants (l, m, n, r) at the boundary tend to flow better than hard stops (t, k, p, b) when paired with ' + htmlEscape(surname) + '.';
  const collisionP = explanationRenderer
    ? explanationRenderer.getConsonantCollisionParagraph(surname, esc)
    : 'Avoiding repeated consonants at the boundary (where the first name ends and ' + htmlEscape(surname) + ' begins) keeps the full name from sounding choppy. Soft consonants (l, m, n, r) at the boundary tend to flow better than hard stops (t, k, p, b).';

  const phoneticOrder = explanationRenderer ? explanationRenderer.getPhoneticBlockOrder(surname) : ['transition', 'syllable', 'rhythm', 'consonant'];
  const phoneticParagraphs = {};
  phoneticParagraphs.transition = transitionP;
  phoneticParagraphs.syllable = syllableP;
  phoneticParagraphs.rhythm = rhythmP;
  phoneticParagraphs.consonant = collisionP;
  const phoneticParagraphsHtml = phoneticOrder.map((k) => phoneticParagraphs[k]).filter(Boolean).map((p) => `<p class="contextual">${p}</p>`).join('');

  const whyParagraph = explanationRenderer
    ? explanationRenderer.getWhyItMattersParagraph(surname, esc)
    : 'A name that flows well is easier to say in introductions, on the phone, and in formal settings. The Smoothness Score distills several phonetic rules into a single number so you can quickly see which first names tend to pair best with ' + htmlEscape(surname) + '. It is not a guarantee of preference—cultural fit, meaning, and personal taste still matter—but it helps narrow the set to options that are less likely to feel awkward when said together. Use the compatible names list below to explore further; each name links to its full profile with meaning, origin, and popularity.';

  // Phase 3.0: Surname Compatibility Smoothness Score — deterministic 0–100 + tier per name
  const topForScore = compatible.slice(0, 12);
  const smoothnessList = topForScore.map((n) => {
    const result = computeSmoothness(n, surnameMeta);
    return { name: n, ...result };
  });
  const scoreBlockRows = smoothnessList.map(
    (r) => `<tr><td><a href="${nameDetailPath(r.name.name)}">${htmlEscape(r.name.name)}</a></td><td class="smoothness-score">${r.score}</td><td>${htmlEscape(r.tier)}</td></tr>`
  ).join('');
  const scoreBlockHtml = `
    <section class="smoothness-score-block" aria-labelledby="smoothness-heading">
    <h2 id="smoothness-heading">Surname Compatibility Smoothness Score™</h2>
    <p class="contextual">Below are smoothness scores (0–100) for first names that pair well with ${htmlEscape(surname)}. The score is deterministic and based only on syllable balance, phonetic transition at the first–last boundary, consonant clash, and length symmetry—no subjective or random factors.</p>
    <div class="score-table-wrap">
    <table class="smoothness-table">
    <thead><tr><th>First name</th><th>Score</th><th>Tier</th></tr></thead>
    <tbody>${scoreBlockRows}</tbody>
    </table>
    </div>
    <p class="contextual">${tierBlock}</p>
    </section>`;

  const scoringLogicP = explanationRenderer
    ? explanationRenderer.getScoringLogicParagraph(surname)
    : 'The Surname Compatibility Smoothness Score is a structured phonetic and linguistic model. It does not use numerology or subjective ratings; every factor is rule-based and repeatable. Syllable balance, phonetic transition at the boundary, consonant clash, length symmetry, and total length combine into a 0–100 score. The same first name and surname always produce the same score.';
  const scoringLogicHtml = `
    <section aria-labelledby="scoring-logic-heading"><h2 id="scoring-logic-heading">How the Smoothness Score is calculated</h2>
    <p class="contextual">${scoringLogicP}</p>
    </section>`;

  const phoneticBreakdownHtml = `
    <section aria-labelledby="phonetic-heading"><h2 id="phonetic-heading">Phonetic breakdown for ${htmlEscape(surname)}</h2>
    ${phoneticParagraphsHtml}
    </section>`;

  const intro =
    'Choosing a first name that sounds good with your last name can make the full name easier to say and remember. A few simple phonetic and cultural guidelines help narrow the options.';

  const listHtml = (arr) =>
    arr.length > 0
      ? '<ul class="name-list">' +
        arr.map((n) => `<li id="${slug(n.name)}"><a href="${nameDetailPath(n.name)}">${htmlEscape(n.name)}</a>${n.meaning ? ' — ' + htmlEscape((n.meaning || '').slice(0, 50)) + ((n.meaning || '').length > 50 ? '…' : '') : ''}</li>`).join('') +
        '</ul>'
      : '';

  const filterLinks = [
    { href: '/names', text: 'All names' },
    { href: '/names/boy' + EXT, text: 'Boy names' },
    { href: '/names/girl' + EXT, text: 'Girl names' },
    { href: '/names/unisex' + EXT, text: 'Unisex names' },
    { href: '/names/with-last-name' + EXT, text: 'Last name compatibility' },
  ];

  // Mesh: Names Like for top 10 compatible, popularity cross-link, tool CTA
  const top10ForNamesLike = compatible.slice(0, 10);
  const namesLikeLinksHtml = top10ForNamesLike.map((n) => '<a href="' + namesLikePath(n.name) + '">' + htmlEscape(n.name) + '</a>').join(', ');
  const latestYear = new Date().getFullYear();
  const lastNameMeshHtml = `
    <section aria-labelledby="names-like-last-heading"><h2 id="names-like-last-heading">Names Like Top Compatible</h2>
    <p class="contextual">Names similar to these: ${namesLikeLinksHtml || '—'}.</p></section>
    <section aria-labelledby="popularity-last-heading"><h2 id="popularity-last-heading">Most Popular First Names with ${htmlEscape(surname)} in ${latestYear}</h2>
    <p class="contextual"><a href="/popularity/${latestYear}${EXT}">Top names of ${latestYear}</a></p></section>
    <section aria-labelledby="tool-cta-heading"><h2 id="tool-cta-heading">Try the Compatibility Tool</h2>
    <p class="contextual"><a href="/compatibility/">Compatibility tool</a></p></section>`;

  const whySmoothnessMattersHtml = `
    <section aria-labelledby="why-smoothness-heading"><h2 id="why-smoothness-heading">Why the Smoothness Score matters</h2>
    <p class="contextual">${whyParagraph}</p>
    </section>`;

  const blockOrder = explanationRenderer ? explanationRenderer.getBlockOrder(surname) : 'A';
  const middleBlocks = blockOrder === 'A'
    ? `${scoringLogicHtml}\n    ${phoneticBreakdownHtml}\n    ${whySmoothnessMattersHtml}`
    : `${phoneticBreakdownHtml}\n    ${scoringLogicHtml}\n    ${whySmoothnessMattersHtml}`;

  const mainContent = `
    <h1>First names that go with ${htmlEscape(surname)}</h1>
    <p class="local-culture">${htmlEscape(intro)}</p>
    ${LASTNAME_PAGE_INTRO_EXTRA}

    ${scoreBlockHtml}
    ${middleBlocks}

    ${alphabetSectionHtml()}
    ${genderSectionHtml()}
    ${countrySectionHtml()}

    <section aria-labelledby="cultural-heading"><h2 id="cultural-heading">Cultural compatibility</h2>
    <p>${htmlEscape(surnameMeta.note || surname + ' is a ' + (surnameMeta.origin || '') + ' surname. First names from the same or related traditions often pair well.')}</p>
    ${culturalSlice.length > 0 ? `<p>Names with ${htmlEscape(surnameMeta.origin || 'matching')} origin:</p>${listHtml(culturalSlice)}` : '<p>Browse the compatible names below for options that fit your style.</p>'}
    </section>

    <section aria-labelledby="compatible-heading"><h2 id="compatible-heading">Compatible first names</h2>
    <p>These first names tend to sound good with ${htmlEscape(surname)} based on syllable balance, vowel-consonant flow, and length. The top names above also have smoothness scores; the full list is ordered by compatibility.</p>
    ${listHtml(compatible.slice(0, 50))}
    </section>

    ${lastNameMeshHtml}

    <section aria-labelledby="filter-links-heading"><h2 id="filter-links-heading">Explore more</h2>
    <p>${filterLinks.map((l) => `<a href="${l.href}">${htmlEscape(l.text)}</a>`).join(' · ')}</p>
    </section>
    <section aria-labelledby="core-heading"><h2 id="core-heading">Explore</h2><p class="core-links">${coreLinksHtml()}</p></section>
  `;

  const html = baseLayout({
    title: 'Names that go with ' + surname + ' | Last name compatibility | nameorigin.io',
    description: 'First names that sound good with the last name ' + surname + '. Phonetic tips, cultural matching, and ' + compatible.length + ' compatible names.',
    path: pathSeg,
    canonical: SITE_URL + pathSeg,
    breadcrumb: breadcrumbItems,
    breadcrumbHtml: breadcrumbHtml(breadcrumbItems.map((i) => ({ ...i, url: i.url.replace(SITE_URL, '') }))),
    mainContent,
  });
  return html;
}

function run() {
  const names = loadJson('names');
  const popularity = loadJson('popularity');
  const categories = loadJson('categories');
  const variants = loadJson('variants');
  const countries = loadJson('countries');

  ensureDir(OUT_DIR);
  ensureDir(path.join(OUT_DIR, 'names'));
  ensureDir(path.join(OUT_DIR, 'name'));

  // Name pages
  names.forEach((n) => generateNamePage(n, names, popularity, categories, variants));

  // Phase 2.5: Names Like pages are generated separately via scripts/generate-names-like.js
  // Run: node scripts/generate-names-like.js --batch=50 (then expand to 200 if authority score ≥ 0.99)

  // /names
  const namesHtml = generateListPage(
    'All names',
    'Browse all first names with meaning and origin.',
    '/names',
    names,
    'Names'
  );
  fs.writeFileSync(path.join(OUT_DIR, 'names', 'index.html'), namesHtml, 'utf8');

  // Core list pages: trending names, top names (for internal link graph) — static .html
  const trendingIds = getTrendingNameIds(popularity, 80);
  const popularIds = getPopularNameIds(popularity, 80);
  const nameById = new Map(names.map((n) => [n.id, n]));
  const trendingNames = trendingIds.map((id) => nameById.get(id)).filter(Boolean);
  const popularNames = popularIds.map((id) => nameById.get(id)).filter(Boolean);
  fs.writeFileSync(
    path.join(OUT_DIR, 'names', 'trending' + EXT),
    generateListPage('Trending names', 'First names with rising popularity. Browse trending baby names.', '/names/trending' + EXT, trendingNames, 'Names'),
    'utf8'
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'names', 'popular' + EXT),
    generateListPage('Top names', 'Most popular first names. Browse top baby names by rank.', '/names/popular' + EXT, popularNames, 'Names'),
    'utf8'
  );

  // Alphabet pages: /names/a.html, /names/b.html, ... /names/z.html — internal link hubs
  const namesByLetter = new Map();
  LETTERS.forEach((l) => namesByLetter.set(l, []));
  names.forEach((n) => {
    const l = (n.first_letter || (n.name || '').charAt(0) || '').toLowerCase();
    if (LETTERS.includes(l)) namesByLetter.get(l).push(n);
  });
  const lettersWithNames = LETTERS.filter((l) => namesByLetter.get(l).length > 0);
  LETTERS.forEach((letter) => {
    const subset = namesByLetter.get(letter) || [];
    const html = generateLetterPage(letter, subset, LETTERS);
    fs.writeFileSync(path.join(OUT_DIR, 'names', letter + EXT), html, 'utf8');
  });
  const lettersHubLinks = (lettersWithNames.length > 0 ? lettersWithNames : LETTERS).map((l) => ({ href: '/names/' + l + EXT, text: l.toUpperCase() }));
  const lettersHubHtml = baseLayout({
    title: 'Browse names by letter | A–Z | nameorigin.io',
    description: 'Browse first names by first letter: A through Z. Each letter links to a full list of names with meaning and origin.',
    path: '/names/letters' + EXT,
    canonical: SITE_URL + '/names/letters' + EXT,
    breadcrumb: [
      { name: 'Home', url: SITE_URL + '/' },
      { name: BREADCRUMB_NAMES_LABEL, url: SITE_URL + '/names' },
      { name: 'Browse by letter', url: SITE_URL + '/names/letters' + EXT },
    ],
    breadcrumbHtml: breadcrumbHtml([
      { name: 'Home', url: '/' },
      { name: BREADCRUMB_NAMES_LABEL, url: '/names' },
      { name: 'Browse by letter', url: '/names/letters' + EXT },
    ]),
    mainContent: `
    <h1>Browse names by letter</h1>
    <p>Choose a letter to see all first names starting with that letter. Each name links to its meaning and origin.</p>
    <section aria-labelledby="letters-heading"><h2 id="letters-heading">A–Z</h2>
    <p class="letters-hub">${lettersHubLinks.map((l) => `<a href="${l.href}">${htmlEscape(l.text)}</a>`).join(' ')}</p>
    </section>
    ${genderSectionHtml()}
    ${countrySectionHtml()}
    <section aria-labelledby="core-explore-heading"><h2 id="core-explore-heading">Explore</h2><p class="core-links">${coreLinksHtml()}</p></section>
  `,
  });
  fs.writeFileSync(path.join(OUT_DIR, 'names', 'letters' + EXT), lettersHubHtml, 'utf8');

  // /names/boy.html, /names/girl.html, /names/unisex.html
  ['boy', 'girl', 'unisex'].forEach((gender) => {
    const subset = names.filter((n) => n.gender === gender);
    const html = generateListPage(
      gender.charAt(0).toUpperCase() + gender.slice(1) + ' names',
      'Browse ' + gender + ' names with meaning and origin.',
      '/names/' + gender + EXT,
      subset,
      gender
    );
    fs.writeFileSync(path.join(OUT_DIR, 'names', gender + EXT), html, 'utf8');
  });

  // Country pages: /names/canada.html, /names/usa.html, etc.
  const countrySlugMap = { USA: 'usa', CAN: 'canada', IND: 'india', FRA: 'france', IRL: 'ireland' };
  countries.forEach((c) => {
    const slugKey = (c.code && countrySlugMap[c.code]) || slug(c.name);
    const html = generateCountryPage(c, slugKey, names, popularity);
    fs.writeFileSync(path.join(OUT_DIR, 'names', slugKey + EXT), html, 'utf8');
  });

  // Gender + country filters: /names/boy/canada.html, /names/girl/india.html, etc.
  ensureDir(path.join(OUT_DIR, 'names', 'boy'));
  ensureDir(path.join(OUT_DIR, 'names', 'girl'));
  ensureDir(path.join(OUT_DIR, 'names', 'unisex'));
  ['boy', 'girl', 'unisex'].forEach((gender) => {
    countries.forEach((c) => {
      const slugKey = (c.code && countrySlugMap[c.code]) || slug(c.name);
      const html = generateGenderCountryPage(gender, c, slugKey, names);
      fs.writeFileSync(path.join(OUT_DIR, 'names', gender, slugKey + EXT), html, 'utf8');
    });
  });

  // Style pages: /names/style.html (hub), /names/style/nature.html, etc.
  ensureDir(path.join(OUT_DIR, 'names', 'style'));
  STYLE_CONFIG.forEach((style) => {
    const subset = getNamesForStyle(style.slug, style.category, names, categories);
    const html = generateStylePage(style.slug, style.label, style.description, subset, names);
    fs.writeFileSync(path.join(OUT_DIR, 'names', 'style', style.slug + EXT), html, 'utf8');
  });
  const styleHubLinks = STYLE_CONFIG.map((s) => ({ href: '/names/style/' + s.slug + EXT, text: s.label }));
  const styleHubHtml = baseLayout({
    title: 'Names by style | Nature, classic, modern, rare | nameorigin.io',
    description: 'Browse first names by style: nature, classic, modern, rare, biblical, popular, and traditional names.',
    path: '/names/style' + EXT,
    canonical: SITE_URL + '/names/style' + EXT,
    breadcrumb: [
      { name: 'Home', url: SITE_URL + '/' },
      { name: BREADCRUMB_NAMES_LABEL, url: SITE_URL + '/names' },
      { name: 'Names by style', url: SITE_URL + '/names/style' + EXT },
    ],
    breadcrumbHtml: breadcrumbHtml([
      { name: 'Home', url: '/' },
      { name: BREADCRUMB_NAMES_LABEL, url: '/names' },
      { name: 'Names by style', url: '/names/style' + EXT },
    ]),
    mainContent: `
    <h1>Names by style</h1>
    <p>Browse first names by style: nature-inspired, classic, modern, rare, biblical, popular, and traditional.</p>
    ${alphabetSectionHtml()}
    ${genderSectionHtml()}
    ${countrySectionHtml()}
    <section aria-labelledby="styles-heading"><h2 id="styles-heading">Styles</h2>
    <ul class="name-list">${styleHubLinks.map((l) => `<li><a href="${l.href}">${htmlEscape(l.text)}</a></li>`).join('')}</ul>
    </section>
    <section aria-labelledby="core-explore-heading"><h2 id="core-explore-heading">Explore</h2><p class="core-links">${coreLinksHtml()}</p></section>
  `,
  });
  fs.writeFileSync(path.join(OUT_DIR, 'names', 'style' + EXT), styleHubHtml, 'utf8');

  // Last name compatibility: /names/with-last-name-smith.html, /names/with-last-name-garcia.html, etc.
  const lastNames = loadJson('last-names');
  lastNames.forEach((surnameMeta) => {
    const slugKey = slug(surnameMeta.name);
    if (!slugKey) return;
    const html = generateLastNamePage(surnameMeta, names);
    fs.writeFileSync(path.join(OUT_DIR, 'names', 'with-last-name-' + slugKey + EXT), html, 'utf8');
  });
  // Hub: /names/with-last-name.html (index of all last name pages)
  const lastNameHubLinks = lastNames.map((s) => ({ href: '/names/with-last-name-' + slug(s.name) + EXT, text: s.name }));
  const lastNameHubHtml = baseLayout({
    title: 'Last name compatibility | First names that sound good with your surname | nameorigin.io',
    description: 'Browse first names that pair well with popular last names like Smith, Garcia, Nguyen. Phonetic tips and cultural matching.',
    path: '/names/with-last-name' + EXT,
    canonical: SITE_URL + '/names/with-last-name' + EXT,
    breadcrumb: [
      { name: 'Home', url: SITE_URL + '/' },
      { name: BREADCRUMB_NAMES_LABEL, url: SITE_URL + '/names' },
      { name: 'Last name compatibility', url: SITE_URL + '/names/with-last-name' + EXT },
    ],
    breadcrumbHtml: breadcrumbHtml([
      { name: 'Home', url: '/' },
      { name: BREADCRUMB_NAMES_LABEL, url: '/names' },
      { name: 'Last name compatibility', url: '/names/with-last-name' + EXT },
    ]),
    mainContent: `
    <h1>Last name compatibility</h1>
    <p>Choose a last name to see first names that sound good with it, plus phonetic tips and cultural matching.</p>
    ${alphabetSectionHtml()}
    ${genderSectionHtml()}
    ${countrySectionHtml()}
    <section aria-labelledby="surnames-heading"><h2 id="surnames-heading">Browse by last name</h2>
    <p class="name-links">${lastNameHubLinks.map((l) => `<a href="${l.href}">${htmlEscape(l.text)}</a>`).join(' · ')}</p>
    </section>
    <section aria-labelledby="baby-names-with-heading"><h2 id="baby-names-with-heading">Baby names with [surname] (detailed guides)</h2>
    <p class="name-links"><a href="/baby-names-with-smith/">Smith</a> · <a href="/baby-names-with-garcia/">Garcia</a> · <a href="/baby-names-with-johnson/">Johnson</a> · <a href="/baby-names-with-williams/">Williams</a> · <a href="/baby-names-with-brown/">Brown</a></p>
    </section>
    <section aria-labelledby="core-explore-heading"><h2 id="core-explore-heading">Explore</h2><p class="core-links">${coreLinksHtml()}</p></section>
  `,
  });
  fs.writeFileSync(path.join(OUT_DIR, 'names', 'with-last-name' + EXT), lastNameHubHtml, 'utf8');

  // /compatibility/ — primary utility page (mesh: intent axis)
  ensureDir(path.join(OUT_DIR, 'compatibility'));
  const compatTopLinks = TOP_COMPATIBILITY_SURNAMES.map((s) => ({ href: '/names/with-last-name-' + s + EXT, text: s.charAt(0).toUpperCase() + s.slice(1) }));
  const compatibilityPageHtml = baseLayout({
    title: 'First & Last Name Compatibility | NameOrigin',
    description: 'See how first names sound with popular last names. Try Smith, Garcia, Johnson and more. Interactive compatibility tool.',
    path: '/compatibility/',
    canonical: SITE_URL + '/compatibility/',
    breadcrumb: [
      { name: 'Home', url: SITE_URL + '/' },
      { name: BREADCRUMB_NAMES_LABEL, url: SITE_URL + '/names' },
      { name: 'Compatibility', url: SITE_URL + '/compatibility/' },
    ],
    breadcrumbHtml: breadcrumbHtml([
      { name: 'Home', url: '/' },
      { name: BREADCRUMB_NAMES_LABEL, url: '/names' },
      { name: 'Compatibility', url: '/compatibility/' },
    ]),
    mainContent: `
    <h1>First & Last Name Compatibility</h1>
    <p class="contextual">Find first names that sound good with your last name. Browse by popular surnames or use the compatibility hub to explore.</p>
    <section aria-labelledby="try-heading"><h2 id="try-heading">Try These Last Names</h2>
    <p class="name-links">${compatTopLinks.map((l) => `<a href="${l.href}">${htmlEscape(l.text)}</a>`).join(' · ')}</p>
    </section>
    <section aria-labelledby="hub-heading"><h2 id="hub-heading">Browse All</h2>
    <p><a href="/names/with-last-name${EXT}">Last name compatibility hub</a> — see first names that pair well with Smith, Garcia, Johnson, Nguyen, and more.</p>
    </section>
    <section aria-labelledby="core-explore-heading"><h2 id="core-explore-heading">Explore</h2><p class="core-links">${coreLinksHtml()}</p></section>
  `,
  });
  fs.writeFileSync(path.join(OUT_DIR, 'compatibility', 'index.html'), compatibilityPageHtml, 'utf8');

  // Authority hub pages (structured indexes — root-level .html)
  function writeHubPage(filename, title, description, pathSeg, sections) {
    const breadcrumbItems = [
      { name: 'Home', url: SITE_URL + '/' },
      { name: title.replace(/\s*\|\s*nameorigin\.io\s*$/i, ''), url: SITE_URL + pathSeg },
    ];
    const mainContent =
      '<h1>' +
      htmlEscape(title.replace(/\s*\|\s*nameorigin\.io\s*$/i, '')) +
      '</h1>\n    <p>' +
      htmlEscape(description) +
      '</p>\n    ' +
      sections
        .map(
          (sec) =>
            '<section aria-labelledby="' +
            slug(sec.heading) +
            '-heading"><h2 id="' +
            slug(sec.heading) +
            '-heading">' +
            htmlEscape(sec.heading) +
            '</h2><ul>' +
            sec.links.map((l) => '<li><a href="' + htmlEscape(l.href) + '">' + htmlEscape(l.text) + '</a></li>').join('') +
            '</ul></section>'
        )
        .join('\n    ') +
      '\n    <section aria-labelledby="explore-heading"><h2 id="explore-heading">Explore</h2><p class="core-links">' +
      coreLinksHtml() +
      '</p></section>';
    const html = baseLayout({
      title: title + (title.includes('nameorigin') ? '' : ' | nameorigin.io'),
      description,
      path: pathSeg,
      canonical: SITE_URL + pathSeg,
      breadcrumb: breadcrumbItems,
      breadcrumbHtml: breadcrumbHtml(breadcrumbItems.map((i) => ({ ...i, url: i.url.replace(SITE_URL, '') }))),
      mainContent,
    });
    fs.writeFileSync(path.join(OUT_DIR, filename), html, 'utf8');
  }

  writeHubPage(
    'all-name-pages.html',
    'All name pages',
    'Structured index of every names list: all names, boy names, girl names, and unisex names. Browse first names with meaning and origin.',
    '/all-name-pages.html',
    [
      {
        heading: 'Name lists',
        links: [
          { href: '/names', text: 'All names' },
          { href: '/names/boy' + EXT, text: 'Boy names' },
          { href: '/names/girl' + EXT, text: 'Girl names' },
          { href: '/names/unisex' + EXT, text: 'Unisex names' },
        ],
      },
    ]
  );

  writeHubPage(
    'country-name-pages.html',
    'Country name pages',
    'Index of name pages by country: USA, Canada, France, India, Ireland. Names from each country plus boy, girl, and unisex filters per country.',
    '/country-name-pages.html',
    [
      {
        heading: 'Countries',
        links: countries.map((c) => {
          const slugKey = (c.code && countrySlugMap[c.code]) || slug(c.name);
          return { href: '/names/' + slugKey + EXT, text: 'Names from ' + (c.name || c.code) };
        }),
      },
      {
        heading: 'Gender + country',
        links: [].concat(
          ...['boy', 'girl', 'unisex'].map((gender) =>
            countries.map((c) => {
              const slugKey = (c.code && countrySlugMap[c.code]) || slug(c.name);
              const label = gender.charAt(0).toUpperCase() + gender.slice(1) + ' names from ' + (c.name || c.code);
              return { href: '/names/' + gender + '/' + slugKey + EXT, text: label };
            })
          )
        ),
      },
    ]
  );

  writeHubPage(
    'style-name-pages.html',
    'Style name pages',
    'Browse first names by style: nature, classic, modern, rare, biblical, popular, and traditional. Each style links to a full list of names.',
    '/style-name-pages.html',
    [
      { heading: 'Styles hub', links: [{ href: '/names/style' + EXT, text: 'Names by style' }] },
      {
        heading: 'By style',
        links: STYLE_CONFIG.map((s) => ({ href: '/names/style/' + s.slug + EXT, text: s.label })),
      },
    ]
  );

  writeHubPage(
    'last-name-pages.html',
    'Last name compatibility pages',
    'Index of last name compatibility pages. Find first names that sound good with your surname — Smith, Garcia, Nguyen, and more. Phonetic tips and cultural matching.',
    '/last-name-pages.html',
    [
      { heading: 'Hub', links: [{ href: '/names/with-last-name' + EXT, text: 'Last name compatibility' }] },
      {
        heading: 'By last name',
        links: lastNames.map((s) => ({ href: '/names/with-last-name-' + slug(s.name) + EXT, text: s.name })),
      },
    ]
  );

  writeHubPage(
    'alphabet-name-pages.html',
    'Alphabet name pages',
    'Browse first names A–Z. Index of letter pages: names starting with A, B, C, and every letter. Each letter page is a hub of names with meaning and origin.',
    '/alphabet-name-pages.html',
    [
      { heading: 'Letters hub', links: [{ href: '/names/letters' + EXT, text: 'Browse by letter' }] },
      {
        heading: 'A–Z',
        links: LETTERS.map((l) => ({ href: '/names/' + l + EXT, text: 'Names starting with ' + l.toUpperCase() })),
      },
    ]
  );

  // Build verification: count programmatic output (name/, names/, names-like/, hub .html), sample URLs, fail if zero
  const nameDir = path.join(OUT_DIR, 'name');
  const namesDir = path.join(OUT_DIR, 'names');
  const namesLikeDir = path.join(OUT_DIR, 'names-like');
  const hubFiles = ['all-name-pages.html', 'country-name-pages.html', 'style-name-pages.html', 'last-name-pages.html', 'alphabet-name-pages.html'];
  const { total, samples } = countProgrammaticPages(OUT_DIR, nameDir, namesDir, hubFiles, namesLikeDir);
  console.log('');
  console.log('--- Build verification ---');
  console.log('Total programmatic pages generated:', total.toLocaleString());
  if (samples.length > 0) {
    console.log('Sample URLs:');
    samples.slice(0, 12).forEach((u) => console.log('  ', u));
  }
  console.log('---');
  if (total === 0) {
    console.error('ERROR: Zero programmatic pages generated. Build failed.');
    process.exit(1);
  }
  console.log('Generated programmatic pages under', OUT_DIR);

  // Step 6: Automatically regenerate sitemap after programmatic generation (homepage, country, gender, name pages)
  console.log('\nRegenerating sitemap...');
  require(path.join(__dirname, 'build-sitemap.js'));
}

function countProgrammaticPages(outDir, nameDir, namesDir, hubFiles, namesLikeDir) {
  const samples = [];
  let total = 0;
  const toUrl = (relPath) => SITE_URL + '/' + relPath.replace(/\\/g, '/');
  function countHtmlInDir(d, baseRel) {
    if (!fs.existsSync(d)) return;
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(d, e.name);
      const rel = baseRel ? baseRel + '/' + e.name : e.name;
      if (e.isDirectory()) {
        countHtmlInDir(full, rel);
      } else if (e.name.endsWith('.html')) {
        total += 1;
        let sampleUrl = toUrl(rel);
        if (baseRel === 'name' && e.name === 'index.html') sampleUrl = SITE_URL + '/name/' + path.basename(path.dirname(full)) + '/';
        if (baseRel === 'names-like' && e.name === 'index.html') sampleUrl = SITE_URL + '/names-like/' + path.basename(path.dirname(full)) + '/';
        if (samples.length < 12) samples.push(sampleUrl);
      }
    }
  }
  countHtmlInDir(nameDir, 'name');
  countHtmlInDir(namesDir, 'names');
  if (namesLikeDir) countHtmlInDir(namesLikeDir, 'names-like');
  hubFiles.forEach((f) => {
    const full = path.join(outDir, f);
    if (fs.existsSync(full)) {
      total += 1;
      if (samples.length < 12) samples.push(toUrl(f));
    }
  });
  return { total, samples };
}

run();
