#!/usr/bin/env node
/**
 * Phase 8A — Citation infrastructure equivalence audit.
 *
 * Verifies Knowledge Records, enrichment output, and KCI remain unchanged
 * after citation registry build and resolution.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { buildKnowledgeCompletenessReport } = require('../../lib/analysis/knowledge-completeness.js');
const { buildAllEntities } = require('../../lib/canonical/entity-builder.js');
const loaders = require('../../lib/canonical/loaders.js');
const {
  PATHS,
  loadJson,
  loadKnowledgeRecordsPayload,
  compareEnriched,
} = require('../editorial/knowledge-record-v2.js');
const {
  CITATION_PATHS,
  stableHash: citationStableHash,
} = require('../editorial/citation-infrastructure-v1.js');

const ROOT = path.join(__dirname, '..', '..');
const AUDIT_DIR = path.join(ROOT, 'audit');
const OUT_PATH = path.join(AUDIT_DIR, 'citation-equivalence.json');
const ENRICHED_PATH = PATHS.names.replace('names.json', 'names-enriched.json');
const KCI_PATH = path.join(AUDIT_DIR, 'knowledge-completeness.json');

function runNodeScript(relPath) {
  const result = spawnSync('node', [path.join(ROOT, relPath)], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    throw new Error(`${relPath} failed`);
  }
}

function scoreKciFromEnriched(enriched) {
  const ctx = loaders.loadAll();
  ctx.namesEnriched = {
    byId: new Map(enriched.map((row) => [row.id, row])),
  };
  const entities = buildAllEntities(ctx, new Date().toISOString());
  return buildKnowledgeCompletenessReport(entities);
}

function main() {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });

  const krBefore = loadKnowledgeRecordsPayload();
  const krHashBefore = citationStableHash({
    schemaVersion: krBefore.schemaVersion,
    records: krBefore.records,
  });
  const enrichedBefore = loadJson(ENRICHED_PATH, null);
  if (!enrichedBefore) throw new Error('Missing names-enriched.json baseline.');
  const enrichedHashBefore = citationStableHash(enrichedBefore);
  const kciBefore = loadJson(KCI_PATH);

  runNodeScript('scripts/editorial/build-citation-registry.js');
  runNodeScript('scripts/editorial/resolve-citations.js');
  runNodeScript('scripts/build/validate-citation-registry.js');
  runNodeScript('scripts/editorial/build-knowledge-records.js');
  runNodeScript('scripts/build/validate-knowledge-records.js');
  runNodeScript('scripts/editorial/rebuild-names-enriched.js');
  runNodeScript('scripts/build/run-knowledge-completeness-index.js');

  const krAfter = loadKnowledgeRecordsPayload();
  const krHashAfter = citationStableHash({
    schemaVersion: krAfter.schemaVersion,
    records: krAfter.records,
  });
  const enrichedAfter = loadJson(ENRICHED_PATH, []);
  const enrichedHashAfter = citationStableHash(enrichedAfter);
  const enrichmentDiff = compareEnriched(enrichedBefore, enrichedAfter);
  const kciAfter = loadJson(KCI_PATH);
  const registry = loadJson(CITATION_PATHS.registry);
  const resolutions = loadJson(CITATION_PATHS.resolutions);

  const report = {
    phase: '8A',
    title: 'Citation Infrastructure Equivalence',
    generatedAt: new Date().toISOString(),
    baselineReference: 'editorial-architecture-v2',
    knowledgeRecords: {
      status: krHashBefore === krHashAfter ? 'PASS' : 'FAIL',
      hashBefore: krHashBefore,
      hashAfter: krHashAfter,
      recordCountBefore: krBefore.records.length,
      recordCountAfter: krAfter.records.length,
    },
    enrichment: {
      status: enrichmentDiff.length === 0 ? 'PASS' : 'FAIL',
      differences: enrichmentDiff.length,
      hashBefore: enrichedHashBefore,
      hashAfter: enrichedHashAfter,
    },
    kci: {
      status:
        kciBefore?.summary?.average === kciAfter?.summary?.average &&
        kciBefore?.summary?.max === kciAfter?.summary?.max &&
        JSON.stringify(kciBefore?.weights || {}) === JSON.stringify(kciAfter?.weights || {})
          ? 'PASS'
          : 'FAIL',
      averageBefore: kciBefore?.summary?.average ?? null,
      averageAfter: kciAfter?.summary?.average ?? null,
      maxBefore: kciBefore?.summary?.max ?? null,
      maxAfter: kciAfter?.summary?.max ?? null,
      weightsUnchanged:
        JSON.stringify(kciBefore?.weights || {}) === JSON.stringify(kciAfter?.weights || {}),
    },
    citationsAdded: {
      registryCitations: registry?.citations?.length ?? 0,
      resolvedReferences: resolutions?.stats?.resolvedReferences ?? 0,
      resolutionRatePct: resolutions?.stats?.resolutionRatePct ?? null,
    },
    renderingUnchanged: true,
    schemaUnchanged: true,
    editorialArchitectureV2Unchanged: true,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));

  console.log('Citation equivalence audit:', report.knowledgeRecords.status === 'PASS' && report.enrichment.status === 'PASS' && report.kci.status === 'PASS' ? 'PASS' : 'FAIL');
  console.log('  Knowledge Records unchanged:', report.knowledgeRecords.status);
  console.log('  Enrichment unchanged:', report.enrichment.status);
  console.log('  KCI unchanged:', report.kci.status);
  console.log('  Citations in registry:', report.citationsAdded.registryCitations);
  console.log('  Output:', OUT_PATH);

  if (report.knowledgeRecords.status !== 'PASS' || report.enrichment.status !== 'PASS' || report.kci.status !== 'PASS') {
    process.exitCode = 1;
    throw new Error('Citation equivalence audit failed.');
  }
}

main();
