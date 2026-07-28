#!/usr/bin/env node
/**
 * Phase 16A — expansion intelligence audit and validation.
 *
 * Generates the expansion intelligence report and validates:
 * - all unresearched entities accounted for
 * - no overlap with existing 1,150 Knowledge Records
 * - deterministic ordering
 * - reproducible priority scores
 * - stable outputs across repeated execution
 *
 * Usage:
 *   node scripts/build/run-phase16a-expansion-audit.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  buildExpansionIntelligenceReport,
  validateExpansionReport,
  hashReportSemantic,
  WAVE1_KR_BASELINE,
  TOTAL_ENTITIES,
} = require('../../lib/analysis/expansion-intelligence.js');
const { POPULARITY_PATHS } = require('../editorial/popularity-records-v1.js');

const ROOT = path.join(__dirname, '..', '..');
const AUDIT_DIR = path.join(ROOT, 'audit');
const DOCS_DIR = path.join(ROOT, 'docs');
const OUT_PATH = path.join(AUDIT_DIR, 'phase16a-expansion-intelligence.json');
const DOC_PATH = path.join(DOCS_DIR, 'PHASE16A_EXPANSION_INTELLIGENCE.md');

function hashFile(absPath) {
  if (!fs.existsSync(absPath)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(absPath, 'utf8')).digest('hex');
}

function buildDocumentation(report) {
  const sim = report.recommendedWaves.waveSizeComparison
    .map(
      (row) =>
        `| ${row.waveSize} | ${row.wavesRequired} | ${row.recommendation.replace(/_/g, ' ')} |`,
    )
    .join('\n');

  const milestones = report.coverageForecasts
    .map(
      (row) =>
        `| ${row.krCount.toLocaleString()} | ${row.label} | ${row.knowledgeRecordCoveragePct}% | ${row.achievable ? 'Yes' : 'Partial'} |`,
    )
    .join('\n');

  const readiness = report.creationReadiness.cohorts
    .map(
      (row) =>
        `| ${row.tier.replace(/_/g, ' ')} | ${row.count} | ${row.pctOfUnresearched}% | ${row.totalEditorialEffortUnits} |`,
    )
    .join('\n');

  return `# Phase 16A — Knowledge Record Expansion Intelligence

Generated: ${report.generatedAt}

## Status

**Phase 16A COMPLETE.** Analysis-only expansion intelligence for Wave 2 Knowledge Record creation.

## Purpose

Phase 16A treats the **${report.summary.unresearchedEntities.toLocaleString()} unresearched entities** as a creation pipeline and answers:

> What is the optimal deterministic strategy for expanding the Knowledge Record corpus while preserving the architectural guarantees proven in Wave 1?

Wave 1 established **${WAVE1_KR_BASELINE.toLocaleString()} / ${WAVE1_KR_BASELINE.toLocaleString()}** fully researched Knowledge Records. Wave 2 expands toward **${TOTAL_ENTITIES.toLocaleString()}** total entities.

## Summary

| Metric | Value |
|--------|-------|
| Wave 1 KR baseline | ${WAVE1_KR_BASELINE.toLocaleString()} |
| Unresearched entities | ${report.summary.unresearchedEntities.toLocaleString()} |
| Expansion target | ${report.summary.expansionTarget.toLocaleString()} new Knowledge Records |
| Final corpus target | ${TOTAL_ENTITIES.toLocaleString()} |
| Recommended wave size | ${report.summary.recommendedWaveSize} |
| Recommended wave count | ${report.summary.recommendedWaveCount} |
| Total editorial effort units | ${report.summary.totalEditorialEffortUnits} |

## Methodology

### Expansion priority scoring

Scores are computed at audit time only and are **not** persisted to Knowledge Records or KCI.

| Factor | Weight |
|--------|--------|
| Unresearched entity | +100 |
| Citation available | +30 |
| Popularity available | +25 |
| Legacy metadata complete | +20 |
| Legacy metadata partial | +10 |
| Variants available | +8 |
| Creation ready tier | +15 |
| Minor enrichment tier | +8 |
| KCI signal | +0–10 |

**Tie-breaker:** slug ascending (deterministic).

### Creation readiness

| Tier | Meaning |
|------|---------|
| **ready** | Citation, popularity, legacy meaning, and legacy origin all available |
| **minor_enrichment** | Partial prerequisite metadata remains |
| **research_required** | Limited prerequisite metadata; full editorial research expected |

| Tier | Count | % of unresearched | Effort units |
|------|-------|-------------------|--------------|
${readiness}

## Wave sizing analysis

| Wave size | Waves required | Recommendation |
|-----------|----------------|----------------|
${sim}

**Primary recommendation:** ${report.recommendedWaves.primary.waveSize}-record waves (${report.recommendedWaves.primary.rationale})

## Expansion milestones

| KR count | Milestone | Corpus coverage | Achievable |
|----------|-----------|-----------------|------------|
${milestones}

## Validation evolution (Wave 1 → Wave 2)

| Check | Wave 1 | Wave 2 |
|-------|--------|--------|
| Knowledge Record count | Fixed at 1,150 | Monotonic increase per batch |
| Equivalence | Zero differences vs baseline | Zero differences vs cumulative baseline |
| Duplicate prevention | N/A | No slug collision with existing or created |
| Entity accounting | 1,150 KR + 2,547 unresearched = 3,697 | KR count + unresearched = 3,697 |

## Governance

Phase 16A is **analysis-only**. It did not:

- create Knowledge Records
- modify datasets
- alter KCI, Citation, or Popularity architecture
- change editorial content

### Frozen invariants (Wave 2)

- KR v2 schema
- KCI engine and weights
- Citation architecture
- Popularity registry
- Wave 1 completion state (1,150 / 1,150 fully researched)

## Success criteria

Phase 16A answers all Wave 2 planning questions deterministically:

1. **Which entities first?** \`creationOrder\` rank 1..N by expansion priority score
2. **Why ranked?** \`expansionPriorityReasons\` per entity
3. **How many waves?** ${report.summary.recommendedWaveCount} at recommended size ${report.summary.recommendedWaveSize}
4. **Wave contents?** Sequential slices of \`creationOrder\`
5. **Validation evolution?** Documented in \`validationTargets\`
6. **Frozen invariants?** Documented in \`governanceChecks\`
7. **Expansion milestones?** Documented in \`coverageForecasts\`

## Wave 2 readiness

${report.wave2Readiness.statement}

## Artifacts

- JSON report: \`audit/phase16a-expansion-intelligence.json\`
- Wave 1 manifest: \`audit/phase15b-wave1-completion-manifest.json\`
- Wave 1 checkpoint: \`audit/phase15b-wave1-checkpoint.json\`
`;
}

function main() {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  fs.mkdirSync(DOCS_DIR, { recursive: true });

  const frozenHashesBefore = {
    kciEngine: hashFile(path.join(ROOT, 'lib/analysis/knowledge-completeness.js')),
    kciActivation: hashFile(path.join(ROOT, 'lib/analysis/kci-activation-v1.js')),
    popularityRegistry: hashFile(POPULARITY_PATHS.registry),
  };

  const reportFirst = buildExpansionIntelligenceReport();
  const reportSecond = buildExpansionIntelligenceReport();
  const hashFirst = hashReportSemantic(reportFirst);
  const hashSecond = hashReportSemantic(reportSecond);
  const validation = validateExpansionReport(reportFirst);

  const frozenHashesAfter = {
    kciEngine: hashFile(path.join(ROOT, 'lib/analysis/knowledge-completeness.js')),
    kciActivation: hashFile(path.join(ROOT, 'lib/analysis/kci-activation-v1.js')),
    popularityRegistry: hashFile(POPULARITY_PATHS.registry),
  };

  const auditReport = {
    ...reportFirst,
    auditValidation: {
      status: validation.status,
      errors: validation.errors,
      checks: {
        unresearchedEntitiesAccountedFor: reportFirst.remainingEntities.count === 2547,
        noOverlapWithExistingKnowledgeRecords:
          reportFirst.remainingEntities.overlapWithExistingKnowledgeRecords === 0,
        entityAccountingBalanced: reportFirst.remainingEntities.entityAccounting.balanced,
        deterministicOrdering: validation.status === 'PASS',
        reproduciblePriorityScores: hashFirst === hashSecond,
        stableOutputsAcrossRuns: hashFirst === hashSecond,
        semanticHash: hashFirst,
        repeatedRunSemanticHash: hashSecond,
      },
      frozenLayerVerification: {
        kciEngineUnchanged: frozenHashesBefore.kciEngine === frozenHashesAfter.kciEngine,
        kciActivationUnchanged: frozenHashesBefore.kciActivation === frozenHashesAfter.kciActivation,
        popularityRegistryUnchanged:
          frozenHashesBefore.popularityRegistry === frozenHashesAfter.popularityRegistry,
      },
    },
  };

  auditReport.auditValidation.status =
    validation.status === 'PASS' &&
    auditReport.auditValidation.checks.reproduciblePriorityScores &&
    auditReport.auditValidation.frozenLayerVerification.kciEngineUnchanged &&
    auditReport.auditValidation.frozenLayerVerification.kciActivationUnchanged &&
    auditReport.auditValidation.frozenLayerVerification.popularityRegistryUnchanged
      ? 'PASS'
      : 'FAIL';

  fs.writeFileSync(OUT_PATH, JSON.stringify(auditReport, null, 2));
  fs.writeFileSync(DOC_PATH, buildDocumentation(auditReport));

  console.log('Phase 16A expansion intelligence audit complete.');
  console.log('  Unresearched entities:', auditReport.summary.unresearchedEntities);
  console.log('  Creation order length:', auditReport.creationOrder.length);
  console.log('  Recommended wave size:', auditReport.summary.recommendedWaveSize);
  console.log('  Recommended waves:', auditReport.summary.recommendedWaveCount);
  console.log('  Readiness — ready:', auditReport.creationReadiness.distribution.ready);
  console.log('  Readiness — minor:', auditReport.creationReadiness.distribution.minor_enrichment);
  console.log('  Readiness — research:', auditReport.creationReadiness.distribution.research_required);
  console.log('  Validation:', auditReport.auditValidation.status);
  console.log('  Semantic hash stable:', hashFirst === hashSecond);
  console.log('  Output:', OUT_PATH);
  console.log('  Documentation:', DOC_PATH);

  if (auditReport.auditValidation.status !== 'PASS') {
    console.error('  Errors:', auditReport.auditValidation.errors);
    process.exit(1);
  }
}

main();
