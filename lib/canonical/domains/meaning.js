/**
 * lib/canonical/domains/meaning.js — owns ONLY the `meaning` domain.
 * Source: data/names-enriched.json's meaning field (0.08% populated per
 * audit/knowledge-coverage.json — this is expected, not an error).
 *
 * Hard rule: if meaning is absent, this returns null. It NEVER substitutes
 * "a documented given name" or any other fallback text — that is the exact
 * behavior audit/fallback-taxonomy.json documented as the site's central
 * truthfulness finding, and this builder exists in part to not repeat it.
 */

const { nullIfBlank, nullIfAllFieldsBlank } = require('../util.js');

function build(nameRow, ctx) {
  const enriched = ctx.namesEnriched.byId.get(nameRow.id) || nameRow;
  return nullIfAllFieldsBlank({
    primary: nullIfBlank(enriched.meaning),
    alternates: null, // no dataset currently supports multiple meanings per name
    confidence: null, // no dataset currently supports a meaning-specific confidence score
  });
}

module.exports = { build };
