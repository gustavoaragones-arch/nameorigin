/**
 * lib/adapters/legacy-datasets.js — Phase 3B Canonical Adapter Layer.
 *
 * Exposes the FULL canonical entity collection as the flat, relational
 * dataset shapes today's generators load via loadJson('names'),
 * loadJson('popularity'), loadJson('categories'), loadJson('variants').
 * Built entirely from lib/canonical/entity-builder.js output (via
 * lib/adapters/legacy-name-record.js for the per-entity shape) — no
 * canonical data is re-derived here, only reshaped.
 *
 * INTENTIONAL DEVIATION, documented not hidden: `names` and `namesEnriched`
 * below return the IDENTICAL record set (both include origin_cluster /
 * origin_confidence). The original data/names.json (unenriched) and
 * data/names-enriched.json were two different files specifically because
 * some generators read one and some read the other — the exact mechanism
 * behind the origin-dual-file-split finding (audit/knowledge-redundancy.json,
 * Phase 1C/1D: scripts/generate-sibling-pages.js and the standalone
 * scripts/generate-names-like.js read the unenriched file and got a worse
 * origin-fallback rate as a direct result). This adapter does not
 * reproduce that split — every consumer of either legacy collection name
 * sees the same, fully-current canonical data. This is the adapter layer's
 * core proof-of-value, made concrete rather than asserted.
 */

const { toLegacyNameRecords } = require('./legacy-name-record.js');

/** names / namesEnriched: flat per-name records (see module header for why both resolve identically). */
function toLegacyNames(entities) {
  return toLegacyNameRecords(entities);
}
function toLegacyNamesEnriched(entities) {
  return toLegacyNameRecords(entities);
}

/** popularity: flattens entity.popularity.records[] back to {name_id, country, year, rank, count} rows, matching data/popularity.json's row shape exactly (no trend_direction key — the original dataset does not carry one on any live row, even though the canonical schema has a slot for it). */
function toLegacyPopularity(entities) {
  const rows = [];
  for (const e of entities) {
    if (!e.popularity || !e.popularity.records) continue;
    for (const r of e.popularity.records) {
      rows.push({ name_id: e.identity.id, country: r.country, year: r.year, rank: r.rank, count: r.count });
    }
  }
  return rows;
}

/** categories: flattens entity.classification.categories[] back to {name_id, category} rows. */
function toLegacyCategories(entities) {
  const rows = [];
  for (const e of entities) {
    if (!e.classification || !e.classification.categories) continue;
    for (const cat of e.classification.categories) {
      rows.push({ name_id: e.identity.id, category: cat });
    }
  }
  return rows;
}

/**
 * variants: flattens entity.variants.spellingVariants[] back to
 * {name_id, variant, language} rows. The original data/variants.json
 * includes the canonical spelling itself as the first row for every name
 * (e.g. {name_id:1, variant:"Aadi", language:"English"}); the canonical
 * builder deliberately excludes that redundant self-entry from
 * variants.spellingVariants[] (see lib/canonical/domains/variants.js).
 * This adapter reconstructs that leading self-row deterministically from
 * identity.name — not a fabricated value, since it is already fully known
 * from data already on the entity, and is required for exact row-count
 * parity with the legacy dataset (see audit/adapter-validation.json).
 */
function toLegacyVariants(entities) {
  const rows = [];
  for (const e of entities) {
    rows.push({ name_id: e.identity.id, variant: e.identity.name, language: 'English' });
    if (!e.variants || !e.variants.spellingVariants) continue;
    for (const v of e.variants.spellingVariants) {
      rows.push({ name_id: e.identity.id, variant: v.spelling, language: v.language });
    }
  }
  return rows;
}

/** Builds every legacy collection at once from one canonical entity array. */
function buildLegacyDatasets(entities) {
  return {
    names: toLegacyNames(entities),
    namesEnriched: toLegacyNamesEnriched(entities),
    popularity: toLegacyPopularity(entities),
    categories: toLegacyCategories(entities),
    variants: toLegacyVariants(entities),
  };
}

module.exports = {
  toLegacyNames,
  toLegacyNamesEnriched,
  toLegacyPopularity,
  toLegacyCategories,
  toLegacyVariants,
  buildLegacyDatasets,
};
