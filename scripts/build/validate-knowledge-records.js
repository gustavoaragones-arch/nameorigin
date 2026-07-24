#!/usr/bin/env node
/**
 * Phase 6A — Validate Knowledge Record v2 migration integrity.
 */

const fs = require('fs');
const path = require('path');
const {
  DOMAINS,
  PATHS,
  loadJson,
  normalizeKey,
  loadLegacyOverrideBundle,
  loadResearchIndexes,
  buildKnowledgeRecordsFromLegacy,
  loadKnowledgeRecordsPayload,
} = require('../editorial/knowledge-record-v2.js');

const SCHEMA_PATH = path.join(__dirname, '..', '..', 'schemas', 'knowledge-record-v2.schema.json');

function validateSchemaShape(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object') {
    errors.push('Payload must be an object.');
    return errors;
  }
  if (payload.schemaVersion !== '2.0') {
    errors.push(`schemaVersion must be 2.0 (got ${payload.schemaVersion}).`);
  }
  if (!Array.isArray(payload.records)) {
    errors.push('records must be an array.');
    return errors;
  }

  const seen = new Set();
  for (const record of payload.records) {
    const key = normalizeKey(record?.name);
    if (!key) {
      errors.push('Record missing name.');
      continue;
    }
    if (seen.has(key)) {
      errors.push(`Duplicate record for ${key}.`);
    }
    seen.add(key);

    for (const domain of DOMAINS) {
      if (!record[domain]) continue;
      const field = record[domain];
      if (!Object.prototype.hasOwnProperty.call(field, 'value')) {
        errors.push(`${record.name}.${domain} missing value.`);
      }
      if (!Object.prototype.hasOwnProperty.call(field, 'confidence')) {
        errors.push(`${record.name}.${domain} missing confidence.`);
      }
      if (!Object.prototype.hasOwnProperty.call(field, 'confidenceLevel')) {
        errors.push(`${record.name}.${domain} missing confidenceLevel.`);
      }
      if (!Array.isArray(field.sources)) {
        errors.push(`${record.name}.${domain} missing sources array.`);
      }
      if (!Object.prototype.hasOwnProperty.call(field, 'notes')) {
        errors.push(`${record.name}.${domain} missing notes.`);
      }
    }
  }

  return errors;
}

function validateDeterministicOrdering(records) {
  const keys = records.map((row) => normalizeKey(row.name));
  const sorted = [...keys].sort((a, b) => a.localeCompare(b));
  return keys.every((key, index) => key === sorted[index]);
}

function validateLegacyMigration(payload, legacy, research) {
  const errors = [];
  const recordByKey = new Map(payload.records.map((row) => [normalizeKey(row.name), row]));

  const checks = [
    {
      domain: 'origin',
      legacyMap: legacy.origin,
      getValue: (override) => ({
        origin_country: override.origin_country ?? null,
        origin_cluster: override.origin_cluster ?? null,
        language: override.language ?? null,
      }),
      getConfidence: (override) => override.confidence ?? null,
    },
    {
      domain: 'meaning',
      legacyMap: legacy.meaning,
      getValue: (override) => override.meaning ?? null,
      getConfidence: (override) => override.confidence ?? null,
    },
    {
      domain: 'pronunciation',
      legacyMap: legacy.pronunciation,
      getValue: (override) => override.phonetic ?? null,
      getConfidence: (override) => override.confidence ?? null,
    },
    {
      domain: 'etymology',
      legacyMap: legacy.etymology,
      getValue: (override) => override.etymology ?? null,
      getConfidence: (override) => override.confidence ?? null,
    },
    {
      domain: 'history',
      legacyMap: legacy.history,
      getValue: (override) => override.history ?? null,
      getConfidence: (override) => override.confidence ?? null,
    },
  ];

  for (const check of checks) {
    for (const [key, override] of Object.entries(check.legacyMap)) {
      const record = recordByKey.get(key);
      if (!record) {
        errors.push(`Missing migrated record for legacy ${check.domain} key ${key}.`);
        continue;
      }
      const domainField = record[check.domain];
      if (!domainField) {
        errors.push(`Missing ${check.domain} domain on record ${key}.`);
        continue;
      }

      const expectedValue = check.getValue(override);
      const actualValue = domainField.value;
      if (JSON.stringify(expectedValue) !== JSON.stringify(actualValue)) {
        errors.push(`Value mismatch for ${key}.${check.domain}.`);
      }

      if (domainField.confidence !== check.getConfidence(override)) {
        errors.push(`Confidence mismatch for ${key}.${check.domain}.`);
      }

      const researchEntry = research[check.domain].get(key);
      if (researchEntry) {
        if (JSON.stringify(domainField.sources) !== JSON.stringify(researchEntry.sources || [])) {
          errors.push(`Source metadata mismatch for ${key}.${check.domain}.`);
        }
        if (domainField.notes !== (researchEntry.researchNotes ?? null)) {
          errors.push(`Notes mismatch for ${key}.${check.domain}.`);
        }
        if (domainField.confidenceLevel !== researchEntry.confidenceLevel) {
          errors.push(`Confidence level mismatch for ${key}.${check.domain}.`);
        }
      }
    }
  }

  return errors;
}

