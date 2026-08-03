/**
 * lib/navigation/navigation-engine.js — Phase 17B Relationship Navigation Engine v1.
 *
 * Deterministic read-only navigation indexes derived exclusively from frozen
 * Knowledge Graph artifacts. Does not compute relationships, modify graph data,
 * or touch Knowledge Records, Citation Records, Popularity Records, or KCI.
 */

const crypto = require('crypto');

const NAVIGATION_VERSION = '17B-v1';
const MAX_RELATED_PER_TYPE = 25;
const MAX_GROUP_MEMBERS = 25;

const CONFIDENCE_RANK = Object.freeze({
  exact: 0,
  strong: 1,
  moderate: 2,
  weak: 3,
});

const EXPLORER_RELATIONSHIP_TYPES = Object.freeze([
  'SAME_ORIGIN',
  'SAME_LANGUAGE',
  'RELATED_MEANING',
  'SIMILAR_PRONUNCIATION',
  'SAME_CULTURAL_GROUP',
]);

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

function compareConfidence(left, right) {
  const rankLeft = CONFIDENCE_RANK[left] ?? 99;
  const rankRight = CONFIDENCE_RANK[right] ?? 99;
  if (rankLeft !== rankRight) return rankLeft - rankRight;
  return 0;
}

function compareNavigationEntries(left, right) {
  const confidenceDiff = compareConfidence(left.confidence, right.confidence);
  if (confidenceDiff !== 0) return confidenceDiff;
  return left.target.localeCompare(right.target);
}

function sortEntries(entries) {
  return [...entries].sort(compareNavigationEntries);
}

function edgeToEntry(slug, edge) {
  const target = edge.source === slug ? edge.target : edge.source;
  return {
    target,
    relationship: edge.relationshipType,
    confidence: edge.confidence,
    derivedFrom: [...edge.derivedFrom],
    explanation: edge.explanation ? { ...edge.explanation } : null,
  };
}

function dedupeEntriesByTarget(entries) {
  const best = new Map();
  for (const entry of entries) {
    const existing = best.get(entry.target);
    if (!existing || compareNavigationEntries(entry, existing) < 0) {
      best.set(entry.target, entry);
    }
  }
  return sortEntries([...best.values()]);
}

function limitEntries(entries, limit = MAX_RELATED_PER_TYPE) {
  return sortEntries(entries).slice(0, limit);
}

function collectEntriesForSlug(slug, edges) {
  const entries = [];
  for (const edge of edges) {
    if (edge.source !== slug && edge.target !== slug) continue;
    if (edge.source === edge.target) continue;
    entries.push(edgeToEntry(slug, edge));
  }
  return entries;
}

function groupEntriesByRelationship(entries) {
  const grouped = new Map();
  for (const entry of entries) {
    if (!grouped.has(entry.relationship)) grouped.set(entry.relationship, []);
    grouped.get(entry.relationship).push(entry);
  }
  return grouped;
}

