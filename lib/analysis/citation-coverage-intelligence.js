/**
 * lib/analysis/citation-coverage-intelligence.js
 * Phase 13A — Read-only citation coverage measurement and gap analysis.
 *
 * No Citation Record, Registry, Knowledge Record, or KCI mutations.
 */

const fs = require('fs');
const path = require('path');
const {
  DOMAINS,
  loadJson,
  loadKnowledgeRecordsPayload,
  normalizeKey,
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

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const AUDIT_DIR = path.join(ROOT, 'audit');

const PUBLICATION_BUCKETS = [
  { key: '0', min: 0, max: 0 },
  { key: '1', min: 1, max: 1 },
  { key: '2', min: 2, max: 2 },
  { key: '3-5', min: 3, max: 5 },
  { key: '6-10', min: 6, max: 10 },
  { key: '10+', min: 11, max: Infinity },
];

function loadNamesUniverse() {
  const names = loadJson(path.join(DATA_DIR, 'names.json'), []);
  const normalized = loadJson(path.join(DATA_DIR, 'normalized-names.json'), []);
  const popularity = loadJson(path.join(DATA_DIR, 'popularity.json'), []);
  const variants = loadJson(path.join(DATA_DIR, 'variants.json'), []);

  const normalizedById = new Map(normalized.map((row) => [row.id, row]));
  const popularityByNameId = new Set(popularity.map((row) => row.name_id));
  const variantsByNameId = new Set(variants.map((row) => row.name_id));

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
      hasSpellingVariants: Array.isArray(norm.spelling_variants) && norm.spelling_variants.length > 0,
      hasVariantRecord: variantsByNameId.has(row.id),
      hasPopularity: popularityByNameId.has(row.id),
    };
  });
}

function loadKciIndex() {
  const report = loadJson(path.join(AUDIT_DIR, 'knowledge-completeness.json'), { entities: [] });
  return new Map((report.entities || []).map((row) => [row.slug, row]));
}

function countUniquePublications(citations = {}) {
  const ids = new Set();
  for (const domain of DOMAINS) {
    for (const id of citations[domain] || []) ids.add(id);
  }
  return ids.size;
}

function citedDomainsForRecord(citations = {}) {
  return DOMAINS.filter((domain) => Array.isArray(citations[domain]) && citations[domain].length > 0);
}

function uncitedPopulatedDomains(kr, citations = {}) {
  const uncited = [];
  for (const domain of DOMAINS) {
    if (!isDomainPopulated(kr, domain)) continue;
    const ids = citations[domain];
    if (!Array.isArray(ids) || ids.length === 0) uncited.push(domain);
  }
  return uncited;
}

function missingEditorialDomains(kr, entity) {
  const missing = [];
  if (!isDomainPopulated(kr, 'origin')) missing.push('origin');
  if (!isDomainPopulated(kr, 'meaning')) missing.push('meaning');
  if (!isDomainPopulated(kr, 'pronunciation')) missing.push('pronunciation');
  if (!isDomainPopulated(kr, 'etymology')) missing.push('etymology');
  if (!isDomainPopulated(kr, 'history')) missing.push('history');
  if (!entity.hasSpellingVariants && !entity.hasVariantRecord) missing.push('variants');
  return missing;
}

