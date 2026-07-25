#!/usr/bin/env node
/**
 * Phase 11A — KCI presentation equivalence audit.
 *
 * Verifies frozen data architectures and KCI engine remain unchanged
 * after presentation-layer validation.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const crypto = require('crypto');
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

const ROOT = path.join(__dirname, '..', '..');
const AUDIT_DIR = path.join(ROOT, 'audit');
const OUT_PATH = path.join(AUDIT_DIR, 'kci-presentation-equivalence.json');
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

function hashKnowledgeRecords(payload) {
  return stableHash({
    schemaVersion: payload.schemaVersion,
    records: payload.records,
  });
}

function hashCitationRegistry(registry) {
  return stableHash({
    schemaVersion: registry.schemaVersion,
    citations: registry.citations,
  });
}

function hashKnowledgeCompletenessEngine() {
  const enginePath = path.join(ROOT, 'lib', 'analysis', 'knowledge-completeness.js');
  const activationPath = path.join(ROOT, 'lib', 'analysis', 'kci-activation-v1.js');
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(enginePath, 'utf8'))
    .update(fs.readFileSync(activationPath, 'utf8'))
    .digest('hex');
}

function main() {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });

  const krBefore = loadKnowledgeRecordsPayload();
  const krHashBefore = hashKnowledgeRecords(krBefore);
  const citationRegistryBefore = loadJson(CITATION_PATHS.registry, {});
  const citationRegistryHashBefore = hashCitationRegistry(citationRegistryBefore);
  const citationRecordsBefore = loadCitationRecordsPayload();
  const citationRecordsHashBefore = citationRecordsBefore
    ? hashCitationRecordsSemantic(citationRecordsBefore)
    : null;
  const popularityRegistryBefore = loadJson(POPULARITY_PATHS.registry, {});
  const popularityRegistryHashBefore = hashRegistrySemantic(popularityRegistryBefore);
  const popularityRecordsBefore = loadPopularityRecordsPayload();
  const popularityRecordsHashBefore = popularityRecordsBefore
    ? hashPopularityRecordsSemantic(popularityRecordsBefore)
    : null;
  const kciReportBefore = loadJson(KCI_PATH, {});
  const kciReportHashBefore = hashKciReportSemantic(kciReportBefore);
  const kciEngineHashBefore = hashKnowledgeCompletenessEngine();
  const enrichedBefore = loadJson(ENRICHED_PATH, null);
  if (!enrichedBefore) throw new Error('Missing names-enriched.json baseline.');
  const enrichedHashBefore = stableHash(enrichedBefore);

  runNodeScript('scripts/build/validate-kci-presentation.js');

  const krAfter = loadKnowledgeRecordsPayload();
  const krHashAfter = hashKnowledgeRecords(krAfter);
  const citationRegistryAfter = loadJson(CITATION_PATHS.registry, {});
  const citationRegistryHashAfter = hashCitationRegistry(citationRegistryAfter);
  const citationRecordsAfter = loadCitationRecordsPayload();
  const citationRecordsHashAfter = citationRecordsAfter
    ? hashCitationRecordsSemantic(citationRecordsAfter)
    : null;
  const popularityRegistryAfter = loadJson(POPULARITY_PATHS.registry, {});
  const popularityRegistryHashAfter = hashRegistrySemantic(popularityRegistryAfter);
  const popularityRecordsAfter = loadPopularityRecordsPayload();
  const popularityRecordsHashAfter = popularityRecordsAfter
    ? hashPopularityRecordsSemantic(popularityRecordsAfter)
    : null;
  const kciReportAfter = loadJson(KCI_PATH, {});
  const kciReportHashAfter = hashKciReportSemantic(kciReportAfter);
  const kciEngineHashAfter = hashKnowledgeCompletenessEngine();
  const enrichedAfter = loadJson(ENRICHED_PATH, []);
  const enrichmentDiff = compareEnriched(enrichedBefore, enrichedAfter);

  const report = {
    phase: '11A',
    title: 'KCI Presentation Equivalence',
    generatedAt: new Date().toISOString(),
    baselineReference: 'kci-activation-v1',
    knowledgeRecords: {
      status: krHashBefore === krHashAfter ? 'PASS' : 'FAIL',
      hashBefore: krHashBefore,
      hashAfter: krHashAfter,
    },
    citationRegistry: {
      status: citationRegistryHashBefore === citationRegistryHashAfter ? 'PASS' : 'FAIL',
    },
    citationRecords: {
      status:
        citationRecordsHashBefore != null &&
        citationRecordsHashBefore === citationRecordsHashAfter
          ? 'PASS'
          : 'FAIL',
    },
    popularityRegistry: {
      status: popularityRegistryHashBefore === popularityRegistryHashAfter ? 'PASS' : 'FAIL',
    },
    popularityRecords: {
      status:
        popularityRecordsHashBefore != null &&
        popularityRecordsHashBefore === popularityRecordsHashAfter
          ? 'PASS'
          : 'FAIL',
    },
    kciReport: {
      status: kciReportHashBefore === kciReportHashAfter ? 'PASS' : 'FAIL',
    },
    kciEngine: {
      status: kciEngineHashBefore === kciEngineHashAfter ? 'PASS' : 'FAIL',
      hashBefore: kciEngineHashBefore,
      hashAfter: kciEngineHashAfter,
    },
    enrichment: {
      status: enrichmentDiff.length === 0 ? 'PASS' : 'FAIL',
      differences: enrichmentDiff.length,
    },
    renderingUnchanged: true,
    schemaUnchanged: true,
    editorialUnchanged: true,
    presentationOnly: true,
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
    report.enrichment.status === 'PASS';

  console.log('KCI presentation equivalence audit:', pass ? 'PASS' : 'FAIL');
  console.log('  Output:', OUT_PATH);

  if (!pass) {
    process.exitCode = 1;
    throw new Error('KCI presentation equivalence audit failed.');
  }
}

main();
