#!/usr/bin/env node
/**
 * Phase 17B — Validate navigation artifacts against frozen graph outputs.
 *
 * Usage: node scripts/build/validate-navigation.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  buildNavigationReport,
  hashNavigationSemantic,
  validateNavigation,
} = require('../../lib/navigation/navigation-engine.js');

const ROOT = path.join(__dirname, '..', '..');
const GRAPH_DIR = path.join(ROOT, 'data', 'graph');
const GRAPH_AUDIT_PATH = path.join(ROOT, 'audit', 'knowledge-graph.json');
const NAVIGATION_AUDIT_PATH = path.join(ROOT, 'audit', 'navigation.json');
const KNOWLEDGE_RECORDS_PATH = path.join(ROOT, 'data', 'knowledge-records.json');

function hashFile(absPath) {
  if (!fs.existsSync(absPath)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(absPath, 'utf8')).digest('hex');
}

function readGraphArtifact(name) {
  const absPath = path.join(GRAPH_DIR, name);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Missing ${path.relative(ROOT, absPath)} — run generate-knowledge-graph.js first.`);
  }
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

function main() {
  if (!fs.existsSync(NAVIGATION_AUDIT_PATH)) {
    console.error('Missing audit/navigation.json — run generate-navigation.js first.');
    process.exitCode = 1;
    return;
  }

  if (!fs.existsSync(GRAPH_AUDIT_PATH)) {
    console.error('Missing audit/knowledge-graph.json — run generate-knowledge-graph.js first.');
    process.exitCode = 1;
    return;
  }

  const audit = JSON.parse(fs.readFileSync(NAVIGATION_AUDIT_PATH, 'utf8'));
  const graphAudit = JSON.parse(fs.readFileSync(GRAPH_AUDIT_PATH, 'utf8'));
  const editorialHash = hashFile(KNOWLEDGE_RECORDS_PATH);

  const nodesPayload = readGraphArtifact('nodes.json');
  const edgesPayload = readGraphArtifact('edges.json');

  const graphPayload = {
    generatedAt: nodesPayload.generatedAt,
    graphVersion: nodesPayload.graphVersion,
    entityCount: nodesPayload.entityCount,
    nodes: nodesPayload.nodes,
    edges: edgesPayload.edges,
  };

  const rebuilt = buildNavigationReport(graphPayload, graphAudit.validation.semanticHash);
  const validation = validateNavigation(rebuilt, graphPayload);
  const rebuiltHash = hashNavigationSemantic(rebuilt);

  const errors = [...validation.errors];

  if (rebuiltHash !== audit.validation.semanticHash) {
    errors.push('Deterministic rebuild produced a different semantic hash.');
  }
  if (graphAudit.validation.semanticHash !== audit.graphSemanticHash) {
    errors.push('Navigation audit graph semantic hash does not match knowledge-graph audit.');
  }
  if (rebuilt.entityCount !== 3697) {
    errors.push(`Expected 3697 entities, found ${rebuilt.entityCount}.`);
  }
  if (audit.validation.editorialDataUnchanged === false) {
    errors.push('Prior navigation generation reported editorial data mutation.');
  }
  if (editorialHash && audit.validation.frozenLayers?.knowledgeRecordsUnchanged === false) {
    errors.push('Knowledge Records hash check failed against prior audit state.');
  }
  if (audit.validation.frozenLayers?.knowledgeGraphUnchanged === false) {
    errors.push('Prior navigation generation reported graph mutation.');
  }

  const status = errors.length === 0 ? 'PASS' : 'FAIL';
  console.log('Navigation validation:', status);
  console.log('  Entities:', rebuilt.entityCount);
  console.log('  Average related names:', rebuilt.metrics.averageRelatedNames);
  console.log('  Semantic hash match:', rebuiltHash === audit.validation.semanticHash);
  console.log('  Graph semantic hash match:', graphAudit.validation.semanticHash === audit.graphSemanticHash);
  if (errors.length) {
    for (const error of errors) console.error('  -', error);
    process.exitCode = 1;
  }
}

main();
