#!/usr/bin/env node
/**
 * scripts/audit/knowledge-roi.js — Phase 1D: audit/knowledge-roi.json
 * (READ-ONLY).
 *
 * One record per knowledge field (assertion concept, reusing Phase 1C's
 * 17-concept catalog). Computes current coverage, templates/assertions
 * affected, fallback-removed / disclosed-converted occurrence counts if
 * the field were fully populated, pages impacted, and a normalized
 * Knowledge Recovery Score — all derived from measurable audit data.
 */

const { writeAuditJson } = require('./_lib.js');
const { buildConceptImpacts } = require('./knowledge-recovery-lib.js');

const CONCEPT_LABELS = {
  meaning: 'Meaning', origin: 'Origin (country / language / cluster)', popularity: 'Popularity',
  pronunciation: 'Pronunciation (phonetic)', heraldry: 'Heraldry', trend: 'Trend / rank movement',
  equivalent_names: 'Equivalent names', category: 'Category / style tag', syllables: 'Syllables',
  gender: 'Gender', letter: 'Letter (alphabetical)', variants: 'Spelling variants',
  compatibility_score: 'Compatibility / harmony score', surname_origin: 'Surname origin',
  cultural_context: 'Cultural context (compare-page)', 'gender-cluster': 'Gender/country cluster (names-like)',
  'phonetic-similarity': 'Phonetic similarity (names-like)',
};

function run() {
  console.log('Knowledge ROI — audit/knowledge-roi.json');
  const impacts = buildConceptImpacts();

  const maxRecoverable = Math.max(...impacts.map((i) => i.recoverableOccurrenceTotal), 1);

  const records = impacts.map((i) => {
    const score = Math.round((100 * i.recoverableOccurrenceTotal) / maxRecoverable);
    return {
      field: i.concept,
      label: CONCEPT_LABELS[i.concept] || i.concept,
      currentCoverage: i.currentCoverage
        ? { present: i.currentCoverage.present, total: i.currentCoverage.totalRecords, missing: i.currentCoverage.missing, coveragePct: i.currentCoverage.coveragePct }
        : { note: 'No missing-data state for this field (always computed or structurally 100% present) — not applicable.' },
      templatesAffected: i.templatesAffected,
      assertionTypesAffected: i.allInstances.filter((a) => a.state === 'fallback' || a.state === 'disclosed-missing').map((a) => ({ template: a.template, assertion: a.assertion, currentState: a.state })),
      fallbackAssertionsRemovedIfComplete: { assertionTypeCount: i.fallbackAssertionCount, totalPageOccurrences: i.fallbackOccurrenceTotal, breakdown: i.fallbackOccurrences },
      disclosedMissingConvertedToSupported: { assertionTypeCount: i.disclosedMissingAssertionCount, totalPageOccurrences: i.disclosedOccurrenceTotal, breakdown: i.disclosedOccurrences },
      pagesImpacted: i.pagesImpacted,
      recoverableOccurrenceTotal: i.recoverableOccurrenceTotal,
      knowledgeRecoveryScore: i.hasRecoveryPotential ? score : 0,
    };
  }).sort((a, b) => b.knowledgeRecoveryScore - a.knowledgeRecoveryScore);

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    scope: 'Quantifies recovery potential only — no implementation advice, no editorial recommendation beyond the measured numbers themselves.',
    method: {
      recoverableOccurrenceTotal: 'Sum, across every fallback- or disclosed-missing-classified assertion tied to this field (from audit/truthfulness-matrix.json, Phase 1C), of the number of currently-rendered pages showing that non-factual state. This is the count of individual rendered statements that would flip to a factual (supported) state if the field reached 100% coverage.',
      knowledgeRecoveryScore: 'round(100 * thisField.recoverableOccurrenceTotal / maxAcrossAllFields.recoverableOccurrenceTotal) — a linear normalization of the measured occurrence total, bounded 0-100. No weighting, multiplier, or subjective factor is applied; the field with the single largest measured recoverable-occurrence total scores 100.',
      pagesImpacted: 'Sum of live page counts (audit/project-inventory.json) for every distinct template containing at least one fallback or disclosed-missing assertion tied to this field. Templates are counted once each even if they contain multiple assertions for the same field.',
    },
    fields: records,
    notes: [
      'Fields with knowledgeRecoveryScore = 0 either have no missing-data state at all (letter, syllables, variants, gender, compatibility_score, surname_origin — all computed or fully curated) or currently produce zero fallback/disclosed-missing occurrences.',
      'A field appearing in multiple templates (e.g. origin, popularity) may show a fallbackOccurrenceTotal larger than its own missing-record count, because more than one assertion on the same page can independently render the same absent field (e.g. origin renders in 3 separate sections plus 1 FAQ answer on name-detail-page alone) — see the breakdown arrays for the per-assertion detail.',
    ],
  };

  writeAuditJson('knowledge-roi.json', report);
  console.log('Fields scored:', records.length, '| top field:', records[0].field, '(score ' + records[0].knowledgeRecoveryScore + ')');
}

run();
