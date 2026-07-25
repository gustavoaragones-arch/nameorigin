/**
 * lib/analysis/knowledge-completeness.js — Phase 5.0 Knowledge Completeness Index (KCI).
 *
 * Deterministic internal scoring from canonical entities. Measures verified
 * knowledge completeness only — not SEO, popularity as a page signal, or
 * rendering state. Does not modify canonical data or user-facing output.
 */

const { isFallbackMarker } = require('../render/meaning.js');
const {
  hasValidCitationRecord,
  hasValidPopularityRecord,
} = require('./kci-activation-v1.js');

const WEIGHTS = Object.freeze({
  origin: 20,
  meaning: 20,
  pronunciation: 15,
  etymology: 15,
  history: 10,
  citations: 10,
  variants: 5,
  popularity: 5,
});

const MAX_SCORE = Object.values(WEIGHTS).reduce((sum, w) => sum + w, 0);

const HISTOGRAM_BUCKETS = [
  { label: '0', min: 0, max: 0 },
  { label: '1-20', min: 1, max: 20 },
  { label: '21-40', min: 21, max: 40 },
  { label: '41-60', min: 41, max: 60 },
  { label: '61-80', min: 61, max: 80 },
  { label: '81-100', min: 81, max: 100 },
];

function hasNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function scoreOrigin(entity) {
  const origin = entity.origin;
  if (!origin) return 0;
  if (hasNonEmptyString(origin.country) || hasNonEmptyString(origin.cluster)) return WEIGHTS.origin;
  return 0;
}

function scoreMeaning(entity) {
  const meaning = entity.meaning;
  if (!meaning || !hasNonEmptyString(meaning.primary)) return 0;
  if (isFallbackMarker(meaning.primary)) return 0;
  return WEIGHTS.meaning;
}

function scorePronunciation(entity) {
  const pronunciation = entity.pronunciation;
  if (!pronunciation) return 0;
  const stored = [pronunciation.ipa, pronunciation.phoneticSpelling].find(hasNonEmptyString);
  if (!stored) return 0;
  if (isFallbackMarker(stored)) return 0;
  return WEIGHTS.pronunciation;
}

function scoreEtymology(entity) {
  const etymology = entity.etymology;
  if (!etymology) return 0;
  const researched =
    hasNonEmptyString(etymology.rootWord) ||
    hasNonEmptyString(etymology.rootLanguage) ||
    hasNonEmptyString(etymology.derivationNotes);
  return researched ? WEIGHTS.etymology : 0;
}

function scoreHistory(entity) {
  const history = entity.history;
  if (!history) return 0;
  const researched =
    hasNonEmptyString(history.firstRecordedUse) ||
    hasNonEmptyString(history.historicalUsageNotes) ||
    (Array.isArray(history.notableBearers) && history.notableBearers.some(hasNonEmptyString));
  return researched ? WEIGHTS.history : 0;
}

function scoreCitations(entity, activationCtx = null) {
  if (activationCtx?.enabled) {
    if (!hasValidCitationRecord(entity.identity.name, activationCtx.citationByName)) return 0;
    return WEIGHTS.citations;
  }
  const citations = entity.citations;
  if (!citations || !Array.isArray(citations.sources) || citations.sources.length === 0) return 0;
  const researched = citations.sources.some(
    (source) =>
      source &&
      (hasNonEmptyString(source.reference) ||
        hasNonEmptyString(source.type) ||
        hasNonEmptyString(source.field)),
  );
  return researched ? WEIGHTS.citations : 0;
}

function scoreVariants(entity) {
  const variants = entity.variants;
  if (!variants || !Array.isArray(variants.spellingVariants) || variants.spellingVariants.length === 0) return 0;
  return WEIGHTS.variants;
}

function scorePopularity(entity, activationCtx = null) {
  if (activationCtx?.enabled) {
    if (!hasValidPopularityRecord(entity.identity.name, activationCtx.popularityByName)) return 0;
    return WEIGHTS.popularity;
  }
  const popularity = entity.popularity;
  if (!popularity || !Array.isArray(popularity.records) || popularity.records.length === 0) return 0;
  return WEIGHTS.popularity;
}

/** @param {object} entity - canonical Name Entity */
function scoreEntity(entity, activationCtx = null) {
  const breakdown = {
    origin: scoreOrigin(entity),
    meaning: scoreMeaning(entity),
    pronunciation: scorePronunciation(entity),
    etymology: scoreEtymology(entity),
    history: scoreHistory(entity),
    citations: scoreCitations(entity, activationCtx),
    variants: scoreVariants(entity),
    popularity: scorePopularity(entity, activationCtx),
  };
  const score = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  return {
    slug: entity.identity.slug,
    name: entity.identity.name,
    score: Math.min(MAX_SCORE, score),
    breakdown,
  };
}

