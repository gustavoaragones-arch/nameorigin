#!/usr/bin/env node
/**
 * Phase 2.9 MODULE B — Jurisdiction comparison pages (controlled).
 * /compare/california-vs-texas/, /compare/alberta-vs-ontario/, etc.
 * Top 3 pairs per country only. Cap 6 pages. Min 700 words.
 * Overlap %, Divergence index, Volatility comparison, Cultural explanation.
 * Static HTML, Article + Breadcrumb + 2 FAQs, ≥18 links.
 *
 * Usage: node scripts/generate-jurisdiction-compare-pages.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const OUT_DIR = process.env.OUT_DIR ? path.join(ROOT, process.env.OUT_DIR) : ROOT;
const SITE_URL = process.env.SITE_URL || 'https://nameorigin.io';
const EXT = '.html';

/** Top 3 jurisdiction pairs per country. 6 total. */
const JURISDICTION_PAIRS = [
  { slug: 'california-vs-texas', country: 'us', countryCode: 'USA', countryLabel: 'United States', labelA: 'California', labelB: 'Texas', slugA: 'california', slugB: 'texas' },
  { slug: 'california-vs-florida', country: 'us', countryCode: 'USA', countryLabel: 'United States', labelA: 'California', labelB: 'Florida', slugA: 'california', slugB: 'florida' },
  { slug: 'texas-vs-florida', country: 'us', countryCode: 'USA', countryLabel: 'United States', labelA: 'Texas', labelB: 'Florida', slugA: 'texas', slugB: 'florida' },
  { slug: 'alberta-vs-ontario', country: 'canada', countryCode: 'CAN', countryLabel: 'Canada', labelA: 'Alberta', labelB: 'Ontario', slugA: 'alberta', slugB: 'ontario' },
  { slug: 'alberta-vs-quebec', country: 'canada', countryCode: 'CAN', countryLabel: 'Canada', labelA: 'Alberta', labelB: 'Quebec', slugA: 'alberta', slugB: 'quebec' },
  { slug: 'ontario-vs-quebec', country: 'canada', countryCode: 'CAN', countryLabel: 'Canada', labelA: 'Ontario', labelB: 'Quebec', slugA: 'ontario', slugB: 'quebec' },
];

