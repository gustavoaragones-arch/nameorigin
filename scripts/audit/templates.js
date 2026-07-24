#!/usr/bin/env node
/**
 * scripts/audit/templates.js — Phase 1A / PART 3: Content Template Inventory (READ-ONLY).
 *
 * TEMPLATE_DEFS below is a curated catalog built by reading each generator's
 * header comment and section-building functions (function names, @type
 * schema.org tags, and internal-link helpers). "estimatedPages" is NOT
 * hardcoded — it is computed live from the pages actually on disk via
 * classify.js, so this file stays accurate as the site grows or shrinks.
 */

const { allHtmlFiles, writeAuditJson } = require('./_lib.js');
const { classify } = require('./classify.js');

const TEMPLATE_DEFS = [
  {
    template: 'Name Detail Page',
    category: 'name-detail-page',
    generatedBy: 'scripts/generate-programmatic-pages.js :: generateNamePage()',
    urlPattern: '/name/{slug}/',
    typicalSections: [
      'H1 + origin badge', 'Direct-answer snippet block', 'Quick facts table (PropertyValue)',
      'Meaning / origin / gender / phonetic', 'Popularity chart (inline SVG) + trend summary',
      'Name usage & cultural context', 'Origin & linguistic lineage', 'Historical/cultural context',
      'Category-difference block', 'People Also Ask', 'People Also Search For', 'Common search variations',
      'Middle name ideas', 'Cross-linguistic equivalents (curated set only)', 'Sibling-harmony cross-link (top-150 batch only)',
      'Related/cluster names', '6-item FAQ', 'Structured reference block', 'Core/gender/country/alphabet browse links',
    ],
    schemaUsed: ['BreadcrumbList', 'Person', 'Article (shared AEO schema)', 'FAQPage', 'Question', 'Answer', 'PropertyValue', 'ItemList', 'Thing'],
    dataDependencies: ['data/names.json / data/names-enriched.json', 'data/popularity.json', 'data/categories.json', 'data/variants.json', 'data/name-equivalents.json', 'build/topic-clusters.json (topic-cluster-map.js)', 'data/origin-overrides.json (via apply-origin-enrichment.js)'],
    internalLinkGuardrail: 'Phase 3.4 hard guard: throws if internal links < 20 or word count < 400 (scripts/phase-3.4-guards.js).',
  },
  {
    template: '"Names Like X" Alternatives Page',
    category: 'names-like-page',
    generatedBy: 'scripts/generate-programmatic-pages.js :: generateNamesLikePage() (also standalone scripts/generate-names-like.js)',
    urlPattern: '/names-like/{slug}/',
    typicalSections: [
      'H1 + link back to full name page', 'Rotating intro paragraph (6 variants, hashed by name id)',
      'Popularity mesh (peak year cross-link)', 'Names Similar in Sound', 'Names with the Same Origin',
      'Names with Similar Popularity', 'Other Alternatives You Might Like', 'Rotating closing paragraph',
      'Compatibility tool CTA', 'Gender/country/alphabet browse sections', '"Why people look for names like X" padding block (injected only if under word minimum)',
    ],
    schemaUsed: ['BreadcrumbList', 'ListItem', 'Article (shared AEO schema)'],
    dataDependencies: ['data/names.json', 'data/popularity.json', 'data/categories.json'],
    internalLinkGuardrail: 'Enforced in-script: build fails (process.exit 1) if any page has < 600 words or < 12 internal links.',
  },
  {
    template: 'Sibling Harmony Page',
    category: 'sibling-harmony-page',
    generatedBy: 'scripts/generate-sibling-pages.js (scoring via generate-sibling-harmony.js, prose via sibling-explanation-renderer.js)',
    urlPattern: '/names/{slug}/siblings/',
    typicalSections: ['Sibling-pair scoring intro', 'HowTo-style scoring steps', 'Recommended sibling names list', 'FAQ'],
    schemaUsed: ['BreadcrumbList', 'HowTo', 'HowToStep', 'FAQPage', 'Question', 'Answer', 'ListItem'],
    dataDependencies: ['data/names.json', 'data/popularity.json'],
    internalLinkGuardrail: 'Generated only for a fixed batch of the top 150 names by popularity (getSiblingBatchNameSlugs, limit=150); other name pages do not link to a sibling page.',
  },
  {
    template: 'Surname Compatibility Landing Page',
    category: 'surname-compatibility-page',
    generatedBy: 'scripts/generate-lastname-pages.js',
    urlPattern: '/baby-names-with-{surname}/',
    typicalSections: ['Surname origin/note', 'Compatible first-name list scored by phonetic flow', 'Explanatory copy'],
    schemaUsed: ['BreadcrumbList', 'ListItem'],
    dataDependencies: ['data/last-names.json', 'data/names.json', 'data/compatibility_patterns.json (build-compatibility.js)', 'smoothness score (generate-smoothness-score.js)', 'data/heraldry.json'],
    internalLinkGuardrail: 'One page per data/last-names.json record (currently 75).',
  },
  {
    template: 'Names-With-Surname Filter Page',
    category: 'names-lastname-filter-page',
    generatedBy: 'scripts/generate-programmatic-pages.js :: generateLastNamePage()',
    urlPattern: '/names/with-last-name-{surname}.html',
    typicalSections: ['Compatibility-scored name list (scoreCompatibility/getCompatibleNames, top 60)', 'Browse sections'],
    schemaUsed: ['BreadcrumbList', 'ListItem'],
    dataDependencies: ['data/last-names.json', 'data/names.json'],
    internalLinkGuardrail: 'Parallel 1:1 with surname-compatibility-page (same 75 surnames) — a distinct URL/template pair covering the same entity.',
  },
  {
    template: 'Names by Letter Page',
    category: 'names-letter-page',
    generatedBy: 'scripts/generate-programmatic-pages.js :: generateLetterPage()',
    urlPattern: '/names/{a-z}.html',
    typicalSections: ['Name list starting with the letter', 'Cross-links to other letters'],
    schemaUsed: ['BreadcrumbList'],
    dataDependencies: ['data/names.json'],
    internalLinkGuardrail: 'One page per letter A–Z (26 max).',
  },
  {
    template: 'Names by Gender × Country Page',
    category: 'names-gender-country-page',
    generatedBy: 'scripts/generate-programmatic-pages.js :: generateGenderCountryPage()',
    urlPattern: '/names/{boy|girl|unisex}/{country}.html',
    typicalSections: ['Filtered name list', 'Popularity-informed ordering'],
    schemaUsed: ['BreadcrumbList'],
    dataDependencies: ['data/names.json', 'data/popularity.json'],
    internalLinkGuardrail: '3 genders × 5 supported country slugs (usa, canada, india, france, ireland) = 15 max.',
  },
  {
    template: 'Names by Gender Page',
    category: 'names-gender-page',
    generatedBy: 'scripts/generate-programmatic-pages.js',
    urlPattern: '/names/{boy|girl|unisex}.html',
    typicalSections: ['Filtered name list', 'Browse sections'],
    schemaUsed: ['BreadcrumbList'],
    dataDependencies: ['data/names.json'],
    internalLinkGuardrail: '3 fixed pages.',
  },
  {
    template: 'Names by Country Page',
    category: 'names-country-page',
    generatedBy: 'scripts/generate-programmatic-pages.js :: generateCountryPage()',
    urlPattern: '/names/{country}.html',
    typicalSections: ['Popular names for the country', 'Rising names for the country', 'Browse sections'],
    schemaUsed: ['BreadcrumbList'],
    dataDependencies: ['data/names.json', 'data/popularity.json', 'data/countries.json'],
    internalLinkGuardrail: 'Limited to SUPPORTED_COUNTRY_PAGES = usa, canada, india, france, ireland (5 fixed pages) — a hard guard in-script prevents linking unsupported country slugs.',
  },
  {
    template: 'Names by Style Page',
    category: 'names-style-page',
    generatedBy: 'scripts/generate-programmatic-pages.js :: generateStylePage()',
    urlPattern: '/names/style/{style}.html',
    typicalSections: ['Style description', 'Filtered name list'],
    schemaUsed: ['BreadcrumbList'],
    dataDependencies: ['data/names.json', 'data/categories.json'],
    internalLinkGuardrail: '7 fixed style categories (modern, traditional, rare, nature, biblical, classic, popular).',
  },
  {
    template: 'Curated List Page (Popular / Trending)',
    category: 'names-curated-list-page',
    generatedBy: 'scripts/generate-programmatic-pages.js :: generateListPage()',
    urlPattern: '/names/{popular|trending}.html',
    typicalSections: ['Ranked name list', 'Explorer grid (buildNameExplorerGridHtml, cap 200)'],
    schemaUsed: ['BreadcrumbList'],
    dataDependencies: ['data/names.json', 'data/popularity.json'],
    internalLinkGuardrail: '2 fixed pages.',
  },
  {
    template: 'Name × Country-Pair Comparison Page',
    category: 'compare-name-country-pair-page',
    generatedBy: 'scripts/generate-compare-pages.js',
    urlPattern: '/compare/{name}/{countryA}-vs-{countryB}/',
    typicalSections: ['Direct-answer summary (40–60 words)', 'Structured rank comparison table', 'Trend delta', 'Cultural context'],
    schemaUsed: ['BreadcrumbList', 'ListItem'],
    dataDependencies: ['data/country-differentials.json (scripts/generate-country-differentials.js)', 'data/names.json'],
    internalLinkGuardrail: 'Header states cap of top-100 names × 5 pairs = 500 max; only 4 names × 5 pairs = 20 pages exist on disk today — a large gap between designed capacity and actual rollout.',
  },
  {
    template: 'Country-Pair Comparison Hub',
    category: 'compare-country-pair-hub',
    generatedBy: 'scripts/generate-compare-pages.js',
    urlPattern: '/compare/{countryA}-vs-{countryB}/',
    typicalSections: ['Links to per-name comparison pages for this country pair'],
    schemaUsed: ['BreadcrumbList'],
    dataDependencies: ['data/country-differentials.json'],
    internalLinkGuardrail: '5 fixed country pairs.',
  },
  {
    template: 'Equivalent-Name Page',
    category: 'equivalents-page',
    generatedBy: 'scripts/generate-equivalent-pages.js',
    urlPattern: '/equivalents/{slug}/',
    typicalSections: ['Cross-linguistic equivalents list', 'Explanatory copy'],
    schemaUsed: ['BreadcrumbList', 'ListItem'],
    dataDependencies: ['data/name-equivalents.json (closed/curated dataset, scripts/utils/name-equivalents.js hard-filters to valid slugs only)'],
    internalLinkGuardrail: 'One page per key in data/name-equivalents.json (currently 27); must be run after name pages exist.',
  },
  {
    template: 'Compatibility Tool Page',
    category: 'compatibility-tool-page',
    generatedBy: 'scripts/generate-programmatic-pages.js',
    urlPattern: '/compatibility/',
    typicalSections: ['Interactive/explained compatibility scoring tool'],
    schemaUsed: ['BreadcrumbList'],
    dataDependencies: ['data/compatibility_patterns.json'],
    internalLinkGuardrail: 'Single page.',
  },
  {
    template: 'Popularity-by-Year Page',
    category: 'popularity-year-page',
    generatedBy: 'scripts/generate-popularity-pages.js / scripts/generate-popularity-year-pages.js (scripts/generate-year-pages.js is a D1-backed variant not reflected in current static output)',
    urlPattern: '/popularity/{year}.html',
    typicalSections: ['Top 50 names table', 'Biggest risers/decliners', 'Cultural context'],
    schemaUsed: ['BreadcrumbList', 'ListItem', 'ItemList'],
    dataDependencies: ['data/popularity.json'],
    internalLinkGuardrail: 'Only 2022–2024 exist on disk (3 pages); generate-popularity-year-pages.js header describes a much larger 1980–2024 range that is not currently generated in the static build.',
  },
  {
    template: 'Trend Analysis Page',
    category: 'trend-page',
    generatedBy: 'scripts/generate-trends-page.js',
    urlPattern: '/trends/us-2025-vs-2015/',
    typicalSections: ['Top-5 trending names table (Rank 2015, Rank 2025, Movement)', '2 FAQs'],
    schemaUsed: ['BreadcrumbList', 'Article', 'FAQPage', 'Question', 'Answer', 'ListItem', 'Organization'],
    dataDependencies: ['data/regional-trend-acceleration.json (scripts/generate-regional-trend-acceleration.js)'],
    internalLinkGuardrail: 'Single micro-dataset page; the "MODULE D" naming implies more trend pages were planned but only one exists.',
  },
  {
    template: 'Tool Landing Page',
    category: 'tool-landing-page',
    generatedBy: 'scripts/generate-tool-pages.js',
    urlPattern: '/tools/{name-report|sibling-report|name-certificate}/',
    typicalSections: ['Conversion-oriented tool description', 'No popups / no blocking JS'],
    schemaUsed: ['BreadcrumbList'],
    dataDependencies: ['none (static copy)'],
    internalLinkGuardrail: '3 fixed pages; ≥800 words and ≥15 internal links required per header comment.',
  },
  {
    template: 'Legal Page',
    category: 'legal-page',
    generatedBy: 'scripts/generate-legal-pages.js',
    urlPattern: '/legal/{privacy|terms}.html',
    typicalSections: ['Privacy policy / Terms of service copy'],
    schemaUsed: ['none observed'],
    dataDependencies: ['none'],
    internalLinkGuardrail: '≥400 words and ≥20 internal links required per header comment.',
  },
  {
    template: 'About Page',
    category: 'about-page',
    generatedBy: 'scripts/generate-legal-pages.js',
    urlPattern: '/about/',
    typicalSections: ['Company/site description'],
    schemaUsed: ['none observed'],
    dataDependencies: ['none'],
    internalLinkGuardrail: 'Single page.',
  },
  {
    template: 'Homepage',
    category: 'homepage',
    generatedBy: 'hand-authored index.html, with a link grid injected by scripts/generate-homepage.js',
    urlPattern: '/',
    typicalSections: ['Search / hero', 'Explorer grid of 100 name links (crawl accelerator)'],
    schemaUsed: ['see index.html head for site-level schema'],
    dataDependencies: ['data/names-enriched.json or data/names.json', 'data/popularity.json'],
    internalLinkGuardrail: 'Single page.',
  },
  {
    template: 'Root Hub Page',
    category: 'root-hub-page',
    generatedBy: 'scripts/generate-programmatic-pages.js (Phase 3.4 section, overwrites static root files)',
    urlPattern: '/{all-name-pages|alphabet-name-pages|boy-name-pages|country-name-pages|girl-name-pages|name-pages|last-name-pages|style-name-pages}.html',
    typicalSections: ['Large link list to the relevant page category, ≥20 links / ≥400 words enforced'],
    schemaUsed: ['BreadcrumbList'],
    dataDependencies: ['data/names.json'],
    internalLinkGuardrail: '8 fixed pages, function as a flat/shallow alternative crawl path to /names/ sub-hubs.',
  },
  {
    template: 'Section Hub (names/letters/style/last-name/compare/popularity/trends)',
    category: 'names-hub',
    generatedBy: 'each section\'s own generator (see audit/build-pipeline.json)',
    urlPattern: '/{section}/ or /names/{letters|style|with-last-name}.html',
    typicalSections: ['Index/overview linking to the section\'s leaf pages'],
    schemaUsed: ['BreadcrumbList'],
    dataDependencies: ['varies by section'],
    internalLinkGuardrail: 'One hub per section.',
  },
  {
    template: 'HTML Sitemap',
    category: 'html-sitemap',
    generatedBy: 'scripts/generate-html-sitemap.js',
    urlPattern: '/sitemap/',
    typicalSections: ['200+ crawlable links spanning most page categories'],
    schemaUsed: ['none observed'],
    dataDependencies: ['generated output directories (name/, names-like/, etc.)'],
    internalLinkGuardrail: 'Single page, designed as a crawl aid (Phase 5.5) — complements sitemap.xml.',
  },
];

