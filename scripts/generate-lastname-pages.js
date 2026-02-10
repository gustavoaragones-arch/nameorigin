#!/usr/bin/env node
/**
 * Phase 2 — Generate last-name compatibility pages under programmatic/last-names/[slug]/
 * "Names that go with Smith" — suggests first names (from data) for common surnames.
 */

const fs = require('fs');
const path = require('path');
const lib = require('./lib.js');

const { PROGRAMMATIC_DIR, SITE_URL, loadJson, slug, ensureDir, htmlEscape, readTemplate, baseLayout, breadcrumbHtml } = lib;

const COMMON_LAST_NAMES = ['smith', 'johnson', 'williams', 'garcia', 'nguyen', 'martinez', 'anderson', 'thomas', 'jackson', 'lee'];

function applyLastnameTemplate(lastName, intro, namesListHtml) {
  let tpl = readTemplate('last-name-page.html');
  if (!tpl) return `<h1>Names that go with ${htmlEscape(lastName)}</h1><p>${htmlEscape(intro)}</p><ul>${namesListHtml}</ul>`;
  return tpl
    .replace(/\{\{LAST_NAME\}\}/g, htmlEscape(lastName))
    .replace(/\{\{INTRO\}\}/g, htmlEscape(intro))
    .replace(/\{\{NAMES_LIST_HTML\}\}/g, namesListHtml);
}

function run() {
  const names = loadJson('names');
  const outBase = path.join(PROGRAMMATIC_DIR, 'last-names');
  ensureDir(outBase);

  const breadcrumbBase = [
    { name: 'Home', url: SITE_URL + '/' },
    { name: 'Last names', url: SITE_URL + '/programmatic/last-names/' },
  ];

  COMMON_LAST_NAMES.forEach((lastSlug) => {
    const lastName = lastSlug.charAt(0).toUpperCase() + lastSlug.slice(1);
    const pathSeg = '/programmatic/last-names/' + lastSlug + '/';
    const breadcrumbItems = [...breadcrumbBase, { name: lastName, url: SITE_URL + pathSeg }];

    const intro = 'First names that pair well with the last name ' + lastName + '. Browse by meaning and origin.';
    const listItems = names.map((n) => `<li><a href="/programmatic/names/${slug(n.name)}/">${htmlEscape(n.name)}</a></li>`).join('\n');
    const mainContent = applyLastnameTemplate(lastName, intro, listItems);
    const breadcrumbNav = breadcrumbItems.map((item, i) => (i === breadcrumbItems.length - 1 ? `<span aria-current="page">${htmlEscape(item.name)}</span>` : `<a href="${item.url}">${htmlEscape(item.name)}</a>`)).join(' / ');

    const html = baseLayout({
      title: 'Names that go with ' + lastName + ' | nameorigin.io',
      description: intro,
      path: pathSeg,
      canonical: SITE_URL + pathSeg,
      breadcrumb: breadcrumbItems,
      breadcrumbHtml: breadcrumbNav,
      mainContent,
    });

    const outPath = path.join(outBase, lastSlug, 'index.html');
    ensureDir(path.dirname(outPath));
    fs.writeFileSync(outPath, html, 'utf8');
  });

  console.log('Generated', COMMON_LAST_NAMES.length, 'last-name pages under programmatic/last-names/');
}

run();
