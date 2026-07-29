#!/usr/bin/env node
/**
 * Phase 16B — Wave 2 governance verification.
 *
 * Verifies prerequisites and freezes governance before Wave 2 implementation.
 *
 * Usage:
 *   node scripts/build/run-phase16b-governance-audit.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { POPULARITY_PATHS } = require('../editorial/popularity-records-v1.js');
const { hashFrozenArtifacts } = require('../../lib/analysis/editorial-coverage-intelligence.js');

const ROOT = path.join(__dirname, '..', '..');
const AUDIT_DIR = path.join(ROOT, 'audit');
const DOCS_DIR = path.join(ROOT, 'docs');
const OUT_PATH = path.join(AUDIT_DIR, 'phase16b-governance-check.json');

const GOVERNANCE_DOCS = [
  'WAVE2_GOVERNANCE.md',
  'WAVE2_BATCH_SPECIFICATION.md',
  'WAVE2_VALIDATION_PROTOCOL.md',
];

const PREREQUISITE_ARTIFACTS = {
  wave1Manifest: path.join(AUDIT_DIR, 'phase15b-wave1-completion-manifest.json'),
  phase16aIntelligence: path.join(AUDIT_DIR, 'phase16a-expansion-intelligence.json'),
};

const BATCH_SIZE = 100;
const WAVE1_KR_BASELINE = 1150;
const TOTAL_ENTITIES = 3697;
const UNRESEARCHED_BASELINE = 2547;
const TOTAL_WAVE2_BATCHES = 26;

function loadJson(absPath, fallback = null) {
  if (!fs.existsSync(absPath)) return fallback;
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

function hashFile(absPath) {
  if (!fs.existsSync(absPath)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(absPath, 'utf8')).digest('hex');
}

function buildBatchPlan(creationOrder) {
  const batches = [];
  for (let batch = 1; batch <= TOTAL_WAVE2_BATCHES; batch += 1) {
    const rankStart = (batch - 1) * BATCH_SIZE + 1;
    const rankEnd = Math.min(batch * BATCH_SIZE, UNRESEARCHED_BASELINE);
    const batchSize = rankEnd - rankStart + 1;
    const krCountAfter = WAVE1_KR_BASELINE + rankEnd;
    const unresearchedAfter = UNRESEARCHED_BASELINE - rankEnd;

    batches.push({
      batch,
      rankStart,
      rankEnd,
      batchSize,
      expectedKrCountAfter: krCountAfter,
      expectedUnresearchedAfter: unresearchedAfter,
      milestone: batch === 1 ? 'Wave 2A entry' : batch === 26 ? 'Full corpus coverage' : null,
    });
  }
  return batches;
}

function buildWave2Batch1(creationOrder) {
  const entities = creationOrder.filter((row) => row.rank >= 1 && row.rank <= 100);
  return {
    batch: 1,
    wave: '2A',
    rankStart: 1,
    rankEnd: 100,
    batchSize: entities.length,
    expectedKrCountAfter: WAVE1_KR_BASELINE + 100,
    expectedUnresearchedAfter: UNRESEARCHED_BASELINE - 100,
    entities: entities.map((row) => ({
      rank: row.rank,
      slug: row.slug,
      name: row.name,
      expansionPriorityScore: row.expansionPriorityScore,
      creationReadiness: row.creationReadiness,
    })),
  };
}

function verifyGovernanceDocs() {
  const results = GOVERNANCE_DOCS.map((filename) => {
    const absPath = path.join(DOCS_DIR, filename);
    const exists = fs.existsSync(absPath);
    return {
      filename,
      path: `docs/${filename}`,
      exists,
      sha256: exists ? hashFile(absPath) : null,
    };
  });

  return {
    allPresent: results.every((row) => row.exists),
    documents: results,
  };
}

function main() {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });

  const wave1Manifest = loadJson(PREREQUISITE_ARTIFACTS.wave1Manifest);
  const phase16a = loadJson(PREREQUISITE_ARTIFACTS.phase16aIntelligence);
  const governanceDocs = verifyGovernanceDocs();
  const frozenHashes = hashFrozenArtifacts();

  const errors = [];

  if (!wave1Manifest) errors.push('Missing phase15b-wave1-completion-manifest.json');
  else if (wave1Manifest.status !== 'CLOSED') errors.push('Wave 1 manifest status is not CLOSED');

  if (!phase16a) errors.push('Missing phase16a-expansion-intelligence.json');
  else if (phase16a.status !== 'COMPLETE') errors.push('Phase 16A status is not COMPLETE');

  if (!governanceDocs.allPresent) errors.push('Missing one or more Wave 2 governance documents');

  const creationOrder = phase16a?.creationOrder || [];
  if (creationOrder.length !== UNRESEARCHED_BASELINE) {
    errors.push(`creationOrder length ${creationOrder.length} !== ${UNRESEARCHED_BASELINE}`);
  }

  const batchPlan = buildBatchPlan(creationOrder);
  const wave2Batch1 = buildWave2Batch1(creationOrder);

  if (wave2Batch1.batchSize !== 100) {
    errors.push(`Wave 2 Batch 1 size ${wave2Batch1.batchSize} !== 100`);
  }

  const finalBatch = batchPlan[batchPlan.length - 1];
  if (finalBatch.batchSize !== 47) {
    errors.push(`Final batch size ${finalBatch.batchSize} !== 47`);
  }

  if (finalBatch.expectedKrCountAfter !== TOTAL_ENTITIES) {
    errors.push(`Final KR count ${finalBatch.expectedKrCountAfter} !== ${TOTAL_ENTITIES}`);
  }

  const batch1First = wave2Batch1.entities[0];
  const orderFirst = creationOrder[0];
  if (batch1First?.slug !== orderFirst?.slug) {
    errors.push('Wave 2 Batch 1 first entity does not match creationOrder rank 1');
  }

  const report = {
    phase: '16B',
    title: 'Wave 2 Governance Verification',
    generatedAt: new Date().toISOString(),
    baselineReference: 'editorial-architecture-v2',
    status: errors.length === 0 ? 'FROZEN' : 'INCOMPLETE',
    scope: 'governance_only',
    prerequisites: {
      wave1Manifest: {
        artifact: 'audit/phase15b-wave1-completion-manifest.json',
        status: wave1Manifest?.status ?? null,
        fullyResearched: wave1Manifest?.finalState?.fullyResearchedEntities ?? null,
        partialRemaining: wave1Manifest?.finalState?.partialKnowledgeRecords ?? null,
        met: wave1Manifest?.status === 'CLOSED',
      },
      phase16aIntelligence: {
        artifact: 'audit/phase16a-expansion-intelligence.json',
        status: phase16a?.status ?? null,
        unresearchedEntities: phase16a?.summary?.unresearchedEntities ?? null,
        recommendedWaveSize: phase16a?.summary?.recommendedWaveSize ?? null,
        met: phase16a?.status === 'COMPLETE',
      },
    },
    governanceDocuments: governanceDocs,
    frozenInvariants: {
      knowledgeRecordSchema: 'unchanged',
      kciEngine: 'unchanged',
      kciWeights: 'unchanged',
      citationArchitecture: 'unchanged',
      popularityRegistry: 'unchanged',
      entityUniverse: TOTAL_ENTITIES,
      wave1KnowledgeRecords: WAVE1_KR_BASELINE,
      frozenArtifactHashes: frozenHashes,
    },
    wave2CreationInvariants: {
      operation: 'create_knowledge_record',
      monotonicKrGrowth: true,
      entityAccounting: 'knowledgeRecords + unresearched = 3697',
      noOverlapWithWave1: true,
      fullSixDomainAtCreation: true,
      deterministicSelection: 'phase16a_creation_order',
      slugPolicy: 'normalizeKey(name)',
      duplicatePrevention: 'slug_key_uniqueness_required',
      cumulativeEquivalence: true,
    },
    batchParameters: {
      batchSize: BATCH_SIZE,
      finalBatchSize: 47,
      totalBatches: TOTAL_WAVE2_BATCHES,
      startingKrCount: WAVE1_KR_BASELINE,
      finalKrCount: TOTAL_ENTITIES,
      selectionSource: 'audit/phase16a-expansion-intelligence.json',
    },
    batchPlan,
    wave2Batch1,
    validationProtocol: {
      document: 'docs/WAVE2_VALIDATION_PROTOCOL.md',
      perBatchChecks: [
        'qa_pass',
        'equivalence_pass',
        'editorial_integrity_pass',
        'frozen_layers_unchanged',
        'monotonic_kr_growth',
        'entity_accounting_balanced',
        'duplicate_prevention',
        'no_wave1_mutation',
        'full_six_domain_creation',
      ],
      wave1ToWave2Evolution: phase16a?.validationTargets?.validationEvolution ?? null,
    },
    successCriteria: {
      perBatch: [
        'Exact batch size of new fully researched Knowledge Records created',
        'KR count increased by batch size; unresearched decreased by batch size',
        'All validation checks PASS',
        'No Wave 1 editorial content modified',
        'Batch audit artifact written',
      ],
      wave2Complete: {
        knowledgeRecords: TOTAL_ENTITIES,
        fullyResearched: TOTAL_ENTITIES,
        unresearched: 0,
        partial: 0,
        batches: TOTAL_WAVE2_BATCHES,
      },
    },
    handoff: {
      nextPhase: 'Phase 15B Wave 2 Batch 1',
      nextAction: 'create_knowledge_record for ranks 1–100',
      expectedKrCountAfterBatch1: 1250,
      implementationBlockedUntilFrozen: true,
      readyForImplementation: errors.length === 0,
    },
    verification: {
      status: errors.length === 0 ? 'PASS' : 'FAIL',
      errors,
      checks: {
        wave1Closed: wave1Manifest?.status === 'CLOSED',
        phase16aComplete: phase16a?.status === 'COMPLETE',
        governanceDocsPresent: governanceDocs.allPresent,
        creationOrderComplete: creationOrder.length === UNRESEARCHED_BASELINE,
        batch1Defined: wave2Batch1.batchSize === 100,
        batchPlanValid: finalBatch.expectedKrCountAfter === TOTAL_ENTITIES,
        entityAccountingAtBaseline:
          WAVE1_KR_BASELINE + UNRESEARCHED_BASELINE === TOTAL_ENTITIES,
      },
    },
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));

  console.log('Phase 16B Wave 2 governance audit complete.');
  console.log('  Status:', report.status);
  console.log('  Wave 1 manifest:', report.prerequisites.wave1Manifest.status);
  console.log('  Phase 16A:', report.prerequisites.phase16aIntelligence.status);
  console.log('  Governance docs:', governanceDocs.documents.filter((d) => d.exists).length, '/', GOVERNANCE_DOCS.length);
  console.log('  Batch 1 entities:', wave2Batch1.batchSize);
  console.log('  Batch 1 first entity:', batch1First?.name);
  console.log('  Total batches planned:', TOTAL_WAVE2_BATCHES);
  console.log('  Ready for implementation:', report.handoff.readyForImplementation);
  console.log('  Output:', OUT_PATH);

  if (errors.length) {
    console.error('  Errors:', errors);
    process.exit(1);
  }
}

main();
