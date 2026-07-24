/**
 * scripts/audit/knowledge-lib.js — Shared, READ-ONLY helpers for the Phase 1B
 * Knowledge Coverage Audit. Builds on scripts/audit/_lib.js and classify.js.
 *
 * Two distinct measurement techniques are used throughout Phase 1B:
 *
 * 1. DATASET FIELD COVERAGE — automatic. For any array-of-objects dataset,
 *    every field name that appears on ANY record is discovered by taking the
 *    union of object keys, then coverage is computed as the fraction of
 *    records where that field is non-empty. No field list is hardcoded.
 *
 * 2. RENDERED-PAGE FALLBACK SCANNING — semi-automatic. Several page
 *    templates render a "knowledge" section unconditionally, substituting a
 *    generic literal string when the backing structured field is empty
 *    (verified by reading scripts/generate-programmatic-pages.js and
 *    confirmed against actually-generated HTML — see FALLBACK_MARKERS
 *    below, each with the exact source line it was found at). Because this
 *    substitution happens in prose, not in a structured field, it cannot be
 *    auto-discovered from JSON alone — it is discovered once by reading the
 *    generator source, then every occurrence across all pages is counted
 *    automatically by scanning the generated HTML for that literal string.
 *    This is the mechanism Part 6 (Empty Knowledge Report) is built on.
 */

const path = require('path');
const { ROOT, readFileSafe } = require('./_lib.js');

function isEmptyValue(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false; // 0, false, numbers are real values
}

/** Auto-discover every field across an array-of-objects dataset and compute coverage. */
function scanArrayFieldCoverage(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return { total: 0, fields: [] };
  const fieldSet = new Set();
  for (const rec of arr) {
    if (rec && typeof rec === 'object') Object.keys(rec).forEach((k) => fieldSet.add(k));
  }
  const total = arr.length;
  const fields = [...fieldSet].sort().map((field) => {
    const present = arr.filter((rec) => rec && !isEmptyValue(rec[field])).length;
    return {
      field,
      totalRecords: total,
      present,
      missing: total - present,
      coveragePct: Number(((100 * present) / total).toFixed(2)),
      missingPct: Number((100 - (100 * present) / total).toFixed(2)),
    };
  });
  return { total, fields };
}

/**
 * Literal fallback strings emitted by scripts/generate-programmatic-pages.js
 * when a structured field is empty, verified against real generated output
 * (grep-confirmed counts, see audit/empty-knowledge.json and, for Phase 1C,
 * audit/fallback-taxonomy.json for the live scan).
 * sourceLine is the line in the named generator where the fallback literal
 * originates, as of the pass that discovered it.
 *
 * `kind` distinguishes two behaviors that both substitute text but are NOT
 * equally truthful (added in Phase 1C; Phase 1B treated them uniformly):
 *   - 'fallback'          — substitutes a generic phrase that reads as if it
 *                            were a real, specific claim about this entity
 *                            (e.g. "means 'a documented given name'").
 *   - 'disclosed-missing' — the substituted text (or omission) is itself an
 *                            honest signal that the data is absent (e.g. a
 *                            plain "—", or a sentence that says outright
 *                            "does not yet show a stable rank").
 * This mirrors the Phase 1C truthfulness classification's 4 states, of
 * which 'fallback' and 'disclosed-missing' are the two that apply to
 * substitution mechanisms (the other two, 'supported' and 'computed', are
 * not fallback behavior at all and so are not modeled as markers here).
 */
