#!/usr/bin/env node
/**
 * scripts/audit/page-knowledge-matrix.js — Phase 1B / PART 2: Page Knowledge
 * Matrix (READ-ONLY).
 *
 * For every page template (from audit/templates.json, Phase 1A), lists the
 * structured attributes it draws on, which dataset backs each one, and
 * whether the attribute is:
 *   - "always"            — structural, present on every page (id, gender, slug)
 *   - "always-with-fallback" — the template ALWAYS renders this section/value,
 *                            substituting a generic literal when the real
 *                            field is empty (see knowledge-lib.js FALLBACK_MARKERS)
 *   - "optional"           — the section/value is present only when the
 *                            underlying field/row exists; omitted otherwise
 *   - "computed"           — derived at build time (e.g. compatibility score),
 *                            not looked up, so it has no "missing" state
 *
 * presence classification is curated from reading the generator source in
 * Phase 1A/1B (function-by-function); coveragePct is pulled live from
 * audit/knowledge-coverage.json so it stays current on re-run.
 */

const path = require('path');
const { AUDIT_DIR, readJsonSafe, writeAuditJson } = require('./_lib.js');

function requireAudit(filename) {
  const data = readJsonSafe(path.join(AUDIT_DIR, filename));
  if (!data) {
    console.error(`Missing ${filename} — run scripts/audit/inventory.js / knowledge-coverage.js first (or scripts/audit/run-knowledge.js).`);
    process.exit(1);
  }
  return data;
}

