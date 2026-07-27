/**
 * lib/analysis/editorial-coverage-intelligence.js
 * Phase 15A — Read-only editorial coverage measurement and gap analysis.
 *
 * No Knowledge Record, Citation, Popularity, or KCI mutations.
 */

const fs = require('fs');
const path = require('path');
const {
  DOMAINS,
  loadJson,
  loadKnowledgeRecordsPayload,
  normalizeKey,
  PATHS,
} = require('../../scripts/editorial/knowledge-record-v2.js');
const {
  CITATION_PATHS,
  stableHash,
} = require('../../scripts/editorial/citation-infrastructure-v1.js');
const {
  isDomainPopulated,
  loadCitationRecordsPayload,
  hashCitationRecordsSemantic,
} = require('../../scripts/editorial/citation-records-v1.js');
const {
  POPULARITY_PATHS,
  hashPopularityRecordsSemantic,
  loadPopularityRecordsPayload,
} = require('../../scripts/editorial/popularity-records-v1.js');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const AUDIT_DIR = path.join(ROOT, 'audit');

const EDITORIAL_DOMAINS = [...DOMAINS, 'variants'];

const COMPLETENESS_BUCKETS = [
  { key: '0', min: 0, max: 0 },
  { key: '1', min: 1, max: 1 },
  { key: '2', min: 2, max: 2 },
  { key: '3', min: 3, max: 3 },
  { key: '4', min: 4, max: 4 },
  { key: '5', min: 5, max: 5 },
  { key: '6', min: 6, max: 6 },
];

