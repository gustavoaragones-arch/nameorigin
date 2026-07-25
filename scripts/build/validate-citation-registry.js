#!/usr/bin/env node
/**
 * Phase 8A — Validate citation registry and resolution artifacts.
 */

const fs = require('fs');
const path = require('path');
const { validateNode } = require('../../lib/canonical/schema-check.js');
const {
  CITATION_PATHS,
  discoverAllSources,
  buildCitationRegistry,
  loadJson,
} = require('../editorial/citation-infrastructure-v1.js');

const ROOT = path.join(__dirname, '..', '..');
const SCHEMA_PATH = path.join(ROOT, 'schemas', 'citation-registry-v1.schema.json');

function validateSchema(registry) {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  const envelopeErrors = validateNode(registry, schema, '$');
  const citationSchema = schema.$defs?.citation;
  const itemErrors = [];
  if (citationSchema && Array.isArray(registry.citations)) {
    registry.citations.forEach((citation, index) => {
      itemErrors.push(...validateNode(citation, citationSchema, `$.citations[${index}]`));
    });
  }
  const errors = [...envelopeErrors, ...itemErrors];
  return { valid: errors.length === 0, errors };
}

function validateRegistryOrdering(registry) {
  const errors = [];
  const ids = registry.citations.map((row) => row.id);
  const sorted = [...ids].sort((a, b) => a.localeCompare(b));
  if (ids.join('|') !== sorted.join('|')) {
    errors.push('Citations are not sorted deterministically by id.');
  }
  return errors;
}

function validateDuplicatePublications(registry) {
  const errors = [];
  const canonicalRefs = registry.citations.map((row) => row.canonicalReference);
  const dupes = canonicalRefs.filter((ref, idx) => canonicalRefs.indexOf(ref) !== idx);
  if (dupes.length) {
    errors.push(`Duplicate canonicalReference entries: ${[...new Set(dupes)].join(', ')}`);
  }
  return errors;
}

function validateRequiredMetadata(registry) {
  const errors = [];
  for (const citation of registry.citations) {
    if (!citation.id || !citation.title || !citation.type) {
      errors.push(`Citation missing required metadata: ${citation.id || '(unknown)'}`);
    }
  }
  return errors;
}

function validateResolutionCoverage(registry, resolutions) {
  const errors = [];
  if (!resolutions) {
    errors.push('Missing citation-resolutions.json.');
    return errors;
  }
  if (resolutions.stats.unresolvedReferences > 0) {
    errors.push(`Unresolved references: ${resolutions.stats.unresolvedReferences}`);
  }
  const registryIds = new Set(registry.citations.map((row) => row.id));
  for (const citationId of Object.values(resolutions.sourceResolutionIndex || {})) {
    if (!registryIds.has(citationId)) {
      errors.push(`Resolution index references unknown citation ID: ${citationId}`);
    }
  }
  return errors;
}

function validateDeterministicRebuild() {
  const discovered = discoverAllSources();
  const rebuilt = buildCitationRegistry(discovered);
  const existing = loadJson(CITATION_PATHS.registry);
  const existingIds = existing.citations.map((row) => row.id).join('|');
  const rebuiltIds = rebuilt.citations.map((row) => row.id).join('|');
  if (existingIds !== rebuiltIds) {
    return ['Registry rebuild produced different citation IDs.'];
  }
  return [];
}

function main() {
  const registry = loadJson(CITATION_PATHS.registry, null);
  if (!registry) {
    throw new Error('Missing data/citation-registry.json');
  }

  const resolutions = loadJson(CITATION_PATHS.resolutions, null);
  const schemaResult = validateSchema(registry);
  const errors = [
    ...(schemaResult.valid ? [] : schemaResult.errors),
    ...validateRegistryOrdering(registry),
    ...validateDuplicatePublications(registry),
    ...validateRequiredMetadata(registry),
    ...validateResolutionCoverage(registry, resolutions),
    ...validateDeterministicRebuild(),
  ];

  console.log('Citation registry validation:', errors.length === 0 ? 'PASS' : 'FAIL');
  console.log('  Citations:', registry.citations.length);
  console.log('  Schema valid:', schemaResult.valid);
  console.log('  Resolution coverage:', resolutions?.stats?.resolutionRatePct ?? 'n/a', '%');

  if (errors.length) {
    errors.slice(0, 20).forEach((msg) => console.error('  -', msg));
    process.exitCode = 1;
    throw new Error('Citation registry validation failed.');
  }
}

main();
