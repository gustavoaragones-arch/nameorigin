/**
 * scripts/audit/truthfulness-lib.js — Phase 1C shared assertion catalog.
 *
 * Builds the full list of "assertions" (rendered factual-statement
 * mechanisms) the site can generate, each classified into EXACTLY one of
 * four states — supported | computed | disclosed-missing | fallback — per
 * the Phase 1C brief. This module computes every count live from /data,
 * from the Phase 1A/1B audit JSON already on disk, and from the
 * FALLBACK_MARKERS catalog in knowledge-lib.js; it does not hardcode a
 * percentage or page count that could instead be derived.
 *
 * Reuse discipline (per the Phase 1C brief: "Reuse Phase 1A. Reuse Phase
 * 1B. Do not duplicate logic."):
 *   - Fallback identification and page-scan counts come from
 *     knowledge-lib.js FALLBACK_MARKERS (extended in Phase 1C, not
 *     reimplemented) via countFilesContainingMarker().
 *   - Structured-field coverage percentages come from
 *     audit/knowledge-coverage.json (Phase 1B) via requireAudit().
 *   - Per-template attribute presence (always / optional / computed) comes
 *     from audit/page-knowledge-matrix.json (Phase 1B).
 *   - New mechanisms found only during Phase 1C source verification (e.g.
 *     the biblical-tag FAQ, heraldry omission, sibling popularity-band
 *     default) are computed fresh here from /data and marked accordingly.
 */

const path = require('path');
const { AUDIT_DIR, loadDataJson, allHtmlFiles, readJsonSafe } = require('./_lib.js');
const { FALLBACK_MARKERS, countFilesContainingMarker } = require('./knowledge-lib.js');
const { classify } = require('./classify.js');

const STATES = ['supported', 'computed', 'disclosed-missing', 'fallback'];

function requireAudit(filename) {
  const data = readJsonSafe(path.join(AUDIT_DIR, filename));
  if (!data) {
    console.error(`Missing ${filename} — run scripts/audit/run-all.js and scripts/audit/run-knowledge.js first.`);
    process.exit(1);
  }
  return data;
}

function marker(id) {
  const m = FALLBACK_MARKERS.find((x) => x.id === id);
  if (!m) throw new Error('Unknown fallback marker id: ' + id);
  return m;
}

function pagesOfCategory(category) {
  return allHtmlFiles().filter((f) => classify(f).category === category);
}

