#!/usr/bin/env node
/**
 * Popularity page cluster: /popularity/index.html and /popularity/2022.html, 2023.html, 2024.html
 * Always generates index + 2022.html, 2023.html, 2024.html (2024 uses latest data if not yet available).
 * Index: H1 Baby Name Popularity Trends, overview, links to years, top 20 trending, ≥25 links, ≥600 words.
 * Year pages: H1 Most Popular Baby Names in [Year], top 50 names linked, intro/closing, ≥800 words, ≥40 links.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const OUT_DIR = process.env.OUT_DIR ? path.join(ROOT, process.env.OUT_DIR) : ROOT;
const SITE_URL = process.env.SITE_URL || 'https://nameorigin.io';
const EXT = '.html';

const ALLOWED_YEARS = [2022, 2023, 2024];

function loadJson(name) {
  const p = path.join(DATA_DIR, name + '.json');
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function slug(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function nameDetailPath(name) {
  return '/name/' + slug(name) + '/';
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
    return { '@type': 'ListItem', position: i + 1, name: item.name, item: url };
  });
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: list };
}

function breadcrumbHtml(items) {
  const links = items.map((item, i) => {
    const isLast = i === items.length - 1;
    if (isLast) return `<span aria-current="page">${htmlEscape(item.name)}</span>`;
    return `<a href="${htmlEscape(item.url)}">${htmlEscape(item.name)}</a>`;
  });
  return '<nav aria-label="Breadcrumb" class="breadcrumb">' + links.join(' / ') + '</nav>';
}

function baseLayout(opts) {
  const title = opts.title || 'Name Origin';
  const description = opts.description || 'Discover the meaning and origin of first names.';
  const pathSeg = opts.path || '/';
  const canonical = opts.canonical != null ? opts.canonical : SITE_URL + pathSeg;
  const breadcrumbItems = opts.breadcrumb && opts.breadcrumb.length ? opts.breadcrumb : [{ name: 'Home', url: SITE_URL + '/' }, { name: title.replace(/\s*\|\s*NameOrigin\s*$/i, '').trim() || 'Names', url: SITE_URL + pathSeg }];
  const breadcrumbSchema = JSON.stringify(breadcrumbJsonLd(breadcrumbItems));
  const extraSchemaHtml = opts.extraSchema
    ? (Array.isArray(opts.extraSchema) ? opts.extraSchema : [opts.extraSchema]).filter(Boolean).map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n  ')
    : '';
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
        <a href="/popularity/">Popularity</a>
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
        <p class="mb-0">© 2026 nameorigin.io. All rights reserved.<br>
nameorigin.io is owned and operated by Albor Digital LLC, an independent product studio based in Wyoming, USA.</p>
      </div>
    </div>
  </footer>
</body>
</html>`;
}

/** Which years have USA popularity data */
function yearsWithData(popularity) {
  const yearsPresent = new Set();
  (popularity || []).filter((p) => p.country === 'USA' && p.year != null && p.rank != null).forEach((p) => yearsPresent.add(p.year));
  return ALLOWED_YEARS.filter((y) => yearsPresent.has(y));
}

/** Latest year present in USA data, or 2023 as fallback */
function latestYearInData(popularity) {
  const years = (popularity || []).filter((p) => p.country === 'USA' && p.year != null).map((p) => p.year);
  return years.length ? Math.max(...years) : 2023;
}

/** USA data by year: year -> array of { name_id, rank } */
function usaByYear(popularity) {
  const byYear = new Map();
  (popularity || []).filter((p) => p.country === 'USA' && p.year != null && p.rank != null).forEach((p) => {
    if (!byYear.has(p.year)) byYear.set(p.year, []);
    byYear.get(p.year).push(p);
  });
  return byYear;
}