function bucketPublicationCount(count) {
  for (const bucket of PUBLICATION_BUCKETS) {
    if (count >= bucket.min && count <= bucket.max) return bucket.key;
  }
  return '10+';
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function pct(count, total) {
  if (!total) return 0;
  return Number(((count / total) * 100).toFixed(2));
}

function buildEntityIndex() {
  const universe = loadNamesUniverse();
  const kciBySlug = loadKciIndex();
  const knowledgePayload = loadKnowledgeRecordsPayload();
  const citationPayload = loadCitationRecordsPayload();
  const registry = loadJson(CITATION_PATHS.registry, { citations: [] });

  const krByKey = new Map((knowledgePayload.records || []).map((row) => [normalizeKey(row.name), row]));
  const crByKey = new Map((citationPayload?.records || []).map((row) => [normalizeKey(row.name), row]));

  const registryIds = new Set((registry.citations || []).map((row) => row.id));
  const registryById = new Map((registry.citations || []).map((row) => [row.id, row]));

  const entities = universe.map((entity) => {
    const key = normalizeKey(entity.name);
    const kr = krByKey.get(key) || null;
    const cr = crByKey.get(key) || null;
    const citations = cr?.citations || {};
    const publicationCount = countUniquePublications(citations);
    const kci = kciBySlug.get(entity.slug) || { score: 0, breakdown: {} };

    return {
      ...entity,
      key,
      hasKnowledgeRecord: Boolean(kr),
      hasCitationRecord: Boolean(cr),
      publicationCount,
      citedDomains: citedDomainsForRecord(citations),
      uncitedDomains: kr ? uncitedPopulatedDomains(kr, citations) : [],
      missingEditorialDomains: kr ? missingEditorialDomains(kr, entity) : DOMAINS.concat(['variants']),
      kci: kci.score ?? 0,
      kciBreakdown: kci.breakdown || {},
      knowledgeRecord: kr,
      citationRecord: cr,
      citations,
    };
  });

  return {
    universe,
    entities,
    knowledgePayload,
    citationPayload,
    registry,
    registryIds,
    registryById,
    krByKey,
    crByKey,
  };
}

function resolveGeneratedAt(options = {}) {
  if (options.generatedAt) return options.generatedAt;
  const citationPayload = loadCitationRecordsPayload();
  if (citationPayload?.generatedAt) return citationPayload.generatedAt;
  const kciReport = loadJson(path.join(AUDIT_DIR, 'knowledge-completeness.json'), null);
  if (kciReport?.generatedAt) return kciReport.generatedAt;
  return '1970-01-01T00:00:00.000Z';
}

function buildCoverageReport(ctx, options = {}) {
  const generatedAt = resolveGeneratedAt(options);
  const { entities, knowledgePayload, citationPayload, registry, registryIds } = ctx;
  const totalEntities = entities.length;
  const knowledgeRecords = knowledgePayload.records?.length || 0;
  const citationRecords = citationPayload?.records?.length || 0;
  const citedEntities = entities.filter((row) => row.hasCitationRecord);
  const publicationCounts = citedEntities.map((row) => row.publicationCount);
  const allPublicationIds = new Set();
  const publicationUsage = new Map();

  for (const row of citationPayload?.records || []) {
    for (const domain of DOMAINS) {
      for (const id of row.citations?.[domain] || []) {
        allPublicationIds.add(id);
        publicationUsage.set(id, (publicationUsage.get(id) || 0) + 1);
      }
    }
  }

  const domainCoverage = {};
  for (const domain of DOMAINS) {
    let populated = 0;
    let withCitations = 0;
    let publicationTotal = 0;

    for (const entity of entities) {
      if (!entity.knowledgeRecord) continue;
      if (!isDomainPopulated(entity.knowledgeRecord, domain)) continue;
      populated += 1;
      const ids = entity.citations[domain] || [];
      if (ids.length > 0) {
        withCitations += 1;
        publicationTotal += ids.length;
      }
    }

    domainCoverage[domain] = {
      entitiesWithEditorial: populated,
      entitiesWithCitations: withCitations,
      entitiesWithoutCitations: populated - withCitations,
      coveragePct: pct(withCitations, populated),
      averagePublications: populated ? Number((publicationTotal / populated).toFixed(2)) : 0,
    };
  }

  const variantsEditorial = entities.filter(
    (row) => row.hasSpellingVariants || row.hasVariantRecord || (row.kciBreakdown?.variants ?? 0) > 0,
  ).length;
  domainCoverage.variants = {
    entitiesWithEditorial: variantsEditorial,
    entitiesWithCitations: null,
    entitiesWithoutCitations: null,
    coveragePct: pct(variantsEditorial, totalEntities),
    averagePublications: null,
    note: 'Variants are editorial-only in Citation Records v1; citations are not domain-mapped for variants.',
  };

  const distribution = Object.fromEntries(PUBLICATION_BUCKETS.map((bucket) => [bucket.key, 0]));
  for (const entity of entities) {
    distribution[bucketPublicationCount(entity.publicationCount)] += 1;
  }

  const unusedPublications = [...registryIds].filter((id) => !allPublicationIds.has(id));
  const duplicatePublicationUsage = [...publicationUsage.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id, usageCount]) => ({ id, usageCount }));

  const integrity = validateIntegrity(ctx);

  return {
    phase: '13A',
    title: 'Citation Coverage Snapshot',
    generatedAt,
    baselineReference: 'citation-records-v1',
    readOnly: true,
    measurementOnly: true,
    overall: {
      totalEntities,
      totalKnowledgeRecords: knowledgeRecords,
      totalCitationRecords: citationRecords,
      entitiesWithCitations: citedEntities.length,
      entitiesWithoutCitations: totalEntities - citedEntities.length,
      citationCoveragePct: pct(citedEntities.length, totalEntities),
      knowledgeRecordCitationCoveragePct: pct(citationRecords, knowledgeRecords),
      totalPublicationsReferenced: allPublicationIds.size,
      averagePublicationsPerCitedEntity: citedEntities.length
        ? Number((publicationCounts.reduce((sum, n) => sum + n, 0) / citedEntities.length).toFixed(2))
        : 0,
      medianPublicationsPerEntity: Number(median(publicationCounts).toFixed(2)),
      maximumPublicationsOnSingleEntity: publicationCounts.length ? Math.max(...publicationCounts) : 0,
      entitiesWithZeroPublications: entities.filter((row) => row.publicationCount === 0).length,
      entitiesWithOnePublication: entities.filter((row) => row.publicationCount === 1).length,
    },
    domainCoverage,
    distribution,
    registryQuality: {
      registryPublicationCount: registry.citations?.length || 0,
      referencedPublicationCount: allPublicationIds.size,
      unusedPublications,
      orphanRegistryEntries: unusedPublications.length,
      registryUtilizationPct: pct(allPublicationIds.size, registry.citations?.length || 0),
      duplicatePublicationUsage,
      topPublicationsByUsage: duplicatePublicationUsage.slice(0, 10),
    },
    integrity,
  };
}

