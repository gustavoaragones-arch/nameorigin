#!/usr/bin/env node
/**
 * Phase 2.8 — Country Comparison Engine.
 * Generates /compare/{name}/{countryA}-vs-{countryB}/ index.html
 *
 * Cap: Top 100 global names × 5 country pairs = 500 pages max.
 * Each page: Direct Answer (40–60 words), structured table, Trend Delta, Cultural Context, ≥15 internal links.
 *
 * Usage: node scripts/generate-compare-pages.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const OUT_DIR = process.env.OUT_DIR ? path.join(ROOT, process.env.OUT_DIR) : ROOT;
const SITE_URL = process.env.SITE_URL || 'https://nameorigin.io';
const EXT = '.html';

/** 5 core country pairs (slug, country codes for data lookup, display labels). */
const COUNTRY_PAIRS = [
  { slug: 'us-vs-uk', codeA: 'USA', codeB: 'UK', labelA: 'United States', labelB: 'United Kingdom' },
  { slug: 'us-vs-canada', codeA: 'USA', codeB: 'CAN', labelA: 'United States', labelB: 'Canada' },
  { slug: 'uk-vs-australia', codeA: 'UK', codeB: 'AUS', labelA: 'United Kingdom', labelB: 'Australia' },
  { slug: 'france-vs-spain', codeA: 'FRA', codeB: 'ESP', labelA: 'France', labelB: 'Spain' },
  { slug: 'germany-vs-us', codeA: 'GER', codeB: 'USA', labelA: 'Germany', labelB: 'United States' },
];

/** Countries we have rank data for (build-popularity: USA, UK, CAN, AUS). */
const COUNTRIES_WITH_DATA = new Set(['USA', 'UK', 'CAN', 'AUS']);
const TOP_100_CAP = 100;
const PAIRS_CAP = 5;
const MAX_PAGES = TOP_100_CAP * PAIRS_CAP; // 500

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
function namesLikePath(name) { return '/names-like/' + slug(name) + '/'; }

/** Get rank for name_id in country in given year from popularity rows. */
function getRank(popularity, nameId, countryCode, year) {
  const r = (popularity || []).find((p) => p.name_id === nameId && p.country === countryCode && p.year === year);
  return r && r.rank != null ? r.rank : null;
}

/** 10-year movement: rank_2015 - rank_latest (positive = name improved). */
function getMovement(popularity, nameId, countryCode, year2015, yearLatest) {
  const r15 = getRank(popularity, nameId, countryCode, year2015);
  const rLat = getRank(popularity, nameId, countryCode, yearLatest);
  if (r15 != null && rLat != null) return r15 - rLat;
  return null;
}

/** Volatility: std of rank over available years (last 10). Low / Medium / High. */
function getVolatility(popularity, nameId, countryCode, yearLatest) {
  const years = [];
  for (let y = yearLatest - 9; y <= yearLatest; y++) years.push(y);
  const ranks = years.map((y) => getRank(popularity, nameId, countryCode, y)).filter((r) => r != null);
  if (ranks.length < 2) return null;
  const mean = ranks.reduce((a, b) => a + b, 0) / ranks.length;
  const variance = ranks.reduce((s, r) => s + (r - mean) ** 2, 0) / ranks.length;
  const std = Math.sqrt(variance);
  if (std < 5) return 'Low';
  if (std < 15) return 'Medium';
  return 'High';
}

