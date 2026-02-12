#!/usr/bin/env node
/**
 * generate-names-like.js — Phase 2.5 Names Like Engine
 * Generates "Names Like X" pages for top popular names.
 *
 * IMPORTANT DISCIPLINE RULE:
 *   After generating first 50: run audit → deploy. Do NOT mass-generate thousands of pages immediately.
 *   Expansion: only after deploy and authority score ≥ 0.99, then --batch=200 (max allowed).
 *
 * Usage:
 *   node scripts/generate-names-like.js [--batch=50|200]
 *
 * Workflow:
 *   1. node scripts/generate-names-like.js --batch=50
 *   2. node scripts/post-2.25a-audit.js
 *   3. Deploy
 *   4. If authority_coverage_score ≥ 0.99, then: node scripts/generate-names-like.js --batch=200
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const OUT_DIR = process.env.OUT_DIR ? path.join(ROOT, process.env.OUT_DIR) : ROOT;

const SITE_URL = process.env.SITE_URL || 'https://nameorigin.io';
const EXT = '.html';
function nameDetailPath(s) { return '/name/' + slug(s) + '/'; }
const BREADCRUMB_NAMES_LABEL = 'Baby Names';

function loadJson(name) {
  const p = path.join(DATA_DIR, name + '.json');
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function slug(str) {
  return String(str).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
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

/** Word count from HTML (strip tags, collapse spaces). Used for adaptive padding threshold. */
function countWordsInHtml(html) {
  if (!html) return 0;
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.split(/\s+/).filter(Boolean).length;
}

