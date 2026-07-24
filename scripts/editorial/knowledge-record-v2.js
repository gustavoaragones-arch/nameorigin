/**
 * Phase 6A — Knowledge Record v2 shared library.
 *
 * Consolidates per-domain editorial overrides into a unified record model
 * while preserving deterministic enrichment semantics.
 */

const fs = require('fs');
const path = require('path');

const SCHEMA_VERSION = '2.0';
const DOMAINS = ['origin', 'meaning', 'pronunciation', 'etymology', 'history'];

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const SOURCES_DIR = path.join(DATA_DIR, 'sources');

const PATHS = {
  names: path.join(DATA_DIR, 'names.json'),
  knowledgeRecords: path.join(DATA_DIR, 'knowledge-records.json'),
  originOverrides: path.join(DATA_DIR, 'origin-overrides.json'),
  meaningOverrides: path.join(DATA_DIR, 'meaning-overrides.json'),
  pronunciationOverrides: path.join(DATA_DIR, 'pronunciation-overrides.json'),
  etymologyOverrides: path.join(DATA_DIR, 'etymology-overrides.json'),
  historyOverrides: path.join(DATA_DIR, 'history-overrides.json'),
  originResearch: path.join(SOURCES_DIR, 'origin-wave1-research.json'),
  meaningResearch: path.join(SOURCES_DIR, 'meaning-wave1-research.json'),
  pronunciationResearch: path.join(SOURCES_DIR, 'pronunciation-wave1-research.json'),
  etymologyResearch: path.join(SOURCES_DIR, 'etymology-wave1-research.json'),
  historyResearch: path.join(SOURCES_DIR, 'history-wave1-research.json'),
};

