/**
 * lib/canonical/domains/metadata.js — owns ONLY the `metadata` domain.
 *
 * schemaVersion is a fixed constant (schemas/name-entity.schema.json's own
 * metadata.schemaVersion const value). createdAt/lastUpdated are stamped
 * from the single build-run timestamp entity-builder.js computes ONCE per
 * build (not per entity — every entity in the same build run shares an
 * identical timestamp, which is what "deterministic" means here: the same
 * input dataset state plus the same build run always produces the same
 * output).
 *
 * dataCompletenessScore is the one field this module cannot compute itself
 * (it requires seeing every OTHER domain's populated state, not just its
 * own inputs) — entity-builder.js computes it once, after all domains are
 * assembled, and passes it in. This is orchestration, not another module
 * "populating metadata" — see docs/CANONICAL_BUILDER.md, "Ownership rules".
 */

function build(_nameRow, _ctx, { buildTimestamp, dataCompletenessScore }) {
  return {
    schemaVersion: '1.0.0',
    createdAt: buildTimestamp,
    lastUpdated: buildTimestamp,
    dataCompletenessScore,
  };
}

module.exports = { build };
