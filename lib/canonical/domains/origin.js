/**
 * lib/canonical/domains/origin.js — owns ONLY the `origin` domain.
 * Source: data/names-enriched.json exclusively (origin_country, origin_cluster,
 * origin_confidence) — NEVER data/names.json's unenriched copy.
 *
 * This is the direct structural fix for the origin-dual-file-split finding
 * (audit/knowledge-redundancy.json): every entity this builder produces gets
 * its origin from the one enriched source, regardless of which generator
 * later reads it through an adapter — there is no second, weaker copy to
 * accidentally read instead.
 */

const { nullIfBlank, nullIfAllFieldsBlank } = require('../util.js');

function build(nameRow, ctx) {
  const enriched = ctx.namesEnriched.byId.get(nameRow.id);
  if (!enriched) return null;
  return nullIfAllFieldsBlank({
    country: nullIfBlank(enriched.origin_country),
    cluster: nullIfBlank(enriched.origin_cluster),
    confidence: enriched.origin_confidence != null ? enriched.origin_confidence : null,
  });
}

module.exports = { build };
