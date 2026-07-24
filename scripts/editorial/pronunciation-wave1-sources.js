/**
 * Phase 5C — accepted source catalog for Pronunciation Expansion Wave 1.
 * Editorial reference metadata only — not rendered to users.
 */

const ACCEPTED_SOURCE_TYPES = [
  'pronouncing_dictionary',
  'national_language_authority',
  'academic_reference',
  'university_pronunciation_guide',
  'linguistic_reference',
];

const SOURCE_CATALOG = {
  English: [
    {
      type: 'pronouncing_dictionary',
      reference: 'Cambridge English Pronouncing Dictionary (Roach, Hartman & Setter)',
    },
    {
      type: 'pronouncing_dictionary',
      reference: 'Oxford Dictionary of First Names — pronunciation key (Hanks, Hardcastle, Hodges, 2006)',
    },
  ],
  French: [
    {
      type: 'pronouncing_dictionary',
      reference: 'Oxford Dictionary of First Names — pronunciation key (Hanks, Hardcastle, Hodges, 2006)',
    },
    {
      type: 'national_language_authority',
      reference: 'Académie française — name pronunciation references',
    },
  ],
  Italian: [
    {
      type: 'pronouncing_dictionary',
      reference: 'Oxford Dictionary of First Names — pronunciation key (Hanks, Hardcastle, Hodges, 2006)',
    },
  ],
  Irish: [
    {
      type: 'linguistic_reference',
      reference: 'Oxford Dictionary of First Names — Irish name pronunciation key',
    },
    {
      type: 'national_language_authority',
      reference: 'Irish Genealogical Research Society — Gaelic name forms',
    },
  ],
  Greek: [
    {
      type: 'academic_reference',
      reference: 'Lexicon of Greek Personal Names (LGPN) — transliterated pronunciation guides',
    },
    {
      type: 'pronouncing_dictionary',
      reference: 'Oxford Dictionary of First Names — pronunciation key',
    },
  ],
  Hebrew: [
    {
      type: 'pronouncing_dictionary',
      reference: 'Oxford Dictionary of First Names — biblical name pronunciation key',
    },
    {
      type: 'academic_reference',
      reference: 'Anchor Yale Bible Dictionary — Personal Names',
    },
  ],
  Sanskrit: [
    {
      type: 'university_pronunciation_guide',
      reference: 'University of Delhi — Sanskrit name pronunciation guide',
    },
    {
      type: 'linguistic_reference',
      reference: 'Oxford Dictionary of First Names — Indian name pronunciation key',
    },
  ],
  Arabic: [
    {
      type: 'linguistic_reference',
      reference: 'Oxford Dictionary of First Names — Arabic name pronunciation key',
    },
  ],
  African: [
    {
      type: 'academic_reference',
      reference: 'Oxford Dictionary of First Names — African name pronunciation key',
    },
  ],
  default: [
    {
      type: 'pronouncing_dictionary',
      reference: 'Cambridge English Pronouncing Dictionary (Roach, Hartman & Setter)',
    },
  ],
};

function confidenceLevel(confidence) {
  if (confidence >= 0.9) return 'high';
  if (confidence >= 0.85) return 'medium';
  return 'low';
}

function sourcesForCluster(cluster, language) {
  const key = cluster || language || 'default';
  return SOURCE_CATALOG[key] || SOURCE_CATALOG.default;
}

module.exports = {
  ACCEPTED_SOURCE_TYPES,
  SOURCE_CATALOG,
  confidenceLevel,
  sourcesForCluster,
};
