#!/usr/bin/env node
/**
 * Phase 6A — Equivalence audit between legacy override pipeline and Knowledge Record v2 pipeline.
 *
 * Builds knowledge-records.json, regenerates names-enriched.json via both pipelines,
 * and fails immediately on any entity field difference.
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
  loadLegacyOverrideBundle,
  buildEnrichedNames,
  compareEnriched,
  summarizeEnriched,
  knowledgeRecordsToOverrideBundle,
  buildKnowledgeRecordsFromLegacy,
  loadResearchIndexes,
  loadKnowledgeRecordsPayload,
} = require('../editorial/knowledge-record-v2.js');

const ROOT = path.join(__dirname, '..', '..');
const AUDIT_DIR = path.join(ROOT, 'audit');
const OUT_PATH = path.join(AUDIT_DIR, 'knowledge-record-migration.json');
const ENRICHED_PATH = PATHS.names.replace('names.json', 'names-enriched.json');

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

  const baselineEnriched = loadJson(ENRICHED_PATH, null);
  if (!baselineEnriched) {
    throw new Error('Missing data/names-enriched.json baseline.');
  }

  runNodeScript('scripts/editorial/build-knowledge-records.js');
  runNodeScript('scripts/build/validate-knowledge-records.js');

  const names = loadJson(PATHS.names, []);
  const legacy = loadLegacyOverrideBundle();
  const legacyEnriched = buildEnrichedNames(names, legacy);

  const knowledgePayload = buildKnowledgeRecordsFromLegacy(legacy, loadResearchIndexes());
  const knowledgeBundle = knowledgeRecordsToOverrideBundle(knowledgePayload);
  const knowledgeEnriched = buildEnrichedNames(names, knowledgeBundle);

  const differences = compareEnriched(legacyEnriched, knowledgeEnriched);
  const legacySummary = summarizeEnriched(legacyEnriched);
  const knowledgeSummary = summarizeEnriched(knowledgeEnriched);

  const baselineDiff = compareEnriched(baselineEnriched, knowledgeEnriched);

  const legacyKci = scoreKciFromEnriched(legacyEnriched);
  const knowledgeKci = scoreKciFromEnriched(knowledgeEnriched);

  const payload = loadKnowledgeRecordsPayload();
  if (!payload) {
    throw new Error('Missing data/knowledge-records.json after build.');
  }

  const unionLegacyKeys = new Set([
    ...Object.keys(legacy.origin),
    ...Object.keys(legacy.meaning),
    ...Object.keys(legacy.pronunciation),
    ...Object.keys(legacy.etymology),
    ...Object.keys(legacy.history),
  ]);

  const report = {
    phase: '6A',
    title: 'Knowledge Record v2 Migration',
    generatedAt: new Date().toISOString(),
    baselineReference: 'knowledge-baseline-v2',
    legacyCompatibilityActive: true,
    totals: {
      records: payload.records.length,
      entities: names.length,
    },
    migrated: {
      originRecords: payload.records.filter((row) => row.origin).length,
      meaningRecords: payload.records.filter((row) => row.meaning).length,
      pronunciationRecords: payload.records.filter((row) => row.pronunciation).length,
      etymologyRecords: payload.records.filter((row) => row.etymology).length,
      historyRecords: payload.records.filter((row) => row.history).length,
    },
    migrationSuccessRatePct: Number(((100 * payload.records.length) / Math.max(1, unionLegacyKeys.size)).toFixed(2)),
    validation: {
      status: 'PASS',
    },
    equivalence: {
      status: differences.length === 0 ? 'PASS' : 'FAIL',
      differences: differences.length,
      sample: differences.slice(0, 10),
    },
    baselineEquivalence: {
      status: baselineDiff.length === 0 ? 'PASS' : 'FAIL',
      differences: baselineDiff.length,
    },
    enrichmentSummary: {
      legacy: legacySummary,
      knowledgeRecord: knowledgeSummary,
    },
    kciImpact: {
      legacyAverage: legacyKci.summary.average,
      knowledgeAverage: knowledgeKci.summary.average,
      legacyMax: legacyKci.summary.max,
      knowledgeMax: knowledgeKci.summary.max,
      identical: legacyKci.summary.average === knowledgeKci.summary.average && legacyKci.summary.max === knowledgeKci.summary.max,
    },
    performance: {
      buildKnowledgeRecordsMs: null,
      validateKnowledgeRecordsMs: null,
      equivalenceCompareEntities: names.length,
    },
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));

  runNodeScript('scripts/editorial/rebuild-names-enriched.js');

  console.log('Knowledge Record v2 equivalence audit:', report.equivalence.status);
  console.log('  Records migrated:', report.totals.records);
  console.log('  Legacy vs Knowledge differences:', report.equivalence.differences);
  console.log('  Baseline enriched differences:', report.baselineEquivalence.differences);
  console.log('  KCI identical:', report.kciImpact.identical);
  console.log('  Output:', OUT_PATH);

  if (report.equivalence.status !== 'PASS' || report.baselineEquivalence.status !== 'PASS') {
    process.exitCode = 1;
    throw new Error('Knowledge Record equivalence audit failed.');
  }
}

main();
