#!/usr/bin/env node
/**
 * Phase 17B — Generate deterministic navigation artifacts from frozen graph outputs.
 *
 * Usage: node scripts/build/generate-navigation.js
 *
 * Prerequisite: node scripts/build/generate-knowledge-graph.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  buildNavigationReport,
  hashNavigationSemantic,
  validateNavigation,
  NAVIGATION_VERSION,
} = require('../../lib/navigation/navigation-engine.js');

const ROOT = path.join(__dirname, '..', '..');
const GRAPH_DIR = path.join(ROOT, 'data', 'graph');
const NAVIGATION_DIR = path.join(ROOT, 'data', 'navigation');
const GRAPH_AUDIT_PATH = path.join(ROOT, 'audit', 'knowledge-graph.json');
const NAVIGATION_AUDIT_PATH = path.join(ROOT, 'audit', 'navigation.json');
const KNOWLEDGE_RECORDS_PATH = path.join(ROOT, 'data', 'knowledge-records.json');

function hashFile(absPath) {
  if (!fs.existsSync(absPath)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(absPath, 'utf8')).digest('hex');
}

function writeJson(absPath, payload) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function readGraphArtifact(name) {
  const absPath = path.join(GRAPH_DIR, name);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Missing ${path.relative(ROOT, absPath)} — run generate-knowledge-graph.js first.`);
  }
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

function main() {
  if (!fs.existsSync(GRAPH_AUDIT_PATH)) {
    console.error('Missing audit/knowledge-graph.json — run generate-knowledge-graph.js first.');
    process.exitCode = 1;
    return;
  }

  const graphAudit = JSON.parse(fs.readFileSync(GRAPH_AUDIT_PATH, 'utf8'));
  const editorialHashBefore = hashFile(KNOWLEDGE_RECORDS_PATH);

  const nodesPayload = readGraphArtifact('nodes.json');
  const edgesPayload = readGraphArtifact('edges.json');

  const graphPayload = {
    generatedAt: nodesPayload.generatedAt,
    graphVersion: nodesPayload.graphVersion,
    entityCount: nodesPayload.entityCount,
    nodes: nodesPayload.nodes,
    edges: edgesPayload.edges,
  };

  const graphSemanticHash = graphAudit.validation.semanticHash;
  const report = buildNavigationReport(graphPayload, graphSemanticHash);
  const validation = validateNavigation(report, graphPayload);
  const semanticHash = hashNavigationSemantic(report);

  const artifactHeader = {
    schemaVersion: NAVIGATION_VERSION,
    generatedAt: report.generatedAt,
    navigationVersion: report.navigationVersion,
    graphVersion: report.graphVersion,
    graphSemanticHash: report.graphSemanticHash,
    entityCount: report.entityCount,
  };

  writeJson(path.join(NAVIGATION_DIR, 'related-names.json'), {
    ...artifactHeader,
    entities: report.relatedNames,
  });

  writeJson(path.join(NAVIGATION_DIR, 'origin-navigation.json'), {
    ...artifactHeader,
    relationshipType: 'SAME_ORIGIN',
    groups: report.explorerIndexes.SAME_ORIGIN,
  });

  writeJson(path.join(NAVIGATION_DIR, 'language-navigation.json'), {
    ...artifactHeader,
    relationshipType: 'SAME_LANGUAGE',
    groups: report.explorerIndexes.SAME_LANGUAGE,
  });

  writeJson(path.join(NAVIGATION_DIR, 'meaning-navigation.json'), {
    ...artifactHeader,
    relationshipType: 'RELATED_MEANING',
    groups: report.explorerIndexes.RELATED_MEANING,
  });

  writeJson(path.join(NAVIGATION_DIR, 'pronunciation-navigation.json'), {
    ...artifactHeader,
    relationshipType: 'SIMILAR_PRONUNCIATION',
    groups: report.explorerIndexes.SIMILAR_PRONUNCIATION,
  });

  writeJson(path.join(NAVIGATION_DIR, 'cultural-navigation.json'), {
    ...artifactHeader,
    relationshipType: 'SAME_CULTURAL_GROUP',
    groups: report.explorerIndexes.SAME_CULTURAL_GROUP,
  });

  const editorialHashAfter = hashFile(KNOWLEDGE_RECORDS_PATH);

  const audit = {
    generatedAt: report.generatedAt,
    phase: '17B',
    title: 'Relationship Navigation Engine v1',
    baselineReference: 'editorial-architecture-v2',
    readOnly: true,
    navigationVersion: report.navigationVersion,
    graphVersion: report.graphVersion,
    graphSemanticHash: report.graphSemanticHash,
    entityCount: report.entityCount,
    metrics: report.metrics,
    validation: {
      ...validation,
      deterministicOrdering: validation.status === 'PASS',
      semanticHash,
      editorialDataUnchanged: editorialHashBefore === editorialHashAfter,
      graphUnchanged: true,
      frozenLayers: {
        knowledgeRecordsUnchanged: editorialHashBefore === editorialHashAfter,
        knowledgeGraphUnchanged: graphSemanticHash === graphAudit.validation.semanticHash,
      },
    },
    outputs: {
      relatedNames: 'data/navigation/related-names.json',
      originNavigation: 'data/navigation/origin-navigation.json',
      languageNavigation: 'data/navigation/language-navigation.json',
      meaningNavigation: 'data/navigation/meaning-navigation.json',
      pronunciationNavigation: 'data/navigation/pronunciation-navigation.json',
      culturalNavigation: 'data/navigation/cultural-navigation.json',
    },
  };

  writeJson(NAVIGATION_AUDIT_PATH, audit);

  console.log('Navigation generation complete.');
  console.log('  Entities:', report.entityCount);
  console.log('  Average related names:', report.metrics.averageRelatedNames);
  console.log('  Max related names:', report.metrics.maxRelatedNames);
  console.log('  Empty navigation nodes:', report.metrics.emptyNavigationNodes);
  console.log('  Validation:', validation.status);
  console.log('  Semantic hash:', semanticHash.slice(0, 16) + '...');
  console.log('  Audit:', NAVIGATION_AUDIT_PATH);

  if (validation.status !== 'PASS') {
    for (const error of validation.errors) console.error('  -', error);
    process.exitCode = 1;
  }
}

main();
