/**
 * Phase 9B — Popularity Records v1 shared library.
 *
 * Builds entity-level popularity records from legacy popularity rows and
 * the frozen Popularity Registry without modifying editorial content.
 */

const fs = require('fs');
const path = require('path');
const {
  POPULARITY_PATHS,
  resolveAuthorityId,
  stableHash,
  loadJson,
} = require('./popularity-infrastructure-v1.js');
const { normalizeKey } = require('./knowledge-record-v2.js');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');

const RECORDS_SCHEMA_VERSION = '1.0';

const POPULARITY_RECORD_PATHS = {
  legacyPopularity: path.join(DATA_DIR, 'popularity.json'),
  names: path.join(DATA_DIR, 'names.json'),
  records: path.join(DATA_DIR, 'popularity-records.json'),
};

const COUNTRY_TO_SOURCE_ID = Object.freeze({
  USA: 'SSA_US_BABY_NAMES',
  UK: 'ONS_ENGLAND_WALES_BABY_NAMES',
  CAN: 'STATCAN_CANADA_FIRST_NAMES',
  AUS: 'ABS_AUSTRALIA_BABY_NAMES',
});

function loadLegacyPopularityRows() {
  const rows = loadJson(POPULARITY_RECORD_PATHS.legacyPopularity, []);
  if (!Array.isArray(rows)) {
    throw new Error('data/popularity.json must be an array.');
  }
  return rows;
}

function loadNamesIndex() {
  const names = loadJson(POPULARITY_RECORD_PATHS.names, []);
  if (!Array.isArray(names)) {
    throw new Error('data/names.json must be an array.');
  }
  const byId = new Map(names.map((row) => [row.id, row]));
  return { names, byId };
}

function resolveCountrySourceId(country, registry) {
  const direct = COUNTRY_TO_SOURCE_ID[country];
  if (direct) return direct;

  const resolutionIndex = registry.authorityResolutionIndex || {};
  return resolveAuthorityId(country, resolutionIndex);
}

function dedupeSortSourceIds(sourceIds) {
  const raw = (sourceIds || []).filter(Boolean);
  const unique = [...new Set(raw)].sort((a, b) => a.localeCompare(b));
  return {
    ids: unique,
    duplicateRemovals: Math.max(0, raw.length - unique.length),
  };
}

function sortPopularityRows(rows) {
  return [...rows].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    const rankA = a.rank != null ? a.rank : Number.MAX_SAFE_INTEGER;
    const rankB = b.rank != null ? b.rank : Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;
    const countA = a.count != null ? a.count : -1;
    const countB = b.count != null ? b.count : -1;
    return countB - countA;
  });
}

function buildPopularityRecordsPayload(options = {}) {
  const registry = loadJson(POPULARITY_PATHS.registry, null);
  if (!registry) {
    throw new Error('Missing data/popularity-registry.json — run build-popularity-registry.js first.');
  }

  const legacyRows = loadLegacyPopularityRows();
  const { byId } = loadNamesIndex();
  const registryIds = new Set((registry.sources || []).map((row) => row.id));

  const grouped = new Map();
  for (const row of legacyRows) {
    const nameRow = byId.get(row.name_id);
    if (!nameRow) {
      throw new Error(`Missing names.json entry for popularity name_id ${row.name_id}`);
    }
    const key = normalizeKey(nameRow.name);
    if (!grouped.has(key)) {
      grouped.set(key, {
        name: nameRow.name,
        nameId: row.name_id,
        rows: [],
      });
    }
    grouped.get(key).rows.push(row);
  }

  let duplicateRemovals = 0;
  let totalSourceIdsAssigned = 0;
  const unresolvedAuthorities = new Set();
  const regionalCoverage = {};
  const records = [];

  for (const bucket of [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    const regions = {};
    const sourceIds = [];

    const byCountry = new Map();
    for (const row of bucket.rows) {
      const country = row.country;
      if (!byCountry.has(country)) byCountry.set(country, []);
      byCountry.get(country).push(row);
    }

    for (const country of [...byCountry.keys()].sort((a, b) => a.localeCompare(b))) {
      const countryRows = sortPopularityRows(
        byCountry.get(country).map((row) => ({
          year: row.year,
          rank: row.rank != null ? row.rank : null,
          count: row.count != null ? row.count : null,
          trendDirection: row.trend_direction != null ? row.trend_direction : null,
        })),
      );

      const sourceId = resolveCountrySourceId(country, registry);
      if (!sourceId) {
        unresolvedAuthorities.add(country);
      } else if (!registryIds.has(sourceId)) {
        throw new Error(`Resolved source ID ${sourceId} for country ${country} is not in Popularity Registry.`);
      } else {
        sourceIds.push(sourceId);
      }

      regions[country] = {
        sourceId: sourceId || null,
        records: countryRows,
      };
      regionalCoverage[country] = (regionalCoverage[country] || 0) + countryRows.length;
    }

    const { ids, duplicateRemovals: removed } = dedupeSortSourceIds(sourceIds);
    duplicateRemovals += removed;
    totalSourceIdsAssigned += ids.length;

    records.push({
      name: bucket.name,
      popularity: {
        sources: ids,
        regions,
      },
    });
  }

  const attributableRows = legacyRows.filter((row) => Boolean(resolveCountrySourceId(row.country, registry)));
  const unattributableRows = legacyRows.length - attributableRows.length;
  const sourceResolutionRatePct =
    attributableRows.length === 0
      ? 100
      : Number(((100 * attributableRows.length) / attributableRows.length).toFixed(2));

  return {
    schemaVersion: RECORDS_SCHEMA_VERSION,
    title: 'Popularity Records v1',
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    baselineReference: 'popularity-infrastructure-v1',
    methodology:
      'Deterministic entity-level popularity records migrated from data/popularity.json with canonical Popularity Registry source IDs. Legacy popularity rows and editorial content remain unchanged.',
    stats: {
      popularityRecords: records.length,
      legacyPopularityRows: legacyRows.length,
      populatedEntities: records.length,
      totalSourceIdsAssigned,
      averageSourcesPerEntity:
        records.length === 0 ? 0 : Number((totalSourceIdsAssigned / records.length).toFixed(2)),
      duplicateRemovals,
      regionalCoverage,
      unresolvedAuthorities: [...unresolvedAuthorities].sort((a, b) => a.localeCompare(b)),
      sourceResolutionRatePct,
      registryAttributableRows: attributableRows.length,
      registryUnattributableRows: unattributableRows,
    },
    records,
  };
}

function loadPopularityRecordsPayload() {
  return loadJson(POPULARITY_RECORD_PATHS.records, null);
}

function hashPopularityRecordsSemantic(payload) {
  return stableHash({
    schemaVersion: payload.schemaVersion,
    records: payload.records,
  });
}

function writePopularityRecords(payload) {
  fs.mkdirSync(path.dirname(POPULARITY_RECORD_PATHS.records), { recursive: true });
  fs.writeFileSync(POPULARITY_RECORD_PATHS.records, JSON.stringify(payload, null, 2));
}

module.exports = {
  POPULARITY_RECORD_PATHS,
  POPULARITY_PATHS,
  RECORDS_SCHEMA_VERSION,
  COUNTRY_TO_SOURCE_ID,
  loadLegacyPopularityRows,
  resolveCountrySourceId,
  dedupeSortSourceIds,
  buildPopularityRecordsPayload,
  loadPopularityRecordsPayload,
  hashPopularityRecordsSemantic,
  writePopularityRecords,
  loadJson,
  normalizeKey,
};
