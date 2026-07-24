/**
 * lib/canonical/domains/identity.js — owns ONLY schemas/name-entity.schema.json's `identity` domain.
 * Source: data/names.json (id, name, gender, first_letter), data/normalized-names.json (slug).
 * Always populated — every entity has an identity by construction (see schema: identity is the
 * one domain without a "no current data" escape hatch).
 */

function build(nameRow, ctx) {
  const normalized = ctx.normalizedNames.byId.get(nameRow.id);
  const slug = normalized ? normalized.slug : null;
  if (!slug) {
    // identity.slug is required by schemas/name-entity.schema.json — fail loudly rather
    // than silently emitting an invalid entity.
    throw new Error(`[identity] No slug found in data/normalized-names.json for name_id=${nameRow.id} (${nameRow.name})`);
  }
  return {
    id: nameRow.id,
    slug,
    name: nameRow.name,
    gender: nameRow.gender,
    firstLetter: nameRow.first_letter,
  };
}

module.exports = { build };
