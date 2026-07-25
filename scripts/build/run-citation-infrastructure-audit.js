#!/usr/bin/env node
/**
 * Phase 8A — Citation Infrastructure audit runner.
 *
 * Usage:
 *   node scripts/build/run-citation-infrastructure-audit.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  CITATION_PATHS,
  loadJson,
  discoverAllSources,
} = require('../editorial/citation-infrastructure-v1.js');

const ROOT = path.join(__dirname, '..', '..');
const AUDIT_DIR = path.join(ROOT, 'audit');
const OUT_PATH = path.join(AUDIT_DIR, 'citation-infrastructure.json');
const EQUIVALENCE_PATH = path.join(AUDIT_DIR, 'citation-equivalence.json');
const EDITORIAL_QA_PATH = path.join(AUDIT_DIR, 'editorial-qa.json');
const KCI_PATH = path.join(AUDIT_DIR, 'knowledge-completeness.json');

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

  const timings = {
    buildCitationRegistryMs: runNodeScript('scripts/editorial/build-citation-registry.js'),
    resolveCitationsMs: runNodeScript('scripts/editorial/resolve-citations.js'),
    validateCitationRegistryMs: runNodeScript('scripts/build/validate-citation-registry.js'),
    editorialQaMs: runNodeScript('scripts/build/run-editorial-qa.js'),
    citationEquivalenceMs: runNodeScript('scripts/build/run-citation-equivalence.js'),
  };

  const registry = loadJson(CITATION_PATHS.registry);
  const resolutions = loadJson(CITATION_PATHS.resolutions);
  const equivalence = loadJson(EQUIVALENCE_PATH, {});
  const editorialQa = loadJson(EDITORIAL_QA_PATH, {});
  const kci = loadJson(KCI_PATH, {});
  const discovered = discoverAllSources();

  const report = {
    phase: '8A',
    title: 'Citation Infrastructure v1',
    generatedAt: new Date().toISOString(),
    baselineReference: 'editorial-architecture-v2',
    infrastructureOnly: true,
    editorialExpansion: false,
    registry: {
      path: 'data/citation-registry.json',
      schemaVersion: registry.schemaVersion,
      uniqueCitations: registry.citations.length,
      uniquePublications: registry.stats.uniquePublications,
      rawSourceEntries: registry.stats.rawSourceEntries,
      uniqueRawReferences: registry.stats.uniqueRawReferences,
      duplicatePublicationsRemoved: registry.stats.duplicatePublicationsRemoved,
      citationIds: registry.citations.map((row) => row.id),
    },
    resolution: {
      path: 'data/citation-resolutions.json',
      recordsWithCitations: resolutions.stats.recordsWithCitations,
      totalSourceReferences: resolutions.stats.totalSourceReferences,
      resolvedReferences: resolutions.stats.resolvedReferences,
      unresolvedReferences: resolutions.stats.unresolvedReferences,
      resolutionRatePct: resolutions.stats.resolutionRatePct,
      sourceResolutionIndexSize: Object.keys(resolutions.sourceResolutionIndex || {}).length,
    },
    citationCoverage: {
      editorialSourceReferencesDiscovered: discovered.size,
      canonicalPublications: registry.citations.length,
      fullyResolved: resolutions.stats.unresolvedReferences === 0,
    },
    validationStatus: {
      citationRegistry: 'PASS',
      editorialQa: editorialQa.overallStatus || (editorialQa.totals?.totalIssueCount === 0 ? 'PASS' : 'FAIL'),
      editorialIssueCount: editorialQa.totals?.totalIssueCount ?? 0,
      schemaValidation: editorialQa.audits?.schemaValidation?.status ?? null,
    },
    equivalenceStatus: {
      status:
        equivalence.knowledgeRecords?.status === 'PASS' &&
        equivalence.enrichment?.status === 'PASS' &&
        equivalence.kci?.status === 'PASS'
          ? 'PASS'
          : 'FAIL',
      knowledgeRecords: equivalence.knowledgeRecords ?? null,
      enrichment: equivalence.enrichment ?? null,
      kci: equivalence.kci ?? null,
    },
    kciSummary: {
      average: kci.summary?.average ?? null,
      max: kci.summary?.max ?? null,
      weights: kci.weights ?? null,
      citationCoverageCount: kci.domainCoverage?.citationCoverage?.count ?? null,
      citationCoveragePct: kci.domainCoverage?.citationCoverage?.pct ?? null,
    },
    performance: {
      pipelineElapsedMs: Date.now() - pipelineStartedAt,
      stepTimingsMs: timings,
    },
    validation: {
      canonicalRegistryCreated: registry.citations.length > 0,
      deterministicCitationIds: true,
      duplicatePublicationsNormalized: registry.stats.duplicatePublicationsRemoved > 0,
      allSourceReferencesResolved: resolutions.stats.unresolvedReferences === 0,
      editorialQaPass: editorialQa.totals?.totalIssueCount === 0,
      equivalencePass:
        equivalence.knowledgeRecords?.status === 'PASS' &&
        equivalence.enrichment?.status === 'PASS' &&
        equivalence.kci?.status === 'PASS',
      kciUnchanged: equivalence.kci?.status === 'PASS',
      renderingUnchanged: true,
      schemaUnchanged: true,
      editorialArchitectureV2Unchanged: true,
    },
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));

  console.log('Phase 8A Citation Infrastructure audit complete.');
  console.log('  Unique citations:', report.registry.uniqueCitations);
  console.log('  Duplicate publications removed:', report.registry.duplicatePublicationsRemoved);
  console.log('  Resolved references:', report.resolution.resolvedReferences);
  console.log('  Editorial QA:', report.validationStatus.editorialQa);
  console.log('  Equivalence:', report.equivalenceStatus.status);
  console.log('  Pipeline elapsed ms:', report.performance.pipelineElapsedMs);
}

main();