function buildRelatedNamesEntity(slug, edges) {
  const allEntries = collectEntriesForSlug(slug, edges);
  const byRelationship = groupEntriesByRelationship(allEntries);
  const limitedByType = new Map();

  for (const [relationship, relationshipEntries] of byRelationship.entries()) {
    limitedByType.set(relationship, limitEntries(dedupeEntriesByTarget(relationshipEntries)));
  }

  const mergedEntries = dedupeEntriesByTarget(
    [...limitedByType.values()].flat(),
  );

  const relatedNames = mergedEntries.map((entry) => entry.target);
  const sources = [...limitedByType.keys()].sort((a, b) => a.localeCompare(b));

  const byRelationshipOutput = {};
  for (const [relationship, relationshipEntries] of [...limitedByType.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    byRelationshipOutput[relationship] = {
      count: relationshipEntries.length,
      entries: relationshipEntries,
    };
  }

  return {
    slug,
    relatedNames,
    sources,
    byRelationship: byRelationshipOutput,
    entries: mergedEntries,
  };
}

function buildRelatedNamesIndex(nodes, edges) {
  return nodes
    .map((node) => buildRelatedNamesEntity(node.slug, edges))
    .sort((left, right) => left.slug.localeCompare(right.slug));
}

function explorerGroupId(relationshipType, explanation) {
  switch (relationshipType) {
    case 'SAME_ORIGIN': {
      if (explanation?.originCluster) {
        return `cluster:${normalizeText(explanation.originCluster)}`;
      }
      if (explanation?.originCountry) {
        return `country:${normalizeText(explanation.originCountry)}`;
      }
      return null;
    }
    case 'SAME_LANGUAGE': {
      if (!explanation?.language) return null;
      return `language:${normalizeText(explanation.language)}`;
    }
    case 'RELATED_MEANING': {
      if (explanation?.meaning) {
        return `meaning:${normalizeText(explanation.meaning)}`;
      }
      if (explanation?.meaningCluster) {
        return `cluster:${normalizeText(explanation.meaningCluster)}`;
      }
      return null;
    }
    case 'SIMILAR_PRONUNCIATION': {
      if (!explanation?.pronunciation) return null;
      return `pronunciation:${normalizePronunciation(explanation.pronunciation)}`;
    }
    case 'SAME_CULTURAL_GROUP': {
      const cluster = normalizeText(explanation?.originCluster) || '*';
      const country = normalizeText(explanation?.originCountry) || '*';
      const language = normalizeText(explanation?.language) || '*';
      return `cultural:${cluster}|${country}|${language}`;
    }
    default:
      return null;
  }
}

function explorerGroupLabel(explanation) {
  if (!explanation) return {};
  return { ...explanation };
}

function addGroupMember(groups, groupId, relationshipType, edge, slug) {
  if (!groups.has(groupId)) {
    groups.set(groupId, {
      id: groupId,
      relationshipType,
      derivedFrom: [...edge.derivedFrom],
      label: explorerGroupLabel(edge.explanation),
      members: new Set(),
    });
  }
  groups.get(groupId).members.add(slug);
}

function buildExplorerIndex(edges, relationshipType) {
  const filtered = edges.filter((edge) => edge.relationshipType === relationshipType);
  const groups = new Map();

  for (const edge of filtered) {
    const groupId = explorerGroupId(relationshipType, edge.explanation);
    if (!groupId) continue;
    addGroupMember(groups, groupId, relationshipType, edge, edge.source);
    addGroupMember(groups, groupId, relationshipType, edge, edge.target);
  }

  return [...groups.values()]
    .map((group) => {
      const members = [...group.members].sort((a, b) => a.localeCompare(b));
      return {
        id: group.id,
        relationshipType: group.relationshipType,
        derivedFrom: group.derivedFrom,
        label: group.label,
        memberCount: members.length,
        members: members.slice(0, MAX_GROUP_MEMBERS),
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

function computeNavigationMetrics(relatedNamesIndex) {
  const relatedCounts = relatedNamesIndex.map((entity) => entity.relatedNames.length);
  const totalRelated = relatedCounts.reduce((sum, count) => sum + count, 0);
  const emptyNavigationNodes = relatedCounts.filter((count) => count === 0).length;
  const relationshipUsage = {};

  for (const entity of relatedNamesIndex) {
    for (const relationship of entity.sources) {
      relationshipUsage[relationship] = (relationshipUsage[relationship] || 0) + 1;
    }
  }

  return {
    entityCount: relatedNamesIndex.length,
    averageRelatedNames:
      relatedNamesIndex.length === 0
        ? 0
        : Number((totalRelated / relatedNamesIndex.length).toFixed(4)),
    maxRelatedNames: relatedCounts.length ? Math.max(...relatedCounts) : 0,
    emptyNavigationNodes,
    relationshipUsage,
  };
}

function buildNavigationReport(graphPayload, graphSemanticHash) {
  const { nodes, edges, generatedAt, graphVersion, entityCount } = graphPayload;

  const relatedNames = buildRelatedNamesIndex(nodes, edges);
  const explorerIndexes = Object.fromEntries(
    EXPLORER_RELATIONSHIP_TYPES.map((relationshipType) => [
      relationshipType,
      buildExplorerIndex(edges, relationshipType),
    ]),
  );

  const metrics = computeNavigationMetrics(relatedNames);

  return {
    generatedAt,
    phase: '17B',
    title: 'Relationship Navigation Engine v1',
    baselineReference: 'editorial-architecture-v2',
    readOnly: true,
    navigationVersion: NAVIGATION_VERSION,
    graphVersion,
    graphSemanticHash,
    entityCount,
    relatedNames,
    explorerIndexes,
    metrics,
  };
}

function hashNavigationSemantic(report) {
  return stableHash({
    navigationVersion: report.navigationVersion,
    graphVersion: report.graphVersion,
    graphSemanticHash: report.graphSemanticHash,
    entityCount: report.entityCount,
    relatedNames: report.relatedNames,
    explorerIndexes: report.explorerIndexes,
    metrics: report.metrics,
  });
}

function validateNavigation(report, graphPayload) {
  const errors = [];
  const slugSet = new Set(graphPayload.nodes.map((node) => node.slug));
  const graphEdgeIds = new Set(graphPayload.edges.map((edge) => edge.id));

  if (report.relatedNames.length !== report.entityCount) {
    errors.push('Related names index length does not match entity count.');
  }

  for (const entity of report.relatedNames) {
    if (entity.slug === undefined) errors.push('Encountered navigation entity without slug.');

    const seenTargets = new Set();
    for (const target of entity.relatedNames) {
      if (target === entity.slug) errors.push(`Self reference in related names: ${entity.slug}`);
      if (!slugSet.has(target)) errors.push(`Unknown navigation target: ${target} for ${entity.slug}`);
      if (seenTargets.has(target)) errors.push(`Duplicate related name: ${entity.slug} -> ${target}`);
      seenTargets.add(target);
    }

    for (let i = 1; i < entity.relatedNames.length; i += 1) {
      const previous = entity.entries[i - 1];
      const current = entity.entries[i];
      if (compareNavigationEntries(previous, current) > 0) {
        errors.push(`Non-deterministic related name ordering for ${entity.slug}.`);
        break;
      }
    }

    for (const entry of entity.entries) {
      if (!slugSet.has(entry.target)) {
        errors.push(`Unknown entry target: ${entry.target} for ${entity.slug}`);
      }
      if (entry.target === entity.slug) {
        errors.push(`Self reference in entry: ${entity.slug}`);
      }
      const matchingEdges = graphPayload.edges.filter(
        (edge) =>
          edge.relationshipType === entry.relationship &&
          ((edge.source === entity.slug && edge.target === entry.target) ||
            (edge.source === entry.target && edge.target === entity.slug)),
      );
      if (!matchingEdges.length) {
        errors.push(`Navigation entry missing graph edge: ${entity.slug} -> ${entry.target}`);
      }
    }

    for (const [relationship, block] of Object.entries(entity.byRelationship || {})) {
      if (block.entries.length > MAX_RELATED_PER_TYPE) {
        errors.push(
          `Relationship ${relationship} exceeds limit for ${entity.slug}: ${block.entries.length}`,
        );
      }
    }
  }

  for (let i = 1; i < report.relatedNames.length; i += 1) {
    if (report.relatedNames[i - 1].slug.localeCompare(report.relatedNames[i].slug) > 0) {
      errors.push('Related names index is not sorted by slug.');
      break;
    }
  }

  for (const relationshipType of EXPLORER_RELATIONSHIP_TYPES) {
    const groups = report.explorerIndexes[relationshipType] || [];
    for (const group of groups) {
      if (group.members.length > MAX_GROUP_MEMBERS) {
        errors.push(`Explorer group ${group.id} exceeds member limit.`);
      }
      const memberSet = new Set();
      for (const member of group.members) {
        if (!slugSet.has(member)) errors.push(`Unknown explorer member: ${member} in ${group.id}`);
        if (memberSet.has(member)) errors.push(`Duplicate explorer member: ${member} in ${group.id}`);
        memberSet.add(member);
      }
      if (group.memberCount < group.members.length) {
        errors.push(`memberCount mismatch in explorer group ${group.id}.`);
      }
    }
  }

  if (graphEdgeIds.size !== graphPayload.edges.length) {
    errors.push('Graph payload contains duplicate edge ids.');
  }

  return {
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    errorCount: errors.length,
    errors,
  };
}

module.exports = {
  NAVIGATION_VERSION,
  MAX_RELATED_PER_TYPE,
  MAX_GROUP_MEMBERS,
  CONFIDENCE_RANK,
  EXPLORER_RELATIONSHIP_TYPES,
  stableHash,
  compareNavigationEntries,
  buildRelatedNamesIndex,
  buildExplorerIndex,
  buildNavigationReport,
  hashNavigationSemantic,
  validateNavigation,
};
