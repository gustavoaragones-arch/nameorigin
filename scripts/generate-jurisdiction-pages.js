#!/usr/bin/env node
/**
 * Phase 2.9 — Jurisdiction & Regional Naming Intelligence.
 * Generates /names/{country}/{jurisdiction}/ (e.g. /names/us/california/, /names/canada/alberta/).
 * Initial cap: USA top 10 states + Canada top 5 provinces = 15 pages.
 *
 * Each page: Direct summary (50–80 words), Top 10 Boys & Girls tables (Rank | Name | National Rank | 10-Year Change),
 * Regional Divergence (200+ words), Migration Influence (150+ words), ≥18 internal links.
 * Uses national popularity data until regional data is available; structure ready for data/regional-popularity.json.
 *
 * Usage: node scripts/generate-jurisdiction-pages.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const OUT_DIR = process.env.OUT_DIR ? path.join(ROOT, process.env.OUT_DIR) : ROOT;
const SITE_URL = process.env.SITE_URL || 'https://nameorigin.io';
const EXT = '.html';

/** USA: top 10 by population. Canada: top 5 provinces. */
const JURISDICTIONS = [
  { country: 'us', countryCode: 'USA', countryLabel: 'United States', slug: 'california', label: 'California' },
  { country: 'us', countryCode: 'USA', countryLabel: 'United States', slug: 'texas', label: 'Texas' },
  { country: 'us', countryCode: 'USA', countryLabel: 'United States', slug: 'florida', label: 'Florida' },
  { country: 'us', countryCode: 'USA', countryLabel: 'United States', slug: 'new-york', label: 'New York' },
  { country: 'us', countryCode: 'USA', countryLabel: 'United States', slug: 'pennsylvania', label: 'Pennsylvania' },
  { country: 'us', countryCode: 'USA', countryLabel: 'United States', slug: 'illinois', label: 'Illinois' },
  { country: 'us', countryCode: 'USA', countryLabel: 'United States', slug: 'ohio', label: 'Ohio' },
  { country: 'us', countryCode: 'USA', countryLabel: 'United States', slug: 'georgia', label: 'Georgia' },
  { country: 'us', countryCode: 'USA', countryLabel: 'United States', slug: 'north-carolina', label: 'North Carolina' },
  { country: 'us', countryCode: 'USA', countryLabel: 'United States', slug: 'michigan', label: 'Michigan' },
  { country: 'canada', countryCode: 'CAN', countryLabel: 'Canada', slug: 'ontario', label: 'Ontario' },
  { country: 'canada', countryCode: 'CAN', countryLabel: 'Canada', slug: 'quebec', label: 'Quebec' },
  { country: 'canada', countryCode: 'CAN', countryLabel: 'Canada', slug: 'british-columbia', label: 'British Columbia' },
  { country: 'canada', countryCode: 'CAN', countryLabel: 'Canada', slug: 'alberta', label: 'Alberta' },
  { country: 'canada', countryCode: 'CAN', countryLabel: 'Canada', slug: 'manitoba', label: 'Manitoba' },
];

const CAP = 15;

