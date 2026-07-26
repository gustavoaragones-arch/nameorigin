#!/usr/bin/env node
/**
 * Phase 12A — Trust signals equivalence audit.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const {
  PATHS,
  loadJson,
  loadKnowledgeRecordsPayload,
  compareEnriched,
} = require('../editorial/knowledge-record-v2.js');
const {
  CITATION_PATHS,
  stableHash,
} = require('../editorial/citation-infrastructure-v1.js');
const {
  hashCitationRecordsSemantic,
  loadCitationRecordsPayload,
} = require('../editorial/citation-records-v1.js');
const {
  POPULARITY_PATHS,
  hashRegistrySemantic,
} = require('../editorial/popularity-infrastructure-v1.js');
const {
  hashPopularityRecordsSemantic,
  loadPopularityRecordsPayload,
} = require('../editorial/popularity-records-v1.js');
const { hashKciReportSemantic } = require('../../lib/analysis/kci-activation-v1.js');
const {
  createKciPresentationContext,
  buildExplainabilityForName,
} = require('../../lib/presentation/kci-explainability.js');

const ROOT = path.join(__dirname, '..', '..');
const AUDIT_DIR = path.join(ROOT, 'audit');
const OUT_PATH = path.join(AUDIT_DIR, 'trust-signals-equivalence.json');
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

function hashPresentationSample() {
  const ctx = createKciPresentationContext();
  const model = buildExplainabilityForName('Aadi', 'aadi', ctx);
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        overallScore: model.overallScore,
        knowledgeScore: model.components.knowledge.score,
        citationScore: model.components.citation.score,
        popularityScore: model.components.popularity.score,
        citationCount: model.components.citation.citationCount,
      }),
    )
    .digest('hex');
}

function hashFile(relPath) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, relPath), 'utf8')).digest('hex');
}

function main() {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });

  const krBefore = loadKnowledgeRecordsPayload();
  const krHashBefore = stableHash({ schemaVersion: krBefore.schemaVersion, records: krBefore.records });
  const citationRegistryBefore = loadJson(CITATION_PATHS.registry, {});
  const citationRegistryHashBefore = stableHash({
    schemaVersion: citationRegistryBefore.schemaVersion,
    citations: citationRegistryBefore.citations,
  });
  const citationRecordsBefore = loadCitationRecordsPayload();
  const citationRecordsHashBefore = citationRecordsBefore ? hashCitationRecordsSemantic(citationRecordsBefore) : null;
  const popularityRegistryBefore = loadJson(POPULARITY_PATHS.registry, {});
  const popularityRegistryHashBefore = hashRegistrySemantic(popularityRegistryBefore);
  const popularityRecordsBefore = loadPopularityRecordsPayload();
  const popularityRecordsHashBefore = popularityRecordsBefore
    ? hashPopularityRecordsSemantic(popularityRecordsBefore)
    : null;
  const kciReportBefore = loadJson(KCI_PATH, {});
  const kciReportHashBefore = hashKciReportSemantic(kciReportBefore);
  const kciEngineHashBefore = crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(ROOT, 'lib/analysis/knowledge-completeness.js'), 'utf8'))
    .update(fs.readFileSync(path.join(ROOT, 'lib/analysis/kci-activation-v1.js'), 'utf8'))
    .digest('hex');
  const presentationHashBefore = hashPresentationSample();
  const presentationLayerHashBefore = crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(ROOT, 'lib/presentation/kci-explainability.js'), 'utf8'))
    .update(fs.readFileSync(path.join(ROOT, 'lib/presentation/kci-explainability-html.js'), 'utf8'))
    .digest('hex');
  const enrichedBefore = loadJson(ENRICHED_PATH, null);
  const enrichedHashBefore = stableHash(enrichedBefore);

  runNodeScript('scripts/generate-trust-pages.js');
  runNodeScript('scripts/build/validate-trust-signals.js');

  const krAfter = loadKnowledgeRecordsPayload();
  const krHashAfter = stableHash({ schemaVersion: krAfter.schemaVersion, records: krAfter.records });
  const citationRegistryAfter = loadJson(CITATION_PATHS.registry, {});
  const citationRegistryHashAfter = stableHash({
    schemaVersion: citationRegistryAfter.schemaVersion,
    citations: citationRegistryAfter.citations,
  });
  const citationRecordsAfter = loadCitationRecordsPayload();
  const citationRecordsHashAfter = citationRecordsAfter ? hashCitationRecordsSemantic(citationRecordsAfter) : null;
  const popularityRegistryAfter = loadJson(POPULARITY_PATHS.registry, {});
  const popularityRegistryHashAfter = hashRegistrySemantic(popularityRegistryAfter);
  const popularityRecordsAfter = loadPopularityRecordsPayload();
  const popularityRecordsHashAfter = popularityRecordsAfter
    ? hashPopularityRecordsSemantic(popularityRecordsAfter)
    : null;
  const kciReportAfter = loadJson(KCI_PATH, {});
  const kciReportHashAfter = hashKciReportSemantic(kciReportAfter);
  const kciEngineHashAfter = crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(ROOT, 'lib/analysis/knowledge-completeness.js'), 'utf8'))
    .update(fs.readFileSync(path.join(ROOT, 'lib/analysis/kci-activation-v1.js'), 'utf8'))
    .digest('hex');
  const presentationHashAfter = hashPresentationSample();
  const presentationLayerHashBeforeAfter = crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(ROOT, 'lib/presentation/kci-explainability.js'), 'utf8'))
    .update(fs.readFileSync(path.join(ROOT, 'lib/presentation/kci-explainability-html.js'), 'utf8'))
    .digest('hex');
  const enrichedAfter = loadJson(ENRICHED_PATH, []);
  const enrichmentDiff = compareEnriched(enrichedBefore, enrichedAfter);

  const report = {
    phase: '12A',
    title: 'Trust Signals Equivalence',
    generatedAt: new Date().toISOString(),
    baselineReference: 'kci-explainability-v1',
    knowledgeRecords: { status: krHashBefore === krHashAfter ? 'PASS' : 'FAIL' },
    citationRegistry: { status: citationRegistryHashBefore === citationRegistryHashAfter ? 'PASS' : 'FAIL' },
    citationRecords: {
      status:
        citationRecordsHashBefore != null && citationRecordsHashBefore === citationRecordsHashAfter
          ? 'PASS'
          : 'FAIL',
    },
    popularityRegistry: {
      status: popularityRegistryHashBefore === popularityRegistryHashAfter ? 'PASS' : 'FAIL',
    },
    popularityRecords: {
      status:
        popularityRecordsHashBefore != null && popularityRecordsHashBefore === popularityRecordsHashAfter
          ? 'PASS'
          : 'FAIL',
    },
    kciReport: { status: kciReportHashBefore === kciReportHashAfter ? 'PASS' : 'FAIL' },
    kciEngine: { status: kciEngineHashBefore === kciEngineHashAfter ? 'PASS' : 'FAIL' },
    kciPresentationSample: { status: presentationHashBefore === presentationHashAfter ? 'PASS' : 'FAIL' },
    presentationLayerExtended: {
      status: presentationLayerHashBefore === presentationLayerHashBeforeAfter ? 'PASS' : 'CHANGED',
      note: 'Phase 12A extends presentation with trust signals and shared citation formatting.',
    },
    enrichment: { status: enrichmentDiff.length === 0 ? 'PASS' : 'FAIL', differences: enrichmentDiff.length },
    trustPresentationOnly: true,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));

  const pass =
    report.knowledgeRecords.status === 'PASS' &&
    report.citationRegistry.status === 'PASS' &&
    report.citationRecords.status === 'PASS' &&
    report.popularityRegistry.status === 'PASS' &&
    report.popularityRecords.status === 'PASS' &&
    report.kciReport.status === 'PASS' &&
    report.kciEngine.status === 'PASS' &&
    report.kciPresentationSample.status === 'PASS' &&
    report.enrichment.status === 'PASS';

  console.log('Trust signals equivalence audit:', pass ? 'PASS' : 'FAIL');
  console.log('  Output:', OUT_PATH);
  if (!pass) {
    process.exitCode = 1;
    throw new Error('Trust signals equivalence audit failed.');
  }
}

main();