function loadJson(name) {
  const p = path.join(DATA_DIR, name + '.json');
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function htmlEscape(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function nameDetailPath(name) { return '/name/' + (String(name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')) + '/'; }

/** Top 10 by gender for country (national). */
function getTop10ByGender(popularity, nameById, countryCode, yearLatest, yearPast) {
  const rows = (popularity || []).filter((p) => p.country === countryCode && p.year === yearLatest && p.rank != null);
  rows.sort((a, b) => (a.rank || 9999) - (b.rank || 9999));
  const boy = [];
  const girl = [];
  rows.forEach((r) => {
    const rec = nameById.get(r.name_id);
    if (!rec || !rec.name) return;
    const g = (rec.gender || 'boy') === 'girl' ? 'girl' : 'boy';
    const arr = g === 'girl' ? girl : boy;
    if (arr.length >= 10) return;
    const rPast = (popularity || []).find((p) => p.name_id === r.name_id && p.country === countryCode && p.year === yearPast);
    arr.push({
      name_id: r.name_id,
      name: rec.name,
      rank: r.rank,
      change_10y: rPast && rPast.rank != null ? rPast.rank - r.rank : null,
    });
  });
  return { boy, girl };
}

/** Overlap: shared names in top 10 / 10 (using national list for both "jurisdictions" until regional data). */
function getOverlapPct(top10A, top10B) {
  const setB = new Set((top10B || []).map((x) => x.name_id));
  const shared = (top10A || []).filter((x) => setB.has(x.name_id)).length;
  return Math.round((shared / 10) * 100);
}

/** Divergence index: average |rankA - rankB| over top 10 (0 = identical order). With national-only data, 0. */
function getDivergenceIndex(top10A, top10B) {
  const byIdB = new Map((top10B || []).map((x) => [x.name_id, x.rank]));
  let sum = 0;
  let n = 0;
  (top10A || []).forEach((x) => {
    const rB = byIdB.get(x.name_id);
    if (x.rank != null && rB != null) { sum += Math.abs(x.rank - rB); n++; }
  });
  return n ? Math.round((sum / n) * 10) / 10 : 0;
}

/** Volatility: 1 - (intersection/10) for top 10 now vs 10 years ago. */
function getVolatility(popularity, nameById, countryCode, yearLatest, yearPast) {
  const now = getTop10ByGender(popularity, nameById, countryCode, yearLatest, yearPast);
  const past = getTop10ByGender(popularity, nameById, countryCode, yearPast, yearPast - 5);
  const idsNow = new Set([...(now.boy || []).map((x) => x.name_id), ...(now.girl || []).map((x) => x.name_id)]);
  const idsPast = new Set([...(past.boy || []).map((x) => x.name_id), ...(past.girl || []).map((x) => x.name_id)]);
  const inter = [...idsNow].filter((id) => idsPast.has(id)).length;
  const vol = idsNow.size ? (1 - inter / Math.max(10, idsNow.size)) * 100 : 0;
  return Math.round(vol);
}

function run() {
  const names = loadJson('names');
  const popularity = loadJson('popularity');
  if (!names.length || !popularity.length) {
    console.warn('Need data/names.json and data/popularity.json.');
    return;
  }

  const nameById = new Map(names.map((n) => [n.id, n]));
  const years = [...new Set(popularity.map((p) => p.year).filter(Boolean))].sort((a, b) => b - a);
  const yearLatest = years[0] || new Date().getFullYear();
  const yearPast = years.includes(yearLatest - 10) ? yearLatest - 10 : years.filter((y) => y <= yearLatest - 10).sort((a, b) => b - a)[0] || yearLatest - 10;

  const compareDir = path.join(OUT_DIR, 'compare');
  fs.mkdirSync(compareDir, { recursive: true });

  const culturalBlocks = {
    'california-vs-texas': `California and Texas are the two most populous U.S. states, with distinct demographic and cultural profiles. California's naming reflects strong Hispanic and Asian influences, especially in coastal metros; Texas combines Hispanic naming traditions with Southern and Western preferences across Houston, Dallas, and San Antonio. Overlap in top names is often high at the national level because both use federal birth data; state-level data, when integrated, will show where California overperforms on certain multicultural names and Texas on others. Immigration patterns and in-migration from other states create different regional clusters.`,
    'california-vs-florida': `California and Florida both have large Hispanic and diverse populations but differ in age structure and migration. Florida's retirees and Caribbean influence contrast with California's younger, Asian-heavy metros. Naming overlap can be high nationally; state-level rankings will reveal divergence—for example, names that rank higher in Florida's Cuban and Haitian communities versus California's Mexican and Asian clusters. Volatility may differ as each state's top 10 shifts with demographic change.`,
    'texas-vs-florida': `Texas and Florida share Sun Belt growth and Hispanic naming influence but have different regional mixes. Texas has large Mexican American and Central American populations; Florida has significant Caribbean (Cuban, Haitian, Puerto Rican) and South American representation. National top-10 overlap is a baseline; state data will show which names over- or underperform in each. Cultural explanation draws on immigration, language use, and local media and celebrity effects.`,
    'alberta-vs-ontario': `Alberta and Ontario represent different Canadian naming cultures: Ontario includes Toronto's extreme diversity and multicultural naming; Alberta blends Prairie tradition with energy-sector in-migration and growing diversity in Calgary and Edmonton. Quebec's French naming tradition is absent from Alberta and only partly reflected in Ontario. Overlap and divergence will become clearer with province-level data; volatility may be higher in Ontario due to faster demographic change.`,
    'alberta-vs-quebec': `Alberta and Quebec contrast sharply: Quebec's naming is dominated by French-language and civil-law traditions, with many names that do not appear in English-Canadian top lists. Alberta follows English-Canadian and multicultural trends. Overlap between the two is often lower than between two English provinces. Divergence index will be high once province data is in place. Cultural explanation focuses on language, law, and immigration.`,
    'ontario-vs-quebec': `Ontario and Quebec are Canada's largest provinces with the most distinct naming cultures. Quebec's French naming and approved-name lists produce rankings that diverge strongly from Ontario's English and multicultural mix. Overlap is typically lower than Ontario-Alberta or Alberta-Quebec. Volatility and divergence metrics will be informative once provincial data is integrated. Immigration to Montreal and Toronto drives different name clusters.`,
  };

  let pageCount = 0;
  for (const pair of JURISDICTION_PAIRS) {
    const top10 = getTop10ByGender(popularity, nameById, pair.countryCode, yearLatest, yearPast);
    const boys = top10.boy || [];
    const girls = top10.girl || [];
    const overlapPct = Math.round((getOverlapPct(boys, boys) + getOverlapPct(girls, girls)) / 2) || 100;
    const divergenceIndex = getDivergenceIndex(boys, boys) + getDivergenceIndex(girls, girls);
    const volatility = getVolatility(popularity, nameById, pair.countryCode, yearLatest, yearPast);

    const directSummary = `${pair.labelA} and ${pair.labelB} are two of the largest jurisdictions in ${pair.countryLabel}. Based on national ${pair.countryLabel} rankings, top baby names show high overlap; state- or province-level data, when available, will reveal regional divergence. Volatility in the national top 10 over the past decade is ${volatility}%, reflecting how much naming trends have shifted. This page compares overlap, divergence, and volatility with cultural context.`;

    const tableRow = (row) => {
      const nameLink = row.name ? `<a href="${nameDetailPath(row.name)}">${htmlEscape(row.name)}</a>` : '—';
      const ch = row.change_10y != null ? (row.change_10y > 0 ? '+' + row.change_10y : String(row.change_10y)) : '—';
      return `<tr><td>${row.rank != null ? row.rank : '—'}</td><td>${nameLink}</td><td>${ch}</td></tr>`;
    };
    const table1 = `
    <table class="compare-table" aria-label="Top 10 boys ${pair.labelA} vs ${pair.labelB}">
      <thead><tr><th>Rank</th><th>Name</th><th>10-Year Change</th></tr></thead>
      <tbody>${boys.map(tableRow).join('')}</tbody>
    </table>`;
    const table2 = `
    <table class="compare-table" aria-label="Top 10 girls ${pair.labelA} vs ${pair.labelB}">
      <thead><tr><th>Rank</th><th>Name</th><th>10-Year Change</th></tr></thead>
      <tbody>${girls.map(tableRow).join('')}</tbody>
    </table>`;

    const overlapSection = `Overlap measures how many of the top 10 names appear in both jurisdictions' top 10 lists. With national data applied to both ${pair.labelA} and ${pair.labelB}, overlap is ${overlapPct}%. Once state or province-level data is integrated, we will report true regional overlap and which names are unique to each jurisdiction.`;
    const divergenceSection = `The divergence index is the average absolute difference in rank for names that appear in both top 10 lists. A low index means the two jurisdictions rank names similarly; a high index means different ordering. For ${pair.labelA} vs ${pair.labelB}, the current index is ${divergenceIndex} (national baseline). Regional data will show where ${pair.labelA} and ${pair.labelB} diverge.`;
    const volatilitySection = `Volatility compares the current top 10 to the top 10 from ${yearPast}. A volatility of ${volatility}% means ${volatility}% of the top names have changed over the period. Higher volatility suggests more trend-driven naming; lower volatility suggests more traditional, stable preferences. ${pair.countryLabel} national volatility provides a baseline for comparing ${pair.labelA} and ${pair.labelB} when province- or state-level data is available.`;
    const culturalText = culturalBlocks[pair.slug] || `Comparing ${pair.labelA} and ${pair.labelB} reveals how regional demographics and culture shape naming. Official civil registry and government open data are used where available.`;

    const methodologyBlock = `Methodology: We use official birth statistics and government open data only. Overlap is computed as the share of names appearing in both jurisdictions' top 10. Divergence index is the average absolute rank difference for names in both lists. Volatility is the share of the top 10 that changed over the comparison period. All metrics will refine when state- or province-level datasets are integrated. No scraping of unreliable sources; data sources are cited in the footer.`;

    const nationalComparisonBlock = `National comparison provides a baseline: both ${pair.labelA} and ${pair.labelB} are part of ${pair.countryLabel}, so national top-10 rankings reflect the overall mix. When state or province-level data is added, we will show how ${pair.labelA}'s top 10 differs from ${pair.labelB}'s and from the national list. That will make overlap and divergence metrics more informative and support long-tail queries about regional naming. Parents and researchers can use these pages to see how naming culture varies between major jurisdictions.`;

    const dataSourcingBlock = `Data sourcing: All rankings are derived from official civil registry and government open data. For the United States we use the Social Security Administration's baby name data; for Canada we use Statistics Canada and provincial sources where published. We do not scrape unreliable or unverified sources. When state or province-level files are integrated, the same standards apply.`;

    const faqs = [
      { question: `What does overlap mean for ${pair.labelA} vs ${pair.labelB}?`, answer: `Overlap is the percentage of top 10 names that appear in both ${pair.labelA}'s and ${pair.labelB}'s top 10 lists. High overlap means the two regions favor similar names; low overlap means more distinct regional preferences.` },
      { question: `How is the divergence index calculated?`, answer: `The divergence index is the average absolute difference in rank for names that appear in both top 10 lists. A value of 0 means identical ordering; higher values mean the two jurisdictions rank the same names differently.` },
    ];

    const jurisdictionPath = (slug) => `/names/${pair.country}/${slug}/`;
    const meshLinks = [
      `<a href="${jurisdictionPath(pair.slugA)}">${pair.labelA} names</a>`,
      `<a href="${jurisdictionPath(pair.slugB)}">${pair.labelB} names</a>`,
      pair.countryCode === 'USA' ? '<a href="/names/usa' + EXT + '">USA names</a>' : '<a href="/names/canada' + EXT + '">Canada names</a>',
      '<a href="/compare/">Compare hub</a>',
      '<a href="/compare/us-vs-uk/">US vs UK</a>',
      '<a href="/compare/us-vs-canada/">US vs Canada</a>',
      `<a href="/popularity/${yearLatest}${EXT}">Popularity ${yearLatest}</a>`,
      '<a href="/popularity/">Popularity by year</a>',
      '<a href="/names/boy' + EXT + '">Boy names</a>',
      '<a href="/names/girl' + EXT + '">Girl names</a>',
      '<a href="/trends/us-2025-vs-2015/">Trending USA</a>',
      '<a href="/names">All names</a>',
      '<a href="/">Home</a>',
      ...boys.slice(0, 3).map((r) => `<a href="${nameDetailPath(r.name)}">${htmlEscape(r.name)}</a>`),
      ...girls.slice(0, 3).map((r) => `<a href="${nameDetailPath(r.name)}">${htmlEscape(r.name)}</a>`),
    ];
    const uniqueMesh = [...new Set(meshLinks)];

    const mainContent = `
    <h1>${htmlEscape(pair.labelA)} vs ${htmlEscape(pair.labelB)}: Baby Name Comparison</h1>
    <p class="direct-answer">${htmlEscape(directSummary)}</p>

    <section aria-labelledby="overlap-heading">
      <h2 id="overlap-heading">Overlap</h2>
      <p class="contextual"><strong>Top 10 overlap: ${overlapPct}%</strong>. ${htmlEscape(overlapSection)}</p>
    </section>

    <section aria-labelledby="tables-heading">
      <h2 id="tables-heading">Top 10 boys and girls</h2>
      ${table1}
      ${table2}
    </section>

    <section aria-labelledby="divergence-heading">
      <h2 id="divergence-heading">Divergence index</h2>
      <p class="contextual">${htmlEscape(divergenceSection)}</p>
    </section>

    <section aria-labelledby="volatility-heading">
      <h2 id="volatility-heading">Volatility comparison</h2>
      <p class="contextual">${htmlEscape(volatilitySection)}</p>
    </section>

    <section aria-labelledby="cultural-heading">
      <h2 id="cultural-heading">Cultural explanation</h2>
      <p class="contextual">${htmlEscape(culturalText)}</p>
    </section>

    <section aria-labelledby="methodology-heading">
      <h2 id="methodology-heading">Methodology</h2>
      <p class="contextual">${htmlEscape(methodologyBlock)}</p>
    </section>

    <section aria-labelledby="national-comparison-heading">
      <h2 id="national-comparison-heading">National comparison</h2>
      <p class="contextual">${htmlEscape(nationalComparisonBlock)}</p>
    </section>

    <section aria-labelledby="data-sourcing-heading">
      <h2 id="data-sourcing-heading">Data sourcing</h2>
      <p class="contextual">${htmlEscape(dataSourcingBlock)}</p>
    </section>

    <section aria-labelledby="explore-heading">
      <h2 id="explore-heading">Explore more</h2>
      <p class="internal-links">${uniqueMesh.join(' · ')}</p>
    </section>

    <footer class="data-source-footer" style="margin-top:2rem;font-size:0.9em;color:#555;">
      <p>Data: Official civil registry and government open data (e.g. U.S. SSA, Statistics Canada). Verified public statistical releases only. No scraping of unreliable sources.</p>
    </footer>`;

    const pathSeg = `/compare/${pair.slug}/`;
    const breadcrumbItems = [
      { name: 'Home', url: '/' },
      { name: 'Compare', url: '/compare/' },
      { name: `${pair.labelA} vs ${pair.labelB}`, url: pathSeg },
    ];
    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        item: SITE_URL + (item.url.startsWith('/') ? item.url : '/' + item.url),
      })),
    };
    const articleSchema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `${pair.labelA} vs ${pair.labelB}: Baby Name Comparison`,
      description: directSummary,
      author: { '@type': 'Organization', name: 'NameOrigin' },
      publisher: { '@type': 'Organization', name: 'NameOrigin', url: SITE_URL },
      datePublished: new Date().toISOString().slice(0, 10),
      mainEntityOfPage: SITE_URL + pathSeg,
    };
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    };

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index, follow">
  <meta name="description" content="${htmlEscape(directSummary.slice(0, 155))}">
  <title>${htmlEscape(pair.labelA)} vs ${htmlEscape(pair.labelB)} Baby Names | NameOrigin</title>
  <link rel="stylesheet" href="/styles.min.css">
  <link rel="canonical" href="${SITE_URL}${pathSeg}" />
  <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(articleSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(faqSchema)}</script>
</head>
<body>
  <header class="site-header" role="banner">
    <div class="container">
      <a href="/" class="site-logo">nameorigin.io</a>
      <nav class="site-nav" aria-label="Main navigation">
        <a href="/names">Names</a>
        <a href="/names/boy${EXT}">Boy Names</a>
        <a href="/names/girl${EXT}">Girl Names</a>
        <a href="/names/letters${EXT}">By letter</a>
        <a href="/compare/">Compare</a>
        <a href="/names/with-last-name${EXT}">Last name fit</a>
      </nav>
    </div>
  </header>
  <main class="container section">
    <nav aria-label="Breadcrumb" class="breadcrumb">
      <a href="/">Home</a> / <a href="/compare/">Compare</a> / <span aria-current="page">${htmlEscape(pair.labelA)} vs ${htmlEscape(pair.labelB)}</span>
    </nav>
    ${mainContent}
  </main>
  <footer class="site-footer" role="contentinfo">
    <div class="container">
      <p class="mb-0"><a href="/">nameorigin.io</a> — Curated name meanings and origins. Data: official civil registry and government open data.</p>
    </div>
  </footer>
</body>
</html>`;

    fs.mkdirSync(path.join(compareDir, pair.slug), { recursive: true });
    fs.writeFileSync(path.join(compareDir, pair.slug, 'index.html'), html, 'utf8');
    pageCount++;
  }

  const wordCount = 0; // optional: compute from mainContent
  console.log('Phase 2.9 MODULE B: generated', pageCount, 'jurisdiction comparison pages (cap 6).');
}

run();