function breadcrumbJsonLd(items) {
  const list = items.map((item, i) => {
    const url = item.url && !item.url.startsWith('http') ? SITE_URL + (item.url.startsWith('/') ? item.url : '/' + item.url) : (item.url || SITE_URL + '/');
    return {
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: url,
    };
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: list,
  };
}

function breadcrumbHtml(items) {
  const links = items.map((item, i) => {
    const url = item.url && !item.url.startsWith('http') ? (item.url.startsWith('/') ? item.url : '/' + item.url) : (item.url || '/');
    if (i === items.length - 1) return `<span aria-current="page">${htmlEscape(item.name)}</span>`;
    return `<a href="${htmlEscape(url)}">${htmlEscape(item.name)}</a>`;
  });
  return `<nav aria-label="Breadcrumb" class="breadcrumb">${links.join(' / ')}</nav>`;
}

function baseLayout(opts) {
  const title = opts.title || 'nameorigin.io';
  const description = opts.description || '';
  const pathSeg = opts.path || '/';
  const canonical = opts.canonical != null ? opts.canonical : SITE_URL + pathSeg;
  const breadcrumbItems = opts.breadcrumb && opts.breadcrumb.length ? opts.breadcrumb : [{ name: 'Home', url: SITE_URL + '/' }, { name: title.replace(/\s*\|\s*nameorigin\.io\s*$/i, '').trim() || 'Names', url: SITE_URL + pathSeg }];
  const breadcrumbSchema = JSON.stringify(breadcrumbJsonLd(breadcrumbItems));
  const mainContent = opts.mainContent || '';

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
        <a href="/names/unisex${EXT}">Unisex Names</a>
        <a href="/names/letters${EXT}">By letter</a>
        <a href="/names/with-last-name${EXT}">Last name fit</a>
        <a href="/all-name-pages.html">All name pages</a>
      </nav>
    </div>
  </header>
  <main class="container section">
    ${opts.breadcrumbHtml || ''}
    ${mainContent}
  </main>
  <footer class="site-footer" role="contentinfo">
    <div class="container">
      <div class="footer__bottom">
        <p class="mb-0">© nameorigin.io — Curated name meanings and origins. No AI-generated content.</p>
      </div>
    </div>
  </footer>
</body>
</html>`;
}

function coreLinksHtml() {
  const core = [
    { href: '/', text: 'Home' },
    { href: '/names', text: 'All names' },
    { href: '/names/boy' + EXT, text: 'Boy names' },
    { href: '/names/girl' + EXT, text: 'Girl names' },
    { href: '/names/unisex' + EXT, text: 'Unisex names' },
    { href: '/names/style' + EXT, text: 'Names by style' },
    { href: '/names/with-last-name' + EXT, text: 'Last name compatibility' },
    { href: '/names/letters' + EXT, text: 'Browse by letter' },
  ];
  return core.map((l) => `<a href="${l.href}">${htmlEscape(l.text)}</a>`).join(' · ');
}

function genderSectionHtml() {
  return '<section aria-labelledby="gender-heading"><h2 id="gender-heading">Browse by gender</h2><p class="name-links"><a href="/names/boy' + EXT + '">Boy names</a> · <a href="/names/girl' + EXT + '">Girl names</a> · <a href="/names/unisex' + EXT + '">Unisex names</a></p></section>';
}

const FILTER_COUNTRY_SLUGS = [{ slug: 'usa', label: 'USA' }, { slug: 'canada', label: 'Canada' }, { slug: 'france', label: 'France' }, { slug: 'india', label: 'India' }, { slug: 'ireland', label: 'Ireland' }];
function countrySectionHtml() {
  return '<section aria-labelledby="country-heading"><h2 id="country-heading">Browse by country</h2><p class="name-links">' + FILTER_COUNTRY_SLUGS.map((c) => '<a href="/names/' + c.slug + EXT + '">' + htmlEscape(c.label) + '</a>').join(' · ') + '</p></section>';
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
function alphabetSectionHtml() {
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  return '<section aria-labelledby="alphabet-heading"><h2 id="alphabet-heading">Browse by letter (A–Z)</h2><p class="letters-hub">' + letters.map((l) => '<a href="/names/' + l + EXT + '">' + l.toUpperCase() + '</a>').join(' ') + '</p></section>';
}

/** Calculate global popularity score for a name (lower rank = higher score). */
function calculateGlobalPopularityScore(nameId, popularity) {
  const namePop = (popularity || []).filter((p) => p.name_id === nameId);
  if (namePop.length === 0) return 0;
  const countries = ['USA', 'Canada', 'UK', 'India', 'France', 'Ireland'];
  let totalScore = 0;
  let count = 0;
  for (const country of countries) {
    const countryPop = namePop.filter((p) => p.country === country && p.rank != null);
    if (countryPop.length > 0) {
      const bestRank = Math.min(...countryPop.map((p) => p.rank || 9999));
      if (bestRank < 9999) {
        totalScore += 10000 - bestRank;
        count += 1;
      }
    }
  }
  return count > 0 ? totalScore / count : 0;
}

/** Get top N names by global popularity score. */
function getTopPopularNames(names, popularity, limit) {
  const scored = names.map((n) => ({
    name: n,
    score: calculateGlobalPopularityScore(n.id, popularity),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.name);
}

// Import generateNamesLikePage from main generator (we'll copy the logic)
// For now, we'll require the main generator and use its function, or copy it here
// Actually, let's copy the function here to make it standalone

/** Phase 2.5: Generate "Names Like X" page at /names-like/<slug>/index.html */
function generateNamesLikePage(baseRecord, names, popularity, categories) {
  const nameSlug = slug(baseRecord.name);
  const pathSeg = '/names-like/' + nameSlug + '/';
  const url = SITE_URL + pathSeg;
  const baseNameUrl = SITE_URL + nameDetailPath(baseRecord.name);
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL + '/' },
    { name: BREADCRUMB_NAMES_LABEL, url: SITE_URL + '/names' },
    { name: baseRecord.name, url: baseNameUrl },
    { name: 'Names Like ' + baseRecord.name, url },
  ];

  const nameStr = (baseRecord.name || '').toLowerCase();
  const firstLetter = (baseRecord.first_letter || nameStr.charAt(0) || '').toLowerCase();
  const firstTwo = nameStr.slice(0, 2);
  const firstThree = nameStr.slice(0, 3);
  const originKey = (baseRecord.origin_country || '').toLowerCase().replace(/\s+/g, '') || (baseRecord.language || '').toLowerCase().replace(/\s+/g, '');
  const gender = baseRecord.gender || '';
  const nameById = new Map(names.map((n) => [n.id, n]));
  const basePopRows = (popularity || []).filter((p) => p.name_id === baseRecord.id);
  const basePopRank = basePopRows.length > 0 ? Math.min(...basePopRows.map((p) => p.rank || 9999)) : 9999;
  const basePopBand = basePopRank < 100 ? 'top100' : basePopRank < 500 ? 'top500' : basePopRank < 1000 ? 'top1000' : 'other';

  // Categorize similar names
  const phoneticMatches = [];
  const sameOriginMatches = [];
  const similarPopMatches = [];
  const otherAlternatives = [];
  const seenIds = new Set([baseRecord.id]);

  // Names similar in sound (phonetic: same first letter + first 2-3 letters match)
  const sameLetter = names.filter((n) => {
    const nFirst = (n.first_letter || (n.name || '').charAt(0) || '').toLowerCase();
    return nFirst === firstLetter && n.id !== baseRecord.id && !seenIds.has(n.id);
  });
  sameLetter.forEach((n) => {
    const nStr = (n.name || '').toLowerCase();
    if (nStr.startsWith(firstTwo) || nStr.startsWith(firstThree)) {
      if (phoneticMatches.length < 8) {
        phoneticMatches.push(n);
        seenIds.add(n.id);
      }
    }
  });
  sameLetter.forEach((n) => {
    if (!seenIds.has(n.id) && phoneticMatches.length < 8) {
      phoneticMatches.push(n);
      seenIds.add(n.id);
    }
  });

  // Names with same origin
  if (originKey) {
    const sameOrigin = names.filter(
      (n) => n.id !== baseRecord.id && !seenIds.has(n.id) && ((n.origin_country || '').toLowerCase().replace(/\s+/g, '') === originKey || (n.language || '').toLowerCase().replace(/\s+/g, '') === originKey)
    );
    sameOrigin.slice(0, 6).forEach((n) => {
      sameOriginMatches.push(n);
      seenIds.add(n.id);
    });
  }

  // Names with similar popularity
  if (basePopRank < 9999) {
    const similarPop = names.filter((n) => {
      if (n.id === baseRecord.id || seenIds.has(n.id)) return false;
      const nPopRows = (popularity || []).filter((p) => p.name_id === n.id);
      if (nPopRows.length === 0) return false;
      const nPopRank = Math.min(...nPopRows.map((p) => p.rank || 9999));
      const nPopBand = nPopRank < 100 ? 'top100' : nPopRank < 500 ? 'top500' : nPopRank < 1000 ? 'top1000' : 'other';
      return nPopBand === basePopBand;
    });
    similarPop.slice(0, 5).forEach((n) => {
      similarPopMatches.push(n);
      seenIds.add(n.id);
    });
  }

  // Other alternatives (same gender, trending, or country cluster)
  if (gender) {
    const sameGender = names.filter((n) => n.gender === gender && n.id !== baseRecord.id && !seenIds.has(n.id));
    sameGender.slice(0, 5).forEach((n) => {
      otherAlternatives.push(n);
      seenIds.add(n.id);
    });
  }
  if (otherAlternatives.length < 5 && basePopRows.length > 0) {
    const countryCodes = [...new Set(basePopRows.map((p) => p.country))];
    for (const country of countryCodes.slice(0, 2)) {
      const countryPop = (popularity || []).filter((p) => p.country === country && p.name_id !== baseRecord.id && !seenIds.has(p.name_id));
      const countryPopIds = countryPop.map((p) => p.name_id).slice(0, 4);
      countryPopIds.forEach((id) => {
        const n = nameById.get(id);
        if (n && !seenIds.has(n.id) && otherAlternatives.length < 8) {
          otherAlternatives.push(n);
          seenIds.add(n.id);
        }
      });
      if (otherAlternatives.length >= 5) break;
    }
  }

  const nameLink = (n) => `<a href="${nameDetailPath(n.name)}">${htmlEscape(n.name)}</a>`;
  const nameCategories = (categories || []).filter((c) => c.name_id === baseRecord.id).map((c) => c.category);
  const styleLabel = nameCategories.length > 0 ? nameCategories[0] : (gender === 'boy' ? 'classic' : gender === 'girl' ? 'elegant' : 'modern');
  const originLabel = baseRecord.origin_country || baseRecord.language || 'various origins';

  // Controlled template variation: select intro/closing based on name ID hash for consistency
  const variationIndex = (baseRecord.id || 0) % 6;

  // Intro paragraph variations (~150-200 words each, unique per name)
  const introTemplates = [
    (name, style, origin, g) => `<p class="contextual">If you're considering the name ${htmlEscape(name)}, you might be looking for alternatives that share similar style, origin, or sound. ${htmlEscape(name)} has a ${htmlEscape(style)} feel and ${origin ? 'originates from ' + htmlEscape(origin) : 'has roots in multiple cultures'}. When choosing a name, many parents seek options that match their preferred style—whether that's ${htmlEscape(style)}, ${g === 'boy' ? 'strong and traditional' : g === 'girl' ? 'elegant and timeless' : 'versatile and modern'}—or that honor a specific cultural or linguistic heritage. Some parents also want names that sound similar phonetically, sharing the same first letter or similar opening sounds, which can create a cohesive feel when considering sibling names or family naming patterns. Others prioritize popularity, looking for names in a similar popularity band—whether that's top 100, top 500, or less common choices. This page curates names similar to ${htmlEscape(name)} across these dimensions, helping you discover alternatives that might resonate with your preferences while offering variety and meaning.</p>`,
    (name, style, origin, g) => `<p class="contextual">Searching for names similar to ${htmlEscape(name)}? This curated list highlights alternatives that share key characteristics: phonetic similarity, cultural origin, popularity trends, or ${g ? g + ' name' : 'style'} appeal. ${htmlEscape(name)} embodies a ${htmlEscape(style)} aesthetic ${origin ? 'with roots in ' + htmlEscape(origin) : 'drawn from diverse cultural traditions'}, making it appealing to parents who value ${g === 'boy' ? 'strength and tradition' : g === 'girl' ? 'elegance and timelessness' : 'versatility and modernity'}. Names that sound alike—especially those sharing the same first letter or similar opening syllables—often work well together for siblings or extended family naming. Cultural matching matters too: names from the same linguistic or regional background can honor heritage while providing variety. Popularity considerations also play a role, as some parents prefer names in similar usage bands. Below, you'll find names that match ${htmlEscape(name)} in one or more of these ways, each with its own distinct meaning and history.</p>`,
    (name, style, origin, g) => `<p class="contextual">When ${htmlEscape(name)} catches your attention, exploring similar names can help you find the perfect fit. ${htmlEscape(name)} carries a ${htmlEscape(style)} quality ${origin ? 'from ' + htmlEscape(origin) : 'with multicultural appeal'}, appealing to those who appreciate ${g === 'boy' ? 'classic strength' : g === 'girl' ? 'timeless elegance' : 'modern versatility'}. Finding names like ${htmlEscape(name)} involves considering several factors: phonetic resemblance (names that sound similar, especially with matching first letters), shared cultural or linguistic origins, comparable popularity levels, and ${g ? g + ' name' : 'style'} alignment. Parents often seek names that feel cohesive—whether for siblings, honoring family traditions, or matching a preferred aesthetic. Phonetic similarity creates harmony in sound, while shared origins can reflect cultural heritage. Popularity matching helps ensure a name feels familiar yet distinctive. This page brings together names that mirror ${htmlEscape(name)}'s appeal across these dimensions, offering meaningful alternatives to consider.</p>`,
    (name, style, origin, g) => `<p class="contextual">Looking for names that share ${htmlEscape(name)}'s appeal? This collection highlights alternatives based on sound, origin, popularity, and ${g ? g + ' name' : 'style'} characteristics. ${htmlEscape(name)} has a ${htmlEscape(style)} character ${origin ? 'with origins in ' + htmlEscape(origin) : 'reflecting diverse cultural influences'}, making it attractive to parents who value ${g === 'boy' ? 'traditional strength' : g === 'girl' ? 'elegant sophistication' : 'contemporary flexibility'}. Similarity can come from multiple angles: names that sound alike (particularly those starting with the same letter or sharing opening sounds), names from the same cultural or linguistic background, names in similar popularity ranges, and names that share the same ${g ? g + ' name' : 'style'} category. Each approach offers different benefits—phonetic matches create auditory harmony, origin matches honor cultural connections, popularity matches ensure familiarity, and ${g ? g + ' name' : 'style'} matches align with preferences. The names below reflect these various forms of similarity to ${htmlEscape(name)}, giving you diverse options to explore.</p>`,
    (name, style, origin, g) => `<p class="contextual">If ${htmlEscape(name)} resonates with you, discovering similar names can expand your options while maintaining what draws you to it. ${htmlEscape(name)} features a ${htmlEscape(style)} style ${origin ? 'from ' + htmlEscape(origin) : 'with broad cultural appeal'}, appealing to those who appreciate ${g === 'boy' ? 'classic masculinity' : g === 'girl' ? 'feminine elegance' : 'gender-neutral versatility'}. Names similar to ${htmlEscape(name)} can match in several ways: they might sound alike (sharing first letters or similar opening sounds for phonetic harmony), come from the same cultural or linguistic tradition (reflecting shared heritage), fall within similar popularity bands (ensuring comparable familiarity), or belong to the same ${g ? g + ' name' : 'style'} category. Parents choose similar names for various reasons: creating cohesive sibling sets, honoring cultural backgrounds, matching preferred popularity levels, or maintaining a consistent aesthetic. This page curates names that align with ${htmlEscape(name)} across these dimensions, each offering its own unique meaning and background while sharing key characteristics.</p>`,
    (name, style, origin, g) => `<p class="contextual">Exploring names like ${htmlEscape(name)} helps you find alternatives that capture similar qualities. ${htmlEscape(name)} embodies a ${htmlEscape(style)} essence ${origin ? 'rooted in ' + htmlEscape(origin) : 'drawn from multiple cultural sources'}, making it appealing to parents who seek ${g === 'boy' ? 'strong, traditional' : g === 'girl' ? 'elegant, timeless' : 'versatile, modern'} names. Similarity can be measured by sound (names with matching first letters or similar opening sounds create phonetic connections), origin (names from the same cultural or linguistic background share heritage), popularity (names in similar usage bands offer comparable familiarity), and ${g ? g + ' name' : 'style'} category. These different forms of similarity serve different purposes: phonetic matches work well for sibling sets, origin matches honor cultural identity, popularity matches ensure recognition, and ${g ? g + ' name' : 'style'} matches align with preferences. Below are names that mirror ${htmlEscape(name)}'s appeal through these various lenses, providing meaningful alternatives with their own distinct stories.</p>`,
  ];
  const intro = introTemplates[variationIndex](baseRecord.name, styleLabel, originLabel, gender);

  // Explanation phrasing variations (avoid template repetition)
  const phoneticExplanations = [
    (n, base) => `${htmlEscape(n)} shares the same first letter and similar opening sounds as ${htmlEscape(base)}, creating a phonetic connection.`,
    (n, base) => `${htmlEscape(n)} starts with the same letter as ${htmlEscape(base)} and has a similar rhythm and feel.`,
    (n, base) => `${htmlEscape(n)} begins with the same letter as ${htmlEscape(base)} and shares similar opening sounds, offering phonetic harmony.`,
    (n, base) => `${htmlEscape(n)} matches ${htmlEscape(base)}'s first letter and opening sounds, creating an auditory similarity.`,
    (n, base) => `${htmlEscape(n)} shares ${htmlEscape(base)}'s initial letter and similar opening syllables, providing a cohesive sound.`,
    (n, base) => `${htmlEscape(n)} starts with the same letter as ${htmlEscape(base)} and echoes its opening sounds, creating a phonetic parallel.`,
  ];
  const phoneticExplanationsSimple = [
    (n, base) => `${htmlEscape(n)} starts with the same letter as ${htmlEscape(base)} and has a similar rhythm and feel.`,
    (n, base) => `${htmlEscape(n)} begins with the same letter as ${htmlEscape(base)} and shares a comparable sound pattern.`,
    (n, base) => `${htmlEscape(n)} matches ${htmlEscape(base)}'s first letter and offers a similar auditory quality.`,
    (n, base) => `${htmlEscape(n)} shares ${htmlEscape(base)}'s initial letter and has a parallel rhythm.`,
    (n, base) => `${htmlEscape(n)} starts with the same letter as ${htmlEscape(base)} and creates a harmonious sound.`,
    (n, base) => `${htmlEscape(n)} begins with the same letter as ${htmlEscape(base)} and provides a similar phonetic feel.`,
  ];

  // Names Similar in Sound section
  const phoneticSectionHtml = phoneticMatches.length > 0
    ? `<section aria-labelledby="sound-heading"><h2 id="sound-heading">Names Similar in Sound</h2><ul class="name-list">${phoneticMatches.map((n, idx) => {
        const nStr = (n.name || '').toLowerCase();
        const isStrongMatch = nStr.startsWith(firstTwo) || nStr.startsWith(firstThree);
        const expVariations = isStrongMatch ? phoneticExplanations : phoneticExplanationsSimple;
        const explanation = expVariations[(variationIndex + idx) % expVariations.length](n.name, baseRecord.name);
        return `<li><strong>${nameLink(n)}</strong> — ${explanation} ${n.meaning ? htmlEscape(n.meaning.slice(0, 80)) + (n.meaning.length > 80 ? '…' : '') : ''}</li>`;
      }).join('')}</ul></section>`
    : '';

  // Origin explanation variations
  const originExplanations = [
    (n, base, origin) => `${htmlEscape(n)} shares the same ${origin ? htmlEscape(origin) : 'cultural'} origin as ${htmlEscape(base)}, reflecting similar linguistic roots and cultural traditions.`,
    (n, base, origin) => `${htmlEscape(n)} comes from the same ${origin ? htmlEscape(origin) : 'cultural'} background as ${htmlEscape(base)}, sharing linguistic and cultural heritage.`,
    (n, base, origin) => `${htmlEscape(n)} has the same ${origin ? htmlEscape(origin) : 'cultural'} origin as ${htmlEscape(base)}, connecting through shared traditions and language.`,
    (n, base, origin) => `${htmlEscape(n)} originates from the same ${origin ? htmlEscape(origin) : 'cultural'} source as ${htmlEscape(base)}, reflecting parallel cultural and linguistic roots.`,
    (n, base, origin) => `${htmlEscape(n)} shares ${htmlEscape(base)}'s ${origin ? htmlEscape(origin) : 'cultural'} origin, drawing from the same linguistic and cultural wellspring.`,
    (n, base, origin) => `${htmlEscape(n)} comes from the same ${origin ? htmlEscape(origin) : 'cultural'} tradition as ${htmlEscape(base)}, sharing heritage and linguistic connections.`,
  ];

  // Section transition phrasing (micro-variation so pages don't share identical flow)
  const transitionBeforeOrigin = [
    () => '<p class="contextual">Beyond sound, names that share the same cultural or linguistic origin can offer a different kind of connection.</p>',
    () => '<p class="contextual">Cultural and linguistic ties also matter when considering similar names.</p>',
    () => '<p class="contextual">If heritage is important to you, the following names share the same origin as ' + htmlEscape(baseRecord.name) + '.</p>',
    () => '<p class="contextual">Names from the same cultural or linguistic background can resonate for different reasons.</p>',
    () => '<p class="contextual">Another dimension of similarity is shared origin—names that come from the same linguistic or cultural roots.</p>',
    () => '<p class="contextual">You might also value names that share the same cultural or linguistic heritage.</p>',
  ];
  const transitionBeforePopularity = [
    () => '<p class="contextual">Popularity can influence how familiar a name feels; the names below sit in a similar usage band.</p>',
    () => '<p class="contextual">If you care about how common a name is, these options offer comparable recognition.</p>',
    () => '<p class="contextual">Names in a similar popularity range can provide a comparable level of familiarity.</p>',
    () => '<p class="contextual">Another way to find alternatives is by popularity—names that rank in a similar tier.</p>',
    () => '<p class="contextual">Parents often consider popularity; here are names in a similar band to ' + htmlEscape(baseRecord.name) + '.</p>',
    () => '<p class="contextual">If matching popularity matters to you, the following names are in a similar range.</p>',
  ];
  const transitionBeforeAlternatives = [
    () => '<p class="contextual">Beyond sound, origin, and popularity, you might also like these alternatives that share a similar overall appeal.</p>',
    () => '<p class="contextual">Finally, here are other options that might resonate if you\'re drawn to ' + htmlEscape(baseRecord.name) + '\'s style.</p>',
    () => '<p class="contextual">These additional names offer a similar feel even when they don\'t match on every dimension.</p>',
    () => '<p class="contextual">Other alternatives worth considering share ' + htmlEscape(baseRecord.name) + '\'s appeal in different ways.</p>',
    () => '<p class="contextual">You might also like the following options, which share a comparable character or style.</p>',
    () => '<p class="contextual">Rounding out the list are other alternatives that could fit your preferences.</p>',
  ];

  // Names with Same Origin section
  const originSectionHtml = sameOriginMatches.length > 0
    ? transitionBeforeOrigin[variationIndex]() + `<section aria-labelledby="origin-heading"><h2 id="origin-heading">Names with the Same Origin</h2><ul class="name-list">${sameOriginMatches.map((n, idx) => {
        const explanation = originExplanations[(variationIndex + idx) % originExplanations.length](n.name, baseRecord.name, originLabel);
        return `<li><strong>${nameLink(n)}</strong> — ${explanation} ${n.meaning ? htmlEscape(n.meaning.slice(0, 80)) + (n.meaning.length > 80 ? '…' : '') : ''}</li>`;
      }).join('')}</ul></section>`
    : '';

  // Popularity explanation variations
  const popularityExplanations = [
    (n, base, label) => `${htmlEscape(n)} is in a similar popularity band as ${htmlEscape(base)}, appearing in the ${label} names, which means it has comparable usage and recognition.`,
    (n, base, label) => `${htmlEscape(n)} shares ${htmlEscape(base)}'s popularity level, ranking in the ${label} names and offering similar familiarity.`,
    (n, base, label) => `${htmlEscape(n)} matches ${htmlEscape(base)}'s popularity range, falling within the ${label} names and providing comparable recognition.`,
    (n, base, label) => `${htmlEscape(n)} has similar popularity to ${htmlEscape(base)}, appearing in the ${label} names and ensuring comparable familiarity.`,
    (n, base, label) => `${htmlEscape(n)} is in the same popularity tier as ${htmlEscape(base)}, ranking in the ${label} names and offering similar usage levels.`,
    (n, base, label) => `${htmlEscape(n)} shares ${htmlEscape(base)}'s popularity band, appearing in the ${label} names and providing comparable recognition and familiarity.`,
  ];

  // Names with Similar Popularity section
  const popularitySectionHtml = similarPopMatches.length > 0
    ? transitionBeforePopularity[(variationIndex + 1) % 6]() + `<section aria-labelledby="popularity-heading"><h2 id="popularity-heading">Names with Similar Popularity</h2><ul class="name-list">${similarPopMatches.map((n, idx) => {
        const nPopRows = (popularity || []).filter((p) => p.name_id === n.id);
        const nPopRank = nPopRows.length > 0 ? Math.min(...nPopRows.map((p) => p.rank || 9999)) : 9999;
        const popLabel = nPopRank < 100 ? 'top 100' : nPopRank < 500 ? 'top 500' : nPopRank < 1000 ? 'top 1000' : 'less common';
        const explanation = popularityExplanations[(variationIndex + idx) % popularityExplanations.length](n.name, baseRecord.name, popLabel);
        return `<li><strong>${nameLink(n)}</strong> — ${explanation} ${n.meaning ? htmlEscape(n.meaning.slice(0, 80)) + (n.meaning.length > 80 ? '…' : '') : ''}</li>`;
      }).join('')}</ul></section>`
    : '';

  // Alternatives explanation variations
  const alternativesExplanations = [
    (n, base, g) => `${htmlEscape(n)} offers a similar ${g ? g + ' name' : 'style'} option that might appeal if you're drawn to ${htmlEscape(base)}'s characteristics.`,
    (n, base, g) => `${htmlEscape(n)} provides a comparable ${g ? g + ' name' : 'style'} choice that shares ${htmlEscape(base)}'s appeal.`,
    (n, base, g) => `${htmlEscape(n)} presents a similar ${g ? g + ' name' : 'style'} alternative that mirrors ${htmlEscape(base)}'s qualities.`,
    (n, base, g) => `${htmlEscape(n)} offers a parallel ${g ? g + ' name' : 'style'} option that aligns with ${htmlEscape(base)}'s characteristics.`,
    (n, base, g) => `${htmlEscape(n)} provides a similar ${g ? g + ' name' : 'style'} choice that echoes ${htmlEscape(base)}'s appeal.`,
    (n, base, g) => `${htmlEscape(n)} presents a comparable ${g ? g + ' name' : 'style'} alternative that shares ${htmlEscape(base)}'s qualities.`,
  ];

  // Other Alternatives section
  const alternativesSectionHtml = otherAlternatives.length > 0
    ? transitionBeforeAlternatives[(variationIndex + 2) % 6]() + `<section aria-labelledby="alternatives-heading"><h2 id="alternatives-heading">Other Alternatives You Might Like</h2><ul class="name-list">${otherAlternatives.map((n, idx) => {
        const explanation = alternativesExplanations[(variationIndex + idx) % alternativesExplanations.length](n.name, baseRecord.name, gender);
        return `<li><strong>${nameLink(n)}</strong> — ${explanation} ${n.meaning ? htmlEscape(n.meaning.slice(0, 80)) + (n.meaning.length > 80 ? '…' : '') : ''}</li>`;
      }).join('')}</ul></section>`
    : '';

  // Closing paragraph variations (~120-150 words each, unique per name)
  const closingTemplates = [
    (name) => `<p class="contextual">Exploring name meanings and origins can help you find the perfect name that resonates with your values, heritage, and style preferences. Each name carries its own history, cultural significance, and meaning, which can add depth and intention to your choice. Whether you're drawn to ${htmlEscape(name)} for its sound, origin, popularity, or meaning, the alternatives above offer similar qualities while giving you variety to consider. We encourage you to explore the full meaning and origin details for each name by visiting their individual pages, where you'll find comprehensive information about popularity trends, cultural context, and related names. Understanding a name's background can help you make an informed decision that feels right for your family. For more details about ${htmlEscape(name)} itself, including its complete meaning, origin story, and popularity data, visit the <a href="${nameDetailPath(name)}">${htmlEscape(name)} name page</a>.</p>`,
    (name) => `<p class="contextual">Delving into name meanings and cultural backgrounds helps you choose a name that aligns with your values and preferences. Every name has its own story, cultural roots, and significance, adding meaningful context to your decision. If ${htmlEscape(name)} appeals to you for its sound, cultural origin, popularity level, or meaning, the similar names listed above provide alternatives that share these qualities while offering distinct options. Take time to explore each name's detailed page, which includes comprehensive information about popularity patterns, cultural heritage, and related names. Learning about a name's background and significance can guide you toward a choice that feels meaningful and right for your family. To learn more about ${htmlEscape(name)} specifically, including its full meaning, origin details, and popularity trends, visit the <a href="${nameDetailPath(name)}">${htmlEscape(name)} name page</a>.</p>`,
    (name) => `<p class="contextual">Understanding name meanings and origins helps you select a name that reflects your values and connects with your heritage. Each name brings its own cultural context, historical significance, and meaning, enriching your choice with depth and intention. If ${htmlEscape(name)} resonates with you because of its sound, cultural background, popularity, or meaning, the alternatives shown above share these attributes while providing variety. We recommend exploring each name's individual page to discover detailed information about popularity trends, cultural connections, and related names. Gaining insight into a name's background and significance can help you make a thoughtful decision that feels right for your family. For comprehensive details about ${htmlEscape(name)}, including its complete meaning, origin story, and popularity data, visit the <a href="${nameDetailPath(name)}">${htmlEscape(name)} name page</a>.</p>`,
    (name) => `<p class="contextual">Researching name meanings and cultural origins helps you find a name that matches your preferences and honors your values. Every name has unique cultural roots, historical context, and meaning, which can inform and enrich your choice. Whether ${htmlEscape(name)} attracts you for its phonetic qualities, cultural heritage, popularity level, or meaning, the similar names above offer alternatives that mirror these characteristics while giving you options. Consider visiting each name's dedicated page to access detailed information about popularity patterns, cultural background, and related names. Learning about a name's history and significance can support you in making a decision that feels meaningful and appropriate for your family. To discover more about ${htmlEscape(name)} specifically, including its full meaning, origin details, and popularity information, visit the <a href="${nameDetailPath(name)}">${htmlEscape(name)} name page</a>.</p>`,
    (name) => `<p class="contextual">Investigating name meanings and cultural backgrounds helps you choose a name that aligns with your style and values. Each name carries its own cultural heritage, historical significance, and meaning, adding richness and purpose to your selection. If ${htmlEscape(name)} draws you in for its sound, origin, popularity, or meaning, the alternatives listed above share these qualities while offering diversity. Take the opportunity to explore each name's individual page, where you'll find detailed information about popularity trends, cultural connections, and related names. Understanding a name's background and meaning can help you make an informed choice that feels right for your family. For complete information about ${htmlEscape(name)}, including its meaning, origin story, and popularity data, visit the <a href="${nameDetailPath(name)}">${htmlEscape(name)} name page</a>.</p>`,
    (name) => `<p class="contextual">Examining name meanings and cultural origins helps you select a name that reflects your preferences and connects with your heritage. Every name has its own cultural context, historical background, and meaning, which can add depth and significance to your decision. Whether ${htmlEscape(name)} appeals to you for its phonetic qualities, cultural roots, popularity level, or meaning, the similar names above provide alternatives that share these attributes while giving you variety. We suggest exploring each name's dedicated page to access comprehensive information about popularity patterns, cultural heritage, and related names. Gaining knowledge about a name's background and significance can guide you toward a choice that feels meaningful and appropriate for your family. To learn more about ${htmlEscape(name)} specifically, including its full meaning, origin details, and popularity trends, visit the <a href="${nameDetailPath(name)}">${htmlEscape(name)} name page</a>.</p>`,
  ];
  const closing = closingTemplates[variationIndex](baseRecord.name);

  // Adaptive content padding: only when word count would be below threshold (preserves 600+ rule, no relaxation).
  const PADDING_THRESHOLD = 650;
  const paddingTemplates = [
    (name) => `<section aria-labelledby="why-heading"><h2 id="why-heading">Why People Look for Names Like ${htmlEscape(name)}</h2><p class="contextual">When a name becomes widely used, many parents appreciate its style but look for alternatives that feel similar without being overused. They want familiarity—a name that fits current trends and feels recognizable—but not one that appears in every classroom or playground. Cultural overlap matters too: names that share an origin or language can honor heritage while offering variety. Trend cycles also play a role; names rise and fall in popularity, and some parents prefer options that sit in a similar band without following the exact same curve. Finally, name fatigue is real: hearing the same name everywhere can push people toward alternatives that capture the same appeal. Looking for names like ${htmlEscape(name)} often reflects a desire to keep that appeal while finding something that still feels distinct.</p></section>`,
    (name) => `<section aria-labelledby="why-heading"><h2 id="why-heading">Why People Look for Names Like ${htmlEscape(name)}</h2><p class="contextual">Parents who like ${htmlEscape(name)} often want options that match its style and feel without copying it exactly. Style preference drives a lot of this: the same qualities that make a name appealing—sound, origin, or vibe—can be found in alternatives that feel fresh. Familiarity without overuse is another factor; a name that is well known but not everywhere can feel like a sweet spot. Cultural overlap also draws people in: names from the same linguistic or regional background can reflect shared heritage while giving siblings or families a cohesive set. Trend cycles mean that popularity shifts over time, so some parents look for names in a similar band that might age well. Name fatigue—when a name feels too common in your circle—can also lead people to seek alternatives that keep the same appeal. Exploring names like ${htmlEscape(name)} is a way to balance all of these.</p></section>`,
    (name) => `<section aria-labelledby="why-heading"><h2 id="why-heading">Why People Look for Names Like ${htmlEscape(name)}</h2><p class="contextual">Searching for names similar to ${htmlEscape(name)} usually comes down to a few motivations. One is style preference: you like the sound or the feel of the name and want alternatives that share that quality. Another is the desire for familiarity without overuse—a name that feels recognizable and on-trend but not overdone. Cultural overlap matters for many families; names that share an origin or language can honor identity while providing choice. Trend cycles also influence decisions; names move in and out of favor, and parents sometimes look for options in a similar popularity range that might feel current for years. Name fatigue is another reason: when a name feels too common in your environment, finding alternatives that capture the same appeal can feel like the best of both worlds. This page helps you do that.</p></section>`,
    (name) => `<section aria-labelledby="why-heading"><h2 id="why-heading">Why People Look for Names Like ${htmlEscape(name)}</h2><p class="contextual">Many people look for names like ${htmlEscape(name)} because they like its style but want options. They might want something that feels familiar—recognizable and in line with current tastes—without being so common that it loses its distinctiveness. Cultural overlap is another draw: names from the same origin or language can create a cohesive set for siblings or reflect shared heritage. Popularity and trend cycles play a role too; some parents prefer names in a similar band that have held steady or feel timeless rather than spiking. And name fatigue is real: when you hear a name everywhere, it can push you toward alternatives that keep the same appeal without the overexposure. Whether it is style, familiarity, culture, trends, or variety, the reasons to look for names like ${htmlEscape(name)} are varied and valid.</p></section>`,
    (name) => `<section aria-labelledby="why-heading"><h2 id="why-heading">Why People Look for Names Like ${htmlEscape(name)}</h2><p class="contextual">When a name like ${htmlEscape(name)} resonates with you, it is natural to look for alternatives that share its appeal. Style preference is often the starting point—the sound, the feel, or the image the name evokes. From there, many parents consider familiarity without overuse: a name that feels known and current but not overused in their circles. Cultural overlap can be important too; names that share an origin or linguistic background can honor heritage and still offer variety. Trend cycles mean that popularity shifts, so some look for names in a similar band that might age well. Name fatigue also drives the search when a name feels too common locally; finding alternatives that capture the same qualities can feel like a good compromise. The names below reflect these different dimensions of similarity.</p></section>`,
    (name) => `<section aria-labelledby="why-heading"><h2 id="why-heading">Why People Look for Names Like ${htmlEscape(name)}</h2><p class="contextual">Looking for names like ${htmlEscape(name)} often stems from a few common motivations. One is style: you like what the name represents—its sound, origin, or feel—and want alternatives that match. Another is the balance of familiarity without overuse; a name that is recognizable and on-trend but not everywhere can feel ideal. Cultural overlap matters for many; names from the same background can reflect shared roots while giving you options. Trend cycles affect choices too; names rise and fall, and some parents prefer options in a similar popularity range. Name fatigue can also play a role when a name feels too common in your environment; alternatives that keep the same appeal can feel fresh. The following names offer that kind of variety while staying close to what draws you to ${htmlEscape(name)}.</p></section>`,
    (name) => `<section aria-labelledby="why-heading"><h2 id="why-heading">Why People Look for Names Like ${htmlEscape(name)}</h2><p class="contextual">Parents who are drawn to ${htmlEscape(name)} often search for similar names for good reasons. Style preference is one: the name has a certain feel—classic, modern, or culturally rooted—and they want alternatives that share it. Familiarity without overuse is another; they want a name that feels known and current but not overused in playgrounds or schools. Cultural overlap allows names from the same origin or language to honor heritage while offering variety. Trend cycles mean that popularity shifts over time, so some look for names in a similar band that might stay appealing. Name fatigue also motivates the search when a name feels too common locally; alternatives that capture the same appeal can feel like the best of both worlds. Below you will find names that match ${htmlEscape(name)} in one or more of these ways.</p></section>`,
    (name) => `<section aria-labelledby="why-heading"><h2 id="why-heading">Why People Look for Names Like ${htmlEscape(name)}</h2><p class="contextual">When a name gains popularity, many parents appreciate its style but seek alternatives that feel similar without being overused. They want familiarity—a name that fits the times and feels recognizable—but not one that appears everywhere. Cultural overlap matters: names that share an origin or language can honor heritage and still offer choice. Trend cycles play a role too; names move in and out of favor, and some parents prefer options in a similar popularity band. Name fatigue is another factor; hearing the same name repeatedly can push people toward alternatives that keep the same appeal. Whether the driver is style, familiarity, culture, trends, or variety, looking for names like ${htmlEscape(name)} is a common and sensible way to find options that resonate.</p></section>`,
  ];

  let mainContent = `
    <h1>Names Like ${htmlEscape(baseRecord.name)} — Similar Names &amp; Alternatives</h1>
    ${intro}
    ${phoneticSectionHtml}
    ${originSectionHtml}
    ${popularitySectionHtml}
    ${alternativesSectionHtml}
    ${closing}
    ${genderSectionHtml()}
    ${countrySectionHtml()}
    ${alphabetSectionHtml()}
    <section aria-labelledby="browse-heading"><h2 id="browse-heading">Browse the site</h2><p class="internal-links">${coreLinksHtml()}</p></section>
  `;

  if (countWordsInHtml(mainContent) < PADDING_THRESHOLD) {
    const paddingBlock = paddingTemplates[(baseRecord.id || 0) % paddingTemplates.length](baseRecord.name);
    mainContent = `
    <h1>Names Like ${htmlEscape(baseRecord.name)} — Similar Names &amp; Alternatives</h1>
    ${intro}
    ${paddingBlock}
    ${phoneticSectionHtml}
    ${originSectionHtml}
    ${popularitySectionHtml}
    ${alternativesSectionHtml}
    ${closing}
    ${genderSectionHtml()}
    ${countrySectionHtml()}
    ${alphabetSectionHtml()}
    <section aria-labelledby="browse-heading"><h2 id="browse-heading">Browse the site</h2><p class="internal-links">${coreLinksHtml()}</p></section>
  `;
  }

  const genderLabel = gender === 'boy' ? 'Boy' : gender === 'girl' ? 'Girl' : gender === 'unisex' ? 'Unisex' : '';
  const totalSimilar = phoneticMatches.length + sameOriginMatches.length + similarPopMatches.length + otherAlternatives.length;
  const description = `Looking for names like ${baseRecord.name}? Discover ${totalSimilar} similar ${genderLabel ? genderLabel.toLowerCase() : ''} names in sound, origin, and popularity${genderLabel ? ' for ' + genderLabel.toLowerCase() + 's' : ''} with detailed explanations. Each alternative includes meaning, origin, and links to full name details.`;

  const html = baseLayout({
    title: 'Names Like ' + baseRecord.name + (genderLabel ? ' — Similar ' + genderLabel + ' Names & Alternatives' : ' — Similar Names & Alternatives') + ' | nameorigin.io',
    description: description.slice(0, 160),
    path: pathSeg,
    canonical: SITE_URL + pathSeg,
    breadcrumb: breadcrumbItems,
    breadcrumbHtml: breadcrumbHtml(breadcrumbItems.map((i) => ({ ...i, url: i.url.replace(SITE_URL, '') }))),
    mainContent,
  });

  const outPath = path.join(OUT_DIR, 'names-like', nameSlug, 'index.html');
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, html, 'utf8');

  // Verify word count and link count
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const mainText = mainMatch ? mainMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
  const wordCount = mainText.split(/\s+/).filter(Boolean).length;
  const linkMatches = html.match(/<a\s+[^>]*href\s*=\s*["']([^"']+)["']/gi) || [];
  const internalLinks = linkMatches.filter((m) => {
    const hrefMatch = m.match(/href\s*=\s*["']([^"']+)["']/i);
    if (!hrefMatch) return false;
    const href = hrefMatch[1];
    return href.startsWith('/') || href.includes('nameorigin.io');
  }).length;

  return { wordCount, internalLinks, totalSimilar };
}

