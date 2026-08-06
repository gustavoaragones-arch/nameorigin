#!/usr/bin/env node
/**
 * Phase 18A — Generate deterministic structured export bundles.
 *
 * Usage: node scripts/build/generate-structured-exports.js
 *
 * Prerequisites:
 *   node scripts/build/generate-knowledge-graph.js
 *   node scripts/build/generate-navigation.js
 */

const fs = require('fs');
const path = require('path');
const {
  EXPORT_VERSION,
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

const ARTIFACT_SPECS = [
  { key: 'knowledgeJson', path: 'knowledge.json', format: 'json', countKey: 'knowledgeRecords' },
  { key: 'knowledgeJsonl', path: 'knowledge.jsonl', format: 'jsonl', countKey: 'knowledgeRecords' },
  { key: 'knowledgeCsv', path: 'knowledge.csv', format: 'csv', countKey: 'knowledgeCsvRows' },
  { key: 'citationsJson', path: 'citations.json', format: 'json', countKey: 'citationRecords' },
  { key: 'citationsJsonl', path: 'citations.jsonl', format: 'jsonl', countKey: 'citationRecords' },
  { key: 'citationsCsv', path: 'citations.csv', format: 'csv', countKey: 'citationsCsvRows' },
  { key: 'popularityJson', path: 'popularity.json', format: 'json', countKey: 'popularityRecords' },
  { key: 'popularityJsonl', path: 'popularity.jsonl', format: 'jsonl', countKey: 'popularityRecords' },
  { key: 'popularityCsv', path: 'popularity.csv', format: 'csv', countKey: 'popularityCsvRows' },
  { key: 'graphNodesExport', path: 'graph-nodes.json', format: 'json', countKey: 'graphNodes' },
  { key: 'graphEdgesExport', path: 'graph-edges.json', format: 'json', countKey: 'graphEdges' },
  { key: 'graphJsonl', path: 'graph.jsonl', format: 'jsonl', countKey: 'graphJsonlLines' },
];

const NAVIGATION_SPECS = [
  { key: 'related', path: 'navigation-related.json', countKey: 'navigationEntities' },
  { key: 'origin', path: 'navigation-origin.json', countKey: 'navigationOriginGroups' },
  { key: 'language', path: 'navigation-language.json', countKey: 'navigationLanguageGroups' },
  { key: 'meaning', path: 'navigation-meaning.json', countKey: 'navigationMeaningGroups' },
  { key: 'pronunciation', path: 'navigation-pronunciation.json', countKey: 'navigationPronunciationGroups' },
  { key: 'cultural', path: 'navigation-cultural.json', countKey: 'navigationCulturalGroups' },
];

function writeText(absPath, content) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content);
}

