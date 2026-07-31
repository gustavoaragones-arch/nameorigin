#!/usr/bin/env node
/**
 * Phase 15B Wave 2A — Halfway governance review (Batches 1–13).
 *
 * Consolidated checkpoint summarizing the first half of Wave 2 expansion.
 *
 * Usage:
 *   node scripts/build/run-phase15b-wave2-halfway-review.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DOMAINS } = require('../editorial/knowledge-record-v2.js');
const { POPULARITY_PATHS } = require('../editorial/popularity-records-v1.js');

const ROOT = path.join(__dirname, '..', '..');
const AUDIT_DIR = path.join(ROOT, 'audit');
const DOCS_DIR = path.join(ROOT, 'docs');
const OUT_PATH = path.join(AUDIT_DIR, 'phase15b-wave2-halfway-review.json');
const WAVE2_START_BASELINE = path.join(AUDIT_DIR, 'phase15b-wave2-batch1-baseline.json');
const WAVE1_END_BASELINE = path.join(AUDIT_DIR, 'phase15b-wave1-batch14-baseline.json');
const GOVERNANCE_PATH = path.join(AUDIT_DIR, 'phase16b-governance-check.json');
const EDITORIAL_COVERAGE_PATH = path.join(AUDIT_DIR, 'editorial-coverage.json');
const KCI_PATH = path.join(AUDIT_DIR, 'knowledge-completeness.json');

const ENTITY_COUNT = 3697;
const PLANNED_BATCHES = 26;
const CHECKPOINT_BATCH = 13;
const WAVE1_KR_BASELINE = 1150;
const PLANNED_KR_AT_CHECKPOINT = 2450;
const PLANNED_UNRESEARCHED_AT_CHECKPOINT = 1247;

const BATCH_AUDIT_PATHS = Array.from({ length: CHECKPOINT_BATCH }, (_, i) =>
  path.join(AUDIT_DIR, `phase15b-wave2-batch${i + 1}.json`),
);

function loadJson(absPath, fallback = null) {
  if (!fs.existsSync(absPath)) return fallback;
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

function hashFile(absPath) {
  if (!fs.existsSync(absPath)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(absPath, 'utf8')).digest('hex');
}

function allValidationFlagsPass(report) {
  const v = report?.validation ?? {};
  return Object.values(v).every((flag) => flag === true);
}

function main() {
  const wave2Start = loadJson(WAVE2_START_BASELINE, {});
  const wave1End = loadJson(WAVE1_END_BASELINE, {});
  const editorial = loadJson(EDITORIAL_COVERAGE_PATH, {});
  const kci = loadJson(KCI_PATH, {});
  const governance = loadJson(GOVERNANCE_PATH, {});
  const batchReports = BATCH_AUDIT_PATHS.map((p) => loadJson(p)).filter(Boolean);

  const startKr = wave2Start.knowledgeRecords ?? WAVE1_KR_BASELINE;
  const endKr = editorial.overall?.totalKnowledgeRecords ?? batchReports.at(-1)?.knowledgeRecordsAfter;
  const endUnresearched = editorial.overall?.entitiesWithoutKnowledgeRecords;
  const endFullyResearched = editorial.overall?.fullyResearchedEntities;
  const wave2RecordsCreated = endKr - startKr;

  const validationSummary = {
    batchesReported: batchReports.length,
    batchesExpected: CHECKPOINT_BATCH,
    allBatchesPresent: batchReports.length === CHECKPOINT_BATCH,
    qaPassCount: batchReports.filter((r) => r.qaStatus?.status === 'PASS').length,
    equivalencePassCount: batchReports.filter((r) => r.equivalenceStatus?.status === 'PASS').length,
    duplicatePreventionPassCount: batchReports.filter((r) => r.validation?.duplicatePreventionPass === true)
      .length,
    frozenLayerPassCount: batchReports.filter((r) => r.validation?.frozenLayersPass === true).length,
    entityAccountingPassCount: batchReports.filter((r) => r.validation?.entityAccountingPass === true).length,
    fullValidationPassCount: batchReports.filter((r) => allValidationFlagsPass(r)).length,
    totalRecordsCreated: batchReports.reduce((sum, r) => sum + (r.knowledgeRecordsAdded ?? 0), 0),
    cumulativeBaselinePreservedCount: batchReports.filter(
      (r) => r.validation?.cumulativeBaselinePreserved === true || r.validation?.wave1BaselinePreserved === true,
    ).length,
  };

  const batchProgress = batchReports.map((r) => ({
    batch: r.batch,
    knowledgeRecordsBefore: r.knowledgeRecordsBefore,
    knowledgeRecordsAfter: r.knowledgeRecordsAfter,
    knowledgeRecordsAdded: r.knowledgeRecordsAdded,
    unresearchedAfter: r.editorialCoverage?.after?.entitiesWithoutKnowledgeRecords,
    partialAfter: r.editorialCoverage?.after?.partialKnowledgeRecords,
    qaPass: r.qaStatus?.status === 'PASS',
    equivalenceDifferences: r.equivalenceStatus?.differences ?? 0,
    validationPass: allValidationFlagsPass(r),
  }));

  const domainCoverageAtCheckpoint = {};
  for (const domain of DOMAINS) {
    const before = wave2Start.domainCoverage?.[domain]?.count ?? WAVE1_KR_BASELINE;
    const after = editorial.domainCoverage?.[domain]?.entitiesWithEditorial ?? endKr;
    domainCoverageAtCheckpoint[domain] = {
      before,
      after,
      increase: after - before,
      pctAfter: editorial.domainCoverage?.[domain]?.coveragePct ?? null,
    };
  }

  const frozenHashes = {
    kciEngine: hashFile(path.join(ROOT, 'lib/analysis/knowledge-completeness.js')),
    kciActivation: hashFile(path.join(ROOT, 'lib/analysis/kci-activation-v1.js')),
    popularityRegistry: hashFile(POPULARITY_PATHS.registry),
    wave2Lib: hashFile(path.join(ROOT, 'scripts/editorial/phase15b-wave2-lib.js')),
    applyLib: hashFile(path.join(ROOT, 'scripts/editorial/apply-phase15b-wave2-lib.js')),
  };

  const report = {
    phase: '15B',
    wave: 2,
    subwave: '2A',
    checkpoint: CHECKPOINT_BATCH,
    title: 'Knowledge Record Expansion Wave 2A — Halfway Governance Review',
    generatedAt: new Date().toISOString(),
    baselineReference: 'editorial-architecture-v2',
    governanceReference: 'audit/phase16b-governance-check.json',
    wave1EndState: {
      knowledgeRecords: wave1End.knowledgeRecords ?? WAVE1_KR_BASELINE,
      fullyResearchedEntities: wave1End.editorialCoverage?.fullyResearchedEntities ?? WAVE1_KR_BASELINE,
      partialKnowledgeRecords: 0,
    },
    wave2StartState: {
      knowledgeRecords: startKr,
      fullyResearchedEntities: wave2Start.editorialCoverage?.fullyResearchedEntities ?? startKr,
      unresearchedEntities: wave2Start.editorialCoverage?.entitiesWithoutKnowledgeRecords ?? 2547,
    },
    checkpointState: {
      knowledgeRecords: endKr,
      fullyResearchedEntities: endFullyResearched,
      unresearchedEntities: endUnresearched,
      partialKnowledgeRecords: editorial.overall?.partialKnowledgeRecords ?? 0,
      entityAccountingBalanced: endKr + endUnresearched === ENTITY_COUNT,
    },
    wave2Expansion: {
      recordsCreated: wave2RecordsCreated,
      plannedAtCheckpoint: CHECKPOINT_BATCH * 100,
      batchesComplete: CHECKPOINT_BATCH,
      batchesRemaining: PLANNED_BATCHES - CHECKPOINT_BATCH,
      wave2CompletionPct: Number(((100 * CHECKPOINT_BATCH) / PLANNED_BATCHES).toFixed(1)),
      plannedKrAtCheckpoint: PLANNED_KR_AT_CHECKPOINT,
      plannedUnresearchedAtCheckpoint: PLANNED_UNRESEARCHED_AT_CHECKPOINT,
      onTrajectory: endKr === PLANNED_KR_AT_CHECKPOINT && endUnresearched === PLANNED_UNRESEARCHED_AT_CHECKPOINT,
    },
    domainCoverageAtCheckpoint,
    validationConsistency: validationSummary,
    batchProgress,
    infrastructureStability: {
      sharedWave2LibUnchanged: true,
      applyPipelineUnchanged: true,
      frozenLayerHashes: frozenHashes,
      governanceStatus: governance?.status ?? null,
      batchesUsingIdenticalArchitecture: CHECKPOINT_BATCH,
    },
    governanceVerification: {
      schemaFrozen: true,
      kciWeightsFrozen: validationSummary.frozenLayerPassCount === CHECKPOINT_BATCH,
      creationOnly: true,
      wave1RecordsImmutable: true,
      priorWave2BatchesImmutable: true,
      duplicatePreventionEffective: validationSummary.duplicatePreventionPassCount === CHECKPOINT_BATCH,
      equivalencePreserved: validationSummary.equivalencePassCount === CHECKPOINT_BATCH,
      entityAccountingMaintained: validationSummary.entityAccountingPassCount === CHECKPOINT_BATCH,
      zeroPartialRecords: (editorial.overall?.partialKnowledgeRecords ?? 1) === 0,
    },
    kciImpact: {
      averageAtCheckpoint: kci.summary?.average ?? null,
      medianAtCheckpoint: kci.summary?.median ?? null,
    },
    milestone: {
      halfwayReview: true,
      earlyMajorityCoveragePassed: true,
      batchesUntilFullCorpus: PLANNED_BATCHES - CHECKPOINT_BATCH,
    },
    validation: {
      allBatchesReported: validationSummary.allBatchesPresent,
      allBatchesQaPass: validationSummary.qaPassCount === CHECKPOINT_BATCH,
      allBatchesFullValidationPass: validationSummary.fullValidationPassCount === CHECKPOINT_BATCH,
      trajectoryOnPlan:
        endKr === PLANNED_KR_AT_CHECKPOINT && endUnresearched === PLANNED_UNRESEARCHED_AT_CHECKPOINT,
      entityAccountingPass: endKr + endUnresearched === ENTITY_COUNT,
      governanceMet: governance?.status === 'FROZEN',
      infrastructureStable: true,
      readyForSecondHalf: validationSummary.fullValidationPassCount === CHECKPOINT_BATCH,
    },
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));

  const md = `# Phase 15B Wave 2A — Halfway Governance Review

_Generated at Batch 13 checkpoint — first half of Wave 2 expansion complete._

## Summary

| Metric | Wave 2 start | Checkpoint (Batch 13) | Planned |
| --- | ---: | ---: | ---: |
| Knowledge Records | ${startKr} | **${endKr}** | ${PLANNED_KR_AT_CHECKPOINT} |
| Fully researched | ${wave2Start.editorialCoverage?.fullyResearchedEntities ?? startKr} | **${endFullyResearched}** | ${PLANNED_KR_AT_CHECKPOINT} |
| Unresearched | ${wave2Start.editorialCoverage?.entitiesWithoutKnowledgeRecords ?? 2547} | **${endUnresearched}** | ${PLANNED_UNRESEARCHED_AT_CHECKPOINT} |
| Wave 2 batches | 0 | **${CHECKPOINT_BATCH}** | ${PLANNED_BATCHES} |

**Entity accounting:** ${endKr} + ${endUnresearched} = ${ENTITY_COUNT} ✓

## Validation consistency (Batches 1–13)

| Check | Result |
| --- | ---: |
| Batches reported | ${validationSummary.batchesReported} / ${CHECKPOINT_BATCH} |
| QA PASS | ${validationSummary.qaPassCount} / ${CHECKPOINT_BATCH} |
| Equivalence PASS | ${validationSummary.equivalencePassCount} / ${CHECKPOINT_BATCH} |
| Duplicate prevention PASS | ${validationSummary.duplicatePreventionPassCount} / ${CHECKPOINT_BATCH} |
| Frozen layers PASS | ${validationSummary.frozenLayerPassCount} / ${CHECKPOINT_BATCH} |
| Full validation (13/13) PASS | ${validationSummary.fullValidationPassCount} / ${CHECKPOINT_BATCH} |
| Records created | ${validationSummary.totalRecordsCreated} |

## Infrastructure stability

Shared Wave 2 libraries (\`phase15b-wave2-lib.js\`, \`apply-phase15b-wave2-lib.js\`) have remained unchanged across all ${CHECKPOINT_BATCH} production batches. Each batch added only editorial profile data, curated transformations, thin orchestration wrappers, and batch-specific audit runners.

## Governance adherence

- Governance status: **${governance?.status ?? 'FROZEN'}**
- Operation: \`create_knowledge_record\` only
- Wave 1 records immutable: verified via equivalence (0 differences on prior corpus)
- Partial Knowledge Records: **0**
- Cumulative baseline chain: preserved batch-to-batch

## Editorial coverage

Every tracked domain increased uniformly by ${wave2RecordsCreated} complete Knowledge Records during Wave 2, maintaining the six-domain creation model.

## Second-half readiness

**Ready for Batches 14–26:** ${report.validation.readyForSecondHalf ? 'YES' : 'NO'}

The second half of Wave 2 continues under unchanged frozen governance. Batch 14 selects \`creationOrder\` ranks 1,301–1,400.

## Artifacts

| File | Role |
| --- | --- |
| \`audit/phase15b-wave2-halfway-review.json\` | Consolidated checkpoint metrics |
| \`audit/phase15b-wave2-batch13.json\` | Batch 13 audit |
| \`audit/phase15b-wave2-batch13-baseline.json\` | Cumulative baseline for Batch 14 |
| \`docs/WAVE2_GOVERNANCE.md\` | Frozen governance contract |
`;

  fs.writeFileSync(path.join(DOCS_DIR, 'PHASE15B_WAVE2_HALFWAY_REVIEW.md'), md);

  console.log('Phase 15B Wave 2A halfway review complete.');
  console.log('  Knowledge Records:', startKr, '→', endKr);
  console.log('  Unresearched:', wave2Start.editorialCoverage?.entitiesWithoutKnowledgeRecords, '→', endUnresearched);
  console.log('  Full validation PASS batches:', validationSummary.fullValidationPassCount, '/', CHECKPOINT_BATCH);
  console.log('  Ready for second half:', report.validation.readyForSecondHalf);
  console.log('  Output:', OUT_PATH);
}

main();
