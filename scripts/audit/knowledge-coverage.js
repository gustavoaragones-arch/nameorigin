#!/usr/bin/env node
/**
 * scripts/audit/knowledge-coverage.js — Phase 1B / PART 1: Attribute Coverage (READ-ONLY).
 *
 * For every array-shaped dataset in /data, every field is auto-discovered
 * (union of keys across records) and coverage/missing % is computed. For
 * keyed-object datasets (origin-overrides.json, name-equivalents.json,
 * heraldry.json) coverage is computed against the appropriate entity
 * universe (names or surnames). See scripts/audit/knowledge-lib.js for the
 * generic scanning method.
 */

const { loadDataJson, writeAuditJson } = require('./_lib.js');
const { scanArrayFieldCoverage } = require('./knowledge-lib.js');

function run() {
  console.log('PART 1 — Attribute Coverage');

  const names = loadDataJson('names') || [];
  const namesEnriched = loadDataJson('names-enriched') || [];
  const normalizedNames = loadDataJson('normalized-names') || [];
  const categories = loadDataJson('categories') || [];
  const popularity = loadDataJson('popularity') || [];
  const variants = loadDataJson('variants') || [];
  const lastNames = loadDataJson('last-names') || [];
  const countries = loadDataJson('countries') || [];
  const countryDifferentials = loadDataJson('country-differentials') || {};
  const nameEquivalents = loadDataJson('name-equivalents') || {};
  const heraldry = loadDataJson('heraldry') || {};
  const originOverrides = loadDataJson('origin-overrides') || {};

  const totalNames = names.length;
  const totalSurnames = lastNames.length;

  // --- Array-shaped datasets: fully automatic field discovery. ---
  const arrayDatasets = {
    'names.json (base)': scanArrayFieldCoverage(names),
    'names-enriched.json (with origin overrides merged)': scanArrayFieldCoverage(namesEnriched),
    'normalized-names.json': scanArrayFieldCoverage(normalizedNames),
    'categories.json (per assignment row)': scanArrayFieldCoverage(categories),
    'popularity.json (per popularity row)': scanArrayFieldCoverage(popularity),
    'variants.json (per variant row)': scanArrayFieldCoverage(variants),
    'last-names.json': scanArrayFieldCoverage(lastNames),
    'countries.json': scanArrayFieldCoverage(countries),
    'country-differentials.json entries[]': scanArrayFieldCoverage(countryDifferentials.entries || []),
  };

  // --- Entity-level (name-universe) coverage: how many of the 3,697 names
  // have ANY row in a per-name dataset. This is the more meaningful number
  // for sparse relational datasets like popularity/variants/categories,
  // where row-level field coverage (above) would be 100% but hides that
  // almost no names have a row at all. ---
  const entityLevelCoverage = {
    meaning: {
      totalRecords: totalNames,
      present: namesEnriched.filter((n) => n.meaning && String(n.meaning).trim()).length,
      universe: 'names.json (3,697)',
    },
    origin_country_or_language: {
      totalRecords: totalNames,
      present: namesEnriched.filter((n) => n.origin_country || n.language).length,
      universe: 'names.json (3,697)',
    },
    origin_cluster: {
      totalRecords: totalNames,
      present: namesEnriched.filter((n) => n.origin_cluster).length,
      universe: 'names.json (3,697)',
    },
    phonetic: {
      totalRecords: totalNames,
      present: namesEnriched.filter((n) => n.phonetic).length,
      universe: 'names.json (3,697)',
    },
    syllables: {
      totalRecords: totalNames,
      present: namesEnriched.filter((n) => n.syllables != null).length,
      universe: 'names.json (3,697)',
    },
    gender: {
      totalRecords: totalNames,
      present: names.filter((n) => n.gender).length,
      universe: 'names.json (3,697)',
    },
    category_assignment: {
      totalRecords: totalNames,
      present: new Set(categories.map((c) => c.name_id)).size,
      universe: 'names.json (3,697); categories.json has ' + categories.length + ' total assignment rows',
    },
    popularity_record: {
      totalRecords: totalNames,
      present: new Set(popularity.map((p) => p.name_id)).size,
      universe: 'names.json (3,697); popularity.json has ' + popularity.length + ' total rows',
    },
    variant_record: {
      totalRecords: totalNames,
      present: new Set(variants.map((v) => v.name_id)).size,
      universe: 'names.json (3,697); variants.json has ' + variants.length + ' total rows',
    },
    origin_override: {
      totalRecords: totalNames,
      present: Object.keys(originOverrides).length,
      universe: 'names.json (3,697); data/origin-overrides.json keyed dataset',
    },
    equivalent_group: {
      totalRecords: totalNames,
      present: Object.keys(nameEquivalents).length,
      universe: 'names.json (3,697); data/name-equivalents.json keyed dataset (anchor names only)',
    },
    country_differential_entry: {
      totalRecords: totalNames * countries.length,
      present: (countryDifferentials.entries || []).length,
      universe: `names.json × countries.json = ${totalNames} × ${countries.length} = ${totalNames * countries.length} possible name/country pairs`,
    },
    heraldry_record: {
      totalRecords: totalSurnames,
      present: Object.keys(heraldry).length,
      universe: 'last-names.json (' + totalSurnames + ')',
    },
  };
  for (const key of Object.keys(entityLevelCoverage)) {
    const e = entityLevelCoverage[key];
    e.missing = e.totalRecords - e.present;
    e.coveragePct = Number(((100 * e.present) / e.totalRecords).toFixed(2));
    e.missingPct = Number((100 - e.coveragePct).toFixed(2));
  }

  // --- Non-structured / narrative "knowledge" concepts. These are not JSON
  // fields — they are prose sections that generators render for every name
  // page regardless of data availability. Their true coverage is measured
  // in audit/empty-knowledge.json (Part 6) via rendered-HTML fallback
  // scanning; they are listed here for completeness per the Phase 1B
  // brief's explicit request to include "historical context" / "culture". ---
  const narrativeConcepts = [
    { concept: 'historical_context', backedBy: 'no dedicated dataset — generated by buildCulturalContext() from origin_country/language only, with a generic fallback when absent', measuredIn: 'audit/empty-knowledge.json' },
    { concept: 'culture', backedBy: 'no dedicated dataset — same buildCulturalContext()/buildOriginLineage() functions as historical_context', measuredIn: 'audit/empty-knowledge.json' },
    { concept: 'trend_data', backedBy: 'data/regional-trend-acceleration.json (2 of 5 countries covered) + data/country-differentials.json (5 of 18,485 possible name/country pairs)', measuredIn: 'see entityLevelCoverage.country_differential_entry above' },
    { concept: 'surname_compatibility', backedBy: 'computed at build time by scoreCompatibility() from phonetic rules — not stored as a field, so it has no missing-data state the way meaning/origin do', measuredIn: 'n/a (always computed, not looked up)' },
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    scope: 'Knowledge coverage only — not a quality or SEO audit. See audit/PROJECT_INTELLIGENCE_REPORT.md (Phase 1A) for architecture.',
    method: 'Array-dataset field coverage is fully automatic (union of observed keys, non-empty-value ratio). Entity-level coverage answers "how many of the 3,697 names have any data at all" for relational datasets. See scripts/audit/knowledge-lib.js for exact rules (0 and false count as present; null/undefined/empty-string/empty-array/empty-object count as missing).',
    arrayDatasetFieldCoverage: arrayDatasets,
    entityLevelCoverage,
    narrativeKnowledgeConcepts: narrativeConcepts,
    notes: [
      'This report answers "how much structured data exists," not "is the page good." No quality judgment is made here.',
      'entityLevelCoverage is the more important number for downstream scoring: e.g. popularity.json fields are ~100% populated WITHIN its 7 existing rows, but those 7 rows cover only 5 of 3,697 names — the entity-level view surfaces that gap; the field-level view alone would not.',
    ],
  };

  writeAuditJson('knowledge-coverage.json', report);
  console.log('Array datasets scanned:', Object.keys(arrayDatasets).length, '| entity-level attributes:', Object.keys(entityLevelCoverage).length);
}

run();
