#!/usr/bin/env node
/**
 * scripts/audit/recovery-scenarios.js — Phase 1D: audit/recovery-scenarios.json
 * (READ-ONLY).
 *
 * Models incremental enrichment scenarios (+N records for a given field)
 * and reports the measurable reduction in fallback/disclosed-missing
 * occurrences. The model is a simple, explicitly-stated proportional
 * assumption — enrichment is applied uniformly at random across the
 * currently-missing records, so each fallback/disclosed assertion's
 * occurrence count shrinks by the same fraction (N / recordsMissing) that
 * is enriched. This is a scenario projection, not a prediction: it is
 * clearly labeled as a model, and the one input assumption is stated
 * plainly rather than hidden inside the arithmetic.
 */

const path = require('path');
const { AUDIT_DIR, readJsonSafe, writeAuditJson } = require('./_lib.js');
const { buildConceptImpacts } = require('./knowledge-recovery-lib.js');

const SCENARIOS = [
  { field: 'meaning', addRecords: 100 },
  { field: 'meaning', addRecords: 500 },
  { field: 'origin', addRecords: 500 },
  { field: 'origin', addRecords: 1000 },
  { field: 'pronunciation', addRecords: 1000 },
  { field: 'popularity', addRecords: 500 },
  { field: 'heraldry', addRecords: 25 },
];

function requireAudit(filename) {
  const data = readJsonSafe(path.join(AUDIT_DIR, filename));
  if (!data) {
    console.error(`Missing ${filename} — run prior phases first.`);
    process.exit(1);
  }
  return data;
}

/** Continuous (non-categorical) truthfulness density for a template: the
 * fraction of all (assertion x page) instances currently in a factual
 * (supported/computed) state, weighted by real page counts. Distinct from
 * Phase 1C's per-assertion-type categorical ratio — this one responds
 * smoothly to partial enrichment, which is what a scenario model needs. */
function templateDensity(templateName, allInstancesForTemplate, occurrenceLookup) {
  let factualSum = 0;
  let totalSum = 0;
  for (const inst of allInstancesForTemplate) {
    const total = inst.evidence && inst.evidence.totalPages != null ? inst.evidence.totalPages : 0;
    if (!total) continue;
    totalSum += total;
    if (inst.state === 'supported' || inst.state === 'computed') {
      factualSum += total;
    } else {
      const key = templateName + '::' + inst.assertion;
      const occ = occurrenceLookup.has(key) ? occurrenceLookup.get(key) : total;
      factualSum += total - occ; // pages NOT currently in the non-factual state
    }
  }
  return totalSum > 0 ? Number(((100 * factualSum) / totalSum).toFixed(1)) : null;
}

