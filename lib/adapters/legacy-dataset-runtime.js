/**
 * lib/adapters/legacy-dataset-runtime.js — Phase 3C/3D generator migration runtime.
 *
 * Loads legacy dataset collections either from data/*.json (rollback) or from
 * lib/adapters/legacy-datasets.js built atop lib/canonical/entity-builder.js.
 *
 * Rollback: NAMEORIGIN_LEGACY_DATA=1 restores direct file reads for adapter-backed
 * collections only; non-adapter datasets (countries, last-names, raw-data, rules)
 * always read from disk unchanged.
 *
 * Wave 2 behavior preservation: `namesBase` always reads data/names.json (the
 * unenriched file). Generators that depended on that file's sparser origin fields
 * must keep seeing them until Phase 4 (Knowledge Activation). The adapter's `names`
 * collection is enriched-equivalent by design (Phase 3B) and is not substituted here.
 */

const fs = require('fs');
const path = require('path');
const { loadAll } = require('../canonical/loaders.js');
const { buildAllEntities } = require('../canonical/entity-builder.js');
const { buildLegacyDatasets } = require('./legacy-datasets.js');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');

/** Fixed build timestamp — metadata is not consumed by Wave 1 generators, but keeps entity assembly deterministic. */
const ADAPTER_BUILD_TIMESTAMP = '1970-01-01T00:00:00.000Z';

let adapterCache = null;
let adapterBuildCount = 0;

function useLegacyFiles() {
  return process.env.NAMEORIGIN_LEGACY_DATA === '1';
}

function loadJsonFromFile(name) {
  const p = path.join(DATA_DIR, name + '.json');
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadAdapterDatasets() {
  if (!adapterCache) {
    adapterBuildCount += 1;
    const ctx = loadAll();
    const entities = buildAllEntities(ctx, ADAPTER_BUILD_TIMESTAMP);
    adapterCache = buildLegacyDatasets(entities);
  }
  return adapterCache;
}

function getAdapterCacheStats() {
  return {
    cacheWarm: adapterCache != null,
    buildCount: adapterBuildCount,
  };
}

/**
 * @param {'names'|'namesEnriched'|'namesBase'|'popularity'|'categories'|'variants'} collection
 */
function loadLegacyCollection(collection) {
  if (collection === 'namesBase') {
    return loadJsonFromFile('names');
  }
  if (useLegacyFiles()) {
    if (collection === 'namesEnriched') {
      const enrichedPath = path.join(DATA_DIR, 'names-enriched.json');
      if (fs.existsSync(enrichedPath)) {
        return JSON.parse(fs.readFileSync(enrichedPath, 'utf8'));
      }
      return loadJsonFromFile('names');
    }
    return loadJsonFromFile(collection);
  }
  const datasets = loadAdapterDatasets();
  return datasets[collection];
}

module.exports = {
  useLegacyFiles,
  loadJsonFromFile,
  loadLegacyCollection,
  loadAdapterDatasets,
  getAdapterCacheStats,
};
