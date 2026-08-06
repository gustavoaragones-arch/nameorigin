/**
 * lib/export/export-engine.js — Phase 18A Structured Export Engine v1.
 *
 * Read-only deterministic export of frozen platform datasets.
 * Does not regenerate graph, navigation, editorial records, KCI, or presentation.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const GRAPH_DIR = path.join(DATA_DIR, 'graph');
const NAVIGATION_DIR = path.join(DATA_DIR, 'navigation');
const AUDIT_DIR = path.join(ROOT, 'audit');

const EXPORT_VERSION = '18A-v1';

const SOURCE_PATHS = Object.freeze({
  knowledgeRecords: path.join(DATA_DIR, 'knowledge-records.json'),
  citationRecords: path.join(DATA_DIR, 'citation-records.json'),
  popularityRecords: path.join(DATA_DIR, 'popularity-records.json'),
  graphNodes: path.join(GRAPH_DIR, 'nodes.json'),
  graphEdges: path.join(GRAPH_DIR, 'edges.json'),
  navigationRelated: path.join(NAVIGATION_DIR, 'related-names.json'),
  navigationOrigin: path.join(NAVIGATION_DIR, 'origin-navigation.json'),
  navigationLanguage: path.join(NAVIGATION_DIR, 'language-navigation.json'),
  navigationMeaning: path.join(NAVIGATION_DIR, 'meaning-navigation.json'),
  navigationPronunciation: path.join(NAVIGATION_DIR, 'pronunciation-navigation.json'),
  navigationCultural: path.join(NAVIGATION_DIR, 'cultural-navigation.json'),
  knowledgeGraphAudit: path.join(AUDIT_DIR, 'knowledge-graph.json'),
  navigationAudit: path.join(AUDIT_DIR, 'navigation.json'),
  kciAudit: path.join(AUDIT_DIR, 'knowledge-completeness.json'),
});

const KNOWLEDGE_DOMAINS = Object.freeze([
  'origin',
  'meaning',
  'pronunciation',
  'etymology',
  'history',
]);

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function hashFile(absPath) {
  if (!fs.existsSync(absPath)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(absPath, 'utf8')).digest('hex');
}

function loadJson(absPath) {
  if (!fs.existsSync(absPath)) {
    throw new Error(`Missing required source: ${path.relative(ROOT, absPath)}`);
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

function csvEscape(value) {
  if (value == null) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function toCsv(rows, columns) {
  const header = columns.join(',');
  const lines = rows.map((row) => columns.map((column) => csvEscape(row[column])).join(','));
  return `${[header, ...lines].join('\n')}\n`;
}

function domainValue(record, domain) {
  const field = record?.[domain];
  if (!field || field.value == null) return null;
  if (domain === 'origin' && typeof field.value === 'object') {
    return field.value;
  }
  return field.value;
}

function buildKnowledgeCsvRows(records) {
  return records.map((record) => {
    const origin = domainValue(record, 'origin') || {};
    const row = {
      name: record.name,
      slug: slugFromName(record.name),
      origin_country: origin.origin_country || '',
      origin_cluster: origin.origin_cluster || '',
      language: origin.language || '',
    };
    for (const domain of KNOWLEDGE_DOMAINS.filter((d) => d !== 'origin')) {
      row[domain] = domainValue(record, domain) || '';
      row[`${domain}_confidence`] = record[domain]?.confidence ?? '';
      row[`${domain}_confidence_level`] = record[domain]?.confidenceLevel || '';
    }
    row.origin_confidence = record.origin?.confidence ?? '';
    row.origin_confidence_level = record.origin?.confidenceLevel || '';
    return row;
  });
}

function buildCitationCsvRows(records) {
  return records.map((record) => {
    const row = { name: record.name, slug: slugFromName(record.name) };
    for (const domain of KNOWLEDGE_DOMAINS) {
      const ids = record.citations?.[domain] || [];
      row[`${domain}_citation_ids`] = ids.join(';');
      row[`${domain}_citation_count`] = ids.length;
    }
    return row;
  });
}

function buildPopularityCsvRows(records) {
  const rows = [];
  for (const record of records) {
    const regions = record.popularity?.regions || {};
    const sources = (record.popularity?.sources || []).join(';');
    const regionKeys = Object.keys(regions).sort((a, b) => a.localeCompare(b));
    if (regionKeys.length === 0) {
      rows.push({
        name: record.name,
        slug: slugFromName(record.name),
        sources,
        region: '',
        source_id: '',
        year: '',
        rank: '',
        count: '',
        trend_direction: '',
      });
      continue;
    }
    for (const region of regionKeys) {
      const regionData = regions[region];
      const popularityRows = regionData.records || [];
      if (popularityRows.length === 0) {
        rows.push({
          name: record.name,
          slug: slugFromName(record.name),
          sources,
          region,
          source_id: regionData.sourceId || '',
          year: '',
          rank: '',
          count: '',
          trend_direction: '',
        });
        continue;
      }
      for (const popRow of popularityRows) {
        rows.push({
          name: record.name,
          slug: slugFromName(record.name),
          sources,
          region,
          source_id: regionData.sourceId || '',
          year: popRow.year ?? '',
          rank: popRow.rank ?? '',
          count: popRow.count ?? '',
          trend_direction: popRow.trendDirection ?? '',
        });
      }
    }
  }
  return rows;
}

function wrapExportEnvelope(exportVersion, generatedAt, schemaVersion, recordCount, records, extra = {}) {
  return {
    exportVersion,
    generatedAt,
    schemaVersion,
    recordCount,
    ...extra,
    records,
  };
}

function loadExportSources() {
  const knowledgeRecords = loadJson(SOURCE_PATHS.knowledgeRecords);
  const citationRecords = loadJson(SOURCE_PATHS.citationRecords);
  const popularityRecords = loadJson(SOURCE_PATHS.popularityRecords);
  const graphNodes = loadJson(SOURCE_PATHS.graphNodes);
  const graphEdges = loadJson(SOURCE_PATHS.graphEdges);
  const navigationRelated = loadJson(SOURCE_PATHS.navigationRelated);
  const navigationOrigin = loadJson(SOURCE_PATHS.navigationOrigin);
  const navigationLanguage = loadJson(SOURCE_PATHS.navigationLanguage);
  const navigationMeaning = loadJson(SOURCE_PATHS.navigationMeaning);
  const navigationPronunciation = loadJson(SOURCE_PATHS.navigationPronunciation);
  const navigationCultural = loadJson(SOURCE_PATHS.navigationCultural);
  const knowledgeGraphAudit = loadJson(SOURCE_PATHS.knowledgeGraphAudit);
  const navigationAudit = loadJson(SOURCE_PATHS.navigationAudit);
  const kciAudit = fs.existsSync(SOURCE_PATHS.kciAudit)
    ? loadJson(SOURCE_PATHS.kciAudit)
    : null;

  return {
    knowledgeRecords,
    citationRecords,
    popularityRecords,
    graphNodes,
    graphEdges,
    navigation: {
      related: navigationRelated,
      origin: navigationOrigin,
      language: navigationLanguage,
      meaning: navigationMeaning,
      pronunciation: navigationPronunciation,
      cultural: navigationCultural,
    },
    audits: {
      knowledgeGraph: knowledgeGraphAudit,
      navigation: navigationAudit,
      kci: kciAudit,
    },
    sourceHashes: Object.fromEntries(
      Object.entries(SOURCE_PATHS).map(([key, absPath]) => [key, hashFile(absPath)]),
    ),
  };
}

function buildExportBundle(sources, generatedAt = new Date().toISOString()) {
  const knowledgeRows = [...(sources.knowledgeRecords.records || [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const citationRows = [...(sources.citationRecords.records || [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const popularityRows = [...(sources.popularityRecords.records || [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const knowledgeJson = wrapExportEnvelope(
    EXPORT_VERSION,
    generatedAt,
    sources.knowledgeRecords.schemaVersion,
    knowledgeRows.length,
    knowledgeRows,
    { title: 'Knowledge Records Export' },
  );

  const citationsJson = wrapExportEnvelope(
    EXPORT_VERSION,
    generatedAt,
    sources.citationRecords.schemaVersion,
    citationRows.length,
    citationRows,
    { title: 'Citation Records Export', baselineReference: sources.citationRecords.baselineReference },
  );

  const popularityJson = wrapExportEnvelope(
    EXPORT_VERSION,
    generatedAt,
    sources.popularityRecords.schemaVersion,
    popularityRows.length,
    popularityRows,
    { title: 'Popularity Records Export', baselineReference: sources.popularityRecords.baselineReference },
  );

  const graphNodesExport = {
    exportVersion: EXPORT_VERSION,
    generatedAt,
    graphVersion: sources.graphNodes.graphVersion,
    graphSemanticHash: sources.audits.knowledgeGraph.validation.semanticHash,
    entityCount: sources.graphNodes.entityCount,
    nodeCount: sources.graphNodes.nodes.length,
    nodes: sources.graphNodes.nodes,
  };

  const graphEdgesExport = {
    exportVersion: EXPORT_VERSION,
    generatedAt,
    graphVersion: sources.graphEdges.graphVersion,
    graphSemanticHash: sources.audits.knowledgeGraph.validation.semanticHash,
    entityCount: sources.graphEdges.entityCount,
    edgeCount: sources.graphEdges.edges.length,
    edges: sources.graphEdges.edges,
  };

  const graphJsonlLines = sources.graphEdges.edges.map((edge) => JSON.stringify(edge));

  const navigationExports = {
    related: {
      exportVersion: EXPORT_VERSION,
      generatedAt,
      navigationVersion: sources.navigation.related.navigationVersion,
      navigationSemanticHash: sources.audits.navigation.validation.semanticHash,
      entityCount: sources.navigation.related.entityCount,
      entities: sources.navigation.related.entities,
    },
    origin: {
      exportVersion: EXPORT_VERSION,
      generatedAt,
      navigationVersion: sources.navigation.origin.navigationVersion,
      relationshipType: sources.navigation.origin.relationshipType,
      groupCount: sources.navigation.origin.groups.length,
      groups: sources.navigation.origin.groups,
    },
    language: {
      exportVersion: EXPORT_VERSION,
      generatedAt,
      navigationVersion: sources.navigation.language.navigationVersion,
      relationshipType: sources.navigation.language.relationshipType,
      groupCount: sources.navigation.language.groups.length,
      groups: sources.navigation.language.groups,
    },
    meaning: {
      exportVersion: EXPORT_VERSION,
      generatedAt,
      navigationVersion: sources.navigation.meaning.navigationVersion,
      relationshipType: sources.navigation.meaning.relationshipType,
      groupCount: sources.navigation.meaning.groups.length,
      groups: sources.navigation.meaning.groups,
    },
    pronunciation: {
      exportVersion: EXPORT_VERSION,
      generatedAt,
      navigationVersion: sources.navigation.pronunciation.navigationVersion,
      relationshipType: sources.navigation.pronunciation.relationshipType,
      groupCount: sources.navigation.pronunciation.groups.length,
      groups: sources.navigation.pronunciation.groups,
    },
    cultural: {
      exportVersion: EXPORT_VERSION,
      generatedAt,
      navigationVersion: sources.navigation.cultural.navigationVersion,
      relationshipType: sources.navigation.cultural.relationshipType,
      groupCount: sources.navigation.cultural.groups.length,
      groups: sources.navigation.cultural.groups,
    },
  };

  const knowledgeCsv = toCsv(buildKnowledgeCsvRows(knowledgeRows), [
    'name',
    'slug',
    'origin_country',
    'origin_cluster',
    'language',
    'meaning',
    'meaning_confidence',
    'meaning_confidence_level',
    'pronunciation',
    'pronunciation_confidence',
    'pronunciation_confidence_level',
    'etymology',
    'etymology_confidence',
    'etymology_confidence_level',
    'history',
    'history_confidence',
    'history_confidence_level',
    'origin_confidence',
    'origin_confidence_level',
  ]);

  const citationsCsv = toCsv(buildCitationCsvRows(citationRows), [
    'name',
    'slug',
    ...KNOWLEDGE_DOMAINS.flatMap((domain) => [`${domain}_citation_ids`, `${domain}_citation_count`]),
  ]);

  const popularityCsvRows = buildPopularityCsvRows(popularityRows);
  const popularityCsv = toCsv(popularityCsvRows, [
    'name',
    'slug',
    'sources',
    'region',
    'source_id',
    'year',
    'rank',
    'count',
    'trend_direction',
  ]);

  const jsonlFromRecords = (records) => records.map((record) => `${JSON.stringify(record)}\n`).join('');

  return {
    generatedAt,
    exportVersion: EXPORT_VERSION,
    files: {
      knowledgeJson,
      knowledgeJsonl: jsonlFromRecords(knowledgeRows),
      knowledgeCsv,
      citationsJson,
      citationsJsonl: jsonlFromRecords(citationRows),
      citationsCsv,
      popularityJson,
      popularityJsonl: jsonlFromRecords(popularityRows),
      popularityCsv,
      graphNodesExport,
      graphEdgesExport,
      graphJsonl: `${graphJsonlLines.join('\n')}\n`,
      navigationExports,
    },
    counts: {
      knowledgeRecords: knowledgeRows.length,
      citationRecords: citationRows.length,
      popularityRecords: popularityRows.length,
      graphNodes: sources.graphNodes.nodes.length,
      graphEdges: sources.graphEdges.edges.length,
      graphJsonlLines: graphJsonlLines.length,
      navigationEntities: sources.navigation.related.entities.length,
      navigationOriginGroups: sources.navigation.origin.groups.length,
      navigationLanguageGroups: sources.navigation.language.groups.length,
      navigationMeaningGroups: sources.navigation.meaning.groups.length,
      navigationPronunciationGroups: sources.navigation.pronunciation.groups.length,
      navigationCulturalGroups: sources.navigation.cultural.groups.length,
      knowledgeCsvRows: knowledgeRows.length,
      citationsCsvRows: citationRows.length,
      popularityCsvRows: popularityCsvRows.length,
    },
  };
}

function buildManifest(bundle, sources, artifactHashes) {
  return {
    exportVersion: EXPORT_VERSION,
    generatedAt: bundle.generatedAt,
    title: 'Structured Export Bundle v1',
    baselineReference: 'editorial-architecture-v2',
    readOnly: true,
    sourceLayers: {
      knowledgeRecords: {
        schemaVersion: sources.knowledgeRecords.schemaVersion,
        sha256: sources.sourceHashes.knowledgeRecords,
        recordCount: bundle.counts.knowledgeRecords,
      },
      citationRecords: {
        schemaVersion: sources.citationRecords.schemaVersion,
        sha256: sources.sourceHashes.citationRecords,
        recordCount: bundle.counts.citationRecords,
      },
      popularityRecords: {
        schemaVersion: sources.popularityRecords.schemaVersion,
        sha256: sources.sourceHashes.popularityRecords,
        recordCount: bundle.counts.popularityRecords,
      },
      knowledgeGraph: {
        graphVersion: sources.graphNodes.graphVersion,
        semanticHash: sources.audits.knowledgeGraph.validation.semanticHash,
        nodeCount: bundle.counts.graphNodes,
        edgeCount: bundle.counts.graphEdges,
      },
      navigation: {
        navigationVersion: sources.navigation.related.navigationVersion,
        semanticHash: sources.audits.navigation.validation.semanticHash,
        entityCount: bundle.counts.navigationEntities,
      },
      kci: sources.audits.kci
        ? {
            phase: sources.audits.kci.phase,
            entityCount: sources.audits.kci.entityCount,
            sha256: sources.sourceHashes.kciAudit,
          }
        : null,
    },
    artifacts: artifactHashes,
    recordCounts: bundle.counts,
    formats: ['json', 'jsonl', 'csv'],
  };
}

function hashExportSemantic(manifest) {
  return stableHash({
    exportVersion: manifest.exportVersion,
    sourceLayers: manifest.sourceLayers,
    artifacts: manifest.artifacts.map((artifact) => ({
      path: artifact.path,
      sha256: artifact.sha256,
      recordCount: artifact.recordCount,
    })),
    recordCounts: manifest.recordCounts,
  });
}

function validateStructuredExports(bundle, manifest, sources) {
  const errors = [];

  if (bundle.counts.knowledgeRecords !== 3697) {
    errors.push(`Expected 3697 knowledge records, found ${bundle.counts.knowledgeRecords}.`);
  }
  if (bundle.counts.citationRecords !== 3697) {
    errors.push(`Expected 3697 citation records, found ${bundle.counts.citationRecords}.`);
  }
  if (bundle.counts.graphNodes !== 3697) {
    errors.push(`Expected 3697 graph nodes, found ${bundle.counts.graphNodes}.`);
  }
  if (bundle.counts.navigationEntities !== 3697) {
    errors.push(`Expected 3697 navigation entities, found ${bundle.counts.navigationEntities}.`);
  }

  if (bundle.files.knowledgeJsonl.split('\n').filter(Boolean).length !== bundle.counts.knowledgeRecords) {
    errors.push('Knowledge JSONL line count mismatch.');
  }
  if (bundle.files.citationsJsonl.split('\n').filter(Boolean).length !== bundle.counts.citationRecords) {
    errors.push('Citation JSONL line count mismatch.');
  }
  if (bundle.files.popularityJsonl.split('\n').filter(Boolean).length !== bundle.counts.popularityRecords) {
    errors.push('Popularity JSONL line count mismatch.');
  }
  if (bundle.files.graphJsonl.split('\n').filter(Boolean).length !== bundle.counts.graphJsonlLines) {
    errors.push('Graph JSONL line count mismatch.');
  }

  const knowledgeCsvBodyRows = bundle.files.knowledgeCsv.trim().split('\n').length - 1;
  if (knowledgeCsvBodyRows !== bundle.counts.knowledgeCsvRows) {
    errors.push('Knowledge CSV row count mismatch.');
  }

  const citationsCsvBodyRows = bundle.files.citationsCsv.trim().split('\n').length - 1;
  if (citationsCsvBodyRows !== bundle.counts.citationsCsvRows) {
    errors.push('Citation CSV row count mismatch.');
  }

  const popularityCsvBodyRows = bundle.files.popularityCsv.trim().split('\n').length - 1;
  if (popularityCsvBodyRows !== bundle.counts.popularityCsvRows) {
    errors.push('Popularity CSV row count mismatch.');
  }

  if (manifest.sourceLayers.knowledgeGraph.semanticHash !== sources.audits.knowledgeGraph.validation.semanticHash) {
    errors.push('Manifest graph semantic hash mismatch.');
  }
  if (manifest.sourceLayers.navigation.semanticHash !== sources.audits.navigation.validation.semanticHash) {
    errors.push('Manifest navigation semantic hash mismatch.');
  }

  for (const artifact of manifest.artifacts) {
    if (!artifact.path || !artifact.sha256 || artifact.format == null) {
      errors.push(`Invalid manifest artifact entry: ${artifact.path || 'unknown'}`);
    }
  }

  return {
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    errorCount: errors.length,
    errors,
  };
}

module.exports = {
  EXPORT_VERSION,
  SOURCE_PATHS,
  KNOWLEDGE_DOMAINS,
  stableHash,
  hashFile,
  slugFromName,
  csvEscape,
  toCsv,
  loadExportSources,
  buildExportBundle,
  buildManifest,
  hashExportSemantic,
  validateStructuredExports,
  buildKnowledgeCsvRows,
  buildCitationCsvRows,
  buildPopularityCsvRows,
};
