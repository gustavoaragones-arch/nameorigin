/**
 * lib/adapters/legacy-name-record.js — Phase 3B Canonical Adapter Layer.
 *
 * Converts ONE canonical Name Entity (as produced by
 * lib/canonical/entity-builder.js) into the flat, legacy record shape
 * every current page-generator already expects when it does
 * `record.origin_country`, `record.meaning`, etc. — the exact shape of
 * data/names-enriched.json's rows.
 *
 * This is a pure, one-directional, read-only transform. It never invents a
 * value: every legacy field is either taken directly from the canonical
 * entity or set to null/undefined exactly as the canonical entity has it.
 * No generator reads through this adapter yet (per the Phase 3B brief).
 *
 * Field mapping (canonical -> legacy):
 *   identity.id              -> id
 *   identity.name            -> name
 *   identity.gender          -> gender
 *   identity.firstLetter     -> first_letter
 *   origin.country           -> origin_country
 *   origin.cluster           -> origin_cluster
 *   origin.confidence        -> origin_confidence
 *   language.primary         -> language
 *   meaning.primary          -> meaning
 *   pronunciation.ipa        -> phonetic  (see note below)
 *   pronunciation.syllableCount -> syllables
 *   classification.isTraditional -> is_traditional (boolean -> 0/1, matching legacy's numeric convention)
 *   classification.isModern      -> is_modern (boolean -> 0/1)
 *
 * Note on `phonetic`: the legacy field is populated from data/names.json's
 * own (0%-populated) `phonetic` column, which the canonical model splits
 * into `pronunciation.ipa` and `pronunciation.phoneticSpelling`. Since both
 * are null for every current entity (audit/knowledge-coverage.json:
 * phonetic 0% coverage), this adapter maps `pronunciation.ipa` back to
 * `phonetic` as the closer of the two candidates — documented here, not
 * silently decided, and revisited if/when either field is ever populated
 * (see audit/adapter-coverage.json for this exact caveat, re-surfaced).
 */

function boolToLegacyFlag(v) {
  if (v === null || v === undefined) return null;
  return v ? 1 : 0;
}

/**
 * @param {object} entity - one canonical entity from data/canonical/names.json
 * @returns {object} a flat record shaped exactly like a data/names-enriched.json row
 */
function toLegacyNameRecord(entity) {
  if (!entity || !entity.identity) {
    throw new Error('[legacy-name-record] entity.identity is required — cannot build a legacy record without it.');
  }
  const { identity, classification, meaning, origin, language, pronunciation } = entity;

  return {
    id: identity.id,
    name: identity.name,
    gender: identity.gender,
    origin_country: origin ? (origin.country != null ? origin.country : null) : null,
    language: language ? (language.primary != null ? language.primary : null) : null,
    meaning: meaning ? (meaning.primary != null ? meaning.primary : null) : null,
    phonetic: pronunciation ? (pronunciation.ipa != null ? pronunciation.ipa : null) : null,
    syllables: pronunciation ? (pronunciation.syllableCount != null ? pronunciation.syllableCount : null) : null,
    first_letter: identity.firstLetter,
    is_traditional: classification ? boolToLegacyFlag(classification.isTraditional) : null,
    is_modern: classification ? boolToLegacyFlag(classification.isModern) : null,
    origin_cluster: origin ? (origin.cluster != null ? origin.cluster : null) : null,
    origin_confidence: origin ? (origin.confidence != null ? origin.confidence : null) : null,
  };
}

/** Converts an array of canonical entities to an array of legacy records, preserving order. */
function toLegacyNameRecords(entities) {
  return entities.map(toLegacyNameRecord);
}

module.exports = { toLegacyNameRecord, toLegacyNameRecords };