const FALLBACK_MARKERS = [
  {
    id: 'meaning-fallback-documented-given-name',
    attribute: 'meaning',
    marker: 'documented given name',
    kind: 'fallback',
    appliesTo: ['name-detail-page'],
    sourceFunction: 'buildMetaDescription() / buildDirectAnswer() / buildDirectAnswers()',
    sourceLines: [134, 165, 932, 1635, 1881],
    description: 'When record.meaning is empty, these functions substitute the literal phrase "a documented given name" as if it were the name\'s actual meaning, in the meta description, the on-page Direct Answer, and the FAQ lead-in.',
  },
  {
    id: 'meaning-fallback-em-dash',
    attribute: 'meaning',
    marker: '—</p>', // conservative: only counts the dash used as a direct paragraph/field value terminator
    kind: 'disclosed-missing',
    appliesTo: ['name-detail-page'],
    sourceFunction: 'buildDefinitionBlock() / buildNameFactsTable() / buildQuickFaqForName()',
    sourceLines: [820, 1124, 1143],
    description: 'A more conservative fallback used elsewhere on the same page: renders an em dash ("—") instead of a fabricated meaning when record.meaning is empty. Contrast with meaning-fallback-documented-given-name above, which fabricates a claim instead of marking the field as unknown.',
  },
  {
    id: 'origin-fallback-multiple-traditions',
    attribute: 'origin_country / language / origin_cluster',
    marker: 'multiple traditions',
    kind: 'fallback',
    appliesTo: ['name-detail-page'],
    sourceFunction: 'buildNameUsageContextSection() / buildQuickFaqForName()',
    sourceLines: [531, 1144],
    description: 'When no origin_country, origin_cluster, or language is set, these sections substitute "multiple traditions" as the name\'s origin label.',
  },
  {
    id: 'origin-fallback-various-linguistic-traditions',
    attribute: 'origin_country / language',
    marker: 'various linguistic traditions',
    kind: 'fallback',
    appliesTo: ['name-detail-page'],
    sourceFunction: 'buildOriginLineage()',
    sourceLines: [834],
    description: 'The "Origin and Linguistic Lineage" section always renders (never omitted); when origin is empty it substitutes "various linguistic traditions" and derives a generic "related language families" value.',
  },
  {
    id: 'origin-fallback-various-cultural-traditions',
    attribute: 'origin_country / language',
    marker: 'various cultural traditions',
    kind: 'fallback',
    appliesTo: ['name-detail-page'],
    sourceFunction: 'buildCulturalContext()',
    sourceLines: [865],
    description: 'The "Historical and Cultural Context" section always renders (never omitted); when origin is empty it substitutes "various cultural traditions".',
  },
  {
    id: 'popularity-disclosed-no-stable-rank',
    attribute: 'popularity',
    marker: 'does not yet show a stable rank band',
    kind: 'disclosed-missing',
    appliesTo: ['name-detail-page'],
    sourceFunction: 'buildDirectAnswers()',
    sourceLines: [948, 949],
    description: 'Discovered in Phase 1C. When no popularity rank is available, the "How popular is the name" FAQ answer explicitly states the name "does not yet show a stable rank band in every dataset we publish" — an honest disclosure, not a fabrication. Verified at 3,692 of 3,697 name-detail pages (99.86%), matching the popularity_record entity coverage gap exactly.',
  },
  {
    id: 'popularity-regions-fallback-unreachable',
    attribute: 'popularity',
    marker: 'the United States and other regions',
    kind: 'fallback',
    appliesTo: ['name-detail-page'],
    sourceFunction: 'buildPopularityRegionsPhrase()',
    sourceLines: [901],
    description: 'Discovered in Phase 1C. Code exists to substitute "the United States and other regions" when popRows is empty, but this branch is only reached from a call site gated by hasRank being true — and hasRank is derived from the same popularity rows, so the two conditions co-occur. Verified: 0 of 3,697 pages contain this string. Recorded for completeness as a fallback mechanism that exists in source but has never fired in committed output.',
  },
  {
    id: 'sibling-origin-fallback-various-origins',
    attribute: 'origin_country / language (sibling-harmony page)',
    marker: 'various origins',
    kind: 'fallback',
    appliesTo: ['sibling-harmony-page'],
    sourceFunction: 'sibling-explanation-renderer.js :: buildContext()',
    sourceLines: [55],
    description: 'Discovered in Phase 1C. generate-sibling-pages.js loads plain data/names.json (never data/names-enriched.json), so origin_country/language are null even for names that DO have curated origin data elsewhere on the site (e.g. Aadi, whose own name-detail page correctly shows "India"/"Sanskrit"). As a result this fallback fires on 150 of 150 sibling-harmony pages (100%) — a higher rate than the 95.6% seen on name-detail-page for the identical underlying concept, because the two generators read different datasets for the same field.',
  },
  {
    id: 'compare-rank-movement-fallback-data-available',
    attribute: 'country-comparison rank/movement',
    marker: 'Rank and movement data are available for our covered countries',
    kind: 'fallback',
    appliesTo: ['compare-name-country-pair-page'],
    sourceFunction: 'generate-compare-pages.js :: getTrendDeltaSection()',
    sourceLines: [220],
    description: 'Discovered in Phase 1C. When no rank differential AND no 10-year movement figure could be computed for either country in the pair (which requires both a 2015 and a current-year rank — and data/popularity.json contains no year-2015 rows at all, for any name), this section substitutes a generic sentence asserting that "data are available for our covered countries," despite none being available for this specific name/country-pair instance. Verified: 20 of 20 compare-name-country-pair-page instances (100%) contain this exact string — the fallback fires on every single page of this template, because no name in the dataset has a 2015 popularity row.',
  },
];

/** Count how many files in `files` (repo-relative paths) contain `marker` (plain substring, not regex). Read-only. */
function countFilesContainingMarker(files, marker) {
  let count = 0;
  for (const f of files) {
    const src = readFileSafe(path.join(ROOT, f));
    if (src && src.includes(marker)) count += 1;
  }
  return count;
}

module.exports = {
  isEmptyValue,
  scanArrayFieldCoverage,
  FALLBACK_MARKERS,
  countFilesContainingMarker,
};
