#!/usr/bin/env node
/**
 * Phase 9B — Validate Popularity Records v1.
 */

const fs = require('fs');
const path = require('path');
const { validateNode } = require('../../lib/canonical/schema-check.js');
const {
  POPULARITY_PATHS,
  loadJson,
} = require('../editorial/popularity-infrastructure-v1.js');
const {
  buildPopularityRecordsPayload,
  hashPopularityRecordsSemantic,
  loadPopularityRecordsPayload,
  loadLegacyPopularityRows,
  POPULARITY_RECORD_PATHS,
  normalizeKey,
} = require('../editorial/popularity-records-v1.js');

const ROOT = path.join(__dirname, '..', '..');
const SCHEMA_PATH = path.join(ROOT, 'schemas', 'popularity-records-v1.schema.json');

function validateSchema(payload) {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  const envelopeErrors = validateNode(payload, schema, '$');
  const recordSchema = schema.$defs?.record;
  const itemErrors = [];
  if (recordSchema && Array.isArray(payload.records)) {
    payload.records.forEach((record, index) => {
      itemErrors.push(...validateNode(record, recordSchema, `$.records[${index}]`));
    });
  }
  const errors = [...envelopeErrors, ...itemErrors];
  return { valid: errors.length === 0, errors };
}

function validateRegistryReferences(payload, registry) {
  const errors = [];
  const registryIds = new Set((registry.sources || []).map((row) => row.id));
  for (const record of payload.records || []) {
    for (const sourceId of record.popularity?.sources || []) {
      if (!registryIds.has(sourceId)) {
        errors.push(`${record.name} references unknown source ID: ${sourceId}`);
      }
    }
    for (const [country, region] of Object.entries(record.popularity?.regions || {})) {
      if (region.sourceId && !registryIds.has(region.sourceId)) {
        errors.push(`${record.name}.${country} references unknown source ID: ${region.sourceId}`);
      }
      if (region.sourceId && !record.popularity.sources.includes(region.sourceId)) {
        errors.push(`${record.name}.${country} sourceId ${region.sourceId} missing from sources array.`);
      }
    }
  }
  return errors;
}

function validateSourceOrdering(payload) {
  const errors = [];
  for (const record of payload.records || []) {
    const ids = record.popularity?.sources || [];
    const sorted = [...ids].sort((a, b) => a.localeCompare(b));
    if (ids.join('|') !== sorted.join('|')) {
      errors.push(`${record.name} source IDs are not sorted.`);
    }
    const dupes = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    if (dupes.length) {
      errors.push(`${record.name} contains duplicate source IDs.`);
    }
  }
  return errors;
}

function validateRecordOrdering(payload) {
  const names = (payload.records || []).map((row) => row.name);
  const sorted = [...names].sort((a, b) => a.localeCompare(b));
  if (names.join('|') !== sorted.join('|')) {
    return ['Popularity records are not sorted alphabetically by name.'];
  }
  const seen = new Set();
  for (const name of names) {
    const key = normalizeKey(name);
    if (seen.has(key)) return [`Duplicate popularity record for ${name}.`];
    seen.add(key);
  }
  return [];
}

function validateLegacyMigration(payload) {
  const errors = [];
  const legacyRows = loadLegacyPopularityRows();
  const legacyEntityCount = new Set(legacyRows.map((row) => row.name_id)).size;

  if (payload.records.length !== legacyEntityCount) {
    errors.push(
      `Popularity record count ${payload.records.length} does not match legacy entity count ${legacyEntityCount}.`,
    );
  }

  let migratedRows = 0;
  for (const record of payload.records || []) {
    for (const region of Object.values(record.popularity?.regions || {})) {
      migratedRows += region.records?.length || 0;
    }
  }

  if (migratedRows !== legacyRows.length) {
    errors.push(
      `Migrated popularity rows ${migratedRows} does not match legacy row count ${legacyRows.length}.`,
    );
  }

  return errors;
}

function validateDeterministicRebuild(payload) {
  const rebuilt = buildPopularityRecordsPayload({ generatedAt: payload.generatedAt });
  const existingHash = hashPopularityRecordsSemantic(payload);
  const rebuiltHash = hashPopularityRecordsSemantic(rebuilt);
  if (existingHash !== rebuiltHash) {
    return ['Deterministic rebuild produced different popularity record content.'];
  }
  return [];
}

function main() {
  const payload = loadPopularityRecordsPayload();
  if (!payload) throw new Error('Missing data/popularity-records.json');

  const registry = loadJson(POPULARITY_PATHS.registry, null);
  if (!registry) throw new Error('Missing data/popularity-registry.json');

  const schemaResult = validateSchema(payload);
  const errors = [
    ...(schemaResult.valid ? [] : schemaResult.errors),
    ...validateRegistryReferences(payload, registry),
    ...validateSourceOrdering(payload),
    ...validateRecordOrdering(payload),
    ...validateLegacyMigration(payload),
    ...validateDeterministicRebuild(payload),
  ];

  console.log('Popularity records validation:', errors.length === 0 ? 'PASS' : 'FAIL');
  console.log('  Popularity Records:', payload.records.length);
  console.log('  Schema valid:', schemaResult.valid);
  console.log('  Source IDs assigned:', payload.stats?.totalSourceIdsAssigned ?? 'n/a');
  console.log(
    '  Unresolved authorities:',
    (payload.stats?.unresolvedAuthorities || []).join(', ') || 'none',
  );

  if (errors.length) {
    errors.slice(0, 20).forEach((msg) => console.error('  -', msg));
    process.exitCode = 1;
    throw new Error('Popularity records validation failed.');
  }
}

main();
