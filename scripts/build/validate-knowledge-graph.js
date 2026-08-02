#!/usr/bin/env node
/**
 * Phase 17A — Validate Knowledge Graph artifacts.
 *
 * Usage: node scripts/build/validate-knowledge-graph.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const loaders = require('../../lib/canonical/loaders.js');
const { buildAllEntities } = require('../../lib/canonical/entity-builder.js');
const {
  buildKnowledgeGraphReport,
  hashGraphSemantic,
  validateKnowledgeGraph,
} = require('../../lib/analysis/relationship-engine.js');

const ROOT = path.join(__dirname, '..', '..');
const AUDIT_PATH = path.join(ROOT, 'audit', 'knowledge-graph.json');
const KNOWLEDGE_RECORDS_PATH = path.join(ROOT, 'data', 'knowledge-records.json');

function hashFile(absPath) {
  if (!fs.existsSync(absPath)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(absPath, 'utf8')).digest('hex');
}

function main() {
  if (!fs.existsSync(AUDIT_PATH)) {
    console.error('Missing audit/knowledge-graph.json — run generate-knowledge-graph.js first.');
    process.exitCode = 1;
    return;
  }

  const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
  const editorialHash = hashFile(KNOWLEDGE_RECORDS_PATH);
  const ctx = loaders.loadAll();
  const entities = buildAllEntities(ctx, audit.generatedAt);
  const rebuilt = buildKnowledgeGraphReport(entities, audit.generatedAt);
  const validation = validateKnowledgeGraph(rebuilt);
  const rebuiltHash = hashGraphSemantic(rebuilt);

  const errors = [...validation.errors];
  if (rebuiltHash !== audit.validation.semanticHash) {
    errors.push('Deterministic rebuild produced a different semantic hash.');
  }
  if (entities.length !== 3697) {
    errors.push(`Expected 3697 entities, found ${entities.length}.`);
  }
  if (audit.validation.editorialDataUnchanged === false) {
    errors.push('Prior graph generation reported editorial data mutation.');
  }
  if (editorialHash && audit.validation.frozenLayers?.knowledgeRecordsUnchanged === false) {
    errors.push('Knowledge Records hash check failed against prior audit state.');
  }

  const status = errors.length === 0 ? 'PASS' : 'FAIL';
  console.log('Knowledge graph validation:', status);
  console.log('  Nodes:', rebuilt.metrics.nodeCount);
  console.log('  Edges:', rebuilt.metrics.edgeCount);
  console.log('  Semantic hash match:', rebuiltHash === audit.validation.semanticHash);
  if (errors.length) {
    for (const error of errors) console.error('  -', error);
    process.exitCode = 1;
  }
}

main();
