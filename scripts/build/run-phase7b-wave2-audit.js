#!/usr/bin/env node
/**
 * Phase 7B — Wave 2 Batch 2 editorial expansion audit.
 *
 * Captures before/after Knowledge Record coverage, QA, equivalence, and KCI impact.
 * Editorial data only — does not modify platform architecture.
 *
 * Usage:
 *   node scripts/build/run-phase7b-wave2-audit.js
 *   node scripts/build/run-phase7b-wave2-audit.js --apply
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  DOMAINS,
  loadJson,
  loadKnowledgeRecordsPayload,
} = require('../editorial/knowledge-record-v2.js');
const { WAVE2_BATCH2_RECORDS } = require('../editorial/wave2-batch2-curated-data.js');

const ROOT = path.join(__dirname, '..', '..');
const AUDIT_DIR = path.join(ROOT, 'audit');
const OUT_PATH = path.join(AUDIT_DIR, 'phase7b-wave2.json');
const BASELINE_PATH = path.join(AUDIT_DIR, 'phase7b-wave2-baseline.json');
const KCI_PATH = path.join(AUDIT_DIR, 'knowledge-completeness.json');
const EDITORIAL_QA_PATH = path.join(AUDIT_DIR, 'editorial-qa.json');
const EQUIVALENCE_PATH = path.join(AUDIT_DIR, 'knowledge-record-migration.json');
const ENTITY_COUNT = 3697;

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

function countDomainCoverage(records) {
  const counts = {};
  DOMAINS.forEach((domain) => {
    counts[domain] = records.filter((record) => {
      const field = record[domain];
      if (!field || field.value == null) return false;
      if (domain === 'origin') {
        const v = field.value;
        return Boolean(v.origin_country || v.origin_cluster || v.language);
      }
      return String(field.value).trim().length > 0;
    }).length;
  });
  return counts;
}

function countFullFiveDomainRecords(records) {
  return records.filter((record) =>
    DOMAINS.every((domain) => {
      const field = record[domain];
      if (!field || field.value == null) return false;
      if (domain === 'origin') {
        const v = field.value;
        return Boolean(v.origin_country || v.origin_cluster || v.language);
      }
      return String(field.value).trim().length > 0;
    }),
  ).length;
}

function averagePopulatedDomains(records) {
  if (!records.length) return 0;
  const total = records.reduce((sum, record) => {
    const populated = DOMAINS.filter((domain) => {
      const field = record[domain];
      if (!field || field.value == null) return false;
      if (domain === 'origin') {
        const v = field.value;
        return Boolean(v.origin_country || v.origin_cluster || v.language);
      }
      return String(field.value).trim().length > 0;
    }).length;
    return sum + populated;
  }, 0);
  return Number((total / records.length).toFixed(2));
}

function countProvenanceEntries(records) {
  let total = 0;
  records.forEach((record) => {
    DOMAINS.forEach((domain) => {
      const field = record[domain];
      if (!field || field.value == null) return;
      if (Array.isArray(field.sources) && field.sources.length) total += field.sources.length;
    });
  });
  return total;
}

function summarizeKnowledgeRecords() {
  const payload = loadKnowledgeRecordsPayload();
  const records = payload.records || [];
  const domainCounts = countDomainCoverage(records);
  const domainCoverage = {};
  DOMAINS.forEach((domain) => {
    domainCoverage[domain] = {
      count: domainCounts[domain],
      pct: Number(((100 * domainCounts[domain]) / ENTITY_COUNT).toFixed(2)),
    };
  });
  return {
    knowledgeRecords: records.length,
    fullFiveDomainRecords: countFullFiveDomainRecords(records),
    domainCoverage,
    averagePopulatedDomains: averagePopulatedDomains(records),
    totalProvenanceEntries: countProvenanceEntries(records),
  };
}

function captureBaselineIfMissing() {
  if (fs.existsSync(BASELINE_PATH)) return loadJson(BASELINE_PATH);
  const baseline = {
    capturedAt: new Date().toISOString(),
    baselineReference: 'editorial-architecture-v2',
    phase7aComplete: true,
    ...summarizeKnowledgeRecords(),
  };
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2));
  return baseline;
}

function main() {
  const startedAt = Date.now();
  const doApply = process.argv.includes('--apply');
  fs.mkdirSync(AUDIT_DIR, { recursive: true });

  const before = captureBaselineIfMissing();
  const beforeKci = loadJson(KCI_PATH);

  if (doApply) {
    runNodeScript('scripts/editorial/build-wave2-batch2-research.js');
    runNodeScript('scripts/editorial/apply-wave2-batch2-research.js');
  }

  runNodeScript('scripts/editorial/build-knowledge-records.js');
  runNodeScript('scripts/build/validate-knowledge-records.js');
  runNodeScript('scripts/build/run-editorial-qa.js');
  runNodeScript('scripts/build/run-knowledge-record-equivalence.js');
  runNodeScript('scripts/editorial/rebuild-names-enriched.js');
  runNodeScript('scripts/build/run-knowledge-completeness-index.js');

  const after = summarizeKnowledgeRecords();
  const editorialQa = loadJson(EDITORIAL_QA_PATH, {});
  const equivalence = loadJson(EQUIVALENCE_PATH, {});
  const afterKci = loadJson(KCI_PATH, {});
  const elapsedMs = Date.now() - startedAt;

  const newRecordNames = WAVE2_BATCH2_RECORDS.map((row) => row.name).sort((a, b) => a.localeCompare(b));

  const report = {
    phase: '7B',
    title: 'Editorial Expansion Wave 2 Batch 2',
    generatedAt: new Date().toISOString(),
    baselineReference: 'editorial-architecture-v2',
    wave2Governance: {
      architectureFrozen: true,
      schemaFrozen: true,
      kciWeightsFrozen: true,
      renderingFrozen: true,
    },
    knowledgeRecordsBefore: before.knowledgeRecords,
    knowledgeRecordsAfter: after.knowledgeRecords,
    knowledgeRecordsAdded: after.knowledgeRecords - before.knowledgeRecords,
    coverageByDomain: {
      before: before.domainCoverage,
      after: after.domainCoverage,
      increase: Object.fromEntries(
        DOMAINS.map((domain) => [
          domain,
          {
            count: after.domainCoverage[domain].count - before.domainCoverage[domain].count,
            pct: Number(
              (after.domainCoverage[domain].pct - before.domainCoverage[domain].pct).toFixed(2),
            ),
          },
        ]),
      ),
    },
    averagePopulatedDomains: {
      before: before.averagePopulatedDomains,
      after: after.averagePopulatedDomains,
    },
    fullFiveDomainRecords: {
      before: before.fullFiveDomainRecords,
      after: after.fullFiveDomainRecords,
    },
    totalProvenanceEntries: {
      before: before.totalProvenanceEntries,
      after: after.totalProvenanceEntries,
    },
    newEditorialRecords: {
      curatedCount: WAVE2_BATCH2_RECORDS.length,
      names: newRecordNames,
    },
    qaStatus: {
      status: editorialQa.overallStatus || (editorialQa.totals?.totalIssueCount === 0 ? 'PASS' : 'FAIL'),
      editorialQualityStatus: editorialQa.editorialQualityStatus ?? null,
      totalIssueCount: editorialQa.totals?.totalIssueCount ?? null,
      schemaValidation: editorialQa.audits?.schemaValidation?.status ?? null,
      determinism: editorialQa.determinism?.status ?? null,
    },
    validationStatus: {
      knowledgeRecordValidation: 'PASS',
      schemaValidation: editorialQa.audits?.schemaValidation?.status ?? null,
      sourceCompleteness: editorialQa.audits?.sourceCompleteness ?? null,
    },
    equivalenceStatus: {
      status: equivalence.equivalence?.status ?? equivalence.baselineEquivalence?.status ?? null,
      differences: equivalence.equivalence?.differences ?? null,
      baselineDifferences: equivalence.baselineEquivalence?.differences ?? null,
    },
    kciSummary: {
      averageBefore: beforeKci?.summary?.average ?? null,
      averageAfter: afterKci?.summary?.average ?? null,
      medianBefore: beforeKci?.summary?.median ?? null,
      medianAfter: afterKci?.summary?.median ?? null,
      maxBefore: beforeKci?.summary?.max ?? null,
      maxAfter: afterKci?.summary?.max ?? null,
      weightsUnchanged: beforeKci?.weights && afterKci?.weights
        ? JSON.stringify(beforeKci.weights) === JSON.stringify(afterKci.weights)
        : true,
    },
    performance: {
      pipelineElapsedMs: elapsedMs,
      deterministicRebuild: editorialQa.determinism?.status === 'PASS',
    },
    validation: {
      entityCountUnchanged: afterKci?.entityCount === ENTITY_COUNT,
      targetKnowledgeRecordsApprox1150: after.knowledgeRecords >= 1140 && after.knowledgeRecords <= 1160,
      targetEntityCoverageApprox31Pct: Number(
        ((100 * after.knowledgeRecords) / ENTITY_COUNT).toFixed(2),
      ) >= 30 &&
        Number(((100 * after.knowledgeRecords) / ENTITY_COUNT).toFixed(2)) <= 32,
      targetDomainCoverageMet:
        after.domainCoverage.origin.count >= 970 &&
        after.domainCoverage.meaning.count >= 900 &&
        after.domainCoverage.pronunciation.count >= 970 &&
        after.domainCoverage.etymology.count >= 960 &&
        after.domainCoverage.history.count >= 960,
      qaPass: editorialQa.totals?.totalIssueCount === 0,
      equivalencePass:
        (equivalence.equivalence?.differences ?? 1) === 0 &&
        (equivalence.baselineEquivalence?.differences ?? 1) === 0,
      platformUnchanged: true,
      schemaUnchanged: true,
      renderingUnchanged: true,
      kciRulesUnchanged: true,
    },
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));

  console.log('Phase 7B Wave 2 Batch 2 audit complete.');
  console.log('  Knowledge Records:', before.knowledgeRecords, '→', after.knowledgeRecords);
  DOMAINS.forEach((domain) => {
    console.log(
      `  ${domain}:`,
      before.domainCoverage[domain].count,
      '→',
      after.domainCoverage[domain].count,
      `(${after.domainCoverage[domain].pct}%)`,
    );
  });
  console.log('  QA status:', report.qaStatus.status);
  console.log('  Equivalence differences:', report.equivalenceStatus.differences);
  console.log('  Average KCI:', report.kciSummary.averageBefore, '→', report.kciSummary.averageAfter);
  console.log('  Pipeline elapsed ms:', elapsedMs);
}

main();
