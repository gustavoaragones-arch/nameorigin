/**
 * lib/analysis/relationship-engine.js — Phase 17A Knowledge Graph & Relationship Engine v1.
 *
 * Deterministic read-only relationship computation from canonical entities.
 * Does not modify Knowledge Records, Citation Records, Popularity Records, or KCI.
 */

const crypto = require('crypto');
const { isFallbackMarker } = require('../render/meaning.js');

const GRAPH_VERSION = '17A-v1';

const RELATIONSHIP_TYPES = Object.freeze([
  'HAS_VARIANT',
  'SAME_ORIGIN',
  'SAME_LANGUAGE',
  'RELATED_MEANING',
  'SIMILAR_PRONUNCIATION',
  'SAME_CULTURAL_GROUP',
]);

const CONFIDENCE_LEVELS = Object.freeze(['exact', 'strong', 'moderate', 'weak']);

/** Groups larger than this use star topology (hub = lexicographically first slug). */
const MAX_FULL_CLIQUE = 30;

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizePronunciation(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function normalizeKey(name) {
  return String(name || '').trim().toLowerCase();
}

function canonicalPair(slugA, slugB) {
  return slugA.localeCompare(slugB) <= 0 ? [slugA, slugB] : [slugB, slugA];
}

function edgeId(relationshipType, source, target) {
  const [a, b] = canonicalPair(source, target);
  return `${relationshipType}:${a}:${b}`;
}

function sortEdges(edges) {
  return [...edges].sort((left, right) => {
    if (left.relationshipType !== right.relationshipType) {
      return left.relationshipType.localeCompare(right.relationshipType);
    }
    if (left.source !== right.source) return left.source.localeCompare(right.source);
    return left.target.localeCompare(right.target);
  });
}

function pairsFromGroup(slugs) {
  const sorted = [...slugs].sort((a, b) => a.localeCompare(b));
  if (sorted.length <= 1) return [];

  if (sorted.length <= MAX_FULL_CLIQUE) {
    const pairs = [];
    for (let i = 0; i < sorted.length; i += 1) {
      for (let j = i + 1; j < sorted.length; j += 1) {
        pairs.push([sorted[i], sorted[j]]);
      }
    }
    return pairs;
  }

  const hub = sorted[0];
  return sorted.slice(1).map((slug) => [hub, slug]);
}

function buildIndexes(entities) {
  const slugSet = new Set();
  const nameToSlug = new Map();

  for (const entity of entities) {
    const slug = entity.identity.slug;
    slugSet.add(slug);
    nameToSlug.set(normalizeKey(entity.identity.name), slug);
  }

  return { slugSet, nameToSlug };
}

function buildNodes(entities) {
  return entities
    .map((entity) => ({
      kind: 'entity',
      slug: entity.identity.slug,
      displayName: entity.identity.name,
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

function makeEdge({ source, target, relationshipType, confidence, derivedFrom, explanation }) {
  return {
    id: edgeId(relationshipType, source, target),
    source,
    target,
    relationshipType,
    confidence,
    derivedFrom,
    explanation,
    version: GRAPH_VERSION,
  };
}

function addGroupEdges(edges, groupedSlugs, relationshipType, confidence, derivedFrom, explanationForSlug) {
  for (const slugs of groupedSlugs.values()) {
    if (slugs.length < 2) continue;
    for (const [source, target] of pairsFromGroup(slugs)) {
      edges.push(
        makeEdge({
          source,
          target,
          relationshipType,
          confidence,
          derivedFrom,
          explanation: explanationForSlug(source),
        }),
      );
    }
  }
}

function buildVariantEdges(entities, indexes) {
  const edges = [];

  for (const entity of entities) {
    const variants = entity.variants?.spellingVariants || [];
    for (const variant of variants) {
      const targetSlug = indexes.nameToSlug.get(normalizeKey(variant.spelling));
      if (!targetSlug || targetSlug === entity.identity.slug) continue;

      edges.push(
        makeEdge({
          source: entity.identity.slug,
          target: targetSlug,
          relationshipType: 'HAS_VARIANT',
          confidence: 'exact',
          derivedFrom: ['variants.spellingVariants'],
          explanation: {
            variantSpelling: variant.spelling,
            variantLanguage: variant.language || null,
          },
        }),
      );
    }
  }

  return edges;
}

function buildSameOriginEdges(entities) {
  const byCluster = new Map();
  const byCountry = new Map();

  for (const entity of entities) {
    const slug = entity.identity.slug;
    const cluster = normalizeText(entity.origin?.cluster);
    const country = normalizeText(entity.origin?.country);

    if (cluster) {
      if (!byCluster.has(cluster)) byCluster.set(cluster, []);
      byCluster.get(cluster).push({ slug, cluster: entity.origin.cluster, country: entity.origin?.country || null });
    } else if (country) {
      if (!byCountry.has(country)) byCountry.set(country, []);
      byCountry.get(country).push({ slug, cluster: null, country: entity.origin.country });
    }
  }

  const edges = [];

  addGroupEdges(
    edges,
    new Map([...byCluster.entries()].map(([key, rows]) => [key, rows.map((row) => row.slug)])),
    'SAME_ORIGIN',
    'strong',
    ['origin.cluster'],
    (slug) => {
      const row = [...byCluster.values()].flat().find((entry) => entry.slug === slug);
      return { originCluster: row?.cluster || null, originCountry: row?.country || null };
    },
  );

  addGroupEdges(
    edges,
    new Map([...byCountry.entries()].map(([key, rows]) => [key, rows.map((row) => row.slug)])),
    'SAME_ORIGIN',
    'moderate',
    ['origin.country'],
    (slug) => {
      const row = [...byCountry.values()].flat().find((entry) => entry.slug === slug);
      return { originCountry: row?.country || null };
    },
  );

  return edges;
}

function buildSameLanguageEdges(entities) {
  const grouped = new Map();

  for (const entity of entities) {
    const language = normalizeText(entity.language?.primary);
    if (!language) continue;
    if (!grouped.has(language)) grouped.set(language, []);
    grouped.get(language).push({ slug: entity.identity.slug, language: entity.language.primary });
  }

  const edges = [];
  addGroupEdges(
    edges,
    new Map([...grouped.entries()].map(([key, rows]) => [key, rows.map((row) => row.slug)])),
    'SAME_LANGUAGE',
    'strong',
    ['language.primary'],
    (slug) => {
      const row = [...grouped.values()].flat().find((entry) => entry.slug === slug);
      return { language: row?.language || null };
    },
  );

  return edges;
}

function meaningClusterKey(meaningPrimary) {
  const normalized = normalizeText(meaningPrimary);
  if (!normalized || isFallbackMarker(meaningPrimary)) return null;
  const firstClause = normalized.split(';')[0].split(',')[0].trim();
  return firstClause || null;
}

function buildRelatedMeaningEdges(entities) {
  const exactGroups = new Map();
  const clusterGroups = new Map();

  for (const entity of entities) {
    const primary = entity.meaning?.primary;
    if (!primary || isFallbackMarker(primary)) continue;

    const slug = entity.identity.slug;
    const exactKey = normalizeText(primary);
    const clusterKey = meaningClusterKey(primary);
    if (!exactKey) continue;

    if (!exactGroups.has(exactKey)) exactGroups.set(exactKey, []);
    exactGroups.get(exactKey).push({ slug, meaning: primary });

    if (clusterKey && clusterKey !== exactKey) {
      if (!clusterGroups.has(clusterKey)) clusterGroups.set(clusterKey, []);
      clusterGroups.get(clusterKey).push({ slug, meaning: primary, cluster: clusterKey });
    }
  }

  const edges = [];

  addGroupEdges(
    edges,
    new Map([...exactGroups.entries()].map(([key, rows]) => [key, rows.map((row) => row.slug)])),
    'RELATED_MEANING',
    'exact',
    ['meaning.primary'],
    (slug) => {
      const row = [...exactGroups.values()].flat().find((entry) => entry.slug === slug);
      return { meaning: row?.meaning || null };
    },
  );

  addGroupEdges(
    edges,
    new Map([...clusterGroups.entries()].map(([key, rows]) => [key, rows.map((row) => row.slug)])),
    'RELATED_MEANING',
    'moderate',
    ['meaning.primary'],
    (slug) => {
      const row = [...clusterGroups.values()].flat().find((entry) => entry.slug === slug);
      return { meaningCluster: row?.cluster || null };
    },
  );

  return edges;
}

function buildSimilarPronunciationEdges(entities) {
  const grouped = new Map();

  for (const entity of entities) {
    const phonetic = entity.pronunciation?.phoneticSpelling;
    if (!phonetic || isFallbackMarker(phonetic)) continue;
    const key = normalizePronunciation(phonetic);
    if (!key) continue;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push({
      slug: entity.identity.slug,
      pronunciation: phonetic,
    });
  }

  const edges = [];
  addGroupEdges(
    edges,
    new Map([...grouped.entries()].map(([key, rows]) => [key, rows.map((row) => row.slug)])),
    'SIMILAR_PRONUNCIATION',
    'exact',
    ['pronunciation.phoneticSpelling'],
    (slug) => {
      const row = [...grouped.values()].flat().find((entry) => entry.slug === slug);
      return { pronunciation: row?.pronunciation || null };
    },
  );

  return edges;
}

function buildSameCulturalGroupEdges(entities) {
  const grouped = new Map();

  for (const entity of entities) {
    const cluster = normalizeText(entity.origin?.cluster);
    const country = normalizeText(entity.origin?.country);
    const language = normalizeText(entity.language?.primary);
    if (!cluster && !country && !language) continue;

    const key = [cluster || '*', country || '*', language || '*'].join('|');
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push({
      slug: entity.identity.slug,
      originCluster: entity.origin?.cluster || null,
      originCountry: entity.origin?.country || null,
      language: entity.language?.primary || null,
    });
  }

  const edges = [];
  addGroupEdges(
    edges,
    new Map([...grouped.entries()].map(([key, rows]) => [key, rows.map((row) => row.slug)])),
    'SAME_CULTURAL_GROUP',
    'moderate',
    ['origin.cluster', 'origin.country', 'language.primary'],
    (slug) => {
      const row = [...grouped.values()].flat().find((entry) => entry.slug === slug);
      return {
        originCluster: row?.originCluster || null,
        originCountry: row?.originCountry || null,
        language: row?.language || null,
      };
    },
  );

  return edges;
}

function dedupeEdges(edges) {
  const seen = new Map();
  for (const edge of edges) {
    const existing = seen.get(edge.id);
    if (!existing) {
      seen.set(edge.id, edge);
      continue;
    }
    const rank = { exact: 4, strong: 3, moderate: 2, weak: 1 };
    if (rank[edge.confidence] > rank[existing.confidence]) {
      seen.set(edge.id, edge);
    }
  }
  return sortEdges([...seen.values()]);
}

function buildAllEdges(entities, indexes) {
  const edges = dedupeEdges([
    ...buildVariantEdges(entities, indexes),
    ...buildSameOriginEdges(entities),
    ...buildSameLanguageEdges(entities),
    ...buildRelatedMeaningEdges(entities),
    ...buildSimilarPronunciationEdges(entities),
    ...buildSameCulturalGroupEdges(entities),
  ]);

  return edges.filter((edge) => edge.source !== edge.target);
}

function countByRelationshipType(edges) {
  const counts = Object.fromEntries(RELATIONSHIP_TYPES.map((type) => [type, 0]));
  for (const edge of edges) {
    counts[edge.relationshipType] = (counts[edge.relationshipType] || 0) + 1;
  }
  return counts;
}

function computeAverageDegree(nodeCount, edges) {
  if (!nodeCount) return 0;
  const degree = new Map();
  for (const edge of edges) {
    degree.set(edge.source, (degree.get(edge.source) || 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) || 0) + 1);
  }
  const total = [...degree.values()].reduce((sum, value) => sum + value, 0);
  return Number((total / nodeCount).toFixed(4));
}

function countDisconnectedComponents(nodes, edges) {
  const parent = new Map(nodes.map((node) => [node.slug, node.slug]));

  function find(slug) {
    let root = slug;
    while (parent.get(root) !== root) root = parent.get(root);
    let current = slug;
    while (parent.get(current) !== root) {
      const next = parent.get(current);
      parent.set(current, root);
      current = next;
    }
    return root;
  }

  function union(a, b) {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootB, rootA);
  }

  for (const edge of edges) union(edge.source, edge.target);

  const components = new Set(nodes.map((node) => find(node.slug)));
  return components.size;
}

function buildKnowledgeGraphReport(entities, generatedAt = new Date().toISOString()) {
  const indexes = buildIndexes(entities);
  const nodes = buildNodes(entities);
  const edges = buildAllEdges(entities, indexes);
  const relationshipCounts = countByRelationshipType(edges);

  return {
    generatedAt,
    phase: '17A',
    title: 'Knowledge Graph & Relationship Engine v1',
    baselineReference: 'editorial-architecture-v2',
    readOnly: true,
    graphVersion: GRAPH_VERSION,
    entityCount: entities.length,
    nodes,
    edges,
    metrics: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      averageDegree: computeAverageDegree(nodes.length, edges),
      relationshipCounts,
      disconnectedComponents: countDisconnectedComponents(nodes, edges),
    },
  };
}

function hashGraphSemantic(report) {
  return stableHash({
    graphVersion: report.graphVersion,
    entityCount: report.entityCount,
    nodes: report.nodes,
    edges: report.edges,
    metrics: report.metrics,
  });
}

function filterEdgesByType(edges, relationshipType) {
  return edges.filter((edge) => edge.relationshipType === relationshipType);
}

function validateKnowledgeGraph(report) {
  const errors = [];
  const slugSet = new Set(report.nodes.map((node) => node.slug));
  const edgeIds = new Set();

  if (report.nodes.length !== report.entityCount) {
    errors.push('Node count does not match entity count.');
  }

  for (const node of report.nodes) {
    if (!node.slug) errors.push('Encountered node without slug.');
    if (node.kind !== 'entity') errors.push(`Unexpected node kind: ${node.kind}`);
  }

  for (const edge of report.edges) {
    if (edge.source === edge.target) errors.push(`Self-link detected: ${edge.id}`);
    if (!slugSet.has(edge.source)) errors.push(`Orphan edge source: ${edge.source}`);
    if (!slugSet.has(edge.target)) errors.push(`Orphan edge target: ${edge.target}`);
    if (!RELATIONSHIP_TYPES.includes(edge.relationshipType)) {
      errors.push(`Unknown relationship type: ${edge.relationshipType}`);
    }
    if (!CONFIDENCE_LEVELS.includes(edge.confidence)) {
      errors.push(`Invalid confidence on edge ${edge.id}: ${edge.confidence}`);
    }
    if (edgeIds.has(edge.id)) errors.push(`Duplicate edge id: ${edge.id}`);
    edgeIds.add(edge.id);
    if (edge.id !== edgeId(edge.relationshipType, edge.source, edge.target)) {
      errors.push(`Edge id mismatch: ${edge.id}`);
    }
  }

  const sorted = sortEdges(report.edges);
  for (let i = 0; i < report.edges.length; i += 1) {
    const current = report.edges[i];
    const expected = sorted[i];
    if (
      current.id !== expected.id ||
      current.source !== expected.source ||
      current.target !== expected.target
    ) {
      errors.push('Edges are not in deterministic order.');
      break;
    }
  }

  return {
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    errorCount: errors.length,
    errors,
  };
}

module.exports = {
  GRAPH_VERSION,
  RELATIONSHIP_TYPES,
  CONFIDENCE_LEVELS,
  MAX_FULL_CLIQUE,
  normalizeKey,
  stableHash,
  buildIndexes,
  buildNodes,
  buildAllEdges,
  buildKnowledgeGraphReport,
  hashGraphSemantic,
  filterEdgesByType,
  validateKnowledgeGraph,
  sortEdges,
};
