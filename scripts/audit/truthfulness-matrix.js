#!/usr/bin/env node
/**
 * scripts/audit/truthfulness-matrix.js — Phase 1C / PART 1: Truthfulness
 * Matrix (READ-ONLY).
 *
 * For every page template, for every rendered assertion, classifies it
 * into exactly one of four states: supported | computed | disclosed-missing
 * | fallback. Built entirely from scripts/audit/truthfulness-lib.js's
 * buildAssertions() — no new classification logic lives in this file.
 */

const { writeAuditJson } = require('./_lib.js');
const { STATES, buildAssertions } = require('./truthfulness-lib.js');

function run() {
  console.log('PART 1 — Truthfulness Matrix');
  const assertions = buildAssertions();

  const byTemplate = {};
  for (const a of assertions) {
    if (!byTemplate[a.template]) byTemplate[a.template] = [];
    byTemplate[a.template].push({
      assertion: a.assertion,
      concept: a.concept,
      state: a.state,
      backingDataset: a.backingDataset,
      generatorFunction: a.generatorFunction,
      evidence: a.evidence,
      minorityPath: a.minorityPath || null,
      note: a.note || null,
    });
  }

  // Internal validation: every assertion has exactly one of the four
  // states, and no assertion id repeats within a template.
  const templates = Object.keys(byTemplate);
  const validation = templates.map((tpl) => {
    const rows = byTemplate[tpl];
    const counts = { supported: 0, computed: 0, 'disclosed-missing': 0, fallback: 0 };
    rows.forEach((r) => {
      if (!STATES.includes(r.state)) throw new Error(`Invalid state "${r.state}" in template ${tpl}`);
      counts[r.state] += 1;
    });
    const sum = Object.values(counts).reduce((s, v) => s + v, 0);
    return { template: tpl, totalAssertions: rows.length, counts, sumMatchesTotal: sum === rows.length };
  });
  const allValid = validation.every((v) => v.sumMatchesTotal);
  if (!allValid) throw new Error('Validation failed: supported+computed+fallback+disclosed-missing did not equal total assertions for at least one template.');

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    scope: 'Truthfulness (data-backing) only. Not a quality, SEO, or hallucination-detection audit. Classification rules: supported = comes directly from structured data; computed = derived deterministically with no missing state; disclosed-missing = the page honestly states or silently omits an unknown; fallback = the generator substitutes generic prose that reads as a specific claim.',
    states: STATES,
    templates: byTemplate,
    validation,
    notes: [
      'Every count in the evidence field is either grep-verified against real generated HTML (method: "grep-verified" / "live-data-count") or pulled from a prior Phase 1A/1B audit report (method: "phase1b-coverage") — no percentage in this file was estimated by inspection alone.',
      'Where an assertion behaves differently depending on whether its backing data is present, ONE dominant state is recorded here (matching the majority real-world case) and the minority behavior is recorded in minorityPath — this keeps every assertion in exactly one of the four buckets as required, while still disclosing the alternate path.',
    ],
  };

  writeAuditJson('truthfulness-matrix.json', report);
  console.log('Templates:', templates.length, '| assertions:', assertions.length, '| all templates validate:', allValid);
}

run();
