#!/usr/bin/env node
/**
 * Phase 3.3 — Controlled Origin Backfill Engine.
 * Merges data/origin-overrides.json (object keyed by name) into names without modifying base dataset.
 * Rule: override > base. If no override → origin fields stay null (no guessing).
 * Output: data/names-enriched.json. Generators use this when present.
 *
 * Usage: node scripts/apply-origin-enrichment.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const NAMES_PATH = path.join(DATA_DIR, 'names.json');
const OVERRIDES_PATH = path.join(DATA_DIR, 'origin-overrides.json');
const OUT_PATH = path.join(DATA_DIR, 'names-enriched.json');

/**
 * Merge origin from overrides into one name record. Deterministic.
 * Priority: override > base. If no override for this name → origin fields null (freeze base).
 * @param {object} baseNameRecord - One entry from names.json (unchanged except origin fields)
 * @param {object} originOverrides - Object keyed by lowercase name: { "liam": { origin_country, origin_cluster, language, confidence }, ... }
 * @returns {object} Record with origin fields from override or null
 */
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

/** Normalize overrides file to object keyed by lowercase name (supports legacy array format). */
function loadOriginOverrides() {
  if (!fs.existsSync(OVERRIDES_PATH)) return {};
  const raw = JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8'));
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
  if (typeof raw === 'object' && raw !== null) {
    return raw;
  }
  return {};
}

const names = JSON.parse(fs.readFileSync(NAMES_PATH, 'utf8'));
const originOverrides = loadOriginOverrides();

const enriched = names.map((n) => mergeOriginData(n, originOverrides));

fs.writeFileSync(OUT_PATH, JSON.stringify(enriched, null, 0), 'utf8');
const withOrigin = enriched.filter((n) => (n.origin_country || n.origin_cluster || n.language) != null).length;
console.log('Wrote', enriched.length, 'names to', OUT_PATH);
console.log('Names with origin assigned (override only):', withOrigin);
process.exit(0);
