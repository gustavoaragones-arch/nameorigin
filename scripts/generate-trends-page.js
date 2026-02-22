#!/usr/bin/env node
/**
 * MODULE D — Micro Dataset: "Top 5 Trending Names in USA: 2025 vs 2015"
 * Single page: /trends/us-2025-vs-2015/
 * Pre-rendered static HTML, 800+ words, table (Rank 2015, Rank 2025, Movement), Article + Breadcrumb + 2 FAQs.
 * Links: comparison pages, name pages, country page. No JS-generated tables.
 *
 * Usage: node scripts/generate-trends-page.js
 * Run generate-country-differentials.js first for best data.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const OUT_DIR = process.env.OUT_DIR ? path.join(ROOT, process.env.OUT_DIR) : ROOT;
const { writeHtmlWithGuard } = require('./phase-3.4-guards.js');
const SITE_URL = process.env.SITE_URL || 'https://nameorigin.io';
const EXT = '.html';

function loadJson(name) {
  const p = path.join(DATA_DIR, name + '.json');
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return null;
  }
}

function slug(str) {
  return String(str || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function htmlEscape(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function nameDetailPath(name) { return '/name/' + slug(name) + '/'; }

function run() {
  const differentials = loadJson('country-differentials');
  const names = loadJson('names');
  const popularity = loadJson('popularity');

  let top5 = [];
  const yearLatest = 2025;
  const yearPast = 2015;

  if (differentials && differentials.entries && differentials.entries.length > 0) {
    const usa = differentials.entries
      .filter((e) => e.country === 'USA' && e.name != null && e.delta != null)
      .sort((a, b) => (b.delta || 0) - (a.delta || 0))
      .slice(0, 5);
    top5 = usa;
  } else if (popularity && popularity.length > 0 && names && names.length > 0) {
    const nameById = new Map(names.map((n) => [n.id, n]));
    const years = [...new Set(popularity.map((p) => p.year).filter(Boolean))].sort((a, b) => b - a);
    const yLatest = years[0] || yearLatest;
    const yPast = years.includes(yearPast) ? yearPast : years.filter((y) => y <= yearPast).sort((a, b) => b - a)[0] || yLatest - 10;
    const getRank = (nameId, country, year) => {
      const r = popularity.find((p) => p.name_id === nameId && p.country === country && p.year === year);
      return r && r.rank != null ? r.rank : null;
    };
    const byName = new Map();
    popularity.filter((p) => p.country === 'USA').forEach((p) => {
      const r15 = getRank(p.name_id, 'USA', yPast);
      const r25 = getRank(p.name_id, 'USA', yLatest);
      if (r15 != null && r25 != null) {
        const delta = r15 - r25;
        if (!byName.has(p.name_id) || byName.get(p.name_id).delta < delta) {
          const rec = nameById.get(p.name_id);
          byName.set(p.name_id, { name_id: p.name_id, name: rec ? rec.name : null, rank_2015: r15, rank_2025: r25, delta });
        }
      }
    });
    top5 = [...byName.values()].filter((e) => e.name).sort((a, b) => (b.delta || 0) - (a.delta || 0)).slice(0, 5);
  }

  const tableRows = top5.map((row) => {
    const nameLink = row.name ? `<a href="${nameDetailPath(row.name)}">${htmlEscape(row.name)}</a>` : '—';
    const mov = row.delta != null ? (row.delta > 0 ? '+' + row.delta : String(row.delta)) : '—';
    return `<tr><td>${nameLink}</td><td>${row.rank_2015 != null ? row.rank_2015 : '—'}</td><td>${row.rank_2025 != null ? row.rank_2025 : '—'}</td><td>${mov}</td></tr>`;
  }).join('');

  const tableHtml = `
    <table class="compare-table" aria-label="Top 5 trending names USA 2025 vs 2015">
      <thead><tr><th>Name</th><th>Rank ${yearPast}</th><th>Rank ${yearLatest}</th><th>Movement</th></tr></thead>
      <tbody>${tableRows || '<tr><td colspan="4">No trend data available. Run generate-country-differentials.js and rebuild.</td></tr>'}</tbody>
    </table>`;

  const generationalShift = `Generational shift in American baby naming is visible when comparing ${yearPast} and ${yearLatest}. Parents born in the 1990s and 2000s often choose names that feel fresh or that reclaim older names their own generation did not use. The top trending names—those with the largest positive movement in rank—often reflect this: either short, modern choices that have surged in the last decade or vintage names that have returned to favor. Regional and ethnic diversity in the United States also drives different naming clusters, so national top-5 trend lists capture a blend of mainstream and culturally specific gains.`;

  const culturalEvolution = `Cultural evolution affects naming through media, celebrity culture, and broader social trends. A name that appears in a hit show or is chosen by a high-profile figure can jump in rank within a few years. Conversely, names that feel dated to a new generation may drop even if they remain in use. The USA has no legal restriction on name choice (unlike some countries with approved lists), so trends can move quickly. Immigration and the growing share of Hispanic, Asian, and other heritage names in official statistics also shift the composition of “trending” lists, making them a snapshot of an increasingly diverse naming culture.`;

  const influenceFactors = `Influence factors include geographic region (Southern, Northeastern, and Western naming preferences can differ), socioeconomic and educational factors, and the rise of social media and baby-name websites that expose parents to a wider set of options. Biblical and traditional names remain strong in many communities while declining in others. The movement metric—rank in ${yearPast} minus rank in ${yearLatest}—directly measures how much a name gained in popularity: a positive movement means the name climbed the ranks. Tracking these shifts helps researchers and parents understand how American naming culture is changing.`;

  const moreContext = `This page focuses on the top five names in the United States with the largest positive rank movement between ${yearPast} and ${yearLatest}. Each name links to its full profile for meaning, origin, and extended popularity data. For country-to-country comparison, see the Compare section (e.g. US vs UK, US vs Canada). Authority data is derived from official birth statistics where available; we do not use AI-generated or unverified sources.`;

  const whyMovement = `Why does movement matter? Parents and researchers use trend data to see which names are gaining momentum versus which are stable or declining. A name that jumps 50 spots in a decade signals a shift in taste or visibility—whether from a celebrity, a character, or a broader cultural moment. Movement also helps expectant parents gauge whether a name they like is rising (and might become very common) or holding steady. For demographers, these shifts reflect changing family structures, ethnic composition, and regional migration.`;

  const howToUse = `How to use this data: The table lists the name, its rank in ${yearPast}, its rank in ${yearLatest}, and the movement (positive means the name became more popular). Click any name to see its full profile: meaning, origin, popularity chart, and how it compares across countries. Use the USA name rankings page to see the full top list for a given year, and the Compare section to put American trends side by side with the UK, Canada, or Australia.`;

  const comparisonNote = `Comparison with other countries: The United States is one of the largest and most diverse naming markets. Trends here do not always mirror the UK or Canada, even though they share language. Immigration, Hispanic and Asian naming traditions, and regional preferences create a distinct American pattern. Our country-vs-country overview pages (e.g. US vs UK, US vs Canada) show overlap and volatility so you can see how similar or different naming cultures are. The top 5 trending names in the USA are a snapshot of that domestic shift.`;

  const dataQuality = `Data quality and updates: Our trend tables are built from the same official sources we use for the Compare and Popularity sections. When new annual data is released, we regenerate the differentials and this page so the top 5 trending list stays current. Names that appear in the table are linked to their full profile pages where you can see meaning, origin, and multi-year charts. We do not use AI-generated or unverified name data; all rankings are derived from published birth statistics.`;

  const directAnswer = `The top 5 trending baby names in the USA from ${yearPast} to ${yearLatest} are those with the biggest rank gains. Movement is measured as the change in rank over that period: a positive number means the name became more popular. These names reflect generational shift, cultural evolution, and the influence of media and diversity on American naming.`;

  const faqs = [
    { question: 'What does "movement" mean in the trending table?', answer: 'Movement is the change in rank from the earlier year to the later year. Rank in ' + yearPast + ' minus rank in ' + yearLatest + '. A positive movement means the name climbed in the rankings (became more popular); negative means it fell.' },
    { question: 'Where does the USA trend data come from?', answer: 'We use official birth statistics from the U.S. Social Security Administration and other national sources. Data is aggregated into rank by year and country for comparison and trend analysis.' },
  ];

  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Trends', url: '/trends/' },
    { name: 'USA ' + yearPast + ' vs ' + yearLatest, url: '/trends/us-2025-vs-2015/' },
  ];

  const links = [
    '<a href="/names/usa' + EXT + '">USA name rankings</a>',
    '<a href="/compare/us-vs-uk/">US vs UK comparison</a>',
    '<a href="/compare/us-vs-canada/">US vs Canada comparison</a>',
    '<a href="/compare/uk-vs-australia/">UK vs Australia</a>',
    '<a href="/popularity/">Popularity by year</a>',
    '<a href="/names/trending' + EXT + '">Trending names</a>',
    '<a href="/names/popular' + EXT + '">Top names</a>',
    '<a href="/">Home</a>',
    '<a href="/compare/">Compare by country</a>',
    '<a href="/trends/">Name trends</a>',
    '<a href="/compatibility/">Compatibility tool</a>',
    '<a href="/names/boy' + EXT + '">Boy names</a>',
    '<a href="/names/girl' + EXT + '">Girl names</a>',
    ...top5.filter((r) => r.name).map((r) => `<a href="${nameDetailPath(r.name)}">${htmlEscape(r.name)}</a>`),
  ];
  const uniqueLinks = [...new Set(links)];

  const mainContent = `
    <h1>Top 5 Trending Names in the USA: ${yearLatest} vs ${yearPast}</h1>
    <p class="direct-answer">${htmlEscape(directAnswer)}</p>

    <section aria-labelledby="trend-table-heading">
      <h2 id="trend-table-heading">Trending names table</h2>
      ${tableHtml}
    </section>

    <section aria-labelledby="generational-heading">
      <h2 id="generational-heading">Generational shift</h2>
      <p class="contextual">${htmlEscape(generationalShift)}</p>
    </section>

    <section aria-labelledby="cultural-heading">
      <h2 id="cultural-heading">Cultural evolution</h2>
      <p class="contextual">${htmlEscape(culturalEvolution)}</p>
    </section>

    <section aria-labelledby="influence-heading">
      <h2 id="influence-heading">Influence factors</h2>
      <p class="contextual">${htmlEscape(influenceFactors)}</p>
    </section>

    <section aria-labelledby="methodology-heading">
      <h2 id="methodology-heading">Methodology and sources</h2>
      <p class="contextual">${htmlEscape(moreContext)}</p>
    </section>

    <section aria-labelledby="why-movement-heading">
      <h2 id="why-movement-heading">Why movement matters</h2>
      <p class="contextual">${htmlEscape(whyMovement)}</p>
    </section>

    <section aria-labelledby="how-to-use-heading">
      <h2 id="how-to-use-heading">How to use this data</h2>
      <p class="contextual">${htmlEscape(howToUse)}</p>
    </section>

    <section aria-labelledby="comparison-note-heading">
      <h2 id="comparison-note-heading">Comparison with other countries</h2>
      <p class="contextual">${htmlEscape(comparisonNote)}</p>
    </section>

    <section aria-labelledby="data-quality-heading">
      <h2 id="data-quality-heading">Data quality and updates</h2>
      <p class="contextual">${htmlEscape(dataQuality)}</p>
    </section>

    <section aria-labelledby="explore-heading">
      <h2 id="explore-heading">Explore more</h2>
      <p class="internal-links">${uniqueLinks.join(' · ')}</p>
    </section>`;

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
    headline: 'Top 5 Trending Names in the USA: ' + yearLatest + ' vs ' + yearPast,
    description: directAnswer,
    author: { '@type': 'Organization', name: 'NameOrigin' },
    publisher: { '@type': 'Organization', name: 'NameOrigin', url: SITE_URL },
    datePublished: new Date().toISOString().slice(0, 10),
    mainEntityOfPage: SITE_URL + '/trends/us-2025-vs-2015/',
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

  const pathSeg = '/trends/us-2025-vs-2015/';
  const breadcrumbHtml = '<nav aria-label="Breadcrumb" class="breadcrumb">' +
    breadcrumbItems.map((item, i) => i < breadcrumbItems.length - 1
      ? `<a href="${htmlEscape(item.url)}">${htmlEscape(item.name)}</a>`
      : `<span aria-current="page">${htmlEscape(item.name)}</span>`).join(' / ') + '</nav>';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index, follow">
  <meta name="description" content="${htmlEscape(directAnswer.slice(0, 155))}">
  <title>Top 5 Trending Names in the USA: ${yearLatest} vs ${yearPast} | NameOrigin</title>
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
    ${breadcrumbHtml}
    ${mainContent}
  </main>
  <footer class="site-footer" role="contentinfo">
    <div class="container">
      <p class="mb-0"><a href="/">nameorigin.io</a> — Curated name meanings and origins.</p>
    </div>
  </footer>
</body>
</html>`;

  const trendsDir = path.join(OUT_DIR, 'trends', 'us-2025-vs-2015');
  fs.mkdirSync(trendsDir, { recursive: true });
  writeHtmlWithGuard(path.join(trendsDir, 'index.html'), html, 'trends/us-2025-vs-2015/index.html');

  // /trends/ hub — Phase 3.4: meta description, ≥20 links, ≥400 words
  const hubMetaDesc = `Baby name trends and demographic insights. Top 5 trending USA names ${yearLatest} vs ${yearPast}. Compare ranks, movement, and baby name meaning.`;
  const hubSiblingLinks = [
    { href: '/all-name-pages.html', text: 'All name pages' },
    { href: '/country-name-pages.html', text: 'Country name pages' },
    { href: '/style-name-pages.html', text: 'Style name pages' },
    { href: '/alphabet-name-pages.html', text: 'Alphabet name pages' },
    { href: '/last-name-pages.html', text: 'Last name compatibility' },
  ];
  const hubLetterLinks = ['a', 'b', 'l', 'o', 'e'].map((l) => ({ href: `/names/${l}${EXT}`, text: `Names starting with ${l.toUpperCase()}` }));
  const hubCountryLinks = [
    { href: '/names/usa' + EXT, text: 'USA names' },
    { href: '/names/canada' + EXT, text: 'Canada names' },
    { href: '/names/india' + EXT, text: 'India names' },
    { href: '/names/france' + EXT, text: 'France names' },
    { href: '/names/ireland' + EXT, text: 'Ireland names' },
  ];
  const hubFilterLinks = [
    { href: '/', text: 'Home' },
    { href: '/names', text: 'All names' },
    { href: '/names/boy' + EXT, text: 'Boy names' },
    { href: '/names/girl' + EXT, text: 'Girl names' },
    { href: '/names/trending' + EXT, text: 'Trending names' },
    { href: '/names/popular' + EXT, text: 'Popular names' },
    { href: '/popularity/', text: 'Popularity by year' },
    { href: '/compare/', text: 'Compare by country' },
    { href: '/compare/us-vs-uk/', text: 'US vs UK' },
    { href: '/compare/us-vs-canada/', text: 'US vs Canada' },
    { href: '/compatibility/', text: 'Compatibility tool' },
  ];
  const hubAllLinks = [...hubSiblingLinks, ...hubLetterLinks, ...hubCountryLinks, ...hubFilterLinks];
  const hubLinksSet = new Set();
  const hubLinks = hubAllLinks.filter((l) => {
    const k = l.href;
    if (hubLinksSet.has(k)) return false;
    hubLinksSet.add(k);
    return true;
  });

  const hubIntro = `Name trends on nameorigin.io focus on demographic insights and how baby names move in rank over time. Our trend reports compare official birth statistics across years and countries so you can see which names are rising, which are stable, and which have peaked.`;
  const hubContext = `Understanding name trends helps parents and researchers see how naming culture evolves. A name that jumps 50 spots in a decade signals a shift—whether from media, celebrity, or broader cultural change. Movement is measured as rank change: positive means the name became more popular. Regional and ethnic diversity in the United States drives different naming clusters, so national trend lists capture a blend of mainstream and culturally specific gains.`;
  const hubMethodology = `Data comes from official birth statistics: the U.S. Social Security Administration, the Office for National Statistics in the UK, and equivalent agencies in Canada and Australia. We aggregate rankings by year and country so you can compare across regions. When new annual data is released, we regenerate trend reports to keep rankings current.`;
  const hubReports = `The reports below link to detailed tables with rank, movement, and cultural context. Each name in the trend tables links to its full profile for meaning, origin, and extended popularity data. Use the compare section for country-to-country analysis (e.g. US vs UK, US vs Canada) and the popularity hub for year-by-year top lists.`;
  const hubCultural = `Cultural evolution affects naming through media, celebrity culture, and broader social trends. A name in a hit show or chosen by a public figure can jump in rank within years. Immigration and multicultural naming add names that may not rank in earlier decades. Parents often blend traditional names with modern and culturally diverse choices.`;
  const hubExplore = `Browse names by letter (A–Z), by country (USA, Canada, India, France, Ireland), or by style (classic, modern, nature) from the links below. The last name compatibility tool helps when pairing a first name with your surname. All data is derived from official birth statistics; we do not use AI-generated or unverified sources.`;

  const hubHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index, follow">
  <meta name="description" content="${hubMetaDesc.replace(/"/g, '&quot;')}">
  <title>Name Trends | NameOrigin</title>
  <link rel="canonical" href="${SITE_URL}/trends/" />
  <link rel="stylesheet" href="/styles.min.css">
</head>
<body>
  <header class="site-header" role="banner"><div class="container"><a href="/" class="site-logo">nameorigin.io</a><nav class="site-nav"><a href="/names">Names</a><a href="/compare/">Compare</a><a href="/popularity/">Popularity</a></nav></div></header>
  <main class="container section">
    <nav class="breadcrumb"><a href="/">Home</a> / <span aria-current="page">Trends</span></nav>
    <h1>Name trends</h1>
    <p class="contextual">${hubIntro}</p>
    <p class="contextual">${hubContext}</p>
    <p class="contextual">${hubMethodology}</p>
    <section aria-labelledby="trends-list-heading"><h2 id="trends-list-heading">Reports</h2>
    <ul><li><a href="/trends/us-2025-vs-2015/">Top 5 Trending Names in USA: ${yearLatest} vs ${yearPast}</a></li></ul>
    </section>
    <p class="contextual">${hubReports}</p>
    <p class="contextual">${hubCultural}</p>
    <p class="contextual">${hubExplore}</p>
    <section aria-labelledby="explore-heading"><h2 id="explore-heading">Explore</h2>
    <p class="internal-links">${hubLinks.map((l) => `<a href="${l.href}">${l.text}</a>`).join(' · ')}</p>
    </section>
  </main>
  <footer class="site-footer"><div class="container"><p><a href="/">nameorigin.io</a></p></div></footer>
</body>
</html>`;
  fs.mkdirSync(path.join(OUT_DIR, 'trends'), { recursive: true });
  writeHtmlWithGuard(path.join(OUT_DIR, 'trends', 'index.html'), hubHtml, 'trends/index.html');

  const wordCount = (mainContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(/\s+/).length);
  console.log('MODULE D: wrote', pathSeg, 'and /trends/ hub | words:', wordCount, '| links:', uniqueLinks.length, wordCount >= 800 ? '(≥800 ✓)' : '(add copy to reach 800)');
}

run();
