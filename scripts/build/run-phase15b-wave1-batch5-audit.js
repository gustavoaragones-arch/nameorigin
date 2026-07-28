#!/usr/bin/env node
/**
 * Phase 15B Wave 1 Batch 5 — editorial completion audit.
 *
 * Usage:
 *   node scripts/build/run-phase15b-wave1-batch5-audit.js
 *   node scripts/build/run-phase15b-wave1-batch5-audit.js --apply
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const {
  DOMAINS,
  loadKnowledgeRecordsPayload,
} = require('../editorial/knowledge-record-v2.js');
const {
  PHASE15B_WAVE1_BATCH5_RECORDS,
  BATCH5_SELECTION,
} = require('../editorial/phase15b-wave1-batch5-curated-data.js');
const { POPULARITY_PATHS } = require('../editorial/popularity-records-v1.js');

const ROOT = path.join(__dirname, '..', '..');
const AUDIT_DIR = path.join(ROOT, 'audit');
const OUT_PATH = path.join(AUDIT_DIR, 'phase15b-wave1-batch5.json');
const BASELINE_PATH = path.join(AUDIT_DIR, 'phase15b-wave1-batch5-baseline.json');
const EDITORIAL_COVERAGE_PATH = path.join(AUDIT_DIR, 'editorial-coverage.json');
const KCI_PATH = path.join(AUDIT_DIR, 'knowledge-completeness.json');
const EDITORIAL_QA_PATH = path.join(AUDIT_DIR, 'editorial-qa.json');
const EQUIVALENCE_PATH = path.join(AUDIT_DIR, 'knowledge-record-migration.json');
const ENTITY_COUNT = 3697;
const WAVE1_CUMULATIVE_TARGET = 925;

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

function loadJson(absPath, fallback = null) {
  if (!fs.existsSync(absPath)) return fallback;
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

function hashFile(absPath) {
  if (!fs.existsSync(absPath)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(absPath, 'utf8')).digest('hex');
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
  };
}

function captureBaselineIfMissing() {
  if (fs.existsSync(BASELINE_PATH)) return loadJson(BASELINE_PATH);
  const editorial = loadJson(EDITORIAL_COVERAGE_PATH, {});
  const baseline = {
    capturedAt: new Date().toISOString(),
    baselineReference: 'editorial-architecture-v2',
    editorialCoverage: editorial.overall || null,
    ...summarizeKnowledgeRecords(),
  };
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2));
  return baseline;
}

function main() {
  const doApply = process.argv.includes('--apply');
  fs.mkdirSync(AUDIT_DIR, { recursive: true });

  const frozenHashesBefore = {
    kciEngine: hashFile(path.join(ROOT, 'lib/analysis/knowledge-completeness.js')),
    kciActivation: hashFile(path.join(ROOT, 'lib/analysis/kci-activation-v1.js')),
    popularityRegistry: hashFile(POPULARITY_PATHS.registry),
  };

  const before = captureBaselineIfMissing();
  const beforeKci = loadJson(KCI_PATH, {});
  const beforeEditorial = loadJson(EDITORIAL_COVERAGE_PATH, {});

  if (doApply) {
    runNodeScript('scripts/editorial/build-phase15b-wave1-batch5-research.js');
    runNodeScript('scripts/editorial/apply-phase15b-wave1-batch5-research.js');
  }

  runNodeScript('scripts/build/validate-knowledge-records.js');
  runNodeScript('scripts/build/run-editorial-qa.js');
  runNodeScript('scripts/build/validate-citation-records.js');
  runNodeScript('scripts/build/run-knowledge-record-equivalence.js');
  runNodeScript('scripts/build/run-knowledge-completeness-index.js');
  runNodeScript('scripts/audit/editorial-coverage.js');
  runNodeScript('scripts/audit/editorial-gap-analysis.js');
  runNodeScript('scripts/build/validate-editorial-coverage.js');

  const after = summarizeKnowledgeRecords();
  const afterEditorial = loadJson(EDITORIAL_COVERAGE_PATH, {});
  const editorialQa = loadJson(EDITORIAL_QA_PATH, {});
  const equivalence = loadJson(EQUIVALENCE_PATH, {});
  const afterKci = loadJson(KCI_PATH, {});

  const frozenHashesAfter = {
    kciEngine: hashFile(path.join(ROOT, 'lib/analysis/knowledge-completeness.js')),
    kciActivation: hashFile(path.join(ROOT, 'lib/analysis/kci-activation-v1.js')),
    popularityRegistry: hashFile(POPULARITY_PATHS.registry),
  };

  const batchNames = PHASE15B_WAVE1_BATCH5_RECORDS.map((row) => row.name).sort((a, b) =>
    a.localeCompare(b),
  );

  const report = {
    phase: '15B',
    wave: 1,
    batch: 5,
    title: 'Knowledge Record Expansion Wave 1 Batch 5 — Domain Completion',
    generatedAt: new Date().toISOString(),
    baselineReference: 'editorial-architecture-v2',
    batchSelection: BATCH5_SELECTION,
    wave1Progress: {
      cumulativeFullyResearchedTarget: WAVE1_CUMULATIVE_TARGET,
      cumulativeFullyResearchedActual: afterEditorial.overall?.fullyResearchedEntities,
      batchesComplete: 5,
      partialRemaining: afterEditorial.overall?.partialKnowledgeRecords,
      wave1PercentComplete: Number(
        (((afterEditorial.overall?.fullyResearchedEntities ?? 800) - 800) / 350).toFixed(4),
      ),
    },
    governance: {
      schemaFrozen: true,
      kciWeightsFrozen: true,
      citationRegistryFrozen: true,
      popularityRegistryFrozen: true,
      editorialOnly: true,
      completionOnly: true,
    },
    knowledgeRecordsBefore: before.knowledgeRecords,
    knowledgeRecordsAfter: after.knowledgeRecords,
    fullFiveDomainRecords: {
      before: before.fullFiveDomainRecords,
      after: after.fullFiveDomainRecords,
      increase: after.fullFiveDomainRecords - before.fullFiveDomainRecords,
    },
    editorialCoverage: {
      before: {
        fullyResearchedEntities:
          beforeEditorial.overall?.fullyResearchedEntities ??
          before.editorialCoverage?.fullyResearchedEntities,
        partialKnowledgeRecords:
          beforeEditorial.overall?.partialKnowledgeRecords ??
          before.editorialCoverage?.partialKnowledgeRecords,
        partialMissingDomainCounts: beforeEditorial.partialKnowledgeRecords?.missingDomainCounts ?? null,
      },
      after: {
        fullyResearchedEntities: afterEditorial.overall?.fullyResearchedEntities,
        partialKnowledgeRecords: afterEditorial.overall?.partialKnowledgeRecords,
        partialMissingDomainCounts: afterEditorial.partialKnowledgeRecords?.missingDomainCounts,
      },
    },
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
    batchCompletion: {
      curatedCount: PHASE15B_WAVE1_BATCH5_RECORDS.length,
      names: batchNames,
      targetDomains: ['origin', 'meaning', 'pronunciation', 'etymology', 'history'],
    },
    qaStatus: {
      status: editorialQa.status || (editorialQa.totals?.totalIssueCount === 0 ? 'PASS' : 'FAIL'),
      clean: editorialQa.clean ?? editorialQa.totals?.totalIssueCount === 0,
      totalIssueCount: editorialQa.totals?.totalIssueCount ?? null,
    },
    equivalenceStatus: {
      status: equivalence.equivalence?.status ?? equivalence.baselineEquivalence?.status ?? null,
      differences: equivalence.equivalence?.differences ?? null,
    },
    kciImpact: {
      averageBefore: beforeKci?.summary?.average ?? null,
      averageAfter: afterKci?.summary?.average ?? null,
    },
    frozenLayerVerification: {
      kciEngineUnchanged: frozenHashesBefore.kciEngine === frozenHashesAfter.kciEngine,
      kciActivationUnchanged: frozenHashesBefore.kciActivation === frozenHashesAfter.kciActivation,
      popularityRegistryUnchanged:
        frozenHashesBefore.popularityRegistry === frozenHashesAfter.popularityRegistry,
    },
    validation: {
      entityCountUnchanged: afterKci?.entityCount === ENTITY_COUNT,
      knowledgeRecordsUnchanged: after.knowledgeRecords === before.knowledgeRecords,
      qaPass: editorialQa.totals?.totalIssueCount === 0,
      equivalencePass:
        (equivalence.equivalence?.differences ?? 1) === 0 &&
        (equivalence.baselineEquivalence?.differences ?? 1) === 0,
      editorialIntegrityPass: afterEditorial.integrity?.status === 'PASS',
      targetBatchCompletion: after.fullFiveDomainRecords - before.fullFiveDomainRecords >= 20,
      wave1CumulativeTargetMet:
        afterEditorial.overall?.fullyResearchedEntities >= WAVE1_CUMULATIVE_TARGET,
    },
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));

  console.log('Phase 15B Wave 1 Batch 5 audit complete.');
  console.log('  Full 5-domain records:', before.fullFiveDomainRecords, '→', after.fullFiveDomainRecords);
  console.log(
    '  Fully researched (6/6):',
    report.editorialCoverage.before.fullyResearchedEntities,
    '→',
    report.editorialCoverage.after.fullyResearchedEntities,
  );
  console.log(
    '  Partial records:',
    report.editorialCoverage.before.partialKnowledgeRecords,
    '→',
    report.editorialCoverage.after.partialKnowledgeRecords,
  );
  console.log('  Wave 1 cumulative target:', WAVE1_CUMULATIVE_TARGET);
  DOMAINS.forEach((domain) => {
    console.log(
      `  ${domain}:`,
      before.domainCoverage[domain].count,
      '→',
      after.domainCoverage[domain].count,
    );
  });
  console.log('  QA:', report.qaStatus.status);
  console.log('  Output:', OUT_PATH);
}

main();
