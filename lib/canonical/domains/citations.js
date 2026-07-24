/**
 * lib/canonical/domains/citations.js — owns ONLY the `citations` domain.
 * No confirmed live producer exists today: data/normalized-names.json's
 * meaning_source/origin_source/confidence_score columns (the closest
 * current equivalent) were found present-but-always-null in Phase 2A —
 * scripts/enrich-meanings.js, their intended producer, does not appear to
 * be wired into the live build path (audit/migration-risk-register.json
 * risk-06). Reading those always-null columns would add nothing; this
 * always returns null rather than surface three empty-but-present fields.
 */

function build(_nameRow, _ctx) {
  return null;
}

module.exports = { build };
