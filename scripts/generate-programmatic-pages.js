#!/usr/bin/env node
/**
 * generate-programmatic-pages.js
 * Generates all SEO programmatic pages: names list, country, gender, combined filters,
 * last-name compatibility, and individual name pages.
 * Output: /programmatic/* with breadcrumbs, JSON-LD, canonical, meta, internal links.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
// Output at project root so URLs are /names, /name/liam, etc. Use OUT_DIR=programmatic to nest under /programmatic.
const OUT_DIR = process.env.OUT_DIR ? path.join(ROOT, process.env.OUT_DIR) : ROOT;

const SITE_URL = process.env.SITE_URL || 'https://nameorigin.io';

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
  const list = items.map((item, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: item.name,
    item: item.url,
  }));
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: list,
  };
}

function faqJsonLd(faqs) {
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

function personJsonLd(nameRecord) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: nameRecord.name,
    description: nameRecord.meaning || ('Meaning and origin of the name ' + nameRecord.name),
  };
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
  const title = opts.title || 'Name Origin';
  const description = opts.description || 'Discover the meaning and origin of first names.';
  const canonical = opts.canonical || SITE_URL + (opts.path || '/');
  const breadcrumb = opts.breadcrumb ? JSON.stringify(breadcrumbJsonLd(opts.breadcrumb)) : '';
  const extraSchema = opts.extraSchema ? JSON.stringify(opts.extraSchema) : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${htmlEscape(description)}">
  <title>${htmlEscape(title)}</title>
  <link rel="stylesheet" href="/styles.css">
  <link rel="canonical" href="${htmlEscape(canonical)}">
  ${breadcrumb ? `<script type="application/ld+json">${breadcrumb}</script>` : ''}
  ${extraSchema ? `<script type="application/ld+json">${extraSchema}</script>` : ''}
</head>
<body>
  <header class="site-header" role="banner">
    <div class="container">
      <a href="/" class="site-logo">nameorigin.io</a>
      <nav class="site-nav" aria-label="Main navigation">
        <a href="/names">Names</a>
        <a href="/names/boy">Boy Names</a>
        <a href="/names/girl">Girl Names</a>
        <a href="/names/unisex">Unisex Names</a>
        <a href="/programmatic/name-pages/">Name Pages</a>
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

function internalLinksForName(record, names, popularity, categories, variants) {
  const links = [
    { href: '/', text: 'Home' },
    { href: '/names', text: 'All names' },
    { href: '/names/' + record.gender, text: 'More ' + record.gender + ' names' },
  ];
  if (record.origin_country) {
    const countrySlug = slug(record.origin_country);
    links.push({ href: '/names/' + countrySlug, text: 'Names from ' + record.origin_country });
    links.push({ href: '/names/' + record.gender + '/' + countrySlug, text: record.gender + ' names from ' + record.origin_country });
  }
  if (record.first_letter) {
    links.push({ href: '/names/letter/' + record.first_letter.toLowerCase(), text: 'Names starting with ' + record.first_letter });
  }
  const sameLetter = names.filter((n) => n.first_letter === record.first_letter && n.id !== record.id).slice(0, 5);
  sameLetter.forEach((n) => links.push({ href: '/name/' + slug(n.name), text: 'Similar: ' + n.name }));
  return links;
}

function generateNamePage(record, names, popularity, categories, variants) {
  const nameSlug = slug(record.name);
  const pathSeg = '/name/' + nameSlug;
  const url = SITE_URL + pathSeg;
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL + '/' },
    { name: 'Names', url: SITE_URL + '/names' },
    { name: record.name, url },
  ];
  const internalLinks = internalLinksForName(record, names, popularity, categories, variants);
  const linksHtml = internalLinks.slice(0, 20).map((l) => `<a href="${l.href}">${l.text}</a>`).join(' · ');

  const popByCountry = (popularity || []).filter((p) => p.name_id === record.id);
  const popHtml = popByCountry.length
    ? '<section><h3>Popularity</h3><ul>' + popByCountry.map((p) => `<li>${p.country} (${p.year}): rank ${p.rank || '—'}</li>`).join('') + '</ul></section>'
    : '';

  const mainContent = `
    <h1>${htmlEscape(record.name)}</h1>
    ${originBadgeHtml(record)}
    <p><strong>Meaning:</strong> ${htmlEscape(record.meaning || '—')}</p>
    <p><strong>Origin:</strong> ${htmlEscape(record.origin_country || '—')} · ${htmlEscape(record.language || '—')}</p>
    <p><strong>Gender:</strong> ${htmlEscape(record.gender || '—')}</p>
    ${record.phonetic ? `<p><strong>Pronunciation:</strong> ${htmlEscape(record.phonetic)}</p>` : ''}
    ${popHtml}
    <h2>Related</h2>
    <p>${linksHtml}</p>
  `;

  const html = baseLayout({
    title: record.name + ' — Meaning & Origin | nameorigin.io',
    description: (record.meaning || 'Meaning and origin of the name ') + record.name + '.',
    path: pathSeg,
    breadcrumb: breadcrumbItems,
    breadcrumbHtml: breadcrumbHtml(breadcrumbItems.map((i) => ({ ...i, url: i.url.replace(SITE_URL, '') }))),
    mainContent,
    extraSchema: personJsonLd(record),
  });

  const outPath = path.join(OUT_DIR, 'name', nameSlug, 'index.html');
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, html, 'utf8');
}

function generateListPage(title, description, pathSeg, names, listTitle) {
  const url = SITE_URL + pathSeg;
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL + '/' },
    { name: listTitle || 'Names', url },
  ];
  const listHtml =
    '<ul>' +
    names.map((n) => `<li><a href="/name/${slug(n.name)}">${htmlEscape(n.name)}</a> — ${htmlEscape(n.meaning || '')}</li>`).join('') +
    '</ul>';
  const html = baseLayout({
    title: title + ' | nameorigin.io',
    description,
    path: pathSeg,
    breadcrumb: breadcrumbItems,
    breadcrumbHtml: breadcrumbHtml(breadcrumbItems.map((i) => ({ ...i, url: i.url.replace(SITE_URL, '') }))),
    mainContent: `<h1>${htmlEscape(title)}</h1>${listHtml}`,
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

  // /names
  const namesHtml = generateListPage(
    'All names',
    'Browse all first names with meaning and origin.',
    '/names',
    names,
    'Names'
  );
  fs.writeFileSync(path.join(OUT_DIR, 'names', 'index.html'), namesHtml, 'utf8');

  // /names/boy, /names/girl, /names/unisex
  ['boy', 'girl', 'unisex'].forEach((gender) => {
    const subset = names.filter((n) => n.gender === gender);
    const html = generateListPage(
      gender.charAt(0).toUpperCase() + gender.slice(1) + ' names',
      'Browse ' + gender + ' names with meaning and origin.',
      '/names/' + gender,
      subset,
      gender
    );
    ensureDir(path.join(OUT_DIR, 'names', gender));
    fs.writeFileSync(path.join(OUT_DIR, 'names', gender, 'index.html'), html, 'utf8');
  });

  // Country routes: /names/canada, etc.
  const countrySlugMap = { USA: 'usa', CAN: 'canada', IND: 'india', FRA: 'france', IRL: 'ireland' };
  countries.forEach((c) => {
    const slugKey = (c.code && countrySlugMap[c.code]) || slug(c.name);
    const subset = names.filter((n) => (n.origin_country || '').toLowerCase() === (c.name || '').toLowerCase() || (n.origin_country || '').toLowerCase() === (c.code || '').toLowerCase());
    if (subset.length === 0 && names.length > 0) return;
    const html = generateListPage(
      'Names from ' + (c.name || c.code),
      'First names from ' + (c.name || c.code) + '.',
      '/names/' + slugKey,
      subset.length ? subset : names,
      c.name || c.code
    );
    ensureDir(path.join(OUT_DIR, 'names', slugKey));
    fs.writeFileSync(path.join(OUT_DIR, 'names', slugKey, 'index.html'), html, 'utf8');
  });

  console.log('Generated programmatic pages under', OUT_DIR);
}

run();
