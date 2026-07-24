/**
 * lib/canonical/domains/relationships.js — owns ONLY the `relationships` domain.
 *
 * comparisonPairs[]: direct per-entity lookup in data/country-differentials.json's
 * entries[] (a real per-name-per-country dataset). Included even though Phase 1C
 * found no live generator currently reads this file for compare pages
 * (scripts/generate-compare-pages.js computes independently from
 * data/popularity.json instead, per audit/knowledge-redundancy.json
 * compare-page-orphaned-dataset) — the canonical builder's job is to
 * assemble what the datasets contain, not to replicate current generator
 * behavior.
 *
 * KNOWN SCHEMA-SHAPE DEVIATION (documented, not silent): the Phase 2A
 * schema's illustrative shape for this field was {countryA, countryB,
 * rankA, rankB} — a country-PAIR shape, matching the /compare/{name}/
 * {a}-vs-{b}/ page structure. The real data/country-differentials.json
 * data is per-SINGLE-country (verified: all 5 current entries each cover
 * exactly one country for their name; 0 of 5 names have a second country
 * row to pair against). Rather than fabricate a second country's data to
 * force-fit the pair shape, this builder emits the real per-country shape
 * {country, rank, priorRank, delta, volatilityScore} and documents the
 * deviation here and in audit/canonical-validation.json, per the hard rule
 * that this builder never fabricates data to satisfy a shape.
 *
 * surnameCompatibility[] / siblingPairs[]: DEFERRED. Both require invoking
 * (or re-implementing) cross-entity SCORING logic — scripts/generate-smoothness-score.js
 * against all 75 surnames, and scripts/generate-sibling-harmony.js against
 * other names — which is out of scope for a per-entity data-assembly pass
 * (see lib/canonical/domains/relatedNames.js for the identical scoping
 * argument re: similarNameIds). Always null here.
 */

const { nullIfBlank, nullIfAllFieldsBlank } = require('../util.js');

function build(nameRow, ctx) {
  const cdRows = ctx.countryDifferentials.byNameId.get(nameRow.id) || [];
  const comparisonPairs = cdRows.map((r) => ({
    country: r.country,
    rank: r.rank_2025 != null ? r.rank_2025 : null,
    priorRank: r.rank_2015 != null ? r.rank_2015 : null,
    delta: r.delta != null ? r.delta : null,
    volatilityScore: r.volatility_score != null ? r.volatility_score : null,
  }));

  return nullIfAllFieldsBlank({
    surnameCompatibility: null,
    siblingPairs: null,
    comparisonPairs: nullIfBlank(comparisonPairs),
  });
}

module.exports = { build };