function validateIntegrity(ctx) {
  const errors = [];
  const { citationPayload, registryIds, crByKey, knowledgePayload, krByKey } = ctx;

  const krNames = (knowledgePayload.records || []).map((row) => normalizeKey(row.name));
  if (new Set(krNames).size !== krNames.length) errors.push('Duplicate Knowledge Record names detected.');

  const crNames = (citationPayload?.records || []).map((row) => normalizeKey(row.name));
  if (new Set(crNames).size !== crNames.length) errors.push('Duplicate Citation Record names detected.');

  const sortedNames = [...crNames].sort((a, b) => a.localeCompare(b));
  if (crNames.join('\n') !== sortedNames.join('\n')) {
    errors.push('Citation Records are not deterministically sorted by name.');
  }

  for (const row of citationPayload?.records || []) {
    for (const domain of DOMAINS) {
      for (const id of row.citations?.[domain] || []) {
        if (!registryIds.has(id)) errors.push(`Broken publication ID ${id} on ${row.name}.${domain}`);
      }
      const ids = row.citations?.[domain] || [];
      const unique = new Set(ids);
      if (unique.size !== ids.length) errors.push(`Duplicate publication IDs on ${row.name}.${domain}`);
    }
  }

  for (const key of krByKey.keys()) {
    if (!crByKey.has(key)) errors.push(`Knowledge Record without Citation Record: ${key}`);
  }

  return {
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    errors,
    checks: {
      noBrokenPublicationIds: !errors.some((msg) => msg.includes('Broken publication ID')),
      deterministicOrdering: !errors.some((msg) => msg.includes('deterministically sorted')),
      duplicateFreeEntityReferences: !errors.some((msg) => msg.includes('Duplicate Citation Record')),
      registryConsistency: !errors.some((msg) => msg.includes('Broken publication ID')),
    },
  };
}