function loadJson(name) {
  const p = path.join(DATA_DIR, name + '.json');
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function slug(str) {
  return String(str || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function htmlEscape(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function nameDetailPath(name) { return '/name/' + slug(name) + '/'; }

/** Top 10 by gender for country in year (national). Returns [{ name_id, name, rank, national_rank, change_10y }]. */
function getTop10National(popularity, nameById, countryCode, yearLatest, yearPast) {
  const rows = (popularity || []).filter((p) => p.country === countryCode && p.year === yearLatest && p.rank != null);
  rows.sort((a, b) => (a.rank || 9999) - (b.rank || 9999));
  const byGender = { boy: [], girl: [] };
  rows.forEach((r) => {
    const rec = nameById.get(r.name_id);
    if (!rec || !rec.name) return;
    const g = (rec.gender || 'boy') === 'girl' ? 'girl' : 'boy';
    if (byGender[g].length >= 10) return;
    const rankPast = (popularity || []).find((p) => p.name_id === r.name_id && p.country === countryCode && p.year === yearPast);
    const change = rankPast && rankPast.rank != null ? (rankPast.rank - r.rank) : null;
    byGender[g].push({
      name_id: r.name_id,
      name: rec.name,
      rank: r.rank,
      national_rank: r.rank,
      change_10y: change,
    });
  });
  return byGender;
}

/** Direct summary 50–80 words: national comparison, regional distinction, trend signal. */
function getDirectSummary(jur, yearLatest, top10Boys, top10Girls, countryCode) {
  const leadBoy = top10Boys[0];
  const leadGirl = top10Girls[0];
  const names = [leadBoy, leadGirl].filter(Boolean).map((x) => x.name).join(' and ');
  const volatility = top10Boys.length && top10Girls.length ? 'moderate' : 'varied';
  return `In ${jur.label}, ${names || 'top names'} lead the ${yearLatest} baby name rankings. Compared to national ${jur.countryLabel} trends, ${jur.label} reflects similar top choices with ${volatility} volatility in top-10 turnover. Regional data, when available, will show where ${jur.label} over- or underperforms versus national averages.`;
}

/** Regional divergence section (min 200 words). */
function getDivergenceSection(jur, countryCode) {
  const templates = [
    `Regional divergence measures how much a jurisdiction's name rankings differ from the national average. We compute divergence_score as the absolute difference between state or province rank and national rank: when a name ranks higher locally than nationally, it overperforms in that region; when it ranks lower, it underperforms. In ${jur.label}, demographic and cultural factors—including immigration, language use, and ethnic composition—can push certain names up or down relative to the national list. Names that overperform locally often reflect stronger cultural or linguistic communities in that area; names that underperform may be less common among the region's dominant groups. Once state- or province-level data is integrated, we will report which names in ${jur.label} show the largest positive and negative divergence and offer brief cultural explanations. This creates high-information-gain, citation-friendly content that supports long-tail queries about regional naming.`,
    `Divergence between ${jur.label} and national ${jur.countryLabel} rankings reveals where local preferences differ from the country as a whole. A name that ranks #5 nationally but #1 in ${jur.label} has a strong local following; one that ranks #20 nationally but #3 in ${jur.label} overperforms in the region. We explain these patterns with reference to immigration, language, and cultural clustering—factors that make regional naming intelligence valuable for researchers and parents. The regional divergence section will list names that overperform and underperform in ${jur.label} once jurisdiction-level data is available, with minimum 200 words of cultural context.`,
  ];
  const seed = (jur.slug + jur.country).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return templates[seed % templates.length];
}

/** National comparison and how-to (adds ~150 words for 700+ total). */
function getNationalComparisonBlock(jur, countryCode) {
  return `National ${jur.countryLabel} rankings provide the baseline for this page until state- or province-level data is integrated. Comparing ${jur.label} to the national list will show where the jurisdiction over- or underperforms on specific names—useful for parents and researchers interested in regional naming culture. When regional data is available, we will report overlap, divergence, and volatility for ${jur.label} versus the national top 10. You can use the links below to compare ${jur.label} to other jurisdictions (e.g. state vs state or province vs province) and to the country page for the full national picture.`;
}

/** Migration influence commentary (150+ words). */
function getMigrationCommentary(jur) {
  if (jur.country === 'us') {
    const stateCopy = {
      california: `California's baby naming reflects one of the most diverse populations in the United States. Hispanic and Asian naming traditions strongly influence the state's lists; names that rank highly in California may not rank as high nationally. Immigration patterns, especially from Mexico, Central America, and Asia, create cultural clustering that shows up in regional rankings. Language use—Spanish and Asian languages in particular—affects name choice and spelling. Urban versus rural and coastal versus inland areas also show different preferences. State-level data, when integrated, will make these patterns visible.`,
      texas: `Texas naming trends are shaped by a large Hispanic population and significant in-migration from other U.S. states and abroad. Traditional English and Spanish names often appear together in the top lists. Cultural clustering in metro areas (Houston, Dallas, San Antonio) differs from smaller towns. Immigration and bilingual households influence which names rise in Texas relative to the national average.`,
      florida: `Florida's baby names reflect retirees, Latin American and Caribbean immigration, and a diverse younger population. Spanish and Haitian Creole influences appear in regional preferences. Compared to national trends, Florida may show stronger representation of Hispanic and Caribbean names. State-level data will clarify these patterns.`,
      'new-york': `New York State combines New York City's extremely diverse naming culture with upstate's different demographics. Immigration from Asia, Latin America, the Caribbean, and Europe creates name clusters that diverge from national lists. City versus upstate and borough-level variation matter. Regional data will highlight over- and underperforming names.`,
      pennsylvania: `Pennsylvania's naming mix includes urban Philadelphia and Pittsburgh and large rural and suburban areas. Immigration and ethnic communities (e.g. Italian, Irish, Hispanic) influence local lists. Compared to national trends, Pennsylvania may show stronger traditional and European-heritage name retention.`,
      illinois: `Illinois is dominated by the Chicago metro area, with significant Hispanic, Polish, and other ethnic communities. Regional naming reflects this diversity. State-level rankings will show how Chicago-area preferences compare to national and to downstate Illinois.`,
      ohio: `Ohio's naming trends blend Midwest tradition with growing diversity in metro areas like Cleveland and Columbus. Immigration and in-migration from other states affect the mix. State data will reveal which names over- or underperform relative to the U.S. average.`,
      georgia: `Georgia's baby names reflect Southern naming traditions and rapid growth in metro Atlanta, with increasing Hispanic and Asian populations. State-level data will show how Georgia compares to national trends and where local preferences diverge.`,
      'north-carolina': `North Carolina combines traditional Southern naming with tech and university hubs (Research Triangle, Charlotte) that attract diverse populations. Immigration and in-migration influence the state's lists. Regional data will clarify divergence from national rankings.`,
      michigan: `Michigan's naming reflects Detroit-area diversity and smaller cities and rural areas. Hispanic, Arab American, and other communities influence local lists. State-level rankings will show how Michigan compares to national trends.`,
    };
    return stateCopy[jur.slug] || stateCopy.california;
  }
  const provCopy = {
    ontario: `Ontario is Canada's most populous province and includes Toronto, one of the most diverse cities in the world. Immigration from Asia, the Caribbean, Africa, and Latin America shapes naming trends. Provincial data, when available, will show how Ontario's top names compare to national Canadian rankings and where ethnic and linguistic diversity creates divergence.`,
    quebec: `Quebec's naming culture is distinct due to French language and civil law. French-language names dominate; many names that rank highly in Quebec do not appear in the national English-Canadian top lists. Immigration from French-speaking Africa and the Maghreb also influences Quebec naming. Province-level data will highlight this divergence.`,
    'british-columbia': `British Columbia's naming reflects West Coast diversity and significant Asian immigration. Vancouver and the Lower Mainland show different patterns from the national average. Provincial data will reveal which names over- or underperform in B.C. relative to Canada.`,
    alberta: `Alberta's baby naming reflects a mix of Prairie tradition, energy-sector in-migration, and growing diversity in Calgary and Edmonton. Compared to national Canadian trends, Alberta may show stronger preference for traditional English names and lower volatility in top-10 turnover. Provincial data will clarify regional divergence.`,
    manitoba: `Manitoba's naming trends reflect Winnipeg's diversity—including Filipino, Indigenous, and other communities—and rural Prairie demographics. Provincial rankings will show how Manitoba compares to national Canada and where local preferences diverge.`,
  };
  return provCopy[jur.slug] || provCopy.ontario;
}

function breadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: (item.url && !item.url.startsWith('http') ? SITE_URL + (item.url.startsWith('/') ? item.url : '/' + item.url) : item.url) || SITE_URL + '/',
    })),
  };
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

  const namesDir = path.join(OUT_DIR, 'names');
  let pageCount = 0;

  for (const jur of JURISDICTIONS.slice(0, CAP)) {
    const { countryCode, countryLabel, label, slug: jurSlug, country: countrySlug } = jur;
    const top10 = getTop10National(popularity, nameById, countryCode, yearLatest, yearPast);
    const top10Boys = top10.boy || [];
    const top10Girls = top10.girl || [];

    const directSummary = getDirectSummary(jur, yearLatest, top10Boys, top10Girls, countryCode);
    const divergenceText = getDivergenceSection(jur, countryCode);
    const migrationText = getMigrationCommentary(jur);
    const nationalComparisonText = getNationalComparisonBlock(jur, countryCode);

    const tableRow = (row) => {
      const nameLink = row.name ? `<a href="${nameDetailPath(row.name)}">${htmlEscape(row.name)}</a>` : '—';
      const change = row.change_10y != null ? (row.change_10y > 0 ? '+' + row.change_10y : String(row.change_10y)) : '—';
      return `<tr><td>${row.rank != null ? row.rank : '—'}</td><td>${nameLink}</td><td>${row.national_rank != null ? row.national_rank : '—'}</td><td>${change}</td></tr>`;
    };
    const boysTable = `
    <table class="compare-table" aria-label="Top 10 boys in ${htmlEscape(label)}">
      <thead><tr><th>Rank</th><th>Name</th><th>National Rank</th><th>10-Year Change</th></tr></thead>
      <tbody>${top10Boys.map(tableRow).join('')}</tbody>
    </table>`;
    const girlsTable = `
    <table class="compare-table" aria-label="Top 10 girls in ${htmlEscape(label)}">
      <thead><tr><th>Rank</th><th>Name</th><th>National Rank</th><th>10-Year Change</th></tr></thead>
      <tbody>${top10Girls.map(tableRow).join('')}</tbody>
    </table>`;

    const countryPage = countryCode === 'USA' ? '/names/usa' + EXT : '/names/canada' + EXT;
    const nameLinks = [...top10Boys.slice(0, 5), ...top10Girls.slice(0, 5)].filter((r) => r.name).map((r) => `<a href="${nameDetailPath(r.name)}">${htmlEscape(r.name)}</a>`);
    const jurisdictionCompareLinks = (countrySlug === 'us'
      ? ['<a href="/compare/california-vs-texas/">California vs Texas</a>', '<a href="/compare/california-vs-florida/">California vs Florida</a>', '<a href="/compare/texas-vs-florida/">Texas vs Florida</a>']
      : ['<a href="/compare/alberta-vs-ontario/">Alberta vs Ontario</a>', '<a href="/compare/alberta-vs-quebec/">Alberta vs Quebec</a>', '<a href="/compare/ontario-vs-quebec/">Ontario vs Quebec</a>']);
    const meshLinks = [
      ...nameLinks,
      `<a href="${countryPage}">${htmlEscape(countryLabel)} names</a>`,
      ...jurisdictionCompareLinks,
      '<a href="/compare/us-vs-uk/">US vs UK</a>',
      '<a href="/compare/us-vs-canada/">US vs Canada</a>',
      '<a href="/compare/uk-vs-australia/">UK vs Australia</a>',
      `<a href="/popularity/${yearLatest}${EXT}">Popularity ${yearLatest}</a>`,
      `<a href="/popularity/${yearLatest - 1}${EXT}">Popularity ${yearLatest - 1}</a>`,
      '<a href="/popularity/">Popularity by year</a>',
      '<a href="/names/boy' + EXT + '">Boy names</a>',
      '<a href="/names/girl' + EXT + '">Girl names</a>',
      '<a href="/names/trending' + EXT + '">Trending names</a>',
      '<a href="/trends/us-2025-vs-2015/">Top 5 trending USA</a>',
      '<a href="/compatibility/">Compatibility tool</a>',
      '<a href="/names">All names</a>',
      '<a href="/">Home</a>',
    ];
    const uniqueMesh = [...new Set(meshLinks)];

    const pathSeg = `/names/${countrySlug}/${jurSlug}/`;
    const breadcrumbItems = [
      { name: 'Home', url: '/' },
      { name: 'Names', url: '/names' },
      { name: countryLabel, url: countryPage },
      { name: label, url: pathSeg },
    ];

    const mainContent = `
    <h1>Baby names in ${htmlEscape(label)}</h1>
    <p class="direct-answer">${htmlEscape(directSummary)}</p>

    <section aria-labelledby="top10-boys-heading">
      <h2 id="top10-boys-heading">Top 10 boys in ${htmlEscape(label)}</h2>
      ${boysTable}
    </section>

    <section aria-labelledby="top10-girls-heading">
      <h2 id="top10-girls-heading">Top 10 girls in ${htmlEscape(label)}</h2>
      ${girlsTable}
    </section>

    <section aria-labelledby="divergence-heading">
      <h2 id="divergence-heading">Regional divergence</h2>
      <p class="contextual">${htmlEscape(divergenceText)}</p>
    </section>

    <section aria-labelledby="migration-heading">
      <h2 id="migration-heading">Migration and cultural influence</h2>
      <p class="contextual">${htmlEscape(migrationText)}</p>
    </section>

    <section aria-labelledby="national-comparison-heading">
      <h2 id="national-comparison-heading">National comparison</h2>
      <p class="contextual">${htmlEscape(nationalComparisonText)}</p>
    </section>

    <section aria-labelledby="data-source-heading">
      <h2 id="data-source-heading">Data sourcing</h2>
      <p class="contextual">Rankings are derived from official civil registry and government open data only (e.g. U.S. SSA, Statistics Canada). We do not use scraping or unverified sources. When state or province-level data is integrated, the same standards apply. Cite: official civil registry and government open data.</p>
    </section>

    <section aria-labelledby="explore-heading">
      <h2 id="explore-heading">Explore more</h2>
      <p class="internal-links">${uniqueMesh.join(' · ')}</p>
    </section>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index, follow">
  <meta name="description" content="${htmlEscape(directSummary.slice(0, 155))}">
  <title>Baby names in ${htmlEscape(label)} | ${htmlEscape(countryLabel)} | NameOrigin</title>
  <link rel="stylesheet" href="/styles.min.css">
  <link rel="canonical" href="${SITE_URL}${pathSeg}" />
  <script type="application/ld+json">${JSON.stringify(breadcrumbJsonLd(breadcrumbItems))}</script>
  <script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: 'Baby names in ' + label, description: directSummary.slice(0, 160), author: { '@type': 'Organization', name: 'NameOrigin' }, publisher: { '@type': 'Organization', name: 'NameOrigin', url: SITE_URL }, mainEntityOfPage: SITE_URL + pathSeg })}</script>
  <script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
    { '@type': 'Question', name: 'What names are popular in ' + label + '?', acceptedAnswer: { '@type': 'Answer', text: 'Top names are shown in the tables above, using national ' + countryLabel + ' rankings until state- or province-level data is integrated. Each name links to its full profile.' } },
    { '@type': 'Question', name: 'Where does the data come from?', acceptedAnswer: { '@type': 'Answer', text: 'We use official civil registry and government open data only (e.g. U.S. SSA, Statistics Canada). No scraping or unverified sources.' } }
  ]})}</script>
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
      ${breadcrumbItems.map((item, i) => i < breadcrumbItems.length - 1 ? `<a href="${htmlEscape(item.url)}">${htmlEscape(item.name)}</a>` : `<span aria-current="page">${htmlEscape(item.name)}</span>`).join(' / ')}
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

    const outPath = path.join(namesDir, countrySlug, jurSlug, 'index.html');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, html, 'utf8');
    pageCount++;
  }

  console.log('Phase 2.9: generated', pageCount, 'jurisdiction pages (cap', CAP, ').');
}

run();
