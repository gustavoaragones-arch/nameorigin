/**
 * lib/canonical/domains/popularity.js — owns ONLY the `popularity` domain.
 * records[]: direct per-entity lookup in data/popularity.json (the sole real
 * ranking-data source — 0.14% entity-level coverage per audit/knowledge-coverage.json,
 * expected, not an error).
 *
 * trendAcceleration: DEFERRED. data/regional-trend-acceleration.json is
 * structured per-COUNTRY (by_country), not per-name — there is no direct
 * per-entity row to look up, only a country-level aggregate a future phase
 * would need to relate back to individual names via their popularity
 * records. Always null here rather than guessed at.
 */

const { nullIfBlank, nullIfAllFieldsBlank } = require('../util.js');

function build(nameRow, ctx) {
  const rows = ctx.popularity.byNameId.get(nameRow.id) || [];
  const records = rows.map((r) => ({
    country: r.country,
    year: r.year,
    rank: r.rank != null ? r.rank : null,
    count: r.count != null ? r.count : null,
    trendDirection: r.trend_direction != null ? r.trend_direction : null,
  }));
  return nullIfAllFieldsBlank({
    records: nullIfBlank(records),
    trendAcceleration: null,
  });
}

module.exports = { build };
