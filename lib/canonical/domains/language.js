/**
 * lib/canonical/domains/language.js — owns ONLY the `language` domain.
 * Source: data/names-enriched.json's language field (populated by the same
 * merge step as origin.* — see lib/canonical/domains/origin.js).
 */

const { nullIfBlank, nullIfAllFieldsBlank } = require('../util.js');

function build(nameRow, ctx) {
  const enriched = ctx.namesEnriched.byId.get(nameRow.id);
  if (!enriched) return null;
  return nullIfAllFieldsBlank({
    primary: nullIfBlank(enriched.language),
    related: null, // no dataset currently supports related/cognate languages
  });
}

module.exports = { build };
