/**
 * lib/canonical/domains/religion.js — owns ONLY the `religion` domain.
 * No current repository dataset backs this domain. Confirmed absent from
 * the entire project in Phase 1A (audit/entity-map.json entities.religions,
 * count: 0). Always returns null.
 *
 * Explicitly NOT derived from data/categories.json's "biblical" tag — that
 * tag is a style/theme classification, not a religious-tradition fact, and
 * is deliberately routed to classification.categories[] instead (see
 * lib/canonical/domains/classification.js and
 * docs/CANONICAL_KNOWLEDGE_MODEL.md, "Domain boundaries").
 */

function build(_nameRow, _ctx) {
  return null;
}

module.exports = { build };
