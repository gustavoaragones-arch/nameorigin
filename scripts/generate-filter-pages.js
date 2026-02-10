#!/usr/bin/env node
/**
 * Phase 2 — Generate filter/list pages: names (all, boy, girl, unisex), countries, letters, styles.
 * Output: programmatic/names/, programmatic/names/boy/, programmatic/countries/usa/, programmatic/letters/a/
 */

const fs = require('fs');
const path = require('path');
const lib = require('./lib.js');

const { PROGRAMMATIC_DIR, SITE_URL, loadJson, slug, ensureDir, htmlEscape, readTemplate, baseLayout, breadcrumbHtml } = lib;

function applyFilterTemplate(title, intro, namesListHtml) {
  let tpl = readTemplate('filter-page.html');
  if (!tpl) return `<h1>${htmlEscape(title)}</h1><p>${htmlEscape(intro)}</p><ul>${namesListHtml}</ul>`;
  return tpl
    .replace(/\{\{TITLE\}\}/g, htmlEscape(title))
    .replace(/\{\{INTRO\}\}/g, htmlEscape(intro))
    .replace(/\{\{NAMES_LIST_HTML\}\}/g, namesListHtml);
}

function writeFilterPage(opts) {
  const { pathSeg, title, description, intro, names, breadcrumbItems } = opts;
  const listItems = (names || []).map((n) => `<li><a href="/programmatic/names/${slug(n.name)}/">${htmlEscape(n.name)}</a> — ${htmlEscape((n.meaning || '').slice(0, 60))}${(n.meaning || '').length > 60 ? '…' : ''}</li>`).join('\n');
  const mainContent = applyFilterTemplate(title, intro, listItems);
  const breadcrumbNav = breadcrumbItems.map((item, i) => (i === breadcrumbItems.length - 1 ? `<span aria-current="page">${htmlEscape(item.name)}</span>` : `<a href="${item.url || item.path}">${htmlEscape(item.name)}</a>`)).join(' / ');

  const html = baseLayout({
    title: title + ' | nameorigin.io',
    description: description || intro,
    path: pathSeg,
    canonical: SITE_URL + pathSeg,
    breadcrumb: breadcrumbItems.map((i) => ({ name: i.name, url: i.url || SITE_URL + (i.path || '') })),
    breadcrumbHtml: breadcrumbNav,
    mainContent,
  });

  const outPath = path.join(PROGRAMMATIC_DIR, pathSeg.replace(/^\/programmatic\//, '').replace(/\/$/, ''), 'index.html');
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, html, 'utf8');
}

function run() {
  const names = loadJson('names');
  const countries = loadJson('countries');
  const base = { name: 'Home', url: SITE_URL + '/' };

  // /programmatic/names/
  writeFilterPage({
    pathSeg: '/programmatic/names/',
    title: 'All names',
    description: 'Browse all first names with meaning and origin.',
    intro: 'Browse first names with meaning, origin, and popularity.',
    names,
    breadcrumbItems: [base, { name: 'Names', url: SITE_URL + '/programmatic/names/' }],
  });

  // /programmatic/names/boy/, girl/, unisex/
  ['boy', 'girl', 'unisex'].forEach((gender) => {
    const subset = names.filter((n) => n.gender === gender);
    const label = gender.charAt(0).toUpperCase() + gender.slice(1);
    writeFilterPage({
      pathSeg: '/programmatic/names/' + gender + '/',
      title: label + ' names',
      description: `Browse ${gender} names with meaning and origin.`,
      intro: `${label} first names with meaning and origin.`,
      names: subset,
      breadcrumbItems: [base, { name: 'Names', url: SITE_URL + '/programmatic/names/' }, { name: label, url: SITE_URL + '/programmatic/names/' + gender + '/' }],
    });
  });

  // /programmatic/countries/[slug]/
  const countrySlugMap = { USA: 'usa', CAN: 'canada', IND: 'india', FRA: 'france', IRL: 'ireland' };
  countries.forEach((c) => {
    const cs = (c.code && countrySlugMap[c.code]) || slug(c.name);
    const subset = names.filter((n) => (n.origin_country || '').toLowerCase() === (c.name || '').toLowerCase() || (n.origin_country || '').toLowerCase() === (c.code || '').toLowerCase());
    const label = c.name || c.code;
    writeFilterPage({
      pathSeg: '/programmatic/countries/' + cs + '/',
      title: 'Names from ' + label,
      description: 'First names from ' + label + '.',
      intro: 'First names from ' + label + ' with meaning and origin.',
      names: subset.length ? subset : names,
      breadcrumbItems: [base, { name: 'Countries', url: SITE_URL + '/programmatic/countries/' }, { name: label, url: SITE_URL + '/programmatic/countries/' + cs + '/' }],
    });
  });

  // /programmatic/letters/[letter]/
  const letters = [...new Set(names.map((n) => (n.first_letter || n.name.charAt(0) || '').toLowerCase()).filter(Boolean))];
  letters.forEach((letter) => {
    const subset = names.filter((n) => (n.first_letter || n.name.charAt(0) || '').toLowerCase() === letter);
    const label = letter.toUpperCase();
    writeFilterPage({
      pathSeg: '/programmatic/letters/' + letter + '/',
      title: 'Names starting with ' + label,
      description: 'First names starting with ' + label + '.',
      intro: 'First names starting with ' + label + '.',
      names: subset,
      breadcrumbItems: [base, { name: 'Letters', url: SITE_URL + '/programmatic/letters/' }, { name: label, url: SITE_URL + '/programmatic/letters/' + letter + '/' }],
    });
  });

  console.log('Generated filter pages: names, countries, letters');
}

run();
