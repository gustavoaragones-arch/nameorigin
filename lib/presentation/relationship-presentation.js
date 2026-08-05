/**
 * lib/presentation/relationship-presentation.js — Phase 17C presentation model.
 *
 * Read-only presentation layer over frozen navigation artifacts only.
 * Does not import graph data, relationship-engine, or navigation-engine.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data', 'navigation');
const AUDIT_DIR = path.join(ROOT, 'audit');

const PRESENTATION_VERSION = '17C-v1';

const NAVIGATION_ARTIFACTS = Object.freeze({
  relatedNames: 'related-names.json',
  originNavigation: 'origin-navigation.json',
  languageNavigation: 'language-navigation.json',
  meaningNavigation: 'meaning-navigation.json',
  pronunciationNavigation: 'pronunciation-navigation.json',
  culturalNavigation: 'cultural-navigation.json',
});

const RELATIONSHIP_SECTIONS = Object.freeze([
  { type: 'SAME_ORIGIN', title: 'Same Origin', explorerKind: 'origin' },
  { type: 'SAME_LANGUAGE', title: 'Same Language', explorerKind: 'language' },
  { type: 'RELATED_MEANING', title: 'Related Meaning', explorerKind: 'meaning' },
  { type: 'SIMILAR_PRONUNCIATION', title: 'Similar Pronunciation', explorerKind: 'pronunciation' },
  { type: 'SAME_CULTURAL_GROUP', title: 'Cultural Group', explorerKind: 'cultural' },
]);

const RELATIONSHIP_BADGE_LABELS = Object.freeze({
  SAME_ORIGIN: 'Same Origin',
  SAME_LANGUAGE: 'Same Language',
  RELATED_MEANING: 'Related Meaning',
  SIMILAR_PRONUNCIATION: 'Similar Pronunciation',
  SAME_CULTURAL_GROUP: 'Cultural Group',
  HAS_VARIANT: 'Variant',
});

const EXPLORER_KINDS = Object.freeze({
  SAME_ORIGIN: 'origin',
  SAME_LANGUAGE: 'language',
  RELATED_MEANING: 'meaning',
  SIMILAR_PRONUNCIATION: 'pronunciation',
  SAME_CULTURAL_GROUP: 'cultural',
});

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function loadJson(absPath) {
  if (!fs.existsSync(absPath)) {
    throw new Error(`Missing navigation artifact: ${path.relative(ROOT, absPath)}`);
  }
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

function slugToDisplayName(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function groupIdToUrlSegment(groupId) {
  return String(groupId || '')
    .replace(/:/g, '-')
    .replace(/\|/g, '--');
}

function explorerPagePath(kind, groupId) {
  return `/relationships/${kind}/${groupIdToUrlSegment(groupId)}/`;
}

function namePagePath(slug) {
  return `/name/${slug}/`;
}

function formatList(items) {
  const values = items.filter(Boolean);
  if (values.length === 0) return '';
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;
}

function buildEntryExplanation(entry) {
  const explanation = entry.explanation || {};
  switch (entry.relationship) {
    case 'SAME_ORIGIN':
      if (explanation.originCluster) {
        return `These names share the same ${explanation.originCluster} origin cluster.`;
      }
      if (explanation.originCountry) {
        return `These names share the same origin country: ${explanation.originCountry}.`;
      }
      return 'These names share the same origin grouping.';
    case 'SAME_LANGUAGE':
      if (explanation.language) {
        return `These names share the same primary language: ${explanation.language}.`;
      }
      return 'These names share the same primary language.';
    case 'RELATED_MEANING':
      if (explanation.meaning) {
        return `These names share the same meaning: ${explanation.meaning}.`;
      }
      if (explanation.meaningCluster) {
        return `These names have closely related meanings in the ${explanation.meaningCluster} cluster.`;
      }
      return 'These names have closely related meanings.';
    case 'SIMILAR_PRONUNCIATION':
      if (explanation.pronunciation) {
        return `These names share a similar pronunciation: ${explanation.pronunciation}.`;
      }
      return 'These names share a similar pronunciation.';
    case 'SAME_CULTURAL_GROUP': {
      const parts = formatList([
        explanation.originCluster,
        explanation.originCountry,
        explanation.language,
      ]);
      if (parts) {
        return `These names belong to the same cultural group (${parts}).`;
      }
      return 'These names belong to the same cultural group.';
    }
    default:
      return 'These names are related through the knowledge graph.';
  }
}

function buildGroupTitle(kind, group) {
  const label = group.label || {};
  switch (kind) {
    case 'origin':
      if (label.originCluster) return `${label.originCluster} Origin Names`;
      if (label.originCountry) return `${label.originCountry} Origin Names`;
      return 'Same Origin Names';
    case 'language':
      return label.language ? `${label.language} Language Names` : 'Same Language Names';
    case 'meaning':
      if (label.meaning) return `Names Meaning “${label.meaning}”`;
      if (label.meaningCluster) return `Names in the “${label.meaningCluster}” Meaning Cluster`;
      return 'Related Meaning Names';
    case 'pronunciation':
      return label.pronunciation
        ? `Names Pronounced Like “${label.pronunciation}”`
        : 'Similar Pronunciation Names';
    case 'cultural': {
      const parts = formatList([label.originCluster, label.originCountry, label.language]);
      return parts ? `${parts} Cultural Group Names` : 'Cultural Group Names';
    }
    default:
      return 'Related Names Explorer';
  }
}

function buildGroupDescription(kind, group) {
  const label = group.label || {};
  const sampleEntry = {
    relationship: group.relationshipType,
    explanation: label,
  };
  return buildEntryExplanation(sampleEntry);
}

function indexGroupsByMember(groups) {
  const index = new Map();
  for (const group of groups || []) {
    for (const member of group.members || []) {
      if (!index.has(member)) index.set(member, []);
      index.get(member).push(group);
    }
  }
  for (const [member, memberGroups] of index.entries()) {
    memberGroups.sort((left, right) => left.id.localeCompare(right.id));
    index.set(member, memberGroups);
  }
  return index;
}

function createRelationshipPresentationContext() {
  const relatedNamesPayload = loadJson(path.join(DATA_DIR, NAVIGATION_ARTIFACTS.relatedNames));
  const originPayload = loadJson(path.join(DATA_DIR, NAVIGATION_ARTIFACTS.originNavigation));
  const languagePayload = loadJson(path.join(DATA_DIR, NAVIGATION_ARTIFACTS.languageNavigation));
  const meaningPayload = loadJson(path.join(DATA_DIR, NAVIGATION_ARTIFACTS.meaningNavigation));
  const pronunciationPayload = loadJson(path.join(DATA_DIR, NAVIGATION_ARTIFACTS.pronunciationNavigation));
  const culturalPayload = loadJson(path.join(DATA_DIR, NAVIGATION_ARTIFACTS.culturalNavigation));
  const navigationAudit = loadJson(path.join(AUDIT_DIR, 'navigation.json'));

  const entityBySlug = new Map(
    (relatedNamesPayload.entities || []).map((entity) => [entity.slug, entity]),
  );

  return {
    presentationVersion: PRESENTATION_VERSION,
    navigationVersion: relatedNamesPayload.navigationVersion,
    graphVersion: relatedNamesPayload.graphVersion,
    graphSemanticHash: relatedNamesPayload.graphSemanticHash,
    navigationSemanticHash: navigationAudit.validation.semanticHash,
    entityCount: relatedNamesPayload.entityCount,
    generatedAt: relatedNamesPayload.generatedAt,
    entityBySlug,
    entities: relatedNamesPayload.entities || [],
    explorers: {
      origin: originPayload.groups || [],
      language: languagePayload.groups || [],
      meaning: meaningPayload.groups || [],
      pronunciation: pronunciationPayload.groups || [],
      cultural: culturalPayload.groups || [],
    },
    explorerIndexByMember: {
      origin: indexGroupsByMember(originPayload.groups),
      language: indexGroupsByMember(languagePayload.groups),
      meaning: indexGroupsByMember(meaningPayload.groups),
      pronunciation: indexGroupsByMember(pronunciationPayload.groups),
      cultural: indexGroupsByMember(culturalPayload.groups),
    },
  };
}

function buildRelationshipPresentationForSlug(slug, ctx) {
  const entity = ctx.entityBySlug.get(slug);
  if (!entity) return null;

  const breakdown = RELATIONSHIP_SECTIONS.map((section) => {
    const block = entity.byRelationship?.[section.type];
    if (!block?.entries?.length) return null;
    return {
      relationship: section.type,
      title: section.title,
      explorerKind: section.explorerKind,
      entries: block.entries.map((entry) => ({
        target: entry.target,
        displayName: slugToDisplayName(entry.target),
        href: namePagePath(entry.target),
        relationship: entry.relationship,
        relationshipLabel: RELATIONSHIP_BADGE_LABELS[entry.relationship] || entry.relationship,
        confidence: entry.confidence,
        derivedFrom: [...(entry.derivedFrom || [])],
        explanation: buildEntryExplanation(entry),
        rawExplanation: entry.explanation ? { ...entry.explanation } : null,
      })),
    };
  }).filter(Boolean);

  const whyRelated = [...new Set(breakdown.flatMap((section) => section.entries.map((e) => e.explanation)))]
    .sort((a, b) => a.localeCompare(b));

  const explorerLinks = RELATIONSHIP_SECTIONS.flatMap((section) => {
    const groups = ctx.explorerIndexByMember[section.explorerKind]?.get(slug) || [];
    return groups.map((group) => ({
      kind: section.explorerKind,
      groupId: group.id,
      href: explorerPagePath(section.explorerKind, group.id),
      title: buildGroupTitle(section.explorerKind, group),
      memberCount: group.memberCount,
    }));
  }).sort((left, right) => left.href.localeCompare(right.href));

  return {
    slug,
    displayName: slugToDisplayName(slug),
    relatedNames: (entity.relatedNames || []).map((target) => ({
      slug: target,
      displayName: slugToDisplayName(target),
      href: namePagePath(target),
    })),
    sources: [...(entity.sources || [])],
    whyRelated,
    breakdown,
    explorerLinks,
    hasContent: breakdown.length > 0 || (entity.relatedNames || []).length > 0,
  };
}

function buildExplorerPresentation(kind, group) {
  const members = (group.members || []).map((memberSlug) => ({
    slug: memberSlug,
    displayName: slugToDisplayName(memberSlug),
    href: namePagePath(memberSlug),
  }));

  return {
    kind,
    groupId: group.id,
    relationshipType: group.relationshipType,
    urlPath: explorerPagePath(kind, group.id),
    title: buildGroupTitle(kind, group),
    description: buildGroupDescription(kind, group),
    derivedFrom: [...(group.derivedFrom || [])],
    label: group.label ? { ...group.label } : {},
    memberCount: group.memberCount,
    members,
    relationshipLabel: RELATIONSHIP_BADGE_LABELS[group.relationshipType] || group.relationshipType,
  };
}

function collectAllExplorerPresentations(ctx) {
  const presentations = [];
  for (const [kind, groups] of Object.entries(ctx.explorers)) {
    for (const group of groups) {
      presentations.push(buildExplorerPresentation(kind, group));
    }
  }
  presentations.sort((left, right) => left.urlPath.localeCompare(right.urlPath));
  return presentations;
}

function buildPresentationReport(ctx) {
  const namePresentations = ctx.entities
    .map((entity) => buildRelationshipPresentationForSlug(entity.slug, ctx))
    .filter(Boolean);

  const explorerPresentations = collectAllExplorerPresentations(ctx);

  let relatedNameCards = 0;
  let pagesWithContent = 0;
  let emptyPages = 0;

  for (const model of namePresentations) {
    relatedNameCards += model.relatedNames.length;
    if (model.hasContent) pagesWithContent += 1;
    else emptyPages += 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    phase: '17C',
    title: 'Relationship Presentation v1',
    presentationVersion: PRESENTATION_VERSION,
    navigationVersion: ctx.navigationVersion,
    graphVersion: ctx.graphVersion,
    graphSemanticHash: ctx.graphSemanticHash,
    navigationSemanticHash: ctx.navigationSemanticHash,
    entityCount: ctx.entityCount,
    namePresentations,
    explorerPresentations,
    metrics: {
      entityCount: ctx.entityCount,
      pagesWithContent,
      emptyPages,
      explorerPages: explorerPresentations.length,
      relatedNameCards,
      explorerGroups: explorerPresentations.length,
    },
  };
}

function hashPresentationSemantic(report) {
  const nameSections = report.namePresentations.map((model) => ({
    slug: model.slug,
    relatedNames: model.relatedNames.map((row) => row.slug),
    whyRelated: model.whyRelated,
    breakdown: model.breakdown.map((section) => ({
      relationship: section.relationship,
      targets: section.entries.map((entry) => entry.target),
    })),
    explorerLinks: model.explorerLinks.map((link) => link.href),
  }));

  const explorerSections = report.explorerPresentations.map((model) => ({
    urlPath: model.urlPath,
    members: model.members.map((row) => row.slug),
    memberCount: model.memberCount,
  }));

  return stableHash({
    presentationVersion: report.presentationVersion,
    navigationSemanticHash: report.navigationSemanticHash,
    graphSemanticHash: report.graphSemanticHash,
    entityCount: report.entityCount,
    nameSections,
    explorerSections,
    metrics: report.metrics,
  });
}

module.exports = {
  PRESENTATION_VERSION,
  NAVIGATION_ARTIFACTS,
  RELATIONSHIP_SECTIONS,
  RELATIONSHIP_BADGE_LABELS,
  EXPLORER_KINDS,
  stableHash,
  slugToDisplayName,
  groupIdToUrlSegment,
  explorerPagePath,
  namePagePath,
  buildEntryExplanation,
  createRelationshipPresentationContext,
  buildRelationshipPresentationForSlug,
  buildExplorerPresentation,
  collectAllExplorerPresentations,
  buildPresentationReport,
  hashPresentationSemantic,
};
