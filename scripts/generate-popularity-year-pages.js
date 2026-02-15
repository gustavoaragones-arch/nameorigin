#!/usr/bin/env node
/**
 * generate-popularity-year-pages.js
 * Generates year popularity pages: /popularity/1980.html through /popularity/2024.html
 * Each page: H1, Top 20 Boy Names, Top 20 Girl Names, Biggest Risers, Biggest Decliners, Cultural Context
 * All names linked to /name/<slug>/
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const OUT_DIR = process.env.OUT_DIR ? path.join(ROOT, process.env.OUT_DIR) : ROOT;
const SITE_URL = process.env.SITE_URL || 'https://nameorigin.io';
const EXT = '.html';

const YEAR_START = 1980;
const YEAR_END = 2024;

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

/** Deterministic cultural context paragraph by decade */
/** Shuffle array for deterministic "random" based on year seed */
function shuffleWithSeed(arr, seed) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = (seed + i * 7) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getCulturalContext(year) {
  const decade = Math.floor(year / 10) * 10;
  const contexts = {
    1980: 'The 1980s saw classic names like Michael, Christopher, Jennifer, and Jessica dominate the charts. Traditional choices and Biblical names remained strong, while shorter nicknames gained popularity.',
    1990: 'The 1990s continued many 80s favorites but also welcomed newer trends: Ashley, Brittany, and Tyler peaked. Unisex names and nature-inspired choices began to emerge.',
    2000: 'The 2000s marked a shift toward unique spellings and less common choices. Names like Aiden and Madison rose rapidly, while classic names remained steady.',
    2010: 'The 2010s favored shorter, punchy names and vowel-ending choices. Liam and Emma led the pack; vintage revivals and international names gained traction.',
    2020: 'The 2020s show continued interest in classic revivals and globally influenced names. Short, memorable names and gender-neutral options remain popular.',
  };
  return contexts[decade] || `Baby naming trends in ${year} reflected a mix of tradition and innovation. Parents drew from family heritage, popular culture, and a growing appetite for unique choices while still valuing classic favorites.`;
}

function itemListSchema(name, items, year) {
  if (!items || items.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: name + ' ' + year,
    numberOfItems: items.length,
    itemListElement: items.map((n, i) => ({ '@type': 'ListItem', position: i + 1, name: n.name })),
  };
}

