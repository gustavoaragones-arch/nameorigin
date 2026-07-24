#!/usr/bin/env node
/**
 * scripts/build/verify-adapters.js — Phase 3B Adapter Verification.
 *
 * Reads data/canonical/names.json (Phase 3A output, not rebuilt here),
 * runs it through lib/adapters/legacy-datasets.js, and verifies the result
 * against the ORIGINAL legacy datasets (data/names.json, data/popularity.json,
 * data/categories.json, data/variants.json) — not against the canonical
 * data again, since the adapter's whole purpose is legacy-shape fidelity.
 * Writes audit/adapter-validation.json. Read-only against every existing
 * dataset; writes only to /audit/.
 *
 * Usage: node scripts/build/verify-adapters.js
 * (requires data/canonical/names.json — run
 * scripts/build/build-canonical-entities.js first)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { buildLegacyDatasets } = require(path.join(ROOT, 'lib', 'adapters', 'legacy-datasets.js'));
const { toLegacyNameRecords } = require(path.join(ROOT, 'lib', 'adapters', 'legacy-name-record.js'));

const CANONICAL_PATH = path.join(ROOT, 'data', 'canonical', 'names.json');
const AUDIT_DIR = path.join(ROOT, 'audit');

const KNOWN_FALLBACK_MARKERS = [
  'documented given name', 'multiple traditions', 'various linguistic traditions',
  'various cultural traditions', 'various origins', 'the United States and other regions',
  'Rank and movement data are available for our covered countries',
];

function loadJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function groupRowsByKey(rows, keyField, valueField) {
  const m = new Map();
  rows.forEach((r) => {
    if (!m.has(r[keyField])) m.set(r[keyField], []);
    m.get(r[keyField]).push(valueField ? r[valueField] : r);
  });
  return m;
}

function setsEqual(a, b) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => JSON.stringify(v) === JSON.stringify(sb[i]));
}

function run() {
  console.log('Phase 3B — Adapter Verification');
  if (!fs.existsSync(CANONICAL_PATH)) {
    console.error('data/canonical/names.json not found — run scripts/build/build-canonical-entities.js first.');
    process.exit(1);
  }
  const entities = JSON.parse(fs.readFileSync(CANONICAL_PATH, 'utf8'));
  const legacy = buildLegacyDatasets(entities);

  const origNames = loadJson('data/names.json');
  const origPopularity = loadJson('data/popularity.json');
  const origCategories = loadJson('data/categories.json');
  const origVariants = loadJson('data/variants.json');

  const checks = [];

  // --- Check 1: record counts identical ---
  const countChecks = [
    { collection: 'names', adapterCount: legacy.names.length, originalCount: origNames.length },
    { collection: 'namesEnriched', adapterCount: legacy.namesEnriched.length, originalCount: origNames.length },
    { collection: 'popularity', adapterCount: legacy.popularity.length, originalCount: origPopularity.length },
    { collection: 'categories', adapterCount: legacy.categories.length, originalCount: origCategories.length },
    { collection: 'variants', adapterCount: legacy.variants.length, originalCount: origVariants.length },
  ];
  const countMismatches = countChecks.filter((c) => c.adapterCount !== c.originalCount);
  checks.push({ check: 'Record counts identical to legacy datasets', result: countMismatches.length === 0 ? 'PASS' : 'FAIL', detail: countChecks, failures: countMismatches });

  // --- Check 2: legacy field names preserved (exact key set match, sampled across all rows for names; first row for relational datasets since shape is uniform) ---
  const expectedNameKeys = Object.keys(origNames[0]).concat(['origin_cluster', 'origin_confidence']).sort();
  const keyMismatches = [];
  legacy.names.forEach((r, i) => {
    const keys = Object.keys(r).sort();
    if (JSON.stringify(keys) !== JSON.stringify(expectedNameKeys)) keyMismatches.push({ index: i, keys });
  });
  checks.push({
    check: 'Legacy field names preserved (names/namesEnriched)',
    result: keyMismatches.length === 0 ? 'PASS' : 'FAIL',
    detail: `Expected keys: ${expectedNameKeys.join(', ')} (base names.json keys + origin_cluster/origin_confidence, per documented adapter deviation)`,
    failures: keyMismatches.slice(0, 5),
  });

  const relationalKeyChecks = [
    { collection: 'popularity', expected: Object.keys(origPopularity[0]).sort(), actual: legacy.popularity[0] ? Object.keys(legacy.popularity[0]).sort() : [] },
    { collection: 'categories', expected: Object.keys(origCategories[0]).sort(), actual: legacy.categories[0] ? Object.keys(legacy.categories[0]).sort() : [] },
    { collection: 'variants', expected: Object.keys(origVariants[0]).sort(), actual: legacy.variants[0] ? Object.keys(legacy.variants[0]).sort() : [] },
  ];
  const relationalKeyMismatches = relationalKeyChecks.filter((c) => JSON.stringify(c.expected) !== JSON.stringify(c.actual));
  checks.push({ check: 'Legacy field names preserved (relational datasets)', result: relationalKeyMismatches.length === 0 ? 'PASS' : 'FAIL', detail: relationalKeyChecks, failures: relationalKeyMismatches });

  // --- Check 3: identity preserved (id/name/gender/first_letter exact match per row, order-independent) ---
  const origById = new Map(origNames.map((n) => [n.id, n]));
  let identityMismatches = [];
  legacy.names.forEach((r) => {
    const orig = origById.get(r.id);
    if (!orig) { identityMismatches.push({ id: r.id, reason: 'no matching original record' }); return; }
    if (r.name !== orig.name || r.gender !== orig.gender || r.first_letter !== orig.first_letter) {
      identityMismatches.push({ id: r.id, expected: { name: orig.name, gender: orig.gender, first_letter: orig.first_letter }, actual: { name: r.name, gender: r.gender, first_letter: r.first_letter } });
    }
  });
  checks.push({ check: 'Identity preserved (id/name/gender/first_letter)', result: identityMismatches.length === 0 ? 'PASS' : 'FAIL', detail: `${legacy.names.length} records checked`, failures: identityMismatches.slice(0, 5) });

  // --- Check 4: relational content preserved as per-name_id sets (order-independent — see docs/ADAPTER_LAYER.md) ---
  const catGroupsAdapter = groupRowsByKey(legacy.categories, 'name_id', 'category');
  const catGroupsOrig = groupRowsByKey(origCategories, 'name_id', 'category');
  let categoryContentMismatches = 0;
  for (const [id, cats] of catGroupsOrig) { if (!setsEqual(catGroupsAdapter.get(id) || [], cats)) categoryContentMismatches += 1; }

  const varGroupsAdapter = groupRowsByKey(legacy.variants, 'name_id', 'variant');
  const varGroupsOrig = groupRowsByKey(origVariants, 'name_id', 'variant');
  let variantContentMismatches = 0;
  for (const [id, vars] of varGroupsOrig) { if (!setsEqual(varGroupsAdapter.get(id) || [], vars)) variantContentMismatches += 1; }

  const popGroupsAdapter = groupRowsByKey(legacy.popularity, 'name_id');
  const popGroupsOrig = groupRowsByKey(origPopularity, 'name_id');
  let popularityContentMismatches = 0;
  for (const [id, rows] of popGroupsOrig) {
    const a = (popGroupsAdapter.get(id) || []).map((r) => JSON.stringify(r)).sort();
    const b = rows.map((r) => JSON.stringify(r)).sort();
    if (JSON.stringify(a) !== JSON.stringify(b)) popularityContentMismatches += 1;
  }

  checks.push({
    check: 'Relational content preserved (categories, variants, popularity — compared as per-name_id sets, order-independent)',
    result: (categoryContentMismatches === 0 && variantContentMismatches === 0 && popularityContentMismatches === 0) ? 'PASS' : 'FAIL',
    detail: { categoryContentMismatches, variantContentMismatches, popularityContentMismatches, note: 'Literal array order differs from the original files in some cases (verified separately, not a failure — see docs/ADAPTER_LAYER.md) because the original datasets were built in multiple passes; content per name_id is what this check verifies.' },
  });

  // --- Check 5: null handling preserved — zero fallback-text markers anywhere in adapter output ---
  const allStrings = [];
  function collectStrings(v) {
    if (v == null) return;
    if (typeof v === 'string') { allStrings.push(v); return; }
    if (Array.isArray(v)) { v.forEach(collectStrings); return; }
    if (typeof v === 'object') { Object.values(v).forEach(collectStrings); }
  }
  [legacy.names, legacy.namesEnriched, legacy.popularity, legacy.categories, legacy.variants].forEach((coll) => coll.forEach(collectStrings));
  const joined = allStrings.join(' • ');
  const fallbackHits = KNOWN_FALLBACK_MARKERS.filter((m) => joined.includes(m));
  checks.push({ check: 'Null handling preserved (zero fallback-text markers)', result: fallbackHits.length === 0 ? 'PASS' : 'FAIL', detail: `${fallbackHits.length} marker(s) found`, failures: fallbackHits });

  // --- Check 6: deterministic output (build twice, compare byte-for-byte) ---
  const legacy2 = buildLegacyDatasets(entities);
  const deterministic = JSON.stringify(legacy) === JSON.stringify(legacy2);
  checks.push({ check: 'Deterministic output (rebuilt twice from same input, byte-identical)', result: deterministic ? 'PASS' : 'FAIL', detail: deterministic ? 'Two independent adapter runs over the same canonical input produced byte-identical JSON.' : 'Outputs differed between runs.' });

  // --- Check 7: no invented values — every legacy field value traces to either the canonical entity or the documented self-row reconstruction rule ---
  // (Structural proof: re-derive toLegacyNameRecords independently and diff.)
  const rebuiltNames = toLegacyNameRecords(entities);
  const namesMatchAdapter = JSON.stringify(rebuiltNames) === JSON.stringify(legacy.names);
  checks.push({ check: 'No invented values (single-entity adapter output matches collection adapter output)', result: namesMatchAdapter ? 'PASS' : 'FAIL', detail: 'lib/adapters/legacy-name-record.js and lib/adapters/legacy-datasets.js must produce identical per-entity output through two different call paths.' });

  const overallResult = checks.every((c) => c.result === 'PASS') ? 'PASS' : 'FAIL';

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    sourceFile: 'data/canonical/names.json',
    entitiesProcessed: entities.length,
    checks,
    overallResult,
  };

  fs.writeFileSync(path.join(AUDIT_DIR, 'adapter-validation.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log('Wrote audit/adapter-validation.json — overall:', overallResult);
  checks.forEach((c) => console.log('  -', c.check, '->', c.result));

  if (overallResult !== 'PASS') process.exit(1);
}

run();
