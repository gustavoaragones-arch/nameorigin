#!/usr/bin/env node
/**
 * Phase 5B/5C/5D/5E — Rebuild data/names-enriched.json from base names + origin + meaning + pronunciation + etymology + history overrides.
 *
 * Mirrors origin merge logic from scripts/apply-origin-enrichment.js and adds
 * meaning, pronunciation, etymology, and history override merge. Does not modify apply-origin-enrichment.js.
 *
 * Priority:
 *   origin fields         — override > null (no base origin guessing)
 *   meaning field         — meaning override > base names.json meaning > null
 *   phonetic field        — pronunciation override > base names.json phonetic > null
 *   etymology field       — etymology override > base names.json etymology > null
 *   history field         — history override > base names.json history > null
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const NAMES_PATH = path.join(DATA_DIR, 'names.json');
const ORIGIN_OVERRIDES_PATH = path.join(DATA_DIR, 'origin-overrides.json');
const MEANING_OVERRIDES_PATH = path.join(DATA_DIR, 'meaning-overrides.json');
const PRONUNCIATION_OVERRIDES_PATH = path.join(DATA_DIR, 'pronunciation-overrides.json');
const ETYMOLOGY_OVERRIDES_PATH = path.join(DATA_DIR, 'etymology-overrides.json');
const HISTORY_OVERRIDES_PATH = path.join(DATA_DIR, 'history-overrides.json');
const OUT_PATH = path.join(DATA_DIR, 'names-enriched.json');

function loadJson(absPath, fallback) {
  if (!fs.existsSync(absPath)) return fallback;
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

function loadOriginOverrides() {
  const raw = loadJson(ORIGIN_OVERRIDES_PATH, {});
  if (Array.isArray(raw)) {
    const obj = {};
    raw.forEach((o) => {
      const key = (o.name || '').trim().toLowerCase();
      if (!key) return;
      obj[key] = {
        origin_country: o.origin_country ?? null,
        origin_cluster: o.origin_cluster ?? null,
        language: o.language ?? null,
        confidence: o.origin_confidence != null ? o.origin_confidence : o.confidence,
      };
    });
    return obj;
  }
  return typeof raw === 'object' && raw !== null ? raw : {};
}

function loadMeaningOverrides() {
  const raw = loadJson(MEANING_OVERRIDES_PATH, {});
  if (Array.isArray(raw)) {
    const obj = {};
    raw.forEach((o) => {
      const key = (o.name || '').trim().toLowerCase();
      if (!key) return;
      obj[key] = {
        meaning: o.meaning ?? null,
        confidence: o.confidence ?? null,
      };
    });
    return obj;
  }
  return typeof raw === 'object' && raw !== null ? raw : {};
}

function loadPronunciationOverrides() {
  const raw = loadJson(PRONUNCIATION_OVERRIDES_PATH, {});
  if (Array.isArray(raw)) {
    const obj = {};
    raw.forEach((o) => {
      const key = (o.name || '').trim().toLowerCase();
      if (!key) return;
      obj[key] = {
        phonetic: o.phonetic ?? null,
        confidence: o.confidence ?? null,
      };
    });
    return obj;
  }
  return typeof raw === 'object' && raw !== null ? raw : {};
}

function loadEtymologyOverrides() {
  const raw = loadJson(ETYMOLOGY_OVERRIDES_PATH, {});
  if (Array.isArray(raw)) {
    const obj = {};
    raw.forEach((o) => {
      const key = (o.name || '').trim().toLowerCase();
      if (!key) return;
      obj[key] = {
        etymology: o.etymology ?? null,
        confidence: o.confidence ?? null,
      };
    });
    return obj;
  }
  return typeof raw === 'object' && raw !== null ? raw : {};
}

function loadHistoryOverrides() {
  const raw = loadJson(HISTORY_OVERRIDES_PATH, {});
  if (Array.isArray(raw)) {
    const obj = {};
    raw.forEach((o) => {
      const key = (o.name || '').trim().toLowerCase();
      if (!key) return;
      obj[key] = {
        history: o.history ?? null,
        confidence: o.confidence ?? null,
      };
    });
    return obj;
  }
  return typeof raw === 'object' && raw !== null ? raw : {};
}

function mergeOriginData(baseNameRecord, originOverrides) {
  const key = (baseNameRecord.name || '').trim().toLowerCase();
  const o = originOverrides[key];
  if (!o) {
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
    origin_country: o.origin_country ?? null,
    origin_cluster: o.origin_cluster ?? null,
    language: o.language ?? null,
    origin_confidence: o.confidence != null ? o.confidence : (o.origin_confidence ?? null),
  };
}

function mergeMeaningData(record, meaningOverrides) {
  const key = (record.name || '').trim().toLowerCase();
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
  const key = (record.name || '').trim().toLowerCase();
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
  const key = (record.name || '').trim().toLowerCase();
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
  const key = (record.name || '').trim().toLowerCase();
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

function main() {
  const names = loadJson(NAMES_PATH, []);
  const originOverrides = loadOriginOverrides();
  const meaningOverrides = loadMeaningOverrides();
  const pronunciationOverrides = loadPronunciationOverrides();
  const etymologyOverrides = loadEtymologyOverrides();
  const historyOverrides = loadHistoryOverrides();

  const enriched = names.map((n) => {
    const withOrigin = mergeOriginData(n, originOverrides);
    const withMeaning = mergeMeaningData(withOrigin, meaningOverrides);
    const withPronunciation = mergePronunciationData(withMeaning, pronunciationOverrides);
    const withEtymology = mergeEtymologyData(withPronunciation, etymologyOverrides);
    return mergeHistoryData(withEtymology, historyOverrides);
  });

  fs.writeFileSync(OUT_PATH, JSON.stringify(enriched, null, 0), 'utf8');

  const withOrigin = enriched.filter((n) => (n.origin_country || n.origin_cluster || n.language) != null).length;
  const withMeaning = enriched.filter((n) => n.meaning && String(n.meaning).trim()).length;
  const withPronunciation = enriched.filter((n) => n.phonetic && String(n.phonetic).trim()).length;
  const withEtymology = enriched.filter((n) => n.etymology && String(n.etymology).trim()).length;
  const withHistory = enriched.filter((n) => n.history && String(n.history).trim()).length;

  console.log('Wrote', enriched.length, 'names to', OUT_PATH);
  console.log('Names with origin assigned (override only):', withOrigin);
  console.log('Names with meaning assigned:', withMeaning);
  console.log('Names with pronunciation assigned:', withPronunciation);
  console.log('Names with etymology assigned:', withEtymology);
  console.log('Names with history assigned:', withHistory);
}

main();