function run() {
  console.log('PART 3 — Content Template Inventory');
  const htmlFiles = allHtmlFiles();
  const counts = {};
  for (const f of htmlFiles) {
    const { category } = classify(f);
    counts[category] = (counts[category] || 0) + 1;
  }

  const templates = TEMPLATE_DEFS.map((t) => ({
    ...t,
    estimatedPages: t.category === 'names-hub'
      ? (counts['names-hub'] || 0) + (counts['names-letters-hub'] || 0) + (counts['names-style-hub'] || 0) + (counts['names-lastname-hub'] || 0) + (counts['compare-hub'] || 0) + (counts['popularity-hub'] || 0) + (counts['trends-hub'] || 0)
      : counts[t.category] || 0,
  }));

  const totalCovered = templates.reduce((sum, t) => sum + t.estimatedPages, 0);
  const totalPages = htmlFiles.filter((f) => classify(f).category !== 'template-source').length;

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    templateCount: templates.length,
    templates,
    coverageCheck: {
      totalPagesOnDisk: totalPages,
      totalPagesCoveredByCatalog: totalCovered,
      uncoveredPages: totalPages - totalCovered,
      note: 'uncoveredPages should be 0 or reflect only "other-static" files; a nonzero gap means a new page category was added to the site without an update to TEMPLATE_DEFS in this script.',
    },
    notes: [
      'typicalSections and schemaUsed are derived from reading each generator\'s section-building functions and @type schema.org literals, not from a live HTML parse.',
      'internalLinkGuardrail documents any cap, minimum, or discrepancy found in the generator source (e.g. designed capacity vs. actual rollout).',
    ],
  };

  writeAuditJson('templates.json', report);
  console.log('Templates cataloged:', templates.length, '| pages covered:', totalCovered, '/', totalPages);
}

run();
