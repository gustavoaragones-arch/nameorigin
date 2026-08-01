#!/usr/bin/env node
/**
 * Phase 15B Wave 2A Batch 19 — Knowledge Record creation audit.
 *
 * Usage:
 *   node scripts/build/run-phase15b-wave2-batch19-audit.js
 *   node scripts/build/run-phase15b-wave2-batch19-audit.js --apply
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const {
  DOMAINS,
  loadKnowledgeRecordsPayload,
  normalizeKey,
} = require('../editorial/knowledge-record-v2.js');
const {
  PHASE15B_WAVE2_BATCH19_RECORDS,
  BATCH19_SELECTION,
} = require('../editorial/phase15b-wave2-batch19-curated-data.js');
const { POPULARITY_PATHS } = require('../editorial/popularity-records-v1.js');

const ROOT = path.join(__dirname, '..', '..');
const AUDIT_DIR = path.join(ROOT, 'audit');
const OUT_PATH = path.join(AUDIT_DIR, 'phase15b-wave2-batch19.json');
const BASELINE_PATH = path.join(AUDIT_DIR, 'phase15b-wave2-batch19-baseline.json');
const PREVIOUS_BASELINE_PATH = path.join(AUDIT_DIR, 'phase15b-wave2-batch18-baseline.json');
const EDITORIAL_COVERAGE_PATH = path.join(AUDIT_DIR, 'editorial-coverage.json');
const KCI_PATH = path.join(AUDIT_DIR, 'knowledge-completeness.json');
const EDITORIAL_QA_PATH = path.join(AUDIT_DIR, 'editorial-qa.json');
const EQUIVALENCE_PATH = path.join(AUDIT_DIR, 'knowledge-record-migration.json');
const GOVERNANCE_PATH = path.join(AUDIT_DIR, 'phase16b-governance-check.json');

const ENTITY_COUNT = 3697;
const WAVE2_BATCH18_KR_BASELINE = 2950;
const BATCH_SIZE = 100;
const TARGET_KR_COUNT = 3050;
const TARGET_UNRESEARCHED = 647;
const ALL_DOMAINS_LABEL = ['origin', 'meaning', 'pronunciation', 'etymology', 'history', 'variants'];

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
    recordKeys: new Set(records.map((row) => normalizeKey(row.name))),
  };
}

function captureBaselineIfMissing() {
  if (fs.existsSync(BASELINE_PATH)) return loadJson(BASELINE_PATH);
  const editorial = loadJson(EDITORIAL_COVERAGE_PATH, {});
  const previousBaseline = loadJson(PREVIOUS_BASELINE_PATH, {});
  const summary = summarizeKnowledgeRecords();
  const baseline = {
    capturedAt: new Date().toISOString(),
    baselineReference: 'editorial-architecture-v2',
    wave2Batch18EndState: true,
    previousBaselineReference: 'audit/phase15b-wave2-batch18-baseline.json',
    editorialCoverage: editorial.overall || previousBaseline.editorialCoverage || null,
    knowledgeRecords: summary.knowledgeRecords,
    fullFiveDomainRecords: summary.fullFiveDomainRecords,
    domainCoverage: summary.domainCoverage,
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

  const beforeSummary = captureBaselineIfMissing();
  const beforeKci = loadJson(KCI_PATH, {});
  const beforeEditorial = loadJson(EDITORIAL_COVERAGE_PATH, {});
  const governance = loadJson(GOVERNANCE_PATH, {});
  const preApplyKeys = summarizeKnowledgeRecords().recordKeys;

  const batchKeys = new Set(PHASE15B_WAVE2_BATCH19_RECORDS.map((row) => normalizeKey(row.name)));
  const overlapBefore = [...batchKeys].filter((key) => preApplyKeys.has(key));

  if (doApply) {
    runNodeScript('scripts/editorial/build-phase15b-wave2-batch19-research.js');
    runNodeScript('scripts/editorial/apply-phase15b-wave2-batch19-research.js');
  }

  runNodeScript('scripts/build/validate-knowledge-records.js');
  runNodeScript('scripts/build/run-editorial-qa.js');
  runNodeScript('scripts/build/validate-citation-records.js');
  runNodeScript('scripts/build/run-knowledge-record-equivalence.js');
  runNodeScript('scripts/build/run-knowledge-completeness-index.js');
  runNodeScript('scripts/audit/editorial-coverage.js');
  runNodeScript('scripts/audit/editorial-gap-analysis.js');
  runNodeScript('scripts/build/validate-editorial-coverage.js');

  const afterSummary = summarizeKnowledgeRecords();
  const afterEditorial = loadJson(EDITORIAL_COVERAGE_PATH, {});
  const editorialQa = loadJson(EDITORIAL_QA_PATH, {});
  const equivalence = loadJson(EQUIVALENCE_PATH, {});
  const afterKci = loadJson(KCI_PATH, {});

  const frozenHashesAfter = {
    kciEngine: hashFile(path.join(ROOT, 'lib/analysis/knowledge-completeness.js')),
    kciActivation: hashFile(path.join(ROOT, 'lib/analysis/kci-activation-v1.js')),
    popularityRegistry: hashFile(POPULARITY_PATHS.registry),
  };

  const batchNames = PHASE15B_WAVE2_BATCH19_RECORDS.map((row) => row.name).sort((a, b) =>
    a.localeCompare(b),
  );

  const krIncrease = afterSummary.knowledgeRecords - beforeSummary.knowledgeRecords;
  const fullyResearchedBefore =
    beforeEditorial.overall?.fullyResearchedEntities ?? beforeSummary.fullFiveDomainRecords;
  const fullyResearchedAfter = afterEditorial.overall?.fullyResearchedEntities;
  const unresearchedAfter = afterEditorial.overall?.entitiesWithoutKnowledgeRecords;

  const report = {
    phase: '15B',
    wave: 2,
    subwave: '2A',
    batch: 19,
    title: 'Knowledge Record Expansion Wave 2A Batch 19 — Record Creation',
    generatedAt: new Date().toISOString(),
    baselineReference: 'editorial-architecture-v2',
    governanceReference: 'audit/phase16b-governance-check.json',
    cumulativeBaselineReference: 'audit/phase15b-wave2-batch18-baseline.json',
    batchSelection: BATCH19_SELECTION,
    wave2Progress: {
      cumulativeKrTarget: TARGET_KR_COUNT,
      cumulativeKrActual: afterSummary.knowledgeRecords,
      batchesComplete: doApply ? 19 : 18,
      unresearchedRemaining: unresearchedAfter,
    },
    governance: {
      schemaFrozen: true,
      kciWeightsFrozen: true,
      citationRegistryFrozen: true,
      popularityRegistryFrozen: true,
      creationOnly: true,
      wave1RecordsImmutable: true,
      priorWave2BatchesImmutable: true,
    },
    knowledgeRecordsBefore: beforeSummary.knowledgeRecords,
    knowledgeRecordsAfter: afterSummary.knowledgeRecords,
    knowledgeRecordsAdded: krIncrease,
    fullFiveDomainRecords: {
      before: beforeSummary.fullFiveDomainRecords,
      after: afterSummary.fullFiveDomainRecords,
      increase: afterSummary.fullFiveDomainRecords - beforeSummary.fullFiveDomainRecords,
    },
    editorialCoverage: {
      before: {
        fullyResearchedEntities: fullyResearchedBefore,
        partialKnowledgeRecords: beforeEditorial.overall?.partialKnowledgeRecords ?? 0,
        entitiesWithoutKnowledgeRecords:
          beforeEditorial.overall?.entitiesWithoutKnowledgeRecords ?? null,
      },
      after: {
        fullyResearchedEntities: fullyResearchedAfter,
        partialKnowledgeRecords: afterEditorial.overall?.partialKnowledgeRecords ?? 0,
        entitiesWithoutKnowledgeRecords: unresearchedAfter,
      },
    },
    entityAccounting: {
      totalEntities: ENTITY_COUNT,
      knowledgeRecordsPlusUnresearched:
        afterSummary.knowledgeRecords + (unresearchedAfter ?? 0),
      balanced: afterSummary.knowledgeRecords + (unresearchedAfter ?? 0) === ENTITY_COUNT,
    },
    duplicateCheck: {
      overlapWithPreBatchKnowledgeRecords: overlapBefore.length,
      batchKeysChecked: batchKeys.size,
      pass: overlapBefore.length === 0,
    },
    coverageByDomain: {
      before: beforeSummary.domainCoverage,
      after: afterSummary.domainCoverage,
      increase: Object.fromEntries(
        DOMAINS.map((domain) => [
          domain,
          {
            count:
              afterSummary.domainCoverage[domain].count -
              beforeSummary.domainCoverage[domain].count,
            pct: Number(
              (
                afterSummary.domainCoverage[domain].pct -
                beforeSummary.domainCoverage[domain].pct
              ).toFixed(2),
            ),
          },
        ]),
      ),
    },
    batchCreation: {
      curatedCount: PHASE15B_WAVE2_BATCH19_RECORDS.length,
      names: batchNames,
      operation: 'create_knowledge_record',
      domainsAssigned: ALL_DOMAINS_LABEL,
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
      monotonicKrGrowth: krIncrease === BATCH_SIZE,
      targetKrCount: afterSummary.knowledgeRecords === TARGET_KR_COUNT,
      targetUnresearched: unresearchedAfter === TARGET_UNRESEARCHED,
      noPartialRecords: (afterEditorial.overall?.partialKnowledgeRecords ?? 1) === 0,
      qaPass: editorialQa.totals?.totalIssueCount === 0,
      equivalencePass:
        (equivalence.equivalence?.differences ?? 1) === 0 &&
        (equivalence.baselineEquivalence?.differences ?? 1) === 0,
      editorialIntegrityPass: afterEditorial.integrity?.status === 'PASS',
      duplicatePreventionPass: overlapBefore.length === 0,
      entityAccountingPass:
        afterSummary.knowledgeRecords + (unresearchedAfter ?? 0) === ENTITY_COUNT,
      frozenLayersPass:
        frozenHashesBefore.kciEngine === frozenHashesAfter.kciEngine &&
        frozenHashesBefore.kciActivation === frozenHashesAfter.kciActivation &&
        frozenHashesBefore.popularityRegistry === frozenHashesAfter.popularityRegistry,
      governanceMet: governance?.status === 'FROZEN',
      cumulativeBaselinePreserved:
        beforeSummary.knowledgeRecords === WAVE2_BATCH18_KR_BASELINE || !doApply,
    },
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));

  console.log('Phase 15B Wave 2A Batch 19 audit complete.');
  console.log('  Knowledge Records:', beforeSummary.knowledgeRecords, '→', afterSummary.knowledgeRecords);
  console.log(
    '  Fully researched (6/6):',
    report.editorialCoverage.before.fullyResearchedEntities,
    '→',
    report.editorialCoverage.after.fullyResearchedEntities,
  );
  console.log(
    '  Unresearched:',
    report.editorialCoverage.before.entitiesWithoutKnowledgeRecords,
    '→',
    report.editorialCoverage.after.entitiesWithoutKnowledgeRecords,
  );
  console.log('  Target KR count:', TARGET_KR_COUNT);
  console.log('  QA:', report.qaStatus.status);
  console.log('  Output:', OUT_PATH);
}

main();
