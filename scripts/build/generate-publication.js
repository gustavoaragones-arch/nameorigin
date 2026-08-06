#!/usr/bin/env node
/**
 * Phase 19A — Generate versioned dataset publication bundles.
 *
 * Usage: node scripts/build/generate-publication.js
 *
 * Prerequisites:
 *   node scripts/build/generate-structured-exports.js
 *   node scripts/build/generate-api-indexes.js
 */

const fs = require('fs');
const path = require('path');
const {
  PUBLICATION_VERSION,
  EXPORT_DIR,
  API_DIR,
  hashFile,
  loadPublicationInputs,
  buildPublicationBundle,
  hashPublicationSemantic,
  validatePublicationBundle,
} = require('../../lib/publication/publication-engine.js');

const ROOT = path.join(__dirname, '..', '..');
const AUDIT_PATH = path.join(ROOT, 'audit', 'publication.json');

function writeJson(absPath, payload) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function validateForbiddenImports() {
  const enginePath = path.join(ROOT, 'lib/publication/publication-engine.js');
  const source = fs.readFileSync(enginePath, 'utf8');
  const requires = source.match(/require\(['"][^'"]+['"]\)/g) || [];
  for (const statement of requires) {
    for (const token of [
      'export-engine',
      'export-api',
      'relationship-engine',
      'navigation-engine',
      'entity-builder',
      'knowledge-record',
    ]) {
      if (statement.includes(token)) {
        throw new Error(`Forbidden require in publication engine: ${statement}`);
      }
    }
  }
}

function main() {
  const startedAt = Date.now();
  validateForbiddenImports();

  const exportHashBefore = hashFile(path.join(EXPORT_DIR, 'manifest.json'));
  const apiManifestBefore = hashFile(path.join(API_DIR, 'v1', 'manifest.json'));

  const inputs = loadPublicationInputs();
  const report = buildPublicationBundle(inputs);
  const validation = validatePublicationBundle(report, inputs);
  const semanticHash = hashPublicationSemantic(report);

  const exportHashAfter = hashFile(path.join(EXPORT_DIR, 'manifest.json'));
  const apiManifestAfter = hashFile(path.join(API_DIR, 'v1', 'manifest.json'));

  const audit = {
    generatedAt: report.generatedAt,
    phase: '19A',
    title: 'Versioned Dataset Publication v1',
    baselineReference: 'export-contract-v1',
    readOnly: true,
    publicationVersion: PUBLICATION_VERSION,
    datasetVersion: report.datasetVersion,
    generationTimeMs: Date.now() - startedAt,
    metrics: {
      releaseVersion: report.datasetVersion,
      filesPackaged: report.manifest.filesPackaged,
      totalBytes: report.manifest.totalBytes,
      checksumCount: report.manifest.checksumCount,
      categories: report.manifest.categories,
      recordCounts: report.manifest.recordCounts,
    },
    validation: {
      ...validation,
      deterministicOrdering: validation.status === 'PASS',
      semanticHash,
      exportUnchanged: exportHashBefore === exportHashAfter,
      apiUnchanged: apiManifestBefore === apiManifestAfter,
      frozenLayers: {
        exportContractUnchanged: exportHashBefore === exportHashAfter,
        apiOutputsUnchanged: apiManifestBefore === apiManifestAfter,
      },
    },
    outputs: {
      releaseDirectory: path.relative(ROOT, report.releaseDir),
      manifest: path.join(path.relative(ROOT, report.releaseDir), 'manifest.json'),
      checksums: path.join(path.relative(ROOT, report.releaseDir), 'checksums.sha256'),
    },
  };

  writeJson(AUDIT_PATH, audit);

  console.log('Publication generation complete.');
  console.log('  Release version:', report.datasetVersion);
  console.log('  Files packaged:', report.manifest.filesPackaged);
  console.log('  Total bytes:', report.manifest.totalBytes);
  console.log('  Checksum count:', report.manifest.checksumCount);
  console.log('  Generation time (ms):', audit.generationTimeMs);
  console.log('  Validation:', validation.status);
  console.log('  Semantic hash:', semanticHash.slice(0, 16) + '...');
  console.log('  Audit:', AUDIT_PATH);

  if (validation.status !== 'PASS') {
    for (const error of validation.errors) console.error('  -', error);
    process.exitCode = 1;
  }
}

main();