function run() {
  console.log('Recovery Scenarios — audit/recovery-scenarios.json');
  const kc = requireAudit('knowledge-coverage.json');
  const matrix = requireAudit('truthfulness-matrix.json');
  const impacts = buildConceptImpacts();
  const { CONCEPT_TO_COVERAGE_KEY } = require('./knowledge-recovery-lib.js');

  // Flatten truthfulness-matrix.json into a lookup of current occurrence counts per (template, assertion).
  const occurrenceLookup = new Map();
  const allInstancesByTemplate = {};
  for (const [tpl, rows] of Object.entries(matrix.templates)) {
    allInstancesByTemplate[tpl] = rows;
    for (const r of rows) {
      const key = tpl + '::' + r.assertion;
      let occ = null;
      if (r.evidence && r.evidence.pagesInState != null) occ = r.evidence.pagesInState;
      else if (r.evidence && r.evidence.pct != null && r.evidence.totalPages != null) occ = Math.round((r.evidence.pct / 100) * r.evidence.totalPages);
      else if (r.evidence && r.evidence.totalPages != null) occ = r.evidence.totalPages;
      if (occ != null) occurrenceLookup.set(key, occ);
    }
  }

  const scenarios = SCENARIOS.map(({ field, addRecords }) => {
    const impact = impacts.find((i) => i.concept === field);
    if (!impact) return null;
    const coverageKey = CONCEPT_TO_COVERAGE_KEY[field];
    const coverage = coverageKey ? kc.entityLevelCoverage[coverageKey] : null;
    if (!coverage) return null;

    const missingBefore = coverage.missing;
    const addClamped = Math.min(addRecords, missingBefore);
    const fractionEnriched = missingBefore > 0 ? addClamped / missingBefore : 0;

    const newPresent = coverage.present + addClamped;
    const newCoveragePct = Number(((100 * newPresent) / coverage.totalRecords).toFixed(2));

    const affectedAssertions = [...impact.fallbackOccurrences, ...impact.disclosedOccurrences];
    const perAssertionProjection = affectedAssertions.map((a) => {
      const reduced = Math.round((a.count || 0) * fractionEnriched);
      return { template: a.template, assertion: a.assertion, currentOccurrences: a.count, projectedReduction: reduced, projectedRemainingOccurrences: (a.count || 0) - reduced };
    });
    const totalReduction = perAssertionProjection.reduce((s, a) => s + a.projectedReduction, 0);

    // Template density before/after, for every template touched by this field.
    const templatesTouched = [...new Set(affectedAssertions.map((a) => a.template))];
    const densityProjection = templatesTouched.map((tpl) => {
      const before = templateDensity(tpl, allInstancesByTemplate[tpl], occurrenceLookup);
      // Build a post-scenario occurrence lookup with this field's reductions applied.
      const postLookup = new Map(occurrenceLookup);
      perAssertionProjection.filter((a) => a.template === tpl).forEach((a) => {
        postLookup.set(tpl + '::' + a.assertion, a.projectedRemainingOccurrences);
      });
      const after = templateDensity(tpl, allInstancesByTemplate[tpl], postLookup);
      return { template: tpl, truthfulnessDensityBeforePct: before, truthfulnessDensityAfterPct: after, deltaPct: before != null && after != null ? Number((after - before).toFixed(1)) : null };
    });

    return {
      scenario: `+${addRecords} ${field} records enriched`,
      field,
      recordsAdded: addClamped,
      recordsRequested: addRecords,
      clampedToAvailableMissing: addClamped !== addRecords,
      coverageBefore: { present: coverage.present, total: coverage.totalRecords, pct: coverage.coveragePct },
      coverageAfter: { present: newPresent, total: coverage.totalRecords, pct: newCoveragePct },
      fractionOfMissingRecordsEnriched: Number((100 * fractionEnriched).toFixed(2)),
      perAssertionProjection,
      totalOccurrenceReduction: totalReduction,
      templateDensityProjection: densityProjection,
    };
  }).filter(Boolean);

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    modelingAssumption: 'Enrichment is modeled as applying to a uniformly random subset of the currently-missing records for that field. Under that assumption, every fallback/disclosed-missing assertion tied to the field loses occurrences in direct proportion to the fraction of missing records enriched (recordsAdded / recordsMissingBefore). This is a stated scenario model, not a measurement of a change that has occurred — it is built entirely from real current occurrence counts (audit/truthfulness-matrix.json) scaled by a transparent, single assumption.',
    truthfulnessDensityDefinition: 'A continuous (0-100%) metric distinct from Phase 1C\'s categorical per-assertion-type truthfulness ratio: the fraction of all (assertion, page) instances for a template currently in a supported/computed state, weighted by real page counts. Unlike the categorical ratio, this responds smoothly to partial enrichment, which is what scenario modeling requires.',
    scenarios,
    notes: [
      'Scenario records requested beyond the number of currently-missing records are clamped (clampedToAvailableMissing: true) rather than allowed to exceed 100% coverage.',
      'perAssertionProjection reduction figures are rounded independently per assertion, so totalOccurrenceReduction may differ by a rounding unit or two from summing coverageBefore/coverageAfter deltas directly — both are reported so the arithmetic is auditable.',
    ],
  };

  writeAuditJson('recovery-scenarios.json', report);
  console.log('Scenarios modeled:', scenarios.length);
}

run();
