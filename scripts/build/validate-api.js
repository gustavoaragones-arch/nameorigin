#!/usr/bin/env node
/**
 * Phase 18B — Validate AI / Research API layer.
 *
 * Usage: node scripts/build/validate-api.js
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
  buildNameResponse,
  buildSearchResponse,
  buildManifestResponse,
} = require('../../lib/api/export-api.js');

const ROOT = path.join(__dirname, '..', '..');
const API_DIR = path.join(ROOT, 'api');
const API_V1_DIR = path.join(API_DIR, 'v1');
const AUDIT_PATH = path.join(ROOT, 'audit', 'api.json');
const EXPORT_AUDIT_PATH = path.join(ROOT, 'audit', 'structured-exports.json');

const FORBIDDEN_REQUIRE_PATTERNS = [
  'data/',
  'relationship-engine',
  'navigation-engine',
  'entity-builder',
  'export-engine',
  'knowledge-record',
];

function readSourceFiles() {
  return [
    path.join(ROOT, 'lib/api/export-api.js'),
    path.join(ROOT, 'scripts/build/generate-api-indexes.js'),
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
    console.error('Missing audit/api.json — run generate-api-indexes.js first.');
    process.exitCode = 1;
    return;
  }

  const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
  const exportAudit = JSON.parse(fs.readFileSync(EXPORT_AUDIT_PATH, 'utf8'));
  const errors = [];

  validateForbiddenImports(errors);

  const contract = loadExportContract();
  const indexes = buildApiIndexes(contract);
  const rebuilt = buildApiReport(contract, indexes);
  const rebuiltHash = hashApiSemantic(rebuilt, contract, indexes);
  const validation = validateApiReport(rebuilt, contract, indexes);
  errors.push(...validation.errors);

  if (rebuiltHash !== audit.validation.semanticHash) {
    errors.push('Deterministic rebuild produced a different semantic hash.');
  }
  if (contract.manifest.semanticHash !== exportAudit.validation.semanticHash) {
    errors.push('Export semantic hash mismatch against structured-exports audit.');
  }
  if (audit.validation.exportUnchanged === false) {
    errors.push('Prior API generation reported export contract mutation.');
  }

  const manifestPath = path.join(API_V1_DIR, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    errors.push('Missing api/v1/manifest.json');
  } else {
    const manifestOnDisk = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const expected = buildManifestResponse(contract);
    if (manifestOnDisk.semanticHash !== expected.semanticHash) {
      errors.push('On-disk manifest semantic hash mismatch.');
    }
  }

  let nameFiles = 0;
  for (const slug of indexes.slugs) {
    const absPath = path.join(API_V1_DIR, 'name', `${slug}.json`);
    if (!fs.existsSync(absPath)) {
      errors.push(`Missing name endpoint file: ${slug}`);
      continue;
    }
    nameFiles += 1;
    const payload = JSON.parse(fs.readFileSync(absPath, 'utf8'));
    const expected = buildNameResponse(contract, indexes, slug);
    if (payload.semanticHash !== expected.semanticHash) {
      errors.push(`Name endpoint hash mismatch: ${slug}`);
    }
    if (payload.slug !== slug) {
      errors.push(`Name endpoint slug mismatch: ${slug}`);
    }
  }

  for (const group of contract.navigation.origin.groups) {
    const segment = groupIdToPathSegment(group.id);
    const absPath = path.join(API_V1_DIR, 'origin', `${segment}.json`);
    if (!fs.existsSync(absPath)) errors.push(`Missing origin endpoint: ${segment}`);
  }

  const searchIndexPath = path.join(API_V1_DIR, 'search-index.json');
  if (!fs.existsSync(searchIndexPath)) {
    errors.push('Missing api/v1/search-index.json');
  } else {
    const searchIndex = JSON.parse(fs.readFileSync(searchIndexPath, 'utf8'));
    if (searchIndex.slugs.length !== indexes.slugs.length) {
      errors.push('Search index slug count mismatch.');
    }
  }

  const searchA = buildSearchResponse(contract, indexes, 'a');
  const searchFile = path.join(API_V1_DIR, 'search', 'a.json');
  if (fs.existsSync(searchFile)) {
    const onDisk = JSON.parse(fs.readFileSync(searchFile, 'utf8'));
    if (JSON.stringify(onDisk.matches) !== JSON.stringify(searchA.matches)) {
      errors.push('Search prefix file a.json mismatch.');
    }
  }

  const status = errors.length === 0 ? 'PASS' : 'FAIL';
  console.log('API validation:', status);
  console.log('  Name endpoint files:', nameFiles);
  console.log('  Entity count:', rebuilt.entityCount);
  console.log('  Semantic hash match:', rebuiltHash === audit.validation.semanticHash);
  console.log('  Export hash match:', contract.manifest.semanticHash === exportAudit.validation.semanticHash);
  if (errors.length) {
    for (const error of errors.slice(0, 20)) console.error('  -', error);
    process.exitCode = 1;
  }
}

main();