/** Derive top 100 global name_ids by combined score (1/rank) across USA, UK, CAN, AUS in latest year. */
function getTop100GlobalNameIds(popularity, names, yearLatest) {
  const scoreById = new Map();
  for (const code of ['USA', 'UK', 'CAN', 'AUS']) {
    const rows = (popularity || []).filter((p) => p.country === code && p.year === yearLatest && p.rank != null);
    rows.forEach((r) => {
      const s = 1 / (r.rank || 9999);
      scoreById.set(r.name_id, (scoreById.get(r.name_id) || 0) + s);
    });
  }
  const sorted = [...scoreById.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  const nameIds = sorted.slice(0, TOP_100_CAP);
  return nameIds;
}

/** Top 10 names for a country in a given year. Returns [{ name_id, name, rank }] (max 10). */
function getTop10ForCountry(popularity, nameById, countryCode, year) {
  const rows = (popularity || []).filter((p) => p.country === countryCode && p.year === year && p.rank != null);
  rows.sort((a, b) => (a.rank || 9999) - (b.rank || 9999));
  return rows.slice(0, 10).map((r) => {
    const rec = nameById.get(r.name_id);
    return { name_id: r.name_id, name: rec ? rec.name : null, rank: r.rank };
  }).filter((x) => x.name);
}

/** Overlap: count of names appearing in both top 10 lists (by name_id) / 10. */
function getOverlap(top10A, top10B) {
  const setB = new Set((top10B || []).map((x) => x.name_id));
  const shared = (top10A || []).filter((x) => setB.has(x.name_id)).length;
  return shared / 10;
}

/** Phonetic similarity: first-letter and syllable overlap. 0–1. Uses first_letter and syllables from names. */
function getPhoneticSimilarity(top10A, top10B, nameById) {
  if (!top10A.length || !top10B.length) return 0;
  const lettersB = new Set((top10B || []).map((x) => (nameById.get(x.name_id) || {}).first_letter).filter(Boolean));
  const sylB = new Set((top10B || []).map((x) => (nameById.get(x.name_id) || {}).syllables).filter((v) => v != null));
  let letterMatch = 0;
  let sylMatch = 0;
  top10A.forEach((x) => {
    const rec = nameById.get(x.name_id);
    if (rec && lettersB.has(rec.first_letter)) letterMatch += 1;
    if (rec && rec.syllables != null && sylB.has(rec.syllables)) sylMatch += 1;
  });
  const letterScore = letterMatch / top10A.length;
  const sylScore = top10A.length ? sylMatch / top10A.length : 0;
  return (letterScore + sylScore) / 2;
}

/** Origin cluster overlap: share of names with same origin_country or language. 0–1. */
function getOriginOverlap(top10A, top10B, nameById) {
  if (!top10A.length || !top10B.length) return 0;
  const originsB = new Set();
  (top10B || []).forEach((x) => {
    const rec = nameById.get(x.name_id);
    if (rec && (rec.origin_country || rec.language)) originsB.add((rec.origin_country || rec.language || '').toLowerCase());
  });
  let match = 0;
  top10A.forEach((x) => {
    const rec = nameById.get(x.name_id);
    const o = (rec && (rec.origin_country || rec.language)) ? (rec.origin_country || rec.language).toLowerCase() : null;
    if (o && originsB.has(o)) match += 1;
  });
  return top10A.length ? match / top10A.length : 0;
}

/** Naming Similarity Index 0–100: shared top 10 %, phonetic match, origin overlap. Methodology in copy. */
function getSimilarityScore(overlapPct, phonetic, origin) {
  const w1 = 0.4;
  const w2 = 0.3;
  const w3 = 0.3;
  const s = overlapPct * w1 + (phonetic || 0) * 100 * w2 + (origin || 0) * 100 * w3;
  return Math.round(Math.max(0, Math.min(100, s)));
}

/** Popularity Volatility: how much the top 10 changed over 10 years. 0–100 (higher = more turnover). */
function getPopularityVolatility(popularity, nameById, countryCode, yearLatest) {
  const yearOld = yearLatest - 10;
  const topNow = getTop10ForCountry(popularity, nameById, countryCode, yearLatest).map((x) => x.name_id);
  const topOld = getTop10ForCountry(popularity, nameById, countryCode, yearOld).map((x) => x.name_id);
  if (topNow.length === 0 && topOld.length === 0) return null;
  const setOld = new Set(topOld);
  const setNow = new Set(topNow);
  const intersection = topNow.filter((id) => setOld.has(id)).length;
  const union = new Set([...topNow, ...topOld]).size;
  const jaccardChange = union === 0 ? 0 : 1 - intersection / Math.max(10, union);
  return Math.round(Math.min(100, jaccardChange * 100));
}

/** Direct answer block (40–60 words). Template rotation by hash of name+pair. */
function getDirectAnswer(name, pair, labelA, labelB, rankA, rankB, yearLatest, nameSlug) {
  const seed = (nameSlug + pair.slug).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const hasA = rankA != null;
  const hasB = rankB != null;
  if (hasA && hasB) {
    const templates = [
      `${name} ranks #${rankA} in ${labelA} but #${rankB} in ${labelB} in ${yearLatest}. ${rankA < rankB ? `It is more dominant in ${labelA}, indicating stronger cultural saturation there.` : `It is more popular in ${labelB}, reflecting different regional preferences.`}`,
      `In ${yearLatest}, ${name} holds rank #${rankA} in ${labelA} and #${rankB} in ${labelB}. The rank gap of ${Math.abs(rankA - rankB)} reflects distinct naming trends between the two countries.`,
      `${name} is #${rankA} in ${labelA} and #${rankB} in ${labelB} in ${yearLatest}. While popular in both, the differential suggests varying levels of adoption and cultural resonance.`,
    ];
    return templates[seed % templates.length];
  }
  if (hasA) {
    return `${name} ranks #${rankA} in ${labelA} in ${yearLatest}. We do not yet have official rankings for ${labelB}; our dataset currently covers the United States, United Kingdom, Canada, and Australia. Cultural and linguistic differences often shape naming trends.`;
  }
  if (hasB) {
    return `${name} ranks #${rankB} in ${labelB} in ${yearLatest}. We do not yet have official rankings for ${labelA}. Cross-country comparison will be expanded as more data becomes available.`;
  }
  return `${name} appears in our global name database. Official rank comparison for ${labelA} and ${labelB} is limited to countries we currently track (USA, UK, Canada, Australia).`;
}

/** Trend delta section: rank differential, movement, divergence. */
function getTrendDeltaSection(name, labelA, labelB, rankA, rankB, movA, movB, yearLatest, year2015, seed) {
  const hasA = rankA != null;
  const hasB = rankB != null;
  const rankDelta = hasA && hasB ? Math.abs(rankA - rankB) : null;
  const parts = [];
  if (rankDelta != null) {
    const diffPhrases = [
      `The rank differential is ${rankDelta} position${rankDelta !== 1 ? 's' : ''}.`,
      `There is a ${rankDelta}-place gap between the two countries.`,
    ];
    parts.push(diffPhrases[seed % diffPhrases.length]);
  }
  if (movA != null) {
    const dirA = movA > 0 ? 'rose' : movA < 0 ? 'fell' : 'stayed flat';
    parts.push(`In ${labelA}, ${name} ${dirA} ${Math.abs(movA)} position${Math.abs(movA) !== 1 ? 's' : ''} between ${year2015} and ${yearLatest}.`);
  }
  if (movB != null) {
    const dirB = movB > 0 ? 'rose' : movB < 0 ? 'fell' : 'stayed flat';
    parts.push(`In ${labelB}, it ${dirB} ${Math.abs(movB)} position${Math.abs(movB) !== 1 ? 's' : ''} over the same period.`);
  }
  if (parts.length === 0) {
    parts.push('Rank and movement data are available for our covered countries (USA, UK, Canada, Australia).');
  }
  return '<p class="contextual">' + parts.join(' ') + '</p>';
}

/** Cultural context (min 150 words). Vary by pair. */
function getCulturalContext(pairSlug, labelA, labelB, seed) {
  const blocks = {
    'us-vs-uk': `Naming differences between ${labelA} and ${labelB} reflect shared language with distinct cultural influences. The U.S. has a larger, more diverse population and stronger impact from Hispanic, Asian, and African American naming traditions. The UK retains more classic and royal-associated choices and is often quicker to adopt certain European names. Media and celebrity culture affect both markets but can shift rankings at different speeds. Immigration patterns and religious demographics also shape which names rise in each country. Spelling variants (e.g. -ley vs -leigh) often differ by region.`,
    'us-vs-canada': `${labelA} and ${labelB} share many naming trends due to language and media overlap, but Canadian rankings often reflect stronger French and multicultural influences. Canadian provinces publish separate data, so national lists blend Quebec with the rest of Canada. The U.S. has a larger Hispanic and Asian naming footprint that can push different names into the top. Both countries value short, modern names, but Canada may show slightly more conservative or international choices in some years.`,
    'uk-vs-australia': `${labelA} and ${labelB} share a common linguistic heritage, so many top names overlap. Australia often follows UK trends with a lag and sometimes favors shorter or more casual variants. Indigenous and multicultural naming in Australia adds names that may not rank in the UK. Media and celebrity influence flow both ways but can produce different local peaks. Climate and lifestyle associations sometimes attach to names differently in each market.`,
    'france-vs-spain': `${labelA} and ${labelB} have distinct naming traditions rooted in language, religion, and law. French names often reflect Catholic saints, classical literature, and a preference for certain endings; Spain similarly draws on saints and regional languages (e.g. Catalan, Basque). Immigration and global media have increased overlap, but official rankings still differ significantly. Our dataset currently focuses on English-speaking countries; adding official French and Spanish data would allow precise comparison.`,
    'germany-vs-us': `${labelA} favors compound names, distinct spelling rules, and names that work in German grammar. The U.S. has a much larger Hispanic and diverse population, so Spanish-influenced and multicultural names rank higher there. Religious and regional traditions differ: Germany has strong regional naming customs; the U.S. mixes many traditions. We do not yet have official German rank data; comparison is based on U.S. figures and general cultural observation.`,
  };
  let text = blocks[pairSlug] || `Comparing names across ${labelA} and ${labelB} reveals how language, immigration, and culture shape naming. Our data currently covers the United States, United Kingdom, Canada, and Australia; expansion to more countries will enable fuller comparison.`;
  if (text.split(/\s+/).length < 150) {
    text += ' Official statistics from national registries remain the best source for year-on-year rankings; we aggregate and compare where data is available.';
  }
  return text;
}

function breadcrumbJsonLd(items, pathPrefix) {
  const list = items.map((item, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: item.name,
    item: (item.url && !item.url.startsWith('http') ? SITE_URL + (item.url.startsWith('/') ? item.url : '/' + item.url) : item.url) || SITE_URL + '/',
  }));
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: list };
}