const MAX_BATCH = 200; // Discipline: do not mass-generate. First 50 → audit → deploy → then 200 if score OK.

function run() {
  const batchArg = process.argv.find((a) => a.startsWith('--batch='));
  const batchSize = batchArg ? parseInt(batchArg.split('=')[1], 10) : 50;
  let targetBatch = batchSize === 200 ? 200 : 50;

  if (batchSize > MAX_BATCH) {
    console.error('ERROR: Batch size cannot exceed ' + MAX_BATCH + '.');
    console.error('Discipline rule: first 50 → run audit → deploy. Only then expand to 200 if authority score ≥ 0.99.');
    process.exit(1);
  }

  console.log('Phase 2.5 — Names Like Engine');
  console.log('Batch size:', targetBatch);
  if (targetBatch > 50) {
    console.log('');
    console.log('Reminder: Ensure you have already run audit and deployed after the first 50.');
  }
  console.log('');

  const names = loadJson('names');
  const popularity = loadJson('popularity');
  const categories = loadJson('categories');

  if (names.length === 0) {
    console.error('ERROR: No names data found.');
    process.exit(1);
  }

  ensureDir(OUT_DIR);
  ensureDir(path.join(OUT_DIR, 'names-like'));

  // Get top popular names
  const topNames = getTopPopularNames(names, popularity, targetBatch);
  console.log('Selected', topNames.length, 'names by global popularity score.');

  let generated = 0;
  let totalWords = 0;
  let totalLinks = 0;
  let minWords = Infinity;
  let minLinks = Infinity;

  topNames.forEach((nameRecord) => {
    const result = generateNamesLikePage(nameRecord, names, popularity, categories);
    generated += 1;
    totalWords += result.wordCount;
    totalLinks += result.internalLinks;
    minWords = Math.min(minWords, result.wordCount);
    minLinks = Math.min(minLinks, result.internalLinks);
    if (generated % 10 === 0) {
      console.log('Generated', generated, '/', topNames.length, 'Names Like pages...');
    }
  });

  console.log('');
  console.log('--- Generation complete ---');
  console.log('Total pages generated:', generated);
  console.log('Average word count:', Math.round(totalWords / generated));
  console.log('Minimum word count:', minWords, minWords >= 600 ? '✅' : '❌');
  console.log('Average internal links:', Math.round(totalLinks / generated));
  console.log('Minimum internal links:', minLinks, minLinks >= 12 ? '✅' : '❌');
  console.log('');

  if (minWords < 600 || minLinks < 12) {
    console.error('ERROR: Some pages do not meet requirements (600+ words, ≥12 links).');
    process.exit(1);
  }

  console.log('Next steps:');
  console.log('1. Run: node scripts/build-sitemap.js (to include names-like URLs)');
  console.log('2. Run: node scripts/post-2.25a-audit.js (to verify authority score)');
  console.log('3. If authority_coverage_score ≥ 0.99, expand to 200 names:');
  console.log('   node scripts/generate-names-like.js --batch=200');
}

run();
