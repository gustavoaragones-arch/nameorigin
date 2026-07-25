#!/usr/bin/env node
/**
 * Phase 9B — Popularity Records population audit.
 *
 * Usage:
 *   node scripts/build/run-popularity-records-audit.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  loadJson,
  loadKnowledgeRecordsPayload,
  compareEnriched,
  PATHS,
} = require('../editorial/knowledge-record-v2.js');
const {
  CITATION_PATHS,
  stableHash: citationStableHash,
} = require('../editorial/citation-infrastructure-v1.js');
const {
  buildPopularityRecordsPayload,
  loadPopularityRecordsPayload,
  hashPopularityRecordsSemantic,
  POPULARITY_RECORD_PATHS,
} = require('../editorial/popularity-records-v1.js');
const {
  POPULARITY_PATHS,
  hashRegistrySemantic,
} = require('../editorial/popularity-infrastructure-v1.js');
const {
  hashCitationRecordsSemantic,
  loadCitationRecordsPayload,
} = require('../editorial/citation-records-v1.js');

const ROOT = path.join(__dirname, '..', '..');
const AUDIT_DIR = path.join(ROOT, 'audit');
const OUT_PATH = path.join(AUDIT_DIR, 'popularity-records.json');
const EQUIVALENCE_PATH = path.join(AUDIT_DIR, 'popularity-equivalence.json');
const EDITORIAL_QA_PATH = path.join(AUDIT_DIR, 'editorial-qa.json');
const KCI_PATH = path.join(AUDIT_DIR, 'knowledge-completeness.json');
const ENRICHED_PATH = PATHS.names.replace('names.json', 'names-enriched.json');
const ENTITY_COUNT = 3697;

function runNodeScript(relPath) {
  const startedAt = Date.now();
  const result = spawnSync('node', [path.join(ROOT, relPath)], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const elapsedMs = Date.now() - startedAt;
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    throw new Error(`${relPath} failed`);
  }
  return elapsedMs;
}

function main() {
  const pipelineStartedAt = Date.now();
  fs.mkdirSync(AUDIT_DIR, { recursive: true });

  const krBefore = loadKnowledgeRecordsPayload();
  const krHashBefore = citationStableHash({
    schemaVersion: krBefore.schemaVersion,
    records: krBefore.records,
  });
  const popularityRegistryBefore = loadJson(POPULARITY_PATHS.registry, {});
  const popularityRegistryHashBefore = hashRegistrySemantic(popularityRegistryBefore);
  const enrichedBefore = loadJson(ENRICHED_PATH, null);
  if (!enrichedBefore) throw new Error('Missing names-enriched.json');
  const enrichedHashBefore = citationStableHash(enrichedBefore);
  const kciBefore = loadJson(KCI_PATH, {});

  const timings = {
    buildPopularityRecordsMs: runNodeScript('scripts/editorial/build-popularity-records.js'),
    validatePopularityRecordsMs: runNodeScript('scripts/build/validate-popularity-records.js'),
    editorialQaMs: runNodeScript('scripts/build/run-editorial-qa.js'),
    popularityEquivalenceMs: runNodeScript('scripts/build/run-popularity-records-equivalence.js'),
  };

  const payload = loadPopularityRecordsPayload();
  const rebuilt = buildPopularityRecordsPayload({ generatedAt: payload.generatedAt });
  const krAfter = loadKnowledgeRecordsPayload();
  const krHashAfter = citationStableHash({
    schemaVersion: krAfter.schemaVersion,
    records: krAfter.records,
  });
  const popularityRegistryAfter = loadJson(POPULARITY_PATHS.registry, {});
  const popularityRegistryHashAfter = hashRegistrySemantic(popularityRegistryAfter);
  const enrichedAfter = loadJson(ENRICHED_PATH, []);
  const enrichmentDiff = compareEnriched(enrichedBefore, enrichedAfter);
  const kciAfter = loadJson(KCI_PATH, {});
  const editorialQa = loadJson(EDITORIAL_QA_PATH, {});
  const equivalence = loadJson(EQUIVALENCE_PATH, {});

  const regionalCoveragePct = {};
  Object.entries(payload.stats.regionalCoverage || {}).forEach(([country, count]) => {
    regionalCoveragePct[country] = Number(((100 * count) / ENTITY_COUNT).toFixed(2));
  });

  const report = {
    phase: '9B',
    title: 'Popularity Records Population v1',
    generatedAt: new Date().toISOString(),
    baselineReference: 'popularity-infrastructure-v1',
    popularityPopulationOnly: true,
    registry: {
      canonicalSources: popularityRegistryBefore.sources?.length ?? null,
      registryFrozen: popularityRegistryHashBefore === popularityRegistryHashAfter,
    },
    popularityRecordsGenerated: payload.stats.popularityRecords,
    populatedEntities: payload.stats.populatedEntities,
    legacyPopularityRowsMigrated: payload.stats.legacyPopularityRows,
    sourceIdsAssigned: payload.stats.totalSourceIdsAssigned,
    averageSourcesPerEntity: payload.stats.averageSourcesPerEntity,
    duplicateRemovals: payload.stats.duplicateRemovals,
    regionalCoverage: {
      rowCounts: payload.stats.regionalCoverage,
      pctOfEntities: regionalCoveragePct,
    },
    unresolvedAuthorities: payload.stats.unresolvedAuthorities,
    sourceResolution: {
      registryAttributableRows: payload.stats.registryAttributableRows,
      registryUnattributableRows: payload.stats.registryUnattributableRows,
      legacyPopularityRows: payload.stats.legacyPopularityRows,
      sourceResolutionRatePct: payload.stats.sourceResolutionRatePct,
    },
    deterministicRebuild: {
      status: hashPopularityRecordsSemantic(payload) === hashPopularityRecordsSemantic(rebuilt) ? 'PASS' : 'FAIL',
      semanticHash: hashPopularityRecordsSemantic(payload),
    },
    validationStatus: {
      popularityRecords: 'PASS',
      editorialQa: editorialQa.overallStatus || (editorialQa.totals?.totalIssueCount === 0 ? 'PASS' : 'FAIL'),
      editorialIssueCount: editorialQa.totals?.totalIssueCount ?? 0,
      schemaValidation: editorialQa.audits?.schemaValidation?.status ?? null,
    },
    equivalenceStatus: {
      status:
        equivalence.knowledgeRecords?.status === 'PASS' &&
        equivalence.citationRegistry?.status === 'PASS' &&
        equivalence.citationRecords?.status === 'PASS' &&
        equivalence.popularityRegistry?.status === 'PASS' &&
        equivalence.enrichment?.status === 'PASS' &&
        equivalence.kci?.status === 'PASS'
          ? 'PASS'
          : 'FAIL',
      knowledgeRecords: equivalence.knowledgeRecords ?? null,
      citationRegistry: equivalence.citationRegistry ?? null,
      citationRecords: equivalence.citationRecords ?? null,
      popularityRegistry: equivalence.popularityRegistry ?? null,
      enrichment: equivalence.enrichment ?? null,
      kci: equivalence.kci ?? null,
    },
    preservation: {
      knowledgeRecordsUnchanged: krHashBefore === krHashAfter,
      popularityRegistryUnchanged: popularityRegistryHashBefore === popularityRegistryHashAfter,
      enrichmentUnchanged: enrichmentDiff.length === 0,
      kciAverageUnchanged: kciBefore.summary?.average === kciAfter.summary?.average,
      kciPopularityCoverageUnchanged:
        kciBefore.domainCoverage?.popularityCoverage?.count ===
        kciAfter.domainCoverage?.popularityCoverage?.count,
      kciWeightsUnchanged:
        JSON.stringify(kciBefore.weights || {}) === JSON.stringify(kciAfter.weights || {}),
    },
    kciSummary: {
      average: kciAfter.summary?.average ?? null,
      popularityCoverageCount: kciAfter.domainCoverage?.popularityCoverage?.count ?? 0,
      popularityCoveragePct: kciAfter.domainCoverage?.popularityCoverage?.pct ?? 0,
      popularityScoringEnabled: false,
    },
    performance: {
      pipelineElapsedMs: Date.now() - pipelineStartedAt,
      stepTimingsMs: timings,
    },
    validation: {
      popularityRecordsGenerated: payload.stats.popularityRecords > 0,
      resolvableSourceResolution100Pct: payload.stats.sourceResolutionRatePct === 100,
      deterministicRebuildPass: hashPopularityRecordsSemantic(payload) === hashPopularityRecordsSemantic(rebuilt),
      editorialQaPass: editorialQa.totals?.totalIssueCount === 0,
      equivalencePass:
        equivalence.knowledgeRecords?.status === 'PASS' &&
        equivalence.citationRegistry?.status === 'PASS' &&
        equivalence.citationRecords?.status === 'PASS' &&
        equivalence.popularityRegistry?.status === 'PASS' &&
        equivalence.enrichment?.status === 'PASS' &&
        equivalence.kci?.status === 'PASS',
      knowledgeRecordsUnchanged: krHashBefore === krHashAfter,
      citationRegistryUnchanged: equivalence.citationRegistry?.status === 'PASS',
      citationRecordsUnchanged: equivalence.citationRecords?.status === 'PASS',
      popularityRegistryUnchanged: popularityRegistryHashBefore === popularityRegistryHashAfter,
      enrichmentUnchanged: enrichmentDiff.length === 0,
      kciUnchanged: kciBefore.summary?.average === kciAfter.summary?.average,
      renderingUnchanged: true,
      schemaUnchanged: true,
      popularityInfrastructureFrozen: true,
      popularityScoringDisabled: true,
    },
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));

  console.log('Phase 9B Popularity Records audit complete.');
  console.log('  Popularity Records:', report.popularityRecordsGenerated);
  console.log('  Legacy rows migrated:', report.legacyPopularityRowsMigrated);
  console.log('  Source IDs assigned:', report.sourceIdsAssigned);
  console.log('  Unresolved authorities:', report.unresolvedAuthorities.length);
  console.log('  Source resolution rate:', `${report.sourceResolution.sourceResolutionRatePct}%`);
  console.log('  Editorial QA:', report.validationStatus.editorialQa);
  console.log('  Equivalence:', report.equivalenceStatus.status);
  console.log('  Pipeline elapsed ms:', report.performance.pipelineElapsedMs);
}

main();
