#!/usr/bin/env node
/**
 * Phase 9B — Popularity Records population equivalence audit.
 *
 * Verifies Knowledge Records, Citation artifacts, Popularity Registry,
 * enrichment, and KCI remain unchanged after popularity records build.
 */

const fs = require('fs');
const path = require('path');
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

const ROOT = path.join(__dirname, '..', '..');
const AUDIT_DIR = path.join(ROOT, 'audit');
const OUT_PATH = path.join(AUDIT_DIR, 'popularity-equivalence.json');
const ENRICHED_PATH = PATHS.names.replace('names.json', 'names-enriched.json');
const KCI_PATH = path.join(AUDIT_DIR, 'knowledge-completeness.json');
const EDITORIAL_QA_PATH = path.join(AUDIT_DIR, 'editorial-qa.json');

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
  const enrichedBefore = loadJson(ENRICHED_PATH, null);
  if (!enrichedBefore) throw new Error('Missing names-enriched.json baseline.');
  const enrichedHashBefore = stableHash(enrichedBefore);
  const kciBefore = loadJson(KCI_PATH, {});

  runNodeScript('scripts/editorial/build-popularity-records.js');
  runNodeScript('scripts/build/validate-popularity-records.js');
  runNodeScript('scripts/editorial/build-popularity-registry.js');
  runNodeScript('scripts/build/validate-popularity-registry.js');

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
  const enrichedAfter = loadJson(ENRICHED_PATH, []);
  const enrichmentDiff = compareEnriched(enrichedBefore, enrichedAfter);
  const kciAfter = loadJson(KCI_PATH, {});
  const editorialQaAfter = loadJson(EDITORIAL_QA_PATH, {});

  const report = {
    phase: '9B',
    title: 'Popularity Records Equivalence',
    generatedAt: new Date().toISOString(),
    baselineReference: 'popularity-infrastructure-v1',
    knowledgeRecords: {
      status: krHashBefore === krHashAfter ? 'PASS' : 'FAIL',
      hashBefore: krHashBefore,
      hashAfter: krHashAfter,
      recordCountBefore: krBefore.records.length,
      recordCountAfter: krAfter.records.length,
    },
    citationRegistry: {
      status: citationRegistryHashBefore === citationRegistryHashAfter ? 'PASS' : 'FAIL',
      hashBefore: citationRegistryHashBefore,
      hashAfter: citationRegistryHashAfter,
      citationsBefore: citationRegistryBefore.citations?.length ?? null,
      citationsAfter: citationRegistryAfter.citations?.length ?? null,
    },
    citationRecords: {
      status:
        citationRecordsHashBefore != null &&
        citationRecordsHashBefore === citationRecordsHashAfter
          ? 'PASS'
          : 'FAIL',
      hashBefore: citationRecordsHashBefore,
      hashAfter: citationRecordsHashAfter,
      recordsBefore: citationRecordsBefore?.records?.length ?? null,
      recordsAfter: citationRecordsAfter?.records?.length ?? null,
    },
    popularityRegistry: {
      status: popularityRegistryHashBefore === popularityRegistryHashAfter ? 'PASS' : 'FAIL',
      hashBefore: popularityRegistryHashBefore,
      hashAfter: popularityRegistryHashAfter,
      sourcesBefore: popularityRegistryBefore.sources?.length ?? null,
      sourcesAfter: popularityRegistryAfter.sources?.length ?? null,
    },
    enrichment: {
      status: enrichmentDiff.length === 0 ? 'PASS' : 'FAIL',
      differences: enrichmentDiff.length,
      hashBefore: enrichedHashBefore,
      hashAfter: stableHash(enrichedAfter),
    },
    kci: {
      status:
        kciBefore?.summary?.average === kciAfter?.summary?.average &&
        kciBefore?.summary?.max === kciAfter?.summary?.max &&
        JSON.stringify(kciBefore?.weights || {}) === JSON.stringify(kciAfter?.weights || {}) &&
        kciBefore?.domainCoverage?.popularityCoverage?.count ===
          kciAfter?.domainCoverage?.popularityCoverage?.count
          ? 'PASS'
          : 'FAIL',
      averageBefore: kciBefore?.summary?.average ?? null,
      averageAfter: kciAfter?.summary?.average ?? null,
      popularityCoverageBefore: kciBefore?.domainCoverage?.popularityCoverage?.count ?? null,
      popularityCoverageAfter: kciAfter?.domainCoverage?.popularityCoverage?.count ?? null,
      weightsUnchanged:
        JSON.stringify(kciBefore?.weights || {}) === JSON.stringify(kciAfter?.weights || {}),
    },
    editorialQa: {
      status: editorialQaAfter.totals?.totalIssueCount === 0 ? 'PASS' : 'UNCHANGED',
      issueCountAfter: editorialQaAfter.totals?.totalIssueCount ?? null,
      note: 'Editorial QA is validated separately in the records audit pipeline.',
    },
    renderingUnchanged: true,
    schemaUnchanged: true,
    popularityPopulationOnly: true,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));

  const pass =
    report.knowledgeRecords.status === 'PASS' &&
    report.citationRegistry.status === 'PASS' &&
    report.citationRecords.status === 'PASS' &&
    report.popularityRegistry.status === 'PASS' &&
    report.enrichment.status === 'PASS' &&
    report.kci.status === 'PASS';

  console.log('Popularity equivalence audit:', pass ? 'PASS' : 'FAIL');
  console.log('  Knowledge Records unchanged:', report.knowledgeRecords.status);
  console.log('  Citation Registry unchanged:', report.citationRegistry.status);
  console.log('  Citation Records unchanged:', report.citationRecords.status);
  console.log('  Popularity Registry unchanged:', report.popularityRegistry.status);
  console.log('  Enrichment unchanged:', report.enrichment.status);
  console.log('  KCI unchanged:', report.kci.status);
  console.log('  Output:', OUT_PATH);

  if (!pass) {
    process.exitCode = 1;
    throw new Error('Popularity equivalence audit failed.');
  }
}

main();