function pct(count, total) {
  if (!total) return 0;
  return Number(((count / total) * 100).toFixed(2));
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function resolveGeneratedAt(options = {}) {
  if (options.generatedAt) return options.generatedAt;
  const knowledgePayload = loadKnowledgeRecordsPayload();
  if (knowledgePayload?.generatedAt) return knowledgePayload.generatedAt;
  const kciReport = loadJson(path.join(AUDIT_DIR, 'knowledge-completeness.json'), null);
  if (kciReport?.generatedAt) return kciReport.generatedAt;
  return '1970-01-01T00:00:00.000Z';
}

function hasVariants(entity) {
  return (
    entity.hasSpellingVariants ||
    entity.hasVariantRecord ||
    (entity.kciBreakdown?.variants ?? 0) > 0
  );
}

function populatedDomainsForRecord(kr, entity) {
  const populated = [];
  if (!kr) return populated;
  for (const domain of DOMAINS) {
    if (isDomainPopulated(kr, domain)) populated.push(domain);
  }
  if (hasVariants(entity)) populated.push('variants');
  return populated;
}

function missingDomainsForRecord(kr, entity) {
  const missing = [];
  if (!kr) return [...EDITORIAL_DOMAINS];
  for (const domain of DOMAINS) {
    if (!isDomainPopulated(kr, domain)) missing.push(domain);
  }
  if (!hasVariants(entity)) missing.push('variants');
  return missing;
}

function editorialDomainCount(kr, entity) {
  return populatedDomainsForRecord(kr, entity).length;
}

function bucketCompleteness(count) {
  for (const bucket of COMPLETENESS_BUCKETS) {
    if (count >= bucket.min && count <= bucket.max) return bucket.key;
  }
  return '6';
}

function loadNamesUniverse() {
  const names = loadJson(path.join(DATA_DIR, 'names.json'), []);
  const normalized = loadJson(path.join(DATA_DIR, 'normalized-names.json'), []);
  const popularity = loadJson(path.join(DATA_DIR, 'popularity.json'), []);
  const variants = loadJson(path.join(DATA_DIR, 'variants.json'), []);
  const namesEnriched = loadJson(path.join(DATA_DIR, 'names-enriched.json'), []);

  const normalizedById = new Map(normalized.map((row) => [row.id, row]));
  const enrichedById = new Map(namesEnriched.map((row) => [row.id, row]));
  const popularityByNameId = new Set(popularity.map((row) => row.name_id));
  const variantsByNameId = new Set(variants.map((row) => row.name_id));

  return names.map((row) => {
    const norm = normalizedById.get(row.id) || {};
    const enriched = enrichedById.get(row.id) || {};
    return {
      id: row.id,
      name: row.name,
      slug: norm.slug || normalizeKey(row.name),
      gender: row.gender || null,
      originCountry: norm.origin_country || enriched.origin_country || row.origin_country || null,
      language: norm.language || enriched.language || row.language || null,
      originCluster: norm.origin_cluster || enriched.origin_cluster || null,
      hasSpellingVariants: Array.isArray(norm.spelling_variants) && norm.spelling_variants.length > 0,
      hasVariantRecord: variantsByNameId.has(row.id),
      hasPopularity: popularityByNameId.has(row.id),
      hasLegacyMeaning: Boolean(enriched.meaning && String(enriched.meaning).trim()),
      hasLegacyOrigin: Boolean(enriched.origin_country || enriched.language),
    };
  });
}

function loadKciIndex() {
  const report = loadJson(path.join(AUDIT_DIR, 'knowledge-completeness.json'), { entities: [] });
  return new Map((report.entities || []).map((row) => [row.slug, row]));
}

function buildEntityIndex() {
  const universe = loadNamesUniverse();
  const kciBySlug = loadKciIndex();
  const knowledgePayload = loadKnowledgeRecordsPayload();
  const citationPayload = loadCitationRecordsPayload();
  const popularityPayload = loadPopularityRecordsPayload();

  const krByKey = new Map((knowledgePayload.records || []).map((row) => [normalizeKey(row.name), row]));
  const crByKey = new Map((citationPayload?.records || []).map((row) => [normalizeKey(row.name), row]));
  const prByKey = new Map((popularityPayload?.records || []).map((row) => [normalizeKey(row.name), row]));

  const entities = universe.map((entity) => {
    const key = normalizeKey(entity.name);
    const kr = krByKey.get(key) || null;
    const cr = crByKey.get(key) || null;
    const pr = prByKey.get(key) || null;
    const kci = kciBySlug.get(entity.slug) || { score: 0, breakdown: {} };
    const populatedDomains = populatedDomainsForRecord(kr, { ...entity, kciBreakdown: kci.breakdown || {} });
    const missingDomains = missingDomainsForRecord(kr, { ...entity, kciBreakdown: kci.breakdown || {} });
    const domainCount = populatedDomains.length;
    const editorialCompletenessPct = pct(domainCount, EDITORIAL_DOMAINS.length);

    return {
      ...entity,
      key,
      hasKnowledgeRecord: Boolean(kr),
      hasCitationRecord: Boolean(cr),
      hasPopularityRecord: Boolean(pr),
      hasPartialKnowledgeRecord: Boolean(kr) && missingDomains.length > 0,
      isFullyResearched: Boolean(kr) && missingDomains.length === 0,
      populatedDomains,
      missingDomains,
      editorialDomainCount: domainCount,
      editorialCompletenessPct,
      kci: kci.score ?? 0,
      kciBreakdown: kci.breakdown || {},
      knowledgeRecord: kr,
      citationRecord: cr,
      popularityRecord: pr,
    };
  });

  return {
    universe,
    entities,
    knowledgePayload,
    citationPayload,
    popularityPayload,
    krByKey,
    crByKey,
    prByKey,
  };
}

function buildCoverageByDimension(entities, field) {
  const groups = new Map();
  for (const entity of entities) {
    const value = entity[field] || 'Unknown';
    if (!groups.has(value)) {
      groups.set(value, {
        value,
        totalEntities: 0,
        withKnowledgeRecord: 0,
        fullyResearched: 0,
        partialKnowledgeRecord: 0,
        totalEditorialDomains: 0,
      });
    }
    const group = groups.get(value);
    group.totalEntities += 1;
    if (entity.hasKnowledgeRecord) group.withKnowledgeRecord += 1;
    if (entity.isFullyResearched) group.fullyResearched += 1;
    if (entity.hasPartialKnowledgeRecord) group.partialKnowledgeRecord += 1;
    group.totalEditorialDomains += entity.editorialDomainCount;
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      knowledgeRecordCoveragePct: pct(group.withKnowledgeRecord, group.totalEntities),
      fullyResearchedPct: pct(group.fullyResearched, group.totalEntities),
      averageEditorialDomains: group.totalEntities
        ? Number((group.totalEditorialDomains / group.totalEntities).toFixed(2))
        : 0,
    }))
    .sort((a, b) => b.totalEntities - a.totalEntities || a.value.localeCompare(b.value));
}