function loadJson(absPath, fallback) {
  if (!fs.existsSync(absPath)) return fallback;
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

function confidenceLevel(confidence) {
  if (confidence >= 0.9) return 'high';
  if (confidence >= 0.85) return 'medium';
  return 'low';
}

function normalizeKey(name) {
  return String(name || '').trim().toLowerCase();
}

function loadOverrideMap(absPath, normalizer) {
  const raw = loadJson(absPath, {});
  if (Array.isArray(raw)) {
    const obj = {};
    raw.forEach((entry) => {
      const key = normalizeKey(entry.name);
      if (!key) return;
      obj[key] = normalizer(entry);
    });
    return obj;
  }
  if (typeof raw === 'object' && raw !== null) {
    const obj = {};
    Object.entries(raw).forEach(([key, entry]) => {
      const normalizedKey = normalizeKey(key);
      if (!normalizedKey) return;
      obj[normalizedKey] = normalizer(entry, normalizedKey);
    });
    return obj;
  }
  return {};
}

function loadLegacyOriginOverrides() {
  return loadOverrideMap(PATHS.originOverrides, (entry) => ({
    origin_country: entry.origin_country ?? null,
    origin_cluster: entry.origin_cluster ?? null,
    language: entry.language ?? null,
    confidence: entry.origin_confidence != null ? entry.origin_confidence : entry.confidence,
  }));
}

function loadLegacyMeaningOverrides() {
  return loadOverrideMap(PATHS.meaningOverrides, (entry) => ({
    meaning: entry.meaning ?? null,
    confidence: entry.confidence ?? null,
  }));
}

function loadLegacyPronunciationOverrides() {
  return loadOverrideMap(PATHS.pronunciationOverrides, (entry) => ({
    phonetic: entry.phonetic ?? null,
    confidence: entry.confidence ?? null,
  }));
}

function loadLegacyEtymologyOverrides() {
  return loadOverrideMap(PATHS.etymologyOverrides, (entry) => ({
    etymology: entry.etymology ?? null,
    confidence: entry.confidence ?? null,
  }));
}

function loadLegacyHistoryOverrides() {
  return loadOverrideMap(PATHS.historyOverrides, (entry) => ({
    history: entry.history ?? null,
    confidence: entry.confidence ?? null,
  }));
}

function loadLegacyOverrideBundle() {
  return {
    origin: loadLegacyOriginOverrides(),
    meaning: loadLegacyMeaningOverrides(),
    pronunciation: loadLegacyPronunciationOverrides(),
    etymology: loadLegacyEtymologyOverrides(),
    history: loadLegacyHistoryOverrides(),
  };
}

function loadResearchIndex(absPath, valueKey) {
  const payload = loadJson(absPath, { entries: [] });
  const entries = Array.isArray(payload.entries) ? payload.entries : [];
  const index = new Map();
  for (const entry of entries) {
    const key = normalizeKey(entry.name);
    if (!key) continue;
    index.set(key, entry);
  }
  return index;
}

function loadResearchIndexes() {
  return {
    origin: loadResearchIndex(PATHS.originResearch, 'origin'),
    meaning: loadResearchIndex(PATHS.meaningResearch, 'meaning'),
    pronunciation: loadResearchIndex(PATHS.pronunciationResearch, 'pronunciation'),
    etymology: loadResearchIndex(PATHS.etymologyResearch, 'etymology'),
    history: loadResearchIndex(PATHS.historyResearch, 'history'),
  };
}

function makeDomainField(value, confidence, researchEntry) {
  const field = {
    value,
    confidence: confidence ?? null,
    confidenceLevel:
      researchEntry?.confidenceLevel ??
      (confidence != null ? confidenceLevel(confidence) : null),
    sources: Array.isArray(researchEntry?.sources) ? researchEntry.sources : [],
    notes: researchEntry?.researchNotes ?? null,
  };
  return field;
}

function buildOriginDomain(override, researchEntry) {
  return makeDomainField(
    {
      origin_country: override.origin_country ?? null,
      origin_cluster: override.origin_cluster ?? null,
      language: override.language ?? null,
    },
    override.confidence,
    researchEntry,
  );
}

function buildMeaningDomain(override, researchEntry) {
  return makeDomainField(override.meaning ?? null, override.confidence, researchEntry);
}

function buildPronunciationDomain(override, researchEntry) {
  const researchValue = researchEntry?.pronunciation ?? override.phonetic ?? null;
  return makeDomainField(researchValue, override.confidence, researchEntry);
}

function buildEtymologyDomain(override, researchEntry) {
  return makeDomainField(override.etymology ?? null, override.confidence, researchEntry);
}

function buildHistoryDomain(override, researchEntry) {
  return makeDomainField(override.history ?? null, override.confidence, researchEntry);
}

function collectRecordKeys(legacy) {
  const keys = new Set();
  DOMAINS.forEach((domain) => {
    Object.keys(legacy[domain] || {}).forEach((key) => keys.add(key));
  });
  return [...keys].sort((a, b) => a.localeCompare(b));
}

function buildKnowledgeRecordsFromLegacy(legacy = loadLegacyOverrideBundle(), research = loadResearchIndexes()) {
  const names = loadJson(PATHS.names, []);
  const displayNameByKey = new Map(names.map((row) => [normalizeKey(row.name), String(row.name).trim()]));

  const records = [];
  for (const key of collectRecordKeys(legacy)) {
    const record = { name: displayNameByKey.get(key) || key };

    if (legacy.origin[key]) {
      record.origin = buildOriginDomain(legacy.origin[key], research.origin.get(key));
    }
    if (legacy.meaning[key]) {
      record.meaning = buildMeaningDomain(legacy.meaning[key], research.meaning.get(key));
    }
    if (legacy.pronunciation[key]) {
      record.pronunciation = buildPronunciationDomain(
        legacy.pronunciation[key],
        research.pronunciation.get(key),
      );
    }
    if (legacy.etymology[key]) {
      record.etymology = buildEtymologyDomain(legacy.etymology[key], research.etymology.get(key));
    }
    if (legacy.history[key]) {
      record.history = buildHistoryDomain(legacy.history[key], research.history.get(key));
    }

    records.push(record);
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    title: 'Knowledge Record v2',
    generatedAt: new Date().toISOString(),
    records,
  };
}

function loadKnowledgeRecordsPayload() {
  const payload = loadJson(PATHS.knowledgeRecords, null);
  if (!payload) return null;
  if (Array.isArray(payload)) {
    return {
      schemaVersion: SCHEMA_VERSION,
      title: 'Knowledge Record v2',
      generatedAt: null,
      records: payload,
    };
  }
  return payload;
}

function knowledgeRecordsToOverrideBundle(payload) {
  const bundle = {
    origin: {},
    meaning: {},
    pronunciation: {},
    etymology: {},
    history: {},
  };

  const records = Array.isArray(payload?.records) ? payload.records : [];
  for (const record of records) {
    const key = normalizeKey(record.name);
    if (!key) continue;

    if (record.origin && record.origin.value) {
      const value = record.origin.value;
      bundle.origin[key] = {
        origin_country: value.origin_country ?? null,
        origin_cluster: value.origin_cluster ?? null,
        language: value.language ?? null,
        confidence: record.origin.confidence ?? null,
      };
    }

    if (record.meaning && record.meaning.value != null && String(record.meaning.value).trim()) {
      bundle.meaning[key] = {
        meaning: String(record.meaning.value).trim(),
        confidence: record.meaning.confidence ?? null,
      };
    }

    if (record.pronunciation && record.pronunciation.value != null && String(record.pronunciation.value).trim()) {
      bundle.pronunciation[key] = {
        phonetic: String(record.pronunciation.value).trim(),
        confidence: record.pronunciation.confidence ?? null,
      };
    }

    if (record.etymology && record.etymology.value != null && String(record.etymology.value).trim()) {
      bundle.etymology[key] = {
        etymology: String(record.etymology.value).trim(),
        confidence: record.etymology.confidence ?? null,
      };
    }

    if (record.history && record.history.value != null && String(record.history.value).trim()) {
      bundle.history[key] = {
        history: String(record.history.value).trim(),
        confidence: record.history.confidence ?? null,
      };
    }
  }

  return bundle;
}

function resolveEditorialOverrideBundle(options = {}) {
  const { preferKnowledgeRecords = true } = options;
  const legacy = loadLegacyOverrideBundle();

  if (!preferKnowledgeRecords || !fs.existsSync(PATHS.knowledgeRecords)) {
    return { source: 'legacy-overrides', bundle: legacy };
  }

  const payload = loadKnowledgeRecordsPayload();
  if (!payload || !Array.isArray(payload.records)) {
    return { source: 'legacy-overrides', bundle: legacy };
  }

  return {
    source: 'knowledge-records-v2',
    bundle: knowledgeRecordsToOverrideBundle(payload),
  };
}

function mergeOriginData(baseNameRecord, originOverrides) {
  const key = normalizeKey(baseNameRecord.name);
  const override = originOverrides[key];
  if (!override) {
    return {
      ...baseNameRecord,
      origin_country: null,
      origin_cluster: null,
      language: null,
      origin_confidence: null,
    };
  }
  return {
    ...baseNameRecord,
    origin_country: override.origin_country ?? null,
    origin_cluster: override.origin_cluster ?? null,
    language: override.language ?? null,
    origin_confidence: override.confidence != null ? override.confidence : (override.origin_confidence ?? null),
  };
}

function mergeMeaningData(record, meaningOverrides) {
  const key = normalizeKey(record.name);
  const override = meaningOverrides[key];
  if (override && override.meaning != null && String(override.meaning).trim()) {
    return {
      ...record,
      meaning: String(override.meaning).trim(),
    };
  }
  const baseMeaning = record.meaning != null ? String(record.meaning).trim() : '';
  return {
    ...record,
    meaning: baseMeaning || null,
  };
}

function mergePronunciationData(record, pronunciationOverrides) {
  const key = normalizeKey(record.name);
  const override = pronunciationOverrides[key];
  if (override && override.phonetic != null && String(override.phonetic).trim()) {
    return {
      ...record,
      phonetic: String(override.phonetic).trim(),
    };
  }
  const basePhonetic = record.phonetic != null ? String(record.phonetic).trim() : '';
  return {
    ...record,
    phonetic: basePhonetic || null,
  };
}

function mergeEtymologyData(record, etymologyOverrides) {
  const key = normalizeKey(record.name);
  const override = etymologyOverrides[key];
  if (override && override.etymology != null && String(override.etymology).trim()) {
    return {
      ...record,
      etymology: String(override.etymology).trim(),
    };
  }
  const baseEtymology = record.etymology != null ? String(record.etymology).trim() : '';
  return {
    ...record,
    etymology: baseEtymology || null,
  };
}

function mergeHistoryData(record, historyOverrides) {
  const key = normalizeKey(record.name);
  const override = historyOverrides[key];
  if (override && override.history != null && String(override.history).trim()) {
    return {
      ...record,
      history: String(override.history).trim(),
    };
  }
  const baseHistory = record.history != null ? String(record.history).trim() : '';
  return {
    ...record,
    history: baseHistory || null,
  };
}

function buildEnrichedNames(names, bundle) {
  return names.map((row) => {
    const withOrigin = mergeOriginData(row, bundle.origin);
    const withMeaning = mergeMeaningData(withOrigin, bundle.meaning);
    const withPronunciation = mergePronunciationData(withMeaning, bundle.pronunciation);
    const withEtymology = mergeEtymologyData(withPronunciation, bundle.etymology);
    return mergeHistoryData(withEtymology, bundle.history);
  });
}

function summarizeEnriched(enriched) {
  return {
    entityCount: enriched.length,
    withOrigin: enriched.filter((row) => (row.origin_country || row.origin_cluster || row.language) != null).length,
    withMeaning: enriched.filter((row) => row.meaning && String(row.meaning).trim()).length,
    withPronunciation: enriched.filter((row) => row.phonetic && String(row.phonetic).trim()).length,
    withEtymology: enriched.filter((row) => row.etymology && String(row.etymology).trim()).length,
    withHistory: enriched.filter((row) => row.history && String(row.history).trim()).length,
  };
}

function compareEnriched(left, right) {
  const differences = [];
  if (left.length !== right.length) {
    differences.push({
      type: 'entity-count',
      left: left.length,
      right: right.length,
    });
    return differences;
  }

  for (let i = 0; i < left.length; i += 1) {
    const a = left[i];
    const b = right[i];
    const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    for (const field of keys) {
      const av = a[field];
      const bv = b[field];
      const aNorm = av == null ? null : av;
      const bNorm = bv == null ? null : bv;
      if (JSON.stringify(aNorm) !== JSON.stringify(bNorm)) {
        differences.push({
          type: 'field-mismatch',
          index: i,
          name: a?.name || b?.name || null,
          field,
          left: aNorm,
          right: bNorm,
        });
      }
    }
  }

  return differences;
}

module.exports = {
  SCHEMA_VERSION,
  DOMAINS,
  PATHS,
  loadJson,
  confidenceLevel,
  normalizeKey,
  loadLegacyOverrideBundle,
  loadResearchIndexes,
  buildKnowledgeRecordsFromLegacy,
  loadKnowledgeRecordsPayload,
  knowledgeRecordsToOverrideBundle,
  resolveEditorialOverrideBundle,
  buildEnrichedNames,
  summarizeEnriched,
  compareEnriched,
};
