/**
 * Phase 5A — accepted source catalog for Origin Expansion Wave 1.
 * Editorial reference metadata only — not rendered to users.
 */

const ACCEPTED_SOURCE_TYPES = [
  'onomastic_dictionary',
  'academic_reference',
  'biblical_onomastics',
  'national_naming_authority',
  'historical_name_dictionary',
];

const SOURCE_CATALOG = {
  Hebrew: [
    {
      type: 'onomastic_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
    {
      type: 'biblical_onomastics',
      reference: 'Anchor Yale Bible Dictionary — Personal Names',
    },
  ],
  Greek: [
    {
      type: 'onomastic_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
    {
      type: 'academic_reference',
      reference: 'Lexicon of Greek Personal Names (LGPN)',
    },
  ],
  Latin: [
    {
      type: 'onomastic_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
    {
      type: 'historical_name_dictionary',
      reference: 'Dictionary of Medieval Names from European Sources (DMNES)',
    },
  ],
  Italian: [
    {
      type: 'onomastic_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
  ],
  French: [
    {
      type: 'onomastic_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
  ],
  Irish: [
    {
      type: 'onomastic_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
    {
      type: 'national_naming_authority',
      reference: 'Irish Genealogical Research Society — Gaelic name forms',
    },
  ],
  German: [
    {
      type: 'onomastic_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
  ],
  Germanic: [
    {
      type: 'onomastic_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
  ],
  English: [
    {
      type: 'onomastic_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
  ],
  Spanish: [
    {
      type: 'onomastic_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
  ],
  Scottish: [
    {
      type: 'onomastic_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
  ],
  Welsh: [
    {
      type: 'onomastic_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
  ],
  Arabic: [
    {
      type: 'academic_reference',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
  ],
  Sanskrit: [
    {
      type: 'academic_reference',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
  ],
  Indian: [
    {
      type: 'academic_reference',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
  ],
  Nordic: [
    {
      type: 'onomastic_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
  ],
  Russian: [
    {
      type: 'onomastic_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
  ],
  Persian: [
    {
      type: 'academic_reference',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
  ],
  African: [
    {
      type: 'academic_reference',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
  ],
  default: [
    {
      type: 'onomastic_dictionary',
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