function validateIntegrity(ctx) {
  const errors = [];
  const { knowledgePayload, entities } = ctx;

  const krNames = (knowledgePayload.records || []).map((row) => normalizeKey(row.name));
  if (new Set(krNames).size !== krNames.length) errors.push('Duplicate Knowledge Record names detected.');

  const sortedNames = [...krNames].sort((a, b) => a.localeCompare(b));
  if (krNames.join('\n') !== sortedNames.join('\n')) {
    errors.push('Knowledge Records are not deterministically sorted by name.');
  }

  const entityKeys = new Set(entities.map((row) => row.key));
  for (const name of krNames) {
    if (!entityKeys.has(name)) errors.push(`Knowledge Record without matching entity: ${name}`);
  }

  return {
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    errors,
    checks: {
      deterministicOrdering: !errors.some((msg) => msg.includes('deterministically sorted')),
      duplicateFreeEntityReferences: !errors.some((msg) => msg.includes('Duplicate Knowledge Record')),
      entityUniverseConsistency: !errors.some((msg) => msg.includes('without matching entity')),
    },
  };
}

function buildCoverageReport(ctx, options = {}) {
  const generatedAt = resolveGeneratedAt(options);
  const { entities, knowledgePayload } = ctx;

  const totalEntities = entities.length;
  const knowledgeRecords = knowledgePayload.records?.length || 0;
  const withKnowledgeRecord = entities.filter((row) => row.hasKnowledgeRecord);
  const withoutKnowledgeRecord = entities.filter((row) => !row.hasKnowledgeRecord);
  const fullyResearched = entities.filter((row) => row.isFullyResearched);
  const partialRecords = entities.filter((row) => row.hasPartialKnowledgeRecord);
  const completenessScores = entities.map((row) => row.editorialDomainCount);

  const domainCoverage = {};
  for (const domain of EDITORIAL_DOMAINS) {
    let populated = 0;
    for (const entity of entities) {
      if (domain === 'variants') {
        if (entity.hasKnowledgeRecord && hasVariants({ ...entity, kciBreakdown: entity.kciBreakdown })) {
          populated += 1;
        }
      } else if (entity.knowledgeRecord && isDomainPopulated(entity.knowledgeRecord, domain)) {
        populated += 1;
      }
    }
    domainCoverage[domain] = {
      entitiesWithEditorial: populated,
      entitiesWithoutEditorial: totalEntities - populated,
      coveragePct: pct(populated, totalEntities),
      coverageAmongKnowledgeRecordsPct:
        domain === 'variants'
          ? pct(populated, withKnowledgeRecord.length || 0)
          : pct(
              entities.filter(
                (row) => row.hasKnowledgeRecord && row.populatedDomains.includes(domain),
              ).length,
              withKnowledgeRecord.length || 0,
            ),
    };
  }

  const distribution = Object.fromEntries(COMPLETENESS_BUCKETS.map((bucket) => [bucket.key, 0]));
  for (const entity of entities) {
    distribution[bucketCompleteness(entity.editorialDomainCount)] += 1;
  }

  const partialBreakdown = {};
  for (const domain of EDITORIAL_DOMAINS) {
    partialBreakdown[domain] = entities.filter(
      (row) => row.hasKnowledgeRecord && row.missingDomains.includes(domain),
    ).length;
  }

  return {
    phase: '15A',
    title: 'Editorial Coverage Snapshot',
    generatedAt,
    baselineReference: 'knowledge-record-v2',
    readOnly: true,
    measurementOnly: true,
    overall: {
      totalEntities,
      totalKnowledgeRecords: knowledgeRecords,
      entitiesWithKnowledgeRecords: withKnowledgeRecord.length,
      entitiesWithoutKnowledgeRecords: withoutKnowledgeRecord.length,
      knowledgeRecordCoveragePct: pct(withKnowledgeRecord.length, totalEntities),
      fullyResearchedEntities: fullyResearched.length,
      fullyResearchedPct: pct(fullyResearched.length, totalEntities),
      partialKnowledgeRecords: partialRecords.length,
      partialKnowledgeRecordPct: pct(partialRecords.length, totalEntities),
      partialAmongKnowledgeRecordsPct: pct(partialRecords.length, withKnowledgeRecord.length || 0),
      averageEditorialDomainsPerEntity: Number(
        (completenessScores.reduce((sum, n) => sum + n, 0) / totalEntities).toFixed(2),
      ),
      averageEditorialDomainsPerKnowledgeRecord: withKnowledgeRecord.length
        ? Number(
            (withKnowledgeRecord.reduce((sum, row) => sum + row.editorialDomainCount, 0) /
              withKnowledgeRecord.length).toFixed(2),
          )
        : 0,
      medianEditorialDomainsPerEntity: Number(median(completenessScores).toFixed(2)),
      maximumEditorialDomainsOnSingleEntity: completenessScores.length ? Math.max(...completenessScores) : 0,
      entitiesWithZeroEditorialDomains: entities.filter((row) => row.editorialDomainCount === 0).length,
      entitiesWithFullEditorialDomains: fullyResearched.length,
    },
    domainCoverage,
    distribution,
    partialKnowledgeRecords: {
      count: partialRecords.length,
      missingDomainCounts: partialBreakdown,
    },
    coverageByDimension: {
      gender: buildCoverageByDimension(entities, 'gender'),
      language: buildCoverageByDimension(entities, 'language'),
      originCountry: buildCoverageByDimension(entities, 'originCountry'),
      originCluster: buildCoverageByDimension(entities, 'originCluster'),
    },
    editorialConcentration: {
      knowledgeRecordsPctOfUniverse: pct(knowledgeRecords, totalEntities),
      unresearchedEntityCount: withoutKnowledgeRecord.length,
      unresearchedEntityPct: pct(withoutKnowledgeRecord.length, totalEntities),
      legacyMetadataAvailable: {
        withLegacyMeaning: entities.filter((row) => row.hasLegacyMeaning).length,
        withLegacyOrigin: entities.filter((row) => row.hasLegacyOrigin).length,
        withPopularity: entities.filter((row) => row.hasPopularity).length,
      },
    },
    integrity: validateIntegrity(ctx),
  };
}

