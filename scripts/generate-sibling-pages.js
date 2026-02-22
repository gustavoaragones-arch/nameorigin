#!/usr/bin/env node
/**
 * Phase 3.0 — Sibling Harmony Compatibility Engine™
 * Generates /names/{name}/siblings/ for top 150 names.
 *
 * URL: /names/{name}/siblings/ (e.g. /names/liam/siblings/)
 *
 * Discipline:
 *   - Top 150 names only (initial rollout)
 *   - 700+ words, 18+ internal links
 *   - Harmony table, explanation, contrast section
 *   - HowTo + FAQ (max 2) + Article schema
 *
 * Usage: node scripts/generate-sibling-pages.js [--batch=150]
 */

const fs = require('fs');
const path = require('path');
const { getTopSiblingMatches } = require('./generate-sibling-harmony.js');
const { namesLikeUrl } = require('./url-helpers.js');

let siblingRenderer;
try {
  siblingRenderer = require('./sibling-explanation-renderer.js');
} catch (_) {
  siblingRenderer = null;
}

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const OUT_DIR = process.env.OUT_DIR ? path.join(ROOT, process.env.OUT_DIR) : ROOT;
const SITE_URL = process.env.SITE_URL || 'https://nameorigin.io';
const EXT = '.html';
const MIN_WORD_COUNT = 700;
const MIN_LINKS = 18;
const TOP_NAMES_LIMIT = 150;

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
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function nameDetailPath(s) { return '/name/' + slug(s) + '/'; }

function countWordsInHtml(html) {
  if (!html) return 0;
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.split(/\s+/).filter(Boolean).length;
}

function getTopPopularNameIds(popularity, limit = 150) {
  const usa = (popularity || []).filter((p) => p.country === 'USA' && p.rank != null);
  const byYear = new Map();
  usa.forEach((r) => {
    const y = r.year || 0;
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(r);
  });
  const latestYear = Math.max(0, ...byYear.keys());
  const latest = byYear.get(latestYear) || [];
  latest.sort((a, b) => (a.rank || 9999) - (b.rank || 9999));
  return latest.slice(0, limit).map((r) => r.name_id);
}

function breadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: (item.url && !item.url.startsWith('http')) ? SITE_URL + (item.url.startsWith('/') ? item.url : '/' + item.url) : (item.url || SITE_URL + '/'),
    })),
  };
}

function breadcrumbHtml(items) {
  return items.map((item, i) => {
    const url = item.url && !item.url.startsWith('http') ? (item.url.startsWith('/') ? item.url : '/' + item.url) : item.url || '/';
    if (i === items.length - 1) return `<span aria-current="page">${htmlEscape(item.name)}</span>`;
    return `<a href="${htmlEscape(url)}">${htmlEscape(item.name)}</a>`;
  }).join(' / ');
}

function coreLinksHtml() {
  const links = [
    { href: '/', text: 'Home' },
    { href: '/names', text: 'All names' },
    { href: '/names/boy' + EXT, text: 'Boy names' },
    { href: '/names/girl' + EXT, text: 'Girl names' },
    { href: '/names/unisex' + EXT, text: 'Unisex names' },
    { href: '/names/with-last-name' + EXT, text: 'Last name compatibility' },
    { href: '/names/letters' + EXT, text: 'By letter' },
    { href: '/names/trending' + EXT, text: 'Trending' },
    { href: '/names/popular' + EXT, text: 'Popular' },
  ];
  return '<section aria-labelledby="browse-heading"><h2 id="browse-heading">Browse the site</h2><p class="internal-links">' +
    links.map((l) => `<a href="${l.href}">${htmlEscape(l.text)}</a>`).join(' · ') + '</p></section>';
}

function genderSectionHtml() {
  return '<section aria-labelledby="gender-heading"><h2 id="gender-heading">Browse by gender</h2><p><a href="/names/boy' + EXT + '">Boy names</a> · <a href="/names/girl' + EXT + '">Girl names</a> · <a href="/names/unisex' + EXT + '">Unisex names</a></p></section>';
}