/** Best rank per name_id in a year (lowest rank = best) */
function bestRankById(entries) {
  const map = new Map();
  (entries || []).forEach((p) => {
    if (!map.has(p.name_id) || (p.rank != null && p.rank < map.get(p.name_id))) map.set(p.name_id, p.rank);
  });
  return map;
}

/** Top N names by rank (combined boy+girl), returning name objects */
function topNamesByRank(yearEntries, nameById, n) {
  const rankById = bestRankById(yearEntries);
  const withRank = [];
  rankById.forEach((rank, id) => {
    const name = nameById.get(Number(id)) || nameById.get(id);
    if (name) withRank.push({ name, rank });
  });
  return withRank.sort((a, b) => a.rank - b.rank).slice(0, n).map((r) => r.name);
}

function generateIndexPage(names, popularity, nameById) {
  const byYear = usaByYear(popularity);
  const latestDataYear = latestYearInData(popularity);
  const currentYear = Math.min(2024, latestDataYear);
  const currentYearData = byYear.get(currentYear) || byYear.get(latestDataYear) || [];
  const top20 = topNamesByRank(currentYearData, nameById, 20);
  const nameLink = (n) => n ? `<a href="${nameDetailPath(n.name)}">${htmlEscape(n.name)}</a>` : '';
  const yearLinks = ALLOWED_YEARS.map((y) => `<a href="/popularity/${y}${EXT}">${y}</a>`).join(', ');

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL + '/' },
    { name: 'Baby Names', url: SITE_URL + '/names' },
    { name: 'Baby Name Popularity Trends', url: SITE_URL + '/popularity/' },
  ];
  const breadcrumbItemsRelative = breadcrumbItems.map((i) => ({ ...i, url: i.url.replace(SITE_URL, '') }));

  const mainContent = `
    <h1>Baby Name Popularity Trends</h1>
    <p class="contextual">Baby name popularity refers to how often a given name is chosen for newborns in a defined period and region. In the United States, rankings are based on official birth records: agencies such as the Social Security Administration publish annual counts of names given to babies, and names are ordered by total number of births. The name given to the most babies in a year ranks first; the rest follow in descending order. These rankings are factual counts, not surveys or estimates, and they reflect actual naming choices by parents.</p>
    <p class="contextual">Trends shift over time because naming is influenced by culture, media, and generational cycles. A name that was rare a decade ago can rise quickly if it appears in popular culture or gains visibility through migration and demographic change. Conversely, names that dominated in one generation often decline as new cohorts prefer different sounds or associations. Regional variation matters too: a name that ranks high nationally may be less common in certain states or communities, and international rankings (for example in the UK, Canada, or Australia) often differ from U.S. lists. Generational cycles also play a role—vintage names often return after a few decades when the children of one era become parents and revive names from their grandparents’ generation.</p>
    <p class="contextual">This page is your hub for recent U.S. trends. You can jump to the most popular names for 2022, 2023, and 2024, and see the top 20 names for the latest year below. Each name links to its full profile on nameorigin.io, where you can read meaning, origin, and longer-term popularity. For more discovery, browse by <a href="/names/letters${EXT}">letter</a>, <a href="/names/boy${EXT}">boy</a> and <a href="/names/girl${EXT}">girl</a> names, or <a href="/compare/">compare by country</a>. The <a href="/compatibility/">compatibility tool</a> helps when pairing a first name with your last name.</p>
    <p class="contextual">Rankings here are based on total U.S. births per name in a given year. We use the same public data published by the Social Security Administration; we do not use estimates or surveys. When data for a given year is not yet available, year pages may show the most recent year’s rankings so you can see current patterns. Use the <a href="/popularity/2022${EXT}">2022</a>, <a href="/popularity/2023${EXT}">2023</a>, and <a href="/popularity/2024${EXT}">2024</a> links below to see the full top 50 for each year.</p>

    <section aria-labelledby="analyze-heading">
      <h2 id="analyze-heading">How we analyze trends</h2>
      <p class="contextual">We look at year-over-year rank movement: if a name moves from rank 50 to rank 20 in one year, it is rising; if it drops from 20 to 50, it is declining. That movement is measured using the same official birth data from one year to the next. Some names show long-term stability—they stay within a narrow rank band for many years—while others spike or drop sharply in a short period. Those spikes and drops are often associated with the influence of media (films, television, celebrities), cultural events, or shifts in the demographic mix of parents. Migration and the growing diversity of naming traditions in a region can also introduce new names into the top lists or lift names that were previously uncommon. We do not speculate on causes; we report rank and movement from published statistics so you can see how names have trended over time. The year pages linked below give the top 50 names per year with the same methodology; the <a href="/trends/">trends</a> and <a href="/names/trending${EXT}">trending names</a> sections highlight names that have gained rank in recent years. Comparing ranks across years lets you see which names have held steady near the top and which have moved up or down the list over time. All figures come from official U.S. birth records, not polls or forecasts; the same data is used for the rankings on each name’s profile page.</p>
    </section>

    <section aria-labelledby="years-heading">
      <h2 id="years-heading">Popularity by year</h2>
      <p class="contextual">${yearLinks || 'No year data available.'}</p>
    </section>

    <section aria-labelledby="top20-heading">
      <h2 id="top20-heading">Top 20 trending names (${currentYear})</h2>
      <p class="contextual">Based on U.S. birth data for ${currentYear}. Click any name for meaning, origin, and full popularity profile.</p>
      ${top20.length > 0 ? '<ol class="name-list">' + top20.map((n, i) => `<li>${nameLink(n)}</li>`).join('') + '</ol>' : '<p class="contextual">No data for this year yet.</p>'}
    </section>

    <section aria-labelledby="explore-heading">
      <h2 id="explore-heading">Explore</h2>
      <p class="internal-links">
        <a href="/">Home</a> · <a href="/names">All names</a> · <a href="/names/boy${EXT}">Boy names</a> · <a href="/names/girl${EXT}">Girl names</a> · <a href="/names/unisex${EXT}">Unisex names</a> · <a href="/names/trending${EXT}">Trending names</a> · <a href="/names/popular${EXT}">Popular names</a> · <a href="/compare/">Compare by country</a> · <a href="/compare/us-vs-uk/">US vs UK</a> · <a href="/compatibility/">Compatibility tool</a> · <a href="/names/letters${EXT}">Browse by letter</a> · <a href="/names/usa${EXT}">USA names</a> · <a href="/trends/">Name trends</a> · <a href="/all-name-pages.html">All name pages</a> · <a href="/country-name-pages.html">Country name pages</a> · <a href="/about/">About</a> · <a href="/legal/privacy.html">Privacy</a> · <a href="/legal/terms.html">Terms</a>
        ${ALLOWED_YEARS.map((y) => `<a href="/popularity/${y}${EXT}">${y} names</a>`).join(' · ')}
      </p>
    </section>
  `;

  return baseLayout({
    title: 'Baby Name Popularity Trends | nameorigin.io',
    description: 'Browse baby name popularity by year: 2022, 2023, 2024. Top names from U.S. birth statistics. Each name links to meaning and origin.',
    path: '/popularity/',
    canonical: SITE_URL + '/popularity/',
    breadcrumb: breadcrumbItems,
    breadcrumbHtml: breadcrumbHtml(breadcrumbItemsRelative),
    mainContent,
  });
}