function computePriorityScore(entity) {
  const reasons = [];
  let score = 0;

  if (!entity.hasKnowledgeRecord) {
    score += 100;
    reasons.push('no_knowledge_record');
  } else if (entity.hasPartialKnowledgeRecord) {
    score += 60 + entity.missingDomains.length * 8;
    reasons.push('partial_knowledge_record');
    reasons.push('missing_editorial_domains');
  }

  if (entity.hasPopularity) {
    score += 25;
    reasons.push('popularity_available');
  }

  if (entity.hasCitationRecord && entity.hasPartialKnowledgeRecord) {
    score += 20;
    reasons.push('citation_without_full_editorial');
  }

  if (entity.hasLegacyMeaning || entity.hasLegacyOrigin) {
    score += 15;
    reasons.push('legacy_metadata_available');
  }

  if (entity.kci < 30) {
    score += 15;
    reasons.push('low_kci');
  }

  if (entity.hasKnowledgeRecord && entity.kci >= 80) {
    score += 10;
    reasons.push('near_complete_research');
  }

  if (entity.missingDomains.includes('origin') || entity.missingDomains.includes('meaning')) {
    score += 12;
    reasons.push('missing_core_domains');
  }

  return { score, reasons: [...new Set(reasons)] };
}

function buildGapAnalysisReport(ctx, coverageReport, options = {}) {
  const generatedAt = options.generatedAt || coverageReport.generatedAt || resolveGeneratedAt(options);
  const { entities } = ctx;

  const ranked = entities
    .map((entity) => {
      const priority = computePriorityScore(entity);
      return {
        slug: entity.slug,
        name: entity.name,
        currentEditorialCompleteness: entity.editorialCompletenessPct,
        editorialDomainCount: entity.editorialDomainCount,
        populatedDomains: entity.populatedDomains,
        missingDomains: entity.missingDomains,
        hasKnowledgeRecord: entity.hasKnowledgeRecord,
        hasPartialKnowledgeRecord: entity.hasPartialKnowledgeRecord,
        hasCitationRecord: entity.hasCitationRecord,
        hasPopularityRecord: entity.hasPopularityRecord,
        hasPopularity: entity.hasPopularity,
        currentKci: entity.kci,
        originCountry: entity.originCountry,
        language: entity.language,
        originCluster: entity.originCluster,
        gender: entity.gender,
        priorityScore: priority.score,
        priorityReasons: priority.reasons,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore || a.slug.localeCompare(b.slug));

  ranked.forEach((row, index) => {
    row.rank = index + 1;
  });

  const top100 = ranked.slice(0, 100);

  function aggregateBy(field) {
    const groups = new Map();
    for (const row of ranked) {
      const value = row[field];
      if (!value) continue;
      if (!groups.has(value)) {
        groups.set(value, { value, count: 0, totalPriority: 0, unresearched: 0, entities: [] });
      }
      const group = groups.get(value);
      group.count += 1;
      group.totalPriority += row.priorityScore;
      if (!row.hasKnowledgeRecord) group.unresearched += 1;
      if (group.entities.length < 5) group.entities.push(row.slug);
    }
    return [...groups.values()]
      .map((group) => ({
        ...group,
        averagePriority: Number((group.totalPriority / group.count).toFixed(2)),
        unresearchedPct: pct(group.unresearched, group.count),
      }))
      .sort((a, b) => b.averagePriority - a.averagePriority || b.unresearched - a.unresearched)
      .slice(0, 20);
  }

  const editorialDeserts = ranked
    .filter((row) => !row.hasKnowledgeRecord)
    .slice(0, 25)
    .map((row) => ({ slug: row.slug, name: row.name, priorityScore: row.priorityScore }));

  const partialEntities = ranked
    .filter((row) => row.hasPartialKnowledgeRecord)
    .slice(0, 25)
    .map((row) => ({
      slug: row.slug,
      name: row.name,
      missingDomains: row.missingDomains,
      priorityScore: row.priorityScore,
    }));

  const missingDomainRankings = Object.fromEntries(
    EDITORIAL_DOMAINS.map((domain) => [
      domain,
      ranked.filter((row) => row.missingDomains.includes(domain)).length,
    ]),
  );

  return {
    phase: '15A',
    title: 'Editorial Gap Analysis & Prioritization',
    generatedAt,
    baselineReference: 'knowledge-record-v2',
    readOnly: true,
    planningReport: true,
    methodology: {
      priorityScoreFactors: [
        'no_knowledge_record',
        'partial_knowledge_record',
        'missing_editorial_domains',
        'popularity_available',
        'citation_without_full_editorial',
        'legacy_metadata_available',
        'low_kci',
        'near_complete_research',
        'missing_core_domains',
      ],
      note: 'Priority scores are computed at audit time only and are not persisted to Knowledge Records or KCI.',
    },
    top100HighestPriority: top100,
    gapSummaries: {
      highestPriorityOrigins: aggregateBy('originCountry'),
      highestPriorityLanguages: aggregateBy('language'),
      highestPriorityCultures: aggregateBy('originCluster'),
      highestPriorityGenders: aggregateBy('gender'),
      largestEditorialDeserts: editorialDeserts,
      partialKnowledgeRecordSamples: partialEntities,
      mostCommonMissingDomains: Object.entries(missingDomainRankings)
        .map(([domain, count]) => ({ domain, count }))
        .sort((a, b) => b.count - a.count),
      entitiesWithPopularityButNoKnowledgeRecord: ranked.filter(
        (row) => row.hasPopularity && !row.hasKnowledgeRecord,
      ),
    },
    expansionRoadmap: {
      phase15BInput: top100.map((row) => ({
        rank: row.rank,
        slug: row.slug,
        name: row.name,
        action: row.hasKnowledgeRecord ? 'complete_domains' : 'create_knowledge_record',
        missingDomains: row.missingDomains,
        priorityScore: row.priorityScore,
      })),
    },
    totals: {
      entitiesRanked: ranked.length,
      unresearchedEntities: ranked.filter((row) => !row.hasKnowledgeRecord).length,
      partialKnowledgeRecords: ranked.filter((row) => row.hasPartialKnowledgeRecord).length,
      fullyResearchedEntities: ranked.filter((row) => row.hasKnowledgeRecord && row.missingDomains.length === 0).length,
    },
  };
}

function hashFrozenArtifacts() {
  const knowledgePayload = loadKnowledgeRecordsPayload();
  const citationRecords = loadCitationRecordsPayload();
  const popularityRegistry = loadJson(POPULARITY_PATHS.registry, {});
  const popularityRecords = loadPopularityRecordsPayload();
  const kciReport = loadJson(path.join(AUDIT_DIR, 'knowledge-completeness.json'), {});

  return {
    knowledgeRecords: stableHash({ schemaVersion: knowledgePayload.schemaVersion, records: knowledgePayload.records }),
    citationRecords: citationRecords
      ? hashCitationRecordsSemantic(citationRecords)
      : stableHash({ schemaVersion: '1.0', records: [] }),
    popularityRegistry: stableHash({
      schemaVersion: popularityRegistry.schemaVersion,
      sources: popularityRegistry.sources,
    }),
    popularityRecords: popularityRecords ? hashPopularityRecordsSemantic(popularityRecords) : null,
    kciReport: stableHash({
      entityCount: kciReport.entityCount,
      summary: kciReport.summary,
      entities: kciReport.entities,
    }),
  };
}

module.exports = {
  EDITORIAL_DOMAINS,
  COMPLETENESS_BUCKETS,
  buildEntityIndex,
  buildCoverageReport,
  buildGapAnalysisReport,
  validateIntegrity,
  computePriorityScore,
  resolveGeneratedAt,
  hashFrozenArtifacts,
  loadJson,
  ROOT,
  AUDIT_DIR,
  PATHS,
};