function run() {
  console.log('PART 2 — Page Knowledge Matrix');
  const tpl = requireAudit('templates.json');
  const kc = requireAudit('knowledge-coverage.json');
  const elc = kc.entityLevelCoverage;

  const MATRIX = [
    {
      category: 'name-detail-page',
      pageCount: tpl.templates.find((t) => t.category === 'name-detail-page')?.estimatedPages,
      attributes: [
        { attribute: 'name', dataset: 'data/names.json', presence: 'always', coveragePct: 100 },
        { attribute: 'gender', dataset: 'data/names.json', presence: 'always', coveragePct: elc.gender.coveragePct },
        { attribute: 'first_letter', dataset: 'data/names.json', presence: 'always', coveragePct: 100 },
        { attribute: 'syllables', dataset: 'data/names.json', presence: 'always', coveragePct: elc.syllables.coveragePct },
        { attribute: 'meaning', dataset: 'data/names-enriched.json', presence: 'always-with-fallback', coveragePct: elc.meaning.coveragePct, fallback: '"a documented given name" or "—" depending on section (see empty-knowledge.json)' },
        { attribute: 'origin_country / language / origin_cluster', dataset: 'data/names-enriched.json', presence: 'always-with-fallback', coveragePct: elc.origin_country_or_language.coveragePct, fallback: '"multiple traditions" / "various linguistic traditions" / "various cultural traditions" depending on section' },
        { attribute: 'phonetic (pronunciation)', dataset: 'data/names-enriched.json', presence: 'optional', coveragePct: kc.arrayDatasetFieldCoverage['names-enriched.json (with origin overrides merged)'].fields.find((f) => f.field === 'phonetic')?.coveragePct ?? 0 },
        { attribute: 'popularity rows / chart / trend', dataset: 'data/popularity.json', presence: 'optional', coveragePct: elc.popularity_record.coveragePct },
        { attribute: 'category tags', dataset: 'data/categories.json', presence: 'optional', coveragePct: elc.category_assignment.coveragePct },
        { attribute: 'spelling variants', dataset: 'data/variants.json', presence: 'optional', coveragePct: elc.variant_record.coveragePct },
        { attribute: 'cross-linguistic equivalents', dataset: 'data/name-equivalents.json', presence: 'optional', coveragePct: elc.equivalent_group.coveragePct },
        { attribute: 'sibling-harmony cross-link', dataset: 'computed batch list (top 150 by popularity)', presence: 'optional', coveragePct: Number(((100 * 150) / 3697).toFixed(2)) },
        { attribute: 'topic cluster (related names)', dataset: 'build/topic-clusters.json', presence: 'optional', coveragePct: null },
        { attribute: 'historical/cultural context prose', dataset: 'derived from origin fields, no dedicated dataset', presence: 'always-with-fallback', coveragePct: elc.origin_country_or_language.coveragePct, fallback: 'generic prose naming no real culture/history when origin is empty' },
      ],
    },
    {
      category: 'names-like-page',
      pageCount: tpl.templates.find((t) => t.category === 'names-like-page')?.estimatedPages,
      attributes: [
        { attribute: 'name', dataset: 'data/names.json', presence: 'always', coveragePct: 100 },
        { attribute: 'phonetic similarity pool (first-letter/prefix match)', dataset: 'data/names.json (name string only)', presence: 'always', coveragePct: 100 },
        { attribute: 'same-origin pool', dataset: 'data/names-enriched.json origin_country/language', presence: 'optional', coveragePct: elc.origin_country_or_language.coveragePct },
        { attribute: 'similar-popularity pool', dataset: 'data/popularity.json', presence: 'optional', coveragePct: elc.popularity_record.coveragePct },
        { attribute: 'other-alternatives pool (same gender / country cluster)', dataset: 'data/names.json + data/popularity.json', presence: 'always-with-fallback', coveragePct: elc.gender.coveragePct, fallback: 'falls back to same-gender pool when popularity-based country clustering has no data' },
        { attribute: 'meaning snippet per linked name', dataset: 'data/names.json meaning', presence: 'optional', coveragePct: elc.meaning.coveragePct },
      ],
    },
    {
      category: 'sibling-harmony-page',
      pageCount: tpl.templates.find((t) => t.category === 'sibling-harmony-page')?.estimatedPages,
      attributes: [
        { attribute: 'base name', dataset: 'data/names.json', presence: 'always', coveragePct: 100 },
        { attribute: 'sibling-batch membership (top 150 by popularity)', dataset: 'computed from data/popularity.json ranking', presence: 'always (gates whether the page exists at all)', coveragePct: Number(((100 * 150) / 3697).toFixed(2)) },
        { attribute: 'sibling harmony score', dataset: 'computed (generate-sibling-harmony.js)', presence: 'computed', coveragePct: null },
        { attribute: 'origin cluster (used in scoring)', dataset: 'data/names-enriched.json', presence: 'optional', coveragePct: elc.origin_cluster.coveragePct },
      ],
    },
    {
      category: 'surname-compatibility-page',
      pageCount: tpl.templates.find((t) => t.category === 'surname-compatibility-page')?.estimatedPages,
      attributes: [
        { attribute: 'surname', dataset: 'data/last-names.json', presence: 'always', coveragePct: 100 },
        { attribute: 'origin', dataset: 'data/last-names.json', presence: 'always', coveragePct: 100 },
        { attribute: 'syllables', dataset: 'data/last-names.json', presence: 'always', coveragePct: 100 },
        { attribute: 'compatibility note', dataset: 'data/last-names.json', presence: 'always', coveragePct: 100 },
        { attribute: 'heraldry availability/region', dataset: 'data/heraldry.json', presence: 'optional', coveragePct: kc.entityLevelCoverage.heraldry_record.coveragePct },
        { attribute: 'per-first-name compatibility score', dataset: 'computed (scoreCompatibility())', presence: 'computed', coveragePct: null },
      ],
    },
    {
      category: 'names-lastname-filter-page',
      pageCount: tpl.templates.find((t) => t.category === 'names-lastname-filter-page')?.estimatedPages,
      attributes: [
        { attribute: 'surname', dataset: 'data/last-names.json', presence: 'always', coveragePct: 100 },
        { attribute: 'top-60 compatible first names', dataset: 'computed from data/names.json + scoreCompatibility()', presence: 'computed', coveragePct: null },
      ],
    },
    {
      category: 'equivalents-page',
      pageCount: tpl.templates.find((t) => t.category === 'equivalents-page')?.estimatedPages,
      attributes: [
        { attribute: 'anchor name + origin', dataset: 'data/name-equivalents.json', presence: 'always (closed set — page only exists for the 27 anchors present)', coveragePct: 100 },
        { attribute: 'equivalents list (lang + slug)', dataset: 'data/name-equivalents.json', presence: 'always', coveragePct: 100 },
      ],
    },
    {
      category: 'compare-name-country-pair-page',
      pageCount: tpl.templates.find((t) => t.category === 'compare-name-country-pair-page')?.estimatedPages,
      attributes: [
        { attribute: 'name', dataset: 'data/names.json', presence: 'always', coveragePct: 100 },
        { attribute: 'rank_2025 / rank_2015 / delta / volatility_score', dataset: 'data/country-differentials.json', presence: 'always-with-fallback', coveragePct: kc.entityLevelCoverage.country_differential_entry.coveragePct, fallback: 'rank_2015/delta render as null/0 when historical rank is unavailable (observed in data/country-differentials.json sample rows)' },
      ],
    },
    {
      category: 'names-country-page',
      pageCount: tpl.templates.find((t) => t.category === 'names-country-page')?.estimatedPages,
      attributes: [
        { attribute: 'country metadata', dataset: 'data/countries.json', presence: 'always', coveragePct: 100 },
        { attribute: 'names tagged to this country', dataset: 'data/names-enriched.json origin_country', presence: 'optional (list length varies with coverage)', coveragePct: elc.origin_country_or_language.coveragePct },
        { attribute: 'popular/rising names for this country', dataset: 'data/popularity.json', presence: 'optional', coveragePct: elc.popularity_record.coveragePct },
      ],
    },
    {
      category: 'names-style-page',
      pageCount: tpl.templates.find((t) => t.category === 'names-style-page')?.estimatedPages,
      attributes: [
        { attribute: 'style label (fixed set of 7)', dataset: 'hardcoded in generate-programmatic-pages.js', presence: 'always', coveragePct: 100 },
        { attribute: 'names tagged to this style', dataset: 'data/categories.json', presence: 'optional', coveragePct: elc.category_assignment.coveragePct },
      ],
    },
    {
      category: 'popularity-year-page',
      pageCount: tpl.templates.find((t) => t.category === 'popularity-year-page')?.estimatedPages,
      attributes: [
        { attribute: 'top-50 ranked names for the year', dataset: 'data/popularity.json', presence: 'always-with-fallback', coveragePct: elc.popularity_record.coveragePct, fallback: 'with only 7 rows total across 2022–2023, year pages necessarily reuse the same tiny pool' },
      ],
    },
    {
      category: 'trend-page',
      pageCount: tpl.templates.find((t) => t.category === 'trend-page')?.estimatedPages,
      attributes: [
        { attribute: 'top-5 trending names (2015 vs 2025)', dataset: 'data/regional-trend-acceleration.json', presence: 'always', coveragePct: null, note: 'covers 2 of 5 countries (USA, CAN)' },
      ],
    },
  ];

  const totalCoveredPages = MATRIX.reduce((sum, m) => sum + (m.pageCount || 0), 0);

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    method: 'presence classification (always / always-with-fallback / optional / computed) is curated from reading each generator function in scripts/generate-programmatic-pages.js and cross-generator scripts; coveragePct values are pulled live from audit/knowledge-coverage.json.',
    legend: {
      always: 'Present on every page of this template; the underlying field is 100% populated or structurally guaranteed (e.g. name, gender).',
      'always-with-fallback': 'The section/value renders on every page regardless of data; when the real field is empty, a generic literal string substitutes for it (see audit/empty-knowledge.json for exact fallback text and page counts).',
      optional: 'The section/value is present only when the underlying field or relational row exists; it is omitted (not faked) otherwise.',
      computed: 'Derived algorithmically at build time from other fields (e.g. a compatibility score); has no "missing data" state of its own.',
    },
    templates: MATRIX,
    coverageCheck: {
      templatesInMatrix: MATRIX.length,
      totalTemplatesInPhase1A: tpl.templateCount,
      note: 'Templates not itemized here (root-hub-page, names-hub, names-letter-page, names-gender-page, names-gender-country-page, names-curated-list-page, names-lastname-hub, compare-country-pair-hub, compare-hub, popularity-hub, trends-hub, tool-landing-page, legal-page, about-page, homepage, html-sitemap) are list/aggregation/static pages that do not carry a distinct per-page structured-attribute set the way entity-detail pages do — each instance of that template renders the same attribute shape, just filtered to a different subset of the names/popularity/categories datasets already itemized above.',
    },
    notes: [
      'This matrix intentionally does not judge whether a fallback is a problem — audit/empty-knowledge.json quantifies fallback usage; this report only maps where each attribute is used and whether the template hides or reveals its absence.',
    ],
  };

  writeAuditJson('page-knowledge-matrix.json', report);
  console.log('Templates mapped:', MATRIX.length, '| pages covered by mapped templates:', totalCoveredPages);
}

run();
