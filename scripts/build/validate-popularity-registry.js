#!/usr/bin/env node
/**
 * Phase 9A — Validate Popularity Registry v1.
 */

const fs = require('fs');
const path = require('path');
const { validateNode } = require('../../lib/canonical/schema-check.js');
const {
  POPULARITY_PATHS,
  SUPPORTED_AUTHORITY_CLASSES,
  buildPopularityRegistry,
  hashRegistrySemantic,
  loadJson,
} = require('../editorial/popularity-infrastructure-v1.js');

const ROOT = path.join(__dirname, '..', '..');
const SCHEMA_PATH = path.join(ROOT, 'schemas', 'popularity-registry-v1.schema.json');

function validateSchema(registry) {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  const envelopeErrors = validateNode(registry, schema, '$');
  const sourceSchema = schema.$defs?.source;
  const itemErrors = [];
  if (sourceSchema && Array.isArray(registry.sources)) {
    registry.sources.forEach((source, index) => {
      itemErrors.push(...validateNode(source, sourceSchema, `$.sources[${index}]`));
    });
  }
  const errors = [...envelopeErrors, ...itemErrors];
  return { valid: errors.length === 0, errors };
}

function validateRegistryOrdering(registry) {
  const ids = registry.sources.map((row) => row.id);
  const sorted = [...ids].sort((a, b) => a.localeCompare(b));
  if (ids.join('|') !== sorted.join('|')) {
    return ['Sources are not sorted deterministically by id.'];
  }
  return [];
}

function validateUniqueIds(registry) {
  const ids = registry.sources.map((row) => row.id);
  const dupes = ids.filter((id, idx) => ids.indexOf(id) !== idx);
  if (dupes.length) {
    return [`Duplicate source IDs: ${[...new Set(dupes)].join(', ')}`];
  }
  return [];
}

function validateDuplicateAuthorities(registry) {
  const canonical = registry.sources.map((row) => row.canonicalAuthority);
  const dupes = canonical.filter((value, idx) => canonical.indexOf(value) !== idx);
  if (dupes.length) {
    return [`Duplicate canonicalAuthority entries: ${[...new Set(dupes)].join(', ')}`];
  }
  return [];
}

function validateRequiredMetadata(registry) {
  const errors = [];
  for (const source of registry.sources) {
    if (!source.id || !source.title || !source.type) {
      errors.push(`Source missing required metadata: ${source.id || '(unknown)'}`);
    }
    if (!SUPPORTED_AUTHORITY_CLASSES.includes(source.type)) {
      errors.push(`Unsupported authority class on ${source.id}: ${source.type}`);
    }
  }
  return errors;
}

function validateResolutionIndex(registry) {
  const errors = [];
  const ids = new Set(registry.sources.map((row) => row.id));
  for (const [key, value] of Object.entries(registry.authorityResolutionIndex || {})) {
    if (!ids.has(value)) {
      errors.push(`Resolution index key "${key}" references unknown source ID: ${value}`);
    }
  }
  return errors;
}

function validateDeterministicRebuild(registry) {
  const rebuilt = buildPopularityRegistry({ generatedAt: registry.generatedAt });
  if (hashRegistrySemantic(registry) !== hashRegistrySemantic(rebuilt)) {
    return ['Deterministic rebuild produced different registry content.'];
  }
  return [];
}

function main() {
  const registry = loadJson(POPULARITY_PATHS.registry, null);
  if (!registry) throw new Error('Missing data/popularity-registry.json');

  const schemaResult = validateSchema(registry);
  const errors = [
    ...(schemaResult.valid ? [] : schemaResult.errors),
    ...validateRegistryOrdering(registry),
    ...validateUniqueIds(registry),
    ...validateDuplicateAuthorities(registry),
    ...validateRequiredMetadata(registry),
    ...validateResolutionIndex(registry),
    ...validateDeterministicRebuild(registry),
  ];

  console.log('Popularity registry validation:', errors.length === 0 ? 'PASS' : 'FAIL');
  console.log('  Registry sources:', registry.sources.length);
  console.log('  Schema valid:', schemaResult.valid);
  console.log('  Authority classes supported:', SUPPORTED_AUTHORITY_CLASSES.length);

  if (errors.length) {
    errors.slice(0, 20).forEach((msg) => console.error('  -', msg));
    process.exitCode = 1;
    throw new Error('Popularity registry validation failed.');
  }
}

main();
