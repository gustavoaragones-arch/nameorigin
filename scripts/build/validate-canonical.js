#!/usr/bin/env node
/**
 * scripts/build/validate-canonical.js — Phase 3A Entity Validation.
 *
 * Reads data/canonical/names.json (produced by build-canonical-entities.js)
 * and runs a deeper validation pass than that script's inline schema check:
 * ownership rules, duplicate-field detection, null-handling correctness
 * (including a direct check against the known fallback-text markers found
 * in Phases 1C/1D), and identifier uniqueness. Writes
 * audit/canonical-validation.json. Read-only against data/canonical/names.json
 * (does not rebuild it) and writes only to /audit/.
 *
 * Usage: node scripts/build/validate-canonical.js
 * (requires data/canonical/names.json to already exist — run
 * scripts/build/build-canonical-entities.js first)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { validateEntity } = require(path.join(ROOT, 'lib', 'canonical', 'schema-check.js'));
const SCHEMA = require(path.join(ROOT, 'schemas', 'name-entity.schema.json'));
const CANONICAL_PATH = path.join(ROOT, 'data', 'canonical', 'names.json');
const AUDIT_DIR = path.join(ROOT, 'audit');

// Literal fallback markers from scripts/audit/knowledge-lib.js FALLBACK_MARKERS
// (Phases 1B/1C) — the canonical model's core promise is that none of these
// ever appear as a real value; absence must be null, never this text.
const KNOWN_FALLBACK_MARKERS = [
  'documented given name',
  'multiple traditions',
  'various linguistic traditions',
  'various cultural traditions',
  'various origins',
  'the United States and other regions',
  'Rank and movement data are available for our covered countries',
];

const DOMAIN_KEYS = [
  'identity', 'classification', 'meaning', 'origin', 'language', 'etymology',
  'history', 'culture', 'religion', 'usage', 'pronunciation', 'variants',
  'nicknames', 'relatedNames', 'popularity', 'relationships', 'citations', 'metadata',
];

function collectStrings(value, acc) {
  if (value === null || value === undefined) return;
  if (typeof value === 'string') { acc.push(value); return; }
  if (Array.isArray(value)) { value.forEach((v) => collectStrings(v, acc)); return; }
  if (typeof value === 'object') { Object.values(value).forEach((v) => collectStrings(v, acc)); }
}

function run() {
  console.log('Phase 3A — Canonical Entity Validation');
  if (!fs.existsSync(CANONICAL_PATH)) {
    console.error('data/canonical/names.json not found — run scripts/build/build-canonical-entities.js first.');
    process.exit(1);
  }
  const entities = JSON.parse(fs.readFileSync(CANONICAL_PATH, 'utf8'));

  // --- Check 1: schema compliance ---
  let schemaValid = 0;
  const schemaErrors = [];
  entities.forEach((e, i) => {
    const r = validateEntity(e, SCHEMA);
    if (r.valid) schemaValid += 1;
    else schemaErrors.push({ index: i, id: e.identity ? e.identity.id : null, errors: r.errors });
  });

  // --- Check 2: required fields (identity.id/slug/name/gender/firstLetter; metadata.schemaVersion/createdAt/lastUpdated) ---
  const requiredIdentity = ['id', 'slug', 'name', 'gender', 'firstLetter'];
  const requiredMetadata = ['schemaVersion', 'createdAt', 'lastUpdated'];
  let requiredFieldFailures = [];
  entities.forEach((e, i) => {
    requiredIdentity.forEach((f) => { if (e.identity == null || e.identity[f] == null) requiredFieldFailures.push(`entity[${i}].identity.${f} missing`); });
    requiredMetadata.forEach((f) => { if (e.metadata == null || e.metadata[f] == null) requiredFieldFailures.push(`entity[${i}].metadata.${f} missing`); });
  });

  // --- Check 3: ownership rules — every entity has exactly the 18 expected top-level domain keys, no extras ---
  let ownershipFailures = [];
  entities.forEach((e, i) => {
    const keys = Object.keys(e);
    const extra = keys.filter((k) => !DOMAIN_KEYS.includes(k));
    const missing = DOMAIN_KEYS.filter((k) => !keys.includes(k));
    if (extra.length) ownershipFailures.push(`entity[${i}] has unexpected top-level key(s): ${extra.join(', ')}`);
    if (missing.length) ownershipFailures.push(`entity[${i}] missing top-level key(s): ${missing.join(', ')}`);
  });

  // --- Check 4: duplicate/cross-domain field leakage — no PROSE-LIKE leaf
  // value (>=10 chars AND contains a space — i.e. looks like free-text
  // research content, not a short categorical/reference token) appears
  // identically in two different domains of the same entity. This is a
  // proxy for "domain X accidentally wrote domain Y's data".
  //
  // Short categorical tokens (country codes, gender, style labels) are
  // DELIBERATELY EXCLUDED: e.g. usage.regionsOfUse and popularity.records[].country
  // both legitimately containing "USA" is not a bug — usage.js's own header
  // comment documents that regionsOfUse is intentionally derived from this
  // entity's own popularity data. Flagging every shared enum-like value
  // would produce hundreds of false positives with no diagnostic value.
  let crossDomainDuplicates = [];
  entities.forEach((e, i) => {
    const valueToDomain = new Map();
    for (const domain of DOMAIN_KEYS) {
      const strs = [];
      collectStrings(e[domain], strs);
      for (const s of strs) {
        const looksLikeProse = s.length >= 10 && s.includes(' ');
        if (!looksLikeProse) continue;
        if (valueToDomain.has(s) && valueToDomain.get(s) !== domain) {
          crossDomainDuplicates.push({ entityIndex: i, value: s, domains: [valueToDomain.get(s), domain] });
        } else {
          valueToDomain.set(s, domain);
        }
      }
    }
  });

  // --- Check 5: null handling — zero occurrences of any known fallback-text marker anywhere in canonical data ---
  let fallbackMarkerHits = [];
  entities.forEach((e, i) => {
    const strs = [];
    collectStrings(e, strs);
    const joined = strs.join(' • ');
    KNOWN_FALLBACK_MARKERS.forEach((marker) => {
      if (joined.includes(marker)) fallbackMarkerHits.push({ entityIndex: i, id: e.identity.id, marker });
    });
  });

  // --- Check 6: identifier uniqueness ---
  const ids = entities.map((e) => e.identity.id);
  const slugs = entities.map((e) => e.identity.slug);
  const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i);
  const dupSlugs = slugs.filter((s, i) => slugs.indexOf(s) !== i);

  // --- Known, documented schema-shape deviation (not a failure) ---
  const comparisonPairsShapeCheck = entities
    .filter((e) => e.relationships && e.relationships.comparisonPairs)
    .flatMap((e) => e.relationships.comparisonPairs)
    .every((cp) => 'country' in cp && 'rank' in cp && !('countryA' in cp));

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    sourceFile: 'data/canonical/names.json',
    entitiesValidated: entities.length,
    checks: [
      { check: 'Schema compliance', result: schemaValid === entities.length ? 'PASS' : 'FAIL', detail: `${schemaValid} of ${entities.length} entities schema-valid`, failures: schemaErrors.slice(0, 10) },
      { check: 'Required fields present', result: requiredFieldFailures.length === 0 ? 'PASS' : 'FAIL', detail: `${requiredFieldFailures.length} missing-required-field occurrences`, failures: requiredFieldFailures.slice(0, 10) },
      { check: 'Ownership rules (exactly 18 domain keys per entity, no extras)', result: ownershipFailures.length === 0 ? 'PASS' : 'FAIL', detail: `${ownershipFailures.length} ownership violations`, failures: ownershipFailures.slice(0, 10) },
      { check: 'No cross-domain field duplication', result: crossDomainDuplicates.length === 0 ? 'PASS' : 'FAIL', detail: `${crossDomainDuplicates.length} suspected cross-domain duplicate prose-like values (>=10 chars, contains a space; short categorical tokens like country/gender codes are intentionally excluded — see code comment)`, failures: crossDomainDuplicates.slice(0, 10) },
      { check: 'Null handling — zero fallback-text markers in canonical data', result: fallbackMarkerHits.length === 0 ? 'PASS' : 'FAIL', detail: `${fallbackMarkerHits.length} occurrences of known fallback text found (should always be 0 — the entire point of this builder is to never write it)`, failures: fallbackMarkerHits.slice(0, 10) },
      { check: 'Identifier uniqueness (id + slug)', result: (dupIds.length === 0 && dupSlugs.length === 0) ? 'PASS' : 'FAIL', detail: `${dupIds.length} duplicate ids, ${dupSlugs.length} duplicate slugs`, failures: [...dupIds, ...dupSlugs].slice(0, 10) },
    ],
    knownDocumentedDeviations: [
      {
        item: 'relationships.comparisonPairs[] shape',
        description: 'Schema declares {countryA, countryB, rankA, rankB} (a country-pair shape); the real source dataset (data/country-differentials.json) is per-single-country, so the builder emits {country, rank, priorRank, delta, volatilityScore} instead of fabricating a second country to fit the pair shape. See lib/canonical/domains/relationships.js header comment.',
        verifiedConsistent: comparisonPairsShapeCheck,
      },
    ],
    overallResult: [schemaValid === entities.length, requiredFieldFailures.length === 0, ownershipFailures.length === 0, crossDomainDuplicates.length === 0, fallbackMarkerHits.length === 0, dupIds.length === 0 && dupSlugs.length === 0].every(Boolean) ? 'PASS' : 'FAIL',
  };

  fs.writeFileSync(path.join(AUDIT_DIR, 'canonical-validation.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log('Wrote audit/canonical-validation.json — overall:', report.overallResult);
  report.checks.forEach((c) => console.log('  -', c.check, '->', c.result, '(' + c.detail + ')'));

  if (report.overallResult !== 'PASS') process.exit(1);
}

run();
