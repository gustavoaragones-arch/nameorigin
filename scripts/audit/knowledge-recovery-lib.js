/**
 * scripts/audit/knowledge-recovery-lib.js — Phase 1D shared aggregation
 * (READ-ONLY).
 *
 * Reuse discipline (per the Phase 1D brief: "Reuse the outputs from Phases
 * 1A, 1B, and 1C. Do not duplicate existing logic."):
 *   - The assertion list itself comes directly from
 *     scripts/audit/truthfulness-lib.js :: buildAssertions() (Phase 1C) —
 *     not re-derived from the JSON it produced.
 *   - Current field coverage comes from audit/knowledge-coverage.json
 *     (Phase 1B).
 *   - Dataset → generator chains come from audit/knowledge-dependencies.json
 *     (Phase 1B), corrected where Phase 1C found a discrepancy.
 *   - Template page counts come from audit/project-inventory.json (Phase 1A).
 *
 * This module computes, per assertion concept (the same 17 concepts
 * cataloged in audit/assertion-catalog.json), how many rendered fallback /
 * disclosed-missing occurrences exist today and would convert to a
 * factual state if that concept's backing field were fully populated.
 * Every number is either a direct measurement (grep-verified page count)
 * or, where only a percentage was available, that percentage applied to
 * the template's real page count — never an invented estimate.
 */

const path = require('path');
const { AUDIT_DIR, readJsonSafe } = require('./_lib.js');
const { buildAssertions } = require('./truthfulness-lib.js');

function requireAudit(filename) {
  const data = readJsonSafe(path.join(AUDIT_DIR, filename));
  if (!data) {
    console.error(`Missing ${filename} — run scripts/audit/run-all.js, run-knowledge.js, and run-truthfulness.js first.`);
    process.exit(1);
  }
  return data;
}

// Maps each assertion `concept` (from truthfulness-lib.js) to the
// underlying entityLevelCoverage key in audit/knowledge-coverage.json that
// measures its current real-world coverage. Concepts with no missing-data
// state (computed/always-supported) map to null.
const CONCEPT_TO_COVERAGE_KEY = {
  meaning: 'meaning',
  origin: 'origin_country_or_language',
  popularity: 'popularity_record',
  pronunciation: 'phonetic',
  heraldry: 'heraldry_record',
  trend: 'country_differential_entry',
  equivalent_names: 'equivalent_group',
  category: 'category_assignment',
  syllables: 'syllables',
  gender: 'gender',
  letter: null,
  variants: 'variant_record',
  compatibility_score: null,
  surname_origin: null,
  cultural_context: null,
  'gender-cluster': 'gender',
  'phonetic-similarity': null,
};

function occurrencesFor(assertion) {
  const e = assertion.evidence || {};
  if (e.pagesInState != null) return { count: e.pagesInState, method: 'directly-measured' };
  if (e.pct != null && e.totalPages != null) return { count: Math.round((e.pct / 100) * e.totalPages), method: 'derived-from-coverage-pct' };
  if (e.totalPages != null) return { count: e.totalPages, method: 'upper-bound (totalPages, no pct available)' };
  return { count: null, method: 'unmeasurable' };
}

/** Builds one aggregated record per assertion concept. */
function buildConceptImpacts() {
  const kc = requireAudit('knowledge-coverage.json');
  const inv = requireAudit('project-inventory.json');
  const elc = kc.entityLevelCoverage;
  const assertions = buildAssertions();

  const templatePageCount = {};
  inv.pageCategories.forEach((c) => {
    // pageCategories is per fine-grained category; map to the same template
    // ids used throughout Phase 1C (they are identical strings).
    templatePageCount[c.category] = c.count;
  });

  const concepts = [...new Set(assertions.map((a) => a.concept))].sort();

  return concepts.map((concept) => {
    const rows = assertions.filter((a) => a.concept === concept);
    const fallbackRows = rows.filter((a) => a.state === 'fallback');
    const disclosedRows = rows.filter((a) => a.state === 'disclosed-missing');
    const nonFactualRows = [...fallbackRows, ...disclosedRows];

    const templatesAffected = [...new Set(nonFactualRows.map((a) => a.template))];
    const pagesImpacted = templatesAffected.reduce((sum, t) => sum + (templatePageCount[t] || 0), 0);

    const fallbackOccurrences = fallbackRows.map((a) => ({ template: a.template, assertion: a.assertion, ...occurrencesFor(a) }));
    const disclosedOccurrences = disclosedRows.map((a) => ({ template: a.template, assertion: a.assertion, ...occurrencesFor(a) }));

    const fallbackOccurrenceTotal = fallbackOccurrences.reduce((s, o) => s + (o.count || 0), 0);
    const disclosedOccurrenceTotal = disclosedOccurrences.reduce((s, o) => s + (o.count || 0), 0);

    const coverageKey = CONCEPT_TO_COVERAGE_KEY[concept];
    const coverage = coverageKey && elc[coverageKey] ? elc[coverageKey] : null;

    return {
      concept,
      allInstances: rows.map((a) => ({ template: a.template, assertion: a.assertion, state: a.state, generatorFunction: a.generatorFunction, backingDataset: a.backingDataset })),
      templatesAffected,
      pagesImpacted,
      fallbackAssertionCount: fallbackRows.length,
      disclosedMissingAssertionCount: disclosedRows.length,
      fallbackOccurrences,
      disclosedOccurrences,
      fallbackOccurrenceTotal,
      disclosedOccurrenceTotal,
      recoverableOccurrenceTotal: fallbackOccurrenceTotal + disclosedOccurrenceTotal,
      currentCoverage: coverage,
      hasRecoveryPotential: fallbackRows.length + disclosedRows.length > 0,
    };
  });
}

module.exports = { requireAudit, CONCEPT_TO_COVERAGE_KEY, occurrencesFor, buildConceptImpacts };
