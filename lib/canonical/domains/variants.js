/**
 * lib/canonical/domains/variants.js — owns ONLY the `variants` domain.
 * Source: data/variants.json exclusively — the designated authoritative
 * producer (audit/knowledge-redundancy.json confirmed this dataset and
 * data/normalized-names.json's spelling_variants[] are byte-for-byte
 * identical across all 3,697 names; this builder picks one rather than
 * carrying both into the canonical record, per docs/CANONICAL_MIGRATION_PLAN.md's
 * "duplicate producer" guidance).
 */

const { nullIfBlank, nullIfAllFieldsBlank } = require('../util.js');

function build(nameRow, ctx) {
  const rows = ctx.variants.byNameId.get(nameRow.id) || [];
  const spellingVariants = rows
    .filter((r) => String(r.variant).toLowerCase() !== String(nameRow.name).toLowerCase())
    .map((r) => ({ spelling: r.variant, language: r.language || null }));
  return nullIfAllFieldsBlank({
    spellingVariants: nullIfBlank(spellingVariants),
    transliterations: null, // no current dataset supports non-Latin-script renderings
  });
}

module.exports = { build };
