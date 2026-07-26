/**
 * lib/analysis/popularity-coverage-intelligence.js
 * Phase 14A — Read-only popularity coverage measurement and gap analysis.
 *
 * No Popularity Record, Registry, Knowledge Record, Citation, or KCI mutations.
 */

const fs = require('fs');
const path = require('path');
const {
  loadJson,
  loadKnowledgeRecordsPayload,
  normalizeKey,
} = require('../../scripts/editorial/knowledge-record-v2.js');
const {
  POPULARITY_PATHS,
  stableHash,
} = require('../../scripts/editorial/popularity-infrastructure-v1.js');
const {
  loadPopularityRecordsPayload,
  hashPopularityRecordsSemantic,
  loadLegacyPopularityRows,
  resolveCountrySourceId,
  POPULARITY_RECORD_PATHS,
} = require('../../scripts/editorial/popularity-records-v1.js');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const AUDIT_DIR = path.join(ROOT, 'audit');

const SOURCE_BUCKETS = [
  { key: '0', min: 0, max: 0 },
  { key: '1', min: 1, max: 1 },
  { key: '2', min: 2, max: 2 },
  { key: '3+', min: 3, max: Infinity },
];

const LEGACY_COUNTRIES = ['USA', 'UK', 'CAN', 'AUS', 'India'];

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

function bucketSourceCount(count) {
  for (const bucket of SOURCE_BUCKETS) {
    if (count >= bucket.min && count <= bucket.max) return bucket.key;
  }
  return '3+';
}

function resolveGeneratedAt(options = {}) {
  if (options.generatedAt) return options.generatedAt;
  const popularityPayload = loadPopularityRecordsPayload();
  if (popularityPayload?.generatedAt) return popularityPayload.generatedAt;
  const kciReport = loadJson(path.join(AUDIT_DIR, 'knowledge-completeness.json'), null);
  if (kciReport?.generatedAt) return kciReport.generatedAt;
  return '1970-01-01T00:00:00.000Z';
}

function loadNamesUniverse() {
  const names = loadJson(path.join(DATA_DIR, 'names.json'), []);
  const normalized = loadJson(path.join(DATA_DIR, 'normalized-names.json'), []);
  const normalizedById = new Map(normalized.map((row) => [row.id, row]));

  return names.map((row) => {
    const norm = normalizedById.get(row.id) || {};
    return {
      id: row.id,
      name: row.name,
      slug: norm.slug || normalizeKey(row.name),
      gender: row.gender || null,
      originCountry: norm.origin_country || row.origin_country || null,
      language: norm.language || row.language || null,
      originCluster: norm.origin_cluster || null,
    };
  });
}

function loadKciIndex() {
  const report = loadJson(path.join(AUDIT_DIR, 'knowledge-completeness.json'), { entities: [] });
  return new Map((report.entities || []).map((row) => [row.slug, row]));
}

function buildLegacyIndex(registry) {
  const legacyRows = loadLegacyPopularityRows();
  const { byId } = (() => {
    const names = loadJson(POPULARITY_RECORD_PATHS.names, []);
    return { byId: new Map(names.map((row) => [row.id, row])) };
  })();

  const byNameKey = new Map();

  for (const row of legacyRows) {
    const nameRow = byId.get(row.name_id);
    if (!nameRow) continue;
    const key = normalizeKey(nameRow.name);
    if (!byNameKey.has(key)) {
      byNameKey.set(key, {
        name: nameRow.name,
        nameId: row.name_id,
        rows: [],
        countries: new Set(),
        attributableCountries: new Set(),
        unresolvedCountries: new Set(),
      });
    }
    const bucket = byNameKey.get(key);
    bucket.rows.push(row);
    bucket.countries.add(row.country);
    const sourceId = resolveCountrySourceId(row.country, registry);
    if (sourceId) bucket.attributableCountries.add(row.country);
    else bucket.unresolvedCountries.add(row.country);
  }

  return { legacyRows, byNameKey };
}

function countUniqueSources(popularity = {}) {
  return new Set(popularity.sources || []).size;
}

function countRegions(popularity = {}) {
  return Object.keys(popularity.regions || {}).length;
}