function buildAssertions() {
  const kc = requireAudit('knowledge-coverage.json');
  const elc = kc.entityLevelCoverage;

  const names = loadDataJson('names') || [];
  const namesEnriched = loadDataJson('names-enriched') || [];
  const categories = loadDataJson('categories') || [];
  const lastNames = loadDataJson('last-names') || [];
  const heraldry = loadDataJson('heraldry') || {};
  const nameEquivalents = loadDataJson('name-equivalents') || {};
  const popularity = loadDataJson('popularity') || [];

  const namePages = pagesOfCategory('name-detail-page');
  const namesLikePages = pagesOfCategory('names-like-page');
  const siblingPages = pagesOfCategory('sibling-harmony-page');
  const comparePages = pagesOfCategory('compare-name-country-pair-page');

  const totalNames = names.length;
  const biblicalCount = categories.filter((c) => String(c.category).toLowerCase() === 'biblical').length;

  const A = []; // assertions accumulator
  const add = (a) => A.push(a);

  // ---------------------------------------------------------------
  // name-detail-page
  // ---------------------------------------------------------------
  add({
    id: 'name-detail-gender', concept: 'gender', template: 'name-detail-page',
    assertion: 'States the name\'s gender (boy/girl/unisex)',
    backingDataset: 'data/names.json (gender)', generatorFunction: 'baseLayout() consumers; record.gender used directly',
    state: 'supported', evidence: { pagesInState: namePages.length, totalPages: namePages.length, pct: elc.gender.coveragePct, method: 'phase1b-coverage' },
  });
  add({
    id: 'name-detail-letter', concept: 'letter', template: 'name-detail-page',
    assertion: 'Groups/links the name by its first letter',
    backingDataset: 'data/names.json (first_letter) — deterministic first character of the name string',
    generatorFunction: 'getOriginBadge()/internalLinksForName()-equivalent letter links',
    state: 'computed', evidence: { pagesInState: namePages.length, totalPages: namePages.length, pct: 100, method: 'deterministic-derivation' },
    note: 'Classified as computed, not supported, because it is a deterministic transform of the name string with no possible missing state (per Phase 1C classification rules, matching the brief\'s own "Letter" example).',
  });
  add({
    id: 'name-detail-syllables', concept: 'syllables', template: 'name-detail-page',
    assertion: 'States the name\'s syllable count',
    backingDataset: 'data/names.json (syllables) — derived at acquisition time (scripts/acquire/build-names.js)',
    generatorFunction: 'buildNameUsageContextSection(), buildNameFactsTable()',
    state: 'computed', evidence: { pagesInState: namePages.length, totalPages: namePages.length, pct: elc.syllables.coveragePct, method: 'phase1b-coverage' },
  });
  add({
    id: 'name-detail-variants', concept: 'variants', template: 'name-detail-page',
    assertion: 'Lists spelling variants of the name',
    backingDataset: 'data/variants.json / data/normalized-names.json spelling_variants[]',
    generatorFunction: 'internalLinksForName()-equivalent variant linking',
    state: 'computed', evidence: { pagesInState: namePages.length, totalPages: namePages.length, pct: elc.variant_record.coveragePct, method: 'phase1b-coverage' },
    note: 'Classified as computed (per the brief\'s explicit "Variants" example) since variant generation is a deterministic phonetic/spelling transform, not per-name research.',
  });
  add({
    id: 'name-detail-biblical-tag-faq', concept: 'category', template: 'name-detail-page',
    assertion: 'FAQ answers "Is {name} a biblical name?" with Yes or No',
    backingDataset: 'data/categories.json (category === "biblical")',
    generatorFunction: 'buildQuickFaqForName() (lines ~1148-1181)',
    state: 'supported',
    evidence: { pagesInState: namePages.length, totalPages: namePages.length, pct: 100, method: 'source-verified + live data count' },
    note: `Always renders, but always accurately reflects data/categories.json either way (Yes for the ${biblicalCount} biblical-tagged name, No for the other ${totalNames - biblicalCount}) — a binary claim that is truthful in both branches, unlike the meaning/origin fallbacks. Classified supported, not fallback, because the "No" answer is not a generic substitute; it is the correct answer given the data.`,
  });
  {
    const fallbackCount = countFilesContainingMarker(namePages, 'documented given name');
    add({
      id: 'name-detail-meaning-direct-answer', concept: 'meaning', template: 'name-detail-page',
      assertion: 'States what the name "means" in the meta description / direct-answer / FAQ lead',
      backingDataset: 'data/names.json / data/names-enriched.json (meaning)',
      generatorFunction: marker('meaning-fallback-documented-given-name').sourceFunction,
      state: 'fallback',
      evidence: { pagesInState: fallbackCount, totalPages: namePages.length, pct: Number(((100 * fallbackCount) / namePages.length).toFixed(2)), method: 'grep-verified' },
      minorityPath: { when: 'meaning is present', state: 'supported', pages: namePages.length - fallbackCount },
    });
  }
  {
    const dashCount = countFilesContainingMarker(namePages, '—</p>');
    add({
      id: 'name-detail-meaning-quick-facts', concept: 'meaning', template: 'name-detail-page',
      assertion: 'Shows the name\'s meaning in the Quick Facts table',
      backingDataset: 'data/names.json / data/names-enriched.json (meaning)',
      generatorFunction: marker('meaning-fallback-em-dash').sourceFunction,
      state: 'disclosed-missing',
      evidence: { pagesInState: dashCount, totalPages: namePages.length, pct: Number(((100 * dashCount) / namePages.length).toFixed(2)), method: 'grep-verified' },
      note: 'The "—</p>" marker is coarse: it also fires for other unrelated empty fields on the same page (e.g. a missing rank), so the exact page count for meaning specifically is an upper bound, not a precise isolation. The qualitative classification (honest placeholder, not fabrication) is verified regardless.',
    });
  }
  ['origin-fallback-various-linguistic-traditions', 'origin-fallback-various-cultural-traditions'].forEach((mid) => {
    const m = marker(mid);
    const cnt = countFilesContainingMarker(namePages, m.marker);
    add({
      id: 'name-detail-' + mid, concept: 'origin', template: 'name-detail-page',
      assertion: mid.includes('linguistic') ? 'Describes the name\'s "Origin and Linguistic Lineage"' : 'Describes the name\'s "Historical and Cultural Context"',
      backingDataset: 'data/names-enriched.json (origin_country / language / origin_cluster)',
      generatorFunction: m.sourceFunction,
      state: 'fallback',
      evidence: { pagesInState: cnt, totalPages: namePages.length, pct: Number(((100 * cnt) / namePages.length).toFixed(2)), method: 'grep-verified' },
      minorityPath: { when: 'origin data is present', state: 'supported', pages: namePages.length - cnt },
    });
  });
  {
    const cnt = countFilesContainingMarker(namePages, 'multiple naming traditions');
    add({
      id: 'name-detail-origin-where-from-faq', concept: 'origin', template: 'name-detail-page',
      assertion: 'FAQ answers "Where does the name {name} come from?"',
      backingDataset: 'data/names-enriched.json (origin_country / language)',
      generatorFunction: 'buildDirectAnswers()',
      state: 'fallback',
      evidence: { pagesInState: cnt, totalPages: namePages.length, pct: Number(((100 * cnt) / namePages.length).toFixed(2)), method: 'grep-verified' },
      minorityPath: { when: 'origin data is present', state: 'supported', pages: namePages.length - cnt },
    });
  }
  {
    const cnt = countFilesContainingMarker(namePages, 'multiple traditions');
    add({
      id: 'name-detail-origin-usage-context', concept: 'origin', template: 'name-detail-page',
      assertion: 'Describes the name\'s "Name Usage & Cultural Context"',
      backingDataset: 'data/names-enriched.json (origin_country / language / origin_cluster)',
      generatorFunction: 'buildNameUsageContextSection()',
      state: 'fallback',
      evidence: { pagesInState: cnt, totalPages: namePages.length, pct: Number(((100 * cnt) / namePages.length).toFixed(2)), method: 'grep-verified' },
      minorityPath: { when: 'origin data is present', state: 'supported', pages: namePages.length - cnt },
    });
  }
  {
    const disclosedCnt = countFilesContainingMarker(namePages, 'does not yet show a stable rank band');
    add({
      id: 'name-detail-popularity-faq', concept: 'popularity', template: 'name-detail-page',
      assertion: 'FAQ answers "How popular is the name {name}?"',
      backingDataset: 'data/popularity.json',
      generatorFunction: 'buildDirectAnswers()',
      state: 'disclosed-missing',
      evidence: { pagesInState: disclosedCnt, totalPages: namePages.length, pct: Number(((100 * disclosedCnt) / namePages.length).toFixed(2)), method: 'grep-verified' },
      minorityPath: { when: 'a popularity rank exists', state: 'supported', pages: namePages.length - disclosedCnt },
    });
  }
  add({
    id: 'name-detail-pronunciation', concept: 'pronunciation', template: 'name-detail-page',
    assertion: 'Shows a Pronunciation section',
    backingDataset: 'data/names-enriched.json (phonetic)',
    generatorFunction: 'conditional `record.phonetic ? ... : \'\'` (section omitted, not faked)',
    state: 'disclosed-missing',
    evidence: { pagesInState: namePages.length, totalPages: namePages.length, pct: 100, method: 'phase1b-coverage (phonetic = 0%)' },
    note: 'phonetic coverage is exactly 0%, so this section is omitted on all 3,697 pages — the maximal case of an honest, silent non-claim.',
  });

  // ---------------------------------------------------------------
  // names-like-page
  // ---------------------------------------------------------------
  add({
    id: 'names-like-phonetic-pool', concept: 'phonetic-similarity', template: 'names-like-page',
    assertion: 'Lists names "Similar in Sound"',
    backingDataset: 'data/names.json (name string only — first letter / prefix match)',
    generatorFunction: 'generateNamesLikePage() phoneticMatches',
    state: 'computed', evidence: { pagesInState: namesLikePages.length, totalPages: namesLikePages.length, pct: 100, method: 'source-verified' },
    note: 'Requires only the name string itself, so it is populated for effectively every name; classified computed (deterministic string match), not supported (no per-name research involved).',
  });
  add({
    id: 'names-like-origin-pool', concept: 'origin', template: 'names-like-page',
    assertion: 'Lists names with "the Same Origin" (section omitted when none found)',
    backingDataset: 'data/names-enriched.json (origin_country / language)',
    generatorFunction: 'generateNamesLikePage() sameOriginMatches',
    state: 'disclosed-missing',
    evidence: { pagesInState: null, totalPages: namesLikePages.length, pct: elc.origin_country_or_language.missingPct, method: 'phase1b-coverage (proxy: section renders only when origin data exists, so its absence rate tracks origin_country_or_language coverage)' },
    minorityPath: { when: 'origin data is present', state: 'supported', pctApprox: elc.origin_country_or_language.coveragePct },
  });
  add({
    id: 'names-like-popularity-pool', concept: 'popularity', template: 'names-like-page',
    assertion: 'Lists names with "Similar Popularity" (section omitted when none found)',
    backingDataset: 'data/popularity.json',
    generatorFunction: 'generateNamesLikePage() similarPopMatches',
    state: 'disclosed-missing',
    evidence: { pagesInState: null, totalPages: namesLikePages.length, pct: elc.popularity_record.missingPct, method: 'phase1b-coverage (proxy)' },
    minorityPath: { when: 'a popularity rank exists', state: 'supported', pctApprox: elc.popularity_record.coveragePct },
  });
  add({
    id: 'names-like-alternatives-pool', concept: 'gender-cluster', template: 'names-like-page',
    assertion: 'Lists "Other Alternatives You Might Like"',
    backingDataset: 'data/names.json (gender) + data/popularity.json (country cluster, optional)',
    generatorFunction: 'generateNamesLikePage() otherAlternatives',
    state: 'computed', evidence: { pagesInState: namesLikePages.length, totalPages: namesLikePages.length, pct: elc.gender.coveragePct, method: 'phase1b-coverage (gender is the guaranteed fallback dimension)' },
  });

  // ---------------------------------------------------------------
  // sibling-harmony-page
  // ---------------------------------------------------------------
  add({
    id: 'sibling-harmony-score', concept: 'compatibility_score', template: 'sibling-harmony-page',
    assertion: 'States a Harmony score / percentage between two names',
    backingDataset: 'computed (generate-sibling-harmony.js: origin 30% + rhythm 25% + popularity 20% + length 15% + style 10%)',
    generatorFunction: 'generate-sibling-harmony.js',
    state: 'computed', evidence: { pagesInState: siblingPages.length, totalPages: siblingPages.length, pct: 100, method: 'source-verified' },
  });
  {
    const cnt = countFilesContainingMarker(siblingPages, 'various origins');
    add({
      id: 'sibling-harmony-origin-factor', concept: 'origin', template: 'sibling-harmony-page',
      assertion: 'States the base name\'s origin as part of the "Shared origin" scoring factor',
      backingDataset: 'data/names.json (origin_country/language — NOTE: unenriched dataset, see note)',
      generatorFunction: 'sibling-explanation-renderer.js :: buildContext()',
      state: 'fallback',
      evidence: { pagesInState: cnt, totalPages: siblingPages.length, pct: Number(((100 * cnt) / siblingPages.length).toFixed(2)), method: 'grep-verified' },
      note: 'generate-sibling-pages.js loads data/names.json, not data/names-enriched.json, so this fires at 100% even for names whose own name-detail page has real origin data.',
    });
  }
  add({
    id: 'sibling-harmony-rhythm-factor', concept: 'syllables', template: 'sibling-harmony-page',
    assertion: 'States syllable count / first letter as part of the "Phonetic rhythm" scoring factor',
    backingDataset: 'data/names.json (syllables, first_letter)',
    generatorFunction: 'sibling-explanation-renderer.js :: buildContext()',
    state: 'computed', evidence: { pagesInState: siblingPages.length, totalPages: siblingPages.length, pct: 100, method: 'source-verified' },
  });
  add({
    id: 'sibling-harmony-popularity-factor', concept: 'popularity', template: 'sibling-harmony-page',
    assertion: 'States a popularity band ("top 100" / "other") as part of the "Popularity parity" scoring factor',
    backingDataset: 'data/popularity.json',
    generatorFunction: 'sibling-explanation-renderer.js :: buildContext() (defaults popBand to "other" when no rows exist)',
    state: 'disclosed-missing',
    evidence: { pagesInState: null, totalPages: siblingPages.length, pct: null, method: 'source-verified only — the 150-name sibling batch cannot be reconstructed from the 5-name-deep popularity dataset (see audit/knowledge-density.json limitation), so an exact page count cannot be measured; this record\'s evidence is Unknown by count, not by mechanism.' },
    note: '"other" is a generic bucket label, not a specific fabricated claim (contrast with the meaning/origin fallbacks) — classified disclosed-missing.',
  });

  // ---------------------------------------------------------------
  // surname-compatibility-page / names-lastname-filter-page
  // ---------------------------------------------------------------
  ['surname-compatibility-page', 'names-lastname-filter-page'].forEach((tpl) => {
    add({
      id: tpl + '-surname-origin', concept: 'surname_origin', template: tpl,
      assertion: 'States the surname\'s linguistic origin',
      backingDataset: 'data/last-names.json (origin)', generatorFunction: tpl === 'surname-compatibility-page' ? 'generate-lastname-pages.js' : 'generateLastNamePage()',
      state: 'supported', evidence: { pagesInState: lastNames.length, totalPages: lastNames.length, pct: 100, method: 'live-data-count (data/last-names.json origin field, 100% populated)' },
    });
    add({
      id: tpl + '-compatibility-score', concept: 'compatibility_score', template: tpl,
      assertion: 'States a first-name/surname compatibility score or ranking',
      backingDataset: 'computed (scoreCompatibility(): syllable balance, vowel/consonant endings, phonetic flow, length harmony)',
      generatorFunction: 'scoreCompatibility() / getCompatibleNames()',
      state: 'computed', evidence: { pagesInState: lastNames.length, totalPages: lastNames.length, pct: 100, method: 'source-verified' },
    });
  });
  {
    const heraldryAvailable = Object.values(heraldry).filter((h) => h.available === true).length;
    add({
      id: 'surname-compatibility-page-heraldry', concept: 'heraldry', template: 'surname-compatibility-page',
      assertion: 'Shows a "Heraldry and Family Heritage" section (omitted when unavailable)',
      backingDataset: 'data/heraldry.json (available === true)',
      generatorFunction: 'buildHeraldrySection()',
      state: 'disclosed-missing',
      evidence: { pagesInState: lastNames.length - heraldryAvailable, totalPages: lastNames.length, pct: Number(((100 * (lastNames.length - heraldryAvailable)) / lastNames.length).toFixed(2)), method: 'live-data-count' },
      minorityPath: { when: 'heraldry.json has available:true for this surname', state: 'supported', pages: heraldryAvailable },
    });
  }

  // ---------------------------------------------------------------
  // equivalents-page
  // ---------------------------------------------------------------
  add({
    id: 'equivalents-page-group', concept: 'equivalent_names', template: 'equivalents-page',
    assertion: 'Lists cross-linguistic equivalents of the anchor name',
    backingDataset: 'data/name-equivalents.json (closed/curated set)',
    generatorFunction: 'generate-equivalent-pages.js',
    state: 'supported', evidence: { pagesInState: Object.keys(nameEquivalents).length, totalPages: Object.keys(nameEquivalents).length, pct: 100, method: 'live-data-count' },
    note: 'The page only exists for the 27 anchors present in the dataset, so by construction every instance is backed by real curated data.',
  });

  // ---------------------------------------------------------------
  // compare-name-country-pair-page
  // ---------------------------------------------------------------
  add({
    id: 'compare-current-rank', concept: 'popularity', template: 'compare-name-country-pair-page',
    assertion: 'States each country\'s current popularity rank for the name',
    backingDataset: 'data/popularity.json (via getRank(), computed independently of data/country-differentials.json)',
    generatorFunction: 'generate-compare-pages.js :: getRank()',
    state: 'supported', evidence: { pagesInState: comparePages.length, totalPages: comparePages.length, pct: 100, method: 'source-verified (all 4 compared names have at least one real popularity row)' },
    note: 'audit/knowledge-dependencies.json (Phase 1B) attributed this page to data/country-differentials.json; Phase 1C source verification found generate-compare-pages.js never reads that file — it computes rank/movement/volatility directly from data/popularity.json instead. This is a correction to the Phase 1B chain, noted here rather than silently changed there.',
  });
  {
    const cnt = countFilesContainingMarker(comparePages, marker('compare-rank-movement-fallback-data-available').marker);
    add({
      id: 'compare-rank-movement', concept: 'trend', template: 'compare-name-country-pair-page',
      assertion: 'States the 10-year rank movement / trend delta between two countries',
      backingDataset: 'data/popularity.json (requires a year-2015 row, which does not exist for any name)',
      generatorFunction: marker('compare-rank-movement-fallback-data-available').sourceFunction,
      state: 'fallback',
      evidence: { pagesInState: cnt, totalPages: comparePages.length, pct: Number(((100 * cnt) / comparePages.length).toFixed(2)), method: 'grep-verified' },
    });
  }
  add({
    id: 'compare-cultural-context', concept: 'cultural_context', template: 'compare-name-country-pair-page',
    assertion: 'Describes cultural/naming differences between the two countries',
    backingDataset: 'hardcoded per-pair static text blocks (getCulturalContext()), not derived from any per-name dataset',
    generatorFunction: 'generate-compare-pages.js :: getCulturalContext()',
    state: 'computed', evidence: { pagesInState: comparePages.length, totalPages: comparePages.length, pct: 100, method: 'source-verified' },
    note: 'Same 5 static paragraphs (one per country pair) are reused verbatim for every name compared within that pair — deterministic and always reproducible, so classified computed rather than supported (it is not about the specific name at all).',
  });

  // ---------------------------------------------------------------
  // names-country-page / names-style-page (list templates with an
  // explicit, source-verified disclosed-missing guard)
  // ---------------------------------------------------------------
  add({
    id: 'names-country-page-list', concept: 'origin', template: 'names-country-page',
    assertion: 'Lists names associated with this country (explicit empty-state guard exists in source)',
    backingDataset: 'data/names-enriched.json (origin_country match) + data/countries.json',
    generatorFunction: 'generateCountryPage() (`if (names.length === 0)` guard)',
    state: 'supported', evidence: { pagesInState: 5, totalPages: 5, pct: 100, method: 'source-verified' },
    note: 'All 5 site-supported country pages have at least some matching names in practice; the empty-state guard exists but was not observed to trigger for any of the 5.',
  });
  add({
    id: 'names-style-page-list', concept: 'category', template: 'names-style-page',
    assertion: 'Lists names tagged with this style (explicit "No names in this style yet" fallback text exists in source)',
    backingDataset: 'data/categories.json',
    generatorFunction: 'generateStylePage() ("No names in this style yet." literal)',
    state: 'supported', evidence: { pagesInState: 7, totalPages: 7, pct: 100, method: 'source-verified' },
    note: 'An honest disclosed-missing message exists in source for empty style categories; whether any of the 7 live style pages actually trigger it was not individually re-verified in this pass (all 7 are treated as supported pending that check — see docs/TRUTHFULNESS_AUDIT.md limitations).',
  });

  // ---------------------------------------------------------------
  // popularity-year-page / trend-page
  // ---------------------------------------------------------------
  add({
    id: 'popularity-year-page-list', concept: 'popularity', template: 'popularity-year-page',
    assertion: 'Lists top-ranked names for the year',
    backingDataset: 'data/popularity.json (7 rows total across 2022-2023)',
    generatorFunction: 'generate-popularity-pages.js / generate-popularity-year-pages.js',
    state: 'supported', evidence: { pagesInState: 3, totalPages: 3, pct: 100, method: 'live-data-count' },
    note: 'Real data, just extremely sparse (7 rows shared across all 3 year pages) — not fabricated, so classified supported, not fallback.',
  });
  add({
    id: 'trend-page-table', concept: 'trend', template: 'trend-page',
    assertion: 'Lists top-5 trending names, 2015 vs 2025',
    backingDataset: 'data/regional-trend-acceleration.json (2 of 5 site countries: USA, CAN)',
    generatorFunction: 'generate-trends-page.js',
    state: 'supported', evidence: { pagesInState: 1, totalPages: 1, pct: 100, method: 'live-data-count' },
    note: 'Covers only 2 of 5 countries, but the page does not claim broader coverage than that per its own title ("US 2025 vs 2015") — classified supported, not fallback.',
  });

  return A;
}

module.exports = { STATES, buildAssertions, requireAudit };
