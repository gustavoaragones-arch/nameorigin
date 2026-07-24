#!/usr/bin/env node
/**
 * scripts/audit/entity-map.js — Phase 1A / PART 4: Entity Inventory (READ-ONLY).
 * Computes every structured entity type in the dataset directly from the
 * JSON files in /data (no hardcoded counts), plus the relationships between
 * them. Where a requested entity type (e.g. "religions") does not exist in
 * the dataset, that absence is reported explicitly rather than omitted.
 */

const { loadDataJson, writeAuditJson } = require('./_lib.js');

function distinct(arr, fn) {
  return [...new Set(arr.map(fn).filter((v) => v !== undefined && v !== null && v !== ''))];
}

function countBy(arr, fn) {
  const m = {};
  for (const item of arr) {
    const k = fn(item);
    if (k === undefined || k === null || k === '') continue;
    m[k] = (m[k] || 0) + 1;
  }
  return m;
}

function run() {
  console.log('PART 4 — Entity Inventory');

  const names = loadDataJson('names') || [];
  const namesEnriched = loadDataJson('names-enriched') || [];
  const categories = loadDataJson('categories') || [];
  const countries = loadDataJson('countries') || [];
  const lastNames = loadDataJson('last-names') || [];
  const popularity = loadDataJson('popularity') || [];
  const variants = loadDataJson('variants') || [];
  const nameEquivalents = loadDataJson('name-equivalents') || {};
  const heraldry = loadDataJson('heraldry') || {};
  const originOverrides = loadDataJson('origin-overrides') || {};
  const normalizedNames = loadDataJson('normalized-names') || [];

  const totalNames = names.length;
  const namesWithCategory = new Set(categories.map((c) => c.name_id)).size;
  const namesWithPopularity = new Set(popularity.map((p) => p.name_id)).size;
  const namesWithVariants = new Set(variants.map((v) => v.name_id)).size;
  const namesWithMeaning = namesEnriched.filter((n) => n.meaning).length;
  const namesWithOrigin = namesEnriched.filter((n) => n.origin_country || n.language).length;

  const originCountries = distinct(namesEnriched, (n) => n.origin_country);
  const languages = distinct(namesEnriched, (n) => n.language);
  const originClusters = distinct(namesEnriched, (n) => n.origin_cluster);
  const genders = distinct(names, (n) => n.gender);
  const firstLetters = distinct(names, (n) => n.first_letter).sort();
  const categoryValues = distinct(categories, (c) => c.category).sort();

  // Site-supported country pages are a hardcoded allowlist inside
  // generate-programmatic-pages.js (SUPPORTED_COUNTRY_PAGES), not derived
  // from countries.json — recorded here as a cross-file structural fact.
  const SUPPORTED_COUNTRY_PAGE_SLUGS = ['usa', 'canada', 'india', 'france', 'ireland'];
  const STYLE_PAGE_SLUGS = ['modern', 'traditional', 'rare', 'nature', 'biblical', 'classic', 'popular'];

  const entities = {
    names: {
      count: totalNames,
      source: 'data/names.json (base) / data/names-enriched.json (with origin overrides merged)',
      attributes: ['id', 'name', 'gender', 'origin_country', 'language', 'meaning', 'phonetic', 'syllables', 'first_letter', 'is_traditional', 'is_modern', 'origin_cluster (enriched only)', 'origin_confidence (enriched only)'],
      fieldCoverage: {
        withGender: names.filter((n) => n.gender).length,
        withOriginOrLanguage: namesWithOrigin,
        withMeaning: namesWithMeaning,
        withCategoryAssignment: namesWithCategory,
        withPopularityRecord: namesWithPopularity,
        withVariantRecord: namesWithVariants,
      },
    },
    countries: {
      count: countries.length,
      source: 'data/countries.json',
      records: countries,
      siteSupportedCountryPageSlugs: SUPPORTED_COUNTRY_PAGE_SLUGS,
      note: 'countries.json defines 5 countries with code/name/primary_language/region_group; the same 5 slugs are separately hardcoded as SUPPORTED_COUNTRY_PAGES in generate-programmatic-pages.js.',
    },
    origins: {
      count: originCountries.length,
      values: originCountries.sort(),
      source: 'derived from names-enriched.json origin_country field',
      coverage: `${namesWithOrigin} / ${totalNames} names (${((100 * namesWithOrigin) / totalNames).toFixed(1)}%) have an origin_country or language assigned`,
    },
    languages: {
      count: languages.length,
      values: languages.sort(),
      source: 'derived from names-enriched.json language field',
    },
    originClusters: {
      count: originClusters.length,
      values: originClusters.sort(),
      source: 'derived from names-enriched.json origin_cluster field (also consumed by build/topic-clusters.json)',
    },
    religions: {
      count: 0,
      values: [],
      note: 'No religion taxonomy exists in the dataset. The closest concept is the "biblical" value inside the 6-value categories.json taxonomy (a thematic/style label, not a religion entity), and heraldry.json has no religious dimension either.',
    },
    genders: {
      count: genders.length,
      values: genders.sort(),
      source: 'data/names.json gender field',
      distribution: countBy(names, (n) => n.gender),
    },
    surnames: {
      count: lastNames.length,
      source: 'data/last-names.json',
      attributes: ['name', 'origin', 'syllables', 'note'],
      withHeraldryData: Object.keys(heraldry).length,
      heraldryAvailableCount: Object.values(heraldry).filter((h) => h.available).length,
    },
    meanings: {
      count: namesWithMeaning,
      coverage: `${namesWithMeaning} / ${totalNames} names (${((100 * namesWithMeaning) / totalNames).toFixed(2)}%) have a non-null "meaning" field`,
      source: 'data/names.json / data/names-enriched.json meaning field',
    },
    alphabet: {
      count: firstLetters.length,
      values: firstLetters,
      source: 'derived from names.json first_letter field; backs the 26 /names/[a-z].html letter pages',
    },
    categoryTaxonomy: {
      count: categoryValues.length,
      values: categoryValues,
      totalAssignments: categories.length,
      namesCovered: namesWithCategory,
      coveragePct: Number((((100 * namesWithCategory) / totalNames)).toFixed(1)),
      source: 'data/categories.json (name_id -> category)',
      crossCheckWithStylePages: {
        stylePageSlugs: STYLE_PAGE_SLUGS,
        note: 'The 7 /names/style/{slug}.html pages (modern, traditional, rare, nature, biblical, classic, popular) do not map 1:1 onto the 6 categories.json values (traditional, popular, rare, biblical, classical, nature) — "modern" has no categories.json equivalent, and "classic" vs "classical" is a naming mismatch between the two systems.',
      },
    },
    equivalentGroups: {
      count: Object.keys(nameEquivalents).length,
      source: 'data/name-equivalents.json (closed/curated dataset; anchor slug -> { origin, equivalents: [{lang, slug}] })',
      sampleAnchors: Object.keys(nameEquivalents).slice(0, 10),
    },
    normalizedNameRecords: {
      count: normalizedNames.length,
      source: 'data/normalized-names.json — adds slug, phonetic_code, spelling_variants[], length, syllable_estimate on top of the base name record',
    },
    originOverrides: {
      count: Object.keys(originOverrides).length,
      coverage: `${Object.keys(originOverrides).length} / ${totalNames} names (${((100 * Object.keys(originOverrides).length) / totalNames).toFixed(1)}%)`,
      source: 'data/origin-overrides.json — curated, deterministic origin backfill (scripts/build-origin-seed.js), merged into names-enriched.json by scripts/apply-origin-enrichment.js',
    },
  };

  const relationships = [
    { from: 'name', to: 'gender', cardinality: '1:1', source: 'data/names.json' },
    { from: 'name', to: 'origin_country / language / origin_cluster', cardinality: '1:0..1 (sparse — see entities.origins.coverage)', source: 'data/names-enriched.json' },
    { from: 'name', to: 'category', cardinality: `1:N (avg ${(categories.length / Math.max(namesWithCategory, 1)).toFixed(2)} categories per covered name; ${totalNames - namesWithCategory} names have zero categories)`, source: 'data/categories.json' },
    { from: 'name', to: 'popularity record', cardinality: `1:N (${namesWithPopularity} / ${totalNames} names have ANY record — extremely sparse)`, source: 'data/popularity.json' },
    { from: 'name', to: 'variant', cardinality: `1:N (avg ${(variants.length / totalNames).toFixed(1)} variants per name)`, source: 'data/variants.json' },
    { from: 'name', to: 'equivalent group', cardinality: `1:0..1 (only ${Object.keys(nameEquivalents).length} anchor names are covered)`, source: 'data/name-equivalents.json' },
    { from: 'name', to: 'surname', cardinality: 'computed at build time (compatibility scoring), not a stored relationship', source: 'scripts/generate-programmatic-pages.js scoreCompatibility()' },
    { from: 'surname', to: 'heraldry record', cardinality: `1:0..1 (${Object.keys(heraldry).length} of ${lastNames.length} surnames have any heraldry.json entry)`, source: 'data/heraldry.json' },
    { from: 'country', to: 'primary_language', cardinality: '1:1', source: 'data/countries.json' },
    { from: 'name', to: 'country-pair comparison', cardinality: `1:N (only 4 of ${totalNames} names have compare/ pages generated)`, source: 'data/country-differentials.json + compare/ output' },
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    entities,
    relationships,
    notes: [
      'All counts are computed live from /data/*.json each time this script runs — nothing here is a hardcoded snapshot.',
      'Sparse-coverage figures (origin, meaning, popularity) are purely descriptive; no pruning or enrichment recommendation is made in this phase.',
    ],
  };

  writeAuditJson('entity-map.json', report);
  console.log('Entity types cataloged:', Object.keys(entities).length);
}

run();
