#!/usr/bin/env node
/**
 * Phase 18A — Validate structured export bundles.
 *
 * Usage: node scripts/build/validate-structured-exports.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  SOURCE_PATHS,
  hashFile,
  loadExportSources,
  buildExportBundle,
  buildManifest,
  hashExportSemantic,
  validateStructuredExports,
} = require('../../lib/export/export-engine.js');

const ROOT = path.join(__dirname, '..', '..');
const EXPORT_DIR = path.join(ROOT, 'exports');
const AUDIT_PATH = path.join(ROOT, 'audit', 'structured-exports.json');

const FORBIDDEN_REQUIRE_PATTERNS = [
  'relationship-engine',
  'navigation-engine',
  'entity-builder',
  'generate-knowledge-graph',
  'generate-navigation',
  'relationship-presentation',
];

function readSourceFiles() {
  return [
    path.join(ROOT, 'lib/export/export-engine.js'),
    path.join(ROOT, 'scripts/build/generate-structured-exports.js'),
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

function countJsonlLines(content) {
  return content.split('\n').filter(Boolean).length;
}

function countCsvRows(content) {
  const lines = content.trim().split('\n');
  return Math.max(0, lines.length - 1);
}

function main() {
  if (!fs.existsSync(AUDIT_PATH)) {
    console.error('Missing audit/structured-exports.json — run generate-structured-exports.js first.');
    process.exitCode = 1;
    return;
  }

  const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
  const manifestPath = path.join(EXPORT_DIR, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('Missing exports/manifest.json — run generate-structured-exports.js first.');
    process.exitCode = 1;
    return;
  }

  const errors = [];
  validateForbiddenImports(errors);

  const sources = loadExportSources();
  const rebuiltBundle = buildExportBundle(sources, audit.generatedAt);
  const manifestOnDisk = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const artifactHashes = (manifestOnDisk.artifacts || []).map((artifact) => {
    const absPath = path.join(EXPORT_DIR, artifact.path);
    if (!fs.existsSync(absPath)) {
      errors.push(`Missing export artifact: ${artifact.path}`);
      return artifact;
    }
    const sha256 = hashFile(absPath);
    if (sha256 !== artifact.sha256) {
      errors.push(`Artifact hash mismatch: ${artifact.path}`);
    }
    return { ...artifact, sha256OnDisk: sha256 };
  });

  const rebuiltManifest = buildManifest(rebuiltBundle, sources, artifactHashes);
  rebuiltManifest.semanticHash = hashExportSemantic(rebuiltManifest);
  const rebuiltValidation = validateStructuredExports(rebuiltBundle, rebuiltManifest, sources);
  errors.push(...rebuiltValidation.errors);

  if (rebuiltManifest.semanticHash !== audit.validation.semanticHash) {
    errors.push('Deterministic rebuild produced a different semantic hash.');
  }
  if (manifestOnDisk.semanticHash !== audit.validation.semanticHash) {
    errors.push('On-disk manifest semantic hash does not match audit.');
  }

  for (const key of Object.keys(SOURCE_PATHS)) {
    const currentHash = hashFile(SOURCE_PATHS[key]);
    const expected = sources.sourceHashes[key];
    if (expected && currentHash !== expected) {
      errors.push(`Source artifact changed since export generation: ${key}`);
    }
  }

  if (audit.validation.frozenLayers?.allSourceArtifactsUnchanged === false) {
    errors.push('Prior export generation reported source artifact mutation.');
  }

  const formatChecks = [
    { path: 'knowledge.jsonl', expected: rebuiltBundle.counts.knowledgeRecords },
    { path: 'citations.jsonl', expected: rebuiltBundle.counts.citationRecords },
    { path: 'popularity.jsonl', expected: rebuiltBundle.counts.popularityRecords },
    { path: 'graph.jsonl', expected: rebuiltBundle.counts.graphJsonlLines },
  ];

  for (const check of formatChecks) {
    const absPath = path.join(EXPORT_DIR, check.path);
    if (!fs.existsSync(absPath)) continue;
    const lines = countJsonlLines(fs.readFileSync(absPath, 'utf8'));
    if (lines !== check.expected) {
      errors.push(`${check.path} line count ${lines} != ${check.expected}`);
    }
  }

  const csvChecks = [
    { path: 'knowledge.csv', expected: rebuiltBundle.counts.knowledgeCsvRows },
    { path: 'citations.csv', expected: rebuiltBundle.counts.citationsCsvRows },
    { path: 'popularity.csv', expected: rebuiltBundle.counts.popularityCsvRows },
  ];

  for (const check of csvChecks) {
    const absPath = path.join(EXPORT_DIR, check.path);
    if (!fs.existsSync(absPath)) continue;
    const rows = countCsvRows(fs.readFileSync(absPath, 'utf8'));
    if (rows !== check.expected) {
      errors.push(`${check.path} row count ${rows} != ${check.expected}`);
    }
  }

  const knowledgeJson = JSON.parse(fs.readFileSync(path.join(EXPORT_DIR, 'knowledge.json'), 'utf8'));
  if (knowledgeJson.exportVersion !== '18A-v1') {
    errors.push('Knowledge export missing exportVersion 18A-v1.');
  }
  if (knowledgeJson.recordCount !== knowledgeJson.records.length) {
    errors.push('Knowledge JSON recordCount mismatch.');
  }

  const status = errors.length === 0 ? 'PASS' : 'FAIL';
  console.log('Structured export validation:', status);
  console.log('  Files validated:', (manifestOnDisk.artifacts || []).length + 1);
  console.log('  Knowledge records:', rebuiltBundle.counts.knowledgeRecords);
  console.log('  Semantic hash match:', rebuiltManifest.semanticHash === audit.validation.semanticHash);
  console.log(
    '  Source layers unchanged:',
    audit.validation.frozenLayers?.allSourceArtifactsUnchanged !== false,
  );
  if (errors.length) {
    for (const error of errors.slice(0, 20)) console.error('  -', error);
    process.exitCode = 1;
  }
}

main();
