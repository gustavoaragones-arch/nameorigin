/**
 * Phase 8B — Citation Records v1 shared library.
 *
 * Builds entity-level citation records from Knowledge Record v2 and
 * citation-resolutions.json without modifying editorial content.
 */

const fs = require('fs');
const path = require('path');
const {
  DOMAINS,
  loadJson,
  loadKnowledgeRecordsPayload,
  normalizeKey,
} = require('./knowledge-record-v2.js');
const { CITATION_PATHS, stableHash } = require('./citation-infrastructure-v1.js');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');

const RECORDS_SCHEMA_VERSION = '1.0';

const CITATION_RECORD_PATHS = {
  records: path.join(DATA_DIR, 'citation-records.json'),
};

function isDomainPopulated(record, domain) {
  const field = record[domain];
  if (!field || field.value == null) return false;
  if (domain === 'origin') {
    const v = field.value;
    return Boolean(v.origin_country || v.origin_cluster || v.language);
  }
  return String(field.value).trim().length > 0;
}

function dedupeSortCitationIds(citationIds) {
  const raw = (citationIds || []).filter(Boolean);
  const unique = [...new Set(raw)].sort((a, b) => a.localeCompare(b));
  return {
    ids: unique,
    duplicateRemovals: Math.max(0, raw.length - unique.length),
  };
}

function buildCitationRecordsPayload(options = {}) {
  const resolutions = loadJson(CITATION_PATHS.resolutions, null);
  if (!resolutions) {
    throw new Error('Missing data/citation-resolutions.json — run resolve-citations.js first.');
  }

  const knowledgeRecords = loadKnowledgeRecordsPayload();
  const resolutionByName = new Map(
    (resolutions.records || []).map((row) => [normalizeKey(row.name), row]),
  );

  let duplicateRemovals = 0;
  let totalCitationIdsAssigned = 0;
  const domainCoverage = Object.fromEntries(DOMAINS.map((domain) => [domain, 0]));

  const records = [];

  for (const kr of knowledgeRecords.records || []) {
    const key = normalizeKey(kr.name);
    const resolution = resolutionByName.get(key);
    if (!resolution) {
      throw new Error(`Missing citation resolution for Knowledge Record: ${kr.name}`);
    }

    const citations = {};
    for (const domain of DOMAINS) {
      if (!isDomainPopulated(kr, domain)) continue;
      const domainResolution = resolution.domains?.[domain];
      if (!domainResolution || !Array.isArray(domainResolution.citationIds)) {
        throw new Error(`Missing citation resolution for ${kr.name}.${domain}`);
      }

      const { ids, duplicateRemovals: removed } = dedupeSortCitationIds(domainResolution.citationIds);
      duplicateRemovals += removed;
      if (ids.length === 0) {
        throw new Error(`Empty citation IDs for populated domain ${kr.name}.${domain}`);
      }
      citations[domain] = ids;
      domainCoverage[domain] += 1;
      totalCitationIdsAssigned += ids.length;
    }

    if (Object.keys(citations).length === 0) {
      throw new Error(`Citation record has no populated domains: ${kr.name}`);
    }

    records.push({ name: kr.name, citations });
  }

  records.sort((a, b) => a.name.localeCompare(b.name));

  const payload = {
    schemaVersion: RECORDS_SCHEMA_VERSION,
    title: 'Citation Records v1',
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    baselineReference: 'citation-infrastructure-v1',
    methodology:
      'Deterministic entity-level citation records derived from citation-resolutions.json. Knowledge Record v2 editorial content remains unchanged.',
    stats: {
      citationRecords: records.length,
      knowledgeRecords: knowledgeRecords.records.length,
      totalCitationIdsAssigned,
      averageCitationsPerEntity:
        records.length === 0
          ? 0
          : Number((totalCitationIdsAssigned / records.length).toFixed(2)),
      duplicateRemovals,
      domainCoverage,
    },
    records,
  };

  return payload;
}

function loadCitationRecordsPayload() {
  return loadJson(CITATION_RECORD_PATHS.records, null);
}

function hashCitationRecordsSemantic(payload) {
  return stableHash({
    schemaVersion: payload.schemaVersion,
    records: payload.records,
  });
}

function writeCitationRecords(payload) {
  fs.mkdirSync(path.dirname(CITATION_RECORD_PATHS.records), { recursive: true });
  fs.writeFileSync(CITATION_RECORD_PATHS.records, JSON.stringify(payload, null, 2));
}

module.exports = {
  DOMAINS,
  CITATION_PATHS,
  CITATION_RECORD_PATHS,
  RECORDS_SCHEMA_VERSION,
  isDomainPopulated,
  dedupeSortCitationIds,
  buildCitationRecordsPayload,
  loadCitationRecordsPayload,
  hashCitationRecordsSemantic,
  writeCitationRecords,
  loadJson,
  normalizeKey,
};
