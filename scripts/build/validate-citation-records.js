#!/usr/bin/env node
/**
 * Phase 8B — Validate Citation Records v1.
 */

const fs = require('fs');
const path = require('path');
const { validateNode } = require('../../lib/canonical/schema-check.js');
const { loadKnowledgeRecordsPayload } = require('../editorial/knowledge-record-v2.js');
const {
  DOMAINS,
  CITATION_PATHS,
  loadJson,
  normalizeKey,
  isDomainPopulated,
  buildCitationRecordsPayload,
  hashCitationRecordsSemantic,
  CITATION_RECORD_PATHS,
} = require('../editorial/citation-records-v1.js');

const ROOT = path.join(__dirname, '..', '..');
const SCHEMA_PATH = path.join(ROOT, 'schemas', 'citation-records-v1.schema.json');

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
  const registryIds = new Set((registry.citations || []).map((row) => row.id));
  for (const record of payload.records || []) {
    for (const domain of DOMAINS) {
      const ids = record.citations?.[domain];
      if (!ids) continue;
      for (const citationId of ids) {
        if (!registryIds.has(citationId)) {
          errors.push(`${record.name}.${domain} references unknown citation ID: ${citationId}`);
        }
      }
    }
  }
  return errors;
}

function validateDomainOrdering(payload) {
  const errors = [];
  for (const record of payload.records || []) {
    for (const domain of DOMAINS) {
      const ids = record.citations?.[domain];
      if (!ids) continue;
      const sorted = [...ids].sort((a, b) => a.localeCompare(b));
      if (ids.join('|') !== sorted.join('|')) {
        errors.push(`${record.name}.${domain} citation IDs are not sorted.`);
      }
      const dupes = ids.filter((id, idx) => ids.indexOf(id) !== idx);
      if (dupes.length) {
        errors.push(`${record.name}.${domain} contains duplicate citation IDs.`);
      }
    }
  }
  return errors;
}

function validateRecordOrdering(payload) {
  const names = (payload.records || []).map((row) => row.name);
  const sorted = [...names].sort((a, b) => a.localeCompare(b));
  if (names.join('|') !== sorted.join('|')) {
    return ['Citation records are not sorted alphabetically by name.'];
  }
  const seen = new Set();
  for (const name of names) {
    const key = normalizeKey(name);
    if (seen.has(key)) return [`Duplicate citation record for ${name}.`];
    seen.add(key);
  }
  return [];
}

function validateEditorialDomainCoverage(payload) {
  const errors = [];
  const kr = loadKnowledgeRecordsPayload();
  const citationByName = new Map(payload.records.map((row) => [normalizeKey(row.name), row]));

  if (payload.records.length !== kr.records.length) {
    errors.push(
      `Citation record count ${payload.records.length} does not match Knowledge Record count ${kr.records.length}.`,
    );
  }

  for (const record of kr.records || []) {
    const key = normalizeKey(record.name);
    const citationRecord = citationByName.get(key);
    if (!citationRecord) {
      errors.push(`Missing citation record for Knowledge Record: ${record.name}`);
      continue;
    }

    for (const domain of DOMAINS) {
      const populated = isDomainPopulated(record, domain);
      const hasCitations = Array.isArray(citationRecord.citations?.[domain]) && citationRecord.citations[domain].length > 0;
      if (populated && !hasCitations) {
        errors.push(`Missing citation domain coverage for populated editorial domain ${record.name}.${domain}`);
      }
      if (!populated && hasCitations) {
        errors.push(`Citation domain present but editorial domain empty: ${record.name}.${domain}`);
      }
    }
  }

  return errors;
}

function validateDeterministicRebuild(payload) {
  const rebuilt = buildCitationRecordsPayload({ generatedAt: payload.generatedAt });
  const existingHash = hashCitationRecordsSemantic(payload);
  const rebuiltHash = hashCitationRecordsSemantic(rebuilt);
  if (existingHash !== rebuiltHash) {
    return ['Deterministic rebuild produced different citation record content.'];
  }
  return [];
}

function main() {
  const payload = loadJson(CITATION_RECORD_PATHS.records, null);
  if (!payload) throw new Error('Missing data/citation-records.json');

  const registry = loadJson(CITATION_PATHS.registry, null);
  if (!registry) throw new Error('Missing data/citation-registry.json');

  const schemaResult = validateSchema(payload);
  const errors = [
    ...(schemaResult.valid ? [] : schemaResult.errors),
    ...validateRegistryReferences(payload, registry),
    ...validateDomainOrdering(payload),
    ...validateRecordOrdering(payload),
    ...validateEditorialDomainCoverage(payload),
    ...validateDeterministicRebuild(payload),
  ];

  console.log('Citation records validation:', errors.length === 0 ? 'PASS' : 'FAIL');
  console.log('  Citation Records:', payload.records.length);
  console.log('  Schema valid:', schemaResult.valid);
  console.log('  Citation IDs assigned:', payload.stats?.totalCitationIdsAssigned ?? 'n/a');

  if (errors.length) {
    errors.slice(0, 20).forEach((msg) => console.error('  -', msg));
    process.exitCode = 1;
    throw new Error('Citation records validation failed.');
  }
}

main();
