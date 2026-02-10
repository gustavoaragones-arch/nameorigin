#!/usr/bin/env node
/**
 * Phase 2 — Generate individual name pages under programmatic/names/[slug]/
 * Semantic HTML, canonical, breadcrumb JSON-LD, Person schema, internal links.
 */

const fs = require('fs');
const path = require('path');
const lib = require('./lib.js');

const { PROGRAMMATIC_DIR, SITE_URL, loadJson, slug, ensureDir, htmlEscape, readTemplate, baseLayout, breadcrumbJsonLd, breadcrumbHtml, personJsonLd, originBadgeHtml, internalLinksForName } = lib;

function applyNameTemplate(record, names, popularity) {
  let tpl = readTemplate('name-page.html');
  if (!tpl) tpl = '<h1>{{NAME}}</h1>{{ORIGIN_BADGE}}<p><strong>Meaning:</strong> {{MEANING}}</p><p><strong>Origin:</strong> {{ORIGIN}}</p><p><strong>Gender:</strong> {{GENDER}}</p>{{PHONETIC}}{{POPULARITY_HTML}}<h2>Related names</h2><p>{{RELATED_LINKS_HTML}}</p>';

  const pop = (popularity || []).filter((p) => p.name_id === record.id).sort((a, b) => (b.year || 0) - (a.year || 0));
  const popHtml = pop.length
    ? '<h3 id="popularity-heading">Popularity</h3><ul>' + pop.map((p) => `<li>${htmlEscape(p.country)} (${p.year}): rank ${p.rank || '—'}</li>`).join('') + '</ul>'
    : '';

  const links = internalLinksForName(record, names, 20);
  const relatedHtml = links.map((l) => `<a href="${l.href}">${htmlEscape(l.text)}</a>`).join(' · ');

  return tpl
    .replace(/\{\{NAME\}\}/g, htmlEscape(record.name))
    .replace(/\{\{ORIGIN_BADGE\}\}/g, originBadgeHtml(record))
    .replace(/\{\{MEANING\}\}/g, htmlEscape(record.meaning || '—'))
    .replace(/\{\{ORIGIN\}\}/g, htmlEscape([record.origin_country, record.language].filter(Boolean).join(' · ') || '—'))
    .replace(/\{\{GENDER\}\}/g, htmlEscape(record.gender || '—'))
    .replace(/\{\{PHONETIC\}\}/g, record.phonetic ? `<p><strong>Pronunciation:</strong> ${htmlEscape(record.phonetic)}</p>` : '')
    .replace(/\{\{POPULARITY_HTML\}\}/g, popHtml)
    .replace(/\{\{RELATED_LINKS_HTML\}\}/g, relatedHtml);
}

function run() {
  const names = loadJson('names');
  const popularity = loadJson('popularity');
  const outBase = path.join(PROGRAMMATIC_DIR, 'names');
  ensureDir(outBase);

  const breadcrumbBase = [
    { name: 'Home', url: SITE_URL + '/' },
    { name: 'Names', url: SITE_URL + '/programmatic/names/' },
  ];

  names.forEach((record) => {
    const nameSlug = slug(record.name);
    const pathSeg = '/programmatic/names/' + nameSlug + '/';
    const breadcrumbItems = [...breadcrumbBase, { name: record.name, url: SITE_URL + pathSeg }];

    const mainContent = applyNameTemplate(record, names, popularity);
    const breadcrumbNav = breadcrumbHtml(
      breadcrumbItems.map((item, i) => ({
        name: item.name,
        url: item.url,
        path: i === breadcrumbItems.length - 1 ? null : (item.url || '').replace(SITE_URL, ''),
      }))
    );

    const html = baseLayout({
      title: record.name + ' — Meaning & Origin | nameorigin.io',
      description: (record.meaning || 'Meaning and origin of the name ') + record.name + '.',
      path: pathSeg,
      canonical: SITE_URL + pathSeg,
      breadcrumb: breadcrumbItems,
      breadcrumbHtml: breadcrumbNav,
      mainContent,
      extraSchema: personJsonLd(record),
    });

    const outPath = path.join(outBase, nameSlug, 'index.html');
    ensureDir(path.dirname(outPath));
    fs.writeFileSync(outPath, html, 'utf8');
  });

  console.log('Generated', names.length, 'name pages under programmatic/names/');
}

run();
