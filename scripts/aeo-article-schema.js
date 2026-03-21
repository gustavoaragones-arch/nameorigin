/**
 * Phase 5.0 AEO + 5.3: Shared Article JSON-LD (author + dateModified) for sitewide EEAT.
 * Name pages may pass overrides: headline, description, mainEntityOfPage, about (Thing), mentions (Thing[]), hasPart (Question[]).
 */

const AEO_AUTHOR = {
  '@type': 'Organization',
  name: 'NameOrigin.io',
  parentOrganization: { '@type': 'Organization', name: 'Albor Digital LLC' },
};

const DATE_MODIFIED = '2026-01-01';

function mergeArticleSchema(overrides = {}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    author: AEO_AUTHOR,
    dateModified: DATE_MODIFIED,
    ...overrides,
  };
}

module.exports = { mergeArticleSchema, AEO_AUTHOR, DATE_MODIFIED };
