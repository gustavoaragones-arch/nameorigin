/**
 * lib/canonical/domains/etymology.js — owns ONLY the `etymology` domain.
 *
 * derivationNotes source: data/names-enriched.json's `etymology` field (Phase 5D
 * editorial overlay — documented etymology text only, never inference).
 *
 * rootWord / rootLanguage: not populated in Wave 1; full editorial etymology
 * prose is stored in derivationNotes per Phase 5D editorial format.
 */

const { nullIfBlank, nullIfAllFieldsBlank } = require('../util.js');

function build(nameRow, ctx) {
  const enriched = ctx.namesEnriched.byId.get(nameRow.id);
  if (!enriched) return null;
  return nullIfAllFieldsBlank({
    rootWord: null,
    rootLanguage: null,
    derivationNotes: nullIfBlank(enriched.etymology),
  });
}

module.exports = { build };
