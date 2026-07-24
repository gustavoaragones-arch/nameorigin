#!/usr/bin/env node
/**
 * scripts/audit/assertion-catalog.js — Phase 1C / PART 4: Assertion
 * Catalog (READ-ONLY).
 *
 * Unlike audit/truthfulness-matrix.json (Part 1, organized by template),
 * this inventories CLAIMS: every distinct factual-statement concept the
 * site can generate (meaning, origin, popularity, ...), grouped across all
 * the templates it appears in. Built entirely from the same
 * scripts/audit/truthfulness-lib.js assertion list — no new classification
 * logic, no duplicated literals.
 */

const { writeAuditJson } = require('./_lib.js');
const { buildAssertions } = require('./truthfulness-lib.js');

const CONCEPT_LABELS = {
  meaning: 'Meaning',
  origin: 'Origin',
  syllables: 'Syllables',
  letter: 'Letter (alphabetical)',
  gender: 'Gender',
  variants: 'Spelling variants',
  category: 'Category / style tag',
  popularity: 'Popularity',
  trend: 'Trend / rank movement',
  pronunciation: 'Pronunciation',
  'phonetic-similarity': 'Phonetic similarity (names-like pool)',
  'gender-cluster': 'Gender/country cluster (names-like alternatives)',
  compatibility_score: 'Compatibility / harmony score',
  surname_origin: 'Surname origin',
  heraldry: 'Heraldry',
  equivalent_names: 'Equivalent names (cross-linguistic)',
  cultural_context: 'Cultural context',
};

function run() {
  console.log('PART 4 — Assertion Catalog');
  const assertions = buildAssertions();

  const byConcept = {};
  for (const a of assertions) {
    if (!byConcept[a.concept]) byConcept[a.concept] = [];
    byConcept[a.concept].push(a);
  }

  const catalog = Object.keys(byConcept).sort().map((concept) => {
    const rows = byConcept[concept];
    const templates = [...new Set(rows.map((r) => r.template))];
    const states = [...new Set(rows.map((r) => r.state))];
    return {
      concept,
      label: CONCEPT_LABELS[concept] || concept,
      assertionCount: rows.length,
      pageTemplates: templates,
      backingDatasets: [...new Set(rows.map((r) => r.backingDataset))],
      generators: [...new Set(rows.map((r) => r.generatorFunction))],
      truthfulnessStates: states,
      stateVariesByTemplate: states.length > 1,
      instances: rows.map((r) => ({ template: r.template, assertion: r.assertion, state: r.state, generatorFunction: r.generatorFunction })),
    };
  });

  const conceptsWithMixedStates = catalog.filter((c) => c.stateVariesByTemplate);

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    purpose: 'Inventories CLAIMS the site can make (e.g. "meaning", "origin", "popularity"), not raw dataset fields — the same underlying field can back multiple distinct assertions across different templates, and this catalog is organized by the claim, cross-referencing every template it appears in.',
    conceptCount: catalog.length,
    totalAssertionInstances: assertions.length,
    concepts: catalog,
    conceptsWithMixedTruthfulnessStates: conceptsWithMixedStates.map((c) => ({
      concept: c.concept,
      label: c.label,
      states: c.truthfulnessStates,
      note: 'The same conceptual claim is classified differently depending on which template/generator renders it — see instances[] for the per-template breakdown.',
    })),
    notes: [
      'Example of why this view matters: "meaning" appears as both a fallback (direct-answer/meta-description text) and a disclosed-missing placeholder (Quick Facts table "—") on the SAME name-detail-page template, because two independently-coded sections handle the same empty field differently. A field-level or template-level view alone would not surface that inconsistency; the concept-level view here does.',
      `This catalog contains ${assertions.length} assertion instances across ${catalog.length} distinct concepts, matching audit/truthfulness-matrix.json exactly (same underlying data, different grouping) — no assertion was added or dropped between the two views.`,
    ],
  };

  writeAuditJson('assertion-catalog.json', report);
  console.log('Concepts:', catalog.length, '| assertion instances:', assertions.length, '| concepts with mixed states:', conceptsWithMixedStates.length);
}

run();
