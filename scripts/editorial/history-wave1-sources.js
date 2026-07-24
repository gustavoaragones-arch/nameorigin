/**
 * Phase 5E — accepted source catalog for History Expansion Wave 1.
 * Editorial reference metadata only — not rendered to users.
 */

const ACCEPTED_SOURCE_TYPES = [
  'historical_name_dictionary',
  'academic_onomastic_reference',
  'university_publication',
  'historical_linguistic_reference',
  'national_language_authority',
  'historical_encyclopedia',
  'documented_historical_record',
];

const REJECTED_SOURCE_TYPES = [
  'ai_summary',
  'blog',
  'seo_article',
  'user_generated_content',
  'popularity_website',
  'speculation',
  'undocumented_claim',
];

const SOURCE_CATALOG = {
  Hebrew: [
    {
      type: 'historical_name_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
    {
      type: 'documented_historical_record',
      reference: 'Anchor Yale Bible Dictionary — Personal Names',
    },
  ],
  Greek: [
    {
      type: 'historical_name_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
    {
      type: 'academic_onomastic_reference',
      reference: 'Lexicon of Greek Personal Names (LGPN)',
    },
  ],
  Latin: [
    {
      type: 'historical_name_dictionary',
      reference: 'Dictionary of Medieval Names from European Sources (DMNES)',
    },
    {
      type: 'historical_name_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
  ],
  English: [
    {
      type: 'historical_name_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
    {
      type: 'historical_encyclopedia',
      reference: 'Oxford Dictionary of National Biography — name bearer entries',
    },
  ],
  French: [
    {
      type: 'historical_name_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
    {
      type: 'national_language_authority',
      reference: 'Académie française — historical name usage references',
    },
  ],
  Irish: [
    {
      type: 'historical_name_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
    {
      type: 'national_language_authority',
      reference: 'Irish Genealogical Research Society — Gaelic name usage records',
    },
  ],
  Sanskrit: [
    {
      type: 'academic_onomastic_reference',
      reference: 'University of Delhi — Sanskrit personal name usage references',
    },
    {
      type: 'historical_name_dictionary',
      reference: 'Oxford Dictionary of First Names — Indian name usage key',
    },
  ],
  Arabic: [
    {
      type: 'historical_name_dictionary',
      reference: 'Oxford Dictionary of First Names — Arabic name usage key',
    },
    {
      type: 'documented_historical_record',
      reference: 'Encyclopaedia of Islam — personal name entries',
    },
  ],
  African: [
    {
      type: 'academic_onomastic_reference',
      reference: 'Oxford Dictionary of First Names — African name usage key',
    },
  ],
  Slavic: [
    {
      type: 'historical_name_dictionary',
      reference: 'Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)',
    },
  ],
  default: [
    {
      type: 'historical_name_dictionary',
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
  REJECTED_SOURCE_TYPES,
  SOURCE_CATALOG,
  confidenceLevel,
  sourcesForCluster,
};
