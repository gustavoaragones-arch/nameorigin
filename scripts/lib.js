/**
 * Phase 2 — Shared helpers for programmatic SEO generators.
 * Use from scripts via: const lib = require('./lib.js'); or load as module.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const PROGRAMMATIC_DIR = path.join(ROOT, 'programmatic');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const SITE_URL = process.env.SITE_URL || 'https://nameorigin.io';

function loadJson(name) {
  const p = path.join(DATA_DIR, name + '.json');
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function slug(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function htmlEscape(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function readTemplate(name) {
  const p = path.join(TEMPLATES_DIR, name);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
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

function breadcrumbHtml(items, baseUrl = '') {
  return items
    .map((item, i) => {
      const isLast = i === items.length - 1;
      const href = item.url || (baseUrl + item.path);
      if (isLast) return `<span aria-current="page">${htmlEscape(item.name)}</span>`;
      return `<a href="${htmlEscape(href)}">${htmlEscape(item.name)}</a>`;
    })
    .join(' / ');
}

function personJsonLd(record) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: record.name,
    description: record.meaning || `Meaning and origin of the name ${record.name}`,
  };
}

const ORIGIN_BADGES = {
  ireland: { flag: '🇮🇪', label: 'Irish', hint: 'Irish and Celtic origins.' },
  italy: { flag: '🇮🇹', label: 'Italian', hint: 'From Latin and Italian tradition.' },
  india: { flag: '🇮🇳', label: 'Sanskrit', hint: 'Sanskrit and Indian origins.' },
  germany: { flag: '🇩🇪', label: 'German', hint: 'Germanic roots.' },
  hebrew: { flag: '🇮🇱', label: 'Hebrew', hint: 'Hebrew and biblical tradition.' },
  latin: { flag: '🇮🇹', label: 'Latin', hint: 'Latin origin.' },
  sanskrit: { flag: '🇮🇳', label: 'Sanskrit', hint: 'Sanskrit origin.' },
  german: { flag: '🇩🇪', label: 'German', hint: 'Germanic origin.' },
  irish: { flag: '🇮🇪', label: 'Irish', hint: 'Irish and Celtic origins.' },
  french: { flag: '🇫🇷', label: 'French', hint: 'French tradition.' },
  english: { flag: '🇬🇧', label: 'English', hint: 'English-speaking usage.' },
  usa: { flag: '🇺🇸', label: 'English', hint: 'Widely used in the USA.' },
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
  const title = htmlEscape(opts.title || 'Name Origin');
  const description = htmlEscape(opts.description || 'Discover the meaning and origin of first names.');
  const canonical = htmlEscape(opts.canonical || SITE_URL + (opts.path || '/'));
  const breadcrumb = opts.breadcrumb ? JSON.stringify(breadcrumbJsonLd(opts.breadcrumb)) : '';
  const extraSchema = opts.extraSchema ? JSON.stringify(opts.extraSchema) : '';
  const breadcrumbNav = opts.breadcrumbHtml || '';
  const mainContent = opts.mainContent || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${description}">
  <title>${title}</title>
  <link rel="stylesheet" href="/styles.css">
  <link rel="canonical" href="${canonical}">
  ${breadcrumb ? `<script type="application/ld+json">${breadcrumb}</script>` : ''}
  ${extraSchema ? `<script type="application/ld+json">${extraSchema}</script>` : ''}
</head>
<body>
  <header class="site-header" role="banner">
    <div class="container">
      <a href="/" class="site-logo">nameorigin.io</a>
      <nav class="site-nav" aria-label="Main navigation">
        <a href="/">Home</a>
        <a href="/programmatic/names/">Names</a>
        <a href="/programmatic/names/boy/">Boy</a>
        <a href="/programmatic/names/girl/">Girl</a>
        <a href="/programmatic/countries/">Countries</a>
        <a href="/programmatic/last-names/">Last Names</a>
      </nav>
    </div>
  </header>
  <main class="container section">
    <nav aria-label="Breadcrumb" class="breadcrumb">${breadcrumbNav}</nav>
    ${mainContent}
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

function internalLinksForName(record, names, limit = 20) {
  const links = [
    { href: '/', text: 'Home' },
    { href: '/programmatic/names/', text: 'All names' },
    { href: '/programmatic/names/' + (record.gender || '') + '/', text: 'More ' + (record.gender || '') + ' names' },
  ];
  if (record.origin_country) {
    const cs = slug(record.origin_country);
    links.push({ href: '/programmatic/countries/' + cs + '/', text: 'Names from ' + record.origin_country });
  }
  if (record.first_letter) {
    const letter = (record.first_letter || '').toLowerCase();
    if (letter) links.push({ href: '/programmatic/letters/' + letter + '/', text: 'Names starting with ' + record.first_letter });
  }
  const same = names.filter((n) => n.first_letter === record.first_letter && n.id !== record.id).slice(0, 5);
  same.forEach((n) => links.push({ href: '/programmatic/names/' + slug(n.name) + '/', text: 'Similar: ' + n.name }));
  return links.slice(0, limit);
}

module.exports = {
  ROOT,
  DATA_DIR,
  PROGRAMMATIC_DIR,
  TEMPLATES_DIR,
  SITE_URL,
  loadJson,
  slug,
  ensureDir,
  htmlEscape,
  readTemplate,
  breadcrumbJsonLd,
  breadcrumbHtml,
  baseLayout,
  personJsonLd,
  getOriginBadge,
  originBadgeHtml,
  ORIGIN_BADGES,
  internalLinksForName,
};