const FILTER_COUNTRY_SLUGS = [{ slug: 'usa', label: 'USA' }, { slug: 'canada', label: 'Canada' }, { slug: 'france', label: 'France' }, { slug: 'india', label: 'India' }, { slug: 'ireland', label: 'Ireland' }];
function countrySectionHtml() {
  return '<section aria-labelledby="country-heading"><h2 id="country-heading">Browse by country</h2><p>' + FILTER_COUNTRY_SLUGS.map((c) => `<a href="/names/${c.slug}${EXT}">${htmlEscape(c.label)}</a>`).join(' · ') + '</p></section>';
}

/** Get names that clash stylistically with base (low harmony, different style/origin). */
function getClashingNames(base, names, popularity, categories, limit = 6) {
  const { getTopSiblingMatches } = require('./generate-sibling-harmony.js');
  const allMatches = getTopSiblingMatches(base, names, popularity, categories, 500);
  const baseOrigin = ((base.origin_country || '') + (base.language || '')).toLowerCase();
  const baseStyle = (categories || []).filter((c) => c.name_id === base.id)[0]?.category || '';
  const baseSyl = base.syllables != null ? base.syllables : 2;

  const clashing = names
    .filter((n) => n.id !== base.id)
    .map((n) => {
      const m = allMatches.find((a) => a.name.id === n.id);
      const score = m ? m.score : 0;
      const nOrigin = ((n.origin_country || '') + (n.language || '')).toLowerCase();
      const nStyle = (categories || []).filter((c) => c.name_id === n.id)[0]?.category || '';
      const nSyl = n.syllables != null ? n.syllables : 2;
      const originDiff = !baseOrigin && !nOrigin ? 0 : baseOrigin === nOrigin ? 0 : 1;
      const styleDiff = baseStyle !== nStyle ? 1 : 0;
      const sylDiff = Math.abs(baseSyl - nSyl) >= 2 ? 1 : 0;
      const clashScore = score * -1 + (originDiff + styleDiff + sylDiff) * 30;
      return { name: n, score: m?.score ?? 0, clashScore };
    })
    .filter((x) => x.score < 50)
    .sort((a, b) => b.clashScore - a.clashScore)
    .slice(0, limit)
    .map((x) => x.name);

  return clashing;
}

