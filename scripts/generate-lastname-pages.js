#!/usr/bin/env node
/**
 * generate-lastname-pages.js — Phase 2.6 Last-Name Compatibility Engine
 *
 * Generates high-quality programmatic pages at /baby-names-with-<slug>/
 * (e.g. /baby-names-with-smith/, /baby-names-with-garcia/).
 *
 * Discipline:
 *   - Static (SSG), 600+ word floor, ≥12 internal links
 *   - Canonical safe, batch limited (MAX_BATCH = 50)
 *   - Tier 1: 20 high-volume English surnames only
 *
 * Usage:
 *   node scripts/generate-lastname-pages.js [--batch=20]   (first run: 20 surnames)
 *   node scripts/generate-lastname-pages.js --batch=50    (after audit: expand to 50 if authority ≥ 0.99)
 *
 * First run = 20. After: run post-2.25a-audit.js; if authority_coverage_score ≥ 0.99, expand to 50. Never exceed 50 per batch.
 *
 * STEP 5 — Internal links: each page links to homepage, main baby names hub,
 * ≥12 name pages (from boy/girl/unisex lists), ≥1 gender hub, ≥1 country hub. Min 12 internal links.
 * STEP 6 — Meta: title "Baby Names That Go With [Surname] — Best First Name Pairings",
 * meta description unique per surname (discover + pair naturally + explore boy/girl/gender-neutral).
 * STEP 7 — Breadcrumb: Home > Baby Names > Last Name [Surname]. JSON-LD BreadcrumbList in layout.
 * STEP 8 — Word floor: if under 600 words, inject H2 "Why Name Flow Matters" + 120–200 word block; if still under 600, throw.
 * STEP 9 — Sitemap: /baby-names-with-<slug>/ in sitemaps/baby-names-with.xml (priority 0.7, changefreq weekly).
 * STEP 10 — Controlled expansion: first run 20 only; then run post-2.25a-audit.js; if authority ≥ 0.99, expand to 50 (next 30). Never exceed 50 per batch.
 *
 * END STATE: 20 surname compatibility pages (expandable to 50 after audit), 600+ words each,
 * ≥12 internal links, canonical safe, audit clean, ready for indexing.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const OUT_DIR = process.env.OUT_DIR ? path.join(ROOT, process.env.OUT_DIR) : ROOT;

const SITE_URL = process.env.SITE_URL || 'https://nameorigin.io';
const EXT = '.html';
function nameDetailPath(s) { return '/name/' + slug(s) + '/'; }

/** Tier 1: High-volume English surnames (20). Controlled scale. */
const TIER_1_SURNAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones',
  'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
];

const MAX_BATCH = 50;

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

