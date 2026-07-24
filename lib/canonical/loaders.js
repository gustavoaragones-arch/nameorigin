/**
 * lib/canonical/loaders.js — Phase 3A Canonical Entity Builder.
 *
 * Centralizes READ-ONLY access to today's existing repository datasets.
 * No generator reads through this layer yet (per the Phase 3A brief) —
 * only scripts/build/build-canonical-entities.js and
 * scripts/build/validate-canonical.js do.
 *
 * Every loader:
 *   - validates the source file exists before reading (fails fast, loudly,
 *     rather than silently returning an empty result for a missing file);
 *   - returns a deeply-frozen (immutable) structure, so nothing downstream
 *     can accidentally mutate shared loaded data while assembling many
 *     entities from it;
 *   - where useful, also returns an index (Map) keyed by name_id or slug,
 *     built once, so assembling 3,697 entities is O(n) rather than O(n^2).
 *
 * Dataset scope note: per docs/CANONICAL_KNOWLEDGE_MODEL.md's domain
 * boundary decision, Surname-entity datasets (data/last-names.json,
 * data/heraldry.json) and presentation-layer prose-variant pools are
 * deliberately NOT loaded here — they are out of scope for a Name Entity
 * builder. See audit/dataset-mapping.json (Phase 2A) for the full
 * per-dataset classification this omission is based on.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const BUILD_DIR = path.join(ROOT, 'build');

function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object' || Object.isFrozen(obj)) return obj;
  Object.getOwnPropertyNames(obj).forEach((key) => deepFreeze(obj[key]));
  return Object.freeze(obj);
}

function readJsonFile(absPath, label) {
  if (!fs.existsSync(absPath)) {
    throw new Error(`[lib/canonical/loaders] Required dataset missing: ${label} (expected at ${absPath})`);
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch (e) {
    throw new Error(`[lib/canonical/loaders] Failed to parse ${label}: ${e.message}`);
  }
  return parsed;
}

function indexByNameId(rows) {
  const index = new Map();
  for (const row of rows) {
    const id = row.name_id;
    if (id == null) continue;
    if (!index.has(id)) index.set(id, []);
    index.get(id).push(row);
  }
  return index;
}

/** Loads data/names.json — the base identity record. */
function loadNames() {
  const rows = readJsonFile(path.join(DATA_DIR, 'names.json'), 'data/names.json');
  return deepFreeze(rows);
}

/** Loads data/names-enriched.json — origin/language overlay (preferred source for origin.country/cluster and language.primary). */
function loadNamesEnriched() {
  const rows = readJsonFile(path.join(DATA_DIR, 'names-enriched.json'), 'data/names-enriched.json');
  const byId = new Map(rows.map((r) => [r.id, r]));
  return deepFreeze({ rows, byId });
}

/** Loads data/normalized-names.json — slug + pronunciation/variant helper fields. */
function loadNormalizedNames() {
  const rows = readJsonFile(path.join(DATA_DIR, 'normalized-names.json'), 'data/normalized-names.json');
  const byId = new Map(rows.map((r) => [r.id, r]));
  return deepFreeze({ rows, byId });
}

/** Loads data/categories.json — name_id -> category[] relational rows. */
function loadCategories() {
  const rows = readJsonFile(path.join(DATA_DIR, 'categories.json'), 'data/categories.json');
  const byNameId = indexByNameId(rows);
  return deepFreeze({ rows, byNameId });
}

/** Loads data/variants.json — the authoritative spelling-variants source (see docs/CANONICAL_BUILDER.md, "Duplicate producer resolution"). */
function loadVariants() {
  const rows = readJsonFile(path.join(DATA_DIR, 'variants.json'), 'data/variants.json');
  const byNameId = indexByNameId(rows);
  return deepFreeze({ rows, byNameId });
}

/** Loads data/popularity.json — per name_id/country/year ranking rows. */
function loadPopularity() {
  const rows = readJsonFile(path.join(DATA_DIR, 'popularity.json'), 'data/popularity.json');
  const byNameId = indexByNameId(rows);
  return deepFreeze({ rows, byNameId });
}

/** Loads data/name-equivalents.json — closed, curated anchor-name -> equivalents map (keyed by lowercase name). */
function loadNameEquivalents() {
  const obj = readJsonFile(path.join(DATA_DIR, 'name-equivalents.json'), 'data/name-equivalents.json');
  return deepFreeze(obj);
}

/** Loads data/country-differentials.json — per name_id/country rank/delta rows (entries[]). */
function loadCountryDifferentials() {
  const obj = readJsonFile(path.join(DATA_DIR, 'country-differentials.json'), 'data/country-differentials.json');
  const entries = obj.entries || [];
  const byNameId = indexByNameId(entries);
  return deepFreeze({ meta: obj.meta || null, entries, byNameId });
}

/** Loads data/countries.json — 5-row reference table (not merged into entities; referenced by code). */
function loadCountries() {
  const rows = readJsonFile(path.join(DATA_DIR, 'countries.json'), 'data/countries.json');
  return deepFreeze(rows);
}

/** Loads build/topic-clusters.json — precomputed per-name cluster tuple (by_name, keyed by slug). Read-only; not regenerated by this builder. */
function loadTopicClusters() {
  const absPath = path.join(BUILD_DIR, 'topic-clusters.json');
  if (!fs.existsSync(absPath)) return deepFreeze({ byName: {} }); // optional — not every checkout may have run topic-cluster-map.js
  const obj = readJsonFile(absPath, 'build/topic-clusters.json');
  return deepFreeze({ byName: obj.by_name || {} });
}

/** Loads every dataset the canonical builder needs, once, and returns a single immutable context object. */
function loadAll() {
  return {
    names: loadNames(),
    namesEnriched: loadNamesEnriched(),
    normalizedNames: loadNormalizedNames(),
    categories: loadCategories(),
    variants: loadVariants(),
    popularity: loadPopularity(),
    nameEquivalents: loadNameEquivalents(),
    countryDifferentials: loadCountryDifferentials(),
    countries: loadCountries(),
    topicClusters: loadTopicClusters(),
  };
}

module.exports = {
  loadNames,
  loadNamesEnriched,
  loadNormalizedNames,
  loadCategories,
  loadVariants,
  loadPopularity,
  loadNameEquivalents,
  loadCountryDifferentials,
  loadCountries,
  loadTopicClusters,
  loadAll,
  deepFreeze,
};
