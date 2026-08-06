/**
 * lib/api/export-api.js — Phase 18B AI / Research API v1.
 *
 * Deterministic read-only query layer over the frozen Export Contract.
 * Imports only exports/ artifacts. Never reads data/, graph, navigation, or editorial sources.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const EXPORT_DIR = path.join(ROOT, 'exports');

const API_VERSION = '1';
const MAX_SEARCH_RESULTS = 25;

const EXPORT_FILES = Object.freeze({
  manifest: 'manifest.json',
  knowledge: 'knowledge.json',
  citations: 'citations.json',
  popularity: 'popularity.json',
  navigationRelated: 'navigation-related.json',
  navigationOrigin: 'navigation-origin.json',
  navigationLanguage: 'navigation-language.json',
  navigationMeaning: 'navigation-meaning.json',
  navigationPronunciation: 'navigation-pronunciation.json',
  navigationCultural: 'navigation-cultural.json',
});

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function hashFile(absPath) {
  if (!fs.existsSync(absPath)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(absPath, 'utf8')).digest('hex');
}

function loadJson(absPath) {
  if (!fs.existsSync(absPath)) {
    throw new Error(`Missing export artifact: ${path.relative(ROOT, absPath)}`);
  }
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

function slugFromName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function groupIdToPathSegment(groupId) {
  return String(groupId || '')
    .trim()
    .toLowerCase()
    .replace(/:/g, '-')
    .replace(/\|/g, '--')
    .replace(/\s+/g, '-');
}

function normalizeSearchQuery(query) {
  return String(query || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function loadExportContract(exportDir = EXPORT_DIR) {
  const manifest = loadJson(path.join(exportDir, EXPORT_FILES.manifest));

  return {
    exportDir,
    manifest,
    exportHashes: Object.fromEntries(
      Object.entries(EXPORT_FILES).map(([key, fileName]) => [
        key,
        hashFile(path.join(exportDir, fileName)),
      ]),
    ),
    knowledge: loadJson(path.join(exportDir, EXPORT_FILES.knowledge)),
    citations: loadJson(path.join(exportDir, EXPORT_FILES.citations)),
    popularity: loadJson(path.join(exportDir, EXPORT_FILES.popularity)),
    navigation: {
      related: loadJson(path.join(exportDir, EXPORT_FILES.navigationRelated)),
      origin: loadJson(path.join(exportDir, EXPORT_FILES.navigationOrigin)),
      language: loadJson(path.join(exportDir, EXPORT_FILES.navigationLanguage)),
      meaning: loadJson(path.join(exportDir, EXPORT_FILES.navigationMeaning)),
      pronunciation: loadJson(path.join(exportDir, EXPORT_FILES.navigationPronunciation)),
      cultural: loadJson(path.join(exportDir, EXPORT_FILES.navigationCultural)),
    },
  };
}

function indexRecordsBySlug(records, nameField = 'name') {
  const map = new Map();
  for (const record of records || []) {
    const slug = slugFromName(record[nameField] || record.slug);
    if (slug) map.set(slug, record);
  }
  return map;
}

function indexNavigationEntities(entities) {
  const map = new Map();
  for (const entity of entities || []) {
    if (entity?.slug) map.set(entity.slug, entity);
  }
  return map;
}

function indexGroupsByPathSegment(groups) {
  const map = new Map();
  for (const group of groups || []) {
    map.set(groupIdToPathSegment(group.id), group);
  }
  return map;
}

function buildApiIndexes(contract) {
  const knowledgeBySlug = indexRecordsBySlug(contract.knowledge.records);
  const citationBySlug = indexRecordsBySlug(contract.citations.records);
  const popularityBySlug = indexRecordsBySlug(contract.popularity.records);
  const navigationBySlug = indexNavigationEntities(contract.navigation.related.entities);

  const slugs = [...knowledgeBySlug.keys()].sort((a, b) => a.localeCompare(b));

  return {
    knowledgeBySlug,
    citationBySlug,
    popularityBySlug,
    navigationBySlug,
    originByPath: indexGroupsByPathSegment(contract.navigation.origin.groups),
    languageByPath: indexGroupsByPathSegment(contract.navigation.language.groups),
    meaningByPath: indexGroupsByPathSegment(contract.navigation.meaning.groups),
    culturalByPath: indexGroupsByPathSegment(contract.navigation.cultural.groups),
    slugs,
    pathSegmentToGroupId: {
      origin: Object.fromEntries(
        (contract.navigation.origin.groups || []).map((group) => [
          groupIdToPathSegment(group.id),
          group.id,
        ]),
      ),
      language: Object.fromEntries(
        (contract.navigation.language.groups || []).map((group) => [
          groupIdToPathSegment(group.id),
          group.id,
        ]),
      ),
      meaning: Object.fromEntries(
        (contract.navigation.meaning.groups || []).map((group) => [
          groupIdToPathSegment(group.id),
          group.id,
        ]),
      ),
      cultural: Object.fromEntries(
        (contract.navigation.cultural.groups || []).map((group) => [
          groupIdToPathSegment(group.id),
          group.id,
        ]),
      ),
    },
  };
}

function wrapApiResponse(contract, payload) {
  return {
    apiVersion: API_VERSION,
    datasetVersion: contract.manifest.exportVersion,
    semanticHash: contract.manifest.semanticHash,
    generatedAt: contract.manifest.generatedAt,
    ...payload,
  };
}

function buildManifestResponse(contract) {
  return wrapApiResponse(contract, {
    endpoint: '/api/v1/manifest',
    manifest: contract.manifest,
  });
}

function buildNameResponse(contract, indexes, slug) {
  const normalizedSlug = String(slug || '').trim().toLowerCase();
  const knowledge = indexes.knowledgeBySlug.get(normalizedSlug);
  if (!knowledge) return null;

  return wrapApiResponse(contract, {
    endpoint: `/api/v1/name/${normalizedSlug}`,
    slug: normalizedSlug,
    knowledge,
    citation: indexes.citationBySlug.get(normalizedSlug) || null,
    popularity: indexes.popularityBySlug.get(normalizedSlug) || null,
    navigation: indexes.navigationBySlug.get(normalizedSlug) || null,
  });
}

function buildRelationshipsResponse(contract, indexes, slug) {
  const normalizedSlug = String(slug || '').trim().toLowerCase();
  const navigation = indexes.navigationBySlug.get(normalizedSlug);
  if (!navigation) return null;

  return wrapApiResponse(contract, {
    endpoint: `/api/v1/relationships/${normalizedSlug}`,
    slug: normalizedSlug,
    navigation,
  });
}

function buildOriginResponse(contract, indexes, pathSegment) {
  const key = String(pathSegment || '').trim().toLowerCase();
  const group = indexes.originByPath.get(key);
  if (!group) return null;

  return wrapApiResponse(contract, {
    endpoint: `/api/v1/origin/${key}`,
    groupId: group.id,
    group,
  });
}

function buildLanguageResponse(contract, indexes, pathSegment) {
  const key = String(pathSegment || '').trim().toLowerCase();
  const group = indexes.languageByPath.get(key);
  if (!group) return null;

  return wrapApiResponse(contract, {
    endpoint: `/api/v1/language/${key}`,
    groupId: group.id,
    group,
  });
}

function buildMeaningResponse(contract, indexes, pathSegment) {
  const key = String(pathSegment || '').trim().toLowerCase();
  const group = indexes.meaningByPath.get(key);
  if (!group) return null;

  return wrapApiResponse(contract, {
    endpoint: `/api/v1/meaning/${key}`,
    groupId: group.id,
    group,
  });
}

function buildCulturalResponse(contract, indexes, pathSegment) {
  const key = String(pathSegment || '').trim().toLowerCase();
  const group = indexes.culturalByPath.get(key);
  if (!group) return null;

  return wrapApiResponse(contract, {
    endpoint: `/api/v1/cultural/${key}`,
    groupId: group.id,
    group,
  });
}

function buildSearchResponse(contract, indexes, query) {
  const normalizedQuery = normalizeSearchQuery(query);
  const matches = normalizedQuery
    ? indexes.slugs.filter((slug) => slug.startsWith(normalizedQuery)).slice(0, MAX_SEARCH_RESULTS)
    : indexes.slugs.slice(0, MAX_SEARCH_RESULTS);

  return wrapApiResponse(contract, {
    endpoint: '/api/v1/search',
    query: normalizedQuery,
    matchCount: matches.length,
    matches,
  });
}

function buildApiReport(contract, indexes) {
  const nameResponses = indexes.slugs.map((slug) => buildNameResponse(contract, indexes, slug));
  const relationshipResponses = indexes.slugs
    .map((slug) => buildRelationshipsResponse(contract, indexes, slug))
    .filter(Boolean);

  const explorerResponses = {
    origin: [...indexes.originByPath.keys()]
      .sort((a, b) => a.localeCompare(b))
      .map((key) => buildOriginResponse(contract, indexes, key)),
    language: [...indexes.languageByPath.keys()]
      .sort((a, b) => a.localeCompare(b))
      .map((key) => buildLanguageResponse(contract, indexes, key)),
    meaning: [...indexes.meaningByPath.keys()]
      .sort((a, b) => a.localeCompare(b))
      .map((key) => buildMeaningResponse(contract, indexes, key)),
    cultural: [...indexes.culturalByPath.keys()]
      .sort((a, b) => a.localeCompare(b))
      .map((key) => buildCulturalResponse(contract, indexes, key)),
  };

  return {
    generatedAt: new Date().toISOString(),
    phase: '18B',
    title: 'AI / Research API v1',
    apiVersion: API_VERSION,
    datasetVersion: contract.manifest.exportVersion,
    exportSemanticHash: contract.manifest.semanticHash,
    entityCount: indexes.slugs.length,
    indexes: {
      slugs: indexes.slugs.length,
      originGroups: indexes.originByPath.size,
      languageGroups: indexes.languageByPath.size,
      meaningGroups: indexes.meaningByPath.size,
      culturalGroups: indexes.culturalByPath.size,
    },
    endpoints: {
      manifest: 1,
      name: nameResponses.length,
      relationships: relationshipResponses.length,
      origin: explorerResponses.origin.length,
      language: explorerResponses.language.length,
      meaning: explorerResponses.meaning.length,
      cultural: explorerResponses.cultural.length,
      searchIndex: 1,
    },
    nameResponses,
    relationshipResponses,
    explorerResponses,
    manifestResponse: buildManifestResponse(contract),
    searchIndex: {
      slugs: indexes.slugs,
      maxResults: MAX_SEARCH_RESULTS,
    },
  };
}

function hashApiSemantic(report, contract, indexes) {
  const sampleSearch = buildSearchResponse(contract, indexes, 'a');
  return stableHash({
    apiVersion: report.apiVersion,
    datasetVersion: report.datasetVersion,
    exportSemanticHash: report.exportSemanticHash,
    entityCount: report.entityCount,
    indexes: report.indexes,
    endpoints: report.endpoints,
    manifestResponse: report.manifestResponse,
    searchIndex: report.searchIndex,
    sampleNameSlugs: report.nameResponses.slice(0, 5).map((row) => row.slug),
    sampleSearch,
  });
}

function validateApiReport(report, contract, indexes) {
  const errors = [];

  if (report.entityCount !== 3697) {
    errors.push(`Expected 3697 entities, found ${report.entityCount}.`);
  }
  if (report.manifestResponse.datasetVersion !== contract.manifest.exportVersion) {
    errors.push('Manifest response datasetVersion mismatch.');
  }
  if (report.manifestResponse.semanticHash !== contract.manifest.semanticHash) {
    errors.push('Manifest response semanticHash mismatch.');
  }

  for (const response of report.nameResponses) {
    if (response.apiVersion !== API_VERSION) errors.push(`Invalid apiVersion on ${response.slug}`);
    if (!response.knowledge) errors.push(`Missing knowledge on ${response.slug}`);
    if (response.semanticHash !== contract.manifest.semanticHash) {
      errors.push(`Semantic hash mismatch on name/${response.slug}`);
    }
  }

  for (let i = 1; i < report.nameResponses.length; i += 1) {
    if (report.nameResponses[i - 1].slug.localeCompare(report.nameResponses[i].slug) > 0) {
      errors.push('Name responses are not in deterministic slug order.');
      break;
    }
  }

  const searchA = buildSearchResponse(contract, indexes, 'a');
  const searchB = buildSearchResponse(contract, indexes, 'a');
  if (JSON.stringify(searchA) !== JSON.stringify(searchB)) {
    errors.push('Search response is not deterministic.');
  }

  if (searchA.matches.length > MAX_SEARCH_RESULTS) {
    errors.push('Search exceeded max results.');
  }

  for (const slug of searchA.matches) {
    if (!indexes.knowledgeBySlug.has(slug)) {
      errors.push(`Search returned unknown slug: ${slug}`);
    }
  }

  if (buildNameResponse(contract, indexes, 'not-a-real-slug')) {
    errors.push('Unknown slug should not resolve.');
  }

  return {
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    errorCount: errors.length,
    errors,
  };
}

module.exports = {
  API_VERSION,
  MAX_SEARCH_RESULTS,
  EXPORT_DIR,
  EXPORT_FILES,
  stableHash,
  hashFile,
  slugFromName,
  groupIdToPathSegment,
  normalizeSearchQuery,
  loadExportContract,
  buildApiIndexes,
  wrapApiResponse,
  buildManifestResponse,
  buildNameResponse,
  buildRelationshipsResponse,
  buildOriginResponse,
  buildLanguageResponse,
  buildMeaningResponse,
  buildCulturalResponse,
  buildSearchResponse,
  buildApiReport,
  hashApiSemantic,
  validateApiReport,
};