function generateSiblingPage(baseRecord, names, popularity, categories) {
  const nameSlug = slug(baseRecord.name);
  const pathSeg = '/names/' + nameSlug + '/siblings/';
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL + '/' },
    { name: 'Baby Names', url: SITE_URL + '/names' },
    { name: baseRecord.name, url: SITE_URL + nameDetailPath(baseRecord.name) },
    { name: 'Sibling names', url: SITE_URL + pathSeg },
  ];

  const matches = getTopSiblingMatches(baseRecord, names, popularity, categories, 12);
  const clashing = getClashingNames(baseRecord, names, popularity, categories, 6);

  const nameEsc = htmlEscape(baseRecord.name);
  const nameLink = (n) => `<a href="${nameDetailPath(n.name)}">${htmlEscape(n.name)}</a>`;

  let ctx = siblingRenderer ? siblingRenderer.buildContext(baseRecord, popularity, categories) : {};
  if (siblingRenderer && ctx && Object.keys(ctx).length) {
    ctx = { ...ctx };
    ctx.BASE_NAME = nameEsc;
    ctx.BASE_ORIGIN = htmlEscape(ctx.BASE_ORIGIN || '');
    ctx.BASE_POP_BAND = htmlEscape(ctx.BASE_POP_BAND || '');
    ctx.BASE_FIRST_LETTER = htmlEscape(ctx.BASE_FIRST_LETTER || '');
  }
  // Direct summary: 60–80 words (required block)
  const summaryBlock = siblingRenderer
    ? `<p class="contextual">${siblingRenderer.getSummaryIntro(baseRecord.name, ctx)}</p>`
    : `<p class="contextual">Looking for sibling names that pair well with ${nameEsc}? This page lists the top 12 names that harmonize with ${nameEsc} using a deterministic, data-driven score. We combine shared origin (30%), phonetic rhythm (25%), popularity band (20%), length balance (15%), and style cluster (10%) so you can quickly see which names feel cohesive together. Each candidate is scored 0–100. The table below shows the highest-scoring options; the sections that follow explain how the score works and why sibling harmony matters when naming multiple children.</p>`;

  // Harmony table: Candidate | Harmony Score | Shared Origin | Style Match
  const tableRows = matches.map((m) => {
    const origin = m.sharedOrigin ? htmlEscape(m.sharedOrigin) : '—';
    const style = m.styleMatch ? htmlEscape(m.styleMatch) : '—';
    return `<tr><td>${nameLink(m.name)}</td><td class="smoothness-score">${m.score}</td><td>${origin}</td><td>${style}</td></tr>`;
  }).join('');
  const harmonyTableHtml = `
    <section class="smoothness-score-block" aria-labelledby="harmony-heading">
    <h2 id="harmony-heading">Sibling Harmony Table</h2>
    <p class="contextual">The following names score highest for sibling compatibility with ${nameEsc}, based on origin match (30%), phonetic rhythm (25%), popularity band (20%), length balance (15%), and style cluster (10%).</p>
    <div class="score-table-wrap">
    <table class="smoothness-table">
    <thead><tr><th>Candidate</th><th>Harmony Score</th><th>Shared Origin</th><th>Style Match</th></tr></thead>
    <tbody>${tableRows}</tbody>
    </table>
    </div>
    </section>`;

  // Explanation section (how harmony works) — variant-driven, data-injected
  const originP = siblingRenderer ? siblingRenderer.getOriginExplanation(baseRecord.name, ctx) : 'Names from the same cultural or linguistic background score higher. If both names originate from the same region or language family, they often feel cohesive.';
  const popularityP = siblingRenderer ? siblingRenderer.getPopularityExplanation(baseRecord.name, ctx) : 'Names in similar usage bands (top 100, top 500, top 1000, or other) tend to feel cohesive.';
  const rhythmP = siblingRenderer ? siblingRenderer.getRhythmExplanation(baseRecord.name, ctx) : 'Similar syllable count and first-letter alignment create auditory harmony. Names with the same number of syllables and matching first letters tend to pair well when said together.';
  const lengthStyleP = siblingRenderer ? siblingRenderer.getLengthStyleExplanation(baseRecord.name, ctx) : 'Names with similar character length often pair well. Style cluster: same category (classic, biblical, nature, etc.) complements.';
  const howIntro = siblingRenderer ? siblingRenderer.getHowHarmonyIntro(baseRecord.name, ctx) : 'The Sibling Harmony Compatibility Engine uses five weighted factors to score how well two names work together as siblings:';
  const deterministicP = siblingRenderer ? siblingRenderer.getDeterministicClose(baseRecord.name, ctx) : 'The score is deterministic and reproducible—the same two names always produce the same score.';
  const explanationHtml = `
    <section aria-labelledby="how-harmony-heading"><h2 id="how-harmony-heading">How sibling harmony is calculated</h2>
    <p class="contextual">${howIntro}</p>
    <ul class="name-list">
    <li><strong>Shared origin (30%):</strong> ${originP}</li>
    <li><strong>Phonetic rhythm (25%):</strong> ${rhythmP}</li>
    <li><strong>Popularity band (20%):</strong> ${popularityP}</li>
    <li><strong>Length balance (15%) and style cluster (10%):</strong> ${lengthStyleP}</li>
    </ul>
    <p class="contextual">${deterministicP}</p>
    </section>`;

  const contrastIntroP = siblingRenderer ? siblingRenderer.getContrastExplanation(baseRecord.name, ctx) : `Names that differ strongly in origin, style, syllable count, or popularity band often feel mismatched as siblings. Examples that tend to clash with ${nameEsc} include:`;
  const clashingList = clashing.length > 0
    ? clashing.map((n) => `<li>${nameLink(n)}</li>`).join('')
    : '<li>Names with very different syllable counts, origins, and styles typically clash.</li>';
  const contrastHtml = `
    <section aria-labelledby="contrast-heading"><h2 id="contrast-heading">Names that clash stylistically with ${nameEsc}</h2>
    <p class="contextual">${contrastIntroP}</p>
    <ul class="name-list">${clashingList}</ul>
    <p class="contextual">This doesn't mean these names are bad—they simply have different characteristics. Parents who want a cohesive sibling set often avoid pairing very contrasting names.</p>
    </section>`;

  // Step 2 — "How We Calculate Sibling Harmony" (deterministic deep explanation, 120–180 words)
  const scoreRange = matches.length ? (matches[0].score + '–' + (matches[matches.length - 1].score)) : '0–100';
  const howWeCalculateHtml = `
    <section aria-labelledby="calculate-heading"><h2 id="calculate-heading">How we calculate sibling harmony</h2>
    <p class="contextual">The harmony score is a weighted sum of five factors, each scored 0–100, then combined with fixed weights. <strong>Shared origin</strong> (30%) reflects whether two names come from the same cultural or linguistic background; same origin scores 100, partial 50–60, different 0. <strong>Phonetic rhythm</strong> (25%) rewards similar syllable count and optional first-letter match so names sound good when said together. <strong>Popularity band</strong> (20%) compares usage tier (top 100, top 500, top 1000, or other); names in the same band score higher so sibling names feel balanced in familiarity. <strong>Length balance</strong> (15%) and <strong>style cluster</strong> (10%) round out the formula. The result is deterministic: the same two names always get the same score. For ${nameEsc}, the table above shows scores from ${scoreRange}. Rhythm and origin together carry 55% because auditory cohesion and cultural consistency drive most parents' sense of "these names go together."</p>
    </section>`;

  // Step 3 — "Stylistic Cohesion Across Siblings" (data-driven, 120–150 words)
  const baseLetter = (baseRecord.first_letter || (baseRecord.name || '').charAt(0) || '').toUpperCase();
  const matchLetters = [...new Set(matches.map((m) => (m.name.first_letter || (m.name.name || '').charAt(0) || '').toUpperCase()).filter(Boolean))];
  const letterDiversity = matchLetters.length;
  const baseOriginLabel = (baseRecord.origin_country || baseRecord.language || '').trim();
  const baseSyl = baseRecord.syllables != null ? baseRecord.syllables : 2;
  const avgSyl = matches.length ? (matches.reduce((acc, m) => acc + (m.name.syllables != null ? m.name.syllables : 2), 0) / matches.length).toFixed(1) : '2';
  const originPhrase = baseOriginLabel ? `${nameEsc} has ${htmlEscape(baseOriginLabel)} roots` : `${nameEsc} and the top candidates`;
  const stylisticCohesionHtml = `
    <section aria-labelledby="cohesion-heading"><h2 id="cohesion-heading">Stylistic cohesion across siblings</h2>
    <p class="contextual">First-letter diversity varies by family: some parents want matching initials (e.g. ${nameEsc} and a sibling starting with ${baseLetter}); others prefer variety. Our table includes both—same-letter names get a rhythm bonus, but strong origin and style matches can score high without it. Cultural consistency matters: ${originPhrase}${baseOriginLabel ? '; the top candidates share or complement that origin' : ' are scored for shared or complementary origin'}, which drives 30% of the score. Length contrast is balanced so one name doesn't dominate: ${nameEsc} has ${baseSyl} syllable(s); the suggested names average about ${avgSyl}, keeping the set cohesive. Generational naming patterns are reflected in the popularity band (20%): names in similar usage tiers often feel like they belong to the same era, which helps sibling sets feel intentional rather than random.</p>
    </section>`;

  const whyHarmonyP = siblingRenderer ? siblingRenderer.getWhyHarmony(baseRecord.name, ctx) : `When choosing names for multiple children, many parents want a cohesive set: names that sound good together, share a cultural or stylistic thread, and feel balanced in length and rhythm. The Sibling Harmony score helps you quickly identify names that pair well with ${nameEsc}.`;
  const whySiblingHarmonyHtml = `
    <section aria-labelledby="why-harmony-heading"><h2 id="why-harmony-heading">Why sibling harmony matters</h2>
    <p class="contextual">${whyHarmonyP}</p>
    <p class="contextual">Use the links below to browse by gender, country, or letter. Try the <a href="/names/with-last-name${EXT}">last name compatibility</a> tool to see how ${nameEsc} sounds with your surname, or explore <a href="${namesLikeUrl(nameSlug)}">names like ${nameEsc}</a> for alternatives that share similar style and sound. Each name in the harmony table links to its full profile with meaning, origin, and popularity.</p>
    </section>`;

  const mainContent = `
    <h1>Sibling names that pair well with ${nameEsc}</h1>
    ${summaryBlock}
    ${harmonyTableHtml}
    ${explanationHtml}
    ${howWeCalculateHtml}
    ${stylisticCohesionHtml}
    ${contrastHtml}
    ${whySiblingHarmonyHtml}
    ${genderSectionHtml()}
    ${countrySectionHtml()}
    ${coreLinksHtml()}
    <section aria-labelledby="mesh-heading"><h2 id="mesh-heading">Related</h2>
    <p><a href="${nameDetailPath(baseRecord.name)}">${nameEsc} — full profile</a> · <a href="/names/with-last-name-smith${EXT}">How ${nameEsc} sounds with Smith</a> · <a href="${namesLikeUrl(nameSlug)}">Names like ${nameEsc}</a> · <a href="/names/popular${EXT}">Popular names</a>. Check surname compatibility for ${nameEsc} at the <a href="/names/with-last-name${EXT}">last name compatibility hub</a>.</p>
    </section>
  `;

  let finalMainContent = mainContent;
  let wordCount = countWordsInHtml(mainContent);
  if (wordCount < MIN_WORD_COUNT) {
    const extraBlock = `
    <section aria-labelledby="tips-heading"><h2 id="tips-heading">Tips for choosing sibling names</h2>
    <p class="contextual">Say the names together aloud: "${nameEsc} and [candidate]." Listen for flow and rhythm. Consider whether you want matching first letters, similar lengths, or shared cultural roots. Some parents prefer names that stand alone; others like a clear thematic link. The harmony table above reflects these factors.</p>
    <p class="contextual">Visit each candidate's page for meaning, origin, and popularity before deciding. You can also use our <a href="/names/with-last-name${EXT}">surname compatibility</a> pages to see how ${nameEsc} and a sibling name both sound with your last name. Combining sibling harmony with surname flow helps create a cohesive full name set for your family. Use the score to shortlist, then explore each name's profile.</p>
    </section>`;
    finalMainContent = mainContent + extraBlock;
    wordCount = countWordsInHtml(finalMainContent);
  }

  // Step 4 — Word count enforcement guard: do not write thin pages
  if (wordCount < MIN_WORD_COUNT) {
    console.error(`Sibling page ${nameSlug} below ${MIN_WORD_COUNT} words (${wordCount}). Structural content required.`);
    process.exit(1);
  }

  // Schema: HowTo, FAQ (max 2), Article
  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How sibling compatibility is calculated',
    description: 'The Sibling Harmony score uses origin match, phonetic rhythm, popularity band, length balance, and style cluster.',
    step: [
      { '@type': 'HowToStep', name: 'Shared origin (30%)', text: 'Names from the same cultural or linguistic background score higher.' },
      { '@type': 'HowToStep', name: 'Phonetic rhythm (25%)', text: 'Similar syllable count and first-letter alignment create auditory harmony.' },
      { '@type': 'HowToStep', name: 'Popularity band (20%)', text: 'Names in similar usage bands tend to feel cohesive.' },
      { '@type': 'HowToStep', name: 'Length balance (15%)', text: 'Names with similar character length often pair well.' },
      { '@type': 'HowToStep', name: 'Style cluster (10%)', text: 'Names in the same style category complement each other.' },
    ],
  };
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'How is sibling harmony calculated?', acceptedAnswer: { '@type': 'Answer', text: 'The score uses five weighted factors: shared origin (30%), phonetic rhythm (25%), popularity band (20%), length balance (15%), and style cluster (10%).' } },
      { '@type': 'Question', name: 'What names clash with ' + baseRecord.name + '?', acceptedAnswer: { '@type': 'Answer', text: 'Names that differ strongly in origin, style, syllable count, or popularity band tend to score lower and may feel mismatched as siblings.' } },
    ],
  };
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Sibling names that pair well with ' + baseRecord.name,
    description: 'Top sibling names for ' + baseRecord.name + ' based on harmony score, shared origin, and style match.',
  };

  const breadcrumbSchema = breadcrumbJsonLd(breadcrumbItems);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index, follow">
  <meta name="description" content="Sibling names that pair well with ${nameEsc}. Harmony scores, shared origin, style match. Top 12 compatible sibling names.">
  <title>Sibling names for ${baseRecord.name} — Sibling Harmony | nameorigin.io</title>
  <link rel="stylesheet" href="/styles.min.css">
  <link rel="canonical" href="${htmlEscape(SITE_URL + pathSeg)}" />
  <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(howToSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(faqSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(articleSchema)}</script>
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
    <nav aria-label="Breadcrumb" class="breadcrumb">${breadcrumbHtml(breadcrumbItems)}</nav>
    ${finalMainContent}
  </main>
  <footer class="site-footer" role="contentinfo">
    <div class="container">
      <p class="mb-0">© nameorigin.io — Curated name meanings and origins.</p>
    </div>
  </footer>
</body>
</html>`;

  const outPath = path.join(OUT_DIR, 'names', nameSlug, 'siblings', 'index.html');
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, html, 'utf8');

  const linkCount = (html.match(/<a\s+[^>]*href\s*=\s*["']([^"']+)["']/gi) || []).length;
  return { wordCount, linkCount };
}

function run() {
  const batchArg = process.argv.find((a) => a.startsWith('--batch='));
  const limit = batchArg ? Math.min(parseInt(batchArg.split('=')[1], 10), TOP_NAMES_LIMIT) : TOP_NAMES_LIMIT;

  const names = loadJson('names');
  const popularity = loadJson('popularity');
  const categories = loadJson('categories');

  if (names.length === 0) {
    console.error('ERROR: No names data. Run export-json-data first.');
    process.exit(1);
  }

  const topIds = getTopPopularNameIds(popularity, limit);
  const nameById = new Map(names.map((n) => [n.id, n]));
  let topNames = topIds.map((id) => nameById.get(id)).filter(Boolean);
  // Phase 3.3D: If popularity has fewer than limit (e.g. only 4 USA rows), fill to limit from names list.
  if (topNames.length < limit) {
    const have = new Set(topNames.map((n) => n.id));
    const rest = names.filter((n) => !have.has(n.id)).slice(0, limit - topNames.length);
    topNames = topNames.concat(rest);
  }

  console.log('Phase 3.0 — Sibling Harmony Compatibility Engine');
  console.log('URL: /names/{name}/siblings/');
  console.log('Batch size:', topNames.length);
  console.log('');

  ensureDir(path.join(OUT_DIR, 'names'));

  let generated = 0;
  let minWords = Infinity;
  let minLinks = Infinity;

  topNames.forEach((base) => {
    try {
      const result = generateSiblingPage(base, names, popularity, categories);
      generated++;
      minWords = Math.min(minWords, result.wordCount);
      minLinks = Math.min(minLinks, result.linkCount);
    } catch (e) {
      console.error('Error generating siblings for', base.name, ':', e.message);
    }
  });

  console.log('');
  console.log('--- Generation complete ---');
  console.log('Total sibling pages:', generated);
  console.log('Minimum word count:', minWords, minWords >= MIN_WORD_COUNT ? '✅' : '❌');
  console.log('Minimum internal links:', minLinks, minLinks >= MIN_LINKS ? '✅' : '❌');

  if (minWords < MIN_WORD_COUNT || minLinks < MIN_LINKS) {
    console.error('ERROR: Some pages do not meet requirements (700+ words, ≥18 links).');
    process.exit(1);
  }

  console.log('');
  console.log('Next: node scripts/build-sitemap.js (add sibling URLs), then verify-phase2.js');
}

run();