function generateYearPage(year, names, popularity, nameById) {
  const pathSeg = '/popularity/' + year + EXT;
  const byYear = usaByYear(popularity);
  const latestDataYear = latestYearInData(popularity);
  const yearEntries = byYear.get(year) || byYear.get(latestDataYear) || [];
  const top50 = topNamesByRank(yearEntries, nameById, 50);
  const nameLink = (n) => n ? `<a href="${nameDetailPath(n.name)}">${htmlEscape(n.name)}</a>` : '';

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL + '/' },
    { name: 'Baby Names', url: SITE_URL + '/names' },
    { name: 'Popularity', url: SITE_URL + '/popularity/' },
    { name: year + ' names', url: SITE_URL + pathSeg },
  ];
  const breadcrumbItemsRelative = breadcrumbItems.map((i) => ({ ...i, url: i.url.replace(SITE_URL, '') }));

  const intro = `The most popular baby names in ${year} in the United States come from official birth statistics published by the Social Security Administration. Parents often look at the top of the list for ideas that feel both familiar and current. Rankings reflect the number of babies given each name that year: rank 1 is the most popular. Year-over-year movement shows which names are rising and which are cooling off. This page lists the top 50 names for ${year}, combined across boy and girl names, so you can see the full picture. Each name links to its dedicated page on nameorigin.io, where you can read meaning, origin, and longer-term popularity. Understanding how a name has trended over time can help you decide whether it fits your style and how common it might be in your child's cohort. When official data for ${year} is not yet available, we show the most recent year's rankings so you can see current trends.`;
  const methodology = `Data source: the U.S. Social Security Administration publishes annual baby name data based on applications for Social Security cards. We use the same public data to build this list; we do not use estimates, surveys, or AI-generated content. Names are ranked by total number of births. The top 50 here are the 50 most-given names in ${year} in the United States (or the latest available year when ${year} data is not yet published), regardless of gender. For more detail on rising and falling names, see the <a href="/popularity/">popularity hub</a>.`;
  const closing = `Names at the top of the list in ${year} often stay popular for several years, but trends shift. Use the <a href="/popularity/">popularity hub</a> to compare ${year} with <a href="/popularity/2022${EXT}">2022</a>, <a href="/popularity/2023${EXT}">2023</a>, and <a href="/popularity/2024${EXT}">2024</a>, or browse <a href="/names/trending${EXT}">trending names</a> and <a href="/compare/">compare by country</a> for more context. The <a href="/compatibility/">compatibility tool</a> helps when pairing a first name with your last name. All data is from official sources; we do not use AI-generated content.`;

  const culturalContext = getCulturalContext(year);

  const mainContent = `
    <h1>Most Popular Baby Names in ${year}</h1>
    <p class="contextual">${intro}</p>

    <section aria-labelledby="top50-heading">
      <h2 id="top50-heading">Top 50 names in ${year}</h2>
      <p class="contextual">Ranked by U.S. births. Click any name for its meaning, origin, and full popularity profile.</p>
      ${top50.length > 0 ? '<ol class="name-list">' + top50.map((n, i) => `<li>${nameLink(n)}</li>`).join('') + '</ol>' : '<p class="contextual">No data for this year.</p>'}
    </section>

    <section aria-labelledby="cultural-heading">
      <h2 id="cultural-heading">Context</h2>
      <p class="contextual">${htmlEscape(culturalContext)}</p>
    </section>

    <section aria-labelledby="methodology-heading">
      <h2 id="methodology-heading">Data and methodology</h2>
      <p class="contextual">${methodology}</p>
    </section>

    <section aria-labelledby="closing-heading">
      <h2 id="closing-heading">Using this data</h2>
      <p class="contextual">${closing}</p>
    </section>

    <section aria-labelledby="browse-heading">
      <h2 id="browse-heading">Browse</h2>
      <p class="internal-links">
        <a href="/">Home</a> · <a href="/names">All names</a> · <a href="/names/boy${EXT}">Boy names</a> · <a href="/names/girl${EXT}">Girl names</a> · <a href="/names/unisex${EXT}">Unisex names</a> · <a href="/popularity/">Popularity hub</a> · <a href="/popularity/2022${EXT}">2022</a> · <a href="/popularity/2023${EXT}">2023</a> · <a href="/popularity/2024${EXT}">2024</a> · <a href="/names/trending${EXT}">Trending names</a> · <a href="/names/popular${EXT}">Popular names</a> · <a href="/compare/">Compare by country</a> · <a href="/compatibility/">Compatibility tool</a> · <a href="/names/letters${EXT}">Browse by letter</a> · <a href="/names/usa${EXT}">USA names</a> · <a href="/trends/">Name trends</a> · <a href="/all-name-pages.html">All name pages</a> · <a href="/country-name-pages.html">Country name pages</a> · <a href="/about/">About</a> · <a href="/legal/privacy.html">Privacy</a> · <a href="/legal/terms.html">Terms</a>
      </p>
    </section>
  `;

  return baseLayout({
    title: `Most Popular Baby Names in ${year} | nameorigin.io`,
    description: `Top baby names of ${year} from U.S. birth statistics. See rankings and link to meaning and origin for each name.`,
    path: pathSeg,
    canonical: SITE_URL + pathSeg,
    breadcrumb: breadcrumbItems,
    breadcrumbHtml: breadcrumbHtml(breadcrumbItemsRelative),
    mainContent,
  });
}