function buildEntityIndex() {
  const universe = loadNamesUniverse();
  const kciBySlug = loadKciIndex();
  const knowledgePayload = loadKnowledgeRecordsPayload();
  const popularityPayload = loadPopularityRecordsPayload();
  const registry = loadJson(POPULARITY_PATHS.registry, { sources: [] });
  const legacyIndex = buildLegacyIndex(registry);

  const krByKey = new Map((knowledgePayload.records || []).map((row) => [normalizeKey(row.name), row]));
  const prByKey = new Map((popularityPayload?.records || []).map((row) => [normalizeKey(row.name), row]));
  const registryIds = new Set((registry.sources || []).map((row) => row.id));
  const registryById = new Map((registry.sources || []).map((row) => [row.id, row]));

  const entities = universe.map((entity) => {
    const key = normalizeKey(entity.name);
    const kr = krByKey.get(key) || null;
    const pr = prByKey.get(key) || null;
    const legacy = legacyIndex.byNameKey.get(key) || null;
    const popularity = pr?.popularity || {};
    const sourceCount = countUniqueSources(popularity);
    const regionCount = countRegions(popularity);
    const kci = kciBySlug.get(entity.slug) || { score: 0, breakdown: {} };

    return {
      ...entity,
      key,
      hasKnowledgeRecord: Boolean(kr),
      hasPopularityRecord: Boolean(pr),
      hasLegacyPopularity: Boolean(legacy),
      legacyRowCount: legacy?.rows.length || 0,
      legacyCountries: legacy ? [...legacy.countries].sort() : [],
      attributableLegacyCountries: legacy ? [...legacy.attributableCountries].sort() : [],
      unresolvedLegacyCountries: legacy ? [...legacy.unresolvedCountries].sort() : [],
      sourceCount,
      regionCount,
      attributableSourceCount: (popularity.sources || []).length,
      popularity,
      kci: kci.score ?? 0,
      kciPopularityScore: kci.breakdown?.popularity ?? 0,
      kciBreakdown: kci.breakdown || {},
      popularityRecord: pr,
      knowledgeRecord: kr,
    };
  });

  return {
    universe,
    entities,
    knowledgePayload,
    popularityPayload,
    registry,
    registryIds,
    registryById,
    krByKey,
    prByKey,
    legacyIndex,
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
        withPopularityRecord: 0,
        withLegacyPopularity: 0,
        withAttributableSources: 0,
        legacyRowCount: 0,
      });
    }
    const group = groups.get(value);
    group.totalEntities += 1;
    if (entity.hasPopularityRecord) group.withPopularityRecord += 1;
    if (entity.hasLegacyPopularity) group.withLegacyPopularity += 1;
    if (entity.sourceCount > 0) group.withAttributableSources += 1;
    group.legacyRowCount += entity.legacyRowCount;
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      popularityRecordCoveragePct: pct(group.withPopularityRecord, group.totalEntities),
      legacyCoveragePct: pct(group.withLegacyPopularity, group.totalEntities),
      attributableCoveragePct: pct(group.withAttributableSources, group.totalEntities),
    }))
    .sort((a, b) => b.totalEntities - a.totalEntities || a.value.localeCompare(b.value));
}

function buildCountryCoverage(entities, legacyIndex) {
  const countryStats = {};
  for (const country of LEGACY_COUNTRIES) {
    countryStats[country] = {
      country,
      entitiesWithLegacyRows: 0,
      entitiesWithAttributableSource: 0,
      legacyRowCount: 0,
    };
  }

  for (const entity of entities) {
    for (const country of entity.legacyCountries) {
      if (!countryStats[country]) {
        countryStats[country] = {
          country,
          entitiesWithLegacyRows: 0,
          entitiesWithAttributableSource: 0,
          legacyRowCount: 0,
        };
      }
      countryStats[country].entitiesWithLegacyRows += 1;
      countryStats[country].legacyRowCount += entity.legacyRowCount;
      if (entity.attributableLegacyCountries.includes(country)) {
        countryStats[country].entitiesWithAttributableSource += 1;
      }
    }
  }

  return Object.values(countryStats).sort((a, b) => a.country.localeCompare(b.country));
}

