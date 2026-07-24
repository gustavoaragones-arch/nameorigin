#!/usr/bin/env node
/**
 * scripts/audit/page-truthfulness.js — Phase 1C / PART 2: Page-Level
 * Truthfulness (READ-ONLY).
 *
 * For every template, tallies its assertions (from truthfulness-lib.js)
 * into the four states and computes the truthfulness ratio exactly as
 * specified: (supported + computed) / (supported + computed + fallback +
 * disclosed-missing). No weighting is invented — every assertion counts
 * once, in the one state already assigned to it in audit/truthfulness-matrix.json.
 */

const path = require('path');
const { AUDIT_DIR, readJsonSafe, writeAuditJson } = require('./_lib.js');
const { buildAssertions } = require('./truthfulness-lib.js');

function run() {
  console.log('PART 2 — Page-Level Truthfulness');
  const assertions = buildAssertions();

  const matrixPath = path.join(AUDIT_DIR, 'truthfulness-matrix.json');
  const matrix = readJsonSafe(matrixPath);
  if (!matrix) {
    console.error('Missing truthfulness-matrix.json — run scripts/audit/truthfulness-matrix.js first.');
    process.exit(1);
  }

  const byTemplate = {};
  for (const a of assertions) {
    if (!byTemplate[a.template]) byTemplate[a.template] = { supported: 0, computed: 0, 'disclosed-missing': 0, fallback: 0, assertions: [] };
    byTemplate[a.template][a.state] += 1;
    byTemplate[a.template].assertions.push(a.assertion);
  }

  const perTemplate = Object.keys(byTemplate).sort().map((tpl) => {
    const c = byTemplate[tpl];
    const totalAssertions = c.supported + c.computed + c.fallback + c['disclosed-missing'];
    const factualNumerator = c.supported + c.computed;
    const truthfulnessRatioPct = Number(((100 * factualNumerator) / totalAssertions).toFixed(1));
    return {
      template: tpl,
      totalAssertions,
      supported: c.supported,
      computed: c.computed,
      fallback: c.fallback,
      disclosedMissing: c['disclosed-missing'],
      truthfulnessRatioPct,
      formula: `(${c.supported} supported + ${c.computed} computed) / ${totalAssertions} total assertions = ${truthfulnessRatioPct}%`,
    };
  });

  // Site-wide rollup (same formula, applied across every assertion regardless of template).
  const totals = perTemplate.reduce(
    (acc, t) => ({ supported: acc.supported + t.supported, computed: acc.computed + t.computed, fallback: acc.fallback + t.fallback, disclosedMissing: acc.disclosedMissing + t.disclosedMissing }),
    { supported: 0, computed: 0, fallback: 0, disclosedMissing: 0 },
  );
  const totalAll = totals.supported + totals.computed + totals.fallback + totals.disclosedMissing;
  const siteWide = {
    totalAssertions: totalAll,
    ...totals,
    truthfulnessRatioPct: Number(((100 * (totals.supported + totals.computed)) / totalAll).toFixed(1)),
    note: 'This rolls up one row per (template, assertion) pair, not one row per generated page — a template with 3,697 live pages and a template with 1 live page each contribute equally here. See audit/truthfulness-hotspots.json for the same data sorted by fallback rate.',
  };

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    method: 'Ratio = (supported + computed) / (supported + computed + fallback + disclosed-missing), computed per assertion, per audit/truthfulness-matrix.json — no weighting invented.',
    perTemplate,
    siteWide,
    notes: [
      'A template with a high truthfulness ratio does not necessarily have more real data behind it than one with a low ratio — e.g. surname-compatibility-page scores highly because its curated dataset (75 surnames, 4 fields, 100% populated) is complete, while name-detail-page scores lower because its far larger dataset (3,697 names) is mostly uncurated. Scale is not accounted for in this ratio by design.',
      'This report does not rank templates by "quality" — it only counts, per the Phase 1C brief, how many of a template\'s known assertion mechanisms are backed by real or deterministic data versus substituted or disclosed as absent.',
    ],
  };

  writeAuditJson('page-truthfulness.json', report);
  console.log('Templates:', perTemplate.length, '| site-wide ratio:', siteWide.truthfulnessRatioPct + '%');
}

run();
