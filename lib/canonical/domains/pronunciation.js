/**
 * lib/canonical/domains/pronunciation.js — owns ONLY the `pronunciation` domain.
 * syllableCount source: data/names.json's `syllables` field (the designated
 * authoritative source per docs/CANONICAL_BUILDER.md — data/normalized-names.json's
 * `syllable_estimate` is a confirmed-identical parallel producer, cross-checked
 * in scripts/build/validate-canonical.js, not re-loaded here to avoid carrying
 * a second copy of the same fact into the canonical record).
 *
 * phoneticSpelling source: data/names-enriched.json's `phonetic` field (Phase 5C
 * editorial overlay — documented respelling only, never IPA or inference).
 *
 * ipa / audioUrl: no current dataset populates these — always null, never a placeholder.
 */

const { nullIfBlank, nullIfAllFieldsBlank } = require('../util.js');

function build(nameRow, ctx) {
  const enriched = ctx.namesEnriched.byId.get(nameRow.id);
  return nullIfAllFieldsBlank({
    ipa: null,
    phoneticSpelling: enriched ? nullIfBlank(enriched.phonetic) : null,
    syllableCount: nameRow.syllables != null ? nameRow.syllables : null,
    audioUrl: null,
  });
}

module.exports = { build };
