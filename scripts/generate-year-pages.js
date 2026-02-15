#!/usr/bin/env node
/**
 * generate-year-pages.js
 * D1-backed year popularity pages: /popularity/<year>.html
 *
 * Logic:
 * - Query D1 for distinct years (or fallback to JSON when D1 unavailable)
 * - For each year: get top N names by rank, render static HTML
 * - Output: /popularity/<year>.html
 *
 * Internal link graph (15+ links per page):
 * - 10 random names from this year
 * - Adjacent years
 * - Homepage, names hub, explore trends by year
 *
 * Usage:
 *   node scripts/generate-year-pages.js
 *   USE_D1=1 D1_DATABASE=nameorigin-db node scripts/generate-year-pages.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const OUT_DIR = process.env.OUT_DIR ? path.join(ROOT, process.env.OUT_DIR) : ROOT;
const SITE_URL = process.env.SITE_URL || 'https://nameorigin.io';
const EXT = '.html';
const TOP_N = 20;

function loadJson(name) {
  const p = path.join(DATA_DIR, name + '.json');
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function slug(str) {
  return String(str || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function nameDetailPath(name) {
  return '/name/' + slug(name) + '/';
}

function htmlEscape(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

function getCulturalContext(year) {
  const decade = Math.floor(year / 10) * 10;
  const contexts = {
    1980: 'The 1980s saw classic names like Michael, Christopher, Jennifer, and Jessica dominate the charts. Traditional choices and Biblical names remained strong.',
    1990: 'The 1990s continued many 80s favorites but also welcomed newer trends: Ashley, Brittany, and Tyler peaked. Unisex names and nature-inspired choices emerged.',
    2000: 'The 2000s marked a shift toward unique spellings and less common choices. Names like Aiden and Madison rose rapidly, while classic names remained steady.',
    2010: 'The 2010s favored shorter, punchy names and vowel-ending choices. Liam and Emma led the pack; vintage revivals and international names gained traction.',
    2020: 'The 2020s show continued interest in classic revivals and globally influenced names. Short, memorable names and gender-neutral options remain popular.',
  };
  return contexts[decade] || `Baby naming trends in ${year} reflected a mix of tradition and innovation.`;
}

/** Shuffle array (Fisher-Yates) for deterministic "random" based on year seed */
function shuffleWithSeed(arr, seed) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = (seed + i * 7) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fetchFromD1() {
  const db = process.env.D1_DATABASE || process.env.WRANGLER_D1_DATABASE || 'nameorigin-db';
  try {
    const popOut = execSync(`npx wrangler d1 execute ${db} --remote --command "SELECT name_id, country, year, rank, count FROM name_popularity"`, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
    const namesOut = execSync(`npx wrangler d1 execute ${db} --remote --command "SELECT id, name, gender, first_letter, origin_country, language FROM names"`, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
    const parseResult = (str) => {
      const m = str.match(/Result:\s*(\[[\s\S]*\])/);
      if (m) {
        try {
          return JSON.parse(m[1]);
        } catch (_) {}
      }
      return null;
    };
    const popRows = parseResult(popOut);
    const nameRows = parseResult(namesOut);
    if (popRows && nameRows) {
      const popularity = popRows.map((r) => ({
        name_id: r[0],
        country: r[1],
        year: r[2],
        rank: r[3],
        count: r[4],
      }));
      const names = nameRows.map((r) => ({
        id: r[0],
        name: r[1],
        gender: r[2],
        first_letter: r[3],
        origin_country: r[4],
        language: r[5],
      }));
      return { names, popularity };
    }
  } catch (e) {
    console.warn('D1 fetch failed, falling back to JSON:', e.message);
  }
  return null;
}

function loadData() {
  if (process.env.USE_D1 === '1' || process.env.USE_D1 === 'true') {
    const d1 = fetchFromD1();
    if (d1) {
      console.log('Using D1 data');
      return d1;
    }
  }
  const names = loadJson('names');
  const popularity = loadJson('popularity');
  const popMap = popularity.map((p) => ({
    name_id: p.name_id,
    country: p.country,
    year: p.year,
    rank: p.rank,
    count: p.count,
  }));
  return { names, popularity: popMap };
}

function run() {
  const { names, popularity } = loadData();
  const nameById = new Map(names.map((n) => [n.id, n]));

  const years = [...new Set((popularity || []).map((p) => p.year).filter(Boolean))].sort((a, b) => a - b);
  if (years.length === 0) {
    years.push(...Array.from({ length: 45 }, (_, i) => 1980 + i));
  }

  const popularityDir = path.join(OUT_DIR, 'popularity');
  if (!fs.existsSync(popularityDir)) fs.mkdirSync(popularityDir, { recursive: true });

  let count = 0;
  years.forEach((year) => {
    const usa = (popularity || []).filter((p) => p.country === 'USA' && p.year === year && p.rank != null);
    const bestRankById = new Map();
    usa.forEach((p) => {
      if (!bestRankById.has(p.name_id) || p.rank < bestRankById.get(p.name_id)) {
        bestRankById.set(p.name_id, p.rank);
      }
    });

    const allWithRank = names
      .filter((n) => bestRankById.has(n.id))
      .map((n) => ({ name: n, rank: bestRankById.get(n.id) }))
      .sort((a, b) => a.rank - b.rank);

    const boys = allWithRank.filter((r) => r.name.gender === 'boy').slice(0, TOP_N);
    const girls = allWithRank.filter((r) => r.name.gender === 'girl').slice(0, TOP_N);

    const nameLink = (n) => n ? `<a href="${nameDetailPath(n.name)}">${htmlEscape(n.name)}</a>` : '';
    const top20BoyHtml = boys.length > 0 ? '<ol class="name-list">' + boys.map((r) => `<li>${nameLink(r.name)}</li>`).join('') + '</ol>' : '<p class="contextual">No boy names data for this year.</p>';
    const top20GirlHtml = girls.length > 0 ? '<ol class="name-list">' + girls.map((r) => `<li>${nameLink(r.name)}</li>`).join('') + '</ol>' : '<p class="contextual">No girl names data for this year.</p>';

    const allNamesThisYear = allWithRank.map((r) => r.name);
    const randomNames = shuffleWithSeed(allNamesThisYear, year).slice(0, 10);
    const randomLinksHtml = randomNames.length > 0
      ? '<p class="name-links">' + randomNames.map((n) => nameLink(n)).join(', ') + '</p>'
      : '';

    const prevYear = years[years.indexOf(year) - 1];
    const nextYear = years[years.indexOf(year) + 1];
    const adjacentLinks = [
      prevYear ? `<a href="/popularity/${prevYear}${EXT}">${prevYear}</a>` : '',
      nextYear ? `<a href="/popularity/${nextYear}${EXT}">${nextYear}</a>` : '',
    ].filter(Boolean).join(' · ');

    const pathSeg = '/popularity/' + year + EXT;
    const breadcrumbItems = [
      { name: 'Home', url: SITE_URL + '/' },
      { name: 'Baby Names', url: SITE_URL + '/names' },
      { name: 'Popularity by year', url: SITE_URL + '/popularity/' },
      { name: 'Top names ' + year, url: SITE_URL + pathSeg },
    ];
    const breadcrumbItemsRelative = breadcrumbItems.map((i) => ({ ...i, url: i.url.replace(SITE_URL, '') }));

    const mainContent = `
    <h1>Top Baby Names in ${year}</h1>
    <p class="contextual">Top baby names in ${year} based on official birth statistics. Each name links to its meaning, origin, and popularity profile.</p>

    <section aria-labelledby="top-boy-heading">
      <h2 id="top-boy-heading">Top 20 Boy Names</h2>
      ${top20BoyHtml}
    </section>

    <section aria-labelledby="top-girl-heading">
      <h2 id="top-girl-heading">Top 20 Girl Names</h2>
      ${top20GirlHtml}
    </section>

    <div class="ad-slot ad-slot--after-top20" data-ad-slot="year-top20" aria-label="Advertisement"></div>

    <section aria-labelledby="cultural-heading">
      <h2 id="cultural-heading">Cultural Context</h2>
      <p class="contextual">${htmlEscape(getCulturalContext(year))}</p>
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

    const itemListBoy = itemListSchema('Top boy names of', boys.map((r) => r.name), year);
    const itemListGirl = itemListSchema('Top girl names of', girls.map((r) => r.name), year);
    const extraSchema = [itemListBoy, itemListGirl].filter(Boolean);

    const html = baseLayout({
      title: `Top Baby Names of ${year} | NameOrigin`,
      description: `See the most popular baby names of ${year} including rankings, trends, and rising names.`,
      path: pathSeg,
      canonical: SITE_URL + pathSeg,
      breadcrumb: breadcrumbItems,
      breadcrumbHtml: breadcrumbHtml(breadcrumbItemsRelative),
      mainContent,
      extraSchema,
    });

    fs.writeFileSync(path.join(popularityDir, year + EXT), html, 'utf8');
    count++;
  });

  const hubYears = years.length > 0 ? years : Array.from({ length: 45 }, (_, i) => 1980 + i);
  const hubLinks = hubYears.map((y) => `<a href="/popularity/${y}${EXT}">${y}</a>`).join(' ');
  const hubBreadcrumb = [
    { name: 'Home', url: SITE_URL + '/' },
    { name: 'Baby Names', url: SITE_URL + '/names' },
    { name: 'Popularity by year', url: SITE_URL + '/popularity/' },
  ];
  const hubHtml = baseLayout({
    title: 'Popularity by Year | Top Baby Names by Year | NameOrigin',
    description: 'Browse top baby names by year. Each year page shows rankings, trends, and rising names.',
    path: '/popularity/',
    canonical: SITE_URL + '/popularity/',
    breadcrumb: hubBreadcrumb,
    breadcrumbHtml: breadcrumbHtml(hubBreadcrumb.map((i) => ({ ...i, url: i.url.replace(SITE_URL, '') }))),
    mainContent: `
    <h1>Popularity by Year</h1>
    <p class="contextual">Browse top baby names by year. Each year page shows the top 20 boy and girl names and cultural context.</p>
    <section aria-labelledby="years-heading">
      <h2 id="years-heading">Years</h2>
      <p class="letters-hub">${hubLinks}</p>
    </section>
    <section aria-labelledby="browse-heading">
      <h2 id="browse-heading">Browse</h2>
      <p class="internal-links">
        <a href="/">Home</a> · <a href="/names">All names</a> · <a href="/names/trending${EXT}">Trending names</a> · <a href="/names/popular${EXT}">Popular names</a>
      </p>
    </section>
  `,
  });
  fs.writeFileSync(path.join(popularityDir, 'index.html'), hubHtml, 'utf8');
  count++;

  console.log('Generated', count, 'popularity pages (hub +', years.length, 'year pages)');
}

run();
