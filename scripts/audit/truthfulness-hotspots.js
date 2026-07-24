#!/usr/bin/env node
/**
 * scripts/audit/truthfulness-hotspots.js — Phase 1C / PART 5: Truthfulness
 * Hotspots (READ-ONLY).
 *
 * Re-views audit/page-truthfulness.json (Part 2), sorted descending by
 * fallback percentage, to surface where unsupported assertions
 * concentrate. No new classification logic — pure aggregation/sort.
 */

const path = require('path');
const { AUDIT_DIR, readJsonSafe, writeAuditJson } = require('./_lib.js');

function run() {
  console.log('PART 5 — Truthfulness Hotspots');
  const pt = readJsonSafe(path.join(AUDIT_DIR, 'page-truthfulness.json'));
  if (!pt) {
    console.error('Missing page-truthfulness.json — run scripts/audit/page-truthfulness.js first.');
    process.exit(1);
  }

  const hotspots = pt.perTemplate
    .map((t) => ({
      template: t.template,
      totalAssertions: t.totalAssertions,
      fallbackAssertions: t.fallback,
      supportedAssertions: t.supported,
      computedAssertions: t.computed,
      disclosedAssertions: t.disclosedMissing,
      fallbackPct: Number(((100 * t.fallback) / t.totalAssertions).toFixed(1)),
      truthfulnessPct: t.truthfulnessRatioPct,
    }))
    .sort((a, b) => b.fallbackPct - a.fallbackPct || a.truthfulnessPct - b.truthfulnessPct);

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    method: 'Sorted descending by fallbackPct (fallback assertions / total assertions for that template); ties broken by ascending truthfulnessPct. Source: audit/page-truthfulness.json — no counts recomputed here.',
    hotspots,
    highestFallbackTemplate: hotspots[0],
    notes: [
      'A high fallbackPct here does not by itself indicate how many live pages are affected — cross-reference audit/project-inventory.json page counts per template (e.g. name-detail-page carries its fallback rate across 3,697 pages; compare-name-country-pair-page carries a similar rate across only 20).',
    ],
  };

  writeAuditJson('truthfulness-hotspots.json', report);
  console.log('Templates ranked:', hotspots.length, '| highest fallback %:', hotspots[0].template, hotspots[0].fallbackPct + '%');
}

run();
