#!/usr/bin/env node
/**
 * Phase 12A — Trust signals audit runner.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { createTrustSignalsContext } = require('../../lib/presentation/trust-signals.js');

const ROOT = path.join(__dirname, '..', '..');
const AUDIT_DIR = path.join(ROOT, 'audit');
const OUT_PATH = path.join(AUDIT_DIR, 'trust-signals.json');
const EQUIVALENCE_PATH = path.join(AUDIT_DIR, 'trust-signals-equivalence.json');
const EDITORIAL_QA_PATH = path.join(AUDIT_DIR, 'editorial-qa.json');

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

  const ctx = createTrustSignalsContext();

  const timings = {
    generateTrustPagesMs: runNodeScript('scripts/generate-trust-pages.js'),
    validateTrustSignalsMs: runNodeScript('scripts/build/validate-trust-signals.js'),
    validateKciPresentationMs: runNodeScript('scripts/build/validate-kci-presentation.js'),
    editorialQaMs: runNodeScript('scripts/build/run-editorial-qa.js'),
    trustSignalsEquivalenceMs: runNodeScript('scripts/build/run-trust-signals-equivalence.js'),
  };

  const editorialQa = JSON.parse(fs.readFileSync(EDITORIAL_QA_PATH, 'utf8'));
  const equivalence = JSON.parse(fs.readFileSync(EQUIVALENCE_PATH, 'utf8'));

  const report = {
    phase: '12A',
    title: 'Authority & Trust Signals v1',
    generatedAt: new Date().toISOString(),
    baselineReference: 'kci-explainability-v1',
    trustPresentationOnly: true,
    pagesGenerated: [
      '/about/methodology/',
      '/about/editorial-policy/',
      '/about/architecture/',
      '/about/quality-assurance/',
    ],
    trustComponentsRendered: {
      architectureVersions: true,
      validationBadges: true,
      editorialQaStatus: true,
      deterministicBuildStatus: true,
      equivalenceStatus: true,
      auditAvailability: true,
      lastGeneratedTimestamp: true,
    },
    versionMetadata: ctx.architectureMilestones.map((row) => ({
      name: row.name,
      version: row.version,
      status: row.status,
      validation: row.validation,
      equivalence: row.equivalence,
    })),
    citationFormatting: {
      sharedRenderer: 'lib/presentation/citation-presentation.js',
      exposesInternalIds: false,
      standardFields: ['title', 'edition', 'organization'],
    },
    missingDataHandling: {
      trustPagesAlwaysRender: true,
      validationBadgesDefaultPass: true,
    },
    validationStatus: {
      trustSignals: 'PASS',
      kciPresentation: 'PASS',
      editorialQa: editorialQa.overallStatus || (editorialQa.totals?.totalIssueCount === 0 ? 'PASS' : 'FAIL'),
      editorialIssueCount: editorialQa.totals?.totalIssueCount ?? 0,
    },
    equivalenceStatus: {
      status:
        equivalence.knowledgeRecords?.status === 'PASS' &&
        equivalence.citationRegistry?.status === 'PASS' &&
        equivalence.citationRecords?.status === 'PASS' &&
        equivalence.popularityRegistry?.status === 'PASS' &&
        equivalence.popularityRecords?.status === 'PASS' &&
        equivalence.kciReport?.status === 'PASS' &&
        equivalence.kciEngine?.status === 'PASS' &&
        equivalence.kciPresentationSample?.status === 'PASS' &&
        equivalence.enrichment?.status === 'PASS'
          ? 'PASS'
          : 'FAIL',
      details: equivalence,
    },
    performance: {
      pipelineElapsedMs: Date.now() - pipelineStartedAt,
      stepTimingsMs: timings,
    },
    validation: {
      allTrustPagesGenerated: true,
      sharedCitationFormatting: true,
      versionMetadataDisplayed: true,
      validationBadgesDisplayed: true,
      noInternalIdsExposed: true,
      noSemanticHashesExposed: true,
      deterministicRenderingPass: true,
      editorialQaPass: editorialQa.totals?.totalIssueCount === 0,
      equivalencePass:
        equivalence.knowledgeRecords?.status === 'PASS' &&
        equivalence.kciEngine?.status === 'PASS',
      knowledgeArchitectureUnchanged: equivalence.knowledgeRecords?.status === 'PASS',
      citationArchitectureUnchanged: equivalence.citationRegistry?.status === 'PASS',
      popularityArchitectureUnchanged: equivalence.popularityRegistry?.status === 'PASS',
      kciUnchanged: equivalence.kciReport?.status === 'PASS' && equivalence.kciEngine?.status === 'PASS',
      presentationSampleUnchanged: equivalence.kciPresentationSample?.status === 'PASS',
    },
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));

  console.log('Phase 12A Trust Signals audit complete.');
  console.log('  Trust pages:', report.pagesGenerated.length);
  console.log('  Architecture milestones:', report.versionMetadata.length);
  console.log('  Editorial QA:', report.validationStatus.editorialQa);
  console.log('  Equivalence:', report.equivalenceStatus.status);
  console.log('  Pipeline elapsed ms:', report.performance.pipelineElapsedMs);
}

main();
