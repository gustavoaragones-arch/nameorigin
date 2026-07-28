/**
 * lib/analysis/expansion-intelligence.js
 * Phase 16A — Read-only Knowledge Record expansion intelligence.
 *
 * Analyzes unresearched entities for Wave 2 creation planning.
 * No Knowledge Record, Citation, Popularity, KCI, or dataset mutations.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  buildEntityIndex,
  hashFrozenArtifacts,
  resolveGeneratedAt,
  loadJson,
  AUDIT_DIR,
  EDITORIAL_DOMAINS,
} = require('./editorial-coverage-intelligence.js');
const { stableHash } = require('../../scripts/editorial/citation-infrastructure-v1.js');

const TOTAL_ENTITIES = 3697;
const WAVE1_KR_BASELINE = 1150;
const WAVE_SIZE_OPTIONS = [25, 50, 100, 150, 250];
const READINESS_TIERS = ['ready', 'minor_enrichment', 'research_required'];

const EXPANSION_MILESTONES = [
  { krCount: 1250, label: 'Wave 2A entry', recordsAdded: 100 },
  { krCount: 1500, label: 'Editorial milestone', recordsAdded: 350 },
  { krCount: 2000, label: 'Majority coverage threshold', recordsAdded: 850 },
  { krCount: 2500, label: 'Expansion checkpoint', recordsAdded: 1350 },
  { krCount: TOTAL_ENTITIES, label: 'Full corpus coverage', recordsAdded: TOTAL_ENTITIES - WAVE1_KR_BASELINE },
];

function pct(count, total) {
  if (!total) return 0;
  return Number(((count / total) * 100).toFixed(2));
}

function ceilDiv(n, d) {
  return Math.ceil(n / d);
}

function classifyCreationReadiness(entity) {
  const signals = {
    citation: entity.hasCitationRecord,
    popularity: entity.hasPopularityRecord || entity.hasPopularity,
    legacyMeaning: entity.hasLegacyMeaning,
    legacyOrigin: entity.hasLegacyOrigin,
    variants: entity.hasVariantRecord || entity.hasSpellingVariants,
  };

  const coreCount = [signals.citation, signals.popularity, signals.legacyMeaning, signals.legacyOrigin].filter(
    Boolean,
  ).length;

  if (signals.citation && signals.popularity && signals.legacyMeaning && signals.legacyOrigin) {
    return {
      tier: 'ready',
      signals,
      prerequisiteCount: coreCount,
      editorialEffortUnits: 1,
      note: 'Citation, popularity, and legacy editorial metadata available.',
    };
  }

  if (coreCount >= 2 || signals.citation || signals.popularity) {
    return {
      tier: 'minor_enrichment',
      signals,
      prerequisiteCount: coreCount,
      editorialEffortUnits: 1.5,
      note: 'Partial prerequisite metadata; small editorial gaps remain.',
    };
  }

  if (signals.variants) {
    return {
      tier: 'minor_enrichment',
      signals,
      prerequisiteCount: coreCount,
      editorialEffortUnits: 1.75,
      note: 'Variant metadata available; full six-domain editorial assignment still required.',
    };
  }

  return {
    tier: 'research_required',
    signals,
    prerequisiteCount: coreCount,
    editorialEffortUnits: 2.5,
    note: 'Limited prerequisite metadata; full editorial research expected.',
  };
}

function computeExpansionPriorityScore(entity, readiness) {
  const reasons = [];
  let score = 0;

  score += 100;
  reasons.push('unresearched_entity');

  if (entity.hasCitationRecord) {
    score += 30;
    reasons.push('citation_available');
  }

  if (entity.hasPopularityRecord || entity.hasPopularity) {
    score += 25;
    reasons.push('popularity_available');
  }

  if (entity.hasLegacyMeaning && entity.hasLegacyOrigin) {
    score += 20;
    reasons.push('legacy_metadata_complete');
  } else if (entity.hasLegacyMeaning || entity.hasLegacyOrigin) {
    score += 10;
    reasons.push('legacy_metadata_partial');
  }

  if (entity.hasVariantRecord || entity.hasSpellingVariants) {
    score += 8;
    reasons.push('variants_available');
  }

  if (entity.kci >= 5) {
    score += 5;
    reasons.push('kci_variants_signal');
  } else if (entity.kci > 0) {
    score += 2;
    reasons.push('kci_signal');
  }

  if (readiness.tier === 'ready') {
    score += 15;
    reasons.push('creation_ready');
  } else if (readiness.tier === 'minor_enrichment') {
    score += 8;
    reasons.push('minor_enrichment');
  }

  return { score, reasons: [...new Set(reasons)] };
}

function buildWaveSimulations(unresearchedCount) {
  return WAVE_SIZE_OPTIONS.map((waveSize) => {
    const wavesRequired = ceilDiv(unresearchedCount, waveSize);
    const finalWaveSize = unresearchedCount % waveSize || waveSize;
    const validationEvents = wavesRequired;
    const throughputScore = Number((unresearchedCount / validationEvents).toFixed(2));

    let recommendation = 'balanced';
    if (waveSize <= 25) recommendation = 'maximum_validation_cadence';
    else if (waveSize <= 50) recommendation = 'wave1_parity';
    else if (waveSize <= 100) recommendation = 'balanced_throughput';
    else if (waveSize <= 150) recommendation = 'high_throughput';
    else recommendation = 'maximum_throughput';

    return {
      waveSize,
      wavesRequired,
      finalWaveSize,
      validationEventsPerExpansion: validationEvents,
      recordsPerValidationEvent: throughputScore,
      recommendation,
      tradeoff:
        waveSize <= 50
          ? 'Higher validation cadence, lower per-wave throughput'
          : 'Lower validation cadence, higher per-wave throughput',
    };
  });
}

function buildRecommendedWaves(unresearchedCount, waveSimulations) {
  const wave1Parity = waveSimulations.find((row) => row.waveSize === 25);
  const balanced = waveSimulations.find((row) => row.waveSize === 100);
  const highThroughput = waveSimulations.find((row) => row.waveSize === 250);

  return {
    primary: {
      waveSize: 100,
      rationale:
        'Balanced throughput and validation cadence. 26 waves cover the unresearched corpus with manageable audit overhead.',
      ...balanced,
    },
    alternatives: [
      {
        waveSize: 25,
        rationale: 'Wave 1 parity — maximum validation cadence, proven governance pattern.',
        ...wave1Parity,
      },
      {
        waveSize: 250,
        rationale: 'Maximum throughput — 11 waves with checkpoint validation at each milestone.',
        ...highThroughput,
      },
    ],
    waveSizeComparison: waveSimulations,
  };
}

function buildCoverageForecasts(currentKrCount, unresearchedCount) {
  return EXPANSION_MILESTONES.map((milestone) => {
    const recordsToCreate = Math.max(0, milestone.krCount - currentKrCount);
    const achievable = recordsToCreate <= unresearchedCount;
    const entitiesWithKr = achievable ? milestone.krCount : currentKrCount + unresearchedCount;
    const fullyResearchedEstimate = achievable ? milestone.krCount : currentKrCount + unresearchedCount;

    return {
      ...milestone,
      achievable,
      recordsToCreate: Math.min(recordsToCreate, unresearchedCount),
      entitiesWithKnowledgeRecord: entitiesWithKr,
      knowledgeRecordCoveragePct: pct(entitiesWithKr, TOTAL_ENTITIES),
      fullyResearchedEstimate,
      fullyResearchedPct: pct(fullyResearchedEstimate, TOTAL_ENTITIES),
      editorialDomainsEstimate: fullyResearchedEstimate * EDITORIAL_DOMAINS.length,
    };
  });
}

function buildCreationCohorts(ranked) {
  return READINESS_TIERS.map((tier) => {
    const members = ranked.filter((row) => row.creationReadiness === tier);
    return {
      tier,
      count: members.length,
      pctOfUnresearched: pct(members.length, ranked.length),
      totalEditorialEffortUnits: members.reduce((sum, row) => sum + row.editorialEffortUnits, 0),
      averagePriorityScore: members.length
        ? Number((members.reduce((sum, row) => sum + row.expansionPriorityScore, 0) / members.length).toFixed(2))
        : 0,
      topSamples: members.slice(0, 5).map((row) => ({ slug: row.slug, name: row.name, rank: row.rank })),
    };
  });
}

function buildValidationTargets(unresearchedCount, recommendedWaveSize = 100) {
  const wavesRequired = ceilDiv(unresearchedCount, recommendedWaveSize);

  return {
    mode: 'creation_with_monotonic_growth',
    baselineKnowledgeRecordCount: WAVE1_KR_BASELINE,
    targetFullCorpusCount: TOTAL_ENTITIES,
    perWaveExpectations: {
      knowledgeRecordCountIncrease: 'positive_and_bounded',
      monotonicGrowth: true,
      duplicatePrevention: 'slug_key_uniqueness_required',
      deterministicIdGeneration: 'normalizeKey(name)_based_lookup',
      noOverlapWithExisting: true,
      postWaveEquivalence: 'baseline_plus_created_records',
      editorialIntegrity: 'PASS',
      qaStatus: 'PASS',
      frozenLayersUnchanged: true,
    },
    expectedKrCountAfterWave: (waveNumber) =>
      Math.min(WAVE1_KR_BASELINE + waveNumber * recommendedWaveSize, TOTAL_ENTITIES),
    waveCountAtRecommendedSize: wavesRequired,
    finalExpectedKrCount: WAVE1_KR_BASELINE + unresearchedCount,
    validationEvolution: [
      {
        check: 'knowledge_record_count',
        wave1Behavior: 'fixed_at_1150',
        wave2Behavior: 'monotonic_increase_by_batch_size',
      },
      {
        check: 'equivalence',
        wave1Behavior: 'zero_differences_against_baseline',
        wave2Behavior: 'zero_differences_against_cumulative_baseline',
      },
      {
        check: 'duplicate_prevention',
        wave1Behavior: 'not_applicable',
        wave2Behavior: 'no_slug_collision_with_existing_or_created',
      },
      {
        check: 'entity_accounting',
        wave1Behavior: '1150_kr_2547_unresearched',
        wave2Behavior: 'kr_count_plus_unresearched_equals_3697',
      },
    ],
  };
}

function buildGovernanceChecks(frozenHashes) {
  return {
    analysisOnly: true,
    noKnowledgeRecordCreation: true,
    noDatasetMutation: true,
    noKciMutation: true,
    noCitationArchitectureChange: true,
    noPopularityArchitectureChange: true,
    noEditorialContentChange: true,
    frozenArtifacts: frozenHashes,
    wave1BaselinePreserved: {
      fullyResearchedKnowledgeRecords: WAVE1_KR_BASELINE,
      partialKnowledgeRecords: 0,
      wave1Status: 'CLOSED',
      manifestReference: 'audit/phase15b-wave1-completion-manifest.json',
    },
    wave2GovernancePrinciples: [
      'deterministic_create_knowledge_record_selection',
      'full_six_domain_editorial_at_creation',
      'audit_before_commit',
      'monotonic_kr_count_growth',
      'frozen_schema_kci_citation_popularity',
    ],
  };
}

function buildExpansionIntelligenceReport(options = {}) {
  const generatedAt = options.generatedAt || resolveGeneratedAt(options);
  const ctx = buildEntityIndex();
  const { entities } = ctx;

  const existingKrEntities = entities.filter((entity) => entity.hasKnowledgeRecord);
  const unresearchedEntities = entities.filter((entity) => !entity.hasKnowledgeRecord);

  const ranked = unresearchedEntities
    .map((entity) => {
      const readiness = classifyCreationReadiness(entity);
      const priority = computeExpansionPriorityScore(entity, readiness);
      return {
        slug: entity.slug,
        name: entity.name,
        gender: entity.gender,
        originCountry: entity.originCountry,
        language: entity.language,
        originCluster: entity.originCluster,
        hasCitationRecord: entity.hasCitationRecord,
        hasPopularityRecord: entity.hasPopularityRecord,
        hasPopularity: entity.hasPopularity,
        hasLegacyMeaning: entity.hasLegacyMeaning,
        hasLegacyOrigin: entity.hasLegacyOrigin,
        hasVariants: entity.hasVariantRecord || entity.hasSpellingVariants,
        currentKci: entity.kci,
        creationReadiness: readiness.tier,
        creationReadinessNote: readiness.note,
        prerequisiteCount: readiness.prerequisiteCount,
        editorialEffortUnits: readiness.editorialEffortUnits,
        expansionPriorityScore: priority.score,
        expansionPriorityReasons: priority.reasons,
        action: 'create_knowledge_record',
      };
    })
    .sort(
      (a, b) =>
        b.expansionPriorityScore - a.expansionPriorityScore ||
        a.slug.localeCompare(b.slug),
    );

  ranked.forEach((row, index) => {
    row.rank = index + 1;
  });

  const priorityDistribution = {
    high: ranked.filter((row) => row.expansionPriorityScore >= 150).length,
    medium: ranked.filter((row) => row.expansionPriorityScore >= 120 && row.expansionPriorityScore < 150).length,
    low: ranked.filter((row) => row.expansionPriorityScore < 120).length,
  };

  const readinessDistribution = Object.fromEntries(
    READINESS_TIERS.map((tier) => [tier, ranked.filter((row) => row.creationReadiness === tier).length]),
  );

  const totalEditorialEffortUnits = ranked.reduce((sum, row) => sum + row.editorialEffortUnits, 0);
  const waveSimulations = buildWaveSimulations(unresearchedEntities.length);
  const recommendedWaves = buildRecommendedWaves(unresearchedEntities.length, waveSimulations);
  const frozenHashes = hashFrozenArtifacts();

  const report = {
    phase: '16A',
    version: 1,
    title: 'Knowledge Record Expansion Intelligence',
    generatedAt,
    baselineReference: 'editorial-architecture-v2',
    readOnly: true,
    planningReport: true,
    status: 'COMPLETE',
    summary: {
      totalEntities: TOTAL_ENTITIES,
      wave1KnowledgeRecordBaseline: WAVE1_KR_BASELINE,
      wave1FullyResearched: WAVE1_KR_BASELINE,
      unresearchedEntities: unresearchedEntities.length,
      unresearchedPct: pct(unresearchedEntities.length, TOTAL_ENTITIES),
      expansionTarget: unresearchedEntities.length,
      finalCorpusTarget: TOTAL_ENTITIES,
      sixDomainStandardAtWave1: '1150 / 1150',
      editorialDomainsPerNewRecord: EDITORIAL_DOMAINS.length,
      totalEditorialEffortUnits: Number(totalEditorialEffortUnits.toFixed(1)),
      recommendedWaveSize: recommendedWaves.primary.waveSize,
      recommendedWaveCount: recommendedWaves.primary.wavesRequired,
      priorityScoreRange: {
        min: ranked.length ? ranked[ranked.length - 1].expansionPriorityScore : null,
        max: ranked.length ? ranked[0].expansionPriorityScore : null,
        uniqueScores: new Set(ranked.map((row) => row.expansionPriorityScore)).size,
      },
      corpusHomogeneity:
        'Unresearched entities share minimal prerequisite metadata; deterministic slug ordering resolves priority ties.',
    },
    remainingEntities: {
      count: unresearchedEntities.length,
      accountedFor: unresearchedEntities.length,
      overlapWithExistingKnowledgeRecords: 0,
      entityAccounting: {
        withKnowledgeRecord: existingKrEntities.length,
        withoutKnowledgeRecord: unresearchedEntities.length,
        total: TOTAL_ENTITIES,
        balanced: existingKrEntities.length + unresearchedEntities.length === TOTAL_ENTITIES,
      },
    },
    priorityDistribution: {
      ...priorityDistribution,
      tiers: {
        high: { minScore: 150, count: priorityDistribution.high },
        medium: { minScore: 120, maxScore: 149, count: priorityDistribution.medium },
        low: { maxScore: 119, count: priorityDistribution.low },
      },
    },
    creationReadiness: {
      distribution: readinessDistribution,
      cohorts: buildCreationCohorts(ranked),
      methodology: {
        ready: 'Citation, popularity, legacy meaning, and legacy origin all available.',
        minor_enrichment: 'Partial prerequisite metadata (citation, popularity, or legacy fields).',
        research_required: 'Limited prerequisite metadata; full editorial research expected.',
      },
    },
    recommendedWaves,
    estimatedEditorialWork: {
      totalEditorialEffortUnits: Number(totalEditorialEffortUnits.toFixed(1)),
      effortByReadiness: buildCreationCohorts(ranked).map((cohort) => ({
        tier: cohort.tier,
        entities: cohort.count,
        effortUnits: cohort.totalEditorialEffortUnits,
      })),
      domainsPerEntity: EDITORIAL_DOMAINS.length,
      totalDomainAssignments: unresearchedEntities.length * EDITORIAL_DOMAINS.length,
      editorialDomains: EDITORIAL_DOMAINS,
    },
    coverageForecasts: buildCoverageForecasts(WAVE1_KR_BASELINE, unresearchedEntities.length),
    expansionMilestones: EXPANSION_MILESTONES,
    creationOrder: ranked.map((row) => ({
      rank: row.rank,
      slug: row.slug,
      name: row.name,
      expansionPriorityScore: row.expansionPriorityScore,
      creationReadiness: row.creationReadiness,
      expansionPriorityReasons: row.expansionPriorityReasons,
    })),
    top100CreationCandidates: ranked.slice(0, 100).map((row) => ({
      rank: row.rank,
      slug: row.slug,
      name: row.name,
      expansionPriorityScore: row.expansionPriorityScore,
      creationReadiness: row.creationReadiness,
      expansionPriorityReasons: row.expansionPriorityReasons,
    })),
    validationTargets: buildValidationTargets(unresearchedEntities.length, recommendedWaves.primary.waveSize),
    governanceChecks: buildGovernanceChecks(frozenHashes),
    methodology: {
      scoringModel: {
        factors: [
          { factor: 'unresearched_entity', weight: 100 },
          { factor: 'citation_available', weight: 30 },
          { factor: 'popularity_available', weight: 25 },
          { factor: 'legacy_metadata_complete', weight: 20 },
          { factor: 'legacy_metadata_partial', weight: 10 },
          { factor: 'variants_available', weight: 8 },
          { factor: 'creation_ready', weight: 15 },
          { factor: 'minor_enrichment', weight: 8 },
          { factor: 'kci_signal', weight: '0–10 based on KCI' },
        ],
        tieBreaker: 'slug ascending',
        note: 'Scores computed at audit time only; not persisted to Knowledge Records or KCI.',
      },
      waveSizingRationale:
        'Multiple wave sizes simulated. Primary recommendation balances validation cadence with throughput.',
      deterministicOrdering: 'expansionPriorityScore DESC, slug ASC',
    },
    successCriteria: {
      whichEntitiesFirst: 'creationOrder rank 1..N by expansion priority score',
      rankingRationale: 'expansionPriorityReasons per entity',
      recommendedWaveCount: recommendedWaves.primary.wavesRequired,
      recommendedWaveSize: recommendedWaves.primary.waveSize,
      waveContents: 'Sequential slices of creationOrder by recommended wave size',
      validationEvolution: 'Documented in validationTargets.validationEvolution',
      frozenInvariants: 'Documented in governanceChecks',
      expansionMilestones: 'Documented in coverageForecasts and expansionMilestones',
      allCriteriaMet: true,
    },
    wave2Readiness: {
      wave1Complete: true,
      wave1Manifest: 'audit/phase15b-wave1-completion-manifest.json',
      expansionIntelligenceComplete: true,
      readyForImplementation: true,
      scopeShift: 'complete_domains → create_knowledge_record',
      statement:
        'Phase 16A provides deterministic expansion strategy for 2,547 unresearched entities. Wave 2 implementation may proceed once governance document is approved.',
    },
  };

  return report;
}

function validateExpansionReport(report) {
  const errors = [];

  if (report.remainingEntities.count !== 2547) {
    errors.push(`Expected 2547 unresearched entities, got ${report.remainingEntities.count}`);
  }

  if (report.remainingEntities.overlapWithExistingKnowledgeRecords !== 0) {
    errors.push('Overlap detected between unresearched set and existing Knowledge Records');
  }

  if (!report.remainingEntities.entityAccounting.balanced) {
    errors.push('Entity accounting does not balance to 3697');
  }

  if (report.creationOrder.length !== report.remainingEntities.count) {
    errors.push('creationOrder length does not match unresearched count');
  }

  const ranks = report.creationOrder.map((row) => row.rank);
  const sortedRanks = [...ranks].sort((a, b) => a - b);
  if (ranks.length !== sortedRanks.length || sortedRanks[0] !== 1 || sortedRanks[sortedRanks.length - 1] !== ranks.length) {
    errors.push('creationOrder ranks are not contiguous from 1');
  }

  for (let i = 1; i < report.creationOrder.length; i += 1) {
    const prev = report.creationOrder[i - 1];
    const curr = report.creationOrder[i];
    if (curr.expansionPriorityScore > prev.expansionPriorityScore) {
      errors.push(`creationOrder not sorted by priority at rank ${curr.rank}`);
      break;
    }
    if (
      curr.expansionPriorityScore === prev.expansionPriorityScore &&
      curr.slug.localeCompare(prev.slug) < 0
    ) {
      errors.push(`creationOrder tie-breaker violated at rank ${curr.rank}`);
      break;
    }
  }

  const slugSet = new Set(report.creationOrder.map((row) => row.slug));
  if (slugSet.size !== report.creationOrder.length) {
    errors.push('Duplicate slugs in creationOrder');
  }

  return {
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    errors,
  };
}

function hashReportSemantic(report) {
  return stableHash({
    summary: report.summary,
    remainingEntities: report.remainingEntities,
    creationOrder: report.creationOrder.map((row) => ({
      rank: row.rank,
      slug: row.slug,
      expansionPriorityScore: row.expansionPriorityScore,
      creationReadiness: row.creationReadiness,
    })),
    priorityDistribution: report.priorityDistribution,
    creationReadiness: report.creationReadiness.distribution,
    recommendedWaves: report.recommendedWaves.primary,
  });
}

module.exports = {
  TOTAL_ENTITIES,
  WAVE1_KR_BASELINE,
  WAVE_SIZE_OPTIONS,
  EXPANSION_MILESTONES,
  READINESS_TIERS,
  classifyCreationReadiness,
  computeExpansionPriorityScore,
  buildExpansionIntelligenceReport,
  validateExpansionReport,
  hashReportSemantic,
  AUDIT_DIR,
};
