/**
 * lib/canonical/domains/usage.js — owns ONLY the `usage` domain.
 * usage.regionsOfUse is DERIVED from this same entity's own popularity
 * rows (data/popularity.json) — it takes popularity data as an input to
 * compute a usage-domain fact, but never writes to the popularity domain
 * itself (ownership boundary: this module returns only `usage.*` fields).
 */

const { nullIfBlank, nullIfAllFieldsBlank } = require('../util.js');

function build(nameRow, ctx) {
  const popRows = ctx.popularity.byNameId.get(nameRow.id) || [];
  const countries = [...new Set(popRows.map((r) => r.country).filter(Boolean))];
  return nullIfAllFieldsBlank({
    regionsOfUse: nullIfBlank(countries),
    isUnisex: nameRow.gender === 'unisex',
  });
}

module.exports = { build };
