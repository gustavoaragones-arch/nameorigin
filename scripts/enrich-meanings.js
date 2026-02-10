#!/usr/bin/env node
/**
 * Step 4 — Meaning + origin enrichment.
 * Uses Wikidata name entities and curated linguistic datasets only.
 * Rules: only verified meanings; store source reference; no AI-generated meanings.
 * Adds: meaning_source, origin_source, confidence_score.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const RAW_BASE = path.join(ROOT, 'raw-data');
const NAMES_PATH = path.join(DATA_DIR, 'names.json');
const NORMALIZED_PATH = path.join(DATA_DIR, 'normalized-names.json');
const WIKIDATA_RAW = path.join(RAW_BASE, 'wikidata', 'normalized.json');
const CURATED_PATH = path.join(DATA_DIR, 'sources', 'curated-meanings.json');

const CONFIDENCE = {
  CURATED: 1.0,
  WIKIDATA: 0.9,
};

function loadJson(p, fallback = []) {
  if (!fs.existsSync(p)) return fallback;
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    return Array.isArray(data) ? data : fallback;
  } catch (e) {
    console.warn('Skip', p, e.message);
    return fallback;
  }
}

function buildLookupByLower(arr, nameKey = 'name') {
  const map = new Map();
  for (const row of arr) {
    const key = String(row[nameKey] || '').trim().toLowerCase();
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function run() {
  const names = loadJson(NAMES_PATH);
  if (names.length === 0) {
    console.warn('No names found at', NAMES_PATH);
    return;
  }

  const wikidata = loadJson(WIKIDATA_RAW);
  const curated = loadJson(CURATED_PATH);

  const byNameLowerWikidata = buildLookupByLower(wikidata);
  const byNameLowerCurated = buildLookupByLower(curated);

  let enrichedCount = 0;
  const enriched = names.map((n) => {
    const nameLower = (n.name || '').trim().toLowerCase();
    let meaning = n.meaning ?? null;
    let origin_country = n.origin_country ?? null;
    let language = n.language ?? null;
    let meaning_source = n.meaning_source ?? null;
    let origin_source = n.origin_source ?? null;
    let confidence_score = n.confidence_score ?? null;

    const curatedMatch = byNameLowerCurated.get(nameLower);
    const wikidataMatch = byNameLowerWikidata.get(nameLower);

    if (curatedMatch && curatedMatch.length > 0) {
      const c = curatedMatch[0];
      if (c.meaning != null && c.meaning !== '') {
        meaning = c.meaning;
        meaning_source = 'curated';
        confidence_score = CONFIDENCE.CURATED;
        enrichedCount++;
      }
      if (c.origin_country != null && c.origin_country !== '') {
        origin_country = c.origin_country;
        origin_source = 'curated';
      }
      if (c.language != null && c.language !== '') language = c.language;
    }

    if (wikidataMatch && wikidataMatch.length > 0) {
      const w = wikidataMatch[0];
      if (meaning == null && w.meaning != null && w.meaning !== '') {
        meaning = w.meaning;
        meaning_source = w.wikidata_id
          ? `wikidata:https://www.wikidata.org/wiki/${w.wikidata_id}`
          : 'wikidata';
        if (confidence_score == null) confidence_score = CONFIDENCE.WIKIDATA;
        enrichedCount++;
      }
      if (origin_country == null && w.origin != null && w.origin !== '') {
        origin_country = w.origin;
        origin_source = w.wikidata_id
          ? `wikidata:https://www.wikidata.org/wiki/${w.wikidata_id}`
          : 'wikidata';
      }
      if (language == null && w.language != null && w.language !== '') language = w.language;
    }

    return {
      ...n,
      meaning,
      origin_country,
      language,
      meaning_source: meaning_source || null,
      origin_source: origin_source || null,
      confidence_score,
    };
  });

  fs.writeFileSync(NAMES_PATH, JSON.stringify(enriched, null, 2), 'utf8');
  console.log('Enriched', enrichedCount, 'names with verified meaning/origin. Wrote', NAMES_PATH);

  if (fs.existsSync(NORMALIZED_PATH)) {
    const normalized = loadJson(NORMALIZED_PATH);
    if (normalized.length > 0) {
      const idToEnriched = new Map(enriched.map((e) => [e.id, e]));
      const normalizedUpdated = normalized.map((n) => {
        const e = idToEnriched.get(n.id);
        if (!e) return n;
        return {
          ...n,
          meaning: e.meaning,
          origin_country: e.origin_country,
          language: e.language,
          meaning_source: e.meaning_source,
          origin_source: e.origin_source,
          confidence_score: e.confidence_score,
        };
      });
      fs.writeFileSync(NORMALIZED_PATH, JSON.stringify(normalizedUpdated), 'utf8');
      console.log('Updated', NORMALIZED_PATH, 'with meaning/origin fields.');
    }
  }
}

run();