function bucketForScore(score) {
  for (const bucket of HISTOGRAM_BUCKETS) {
    if (score >= bucket.min && score <= bucket.max) return bucket.label;
  }
  return '81-100';
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function computeSummary(scoredEntities) {
  const scores = scoredEntities.map((entry) => entry.score);
  return {
    average: scores.length ? Number((scores.reduce((sum, s) => sum + s, 0) / scores.length).toFixed(2)) : 0,
    median: Number(median(scores).toFixed(2)),
    min: scores.length ? Math.min(...scores) : 0,
    max: scores.length ? Math.max(...scores) : 0,
  };
}

function computeDistribution(scoredEntities) {
  const histogram = Object.fromEntries(HISTOGRAM_BUCKETS.map((bucket) => [bucket.label, 0]));
  for (const entry of scoredEntities) {
    histogram[bucketForScore(entry.score)] += 1;
  }
  return {
    buckets: HISTOGRAM_BUCKETS.map((bucket) => bucket.label),
    histogram,
  };
}

function computeDomainCoverage(scoredEntities, entityCount) {
  const countField = (field) => scoredEntities.filter((entry) => entry.breakdown[field] > 0).length;
  const pct = (count) => (entityCount ? Number(((100 * count) / entityCount).toFixed(2)) : 0);

  const researchedOrigins = countField('origin');
  const researchedMeanings = countField('meaning');
  const storedPronunciations = countField('pronunciation');
  const etymologyCoverage = countField('etymology');
  const historyCoverage = countField('history');
  const citationCoverage = countField('citations');
  const variantsCoverage = countField('variants');
  const popularityCoverage = countField('popularity');

  return {
    entityCount,
    researchedOrigins: { count: researchedOrigins, pct: pct(researchedOrigins) },
    researchedMeanings: { count: researchedMeanings, pct: pct(researchedMeanings) },
    storedPronunciations: { count: storedPronunciations, pct: pct(storedPronunciations) },
    etymologyCoverage: { count: etymologyCoverage, pct: pct(etymologyCoverage) },
    historyCoverage: { count: historyCoverage, pct: pct(historyCoverage) },
    citationCoverage: { count: citationCoverage, pct: pct(citationCoverage) },
    variantsCoverage: { count: variantsCoverage, pct: pct(variantsCoverage) },
    popularityCoverage: { count: popularityCoverage, pct: pct(popularityCoverage) },
  };
}

function rankEntities(scoredEntities) {
  return [...scoredEntities].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.slug.localeCompare(b.slug);
  });
}

function buildKnowledgeCompletenessReport(entities, generatedAt = new Date().toISOString(), activationCtx = null) {
  const scoredEntities = entities.map((entity) => scoreEntity(entity, activationCtx));
  const summary = computeSummary(scoredEntities);
  const distribution = computeDistribution(scoredEntities);
  const domainCoverage = computeDomainCoverage(scoredEntities, scoredEntities.length);

  const report = {
    generatedAt,
    phase: activationCtx?.enabled ? '10A' : '5.0',
    title: 'Knowledge Completeness Index',
    baselineReference: activationCtx?.enabled ? 'kci-activation-v1' : 'knowledge-baseline-1.0',
    entityCount: scoredEntities.length,
    maxScore: MAX_SCORE,
    weights: { ...WEIGHTS },
    summary,
    distribution,
    domainCoverage,
    entities: scoredEntities.map(({ slug, score, breakdown }) => ({ slug, score, breakdown })),
  };

  if (activationCtx?.enabled) {
    report.activation = {
      citationRecords: true,
      popularityRecords: true,
      citationRecordsCount: activationCtx.citationRecords?.records?.length ?? 0,
      popularityRecordsCount: activationCtx.popularityRecords?.records?.length ?? 0,
      citationScoringActive: true,
      popularityScoringActive: true,
    };
  }

  return report;
}

function buildLeaderboard(scoredEntities, direction, limit = 100) {
  const ranked = rankEntities(scoredEntities);
  const selected = direction === 'bottom' ? [...ranked].reverse().slice(0, limit) : ranked.slice(0, limit);
  return {
    generatedAt: new Date().toISOString(),
    direction,
    limit,
    entities: selected.map(({ slug, name, score, breakdown }) => ({ slug, name, score, breakdown })),
  };
}

module.exports = {
  WEIGHTS,
  MAX_SCORE,
  HISTOGRAM_BUCKETS,
  scoreEntity,
  computeSummary,
  computeDistribution,
  computeDomainCoverage,
  rankEntities,
  buildKnowledgeCompletenessReport,
  buildLeaderboard,
};
