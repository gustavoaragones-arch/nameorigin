#!/usr/bin/env node
/**
 * scripts/audit/research-workload.js — Phase 1D: audit/research-workload.json
 * (READ-ONLY).
 *
 * Estimates the number of RECORDS requiring enrichment per field, based
 * only on repository data (audit/knowledge-coverage.json entity-level
 * coverage, Phase 1B). This is a record count (how many names/surnames
 * lack the field), distinct from audit/knowledge-roi.json's occurrence
 * count (how many rendered page-sections would change) — one record
 * missing a field can back multiple rendered occurrences.
 */

const path = require('path');
const { AUDIT_DIR, readJsonSafe, writeAuditJson } = require('./_lib.js');
const { CONCEPT_TO_COVERAGE_KEY } = require('./knowledge-recovery-lib.js');

function run() {
  console.log('Research Workload — audit/research-workload.json');
  const kc = readJsonSafe(path.join(AUDIT_DIR, 'knowledge-coverage.json'));
  const roi = readJsonSafe(path.join(AUDIT_DIR, 'knowledge-roi.json'));
  if (!kc || !roi) {
    console.error('Missing knowledge-coverage.json or knowledge-roi.json — run prior phases first.');
    process.exit(1);
  }

  const fieldsWithPotential = roi.fields.filter((f) => f.recoverableOccurrenceTotal > 0);

  const workload = fieldsWithPotential.map((f) => {
    const coverageKey = CONCEPT_TO_COVERAGE_KEY[f.field];
    const coverage = coverageKey ? kc.entityLevelCoverage[coverageKey] : null;
    return {
      field: f.field,
      label: f.label,
      recordsRequiringEnrichment: coverage ? coverage.missing : null,
      totalRecordsInUniverse: coverage ? coverage.totalRecords : null,
      currentlyEnriched: coverage ? coverage.present : null,
      universe: coverage ? (coverageKey === 'heraldry_record' ? 'data/last-names.json (surnames)' : coverageKey === 'country_differential_entry' ? 'name × country pairs' : 'data/names.json (names)') : 'n/a',
      recoverableOccurrenceTotal: f.recoverableOccurrenceTotal,
      occurrencesPerRecordEnriched: coverage && coverage.missing > 0 ? Number((f.recoverableOccurrenceTotal / coverage.missing).toFixed(2)) : null,
    };
  }).sort((a, b) => (b.recordsRequiringEnrichment || 0) - (a.recordsRequiringEnrichment || 0));

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    scope: 'Estimates enrichment workload in RECORDS (names, surnames, or name/country pairs) requiring research, computed directly from audit/knowledge-coverage.json missing counts. This is not a time or cost estimate — no such estimate can be derived from repository data alone, so none is offered.',
    workload,
    notes: [
      '"occurrencesPerRecordEnriched" is recoverableOccurrenceTotal / recordsRequiringEnrichment — roughly how many rendered fallback/disclosed-missing statements convert to supported per one record fully enriched, on average. It is a ratio of two measured counts, not a prediction: enriching a specific single record could affect more or fewer occurrences than this average depending on which templates render for that record (e.g. only 150 of 3,697 names get a sibling-harmony page).',
      'trend\'s universe (name × country pairs, 18,485 possible combinations) is structurally different from the others (per-name or per-surname records) — its "records requiring enrichment" figure reflects pairs, not names, and is not directly comparable to the other rows without accounting for that.',
    ],
  };

  writeAuditJson('research-workload.json', report);
  console.log('Fields estimated:', workload.length, '| largest workload:', workload[0].field, '(' + workload[0].recordsRequiringEnrichment + ' records)');
}

run();
