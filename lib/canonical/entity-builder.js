/**
 * lib/canonical/entity-builder.js — Phase 3A Canonical Entity Builder.
 *
 * Orchestrates the 18 domain modules in lib/canonical/domains/ to assemble
 * one canonical Name Entity object per schemas/name-entity.schema.json,
 * from today's existing repository datasets (via lib/canonical/loaders.js).
 *
 * This module does not itself decide any domain's content — each domain's
 * own module (lib/canonical/domains/*.js) is the single owner of what goes
 * into its corresponding key on the returned object. This file's only
 * cross-domain responsibility is computing `metadata.dataCompletenessScore`,
 * which by definition requires seeing every other domain's populated state
 * (see lib/canonical/domains/metadata.js's header comment).
 *
 * Nothing in production reads this module yet. It is purely additive.
 */

const identity = require('./domains/identity.js');
const classification = require('./domains/classification.js');
const meaning = require('./domains/meaning.js');
const origin = require('./domains/origin.js');
const language = require('./domains/language.js');
const etymology = require('./domains/etymology.js');
const history = require('./domains/history.js');
const culture = require('./domains/culture.js');
const religion = require('./domains/religion.js');
const usage = require('./domains/usage.js');
const pronunciation = require('./domains/pronunciation.js');
const variants = require('./domains/variants.js');
const nicknames = require('./domains/nicknames.js');
const relatedNames = require('./domains/relatedNames.js');
const popularity = require('./domains/popularity.js');
const relationships = require('./domains/relationships.js');
const citations = require('./domains/citations.js');
const metadataDomain = require('./domains/metadata.js');

// Order matches schemas/name-entity.schema.json's property order. metadata
// is built last since it needs the other 17 domains' results.
const DOMAIN_BUILDERS = [
  ['identity', identity],
  ['classification', classification],
  ['meaning', meaning],
  ['origin', origin],
  ['language', language],
  ['etymology', etymology],
  ['history', history],
  ['culture', culture],
  ['religion', religion],
  ['usage', usage],
  ['pronunciation', pronunciation],
  ['variants', variants],
  ['nicknames', nicknames],
  ['relatedNames', relatedNames],
  ['popularity', popularity],
  ['relationships', relationships],
  ['citations', citations],
];

/** Fraction of non-null leaf fields across the whole entity (excluding metadata itself, which would be self-referential). Same counting method as audit/name-entity-examples.json (Phase 2A). */
function computeDataCompletenessScore(entityWithoutMetadata) {
  function countLeaves(obj) {
    let total = 0;
    let nonNull = 0;
    if (obj === null || obj === undefined) return { total: 1, nonNull: 0 };
    if (Array.isArray(obj)) return obj.length === 0 ? { total: 1, nonNull: 0 } : { total: 1, nonNull: 1 };
    if (typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        const r = countLeaves(obj[key]);
        total += r.total;
        nonNull += r.nonNull;
      }
      return { total, nonNull };
    }
    return { total: 1, nonNull: 1 };
  }
  const { total, nonNull } = countLeaves(entityWithoutMetadata);
  return total > 0 ? Number((nonNull / total).toFixed(4)) : 0;
}

/**
 * Builds one canonical entity for a single name row.
 * @param {object} nameRow - one record from data/names.json
 * @param {object} ctx - the loaded-dataset context from lib/canonical/loaders.js loadAll()
 * @param {string} buildTimestamp - ISO timestamp shared by every entity in this build run
 * @returns {object} a canonical Name Entity matching schemas/name-entity.schema.json
 */
function buildEntity(nameRow, ctx, buildTimestamp) {
  const entity = {};
  for (const [domainName, domainModule] of DOMAIN_BUILDERS) {
    entity[domainName] = domainModule.build(nameRow, ctx);
  }
  const dataCompletenessScore = computeDataCompletenessScore(entity);
  entity.metadata = metadataDomain.build(nameRow, ctx, { buildTimestamp, dataCompletenessScore });
  return entity;
}

/** Builds canonical entities for every name row in ctx.names. Returns an array in the same order as data/names.json. */
function buildAllEntities(ctx, buildTimestamp) {
  return ctx.names.map((nameRow) => buildEntity(nameRow, ctx, buildTimestamp));
}

module.exports = { buildEntity, buildAllEntities, computeDataCompletenessScore, DOMAIN_BUILDERS };