function countWordsInHtml(html) {
  if (!html) return 0;
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.split(/\s+/).filter(Boolean).length;
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
  const breadcrumbItems = opts.breadcrumb && opts.breadcrumb.length ? opts.breadcrumb : [{ name: 'Home', url: SITE_URL + '/' }, { name: 'Baby names', url: SITE_URL + pathSeg }];
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
      <p class="mb-0">© nameorigin.io — Curated name meanings and origins.</p>
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

function alphabetSectionHtml() {
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  return '<section aria-labelledby="alphabet-heading"><h2 id="alphabet-heading">Browse by letter (A–Z)</h2><p class="letters-hub">' + letters.map((l) => '<a href="/names/' + l + EXT + '">' + l.toUpperCase() + '</a>').join(' ') + '</p></section>';
}

// --- STEP 4: Compatibility scoring — deterministic rule set ---
// Components: syllable contrast, avoid repeated ending sounds, avoid consonant stacking, vowel-consonant balance
function syllableCount(word) {
  if (!word) return 1;
  const s = String(word).toLowerCase();
  const v = s.match(/[aeiouy]+/g);
  return v ? Math.max(1, v.length) : 1;
}

function endsWithVowel(name) {
  return /[aeiouy]$/i.test(String(name || '').trim());
}

function startsWithVowel(name) {
  return /^[aeiouy]/i.test(String(name || '').trim());
}

function lastChar(name) {
  const s = String(name || '').trim().toLowerCase();
  return s[s.length - 1] || '';
}

function firstChar(name) {
  const s = String(name || '').trim().toLowerCase();
  return s[0] || '';
}

/** Hard consonants: stacking can feel heavy (e.g. Brett Thompson). */
const HARD_CONSONANTS = new Set('tkpbdg');
function endsWithHardConsonant(name) {
  return HARD_CONSONANTS.has(lastChar(name));
}
function startsWithHardConsonant(name) {
  return HARD_CONSONANTS.has(firstChar(name));
}

/** Returns { score, reasons } for deterministic explanation. */
function scoreCompatibility(firstName, lastNameMeta) {
  const first = (firstName.name || '').trim();
  const last = (lastNameMeta.name || '').trim();
  if (!first || !last) return { score: 0, reasons: [] };
  const firstSyl = firstName.syllables != null ? firstName.syllables : syllableCount(first);
  const lastSyl = lastNameMeta.syllables != null ? lastNameMeta.syllables : syllableCount(last);
  const firstEndsV = endsWithVowel(first);
  const lastStartsV = startsWithVowel(last);
  const firstLastChar = lastChar(first);
  const lastFirstChar = firstChar(last);
  const reasons = [];
  let score = 0;

  // Syllable contrast: 1-syllable last pairs well with 2–3 syllable first; 2-syllable last with 1–3 first
  if (lastSyl === 1 && firstSyl >= 2 && firstSyl <= 3) {
    score += 1.5;
    reasons.push('syllable_contrast');
  } else if (lastSyl === 2 && firstSyl >= 1 && firstSyl <= 3) {
    score += 1;
    reasons.push('syllable_balance');
  } else if (Math.abs(firstSyl - lastSyl) <= 1) {
    score += 0.5;
  }
  if (Math.abs(firstSyl - lastSyl) >= 3) {
    score -= 0.5;
  }

  // Vowel-consonant balance
  if (firstEndsV && !lastStartsV) {
    score += 1;
    reasons.push('vowel_consonant');
  } else if (!firstEndsV && lastStartsV) {
    score += 1;
    reasons.push('consonant_vowel');
  }

  // Avoid repeated ending/starting sound (e.g. Jack Cooper — same sound at boundary)
  if (firstLastChar && lastFirstChar && firstLastChar === lastFirstChar) {
    score -= 1;
    reasons.push('repeated_sound');
  }

  // Avoid heavy consonant stacking (both hard consonant at boundary)
  if (endsWithHardConsonant(first) && startsWithHardConsonant(last)) {
    score -= 0.5;
  }

  return { score, reasons };
}

/** Get top names by compatibility for a given gender. Limit 8–12. */
function getCompatibleNamesByGender(names, lastNameMeta, gender, limit = 12) {
  const norm = (g) => (g || '').toLowerCase();
  const target = norm(gender);
  const filtered = target ? names.filter((n) => norm(n.gender) === target) : names;
  const scored = filtered.map((n) => {
    const result = scoreCompatibility(n, lastNameMeta);
    return { name: n, score: result.score, reasons: result.reasons };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => ({ name: x.name, reasons: x.reasons }));
}

/** Deterministic 1–2 sentence compatibility explanation. No AI fluff. */
function getCompatibilityExplanation(firstName, lastName, reasons, lastSyl, firstSyl) {
  const first = (firstName.name || '').trim();
  const link = nameDetailPath(first);
  const nameEsc = htmlEscape(first);
  const lastEsc = htmlEscape(lastName);
  const templates = [];
  if (reasons.includes('syllable_contrast') || reasons.includes('syllable_balance')) {
    templates.push(`${nameEsc} has ${firstSyl} syllable${firstSyl !== 1 ? 's' : ''}, which ${lastSyl === 1 ? 'contrasts well with ' + lastEsc + "'s one syllable" : 'balances ' + lastEsc + "'s " + lastSyl + ' syllable' + (lastSyl !== 1 ? 's' : '')}.`);
  }
  if (reasons.includes('vowel_consonant')) {
    templates.push(`It ends in a vowel, so it flows cleanly into the consonant start of ${lastEsc}.`);
  }
  if (reasons.includes('consonant_vowel')) {
    templates.push(`It ends in a consonant, creating a clear break before the vowel at the start of ${lastEsc}.`);
  }
  if (templates.length === 0) {
    templates.push(`The syllable count and vowel-consonant boundary work well with ${lastEsc}.`);
  }
  const sentence = templates.slice(0, 2).join(' ');
  return `<a href="${link}">${nameEsc}</a> — ${sentence}`;
}

const MIN_WORD_COUNT = 600;
const MIN_LINKS = 12;
const LIST_SIZE = 12; // 8–12 names per gender section

// STEP 3: Intro 150–200 words — rhythm and flow, syllable balance, alliteration, hard vs soft consonants, cultural pairing
const introTemplates = [
  (s) => `<p class="contextual">Choosing a first name that flows well with ${htmlEscape(s)} starts with rhythm and flow: how the end of the first name meets the start of the last. Syllable balance matters—a one-syllable surname like ${htmlEscape(s)} often pairs best with two- or three-syllable first names, so the full name has a clear rhythm. Alliteration (matching first letters) can work when the sounds are soft, but repeated hard consonants at the boundary (e.g. both names ending and starting with the same strong consonant) tend to feel heavy. Soft consonants (l, m, n, r) and vowels create smoother transitions than hard stops (t, k, p). Cultural pairing is another layer: names from the same or related traditions can sound cohesive, but the phonetic rules above apply regardless of origin. Below you will find boy names, girl names, and gender-neutral names that pair well with ${htmlEscape(s)}, each with a short note on why they work, plus a section on how to choose and test a name.</p>`,
  (s) => `<p class="contextual">When your last name is ${htmlEscape(s)}, the right first name can make the full name easier to say and remember. Rhythm and flow come from how the first name ends and the last name begins—vowel followed by consonant, or consonant by vowel, usually creates a clear break. Syllable balance helps too: ${htmlEscape(s)} has ${syllableCount(s)} syllable${syllableCount(s) !== 1 ? 's' : ''}, and first names with a contrasting or similar count (e.g. two or three syllables) often sound balanced. Alliteration can be appealing in moderation, but avoiding repeated syllables or rhyme between first and last keeps the name from sounding sing-song. Hard versus soft consonants matter at the boundary: soft sounds flow more easily than hard stops. Cultural pairing is a personal choice; the lists below focus on phonetic fit so you can then narrow by meaning and origin. Each name links to its full page.</p>`,
  (s) => `<p class="contextual">A first name that pairs well with ${htmlEscape(s)} depends on a few phonetic rules. Rhythm and flow: the transition between the end of the first name and the start of the last should feel natural, not clipped or run together. Syllable balance—for example, a one-syllable surname with a two-syllable first name—often gives a pleasing contrast. Alliteration (same first letter) is optional; it can work when the consonants are soft but may feel heavy with hard consonants. Avoiding repeated ending and starting sounds (e.g. the same consonant at the boundary) reduces tongue-twister effect. Hard vs soft consonants: names ending in vowels or soft consonants (l, m, n) tend to flow into ${htmlEscape(s)} more easily than those ending in hard stops. Cultural pairing adds meaning; the suggestions below prioritize sound so you can then explore meaning and origin on each name’s page.</p>`,
];

// How to Choose a Name That Flows With [Surname] — avoiding repeated syllables, avoiding rhyme, testing full name aloud
const howToChooseTemplates = [
  (s) => `<section aria-labelledby="how-to-choose-heading"><h2 id="how-to-choose-heading">How to Choose a Name That Flows With ${htmlEscape(s)}</h2><p class="contextual">Avoid repeated syllables: if ${htmlEscape(s)} has a repeated pattern, choose a first name that doesn’t echo it, so the full name doesn’t sound redundant. Avoid rhyme between first and last—names that rhyme can feel playful but often wear thin. The best check is to say the full name aloud several times: listen for smooth transitions, clear breaks, and a rhythm that feels natural. Try it in different contexts (e.g. “This is [First] ${htmlEscape(s)}”) and with a middle name if you use one. If the names run together or feel awkward, try another from the lists above. Each name links to its meaning and origin so you can explore further.</p></section>`,
  (s) => `<section aria-labelledby="how-to-choose-heading"><h2 id="how-to-choose-heading">How to Choose a Name That Flows With ${htmlEscape(s)}</h2><p class="contextual">Avoid repeating the same syllable pattern in first and last—variety keeps the full name from sounding monotonous. Avoid rhyme: first and last names that rhyme can be memorable but often feel gimmicky. The most reliable test is to say the full name aloud. Listen for a clear break between first and last, and for a rhythm you like. Try it with a middle name if you plan to use one. If something feels off, pick another option from the boy, girl, or gender-neutral lists above. Every name on this page links to its full profile with meaning, origin, and popularity so you can choose with confidence.</p></section>`,
];

// Closing CTA — encourage exploring meanings, link to name pages and hub
const closingCtaTemplates = [
  (s) => `<p class="contextual">Exploring the meaning and origin of a name can help you decide. Each name in the lists above links to its full page where you can read about popularity, related names, and cultural context. For more options, browse the <a href="/names/with-last-name${EXT}">last name compatibility hub</a> or filter by <a href="/names/boy${EXT}">boy</a>, <a href="/names/girl${EXT}">girl</a>, or <a href="/names/unisex${EXT}">unisex</a> names.</p>`,
  (s) => `<p class="contextual">Once you have a short list of names that flow well with ${htmlEscape(s)}, explore their meanings and origins on each name’s page. Use the links above to jump to the full profile for any name, and visit the <a href="/names/with-last-name${EXT}">last name compatibility hub</a> to see other surnames. You can also browse by <a href="/names/boy${EXT}">boy</a>, <a href="/names/girl${EXT}">girl</a>, or <a href="/names/unisex${EXT}">unisex</a> names.</p>`,
];

function generatePage(surname, names) {
  const slugKey = slug(surname);
  const pathSeg = '/baby-names-with-' + slugKey + '/';
  const lastSyl = syllableCount(surname);
  const lastNameMeta = { name: surname, syllables: lastSyl };
  // STEP 7: Breadcrumb — Home > Baby Names > Last Name [Surname]; JSON-LD BreadcrumbList in baseLayout
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL + '/' },
    { name: 'Baby Names', url: SITE_URL + '/names' },
    { name: 'Last Name ' + surname, url: SITE_URL + pathSeg },
  ];

  const intro = introTemplates[slugKey.length % introTemplates.length](surname);
  const howToChoose = howToChooseTemplates[slugKey.length % howToChooseTemplates.length](surname);
  const closingCta = closingCtaTemplates[slugKey.length % closingCtaTemplates.length](surname);

  const boyList = getCompatibleNamesByGender(names, lastNameMeta, 'boy', LIST_SIZE);
  const girlList = getCompatibleNamesByGender(names, lastNameMeta, 'girl', LIST_SIZE);
  const unisexList = getCompatibleNamesByGender(names, lastNameMeta, 'unisex', LIST_SIZE);

  const surnameEsc = htmlEscape(surname);
  const itemHtml = (item) => {
    const firstSyl = item.name.syllables != null ? item.name.syllables : syllableCount(item.name.name || '');
    const expl = getCompatibilityExplanation(item.name, surname, item.reasons, lastSyl, firstSyl);
    return `<li>${expl}</li>`;
  };

  const boySection = boyList.length > 0
    ? `<section aria-labelledby="boy-heading"><h2 id="boy-heading">Boy Names That Go Well With ${surnameEsc}</h2><ul class="name-list">${boyList.map(itemHtml).join('')}</ul></section>`
    : '';
  const girlSection = girlList.length > 0
    ? `<section aria-labelledby="girl-heading"><h2 id="girl-heading">Girl Names That Go Well With ${surnameEsc}</h2><ul class="name-list">${girlList.map(itemHtml).join('')}</ul></section>`
    : '';
  const unisexSection = unisexList.length > 0
    ? `<section aria-labelledby="unisex-heading"><h2 id="unisex-heading">Gender-Neutral Names That Pair Well With ${surnameEsc}</h2><ul class="name-list">${unisexList.map(itemHtml).join('')}</ul></section>`
    : '';

  let mainContent = `
    <h1>Baby Names That Go With ${surnameEsc}</h1>
    ${intro}
    ${boySection}
    ${girlSection}
    ${unisexSection}
    ${howToChoose}
    ${closingCta}
    ${genderSectionHtml()}
    ${countrySectionHtml()}
    ${alphabetSectionHtml()}
    <section aria-labelledby="browse-heading"><h2 id="browse-heading">Browse the site</h2><p class="internal-links">${coreLinksHtml()}</p></section>
  `;

  // STEP 8: Word floor — if < 600, inject "Why Name Flow Matters" (120–200 words); if still < 600, throw
  let wordCount = countWordsInHtml(mainContent);
  if (wordCount < MIN_WORD_COUNT) {
    const whyNameFlowBlock = `<section aria-labelledby="why-name-flow-heading"><h2 id="why-name-flow-heading">Why Name Flow Matters</h2><p class="contextual">How a first name and last name sound together affects how easy the full name is to say and remember. When the last name is ${surnameEsc}, paying attention to rhythm and flow helps narrow the options. Syllable balance is one factor: a one-syllable surname often pairs well with a two- or three-syllable first name, so the full name has a clear rhythm. Vowel-consonant balance at the boundary matters too—when the first name ends in a vowel and the last name starts with a consonant, or the reverse, the names tend to flow without running together. Avoiding repeated sounds at the boundary (the same consonant at the end of the first name and the start of the last) keeps the name from feeling choppy. Soft consonants and vowels usually create smoother transitions than hard stops. Many parents say the full name aloud several times to test it; the boy, girl, and gender-neutral names on this page are chosen using these rules. Each name links to its meaning and origin so you can explore further. If you try a name and it doesn’t feel right with ${surnameEsc}, try another from the lists or browse the last name compatibility hub for more options.</p></section>`;
    mainContent = `
    <h1>Baby Names That Go With ${surnameEsc}</h1>
    ${intro}
    ${whyNameFlowBlock}
    ${boySection}
    ${girlSection}
    ${unisexSection}
    ${howToChoose}
    ${closingCta}
    ${genderSectionHtml()}
    ${countrySectionHtml()}
    ${alphabetSectionHtml()}
    <section aria-labelledby="browse-heading"><h2 id="browse-heading">Browse the site</h2><p class="internal-links">${coreLinksHtml()}</p></section>
  `;
    wordCount = countWordsInHtml(mainContent);
  }
  if (wordCount < MIN_WORD_COUNT) {
    throw new Error(`Page below minimum word threshold: baby-names-with-${slugKey} (${wordCount} words). Minimum: ${MIN_WORD_COUNT}.`);
  }

  const totalNames = boyList.length + girlList.length + unisexList.length;
  // STEP 6: Title and meta description — unique per surname
  const pageTitle = `Baby Names That Go With ${surname} — Best First Name Pairings | nameorigin.io`;
  const metaDescription = `Discover baby names that pair naturally with the last name ${surname}. Explore boy, girl, and gender-neutral options with balanced rhythm and flow.`;
  const html = baseLayout({
    title: pageTitle,
    description: metaDescription.slice(0, 160),
    path: pathSeg,
    canonical: SITE_URL + pathSeg,
    breadcrumb: breadcrumbItems,
    breadcrumbHtml: breadcrumbHtml(breadcrumbItems.map((i) => ({ ...i, url: i.url.replace(SITE_URL, '') }))),
    mainContent,
  });

  const outPath = path.join(OUT_DIR, 'baby-names-with-' + slugKey, 'index.html');
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, html, 'utf8');

  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const mainText = mainMatch ? mainMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
  const finalWordCount = mainText.split(/\s+/).filter(Boolean).length;
  const linkMatches = html.match(/<a\s+[^>]*href\s*=\s*["']([^"']+)["']/gi) || [];
  const hrefs = linkMatches.map((m) => {
    const hrefMatch = m.match(/href\s*=\s*["']([^"']+)["']/i);
    return hrefMatch ? (hrefMatch[1].startsWith('/') ? hrefMatch[1] : hrefMatch[1].replace(/^https?:\/\/[^/]+/, '') || hrefMatch[1]) : '';
  }).filter(Boolean);
  const internalLinks = hrefs.filter((h) => h.startsWith('/') || h.includes('nameorigin.io')).length;

  // STEP 5: Require homepage, main hub, ≥12 name pages, ≥1 gender hub, ≥1 country hub
  const hasHomepage = hrefs.some((h) => h === '/' || h === SITE_URL + '/' || h.endsWith('/'));
  const hasMainHub = hrefs.some((h) => h === '/names' || h.includes('/names'));
  const namePageLinks = hrefs.filter((h) => /^\/name\/[^/]+\/?$/.test(h.replace(SITE_URL, '').replace(/^https?:\/\/[^/]+/, ''))).length;
  const hasGenderHub = hrefs.some((h) => /\/names\/(boy|girl|unisex)/.test(h));
  const hasCountryHub = hrefs.some((h) => /\/names\/(usa|canada|france|india|ireland)/.test(h));
  if (!hasHomepage || !hasMainHub || namePageLinks < MIN_LINKS || !hasGenderHub || !hasCountryHub) {
    throw new Error(`baby-names-with-${slugKey}: internal link check failed (home: ${hasHomepage}, hub: ${hasMainHub}, namePages: ${namePageLinks}, gender: ${hasGenderHub}, country: ${hasCountryHub}). Need ≥${MIN_LINKS} name links.`);
  }

  return { wordCount: finalWordCount, internalLinks };
}

