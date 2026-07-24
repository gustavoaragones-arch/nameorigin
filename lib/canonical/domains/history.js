/**
 * lib/canonical/domains/history.js — owns ONLY the `history` domain.
 *
 * historicalUsageNotes source: data/names-enriched.json's `history` field
 * (Phase 5E editorial overlay — documented historical usage only, never inference).
 *
 * firstRecordedUse / notableBearers: not populated in Wave 1; full editorial
 * history prose is stored in historicalUsageNotes per Phase 5E editorial format.
 */

const { nullIfBlank, nullIfAllFieldsBlank } = require('../util.js');

function build(nameRow, ctx) {
  const enriched = ctx.namesEnriched.byId.get(nameRow.id);
  if (!enriched) return null;
  return nullIfAllFieldsBlank({
    firstRecordedUse: null,
    notableBearers: null,
    historicalUsageNotes: nullIfBlank(enriched.history),
  });
}

module.exports = { build };