function generateYearPage(year, names, popularity, nameById) {
  const pathSeg = '/popularity/' + year + EXT;
  const title = `Top Baby Names of ${year} | NameOrigin`;
  const description = `See the most popular baby names of ${year} including rankings, trends, and rising names.`;

  const usaByYear = new Map();
  (popularity || []).filter((p) => p.country === 'USA' && p.year != null && p.rank != null).forEach((p) => {
    if (!usaByYear.has(p.year)) usaByYear.set(p.year, []);
    usaByYear.get(p.year).push(p);
  });

  const thisYear = usaByYear.get(year) || [];
  const prevYear = usaByYear.get(year - 1) || [];

  // Best rank per name_id for this year (lowest rank = best)
  const bestRankById = new Map();
  thisYear.forEach((p) => {
    if (!bestRankById.has(p.name_id) || (p.rank != null && p.rank < bestRankById.get(p.name_id))) {
      bestRankById.set(p.name_id, p.rank);
    }
  });

  const nameLink = (n) => n ? `<a href="${nameDetailPath(n.name)}">${htmlEscape(n.name)}</a>` : '';

  // Top 20 Boy Names
  const boyNames = names.filter((n) => n.gender === 'boy');
  const boyWithRank = boyNames
    .filter((n) => bestRankById.has(n.id))
    .map((n) => ({ name: n, rank: bestRankById.get(n.id) }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 20);
  const top20BoyHtml =
    boyWithRank.length > 0
      ? '<ol class="name-list">' + boyWithRank.map((r, i) => `<li>${nameLink(r.name)}</li>`).join('') + '</ol>'
      : '<p class="contextual">No boy names data available for this year.</p>';

  // Top 20 Girl Names
  const girlNames = names.filter((n) => n.gender === 'girl');
  const girlWithRank = girlNames
    .filter((n) => bestRankById.has(n.id))
    .map((n) => ({ name: n, rank: bestRankById.get(n.id) }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 20);
  const top20GirlHtml =
    girlWithRank.length > 0
      ? '<ol class="name-list">' + girlWithRank.map((r, i) => `<li>${nameLink(r.name)}</li>`).join('') + '</ol>'
      : '<p class="contextual">No girl names data available for this year.</p>';

  // Biggest Risers: rank improved (prev rank - curr rank > 0)
  const prevRankById = new Map();
  prevYear.forEach((p) => {
    if (!prevRankById.has(p.name_id) || (p.rank != null && p.rank < prevRankById.get(p.name_id))) {
      prevRankById.set(p.name_id, p.rank);
    }
  });
  const risers = [];
  thisYear.forEach((p) => {
    const prev = prevRankById.get(p.name_id);
    if (prev != null && p.rank != null && prev > p.rank) {
      risers.push({ name_id: p.name_id, change: prev - p.rank, currRank: p.rank, prevRank: prev });
    }
  });
  risers.sort((a, b) => b.change - a.change);
  const topRisers = risers.slice(0, 10).map((r) => nameById.get(r.name_id)).filter(Boolean);
  const risersHtml =
    topRisers.length > 0
      ? '<ul class="name-list">' + topRisers.map((n) => `<li>${nameLink(n)}</li>`).join('') + '</ul>'
      : '<p class="contextual">Not enough year-over-year data for risers.</p>';

  // Biggest Decliners
  const decliners = [];
  thisYear.forEach((p) => {
    const prev = prevRankById.get(p.name_id);
    if (prev != null && p.rank != null && prev < p.rank) {
      decliners.push({ name_id: p.name_id, change: p.rank - prev, currRank: p.rank, prevRank: prev });
    }
  });
  decliners.sort((a, b) => b.change - a.change);
  const topDecliners = decliners.slice(0, 10).map((r) => nameById.get(r.name_id)).filter(Boolean);
  const declinersHtml =
    topDecliners.length > 0
      ? '<ul class="name-list">' + topDecliners.map((n) => `<li>${nameLink(n)}</li>`).join('') + '</ul>'
      : '<p class="contextual">Not enough year-over-year data for decliners.</p>';

  const culturalContext = getCulturalContext(year);

  // Internal link graph: 10 random names from this year, adjacent years, homepage (15+ links)
  const allNamesThisYear = [...boyWithRank.map((r) => r.name), ...girlWithRank.map((r) => r.name)].filter((n, i, arr) => arr.findIndex((x) => x.id === n.id) === i);
  const randomNames = shuffleWithSeed(allNamesThisYear, year).slice(0, 10);
  const randomLinksHtml = randomNames.length > 0
    ? '<p class="name-links">' + randomNames.map((n) => nameLink(n)).join(', ') + '</p>'
    : '';
  const prevYearLink = year > YEAR_START ? '<a href="/popularity/' + (year - 1) + EXT + '">' + (year - 1) + '</a>' : '';
  const nextYearLink = year < YEAR_END ? '<a href="/popularity/' + (year + 1) + EXT + '">' + (year + 1) + '</a>' : '';
  const adjacentLinks = [prevYearLink, nextYearLink].filter(Boolean).join(' · ');

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL + '/' },
    { name: 'Baby Names', url: SITE_URL + '/names' },
    { name: 'Popularity by year', url: SITE_URL + '/popularity/' },
    { name: 'Top names ' + year, url: SITE_URL + pathSeg },
  ];
  const breadcrumbItemsRelative = breadcrumbItems.map((i) => ({ ...i, url: i.url.replace(SITE_URL, '') }));

  const mainContent = `
    <h1>Top Baby Names in ${year}</h1>
    <p class="contextual">Here are the top baby names in ${year}, based on official birth statistics. Each name links to its full meaning, origin, and popularity profile.</p>

    <section aria-labelledby="top-boy-heading">
      <h2 id="top-boy-heading">Top 20 Boy Names</h2>
      ${top20BoyHtml}
    </section>

    <section aria-labelledby="top-girl-heading">
      <h2 id="top-girl-heading">Top 20 Girl Names</h2>
      ${top20GirlHtml}
    </section>

    <div class="ad-slot ad-slot--after-top20" data-ad-slot="year-top20" aria-label="Advertisement"></div>

    <section aria-labelledby="risers-heading">
      <h2 id="risers-heading">Biggest Risers</h2>
      <p class="contextual">Names that improved the most in rank compared to ${year - 1}.</p>
      ${risersHtml}
    </section>

    <section aria-labelledby="decliners-heading">
      <h2 id="decliners-heading">Biggest Decliners</h2>
      <p class="contextual">Names that dropped the most in rank compared to ${year - 1}.</p>
      ${declinersHtml}
    </section>

    <section aria-labelledby="cultural-heading">
      <h2 id="cultural-heading">Cultural Context</h2>
      <p class="contextual">${htmlEscape(culturalContext)}</p>
    </section>

    <div class="ad-slot ad-slot--after-cultural" data-ad-slot="year-cultural" aria-label="Advertisement"></div>

    ${randomNames.length > 0 ? `<section aria-labelledby="more-names-heading"><h2 id="more-names-heading">More names from ${year}</h2>${randomLinksHtml}</section>` : ''}

    <section aria-labelledby="browse-heading">
      <h2 id="browse-heading">Browse</h2>
      <p class="internal-links">
        <a href="/">Home</a> · <a href="/names">All names</a> · <a href="/popularity/">Explore trends by year</a> · <a href="/names/trending${EXT}">Trending names</a> · <a href="/names/popular${EXT}">Popular names</a>
        ${adjacentLinks ? ' · ' + adjacentLinks : ''}
      </p>
    </section>
  `;

  const itemListBoy = itemListSchema('Top boy names of', boyWithRank.map((r) => r.name), year);
  const itemListGirl = itemListSchema('Top girl names of', girlWithRank.map((r) => r.name), year);
  const extraSchema = [itemListBoy, itemListGirl].filter(Boolean);

  return baseLayout({
    title,
    description,
    path: pathSeg,
    canonical: SITE_URL + pathSeg,
    breadcrumb: breadcrumbItems,
    breadcrumbHtml: breadcrumbHtml(breadcrumbItemsRelative),
    mainContent,
    extraSchema,
  });
}