function validateIntegrity(ctx) {
  const errors = [];
  const { popularityPayload, registryIds, prByKey, legacyIndex } = ctx;

  const prNames = (popularityPayload?.records || []).map((row) => normalizeKey(row.name));
  if (new Set(prNames).size !== prNames.length) errors.push('Duplicate Popularity Record names detected.');

  const sortedNames = [...prNames].sort((a, b) => a.localeCompare(b));
  if (prNames.join('\n') !== sortedNames.join('\n')) {
    errors.push('Popularity Records are not deterministically sorted by name.');
  }

  for (const row of popularityPayload?.records || []) {
    for (const sourceId of row.popularity?.sources || []) {
      if (!registryIds.has(sourceId)) errors.push(`Broken source ID ${sourceId} on ${row.name}`);
    }
    for (const [country, region] of Object.entries(row.popularity?.regions || {})) {
      if (region.sourceId && !registryIds.has(region.sourceId)) {
        errors.push(`Broken region source ID ${region.sourceId} on ${row.name}.${country}`);
      }
    }
  }

  for (const [key, legacy] of legacyIndex.byNameKey.entries()) {
    const pr = prByKey.get(key);
    if (legacy.rows.length > 0 && !pr) {
      errors.push(`Legacy popularity rows exist without Popularity Record: ${legacy.name}`);
    }
  }

  return {
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    errors,
    checks: {
      noBrokenSourceIds: !errors.some((msg) => msg.includes('Broken source ID') || msg.includes('Broken region source ID')),
      deterministicOrdering: !errors.some((msg) => msg.includes('deterministically sorted')),
      duplicateFreeEntityReferences: !errors.some((msg) => msg.includes('Duplicate Popularity Record')),
      registryConsistency: !errors.some((msg) => msg.includes('Broken source ID') || msg.includes('Broken region source ID')),
    },
  };
}

function buildCoverageReport(ctx, options = {}) {
  const generatedAt = resolveGeneratedAt(options);
  const { entities, popularityPayload, registry, legacyIndex } = ctx;

  const totalEntities = entities.length;
  const popularityRecords = popularityPayload?.records?.length || 0;
  const legacyRows = legacyIndex.legacyRows.length;
  const withPopularityRecord = entities.filter((row) => row.hasPopularityRecord);
  const withLegacyPopularity = entities.filter((row) => row.hasLegacyPopularity);
  const withAttributableSources = entities.filter((row) => row.sourceCount > 0);
  const withKciPopularity = entities.filter((row) => row.kciPopularityScore > 0);
  const sourceCounts = withPopularityRecord.map((row) => row.sourceCount);

  const allSourceIds = new Set();
  const sourceUsage = new Map();
  const regionUsage = new Map();

  for (const row of popularityPayload?.records || []) {
    for (const sourceId of row.popularity?.sources || []) {
      allSourceIds.add(sourceId);
      sourceUsage.set(sourceId, (sourceUsage.get(sourceId) || 0) + 1);
    }
    for (const [country, region] of Object.entries(row.popularity?.regions || {})) {
      regionUsage.set(country, (regionUsage.get(country) || 0) + 1);
      if (region.sourceId) allSourceIds.add(region.sourceId);
    }
  }

  const distribution = Object.fromEntries(SOURCE_BUCKETS.map((bucket) => [bucket.key, 0]));
  for (const entity of entities) {
    distribution[bucketSourceCount(entity.sourceCount)] += 1;
  }

  const duplicateSourceUsage = [...sourceUsage.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id, usageCount]) => ({ id, usageCount }));

  const unusedSources = [...ctx.registryIds].filter((id) => !allSourceIds.has(id));
  const unresolvedAuthorities = popularityPayload?.stats?.unresolvedAuthorities || [];

  return {
    phase: '14A',
    title: 'Popularity Coverage Snapshot',
    generatedAt,
    baselineReference: 'popularity-records-v1',
    readOnly: true,
    measurementOnly: true,
    overall: {
      totalEntities,
      totalPopularityRecords: popularityRecords,
      totalLegacyPopularityRows: legacyRows,
      entitiesWithPopularityRecords: withPopularityRecord.length,
      entitiesWithoutPopularityRecords: totalEntities - withPopularityRecord.length,
      popularityRecordCoveragePct: pct(withPopularityRecord.length, totalEntities),
      entitiesWithLegacyPopularity: withLegacyPopularity.length,
      legacyPopularityCoveragePct: pct(withLegacyPopularity.length, totalEntities),
      entitiesWithAttributableSources: withAttributableSources.length,
      attributableSourceCoveragePct: pct(withAttributableSources.length, totalEntities),
      entitiesWithKciPopularityPoints: withKciPopularity.length,
      kciPopularityCoveragePct: pct(withKciPopularity.length, totalEntities),
      totalSourcesReferenced: allSourceIds.size,
      averageSourcesPerPopularityRecord: withPopularityRecord.length
        ? Number((sourceCounts.reduce((sum, n) => sum + n, 0) / withPopularityRecord.length).toFixed(2))
        : 0,
      medianSourcesPerEntity: Number(median(sourceCounts).toFixed(2)),
      maximumSourcesOnSingleEntity: sourceCounts.length ? Math.max(...sourceCounts) : 0,
      entitiesWithZeroSources: entities.filter((row) => row.sourceCount === 0).length,
      entitiesWithSingleSource: entities.filter((row) => row.sourceCount === 1).length,
      unresolvedLegacyRows: popularityPayload?.stats?.registryUnattributableRows ?? 0,
    },
    coverageByDimension: {
      gender: buildCoverageByDimension(entities, 'gender'),
      language: buildCoverageByDimension(entities, 'language'),
      originCountry: buildCoverageByDimension(entities, 'originCountry'),
    },
    countryCoverage: buildCountryCoverage(entities, legacyIndex),
    distribution,
    registryQuality: {
      registrySourceCount: registry.sources?.length || 0,
      referencedSourceCount: allSourceIds.size,
      unusedSources,
      orphanRegistryEntries: unusedSources.length,
      registryUtilizationPct: pct(allSourceIds.size, registry.sources?.length || 0),
      unresolvedAuthorities,
      duplicateSourceUsage,
      topSourcesByUsage: duplicateSourceUsage.slice(0, 10),
      regionalConcentration: [...regionUsage.entries()]
        .map(([country, entityCount]) => ({ country, entityCount }))
        .sort((a, b) => b.entityCount - a.entityCount),
    },
    integrity: validateIntegrity(ctx),
  };
}

