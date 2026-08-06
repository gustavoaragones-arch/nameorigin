#!/usr/bin/env node
/**
 * Phase 19A — Validate versioned dataset publication bundles.
 *
 * Usage: node scripts/build/validate-publication.js
 */

const fs = require('fs');
const path = require('path');
const {
  RELEASES_DIR,
  EXPORT_DIR,
  API_DIR,
  hashFile,
  hashFileBinary,
  loadPublicationInputs,
  buildPublicationBundle,
  hashPublicationSemantic,
  validatePublicationBundle,
} = require('../../lib/publication/publication-engine.js');

const ROOT = path.join(__dirname, '..', '..');
const AUDIT_PATH = path.join(ROOT, 'audit', 'publication.json');

const FORBIDDEN_REQUIRE_PATTERNS = [
  'export-engine',
  'export-api',
  'relationship-engine',
  'navigation-engine',
  'entity-builder',
  'knowledge-record',
];

function readSourceFiles() {
  return [
    path.join(ROOT, 'lib/publication/publication-engine.js'),
    path.join(ROOT, 'scripts/build/generate-publication.js'),
  ];
}

function validateForbiddenImports(errors) {
  for (const absPath of readSourceFiles()) {
    const source = fs.readFileSync(absPath, 'utf8');
    const requires = source.match(/require\(['"][^'"]+['"]\)/g) || [];
    for (const statement of requires) {
      for (const token of FORBIDDEN_REQUIRE_PATTERNS) {
        if (statement.includes(token)) {
          errors.push(`Forbidden require in ${path.relative(ROOT, absPath)}: ${statement}`);
        }
      }
    }
  }
}

function main() {
  if (!fs.existsSync(AUDIT_PATH)) {
    console.error('Missing audit/publication.json — run generate-publication.js first.');
    process.exitCode = 1;
    return;
  }

  const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
  const errors = [];
  validateForbiddenImports(errors);

  const inputs = loadPublicationInputs();
  const releaseDir = path.join(RELEASES_DIR, inputs.datasetVersion);
  if (!fs.existsSync(releaseDir)) {
    console.error(`Missing release directory: ${path.relative(ROOT, releaseDir)}`);
    process.exitCode = 1;
    return;
  }

  const manifestPath = path.join(releaseDir, 'manifest.json');
  const manifestBeforeRebuild = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const rebuilt = buildPublicationBundle(inputs, audit.generatedAt);
  const rebuiltValidation = validatePublicationBundle(rebuilt, inputs);
  errors.push(...rebuiltValidation.errors);

  const rebuiltHash = hashPublicationSemantic(rebuilt);
  if (rebuiltHash !== audit.validation.semanticHash) {
    errors.push('Deterministic rebuild produced a different semantic hash.');
  }

  const manifestAfterRebuild = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifestAfterRebuild.publicationSemanticHash !== rebuilt.manifest.publicationSemanticHash) {
    errors.push('Release manifest publication semantic hash mismatch after rebuild.');
  }
  if (manifestBeforeRebuild.publicationSemanticHash !== manifestAfterRebuild.publicationSemanticHash) {
    errors.push('Release manifest changed across deterministic rebuild.');
  }
  if (manifestAfterRebuild.hashes.exportSemanticHash !== inputs.structuredExportsAudit.validation.semanticHash) {
    errors.push('Release manifest export hash mismatch.');
  }
  if (manifestAfterRebuild.hashes.apiSemanticHash !== inputs.apiAudit.validation.semanticHash) {
    errors.push('Release manifest API hash mismatch.');
  }
  if (manifestAfterRebuild.hashes.graphSemanticHash !== inputs.knowledgeGraphAudit.validation.semanticHash) {
    errors.push('Release manifest graph hash mismatch.');
  }
  if (manifestAfterRebuild.hashes.navigationSemanticHash !== inputs.navigationAudit.validation.semanticHash) {
    errors.push('Release manifest navigation hash mismatch.');
  }

  const exportHash = hashFile(path.join(EXPORT_DIR, 'manifest.json'));
  if (exportHash !== inputs.sourceHashes.exportManifest) {
    errors.push('Export contract changed since publication audit.');
  }
  if (audit.validation.exportUnchanged === false) {
    errors.push('Prior publication generation reported export contract mutation.');
  }

  const apiManifestHash = hashFile(path.join(API_DIR, 'v1', 'manifest.json'));
  if (audit.validation.apiUnchanged === false) {
    errors.push('Prior publication generation reported API output mutation.');
  }

  const checksums = fs.readFileSync(path.join(releaseDir, 'checksums.sha256'), 'utf8');
  const checksumLines = checksums.trim().split('\n').filter(Boolean);
  if (checksumLines.length !== manifestAfterRebuild.checksumCount) {
    errors.push('Checksum count mismatch in release manifest.');
  }

  for (const line of checksumLines) {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    if (!match) {
      errors.push(`Invalid checksum line format: ${line}`);
      continue;
    }
    const [, expectedHash, relPath] = match;
    const absPath = path.join(releaseDir, relPath);
    if (!fs.existsSync(absPath)) {
      errors.push(`Checksum references missing file: ${relPath}`);
      continue;
    }
    if (hashFileBinary(absPath) !== expectedHash) {
      errors.push(`Checksum verification failed: ${relPath}`);
    }
  }

  const status = errors.length === 0 ? 'PASS' : 'FAIL';
  console.log('Publication validation:', status);
  console.log('  Release version:', inputs.datasetVersion);
  console.log('  Files packaged:', manifestAfterRebuild.filesPackaged);
  console.log('  Semantic hash match:', rebuiltHash === audit.validation.semanticHash);
  console.log('  Export unchanged:', audit.validation.exportUnchanged !== false);
  console.log('  API unchanged:', audit.validation.apiUnchanged !== false);
  if (errors.length) {
    for (const error of errors.slice(0, 20)) console.error('  -', error);
    process.exitCode = 1;
  }
}

main();
