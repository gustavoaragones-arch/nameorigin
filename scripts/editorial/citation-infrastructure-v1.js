/**
 * Phase 8A — Citation Infrastructure v1 shared library.
 *
 * Discovers editorial source references, normalizes publications,
 * assigns deterministic citation IDs, and resolves Knowledge Record sources
 * without modifying Knowledge Record v2 or enrichment output.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DOMAINS, PATHS, loadJson, loadKnowledgeRecordsPayload } = require('./knowledge-record-v2.js');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');

const CITATION_PATHS = {
  registry: path.join(DATA_DIR, 'citation-registry.json'),
  resolutions: path.join(DATA_DIR, 'citation-resolutions.json'),
};

const REGISTRY_SCHEMA_VERSION = '1.0';
const RESOLUTIONS_SCHEMA_VERSION = '1.0';

const ODFN_CANONICAL = 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)';

const PUBLICATION_METADATA = {
  [ODFN_CANONICAL]: {
    id: 'OXFORD_FIRST_NAMES_2006',
    title: 'Oxford Dictionary of First Names',
    type: 'onomastic_dictionary',
    publisher: 'Oxford University Press',
    edition: '1st',
    year: 2006,
    language: 'en',
    authority: 'Patrick Hanks, Kate Hardcastle, Flavia Hodges',
    license: 'editorial_reference',
    url: null,
    retrieved: null,
  },
  'Cambridge English Pronouncing Dictionary (Roach, Hartman & Setter)': {
    id: 'CAMBRIDGE_ENGLISH_PRONOUNCING_DICTIONARY',
    title: 'Cambridge English Pronouncing Dictionary',
    type: 'pronouncing_dictionary',
    publisher: 'Cambridge University Press',
    edition: '18th',
    year: 2011,
    language: 'en',
    authority: 'Peter Roach, Jane Setter, John Esling',
    license: 'editorial_reference',
    url: null,
    retrieved: null,
  },
  'Behind the Name — editorial etymology entries': {
    id: 'BEHIND_THE_NAME_EDITORIAL',
    title: 'Behind the Name — Editorial Etymology Entries',
    type: 'linguistic_reference',
    publisher: 'Behind the Name',
    edition: null,
    year: null,
    language: 'en',
    authority: 'Behind the Name editorial team',
    license: 'editorial_reference',
    url: 'https://www.behindthename.com/',
    retrieved: null,
  },
  'Oxford Dictionary of National Biography — name bearer entries': {
    id: 'OXFORD_DNB_NAME_BEARERS',
    title: 'Oxford Dictionary of National Biography — Name Bearer Entries',
    type: 'historical_encyclopedia',
    publisher: 'Oxford University Press',
    edition: null,
    year: null,
    language: 'en',
    authority: 'Oxford University Press',
    license: 'editorial_reference',
    url: 'https://www.oxforddnb.com/',
    retrieved: null,
  },
  'Anchor Yale Bible Dictionary — Personal Names': {
    id: 'ANCHOR_YALE_BIBLE_DICTIONARY_PERSONAL_NAMES',
    title: 'Anchor Yale Bible Dictionary — Personal Names',
    type: 'biblical_onomastics',
    publisher: 'Yale University Press',
    edition: '1st',
    year: 1992,
    language: 'en',
    authority: 'David Noel Freedman (editor)',
    license: 'editorial_reference',
    url: null,
    retrieved: null,
  },
  'Dictionary of Medieval Names from European Sources (DMNES)': {
    id: 'DMNES',
    title: 'Dictionary of Medieval Names from European Sources',
    type: 'historical_name_dictionary',
    publisher: 'Academy of Saint Gabriel',
    edition: null,
    year: null,
    language: 'en',
    authority: 'Academy of Saint Gabriel',
    license: 'editorial_reference',
    url: 'https://dmnes.org/',
    retrieved: null,
  },
  'Lexicon of Greek Personal Names (LGPN)': {
    id: 'LGPN',
    title: 'Lexicon of Greek Personal Names',
    type: 'academic_reference',
    publisher: 'Oxford University Press',
    edition: null,
    year: null,
    language: 'en',
    authority: 'Lexicon of Greek Personal Names project',
    license: 'editorial_reference',
    url: 'https://lgpn.ox.ac.uk/',
    retrieved: null,
  },
  'Lexicon of Greek Personal Names (LGPN) — transliterated pronunciation guides': {
    id: 'LGPN_PRONUNCIATION_GUIDES',
    title: 'Lexicon of Greek Personal Names — Transliterated Pronunciation Guides',
    type: 'academic_reference',
    publisher: 'Oxford University Press',
    edition: null,
    year: null,
    language: 'en',
    authority: 'Lexicon of Greek Personal Names project',
    license: 'editorial_reference',
    url: 'https://lgpn.ox.ac.uk/',
    retrieved: null,
  },
  'Irish Genealogical Research Society — Gaelic name forms': {
    id: 'IGRS_GAELIC_NAME_FORMS',
    title: 'Irish Genealogical Research Society — Gaelic Name Forms',
    type: 'national_naming_authority',
    publisher: 'Irish Genealogical Research Society',
    edition: null,
    year: null,
    language: 'en',
    authority: 'Irish Genealogical Research Society',
    license: 'editorial_reference',
    url: null,
    retrieved: null,
  },
  'Irish Genealogical Research Society — Gaelic name usage records': {
    id: 'IGRS_GAELIC_NAME_USAGE',
    title: 'Irish Genealogical Research Society — Gaelic Name Usage Records',
    type: 'national_language_authority',
    publisher: 'Irish Genealogical Research Society',
    edition: null,
    year: null,
    language: 'en',
    authority: 'Irish Genealogical Research Society',
    license: 'editorial_reference',
    url: null,
    retrieved: null,
  },
  'University of Delhi — Sanskrit name etymology references': {
    id: 'UNIVERSITY_OF_DELHI_SANSKRIT_ETYMOLOGY',
    title: 'University of Delhi — Sanskrit Name Etymology References',
    type: 'academic_reference',
    publisher: 'University of Delhi',
    edition: null,
    year: null,
    language: 'en',
    authority: 'University of Delhi',
    license: 'editorial_reference',
    url: null,
    retrieved: null,
  },
  'University of Delhi — Sanskrit name pronunciation guide': {
    id: 'UNIVERSITY_OF_DELHI_SANSKRIT_PRONUNCIATION',
    title: 'University of Delhi — Sanskrit Name Pronunciation Guide',
    type: 'university_pronunciation_guide',
    publisher: 'University of Delhi',
    edition: null,
    year: null,
    language: 'en',
    authority: 'University of Delhi',
    license: 'editorial_reference',
    url: null,
    retrieved: null,
  },
  'University of Delhi — Sanskrit personal name usage references': {
    id: 'UNIVERSITY_OF_DELHI_SANSKRIT_USAGE',
    title: 'University of Delhi — Sanskrit Personal Name Usage References',
    type: 'academic_onomastic_reference',
    publisher: 'University of Delhi',
    edition: null,
    year: null,
    language: 'en',
    authority: 'University of Delhi',
    license: 'editorial_reference',
    url: null,
    retrieved: null,
  },
  'Académie française — name etymology references': {
    id: 'ACADEMIE_FRANCAISE_NAME_ETYMOLOGY',
    title: 'Académie française — Name Etymology References',
    type: 'national_language_authority',
    publisher: 'Académie française',
    edition: null,
    year: null,
    language: 'fr',
    authority: 'Académie française',
    license: 'editorial_reference',
    url: 'https://www.academie-francaise.fr/',
    retrieved: null,
  },
  'Académie française — historical name usage references': {
    id: 'ACADEMIE_FRANCAISE_HISTORICAL_USAGE',
    title: 'Académie française — Historical Name Usage References',
    type: 'national_language_authority',
    publisher: 'Académie française',
    edition: null,
    year: null,
    language: 'fr',
    authority: 'Académie française',
    license: 'editorial_reference',
    url: 'https://www.academie-francaise.fr/',
    retrieved: null,
  },
  'Académie française — name pronunciation references': {
    id: 'ACADEMIE_FRANCAISE_PRONUNCIATION',
    title: 'Académie française — Name Pronunciation References',
    type: 'national_language_authority',
    publisher: 'Académie française',
    edition: null,
    year: null,
    language: 'fr',
    authority: 'Académie française',
    license: 'editorial_reference',
    url: 'https://www.academie-francaise.fr/',
    retrieved: null,
  },
  'Encyclopaedia of Islam — personal name entries': {
    id: 'ENCYCLOPAEDIA_OF_ISLAM_PERSONAL_NAMES',
    title: 'Encyclopaedia of Islam — Personal Name Entries',
    type: 'documented_historical_record',
    publisher: 'Brill',
    edition: '2nd',
    year: null,
    language: 'en',
    authority: 'Brill',
    license: 'editorial_reference',
    url: null,
    retrieved: null,
  },
};

function sourceKey(type, reference) {
  return `${String(type || '').trim()}|${String(reference || '').trim()}`;
}

function normalizePublicationKey(reference) {
  const trimmed = String(reference || '').trim();
  if (!trimmed) return trimmed;
  if (PUBLICATION_METADATA[trimmed]) return trimmed;
  if (/^Oxford Dictionary of First Names/i.test(trimmed)) {
    return ODFN_CANONICAL;
  }
  return trimmed;
}

function slugifyCitationId(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    .slice(0, 80);
}

function buildCitationRecord(publicationKey, sourceTypes) {
  const meta = PUBLICATION_METADATA[publicationKey];
  const uniqueTypes = [...new Set(sourceTypes)].sort();
  const primaryType = uniqueTypes[0] || meta?.type || 'editorial_reference';

  if (meta) {
    return {
      ...meta,
      type: meta.type || primaryType,
      canonicalReference: publicationKey,
      sourceTypes: uniqueTypes,
    };
  }

  const id = slugifyCitationId(publicationKey);
  return {
    id,
    title: publicationKey,
    type: primaryType,
    publisher: null,
    edition: null,
    year: null,
    language: 'en',
    authority: null,
    license: 'editorial_reference',
    url: null,
    retrieved: null,
    canonicalReference: publicationKey,
    sourceTypes: uniqueTypes,
  };
}

function loadWave1CatalogSources() {
  const modules = [
    './origin-wave1-sources.js',
    './meaning-wave1-sources.js',
    './pronunciation-wave1-sources.js',
    './etymology-wave1-sources.js',
    './history-wave1-sources.js',
  ];
  const sources = [];
  for (const rel of modules) {
    const mod = require(rel);
    const catalog = mod.SOURCE_CATALOG || {};
    Object.values(catalog).forEach((entries) => {
      if (!Array.isArray(entries)) return;
      entries.forEach((entry) => {
        if (entry?.type && entry?.reference) {
          sources.push({ type: entry.type, reference: entry.reference });
        }
      });
    });
  }
  return sources;
}

function discoverAllSources() {
  const payload = loadKnowledgeRecordsPayload();
  const records = payload.records || [];
  const discovered = new Map();

  function addSource(type, reference) {
    const key = sourceKey(type, reference);
    if (!key || key === '|') return;
    if (!discovered.has(key)) {
      discovered.set(key, { type, reference, count: 0 });
    }
    discovered.get(key).count += 1;
  }

  for (const record of records) {
    for (const domain of DOMAINS) {
      const field = record[domain];
      if (!field || !Array.isArray(field.sources)) continue;
      for (const src of field.sources) {
        addSource(src.type, src.reference);
      }
    }
  }

  for (const src of loadWave1CatalogSources()) {
    addSource(src.type, src.reference);
  }

  return discovered;
}

function buildCitationRegistry(discoveredSources) {
  const publicationMap = new Map();

  for (const entry of discoveredSources.values()) {
    const publicationKey = normalizePublicationKey(entry.reference);
    if (!publicationMap.has(publicationKey)) {
      publicationMap.set(publicationKey, { sourceTypes: new Set(), rawReferences: new Set(), usageCount: 0 });
    }
    const bucket = publicationMap.get(publicationKey);
    bucket.sourceTypes.add(entry.type);
    bucket.rawReferences.add(entry.reference);
    bucket.usageCount += entry.count || 0;
  }

  const citations = [...publicationMap.entries()]
    .map(([publicationKey, meta]) => buildCitationRecord(publicationKey, [...meta.sourceTypes]))
    .sort((a, b) => a.id.localeCompare(b.id));

  const ids = citations.map((row) => row.id);
  const duplicateIds = ids.filter((id, idx) => ids.indexOf(id) !== idx);
  if (duplicateIds.length) {
    throw new Error(`Duplicate citation IDs after normalization: ${duplicateIds.join(', ')}`);
  }

  const rawReferenceCount = [...discoveredSources.values()].reduce(
    (sum, row) => sum + new Set([row.reference]).size,
    0,
  );
  const uniqueRawReferences = new Set([...discoveredSources.values()].map((row) => row.reference));

  return {
    schemaVersion: REGISTRY_SCHEMA_VERSION,
    title: 'Citation Registry v1',
    generatedAt: new Date().toISOString(),
    baselineReference: 'editorial-architecture-v2',
    methodology:
      'Deterministic publication normalization from Knowledge Record v2 source references and Wave 1 source catalogs. Knowledge Record sources remain unchanged.',
    stats: {
      rawSourceEntries: discoveredSources.size,
      uniqueRawReferences: uniqueRawReferences.size,
      uniquePublications: citations.length,
      duplicatePublicationsRemoved: Math.max(0, uniqueRawReferences.size - citations.length),
    },
    citations,
  };
}

function buildSourceResolutionIndex(registry, discoveredSources) {
  const byId = new Map(registry.citations.map((row) => [row.canonicalReference, row.id]));
  const index = {};

  for (const entry of discoveredSources.values()) {
    const publicationKey = normalizePublicationKey(entry.reference);
    const citationId = byId.get(publicationKey);
    if (!citationId) {
      throw new Error(`Unable to resolve publication key: ${publicationKey}`);
    }
    index[sourceKey(entry.type, entry.reference)] = citationId;
  }

  return index;
}

function resolveKnowledgeRecordCitations(registry, discoveredSources) {
  const resolutionIndex = buildSourceResolutionIndex(registry, discoveredSources);
  const payload = loadKnowledgeRecordsPayload();
  const records = [];

  let totalSourceReferences = 0;
  let resolvedReferences = 0;
  const unresolved = [];

  for (const record of payload.records || []) {
    const domainResolutions = {};

    for (const domain of DOMAINS) {
      const field = record[domain];
      if (!field || !Array.isArray(field.sources) || field.sources.length === 0) continue;

      const citations = field.sources.map((src) => {
        totalSourceReferences += 1;
        const key = sourceKey(src.type, src.reference);
        const citationId = resolutionIndex[key];
        if (!citationId) {
          unresolved.push({ name: record.name, domain, type: src.type, reference: src.reference });
          return null;
        }
        resolvedReferences += 1;
        return citationId;
      });

      domainResolutions[domain] = {
        sourceCount: field.sources.length,
        citationIds: citations,
      };
    }

    if (Object.keys(domainResolutions).length) {
      records.push({ name: record.name, domains: domainResolutions });
    }
  }

  records.sort((a, b) => a.name.localeCompare(b.name));

  return {
    schemaVersion: RESOLUTIONS_SCHEMA_VERSION,
    title: 'Citation Resolutions v1',
    generatedAt: new Date().toISOString(),
    baselineReference: 'editorial-architecture-v2',
    registryReference: 'data/citation-registry.json',
    sourceResolutionIndex: Object.fromEntries(
      Object.entries(resolutionIndex).sort(([a], [b]) => a.localeCompare(b)),
    ),
    stats: {
      knowledgeRecords: payload.records.length,
      recordsWithCitations: records.length,
      totalSourceReferences,
      resolvedReferences,
      unresolvedReferences: unresolved.length,
      resolutionRatePct:
        totalSourceReferences === 0
          ? 100
          : Number(((100 * resolvedReferences) / totalSourceReferences).toFixed(2)),
    },
    unresolved,
    records,
  };
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function writeJson(absPath, payload) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, JSON.stringify(payload, null, 2));
}

module.exports = {
  DOMAINS,
  PATHS,
  CITATION_PATHS,
  REGISTRY_SCHEMA_VERSION,
  RESOLUTIONS_SCHEMA_VERSION,
  ODFN_CANONICAL,
  PUBLICATION_METADATA,
  sourceKey,
  normalizePublicationKey,
  slugifyCitationId,
  discoverAllSources,
  buildCitationRegistry,
  buildSourceResolutionIndex,
  resolveKnowledgeRecordCitations,
  stableHash,
  writeJson,
  loadJson,
};
