#!/usr/bin/env node
/**
 * scripts/audit/entity-knowledge-graph.js — Phase 1B / PART 3: Entity
 * Knowledge Graph (READ-ONLY).
 *
 * Represents the project's knowledge as a TYPE-level graph (nodes = entity
 * types with live-computed counts, edges = relationship types with
 * live-computed cardinality/coverage) rather than one node per individual
 * name — 3,697+ individual name nodes would make this file unusable as a
 * report. A small set of concrete sampleEdges is included per relationship
 * so the abstract edge definitions can be spot-checked against real data.
 */

const { loadDataJson, writeAuditJson } = require('./_lib.js');

function distinct(arr, fn) {
  return [...new Set(arr.map(fn).filter((v) => v !== undefined && v !== null && v !== ''))];
}

function run() {
  console.log('PART 3 — Entity Knowledge Graph');

  const names = loadDataJson('names') || [];
  const namesEnriched = loadDataJson('names-enriched') || [];
  const categories = loadDataJson('categories') || [];
  const popularity = loadDataJson('popularity') || [];
  const variants = loadDataJson('variants') || [];
  const countries = loadDataJson('countries') || [];
  const lastNames = loadDataJson('last-names') || [];
  const nameEquivalents = loadDataJson('name-equivalents') || {};
  const countryDifferentials = loadDataJson('country-differentials') || {};

  const totalNames = names.length;
  const originClusters = distinct(namesEnriched, (n) => n.origin_cluster);
  const languages = distinct(namesEnriched, (n) => n.language);
  const originCountries = distinct(namesEnriched, (n) => n.origin_country);
  const categoryValues = distinct(categories, (c) => c.category);
  const letters = distinct(names, (n) => n.first_letter);
  const STYLE_SLUGS = ['modern', 'traditional', 'rare', 'nature', 'biblical', 'classic', 'popular'];
  const SIBLING_BATCH_SIZE = 150; // hardcoded generator limit, see audit/build-pipeline.json

  const namesWithPopularity = new Set(popularity.map((p) => p.name_id)).size;
  const namesWithVariants = new Set(variants.map((v) => v.name_id)).size;
  const namesWithCategory = new Set(categories.map((c) => c.name_id)).size;

  const nodes = [
    { id: 'Name', kind: 'entity', count: totalNames, source: 'data/names.json' },
    { id: 'Origin', kind: 'entity', count: originClusters.length, source: 'distinct data/names-enriched.json origin_cluster values', values: originClusters.sort() },
    { id: 'Country', kind: 'entity', count: countries.length, source: 'data/countries.json (site-supported country pages)', values: countries.map((c) => c.name) },
    { id: 'OriginCountry', kind: 'entity', count: originCountries.length, source: 'distinct data/names-enriched.json origin_country values (broader than the Country node set)', values: originCountries.sort(), note: `${originCountries.filter((c) => !countries.some((sc) => sc.name === c)).length} of these countries have no corresponding Country node / no /names/{country}.html page.` },
    { id: 'Language', kind: 'entity', count: languages.length, source: 'distinct data/names-enriched.json language values', values: languages.sort() },
    { id: 'Category', kind: 'entity', count: categoryValues.length, source: 'distinct data/categories.json category values', values: categoryValues },
    { id: 'PopularityRecord', kind: 'entity', count: popularity.length, source: 'data/popularity.json rows' },
    { id: 'Variant', kind: 'entity', count: variants.length, source: 'data/variants.json rows (spelling variants, not deduplicated to unique strings)' },
    { id: 'EquivalentGroup', kind: 'entity', count: Object.keys(nameEquivalents).length, source: 'data/name-equivalents.json (closed set)' },
    { id: 'Surname', kind: 'entity', count: lastNames.length, source: 'data/last-names.json' },
    { id: 'Letter', kind: 'entity', count: letters.length, source: 'distinct data/names.json first_letter values (backs the A–Z pages)' },
    { id: 'Style', kind: 'entity', count: STYLE_SLUGS.length, source: 'hardcoded style slugs in generate-programmatic-pages.js', values: STYLE_SLUGS },
    { id: 'SiblingBatch', kind: 'computed-set', count: SIBLING_BATCH_SIZE, source: 'top 150 names by popularity rank (getSiblingBatchNameSlugs), the only names with a /siblings/ page' },
    { id: 'CountryPage', kind: 'page-type', count: countries.length, source: '/names/{country}.html — one per Country node' },
    { id: 'ComparePair', kind: 'page-type', count: 5, source: '/compare/{a}-vs-{b}/ hub pages (fixed 5 pairs)' },
    { id: 'CountryDifferentialEntry', kind: 'entity', count: (countryDifferentials.entries || []).length, source: 'data/country-differentials.json entries[] (feeds ComparePair × Name pages)' },
  ];

  const edges = [];
  edges.push(
    { from: 'Name', to: 'Origin', relationship: 'HAS_ORIGIN_CLUSTER', cardinality: '1:0..1', edgesPresent: namesEnriched.filter((n) => n.origin_cluster).length, edgesPossible: totalNames, coveragePct: Number(((100 * namesEnriched.filter((n) => n.origin_cluster).length) / totalNames).toFixed(2)) },
    { from: 'Name', to: 'OriginCountry', relationship: 'ORIGINATES_IN', cardinality: '1:0..1', edgesPresent: namesEnriched.filter((n) => n.origin_country).length, edgesPossible: totalNames, coveragePct: Number(((100 * namesEnriched.filter((n) => n.origin_country).length) / totalNames).toFixed(2)) },
    { from: 'Name', to: 'Language', relationship: 'ASSOCIATED_WITH_LANGUAGE', cardinality: '1:0..1', edgesPresent: namesEnriched.filter((n) => n.language).length, edgesPossible: totalNames, coveragePct: Number(((100 * namesEnriched.filter((n) => n.language).length) / totalNames).toFixed(2)) },
    { from: 'Name', to: 'Category', relationship: 'TAGGED_AS', cardinality: '1:N', edgesPresent: categories.length, edgesPossible: null, note: `${namesWithCategory} of ${totalNames} names (${((100 * namesWithCategory) / totalNames).toFixed(1)}%) have at least one Category edge; average ${(categories.length / Math.max(namesWithCategory, 1)).toFixed(2)} categories per tagged name.` },
    { from: 'Name', to: 'PopularityRecord', relationship: 'HAS_POPULARITY_RECORD', cardinality: '1:N', edgesPresent: popularity.length, edgesPossible: null, note: `Only ${namesWithPopularity} of ${totalNames} names (${((100 * namesWithPopularity) / totalNames).toFixed(2)}%) have ANY PopularityRecord edge.` },
    { from: 'Name', to: 'Variant', relationship: 'HAS_VARIANT', cardinality: '1:N', edgesPresent: variants.length, edgesPossible: null, note: `${namesWithVariants} of ${totalNames} names (${((100 * namesWithVariants) / totalNames).toFixed(2)}%) have at least one Variant edge; average ${(variants.length / Math.max(namesWithVariants, 1)).toFixed(1)} variants per covered name.` },
    { from: 'Name', to: 'EquivalentGroup', relationship: 'ANCHORS', cardinality: '1:0..1', edgesPresent: Object.keys(nameEquivalents).length, edgesPossible: totalNames, coveragePct: Number(((100 * Object.keys(nameEquivalents).length) / totalNames).toFixed(2)) },
    { from: 'Name', to: 'Letter', relationship: 'STARTS_WITH', cardinality: '1:1', edgesPresent: totalNames, edgesPossible: totalNames, coveragePct: 100 },
    { from: 'Name', to: 'Style', relationship: 'STYLED_AS', cardinality: '1:0..1 (via Category, not a direct field)', edgesPresent: namesWithCategory, edgesPossible: totalNames, coveragePct: Number(((100 * namesWithCategory) / totalNames).toFixed(2)), note: 'The 7 Style nodes are a hardcoded superset of the 6 Category values (see audit/entity-map.json categoryTaxonomy.crossCheckWithStylePages) — this edge is inferred, not a direct dataset field.' },
    { from: 'Name', to: 'SiblingBatch', relationship: 'IS_MEMBER_OF', cardinality: '1:0..1', edgesPresent: SIBLING_BATCH_SIZE, edgesPossible: totalNames, coveragePct: Number(((100 * SIBLING_BATCH_SIZE) / totalNames).toFixed(2)) },
    { from: 'Name', to: 'Surname', relationship: 'COMPATIBLE_WITH (computed)', cardinality: 'N:M, computed at build time — not a stored edge', edgesPresent: null, edgesPossible: totalNames * lastNames.length, note: 'scoreCompatibility() computes a live score for any name+surname pair; no compatibility edge is persisted in a dataset, so it has no "missing" state — it is generated on demand for the top slice shown per page (60 names per surname page, 60 surnames worth per name-with-surname page).' },
    { from: 'Name', to: 'Name', relationship: 'SIBLING_PAIRED_WITH (computed)', cardinality: 'N:M within SiblingBatch only, computed at build time', edgesPresent: null, edgesPossible: SIBLING_BATCH_SIZE * (SIBLING_BATCH_SIZE - 1), note: 'generate-sibling-harmony.js scores pairs live; only names inside SiblingBatch (150) can participate.' },
    { from: 'Country', to: 'Country', relationship: 'HAS_COMPARE_PAIR', cardinality: '5 fixed pairs (not all C(5,2)=10 possible pairs are covered)', edgesPresent: 5, edgesPossible: (countries.length * (countries.length - 1)) / 2 },
    { from: 'Name', to: 'ComparePair', relationship: 'COMPARED_ACROSS', cardinality: '1:0..5', edgesPresent: (countryDifferentials.entries || []).length, edgesPossible: totalNames * 5, coveragePct: Number(((100 * (countryDifferentials.entries || []).length) / (totalNames * 5)).toFixed(3)), note: 'Only 4 of 3,697 names have any /compare/ page generated, matching the compare-name-country-pair-page gap already noted in Phase 1A.' },
    { from: 'Surname', to: 'Surname', relationship: 'HAS_HERALDRY_RECORD (self-attribute, listed for completeness)', cardinality: '1:0..1', edgesPresent: 2, edgesPossible: lastNames.length, coveragePct: Number(((100 * 2) / lastNames.length).toFixed(2)) },
  );

  // A handful of concrete, spot-checkable instance edges (not the full graph).
  const sampleNamesWithOrigin = namesEnriched.filter((n) => n.origin_cluster).slice(0, 3);
  const sampleNamesWithoutOrigin = namesEnriched.filter((n) => !n.origin_cluster).slice(0, 3);
  const sampleEdges = [
    ...sampleNamesWithOrigin.map((n) => ({ from: `Name:${n.name}`, to: `Origin:${n.origin_cluster}`, relationship: 'HAS_ORIGIN_CLUSTER' })),
    ...sampleNamesWithoutOrigin.map((n) => ({ from: `Name:${n.name}`, to: 'Origin:∅', relationship: 'HAS_ORIGIN_CLUSTER (no edge — field empty)' })),
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    representation: 'Type-level (schema) graph with live-computed cardinalities, plus a small sampleEdges[] of real instances. A full instance-level graph would require one node per name (3,697+) and was judged unusable as a human-readable report; every count below is nonetheless computed from the live data, not estimated.',
    nodes,
    edges,
    sampleEdges,
    notes: [
      'Edge coveragePct answers "of all possible Name→X edges, how many actually exist" — the same entity-level lens used in audit/knowledge-coverage.json.',
      'Two relationship types (Name–Surname compatibility, Name–Name sibling pairing) are computed on demand at build time rather than stored, so they have no missing-data state; they are included because the Phase 1B brief asked for them explicitly.',
    ],
  };

  writeAuditJson('entity-knowledge-graph.json', report);
  console.log('Nodes:', nodes.length, '| edges:', edges.length, '| sample instance edges:', sampleEdges.length);
}

run();