function computePriorityScore(entity) {
  const reasons = [];
  let score = 0;

  if (!entity.hasCitationRecord) {
    score += 120;
    reasons.push('zero_citations');
  } else if (entity.publicationCount === 1) {
    score += 45;
    reasons.push('single_publication');
  }

  if (entity.kci < 30) {
    score += 25;
    reasons.push('low_kci');
  }

  if (entity.hasKnowledgeRecord && entity.uncitedDomains.length > 0) {
    score += entity.uncitedDomains.length * 12;
    reasons.push('uncited_editorial_domains');
  }

  if (entity.missingEditorialDomains.length > 0) {
    score += entity.missingEditorialDomains.length * 8;
    reasons.push('missing_editorial_domains');
  }

  if (entity.hasPopularity) {
    score += 18;
    reasons.push('popularity_available');
  }

  if (entity.hasKnowledgeRecord && entity.citedDomains.length >= 2 && entity.publicationCount <= 2) {
    score += 20;
    reasons.push('low_publication_diversity');
  }

  if (entity.hasKnowledgeRecord) {
    score += 10;
    reasons.push('knowledge_record_present');
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
        currentPublicationCount: entity.publicationCount,
        citedDomains: entity.citedDomains,
        uncitedDomains: entity.uncitedDomains,
        missingEditorialDomains: entity.missingEditorialDomains,
        currentKci: entity.kci,
        priorityScore: priority.score,
        priorityReasons: priority.reasons,
        originCountry: entity.originCountry,
        language: entity.language,
        originCluster: entity.originCluster,
        gender: entity.gender,
        hasPopularity: entity.hasPopularity,
        hasKnowledgeRecord: entity.hasKnowledgeRecord,
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
      if (!groups.has(value)) groups.set(value, { value, count: 0, totalPriority: 0, entities: [] });
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

  const missingDomainCounts = {};
  for (const domain of DOMAINS.concat(['variants'])) missingDomainCounts[domain] = 0;
  for (const entity of entities) {
    for (const domain of entity.uncitedDomains) missingDomainCounts[domain] = (missingDomainCounts[domain] || 0) + 1;
    for (const domain of entity.missingEditorialDomains) {
      missingDomainCounts[domain] = (missingDomainCounts[domain] || 0) + 1;
    }
  }

  const publicationUsage = coverageReport.registryQuality.duplicatePublicationUsage;
  const totalUsage = publicationUsage.reduce((sum, row) => sum + row.usageCount, 0);
  const topThreeUsage = publicationUsage.slice(0, 3).reduce((sum, row) => sum + row.usageCount, 0);
  const publisherCounts = new Map();
  for (const [id, entry] of registryById.entries()) {
    const publisher = entry.publisher || 'Unknown';
    const usage = publicationUsage.find((row) => row.id === id)?.usageCount || 0;
    publisherCounts.set(publisher, (publisherCounts.get(publisher) || 0) + usage);
  }

  const citationDeserts = ranked
    .filter((row) => row.currentPublicationCount === 0)
    .slice(0, 25)
    .map((row) => ({ slug: row.slug, name: row.name, priorityScore: row.priorityScore }));

  return {
    phase: '13A',
    title: 'Citation Gap Analysis & Prioritization',
    generatedAt,
    baselineReference: 'citation-records-v1',
    readOnly: true,
    planningReport: true,
    methodology: {
      priorityScoreFactors: [
        'zero_citations',
        'single_publication',
        'low_kci',
        'uncited_editorial_domains',
        'missing_editorial_domains',
        'popularity_available',
        'low_publication_diversity',
        'knowledge_record_present',
      ],
      note: 'Priority scores are computed at audit time only and are not persisted to KCI or editorial data.',
    },
    top100HighestPriority: top100,
    gapSummaries: {
      highestPriorityOrigins: aggregateBy('originCountry'),
      highestPriorityLanguages: aggregateBy('language'),
      highestPriorityCultures: aggregateBy('originCluster'),
      highestPriorityGenders: aggregateBy('gender'),
      mostCommonMissingCitationDomains: Object.entries(missingDomainCounts)
        .map(([domain, count]) => ({ domain, count }))
        .sort((a, b) => b.count - a.count),
      largestCitationDeserts: citationDeserts,
    },
    diversityAnalysis: {
      publicationConcentration: {
        topThreePublicationsUsagePct: pct(topThreeUsage, totalUsage),
        topPublication: publicationUsage[0] || null,
      },
      publisherDiversity: [...publisherCounts.entries()]
        .map(([publisher, usageCount]) => ({ publisher, usageCount }))
        .sort((a, b) => b.usageCount - a.usageCount),
      publicationReuse: publicationUsage.slice(0, 15),
      domainDiversity: Object.entries(coverageReport.domainCoverage)
        .filter(([domain]) => domain !== 'variants')
        .map(([domain, stats]) => ({
          domain,
          entitiesWithCitations: stats.entitiesWithCitations,
          averagePublications: stats.averagePublications,
        })),
    },
    totals: {
      entitiesRanked: ranked.length,
      zeroCitationEntities: ranked.filter((row) => row.currentPublicationCount === 0).length,
      singlePublicationEntities: ranked.filter((row) => row.currentPublicationCount === 1).length,
    },
  };
}

function hashFrozenArtifacts() {
  const knowledgePayload = loadKnowledgeRecordsPayload();
  const citationRegistry = loadJson(CITATION_PATHS.registry, {});
  const citationRecords = loadCitationRecordsPayload();
  const kciReport = loadJson(path.join(AUDIT_DIR, 'knowledge-completeness.json'), {});

  return {
    knowledgeRecords: stableHash({ schemaVersion: knowledgePayload.schemaVersion, records: knowledgePayload.records }),
    citationRegistry: stableHash({
      schemaVersion: citationRegistry.schemaVersion,
      citations: citationRegistry.citations,
    }),
    citationRecords: citationRecords ? hashCitationRecordsSemantic(citationRecords) : null,
    kciReport: stableHash({
      entityCount: kciReport.entityCount,
      summary: kciReport.summary,
      entities: kciReport.entities,
    }),
  };
}

module.exports = {
  DOMAINS,
  PUBLICATION_BUCKETS,
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