function computePriorityScore(entity) {
  const reasons = [];
  let score = 0;

  if (!entity.hasPopularityRecord) {
    score += 100;
    reasons.push('no_popularity_record');
  }

  if (entity.hasLegacyPopularity && entity.unresolvedLegacyCountries.length > 0) {
    score += 80;
    reasons.push('unresolved_legacy_authority');
  }

  if (entity.hasLegacyPopularity && entity.sourceCount === 0) {
    score += 70;
    reasons.push('legacy_data_without_attribution');
  }

  if (entity.kciPopularityScore === 0 && entity.hasKnowledgeRecord) {
    score += 50;
    reasons.push('researched_without_popularity_points');
  }

  if (entity.hasKnowledgeRecord) {
    score += 25;
    reasons.push('knowledge_record_present');
  }

  if (entity.sourceCount === 1) {
    score += 20;
    reasons.push('single_source_only');
  }

  if (entity.kci < 40) {
    score += 15;
    reasons.push('low_kci');
  }

  if (entity.originCountry && !entity.legacyCountries.includes(entity.originCountry)) {
    score += 12;
    reasons.push('origin_country_without_popularity');
  }

  return { score, reasons: [...new Set(reasons)] };
}

function buildGapAnalysisReport(ctx, coverageReport, options = {}) {
  const generatedAt = options.generatedAt || coverageReport.generatedAt || resolveGeneratedAt(options);
  const { entities, registryById } = ctx;

  const ranked = entities
    .map((entity) => {
      const priority = computePriorityScore(entity);
      return {
        slug: entity.slug,
        name: entity.name,
        currentSourceCount: entity.sourceCount,
        legacyRowCount: entity.legacyRowCount,
        legacyCountries: entity.legacyCountries,
        unresolvedLegacyCountries: entity.unresolvedLegacyCountries,
        hasPopularityRecord: entity.hasPopularityRecord,
        hasKnowledgeRecord: entity.hasKnowledgeRecord,
        currentKci: entity.kci,
        kciPopularityScore: entity.kciPopularityScore,
        originCountry: entity.originCountry,
        language: entity.language,
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
        groups.set(value, { value, count: 0, totalPriority: 0, entities: [] });
      }
      const group = groups.get(value);
      group.count += 1;
      group.totalPriority += row.priorityScore;
      if (group.entities.length < 5) group.entities.push(row.slug);
    }
    return [...groups.values()]
      .map((group) => ({
        ...group,
        averagePriority: Number((group.totalPriority / group.count).toFixed(2)),
      }))
      .sort((a, b) => b.averagePriority - a.averagePriority || b.count - a.count)
      .slice(0, 20);
  }

  const popularityDeserts = ranked
    .filter((row) => row.currentSourceCount === 0)
    .slice(0, 25)
    .map((row) => ({ slug: row.slug, name: row.name, priorityScore: row.priorityScore }));

  const sourceUsage = coverageReport.registryQuality.duplicateSourceUsage;
  const totalUsage = sourceUsage.reduce((sum, row) => sum + row.usageCount, 0);
  const topSourceUsage = sourceUsage.slice(0, 1).reduce((sum, row) => sum + row.usageCount, 0);

  const publisherCounts = new Map();
  for (const [id, entry] of registryById.entries()) {
    const publisher = entry.publisher || 'Unknown';
    const usage = sourceUsage.find((row) => row.id === id)?.usageCount || 0;
    publisherCounts.set(publisher, (publisherCounts.get(publisher) || 0) + usage);
  }

  const registryCountries = [...new Set((ctx.registry.sources || []).map((row) => row.country).filter(Boolean))];
  const legacyCountrySet = new Set(entities.flatMap((entity) => entity.legacyCountries));
  const mostCommonMissingCountries = registryCountries
    .filter((country) => !legacyCountrySet.has(country))
    .map((country) => ({ country, entitiesWithLegacyRows: 0, legacyRowCount: 0 }))
    .concat(coverageReport.countryCoverage.filter((row) => row.entitiesWithLegacyRows === 0))
    .sort((a, b) => a.country.localeCompare(b.country));

  return {
    phase: '14A',
    title: 'Popularity Gap Analysis & Prioritization',
    generatedAt,
    baselineReference: 'popularity-records-v1',
    readOnly: true,
    planningReport: true,
    methodology: {
      priorityScoreFactors: [
        'no_popularity_record',
        'unresolved_legacy_authority',
        'legacy_data_without_attribution',
        'researched_without_popularity_points',
        'knowledge_record_present',
        'single_source_only',
        'low_kci',
        'origin_country_without_popularity',
      ],
      note: 'Priority scores are computed at audit time only and are not persisted to KCI or Popularity Records.',
    },
    top100HighestPriority: top100,
    gapSummaries: {
      highestPriorityOrigins: aggregateBy('originCountry'),
      highestPriorityLanguages: aggregateBy('language'),
      highestPriorityGenders: aggregateBy('gender'),
      largestPopularityDeserts: popularityDeserts,
      entitiesWithUnresolvedLegacyAuthority: ranked.filter((row) => row.unresolvedLegacyCountries.length > 0),
      mostCommonMissingCountries,
    },
    diversityAnalysis: {
      sourceConcentration: {
        topSourceUsagePct: pct(topSourceUsage, totalUsage),
        topSource: sourceUsage[0] || null,
      },
      publisherDiversity: [...publisherCounts.entries()]
        .map(([publisher, usageCount]) => ({ publisher, usageCount }))
        .sort((a, b) => b.usageCount - a.usageCount),
      regionalConcentration: coverageReport.registryQuality.regionalConcentration,
      sourceReuse: sourceUsage,
    },
    totals: {
      entitiesRanked: ranked.length,
      zeroSourceEntities: ranked.filter((row) => row.currentSourceCount === 0).length,
      singleSourceEntities: ranked.filter((row) => row.currentSourceCount === 1).length,
      unresolvedLegacyEntities: ranked.filter((row) => row.unresolvedLegacyCountries.length > 0).length,
    },
  };
}

function hashFrozenArtifacts() {
  const knowledgePayload = loadKnowledgeRecordsPayload();
  const citationRecords = loadJson(path.join(DATA_DIR, 'citation-records.json'), {});
  const popularityRegistry = loadJson(POPULARITY_PATHS.registry, {});
  const popularityRecords = loadPopularityRecordsPayload();
  const kciReport = loadJson(path.join(AUDIT_DIR, 'knowledge-completeness.json'), {});

  return {
    knowledgeRecords: stableHash({ schemaVersion: knowledgePayload.schemaVersion, records: knowledgePayload.records }),
    citationRecords: stableHash({
      schemaVersion: citationRecords.schemaVersion,
      records: citationRecords.records,
    }),
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
  SOURCE_BUCKETS,
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
};
