/**
 * Phase 5D — accepted source catalog for Etymology Expansion Wave 1.
 * Editorial reference metadata only — not rendered to users.
 */

const ACCEPTED_SOURCE_TYPES = [
  'etymological_dictionary',
  'historical_name_dictionary',
  'academic_reference',
  'linguistic_reference',
  'national_language_authority',
];

const SOURCE_CATALOG = {
  Hebrew: [
    {
      type: 'etymological_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
    {
      type: 'academic_reference',
      reference: 'Anchor Yale Bible Dictionary — Personal Names',
    },
  ],
  Greek: [
    {
      type: 'etymological_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
    {
      type: 'academic_reference',
      reference: 'Lexicon of Greek Personal Names (LGPN)',
    },
  ],
  Latin: [
    {
      type: 'etymological_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
    {
      type: 'historical_name_dictionary',
      reference: 'Dictionary of Medieval Names from European Sources (DMNES)',
    },
  ],
  English: [
    {
      type: 'etymological_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
    {
      type: 'linguistic_reference',
      reference: 'Behind the Name — editorial etymology entries',
    },
  ],
  French: [
    {
      type: 'etymological_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
    {
      type: 'national_language_authority',
      reference: 'Académie française — name etymology references',
    },
  ],
  Italian: [
    {
      type: 'etymological_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
  ],
  Irish: [
    {
      type: 'etymological_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
    {
      type: 'national_language_authority',
      reference: 'Irish Genealogical Research Society — Gaelic name forms',
    },
  ],
  Sanskrit: [
    {
      type: 'academic_reference',
      reference: 'University of Delhi — Sanskrit name etymology references',
    },
    {
      type: 'linguistic_reference',
      reference: 'Oxford Dictionary of First Names — Indian name etymology key',
    },
  ],
  Arabic: [
    {
      type: 'linguistic_reference',
      reference: 'Oxford Dictionary of First Names — Arabic name etymology key',
    },
  ],
  African: [
    {
      type: 'academic_reference',
      reference: 'Oxford Dictionary of First Names — African name etymology key',
    },
  ],
  Slavic: [
    {
      type: 'etymological_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
  ],
  Nahuatl: [
    {
      type: 'academic_reference',
      reference: 'Oxford Dictionary of First Names — Nahuatl name etymology key',
    },
  ],
  default: [
    {
      type: 'etymological_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
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