function run() {
  const batchArg = process.argv.find((a) => a.startsWith('--batch='));
  const requested = batchArg ? parseInt(batchArg.split('=')[1], 10) : 20;
  let batchSize = requested;
  if (batchSize > MAX_BATCH) {
    console.warn('WARNING: Batch requested (' + requested + ') exceeds MAX_BATCH (' + MAX_BATCH + '). Capping at ' + MAX_BATCH + '.');
    batchSize = MAX_BATCH;
  }
  const surnames = TIER_1_SURNAMES.slice(0, batchSize);

  if (batchSize > 20) {
    console.log('Reminder: Only run --batch=50 after post-2.25a-audit.js and authority_coverage_score >= 0.99.');
    console.log('');
  }
  console.log('Phase 2.6 — Last-Name Compatibility Engine');
  console.log('URL: /baby-names-with-<slug>/');
  console.log('Batch size:', surnames.length, requested > MAX_BATCH ? '(capped from ' + requested + ')' : '');
  console.log('');

  const names = loadJson('names');
  if (names.length === 0) {
    console.error('ERROR: No names data found in data/names.json');
    process.exit(1);
  }

  ensureDir(OUT_DIR);
  let generated = 0;
  let totalWords = 0;
  let totalLinks = 0;
  let minWords = Infinity;
  let minLinks = Infinity;

  surnames.forEach((surname) => {
    const result = generatePage(surname, names);
    generated += 1;
    totalWords += result.wordCount;
    totalLinks += result.internalLinks;
    minWords = Math.min(minWords, result.wordCount);
    minLinks = Math.min(minLinks, result.internalLinks);
    if (generated % 5 === 0) console.log('Generated', generated, '/', surnames.length, 'baby-names-with-* pages...');
  });

  console.log('');
  console.log('--- Generation complete ---');
  console.log('Total pages generated:', generated);
  console.log('Average word count:', Math.round(totalWords / generated));
  console.log('Minimum word count:', minWords, minWords >= MIN_WORD_COUNT ? '✅' : '❌');
  console.log('Minimum internal links:', minLinks, minLinks >= MIN_LINKS ? '✅' : '❌');

  if (minWords < MIN_WORD_COUNT || minLinks < MIN_LINKS) {
    console.error('ERROR: Some pages do not meet requirements (600+ words, ≥12 links).');
    process.exit(1);
  }

  console.log('');
  console.log('Next: node scripts/build-sitemap.js (includes baby-names-with-*), then:');
  console.log('  node scripts/post-2.25a-audit.js');
  console.log('  If authority_coverage_score ≥ 0.99, expand to 50: node scripts/generate-lastname-pages.js --batch=50');
}

run();
