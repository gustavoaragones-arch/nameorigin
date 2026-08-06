#!/usr/bin/env node
/**
 * Phase 18B — Generate deterministic API indexes and static JSON payloads.
 *
 * Usage: node scripts/build/generate-api-indexes.js
 *
 * Prerequisite: node scripts/build/generate-structured-exports.js
 */

const fs = require('fs');
const path = require('path');
const {
  EXPORT_DIR,
  EXPORT_FILES,
  hashFile,
  groupIdToPathSegment,
  loadExportContract,
  buildApiIndexes,
  buildApiReport,
  hashApiSemantic,
  validateApiReport,
  buildSearchResponse,
  API_VERSION,
} = require('../../lib/api/export-api.js');

const ROOT = path.join(__dirname, '..', '..');
const API_DIR = path.join(ROOT, 'api');
const API_V1_DIR = path.join(API_DIR, 'v1');
const AUDIT_PATH = path.join(ROOT, 'audit', 'api.json');
const EXPORT_AUDIT_PATH = path.join(ROOT, 'audit', 'structured-exports.json');

function writeJson(absPath, payload) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function validateForbiddenImports() {
  const apiPath = path.join(ROOT, 'lib/api/export-api.js');
  const source = fs.readFileSync(apiPath, 'utf8');
  const requires = source.match(/require\(['"][^'"]+['"]\)/g) || [];
  for (const statement of requires) {
    for (const token of [
      'relationship-engine',
      'navigation-engine',
      'entity-builder',
      'export-engine',
      'knowledge-record',
    ]) {
      if (statement.includes(token)) {
        throw new Error(`Forbidden require in export API: ${statement}`);
      }
    }
  }
  if (/path\.join\([^)]*['"]data['"]/.test(source)) {
    throw new Error('Export API must not reference internal data/ paths.');
  }
}

function main() {
  const startedAt = Date.now();
  validateForbiddenImports();

  if (!fs.existsSync(EXPORT_AUDIT_PATH)) {
    console.error('Missing audit/structured-exports.json — run generate-structured-exports.js first.');
    process.exitCode = 1;
    return;
  }

  const exportHashesBefore = Object.fromEntries(
    Object.entries(EXPORT_FILES).map(([key, fileName]) => [
      key,
      hashFile(path.join(EXPORT_DIR, fileName)),
    ]),
  );

  const contract = loadExportContract();
  const indexes = buildApiIndexes(contract);
  const report = buildApiReport(contract, indexes);
  const validation = validateApiReport(report, contract, indexes);
  const semanticHash = hashApiSemantic(report, contract, indexes);

  writeJson(path.join(API_V1_DIR, 'manifest.json'), report.manifestResponse);

  for (const response of report.nameResponses) {
    writeJson(path.join(API_V1_DIR, 'name', `${response.slug}.json`), response);
  }

  for (const response of report.relationshipResponses) {
    writeJson(path.join(API_V1_DIR, 'relationships', `${response.slug}.json`), response);
  }

  for (const response of report.explorerResponses.origin) {
    const segment = groupIdToPathSegment(response.groupId);
    writeJson(path.join(API_V1_DIR, 'origin', `${segment}.json`), response);
  }

  for (const response of report.explorerResponses.language) {
    const segment = groupIdToPathSegment(response.groupId);
    writeJson(path.join(API_V1_DIR, 'language', `${segment}.json`), response);
  }

  for (const response of report.explorerResponses.meaning) {
    const segment = groupIdToPathSegment(response.groupId);
    writeJson(path.join(API_V1_DIR, 'meaning', `${segment}.json`), response);
  }

  for (const response of report.explorerResponses.cultural) {
    const segment = groupIdToPathSegment(response.groupId);
    writeJson(path.join(API_V1_DIR, 'cultural', `${segment}.json`), response);
  }

  writeJson(path.join(API_V1_DIR, 'search-index.json'), {
    apiVersion: API_VERSION,
    datasetVersion: contract.manifest.exportVersion,
    semanticHash: contract.manifest.semanticHash,
    endpoint: '/api/v1/search',
    maxResults: report.searchIndex.maxResults,
    slugs: report.searchIndex.slugs,
  });

  for (const prefix of 'abcdefghijklmnopqrstuvwxyz'.split('')) {
    writeJson(
      path.join(API_V1_DIR, 'search', `${prefix}.json`),
      buildSearchResponse(contract, indexes, prefix),
    );
  }

  writeJson(path.join(API_DIR, 'indexes', 'endpoints.json'), {
    apiVersion: API_VERSION,
    datasetVersion: contract.manifest.exportVersion,
    semanticHash: contract.manifest.semanticHash,
    endpoints: report.endpoints,
    indexes: report.indexes,
    pathSegmentMaps: indexes.pathSegmentToGroupId,
  });

  writeJson(path.join(API_DIR, 'indexes', 'slugs.json'), {
    apiVersion: API_VERSION,
    datasetVersion: contract.manifest.exportVersion,
    semanticHash: contract.manifest.semanticHash,
    slugs: indexes.slugs,
  });

  const exportHashesAfter = Object.fromEntries(
    Object.entries(EXPORT_FILES).map(([key, fileName]) => [
      key,
      hashFile(path.join(EXPORT_DIR, fileName)),
    ]),
  );

  const exportUnchanged = Object.keys(exportHashesBefore).every(
    (key) => exportHashesBefore[key] === exportHashesAfter[key],
  );

  const exportAudit = JSON.parse(fs.readFileSync(EXPORT_AUDIT_PATH, 'utf8'));
  const generationTimeMs = Date.now() - startedAt;

  const audit = {
    generatedAt: report.generatedAt,
    phase: '18B',
    title: 'AI / Research API v1',
    baselineReference: 'export-contract-v1',
    readOnly: true,
    apiVersion: API_VERSION,
    datasetVersion: contract.manifest.exportVersion,
    exportSemanticHash: contract.manifest.semanticHash,
    entityCount: report.entityCount,
    generationTimeMs,
    metrics: {
      endpoints: report.endpoints,
      lookupIndexes: report.indexes,
      responseCount:
        report.endpoints.manifest +
        report.endpoints.name +
        report.endpoints.relationships +
        report.endpoints.origin +
        report.endpoints.language +
        report.endpoints.meaning +
        report.endpoints.cultural +
        report.endpoints.searchIndex +
        26,
      formats: ['json'],
    },
    validation: {
      ...validation,
      deterministicOrdering: validation.status === 'PASS',
      semanticHash,
      exportUnchanged,
      exportSemanticHashMatch:
        contract.manifest.semanticHash === exportAudit.validation.semanticHash,
      frozenLayers: {
        exportContractUnchanged: exportUnchanged,
      },
    },
    outputs: {
      apiRoot: 'api/v1/',
      manifest: 'api/v1/manifest.json',
      name: 'api/v1/name/{slug}.json',
      relationships: 'api/v1/relationships/{slug}.json',
      origin: 'api/v1/origin/{group}.json',
      language: 'api/v1/language/{group}.json',
      meaning: 'api/v1/meaning/{group}.json',
      cultural: 'api/v1/cultural/{group}.json',
      searchIndex: 'api/v1/search-index.json',
      searchPrefix: 'api/v1/search/{prefix}.json',
    },
  };

  writeJson(AUDIT_PATH, audit);

  console.log('API index generation complete.');
  console.log('  Entity endpoints:', report.endpoints.name);
  console.log('  Relationship endpoints:', report.endpoints.relationships);
  console.log('  Explorer endpoints:',
    report.endpoints.origin +
      report.endpoints.language +
      report.endpoints.meaning +
      report.endpoints.cultural);
  console.log('  Total responses:', audit.metrics.responseCount);
  console.log('  Generation time (ms):', generationTimeMs);
  console.log('  Validation:', validation.status);
  console.log('  Semantic hash:', semanticHash.slice(0, 16) + '...');
  console.log('  Audit:', AUDIT_PATH);

  if (validation.status !== 'PASS') {
    for (const error of validation.errors) console.error('  -', error);
    process.exitCode = 1;
  }
}

main();
