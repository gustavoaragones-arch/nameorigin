#!/usr/bin/env node
/**
 * Phase 2 — Generate hub index pages. Clear hub architecture for SEO.
 * Output: programmatic/index.html, programmatic/names/index.html (hub), programmatic/countries/index.html, programmatic/last-names/index.html, programmatic/letters/index.html
 */

const fs = require('fs');
const path = require('path');
const lib = require('./lib.js');

const { PROGRAMMATIC_DIR, SITE_URL, loadJson, slug, ensureDir, htmlEscape, readTemplate, baseLayout } = lib;

function applyHubTemplate(title, intro, linksHtml) {
  let tpl = readTemplate('hub-page.html');
  if (!tpl) return `<h1>${htmlEscape(title)}</h1><p>${htmlEscape(intro)}</p><ul>${linksHtml}</ul>`;
  return tpl
    .replace(/\{\{TITLE\}\}/g, htmlEscape(title))
    .replace(/\{\{INTRO\}\}/g, htmlEscape(intro))
    .replace(/\{\{LINKS_HTML\}\}/g, linksHtml);
}

function writeHubPage(opts) {
  const { pathSeg, title, description, intro, links } = opts;
  const linksHtml = (links || []).map((l) => `<li><a href="${l.href}">${htmlEscape(l.text)}</a></li>`).join('\n');
  const mainContent = applyHubTemplate(title, intro, linksHtml);
  const breadcrumbNav = (opts.breadcrumbItems || []).map((item, i) => (i === opts.breadcrumbItems.length - 1 ? `<span aria-current="page">${htmlEscape(item.name)}</span>` : `<a href="${item.url}">${htmlEscape(item.name)}</a>`)).join(' / ');

  const html = baseLayout({
    title: title + ' | nameorigin.io',
    description: description || intro,
    path: pathSeg,
    canonical: SITE_URL + pathSeg,
    breadcrumb: (opts.breadcrumbItems || []).map((i) => ({ name: i.name, url: i.url })),
    breadcrumbHtml: breadcrumbNav,
    mainContent,
  });

  const relPath = pathSeg.replace(/^\/programmatic\//, '').replace(/\/$/, '') || 'index';
  const outPath = path.join(PROGRAMMATIC_DIR, relPath === 'index' ? 'index.html' : path.join(relPath, 'index.html'));
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, html, 'utf8');
}

function run() {
  const names = loadJson('names');
  const countries = loadJson('countries');
  const base = { name: 'Home', url: SITE_URL + '/' };

  // Main programmatic hub: /programmatic/
  writeHubPage({
    pathSeg: '/programmatic/',
    title: 'Name origins & meanings',
    description: 'Hub for browsing names by gender, country, letter, and last-name compatibility.',
    intro: 'Browse first names by meaning, origin, gender, country, or find names that pair well with your last name.',
    breadcrumbItems: [base, { name: 'Browse', url: SITE_URL + '/programmatic/' }],
    links: [
      { href: '/programmatic/names/', text: 'All names' },
      { href: '/programmatic/names/boy/', text: 'Boy names' },
      { href: '/programmatic/names/girl/', text: 'Girl names' },
      { href: '/programmatic/names/unisex/', text: 'Unisex names' },
      { href: '/programmatic/countries/', text: 'By country' },
      { href: '/programmatic/letters/', text: 'By letter' },
      { href: '/programmatic/last-names/', text: 'Last name compatibility' },
    ],
  });

  // Names index is the full list (from generate-filter-pages); no separate names hub to avoid overwriting.

  // Countries hub: /programmatic/countries/
  const countryLinks = countries.map((c) => ({
    href: '/programmatic/countries/' + (slug(c.name) || (c.code && c.code.toLowerCase())) + '/',
    text: c.name || c.code,
  }));
  writeHubPage({
    pathSeg: '/programmatic/countries/',
    title: 'Names by country',
    description: 'Browse names by country of origin.',
    intro: 'First names by country of origin.',
    breadcrumbItems: [base, { name: 'Countries', url: SITE_URL + '/programmatic/countries/' }],
    links: countryLinks.length ? countryLinks : [{ href: '/programmatic/names/', text: 'All names' }],
  });

  // Last names hub: /programmatic/last-names/
  const lastNames = ['smith', 'garcia', 'nguyen', 'johnson', 'williams', 'martinez', 'anderson', 'thomas', 'jackson', 'lee'];
  const lastnameLinks = lastNames.map((s) => ({ href: '/programmatic/last-names/' + s + '/', text: s.charAt(0).toUpperCase() + s.slice(1) }));
  writeHubPage({
    pathSeg: '/programmatic/last-names/',
    title: 'Last name compatibility',
    description: 'Find first names that pair well with your last name.',
    intro: 'Browse first names that go well with common last names.',
    breadcrumbItems: [base, { name: 'Last names', url: SITE_URL + '/programmatic/last-names/' }],
    links: lastnameLinks,
  });

  // Letters hub: /programmatic/letters/
  const letters = [...new Set(names.map((n) => (n.first_letter || n.name.charAt(0) || '').toLowerCase()).filter(Boolean))].sort();
  const letterLinks = letters.map((l) => ({ href: '/programmatic/letters/' + l + '/', text: l.toUpperCase() }));
  writeHubPage({
    pathSeg: '/programmatic/letters/',
    title: 'Names by letter',
    description: 'Browse names by first letter.',
    intro: 'First names grouped by first letter.',
    breadcrumbItems: [base, { name: 'Letters', url: SITE_URL + '/programmatic/letters/' }],
    links: letterLinks.length ? letterLinks : [{ href: '/programmatic/names/', text: 'All names' }],
  });

  // Styles hub: /programmatic/styles/ (naming styles from quiz)
  ensureDir(path.join(PROGRAMMATIC_DIR, 'styles'));
  const styleLinks = [
    { href: '/programmatic/names/boy/', text: 'Boy names' },
    { href: '/programmatic/names/girl/', text: 'Girl names' },
    { href: '/programmatic/names/', text: 'All names' },
  ];
  writeHubPage({
    pathSeg: '/programmatic/styles/',
    title: 'Naming styles',
    description: 'Browse names by style: classic, modern, by gender.',
    intro: 'Explore names by style and gender.',
    breadcrumbItems: [base, { name: 'Styles', url: SITE_URL + '/programmatic/styles/' }],
    links: styleLinks,
  });

  console.log('Generated hub pages under programmatic/');
}

run();