function breadcrumbHtml(items) {
  const links = items.map((item, i) => {
    if (i === items.length - 1) return `<span aria-current="page">${htmlEscape(item.name)}</span>`;
    return `<a href="${htmlEscape(item.url)}">${htmlEscape(item.name)}</a>`;
  });
  return '<nav aria-label="Breadcrumb" class="breadcrumb">' + links.join(' / ') + '</nav>';
}

function baseLayout(opts) {
  const title = opts.title || 'Compare Names | NameOrigin';
  const description = opts.description || 'Compare baby name popularity across countries.';
  const pathSeg = opts.path || '/compare/';
  const canonical = opts.canonical != null ? opts.canonical : SITE_URL + pathSeg;
  const breadcrumbItems = opts.breadcrumb && opts.breadcrumb.length ? opts.breadcrumb : [{ name: 'Home', url: '/' }, { name: 'Compare', url: '/compare/' }];
  const breadcrumbSchema = JSON.stringify(breadcrumbJsonLd(breadcrumbItems));
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
    ${opts.breadcrumbHtml || ''}
    ${opts.mainContent || ''}
  </main>
  <footer class="site-footer" role="contentinfo">
    <div class="container">
      <p class="mb-0"><a href="/">nameorigin.io</a> — Curated name meanings and origins.</p>
    </div>
  </footer>
</body>
</html>`;
}

function run() {
  const names = loadJson('names');
  const popularity = loadJson('popularity');
  if (!names.length || !popularity.length) {
    console.warn('Need data/names.json and data/popularity.json. Run build-popularity first.');
    return;
  }

  const nameById = new Map(names.map((n) => [n.id, n]));
  const years = [...new Set(popularity.map((p) => p.year).filter(Boolean))].sort((a, b) => b - a);
  const yearLatest = years[0] || new Date().getFullYear();
  const year2015 = years.includes(2015) ? 2015 : years.filter((y) => y <= 2015).sort((a, b) => b - a)[0] || yearLatest - 10;

  const top100NameIds = getTop100GlobalNameIds(popularity, names, yearLatest);
  const compareDir = path.join(OUT_DIR, 'compare');
  fs.mkdirSync(compareDir, { recursive: true });

  let pageCount = 0;

  for (const nameId of top100NameIds) {
    const record = nameById.get(nameId);
    if (!record) continue;
    const nameSlug = slug(record.name);
    const name = record.name;

    for (const pair of COUNTRY_PAIRS) {
      const rankA = getRank(popularity, nameId, pair.codeA, yearLatest);
      const rankB = getRank(popularity, nameId, pair.codeB, yearLatest);
      const rankA2015 = getRank(popularity, nameId, pair.codeA, year2015);
      const rankB2015 = getRank(popularity, nameId, pair.codeB, year2015);
      const movA = getMovement(popularity, nameId, pair.codeA, year2015, yearLatest);
      const movB = getMovement(popularity, nameId, pair.codeB, year2015, yearLatest);
      const volA = COUNTRIES_WITH_DATA.has(pair.codeA) ? getVolatility(popularity, nameId, pair.codeA, yearLatest) : null;
      const volB = COUNTRIES_WITH_DATA.has(pair.codeB) ? getVolatility(popularity, nameId, pair.codeB, yearLatest) : null;

      const directAnswer = getDirectAnswer(name, pair, pair.labelA, pair.labelB, rankA, rankB, yearLatest, nameSlug);
      const trendDeltaHtml = getTrendDeltaSection(name, pair.labelA, pair.labelB, rankA, rankB, movA, movB, yearLatest, year2015, (nameSlug + pair.slug).length);
      const culturalText = getCulturalContext(pair.slug, pair.labelA, pair.labelB, nameId);

      const cell = (v) => (v != null && v !== '' ? htmlEscape(String(v)) : '—');
      const tableHtml = `
    <table class="compare-table" aria-label="Comparison metrics">
      <thead><tr><th>Metric</th><th>${htmlEscape(pair.labelA)}</th><th>${htmlEscape(pair.labelB)}</th></tr></thead>
      <tbody>
        <tr><td>Rank ${yearLatest}</td><td>${cell(rankA)}</td><td>${cell(rankB)}</td></tr>
        <tr><td>Rank ${year2015}</td><td>${cell(rankA2015)}</td><td>${cell(rankB2015)}</td></tr>
        <tr><td>10-Year Movement</td><td>${movA != null ? (movA > 0 ? '+' : '') + movA : '—'}</td><td>${movB != null ? (movB > 0 ? '+' : '') + movB : '—'}</td></tr>
        <tr><td>Popularity Delta</td><td>${rankA != null && rankB != null ? Math.abs(rankA - rankB) : '—'}</td><td>—</td></tr>
        <tr><td>Volatility Index</td><td>${cell(volA)}</td><td>${cell(volB)}</td></tr>
      </tbody>
    </table>`;

      // Internal mesh: name (1), 2 popularity years (2), names-like (1), compatibility (1), country A/B (2), gender (1), 3 related compare (3), 2 similar names (2), home + compare hub (2) = 15+
      const popularityYear1 = yearLatest;
      const popularityYear2 = yearLatest - 1;
      const otherNameIds = top100NameIds.filter((id) => id !== nameId);
      const similarTwo = otherNameIds.slice(0, 2).map((id) => nameById.get(id)).filter(Boolean);
      const threeRelatedIds = otherNameIds.slice(2, 5);
      const threeRelated = threeRelatedIds.map((id) => nameById.get(id)).filter(Boolean);

      const countryIndexPath = (code) => {
        const m = { USA: 'usa', UK: 'uk', CAN: 'canada', AUS: 'australia', FRA: 'france', ESP: 'spain', GER: 'germany' };
        return '/names/' + (m[code] || code.toLowerCase()) + EXT;
      };

      const meshLinks = [
        `<a href="${nameDetailPath(name)}">${htmlEscape(name)}</a>`,
        `<a href="/popularity/${popularityYear1}${EXT}">${popularityYear1}</a>`,
        `<a href="/popularity/${popularityYear2}${EXT}">${popularityYear2}</a>`,
        `<a href="${namesLikePath(name)}">Names like ${htmlEscape(name)}</a>`,
        `<a href="/compatibility/">Compatibility tool</a>`,
        `<a href="${countryIndexPath(pair.codeA)}">${htmlEscape(pair.labelA)} names</a>`,
        `<a href="${countryIndexPath(pair.codeB)}">${htmlEscape(pair.labelB)} names</a>`,
        `<a href="/names/${(record.gender || 'boy')}${EXT}">${(record.gender || 'boy').charAt(0).toUpperCase() + (record.gender || 'boy').slice(1)} names</a>`,
        ...threeRelated.map((n) => `<a href="/compare/${slug(n.name)}/${pair.slug}/">${htmlEscape(n.name)}: ${pair.labelA} vs ${pair.labelB}</a>`),
        ...similarTwo.map((n) => `<a href="/compare/${slug(n.name)}/${pair.slug}/">${htmlEscape(n.name)}</a>`),
        '<a href="/">Home</a>',
        '<a href="/compare/">Compare by country</a>',
      ].filter(Boolean);

      const mainContent = `
    <h1>${htmlEscape(name)}: ${htmlEscape(pair.labelA)} vs ${htmlEscape(pair.labelB)}</h1>
    <p class="direct-answer">${htmlEscape(directAnswer)}</p>

    <section aria-labelledby="compare-table-heading">
      <h2 id="compare-table-heading">Comparison table</h2>
      ${tableHtml}
    </section>

    <section aria-labelledby="trend-delta-heading">
      <h2 id="trend-delta-heading">Trend and movement</h2>
      ${trendDeltaHtml}
    </section>

    <section aria-labelledby="cultural-heading">
      <h2 id="cultural-heading">Cultural context</h2>
      <p class="contextual">${htmlEscape(culturalText)}</p>
    </section>

    <section aria-labelledby="mesh-heading">
      <h2 id="mesh-heading">Explore more</h2>
      <p class="internal-links">${meshLinks.join(' · ')}</p>
    </section>`;

      const pathSeg = `/compare/${nameSlug}/${pair.slug}/`;
      const breadcrumbItems = [
        { name: 'Home', url: '/' },
        { name: 'Compare', url: '/compare/' },
        { name: name, url: nameDetailPath(name) },
        { name: `${pair.labelA} vs ${pair.labelB}`, url: pathSeg },
      ];
      const breadcrumbItemsRelative = breadcrumbItems.map((i) => ({ ...i, url: i.url.startsWith('http') ? i.url.replace(SITE_URL, '') : i.url }));

      const html = baseLayout({
        title: `${name}: ${pair.labelA} vs ${pair.labelB} | NameOrigin`,
        description: directAnswer.slice(0, 155),
        path: pathSeg,
        canonical: SITE_URL + pathSeg,
        breadcrumb: breadcrumbItems,
        breadcrumbHtml: breadcrumbHtml(breadcrumbItemsRelative),
        mainContent,
      });

      const outPath = path.join(compareDir, nameSlug, pair.slug, 'index.html');
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, html, 'utf8');
      pageCount++;
    }
  }

  // MODULE B — Country vs Country overview pages: /compare/{pair}/ (high authority)
  const yearOld = yearLatest - 10;
  for (const pair of COUNTRY_PAIRS) {
    const top10A = getTop10ForCountry(popularity, nameById, pair.codeA, yearLatest);
    const top10B = getTop10ForCountry(popularity, nameById, pair.codeB, yearLatest);
    const overlap = top10A.length && top10B.length ? getOverlap(top10A, top10B) : 0;
    const overlapPct = Math.round(overlap * 100);
    const phonetic = getPhoneticSimilarity(top10A, top10B, nameById);
    const origin = getOriginOverlap(top10A, top10B, nameById);
    const similarityScore = getSimilarityScore(overlap, phonetic, origin);
    const volA = getPopularityVolatility(popularity, nameById, pair.codeA, yearLatest);
    const volB = getPopularityVolatility(popularity, nameById, pair.codeB, yearLatest);
    const volAvg = (volA != null && volB != null) ? Math.round((volA + volB) / 2) : (volA != null ? volA : volB);

    const tableRows = [];
    for (let r = 0; r < 10; r++) {
      const a = top10A[r];
      const b = top10B[r];
      const nameA = a ? `<a href="${nameDetailPath(a.name)}">${htmlEscape(a.name)}</a>` : '—';
      const nameB = b ? `<a href="${nameDetailPath(b.name)}">${htmlEscape(b.name)}</a>` : '—';
      tableRows.push(`<tr><td>${r + 1}</td><td>${nameA}</td><td>${nameB}</td></tr>`);
    }
    const top10Table = `
    <table class="compare-table" aria-label="Top 10 names comparison">
      <thead><tr><th>Rank</th><th>${htmlEscape(pair.labelA)}</th><th>${htmlEscape(pair.labelB)}</th></tr></thead>
      <tbody>${tableRows.join('')}</tbody>
    </table>
    <p class="contextual"><strong>Top 10 overlap:</strong> ${top10A.length && top10B.length ? overlapPct + '%' : 'N/A'} (${top10A.length && top10B.length ? (overlap * 10).toFixed(0) + ' of 10 names appear in both lists' : 'rank data available for USA, UK, Canada, Australia only'}).</p>`;

    const methodology = `Our Naming Similarity Index (0–100) combines three components: (1) <strong>Shared top 10</strong> — the percentage of names that appear in both countries' top 10 lists (40% weight). (2) <strong>Phonetic similarity</strong> — how often top names share first-letter and syllable-count patterns (30% weight). (3) <strong>Origin cluster overlap</strong> — how many names share the same origin country or language in our database (30% weight). Higher scores indicate more similar naming cultures.`;
    const volatilityCopy = volAvg != null
      ? `The Popularity Volatility Index measures how much each country's top 10 names changed over the past 10 years (${yearOld}–${yearLatest}). A higher score (more turnover) suggests a more trend-driven naming culture; a lower score suggests more traditional, stable preferences. For this pair, the average volatility is <strong>${volAvg}</strong> out of 100.`
      : `Volatility is computed from official rank data. We currently have multi-year data for the United States, United Kingdom, Canada, and Australia; volatility for other pairs will appear as data is added.`;

    const allNamesFromTable = [...new Set([...top10A.map((x) => x.name), ...top10B.map((x) => x.name)])].filter(Boolean);
    const nameLinks = allNamesFromTable.slice(0, 20).map((n) => `<a href="${nameDetailPath(n)}">${htmlEscape(n)}</a>`);
    const trendingLinks = [
      `<a href="/names/trending${EXT}">Trending names</a>`,
      `<a href="/names/popular${EXT}">Top names</a>`,
      `<a href="/popularity/${yearLatest}${EXT}">Popularity ${yearLatest}</a>`,
    ];
    const threeComparePages = allNamesFromTable.length >= 3
      ? allNamesFromTable.slice(0, 3).map((n) => `<a href="/compare/${slug(n)}/${pair.slug}/">${htmlEscape(n)}: ${pair.labelA} vs ${pair.labelB}</a>`)
      : top100NameIds.slice(0, 3).map((id) => {
          const rec = nameById.get(id);
          return rec ? `<a href="/compare/${slug(rec.name)}/${pair.slug}/">${htmlEscape(rec.name)}</a>` : null;
        }).filter(Boolean);
    const countryIndexPath = (code) => {
      const m = { USA: 'usa', UK: 'uk', CAN: 'canada', AUS: 'australia', FRA: 'france', ESP: 'spain', GER: 'germany' };
      return '/names/' + (m[code] || code.toLowerCase()) + EXT;
    };
    const categoryLinks = [
      `<a href="/names/boy${EXT}">Boy names</a>`,
      `<a href="/names/girl${EXT}">Girl names</a>`,
      `<a href="/names/style${EXT}">Names by style</a>`,
      `<a href="/names/letters${EXT}">Browse by letter</a>`,
      `<a href="${countryIndexPath(pair.codeA)}">${htmlEscape(pair.labelA)} names</a>`,
      `<a href="${countryIndexPath(pair.codeB)}">${htmlEscape(pair.labelB)} names</a>`,
      '<a href="/compatibility/">Compatibility tool</a>',
      '<a href="/names/with-last-name${EXT}">Last name fit</a>',
      '<a href="/compare/">Compare hub</a>',
      '<a href="/">Home</a>',
    ];
    const overviewMesh = [...nameLinks, ...trendingLinks, ...threeComparePages, ...categoryLinks].filter(Boolean);

    const overviewContent = `
    <h1>${htmlEscape(pair.labelA)} vs ${htmlEscape(pair.labelB)}: Baby Name Comparison</h1>
    <p class="contextual">Side-by-side comparison of top baby names and naming culture between ${pair.labelA} and ${pair.labelB}. Based on official rankings where available.</p>

    <section aria-labelledby="top10-heading">
      <h2 id="top10-heading">Top 10 names comparison</h2>
      ${top10Table}
    </section>

    <section aria-labelledby="similarity-heading">
      <h2 id="similarity-heading">Naming Similarity Index</h2>
      <p class="contextual"><strong>Similarity score: ${similarityScore}/100</strong></p>
      <p class="contextual">${methodology}</p>
    </section>

    <section aria-labelledby="volatility-heading">
      <h2 id="volatility-heading">Popularity Volatility Index</h2>
      <p class="contextual">${volatilityCopy}</p>
    </section>

    <section aria-labelledby="explore-heading">
      <h2 id="explore-heading">Explore more</h2>
      <p class="internal-links">${overviewMesh.join(' · ')}</p>
    </section>`;

    const overviewPath = `/compare/${pair.slug}/`;
    const overviewBreadcrumb = [
      { name: 'Home', url: '/' },
      { name: 'Compare', url: '/compare/' },
      { name: `${pair.labelA} vs ${pair.labelB}`, url: overviewPath },
    ];
    const overviewHtml = baseLayout({
      title: `${pair.labelA} vs ${pair.labelB} Baby Names | NameOrigin`,
      description: `Compare top 10 baby names and naming similarity between ${pair.labelA} and ${pair.labelB}. Overlap, volatility, and cultural comparison.`,
      path: overviewPath,
      canonical: SITE_URL + overviewPath,
      breadcrumb: overviewBreadcrumb,
      breadcrumbHtml: breadcrumbHtml(overviewBreadcrumb),
      mainContent: overviewContent,
    });
    fs.mkdirSync(path.join(compareDir, pair.slug), { recursive: true });
    fs.writeFileSync(path.join(compareDir, pair.slug, 'index.html'), overviewHtml, 'utf8');
    pageCount++;
  }

  // Compare hub: /compare/index.html (sample links use first top-100 name so they exist)
  const firstTopName = nameById.get(top100NameIds[0]);
  const firstSlug = firstTopName ? slug(firstTopName.name) : 'liam';
  const hubOverviewLinks = COUNTRY_PAIRS.map((p) => `<a href="/compare/${p.slug}/">${htmlEscape(p.labelA)} vs ${htmlEscape(p.labelB)}</a>`).join(' · ');
  const hubNameLinks = COUNTRY_PAIRS.map((p) => `<a href="/compare/${firstSlug}/${p.slug}/">${htmlEscape(firstTopName ? firstTopName.name : 'Liam')}: ${htmlEscape(p.labelA)} vs ${htmlEscape(p.labelB)}</a>`).join(' · ');
  const hubBreadcrumb = [{ name: 'Home', url: '/' }, { name: 'Compare', url: '/compare/' }];
  const hubHtml = baseLayout({
    title: 'Compare Baby Names by Country | NameOrigin',
    description: 'Compare how baby names rank in the United States, UK, Canada, Australia, and more. Side-by-side rankings and trends.',
    path: '/compare/',
    canonical: SITE_URL + '/compare/',
    breadcrumb: hubBreadcrumb,
    breadcrumbHtml: breadcrumbHtml(hubBreadcrumb),
    mainContent: `
    <h1>Compare baby names by country</h1>
    <p class="contextual">See how the same name ranks in different countries. Compare top 10 lists and naming similarity by country pair.</p>
    <section aria-labelledby="overview-heading">
      <h2 id="overview-heading">Country vs country overview</h2>
      <p class="internal-links">${hubOverviewLinks}</p>
    </section>
    <section aria-labelledby="pairs-heading">
      <h2 id="pairs-heading">Name-by-name comparison</h2>
      <p class="internal-links">${hubNameLinks}</p>
    </section>
    <section aria-labelledby="jurisdiction-compare-heading">
      <h2 id="jurisdiction-compare-heading">State vs state / Province vs province</h2>
      <p class="internal-links"><a href="/compare/california-vs-texas/">California vs Texas</a> · <a href="/compare/california-vs-florida/">California vs Florida</a> · <a href="/compare/texas-vs-florida/">Texas vs Florida</a> · <a href="/compare/alberta-vs-ontario/">Alberta vs Ontario</a> · <a href="/compare/alberta-vs-quebec/">Alberta vs Quebec</a> · <a href="/compare/ontario-vs-quebec/">Ontario vs Quebec</a></p>
    </section>
    <section aria-labelledby="browse-heading">
      <h2 id="browse-heading">Browse</h2>
      <p class="internal-links">
        <a href="/">Home</a> · <a href="/names">All names</a> · <a href="/popularity/">Popularity by year</a> · <a href="/names/trending${EXT}">Trending names</a> · <a href="/compatibility/">Compatibility tool</a>
      </p>
    </section>
  `,
  });
  fs.writeFileSync(path.join(compareDir, 'index.html'), hubHtml, 'utf8');
  pageCount++;

  console.log('Phase 2.8: generated', pageCount, 'compare pages (hub +', COUNTRY_PAIRS.length, 'country-vs-country overviews + name comparisons). Cap:', MAX_PAGES);
}

run();
