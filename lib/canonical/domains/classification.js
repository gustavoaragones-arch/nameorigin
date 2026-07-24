/**
 * lib/canonical/domains/classification.js — owns ONLY the `classification` domain.
 * Sources: data/categories.json (categories[]), build/topic-clusters.json (styleTags, if present),
 * data/names.json (isTraditional/isModern).
 */

const { nullIfBlank } = require('../util.js');

function build(nameRow, ctx) {
  const categoryRows = ctx.categories.byNameId.get(nameRow.id) || [];
  const categories = categoryRows.map((r) => r.category).filter(Boolean);

  const cluster = ctx.topicClusters.byName[String(nameRow.name).toLowerCase()];
  const styleTags = cluster && cluster.style_cluster ? [cluster.style_cluster] : null;

  return {
    categories: nullIfBlank(categories),
    styleTags: nullIfBlank(styleTags),
    isTraditional: nameRow.is_traditional != null ? Boolean(nameRow.is_traditional) : null,
    isModern: nameRow.is_modern != null ? Boolean(nameRow.is_modern) : null,
  };
}

module.exports = { build };