function getCulturalContext(year) {
  const decade = Math.floor(year / 10) * 10;
  const contexts = {
    1980: 'The 1980s saw classic names like Michael, Christopher, Jennifer, and Jessica dominate the charts.',
    1990: 'The 1990s continued many 80s favorites; unisex and nature-inspired names began to emerge.',
    2000: 'The 2000s marked a shift toward unique spellings and less common choices.',
    2010: 'The 2010s favored shorter names and vowel-ending choices; vintage revivals gained traction.',
    2020: 'The 2020s show continued interest in classic revivals and globally influenced names.',
  };
  return contexts[decade] || `Baby naming in ${year} reflected a mix of tradition and innovation.`;
}

function generateYearPage(year, names, popularity, nameById) {
  const pathSeg = '/popularity/' + year + EXT;
  const byYear = usaByYear(popularity);
  const latestDataYear = latestYearInData(popularity);
  const yearEntries = byYear.get(year) || byYear.get(latestDataYear) || [];
  const top50 = topNamesByRank(yearEntries, nameById, 50);
  const nameLink = (n) => n ? `<a href="${nameDetailPath(n.name)}">${htmlEscape(n.name)}</a>` : '';

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL + '/' },
    { name: 'Baby Names', url: SITE_URL + '/names' },
    { name: 'Popularity', url: SITE_URL + '/popularity/' },
    { name: year + ' names', url: SITE_URL + pathSeg },
  ];
  const breadcrumbItemsRelative = breadcrumbItems.map((i) => ({ ...i, url: i.url.replace(SITE_URL, '') }));

  const intro = `The most popular baby names in ${year} in the United States come from official birth statistics published by the Social Security Administration. Parents often look at the top of the list for ideas that feel both familiar and current. Rankings reflect the number of babies given each name that year: rank 1 is the most popular. Year-over-year movement shows which names are rising and which are cooling off. This page lists the top 50 names for ${year}, combined across boy and girl names, so you can see the full picture. Each name links to its dedicated page on nameorigin.io, where you can read meaning, origin, and longer-term popularity. Understanding how a name has trended over time can help you decide whether it fits your style and how common it might be in your child’s cohort.`;
  const closing = `Names at the top of the list in ${year} often stay popular for several years, but trends shift. Use the <a href="/popularity/">popularity hub</a> to compare ${year} with <a href="/popularity/2022${EXT}">2022</a>, <a href="/popularity/2023${EXT}">2023</a>, and <a href="/popularity/2024${EXT}">2024</a>, or browse <a href="/names/trending${EXT}">trending names</a> and <a href="/compare/">compare by country</a> for more context. The <a href="/compatibility/">compatibility tool</a> helps when pairing a first name with your last name. All data is from official sources; we do not use AI-generated content.`;

  const culturalContext = getCulturalContext(year);

  const mainContent = `
    <h1>Most Popular Baby Names in ${year}</h1>
    <p class="contextual">${intro}</p>

    <section aria-labelledby="top50-heading">
      <h2 id="top50-heading">Top 50 names in ${year}</h2>
      <p class="contextual">Ranked by U.S. births. Click any name for its meaning, origin, and full popularity profile.</p>
      ${top50.length > 0 ? '<ol class="name-list">' + top50.map((n, i) => `<li>${nameLink(n)}</li>`).join('') + '</ol>' : '<p class="contextual">No data for this year.</p>'}
    </section>

    <section aria-labelledby="cultural-heading">
      <h2 id="cultural-heading">Context</h2>
      <p class="contextual">${htmlEscape(culturalContext)}</p>
    </section>

    <section aria-labelledby="methodology-heading">
      <h2 id="methodology-heading">Data and methodology</h2>
      <p class="contextual">Data source: the U.S. Social Security Administration publishes annual baby name data based on applications for Social Security cards. We use the same public data to build this list; we do not use estimates, surveys, or AI-generated content. Names are ranked by total number of births. The top 50 here are the 50 most-given names in ${year} in the United States (or the latest available year when ${year} data is not yet published), regardless of gender. For more detail on rising and falling names, see the <a href="/popularity/">popularity hub</a>.</p>
    </section>

    <section aria-labelledby="closing-heading">
      <h2 id="closing-heading">Using this data</h2>
      <p class="contextual">${closing}</p>
    </section>

    <section aria-labelledby="browse-heading">
      <h2 id="browse-heading">Browse</h2>
      <p class="internal-links">
        <a href="/">Home</a> · <a href="/names">All names</a> · <a href="/names/boy${EXT}">Boy names</a> · <a href="/names/girl${EXT}">Girl names</a> · <a href="/names/unisex${EXT}">Unisex names</a> · <a href="/popularity/">Popularity hub</a> · <a href="/popularity/2022${EXT}">2022</a> · <a href="/popularity/2023${EXT}">2023</a> · <a href="/popularity/2024${EXT}">2024</a> · <a href="/names/trending${EXT}">Trending names</a> · <a href="/names/popular${EXT}">Popular names</a> · <a href="/compare/">Compare by country</a> · <a href="/compatibility/">Compatibility tool</a> · <a href="/names/letters${EXT}">Browse by letter</a> · <a href="/names/usa${EXT}">USA names</a> · <a href="/trends/">Name trends</a> · <a href="/all-name-pages.html">All name pages</a> · <a href="/country-name-pages.html">Country name pages</a> · <a href="/about/">About</a> · <a href="/legal/privacy.html">Privacy</a> · <a href="/legal/terms.html">Terms</a>
      </p>
    </section>
  `;

  return baseLayout({
    title: `Most Popular Baby Names in ${year} | nameorigin.io`,
    description: `Top baby names of ${year} from U.S. birth statistics. See rankings and link to meaning and origin for each name.`,
    path: pathSeg,
    canonical: SITE_URL + pathSeg,
    breadcrumb: breadcrumbItems,
    breadcrumbHtml: breadcrumbHtml(breadcrumbItemsRelative),
    mainContent,
  });
}

function run() {
  const names = loadJson('names');
  const popularity = loadJson('popularity');
  const nameById = new Map((names || []).map((n) => [n.id, n]));

  const popularityDir = path.join(OUT_DIR, 'popularity');
  fs.mkdirSync(popularityDir, { recursive: true });

  fs.writeFileSync(path.join(popularityDir, 'index.html'), generateIndexPage(names, popularity, nameById), 'utf8');
  let count = 1;

  for (const year of ALLOWED_YEARS) {
    fs.writeFileSync(path.join(popularityDir, year + EXT), generateYearPage(year, names, popularity, nameById), 'utf8');
    count++;
  }

  console.log('Generated', count, 'popularity pages: index + 2022, 2023, 2024');
}

run();
