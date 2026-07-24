/**
 * lib/canonical/domains/relatedNames.js — owns ONLY the `relatedNames` domain.
 *
 * equivalents[]: per-entity lookup in data/name-equivalents.json (closed,
 * curated set, keyed by lowercase anchor name) — populated when this name
 * IS an anchor, null otherwise.
 *
 * clusterId: per-entity lookup in build/topic-clusters.json's by_name index
 * (already-computed, keyed by slug) — a deterministic composite string, not
 * recomputed here.
 *
 * similarNameIds[]: DEFERRED. Computing this requires comparing this name
 * against all 3,696 others (phonetic/origin/popularity/gender pools, per
 * scripts/generate-names-like.js) — a cross-entity computation, not a
 * per-entity dataset lookup. Per the Phase 3A brief ("assembles one
 * canonical Name Entity from the existing repository datasets"), this
 * builder assembles per-entity facts; cross-entity similarity scoring is
 * left to a future phase (see audit/migration-risk-register.json risk-07
 * for the related whole-domain migration-ordering note). Always null here
 * — not a placeholder, an honest "not computed by this builder."
 */

const { nullIfAllFieldsBlank } = require('../util.js');

function build(nameRow, ctx) {
  const anchorKey = String(nameRow.name).toLowerCase();
  const equivEntry = ctx.nameEquivalents[anchorKey];
  const equivalents = equivEntry && Array.isArray(equivEntry.equivalents)
    ? equivEntry.equivalents.map((e) => ({ language: e.lang || null, nameId: e.slug || null }))
    : null;

  const cluster = ctx.topicClusters.byName[String(nameRow.name).toLowerCase()];
  const clusterId = cluster
    ? [cluster.origin_cluster, cluster.gender, cluster.first_letter, cluster.popularity_band, cluster.style_cluster].map((v) => v || '_').join('|')
    : null;

  return nullIfAllFieldsBlank({
    equivalents,
    similarNameIds: null,
    clusterId,
  });
}

module.exports = { build };