function writeJson(absPath, payload) {
  writeText(absPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function validateForbiddenImports() {
  const exportEnginePath = path.join(ROOT, 'lib/export/export-engine.js');
  const source = fs.readFileSync(exportEnginePath, 'utf8');
  const requires = source.match(/require\(['"][^'"]+['"]\)/g) || [];
  for (const statement of requires) {
    for (const token of [
      'relationship-engine',
      'navigation-engine',
      'entity-builder',
      'generate-knowledge-graph',
      'generate-navigation',
    ]) {
      if (statement.includes(token)) {
        throw new Error(`Forbidden require in export engine: ${statement}`);
      }
    }
  }
}

function main() {
  const startedAt = Date.now();
  validateForbiddenImports();

  const sourceHashesBefore = Object.fromEntries(
    Object.entries(SOURCE_PATHS).map(([key, absPath]) => [key, hashFile(absPath)]),
  );

  const sources = loadExportSources();
  const bundle = buildExportBundle(sources);
  const artifactHashes = [];

  fs.mkdirSync(EXPORT_DIR, { recursive: true });

  for (const spec of ARTIFACT_SPECS) {
    const content = bundle.files[spec.key];
    const absPath = path.join(EXPORT_DIR, spec.path);
    if (spec.format === 'json') writeJson(absPath, content);
    else writeText(absPath, content);
    artifactHashes.push({
      path: spec.path,
      format: spec.format,
      recordCount: bundle.counts[spec.countKey],
      sha256: hashFile(absPath),
    });
  }

  for (const spec of NAVIGATION_SPECS) {
    const content = bundle.files.navigationExports[spec.key];
    const absPath = path.join(EXPORT_DIR, spec.path);
    writeJson(absPath, content);
    artifactHashes.push({
      path: spec.path,
      format: 'json',
      recordCount: bundle.counts[spec.countKey],
      sha256: hashFile(absPath),
    });
  }

  artifactHashes.sort((left, right) => left.path.localeCompare(right.path));

  const manifest = buildManifest(bundle, sources, artifactHashes);
  manifest.semanticHash = hashExportSemantic(manifest);
  writeJson(path.join(EXPORT_DIR, 'manifest.json'), manifest);

  const sourceHashesAfter = Object.fromEntries(
    Object.entries(SOURCE_PATHS).map(([key, absPath]) => [key, hashFile(absPath)]),
  );

  const frozenLayerChecks = {};
  for (const key of Object.keys(sourceHashesBefore)) {
    frozenLayerChecks[key] = sourceHashesBefore[key] === sourceHashesAfter[key];
  }

  const validation = validateStructuredExports(bundle, manifest, sources);
  const generationTimeMs = Date.now() - startedAt;

  const audit = {
    generatedAt: bundle.generatedAt,
    phase: '18A',
    title: 'Structured Export Engine v1',
    baselineReference: 'editorial-architecture-v2',
    readOnly: true,
    exportVersion: EXPORT_VERSION,
    generationTimeMs,
    metrics: {
      filesGenerated: artifactHashes.length + 1,
      totalExportedRecords:
        bundle.counts.knowledgeRecords +
        bundle.counts.citationRecords +
        bundle.counts.popularityRecords +
        bundle.counts.graphNodes +
        bundle.counts.graphEdges +
        bundle.counts.navigationEntities,
      formats: ['json', 'jsonl', 'csv'],
      recordCounts: bundle.counts,
      artifacts: artifactHashes.length + 1,
    },
    validation: {
      ...validation,
      deterministicOrdering: validation.status === 'PASS',
      semanticHash: manifest.semanticHash,
      frozenLayers: {
        knowledgeRecordsUnchanged: frozenLayerChecks.knowledgeRecords,
        citationRecordsUnchanged: frozenLayerChecks.citationRecords,
        popularityRecordsUnchanged: frozenLayerChecks.popularityRecords,
        knowledgeGraphUnchanged:
          frozenLayerChecks.graphNodes &&
          frozenLayerChecks.graphEdges &&
          frozenLayerChecks.knowledgeGraphAudit,
        navigationUnchanged:
          frozenLayerChecks.navigationRelated &&
          frozenLayerChecks.navigationOrigin &&
          frozenLayerChecks.navigationLanguage &&
          frozenLayerChecks.navigationMeaning &&
          frozenLayerChecks.navigationPronunciation &&
          frozenLayerChecks.navigationCultural &&
          frozenLayerChecks.navigationAudit,
        kciUnchanged: frozenLayerChecks.kciAudit !== false,
        allSourceArtifactsUnchanged: Object.values(frozenLayerChecks).every(Boolean),
      },
    },
    outputs: {
      exportDirectory: 'exports/',
      manifest: 'exports/manifest.json',
    },
  };

  writeJson(AUDIT_PATH, audit);

  console.log('Structured export generation complete.');
  console.log('  Files generated:', audit.metrics.filesGenerated);
  console.log('  Knowledge records:', bundle.counts.knowledgeRecords);
  console.log('  Citation records:', bundle.counts.citationRecords);
  console.log('  Popularity records:', bundle.counts.popularityRecords);
  console.log('  Graph edges:', bundle.counts.graphEdges);
  console.log('  Generation time (ms):', generationTimeMs);
  console.log('  Validation:', validation.status);
  console.log('  Semantic hash:', manifest.semanticHash.slice(0, 16) + '...');
  console.log('  Audit:', AUDIT_PATH);

  if (validation.status !== 'PASS') {
    for (const error of validation.errors) console.error('  -', error);
    process.exitCode = 1;
  }
}

main();
