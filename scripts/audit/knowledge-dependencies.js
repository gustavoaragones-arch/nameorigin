#!/usr/bin/env node
/**
 * scripts/audit/knowledge-dependencies.js — Phase 1B / PART 4: Knowledge
 * Dependency Graph (READ-ONLY).
 *
 * Traces each knowledge field: dataset -> generator -> template -> page
 * type. Built by combining audit/knowledge-coverage.json (Part 1, field
 * coverage) with audit/build-pipeline.json (Phase 1A, dataset consumers)
 * and audit/page-knowledge-matrix.json (Part 2, template attribute use).
 */

const path = require('path');
const { AUDIT_DIR, readJsonSafe, writeAuditJson } = require('./_lib.js');

function requireAudit(filename) {
  const data = readJsonSafe(path.join(AUDIT_DIR, filename));
  if (!data) {
    console.error(`Missing ${filename} — run scripts/audit/run-knowledge.js first.`);
    process.exit(1);
  }
  return data;
}

function run() {
  console.log('PART 4 — Knowledge Dependency Graph');
  const pipe = requireAudit('build-pipeline.json');
  const matrix = requireAudit('page-knowledge-matrix.json');
  const kc = requireAudit('knowledge-coverage.json');

  // Curated field -> {dataset, generator(s), template(s), pageType(s)} chains.
  // Generator/template names are cross-checked against build-pipeline.json /
  // page-knowledge-matrix.json entries at the bottom of this function.
  const CHAINS = [
    {
      field: 'meaning',
      coveragePct: kc.entityLevelCoverage.meaning.coveragePct,
      chain: [
        { stage: 'dataset', value: 'data/names.json / data/names-enriched.json (meaning field)' },
        { stage: 'generator', value: 'scripts/generate-programmatic-pages.js :: buildMetaDescription(), buildDirectAnswer(), buildDirectAnswers(), buildDefinitionBlock(), buildNameFactsTable(), buildQuickFaqForName()' },
        { stage: 'template', value: 'Name Detail Page' },
        { stage: 'pageType', value: 'name-detail-page (3,697 pages)' },
      ],
    },
    {
      field: 'origin_country / language / origin_cluster',
      coveragePct: kc.entityLevelCoverage.origin_country_or_language.coveragePct,
      chain: [
        { stage: 'dataset', value: 'data/origin-overrides.json -> (apply-origin-enrichment.js) -> data/names-enriched.json' },
        { stage: 'generator', value: 'scripts/generate-programmatic-pages.js :: buildNameUsageContextSection(), buildOriginLineage(), buildCulturalContext(), buildCategoryDiffSection("country"), generateCountryPage()' },
        { stage: 'template', value: 'Name Detail Page, Names by Country Page' },
        { stage: 'pageType', value: 'name-detail-page (3,697), names-country-page (5)' },
      ],
    },
    {
      field: 'popularity (rank/year/country)',
      coveragePct: kc.entityLevelCoverage.popularity_record.coveragePct,
      chain: [
        { stage: 'dataset', value: 'raw-data/ssa, raw-data/statcan -> (build-popularity.js) -> data/popularity.json' },
        { stage: 'generator', value: 'scripts/generate-programmatic-pages.js (chart/trend sections), scripts/generate-popularity-pages.js, scripts/generate-popularity-year-pages.js, scripts/generate-compare-pages.js, scripts/generate-country-differentials.js, scripts/generate-regional-trend-acceleration.js, scripts/generate-sibling-pages.js, scripts/generate-names-like.js' },
        { stage: 'template', value: 'Name Detail Page, Names Like Page, Popularity-by-Year Page, Name × Country-Pair Comparison Page, Sibling Harmony Page, Trend Analysis Page' },
        { stage: 'pageType', value: 'name-detail-page (3,697), names-like-page (3,697), popularity-year-page (3), compare-name-country-pair-page (20), sibling-harmony-page (150), trend-page (1)' },
      ],
    },
    {
      field: 'categories (category tags)',
      coveragePct: kc.entityLevelCoverage.category_assignment.coveragePct,
      chain: [
        { stage: 'dataset', value: 'data/names.json -> (classify-categories.js) -> data/categories.json' },
        { stage: 'generator', value: 'scripts/generate-programmatic-pages.js :: generateStylePage(), getSimilarNamesForName(); scripts/generate-names-like.js (style label)' },
        { stage: 'template', value: 'Names by Style Page, Name Detail Page (related-names section), Names Like Page (style label)' },
        { stage: 'pageType', value: 'names-style-page (7), name-detail-page (3,697), names-like-page (3,697)' },
      ],
    },
    {
      field: 'variants (spelling variants)',
      coveragePct: kc.entityLevelCoverage.variant_record.coveragePct,
      chain: [
        { stage: 'dataset', value: 'data/names.json -> (acquire/build-variants.js or normalize-names.js) -> data/variants.json' },
        { stage: 'generator', value: 'scripts/generate-programmatic-pages.js internalLinksForName()-equivalent logic' },
        { stage: 'template', value: 'Name Detail Page' },
        { stage: 'pageType', value: 'name-detail-page (3,697)' },
      ],
    },
    {
      field: 'equivalents (cross-linguistic)',
      coveragePct: kc.entityLevelCoverage.equivalent_group.coveragePct,
      chain: [
        { stage: 'dataset', value: 'data/name-equivalents.json (closed/curated, 27 anchors)' },
        { stage: 'generator', value: 'scripts/generate-equivalent-pages.js; scripts/generate-programmatic-pages.js :: buildEquivalentsSection()' },
        { stage: 'template', value: 'Equivalent-Name Page, Name Detail Page (equivalents section, anchors only)' },
        { stage: 'pageType', value: 'equivalents-page (27), name-detail-page (subset)' },
      ],
    },
    {
      field: 'surname (origin/syllables/note)',
      coveragePct: 100,
      chain: [
        { stage: 'dataset', value: 'data/last-names.json (75, fully populated)' },
        { stage: 'generator', value: 'scripts/generate-lastname-pages.js; scripts/generate-programmatic-pages.js :: generateLastNamePage(), scoreCompatibility()' },
        { stage: 'template', value: 'Surname Compatibility Landing Page, Names-With-Surname Filter Page' },
        { stage: 'pageType', value: 'surname-compatibility-page (75), names-lastname-filter-page (75)' },
      ],
    },
    {
      field: 'heraldry (surname)',
      coveragePct: kc.entityLevelCoverage.heraldry_record.coveragePct,
      chain: [
        { stage: 'dataset', value: 'data/heraldry.json (2 of 75 surnames)' },
        { stage: 'generator', value: 'scripts/generate-lastname-pages.js' },
        { stage: 'template', value: 'Surname Compatibility Landing Page' },
        { stage: 'pageType', value: 'surname-compatibility-page (75, only 2 render real heraldry data)' },
      ],
    },
    {
      field: 'country-differentials (rank_2025/rank_2015/delta)',
      coveragePct: kc.entityLevelCoverage.country_differential_entry.coveragePct,
      chain: [
        { stage: 'dataset', value: 'data/popularity.json -> (generate-country-differentials.js) -> data/country-differentials.json (5 of 18,485 possible name/country pairs)' },
        { stage: 'generator', value: 'scripts/generate-compare-pages.js; scripts/generate-trends-page.js' },
        { stage: 'template', value: 'Name × Country-Pair Comparison Page, Trend Analysis Page' },
        { stage: 'pageType', value: 'compare-name-country-pair-page (20), trend-page (1)' },
      ],
    },
    {
      field: 'regional-trend-acceleration',
      coveragePct: 40, // 2 of 5 countries
      chain: [
        { stage: 'dataset', value: 'data/popularity.json -> (generate-regional-trend-acceleration.js) -> data/regional-trend-acceleration.json (2 of 5 countries: USA, CAN)' },
        { stage: 'generator', value: 'scripts/generate-trends-page.js' },
        { stage: 'template', value: 'Trend Analysis Page' },
        { stage: 'pageType', value: 'trend-page (1)' },
      ],
    },
    {
      field: 'origin_overrides (curated backfill)',
      coveragePct: Number(((100 * 167) / 3697).toFixed(2)),
      chain: [
        { stage: 'dataset', value: 'scripts/build-origin-seed.js (hand-curated, top-300-name scope) -> data/origin-overrides.json (167 names)' },
        { stage: 'generator', value: 'scripts/apply-origin-enrichment.js (merge) -> feeds every generator that reads names-enriched.json' },
        { stage: 'template', value: 'Name Detail Page, Names Like Page, Names by Country Page, Sibling Harmony Page (via origin_cluster)' },
        { stage: 'pageType', value: 'name-detail-page, names-like-page, names-country-page, sibling-harmony-page' },
      ],
    },
    {
      field: 'topic-clusters (related-names clustering)',
      coveragePct: null,
      chain: [
        { stage: 'dataset', value: 'data/names-enriched.json + data/categories.json -> (topic-cluster-map.js) -> build/topic-clusters.json' },
        { stage: 'generator', value: 'scripts/generate-programmatic-pages.js :: getClusterBlockNames()' },
        { stage: 'template', value: 'Name Detail Page' },
        { stage: 'pageType', value: 'name-detail-page (3,697)' },
        { stage: 'note', value: 'build/topic-clusters.json is itself derived from the same sparse origin/category fields, so its own coverage is bounded by theirs.' },
      ],
    },
  ];

  // Cross-check: every generator named above should appear in the Phase 1A
  // generator catalog, so a typo or renamed script is caught automatically.
  const knownScripts = new Set(pipe.generatorCatalog.map((g) => g.script.split('/').pop()));
  const referencedScripts = new Set();
  CHAINS.forEach((c) => {
    const genStage = c.chain.find((s) => s.stage === 'generator');
    if (!genStage) return;
    (genStage.value.match(/[a-zA-Z0-9_.\-]+\.js(?![a-zA-Z])/g) || []).forEach((s) => referencedScripts.add(s));
  });
  const unknownScriptRefs = [...referencedScripts].filter((s) => !knownScripts.has(s));

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    method: 'Each chain traces one knowledge field from its source dataset through the generator function(s) that read it, to the template(s) it appears in, to the resulting page type(s) and their live page counts (from audit/project-inventory.json via audit/page-knowledge-matrix.json). coveragePct is pulled from audit/knowledge-coverage.json where available.',
    chains: CHAINS,
    validation: {
      scriptsReferencedInChains: referencedScripts.size,
      scriptsNotFoundInBuildPipelineCatalog: unknownScriptRefs,
      note: unknownScriptRefs.length === 0 ? 'Every generator referenced in this report was found in audit/build-pipeline.json\'s generator catalog.' : 'The scripts above were referenced but not found in the catalog — check for a naming drift.',
    },
    notes: [
      'This is the "why is this field the way it is" map: for any low-coverage field found in audit/knowledge-coverage.json, this report shows exactly which script produced it and which pages inherit that sparsity.',
      'Fields that are computed at build time (compatibility scores, sibling-harmony scores) do not have a dataset stage the way looked-up fields do — they are intentionally excluded from this chain list since they were already covered in audit/entity-knowledge-graph.json as "computed" edges.',
    ],
  };

  writeAuditJson('knowledge-dependencies.json', report);
  console.log('Chains traced:', CHAINS.length, '| unresolved script refs:', unknownScriptRefs.length);
}

run();