function generatePopularityHub() {
  const years = [];
  for (let y = YEAR_START; y <= YEAR_END; y++) years.push(y);
  const links = years.map((y) => `<a href="/popularity/${y}${EXT}">${y}</a>`).join(' ');
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL + '/' },
    { name: 'Baby Names', url: SITE_URL + '/names' },
    { name: 'Popularity by year', url: SITE_URL + '/popularity/' },
  ];
  const breadcrumbItemsRelative = breadcrumbItems.map((i) => ({ ...i, url: i.url.replace(SITE_URL, '') }));
  const mainContent = `
    <h1>Popularity by Year</h1>
    <p class="contextual">Browse top baby names by year from ${YEAR_START} to ${YEAR_END}. Each year page shows the top 20 boy and girl names, biggest risers and decliners, and cultural context.</p>
    <section aria-labelledby="years-heading">
      <h2 id="years-heading">Years</h2>
      <p class="letters-hub">${links}</p>
    </section>
  `;
  return baseLayout({
    title: 'Popularity by Year | Top Baby Names by Year | NameOrigin',
    description: `Browse top baby names from ${YEAR_START} to ${YEAR_END}. Each year page shows rankings, trends, and rising names.`,
    path: '/popularity/',
    canonical: SITE_URL + '/popularity/',
    breadcrumb: breadcrumbItems,
    breadcrumbHtml: breadcrumbHtml(breadcrumbItemsRelative),
    mainContent,
  });
}

function run() {
  const names = loadJson('names');
  const popularity = loadJson('popularity');
  const nameById = new Map(names.map((n) => [n.id, n]));

  const popularityDir = path.join(OUT_DIR, 'popularity');
  if (!fs.existsSync(popularityDir)) fs.mkdirSync(popularityDir, { recursive: true });

  // Hub page
  fs.writeFileSync(path.join(popularityDir, 'index.html'), generatePopularityHub(), 'utf8');
  let count = 1;

  for (let year = YEAR_START; year <= YEAR_END; year++) {
    const html = generateYearPage(year, names, popularity, nameById);
    fs.writeFileSync(path.join(popularityDir, year + EXT), html, 'utf8');
    count++;
  }
  console.log('Generated', count, 'popularity pages (hub + /popularity/' + YEAR_START + '.html through /popularity/' + YEAR_END + EXT + ')');
}

run();
