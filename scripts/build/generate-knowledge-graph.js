#!/usr/bin/env node
/**
 * Phase 17A — Generate deterministic Knowledge Graph artifacts.
 *
 * Usage: node scripts/build/generate-knowledge-graph.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const loaders = require('../../lib/canonical/loaders.js');
const { buildAllEntities } = require('../../lib/canonical/entity-builder.js');
const {
  buildKnowledgeGraphReport,
  hashGraphSemantic,
  filterEdgesByType,
  validateKnowledgeGraph,
} = require('../../lib/analysis/relationship-engine.js');

const ROOT = path.join(__dirname, '..', '..');
const GRAPH_DIR = path.join(ROOT, 'data', 'graph');
const AUDIT_PATH = path.join(ROOT, 'audit', 'knowledge-graph.json');
const KNOWLEDGE_RECORDS_PATH = path.join(ROOT, 'data', 'knowledge-records.json');

function hashFile(absPath) {
  if (!fs.existsSync(absPath)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(absPath, 'utf8')).digest('hex');
}

function writeJson(absPath, payload) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function main() {
  const generatedAt = new Date().toISOString();
  const editorialHashBefore = hashFile(KNOWLEDGE_RECORDS_PATH);

  const ctx = loaders.loadAll();
  const entities = buildAllEntities(ctx, generatedAt);
  const report = buildKnowledgeGraphReport(entities, generatedAt);
  const validation = validateKnowledgeGraph(report);
  const semanticHash = hashGraphSemantic(report);

  const graphPayload = {
    schemaVersion: '17A-v1',
    generatedAt,
    graphVersion: report.graphVersion,
    entityCount: report.entityCount,
    nodeCount: report.metrics.nodeCount,
    edgeCount: report.metrics.edgeCount,
  };

  writeJson(path.join(GRAPH_DIR, 'nodes.json'), {
    ...graphPayload,
    nodes: report.nodes,
  });

  writeJson(path.join(GRAPH_DIR, 'edges.json'), {
    ...graphPayload,
    edges: report.edges,
  });

  writeJson(path.join(GRAPH_DIR, 'origin-network.json'), {
    ...graphPayload,
    relationshipType: 'SAME_ORIGIN',
    edges: filterEdgesByType(report.edges, 'SAME_ORIGIN'),
  });

  writeJson(path.join(GRAPH_DIR, 'meaning-network.json'), {
    ...graphPayload,
    relationshipType: 'RELATED_MEANING',
    edges: filterEdgesByType(report.edges, 'RELATED_MEANING'),
  });

  writeJson(path.join(GRAPH_DIR, 'variant-network.json'), {
    ...graphPayload,
    relationshipType: 'HAS_VARIANT',
    edges: filterEdgesByType(report.edges, 'HAS_VARIANT'),
  });

  writeJson(path.join(GRAPH_DIR, 'pronunciation-network.json'), {
    ...graphPayload,
    relationshipType: 'SIMILAR_PRONUNCIATION',
    edges: filterEdgesByType(report.edges, 'SIMILAR_PRONUNCIATION'),
  });

  const editorialHashAfter = hashFile(KNOWLEDGE_RECORDS_PATH);
  const audit = {
    generatedAt,
    phase: '17A',
    title: 'Knowledge Graph & Relationship Engine v1',
    baselineReference: 'editorial-architecture-v2',
    readOnly: true,
    graphVersion: report.graphVersion,
    entityCount: report.entityCount,
    metrics: report.metrics,
    relationshipCounts: report.metrics.relationshipCounts,
    validation: {
      ...validation,
      deterministicOrdering: validation.status === 'PASS',
      semanticHash,
      editorialDataUnchanged: editorialHashBefore === editorialHashAfter,
      frozenLayers: {
        knowledgeRecordsUnchanged: editorialHashBefore === editorialHashAfter,
      },
    },
    outputs: {
      nodes: 'data/graph/nodes.json',
      edges: 'data/graph/edges.json',
      originNetwork: 'data/graph/origin-network.json',
      meaningNetwork: 'data/graph/meaning-network.json',
      variantNetwork: 'data/graph/variant-network.json',
      pronunciationNetwork: 'data/graph/pronunciation-network.json',
    },
  };

  fs.mkdirSync(path.dirname(AUDIT_PATH), { recursive: true });
  writeJson(AUDIT_PATH, audit);

  console.log('Knowledge graph generation complete.');
  console.log('  Nodes:', report.metrics.nodeCount);
  console.log('  Edges:', report.metrics.edgeCount);
  console.log('  Average degree:', report.metrics.averageDegree);
  console.log('  Disconnected components:', report.metrics.disconnectedComponents);
  console.log('  Validation:', validation.status);
  console.log('  Semantic hash:', semanticHash.slice(0, 16) + '...');
  console.log('  Audit:', AUDIT_PATH);

  if (validation.status !== 'PASS') {
    process.exitCode = 1;
  }
}

main();
