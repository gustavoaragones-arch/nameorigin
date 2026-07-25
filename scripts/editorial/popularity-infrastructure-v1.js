/**
 * Phase 9A — Popularity Infrastructure v1 shared library.
 *
 * Canonical popularity source registry, authority normalization,
 * and deterministic ID generation. Infrastructure only — no entity
 * popularity values are added in this phase.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');

const POPULARITY_PATHS = {
  registry: path.join(DATA_DIR, 'popularity-registry.json'),
};

const REGISTRY_SCHEMA_VERSION = '1.0';

const SUPPORTED_AUTHORITY_CLASSES = [
  'government_statistics',
  'civil_registration',
  'national_statistics',
  'population_registry',
  'official_name_statistics',
  'historical_name_dataset',
  'academic_dataset',
  'international_dataset',
];

const AUTHORITY_CATALOG = [
  {
    canonicalAuthority: 'Social Security Administration Baby Names (USA)',
    aliases: ['SSA Baby Names (USA)', 'SSA_USA', 'US SSA Baby Names'],
    id: 'SSA_US_BABY_NAMES',
    title: 'Social Security Administration Baby Names',
    type: 'government_statistics',
    publisher: 'U.S. Social Security Administration',
    country: 'USA',
    coverage: 'United States national baby name rankings and counts',
    license: 'public_domain',
    url: 'https://www.ssa.gov/oact/babynames/',
    retrieved: null,
  },
  {
    canonicalAuthority: 'Statistics Canada — First Names at Birth',
    aliases: ['Statistics Canada - First names at birth', 'STATCAN_CANADA'],
    id: 'STATCAN_CANADA_FIRST_NAMES',
    title: 'Statistics Canada — First Names at Birth',
    type: 'national_statistics',
    publisher: 'Statistics Canada',
    country: 'CAN',
    coverage: 'Canada national first-name statistics at birth',
    license: 'open_government',
    url: 'https://www150.statcan.gc.ca/n1/en/catalogue/17100147',
    retrieved: null,
  },
  {
    canonicalAuthority: 'Office for National Statistics Baby Names England and Wales',
    aliases: ['ONS Baby Names England and Wales', 'ONS_UK'],
    id: 'ONS_ENGLAND_WALES_BABY_NAMES',
    title: 'Office for National Statistics — Baby Names England and Wales',
    type: 'government_statistics',
    publisher: 'Office for National Statistics',
    country: 'UK',
    coverage: 'England and Wales baby name rankings',
    license: 'open_government',
    url: 'https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/livebirths',
    retrieved: null,
  },
  {
    canonicalAuthority: 'Australian Bureau of Statistics Baby Names',
    aliases: ['ABS / data.gov.au baby names', 'ABS_AUSTRALIA'],
    id: 'ABS_AUSTRALIA_BABY_NAMES',
    title: 'Australian Bureau of Statistics — Baby Names',
    type: 'government_statistics',
    publisher: 'Australian Bureau of Statistics',
    country: 'AUS',
    coverage: 'Australia national baby name statistics',
    license: 'open_government',
    url: 'https://data.gov.au/',
    retrieved: null,
  },
  {
    canonicalAuthority: 'General Register Office Civil Registration Birth Names (England and Wales)',
    aliases: ['UK GRO birth registration names', 'GRO England and Wales'],
    id: 'UK_GRO_CIVIL_REGISTRATION',
    title: 'General Register Office — Civil Registration Birth Names',
    type: 'civil_registration',
    publisher: 'General Register Office (England and Wales)',
    country: 'UK',
    coverage: 'Civil registration birth-name records for England and Wales',
    license: 'open_government',
    url: 'https://www.gov.uk/government/organisations/general-register-office',
    retrieved: null,
  },
  {
    canonicalAuthority: 'Statistics Canada Vital Statistics Population Registry',
    aliases: ['Statistics Canada Vital Statistics', 'StatCan population registry'],
    id: 'STATCAN_POPULATION_REGISTRY',
    title: 'Statistics Canada Vital Statistics Population Registry',
    type: 'population_registry',
    publisher: 'Statistics Canada',
    country: 'CAN',
    coverage: 'Canadian vital statistics population registry context for given names',
    license: 'open_government',
    url: 'https://www150.statcan.gc.ca/n1/en/subjects/population_and_demography',
    retrieved: null,
  },
  {
    canonicalAuthority: 'U.S. Social Security Administration Official Name Statistics',
    aliases: ['US SSA Official Name Statistics', 'SSA official baby name statistics'],
    id: 'SSA_US_BABY_NAMES',
    title: 'Social Security Administration Baby Names',
    type: 'official_name_statistics',
    publisher: 'U.S. Social Security Administration',
    country: 'USA',
    coverage: 'Official U.S. national baby name statistics',
    license: 'public_domain',
    url: 'https://www.ssa.gov/oact/babynames/',
    retrieved: null,
  },
  {
    canonicalAuthority: 'Historical U.S. Social Security Baby Name Dataset',
    aliases: ['SSA historical baby names', 'US historical SSA names'],
    id: 'SSA_US_HISTORICAL_BABY_NAMES',
    title: 'Historical U.S. Social Security Baby Name Dataset',
    type: 'historical_name_dataset',
    publisher: 'U.S. Social Security Administration',
    country: 'USA',
    coverage: 'Historical U.S. baby name time series from SSA records',
    license: 'public_domain',
    url: 'https://www.ssa.gov/oact/babynames/limits.html',
    retrieved: null,
  },
  {
    canonicalAuthority: 'UK Data Service Historical Name Research Collection',
    aliases: ['UK Data Service baby names research', 'UKDS name research collection'],
    id: 'UK_DATA_SERVICE_NAME_RESEARCH',
    title: 'UK Data Service — Historical Name Research Collection',
    type: 'academic_dataset',
    publisher: 'UK Data Service',
    country: 'UK',
    coverage: 'Academic research datasets for historical given-name usage in the UK',
    license: 'research_use',
    url: 'https://ukdataservice.ac.uk/',
    retrieved: null,
  },
  {
    canonicalAuthority: 'Eurostat Demographic and Population Statistics',
    aliases: ['Eurostat population statistics', 'EU demographic datasets'],
    id: 'EUROSTAT_DEMOGRAPHIC_STATISTICS',
    title: 'Eurostat — Demographic and Population Statistics',
    type: 'international_dataset',
    publisher: 'Eurostat',
    country: 'EU',
    coverage: 'Cross-national European demographic and population statistics',
    license: 'open_data',
    url: 'https://ec.europa.eu/eurostat/web/population-demography',
    retrieved: null,
  },
];

function loadJson(absPath, fallback = null) {
  if (!fs.existsSync(absPath)) return fallback;
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

function normalizeAuthorityKey(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function slugifyPopularityId(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    .slice(0, 80);
}

function buildAuthorityResolutionIndex(sources) {
  const index = {};
  for (const source of sources) {
    index[normalizeAuthorityKey(source.canonicalAuthority)] = source.id;
    for (const alias of source.aliases || []) {
      index[normalizeAuthorityKey(alias)] = source.id;
    }
  }
  return Object.fromEntries(
    Object.entries(index).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function resolveAuthorityId(authorityKey, resolutionIndex) {
  const normalized = normalizeAuthorityKey(authorityKey);
  return resolutionIndex[normalized] || null;
}

function buildPopularityRegistry(options = {}) {
  const sourceMap = new Map();

  for (const entry of AUTHORITY_CATALOG) {
    const id = entry.id || slugifyPopularityId(entry.canonicalAuthority);
    if (!sourceMap.has(id)) {
      sourceMap.set(id, {
        id,
        title: entry.title,
        type: entry.type,
        publisher: entry.publisher ?? null,
        country: entry.country ?? null,
        coverage: entry.coverage ?? null,
        license: entry.license ?? null,
        url: entry.url ?? null,
        retrieved: entry.retrieved ?? null,
        canonicalAuthority: entry.canonicalAuthority,
        aliases: [],
      });
    }
    const bucket = sourceMap.get(id);
    bucket.aliases = [...new Set([...(bucket.aliases || []), ...(entry.aliases || []), entry.canonicalAuthority])].sort(
      (a, b) => a.localeCompare(b),
    );
    if (entry.type && !bucket.type) bucket.type = entry.type;
  }

  const sources = [...sourceMap.values()].sort((a, b) => a.id.localeCompare(b.id));
  const authorityClasses = [...new Set(sources.map((row) => row.type))].sort();
  const rawAuthorityCount = AUTHORITY_CATALOG.length;
  const duplicateAuthoritiesRemoved = Math.max(0, rawAuthorityCount - sources.length);

  return {
    schemaVersion: REGISTRY_SCHEMA_VERSION,
    title: 'Popularity Registry v1',
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    baselineReference: 'citation-population-v1',
    methodology:
      'Deterministic canonical popularity source registry. Authority normalization only — no entity popularity values are populated in Phase 9A.',
    supportedAuthorityClasses: SUPPORTED_AUTHORITY_CLASSES,
    stats: {
      registrySources: sources.length,
      rawAuthorityEntries: rawAuthorityCount,
      duplicateAuthoritiesRemoved,
      authorityClassesRepresented: authorityClasses,
    },
    sources,
    authorityResolutionIndex: buildAuthorityResolutionIndex(sources),
  };
}

function hashRegistrySemantic(registry) {
  return stableHash({
    schemaVersion: registry.schemaVersion,
    sources: registry.sources,
    authorityResolutionIndex: registry.authorityResolutionIndex,
  });
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function writeJson(absPath, payload) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, JSON.stringify(payload, null, 2));
}

module.exports = {
  POPULARITY_PATHS,
  REGISTRY_SCHEMA_VERSION,
  SUPPORTED_AUTHORITY_CLASSES,
  AUTHORITY_CATALOG,
  normalizeAuthorityKey,
  slugifyPopularityId,
  buildAuthorityResolutionIndex,
  resolveAuthorityId,
  buildPopularityRegistry,
  hashRegistrySemantic,
  stableHash,
  writeJson,
  loadJson,
};
