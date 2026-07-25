/**
 * lib/presentation/kci-explainability.js — Phase 11A presentation model.
 *
 * Read-only explainability layer over frozen KCI output, Citation Records,
 * Popularity Records, and Citation Registry. No scoring. No calculations
 * beyond aggregating precomputed KCI breakdown fields for display grouping.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const AUDIT_DIR = path.join(ROOT, 'audit');

const PRESENTATION_PATHS = {
  kciReport: path.join(AUDIT_DIR, 'knowledge-completeness.json'),
  citationRecords: path.join(DATA_DIR, 'citation-records.json'),
  popularityRecords: path.join(DATA_DIR, 'popularity-records.json'),
  citationRegistry: path.join(DATA_DIR, 'citation-registry.json'),
};

const KNOWLEDGE_BREAKDOWN_FIELDS = Object.freeze([
  'origin',
  'meaning',
  'pronunciation',
  'etymology',
  'history',
  'variants',
]);

const EXPLANATIONS = Object.freeze({
  knowledgeStrong: 'This name has strong editorial coverage.',
  knowledgePartial: 'This name has partial editorial coverage.',
  knowledgeAbsent: 'No editorial knowledge data is currently available.',
  citationPresent: 'This information is supported by authoritative published sources.',
  citationAbsent: 'No citation data is currently available.',
  popularityPresent: 'This name includes verified popularity information.',
  popularityAbsent: 'No popularity data is currently available.',
});

function loadJson(absPath, fallback = null) {
  if (!fs.existsSync(absPath)) return fallback;
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

function sumBreakdownFields(breakdown, fields) {
  return fields.reduce((sum, field) => sum + (breakdown?.[field] || 0), 0);
}

function knowledgeCoverageStatus(score) {
  if (score >= 60) return 'strong';
  if (score > 0) return 'partial';
  return 'none';
}

function buildCitationTitleIndex(registry) {
  const index = new Map();
  for (const row of registry?.citations || []) {
    index.set(row.id, row.title);
  }
  return index;
}

function resolvePublicationTitles(citationRecord, titleIndex) {
  if (!citationRecord) return [];
  const ids = new Set();
  for (const domainIds of Object.values(citationRecord.citations || {})) {
    for (const id of domainIds || []) ids.add(id);
  }
  return [...ids]
    .map((id) => titleIndex.get(id))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function buildPopularityPresentation(popularityRecord) {
  if (!popularityRecord) {
    return {
      available: false,
      countries: [],
      yearsAvailable: [],
      hasUnresolvedOnly: false,
    };
  }

  const regions = popularityRecord.popularity?.regions || {};
  const countries = Object.keys(regions).sort((a, b) => a.localeCompare(b));
  const years = new Set();
  for (const region of Object.values(regions)) {
    for (const row of region.records || []) {
      if (row.year != null) years.add(row.year);
    }
  }

  const sources = popularityRecord.popularity?.sources || [];
  return {
    available: sources.length > 0,
    countries,
    yearsAvailable: [...years].sort((a, b) => a - b),
    hasUnresolvedOnly: countries.length > 0 && sources.length === 0,
  };
}

function buildKciExplainabilityModel(input) {
  const {
    slug,
    name,
    kciEntry,
    citationRecord = null,
    popularityRecord = null,
    citationTitleIndex,
    maxScore = 100,
  } = input;

  const breakdown = kciEntry?.breakdown || {};
  const knowledgeScore = sumBreakdownFields(breakdown, KNOWLEDGE_BREAKDOWN_FIELDS);
  const citationScore = breakdown.citations || 0;
  const popularityScore = breakdown.popularity || 0;
  const overallScore = kciEntry?.score ?? 0;

  const publicationTitles = resolvePublicationTitles(citationRecord, citationTitleIndex);
  const popularityPresentation = buildPopularityPresentation(popularityRecord);

  const knowledgeStatus = knowledgeCoverageStatus(knowledgeScore);
  const citationAvailable = citationScore > 0;
  const popularityAvailable = popularityScore > 0;

  return {
    slug,
    name,
    overallScore,
    maxScore,
    progressPct: maxScore > 0 ? Math.round((overallScore / maxScore) * 100) : 0,
    components: {
      knowledge: {
        score: knowledgeScore,
        available: knowledgeScore > 0,
        coverageStatus: knowledgeStatus,
        explanation:
          knowledgeStatus === 'strong'
            ? EXPLANATIONS.knowledgeStrong
            : knowledgeStatus === 'partial'
              ? EXPLANATIONS.knowledgePartial
              : EXPLANATIONS.knowledgeAbsent,
        badge: knowledgeScore > 0 ? 'Editorial coverage' : null,
      },
      citation: {
        score: citationScore,
        available: citationAvailable,
        citationCount: publicationTitles.length,
        publicationTitles,
        explanation: citationAvailable
          ? EXPLANATIONS.citationPresent
          : EXPLANATIONS.citationAbsent,
        badge: citationAvailable ? 'Sources cited' : null,
      },
      popularity: {
        score: popularityScore,
        available: popularityAvailable,
        countries: popularityPresentation.countries,
        yearsAvailable: popularityPresentation.yearsAvailable,
        explanation: popularityAvailable
          ? EXPLANATIONS.popularityPresent
          : EXPLANATIONS.popularityAbsent,
        badge: popularityAvailable ? 'Popularity data' : null,
      },
    },
  };
}

function createKciPresentationContext(options = {}) {
  const kciReport = options.kciReport ?? loadJson(PRESENTATION_PATHS.kciReport, null);
  if (!kciReport) {
    throw new Error('Missing audit/knowledge-completeness.json — run KCI activation first.');
  }

  const citationRecords = options.citationRecords ?? loadJson(PRESENTATION_PATHS.citationRecords, { records: [] });
  const popularityRecords = options.popularityRecords ?? loadJson(PRESENTATION_PATHS.popularityRecords, { records: [] });
  const citationRegistry = options.citationRegistry ?? loadJson(PRESENTATION_PATHS.citationRegistry, { citations: [] });
  const citationTitleIndex = buildCitationTitleIndex(citationRegistry);

  const kciBySlug = new Map((kciReport.entities || []).map((entry) => [entry.slug, entry]));
  const citationByName = new Map((citationRecords.records || []).map((row) => [normalizeKey(row.name), row]));
  const popularityByName = new Map((popularityRecords.records || []).map((row) => [normalizeKey(row.name), row]));

  return {
    phase: '11A',
    baselineReference: 'kci-activation-v1',
    maxScore: kciReport.maxScore ?? 100,
    kciReport,
    citationTitleIndex,
    kciBySlug,
    citationByName,
    popularityByName,
  };
}

function buildExplainabilityForSlug(slug, ctx) {
  const kciEntry = ctx.kciBySlug.get(slug) || { slug, score: 0, breakdown: {} };
  const nameKey = normalizeKey(kciEntry.name || slug);
  const citationRecord = ctx.citationByName.get(nameKey) || null;
  const popularityRecord = ctx.popularityByName.get(nameKey) || null;

  return buildKciExplainabilityModel({
    slug,
    name: kciEntry.name || slug,
    kciEntry,
    citationRecord,
    popularityRecord,
    citationTitleIndex: ctx.citationTitleIndex,
    maxScore: ctx.maxScore,
  });
}

function buildExplainabilityForName(name, slug, ctx) {
  const kciEntry = ctx.kciBySlug.get(slug) || { slug, score: 0, breakdown: {} };
  return buildKciExplainabilityModel({
    slug,
    name,
    kciEntry,
    citationRecord: ctx.citationByName.get(normalizeKey(name)) || null,
    popularityRecord: ctx.popularityByName.get(normalizeKey(name)) || null,
    citationTitleIndex: ctx.citationTitleIndex,
    maxScore: ctx.maxScore,
  });
}

module.exports = {
  PRESENTATION_PATHS,
  KNOWLEDGE_BREAKDOWN_FIELDS,
  EXPLANATIONS,
  loadJson,
  normalizeKey,
  buildKciExplainabilityModel,
  createKciPresentationContext,
  buildExplainabilityForSlug,
  buildExplainabilityForName,
  resolvePublicationTitles,
  buildPopularityPresentation,
};
