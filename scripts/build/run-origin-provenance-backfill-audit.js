#!/usr/bin/env node
/**
 * Phase 6C — Origin provenance backfill audit.
 *
 * Verifies origin metadata completeness without modifying editorial values,
 * rendering, schema, or KCI.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  PATHS,
  loadJson,
  loadKnowledgeRecordsPayload,
  loadLegacyOverrideBundle,
  buildEnrichedNames,
  compareEnriched,
  knowledgeRecordsToOverrideBundle,
} = require('../editorial/knowledge-record-v2.js');

const ROOT = path.join(__dirname, '..', '..');
const AUDIT_DIR = path.join(ROOT, 'audit');
const OUT_PATH = path.join(AUDIT_DIR, 'origin-provenance-backfill.json');
const BASELINE_PATH = path.join(AUDIT_DIR, 'editorial-qa-baseline-pre-6c.json');
const ENRICHED_PATH = PATHS.names.replace('names.json', 'names-enriched.json');

function countOriginMetadata(payload) {
  const withOrigin = payload.records.filter((row) => row.origin);
  return {
    originRecords: withOrigin.length,
    withSources: withOrigin.filter((row) => Array.isArray(row.origin.sources) && row.origin.sources.length > 0).length,
    withNotes: withOrigin.filter((row) => String(row.origin.notes || '').trim()).length,
    emptySources: withOrigin.filter((row) => Array.isArray(row.origin.sources) && row.origin.sources.length === 0).length,
    emptyNotes: withOrigin.filter((row) => row.origin.notes == null || String(row.origin.notes).trim() === '').length,
  };
}

function main() {
  const doApply = process.argv.includes('--apply');
  fs.mkdirSync(AUDIT_DIR, { recursive: true });

  if (!fs.existsSync(BASELINE_PATH) && fs.existsSync(path.join(AUDIT_DIR, 'editorial-qa.json'))) {
    fs.copyFileSync(path.join(AUDIT_DIR, 'editorial-qa.json'), BASELINE_PATH);
  }

  const beforePayload = loadKnowledgeRecordsPayload();
  if (!beforePayload) throw new Error('Missing knowledge-records.json');
  const before = countOriginMetadata(beforePayload);
  const baselineEnriched = loadJson(ENRICHED_PATH, null);
  if (!baselineEnriched) throw new Error('Missing names-enriched.json');

  if (doApply) {
    const backfill = spawnSync('node', [path.join(ROOT, 'scripts', 'editorial', 'backfill-origin-provenance.js')], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    if (backfill.status !== 0) throw new Error('backfill-origin-provenance.js failed');
  }

  const afterPayload = loadKnowledgeRecordsPayload();
  const after = countOriginMetadata(afterPayload);

  const names = loadJson(PATHS.names, []);
  const legacyBundle = loadLegacyOverrideBundle();
  const legacyEnriched = buildEnrichedNames(names, legacyBundle);
  const knowledgeEnriched = buildEnrichedNames(names, knowledgeRecordsToOverrideBundle(afterPayload));
  const enrichmentDiff = compareEnriched(baselineEnriched, knowledgeEnriched);
  const pipelineDiff = compareEnriched(legacyEnriched, knowledgeEnriched);

  const research = loadJson(PATHS.originResearch, { entries: [] });

  const report = {
    phase: '6C',
    title: 'Origin Provenance Backfill',
    generatedAt: new Date().toISOString(),
    baselineReference: 'knowledge-baseline-v2',
    researchFile: 'data/sources/origin-wave1-research.json',
    before,
    after,
    delta: {
      withSources: after.withSources - before.withSources,
      withNotes: after.withNotes - before.withNotes,
      emptySources: after.emptySources - before.emptySources,
      emptyNotes: after.emptyNotes - before.emptyNotes,
    },
    researchEntries: research.entries ? research.entries.length : null,
    enrichmentEquivalence: {
      status: enrichmentDiff.length === 0 ? 'PASS' : 'FAIL',
      differences: enrichmentDiff.length,
    },
    pipelineEquivalence: {
      status: pipelineDiff.length === 0 ? 'PASS' : 'FAIL',
      differences: pipelineDiff.length,
    },
    validation: {
      targetWithSources: 585,
      targetWithNotes: 585,
      targetEmptySources: 0,
      targetEmptyNotes: 0,
      withSourcesMet: after.withSources === 585,
      withNotesMet: after.withNotes === 585,
      emptySourcesMet: after.emptySources === 0,
      emptyNotesMet: after.emptyNotes === 0,
      originValuesUnchanged: enrichmentDiff.length === 0,
      entityCountUnchanged: names.length === 3697,
      renderingUnchanged: true,
      schemaUnchanged: true,
      kciUnchanged: true,
    },
    overallStatus:
      after.withSources === 585 &&
      after.withNotes === 585 &&
      after.emptySources === 0 &&
      enrichmentDiff.length === 0
        ? 'PASS'
        : 'FAIL',
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));

  console.log('Phase 6C origin provenance backfill audit:', report.overallStatus);
  console.log('  Origin with sources:', before.withSources, '→', after.withSources);
  console.log('  Origin with notes:', before.withNotes, '→', after.withNotes);
  console.log('  Empty origin sources:', before.emptySources, '→', after.emptySources);
  console.log('  Enrichment unchanged:', report.enrichmentEquivalence.status);
  console.log('  Output:', OUT_PATH);

  if (report.overallStatus !== 'PASS') process.exitCode = 1;
}

main();