function main() {
  const legacy = loadLegacyOverrideBundle();
  const research = loadResearchIndexes();
  const expected = buildKnowledgeRecordsFromLegacy(legacy, research);
  const payload = loadKnowledgeRecordsPayload();

  if (!payload) {
    throw new Error('Missing data/knowledge-records.json — run build-knowledge-records.js first.');
  }

  const schemaErrors = validateSchemaShape(payload);
  const orderingOk = validateDeterministicOrdering(payload.records);
  const migrationErrors = validateLegacyMigration(payload, legacy, research);

  const domainCounts = {
    origin: payload.records.filter((row) => row.origin).length,
    meaning: payload.records.filter((row) => row.meaning).length,
    pronunciation: payload.records.filter((row) => row.pronunciation).length,
    etymology: payload.records.filter((row) => row.etymology).length,
    history: payload.records.filter((row) => row.history).length,
  };

  const legacyCounts = {
    origin: Object.keys(legacy.origin).length,
    meaning: Object.keys(legacy.meaning).length,
    pronunciation: Object.keys(legacy.pronunciation).length,
    etymology: Object.keys(legacy.etymology).length,
    history: Object.keys(legacy.history).length,
  };

  const report = {
    phase: '6A',
    title: 'Knowledge Record v2 Validation',
    generatedAt: new Date().toISOString(),
    schemaPath: 'schemas/knowledge-record-v2.schema.json',
    totals: {
      records: payload.records.length,
      expectedRecords: expected.records.length,
    },
    domainCounts,
    legacyCounts,
    checks: {
      schemaValid: schemaErrors.length === 0,
      deterministicOrdering: orderingOk,
      everyLegacyOverrideMigrated: migrationErrors.length === 0,
      noDuplicateRecords: schemaErrors.filter((msg) => msg.startsWith('Duplicate')).length === 0,
      confidencePreserved: migrationErrors.filter((msg) => msg.includes('Confidence mismatch')).length === 0,
      sourceMetadataPreserved: migrationErrors.filter((msg) => msg.includes('Source metadata mismatch')).length === 0,
      notesPreserved: migrationErrors.filter((msg) => msg.includes('Notes mismatch')).length === 0,
    },
    errors: [...schemaErrors, ...migrationErrors],
    overall: schemaErrors.length === 0 && orderingOk && migrationErrors.length === 0 ? 'PASS' : 'FAIL',
  };

  console.log('Knowledge Record v2 validation:', report.overall);
  console.log('  Records:', report.totals.records);
  console.log('  Schema valid:', report.checks.schemaValid);
  console.log('  Deterministic ordering:', report.checks.deterministicOrdering);
  console.log('  Legacy migration complete:', report.checks.everyLegacyOverrideMigrated);
  if (report.errors.length) {
    console.log('  Errors:', report.errors.length);
    report.errors.slice(0, 20).forEach((msg) => console.log('   -', msg));
  }

  if (report.overall !== 'PASS') {
    process.exitCode = 1;
  }

  return report;
}

if (require.main === module) {
  main();
}

module.exports = { main };
