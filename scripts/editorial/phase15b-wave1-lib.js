/**
 * Phase 15B Wave 1 — shared helpers for partial Knowledge Record completion.
 * Adds missing editorial domains only; origin assignments are preserved.
 */

const { confidenceLevel, sourcesForCluster: originSources } = require('./origin-wave1-sources.js');
const { sourcesForCluster: meaningSources } = require('./meaning-wave1-sources.js');
const { sourcesForCluster: pronunciationSources } = require('./pronunciation-wave1-sources.js');
const { sourcesForCluster: etymologySources } = require('./etymology-wave1-sources.js');
const { sourcesForCluster: historySources } = require('./history-wave1-sources.js');

const SOURCE_FN = {
  origin: originSources,
  meaning: meaningSources,
  pronunciation: pronunciationSources,
  etymology: etymologySources,
  history: historySources,
};

const COMPLETION_DOMAINS = ['meaning', 'pronunciation', 'etymology', 'history'];
const ALL_EDITORIAL_OVERRIDE_DOMAINS = ['origin', ...COMPLETION_DOMAINS];

function makeDomainField(domain, value, confidence, sourceKey, phaseLabel) {
  const sourcesFn = SOURCE_FN[domain];
  return {
    value,
    confidence,
    confidenceLevel: confidenceLevel(confidence),
    sources: sourcesFn(sourceKey, sourceKey),
    notes: `${phaseLabel} explicit editorial assignment (${sourceKey}; documented ${domain}).`,
  };
}

function makeCompletionRecord(name, profile) {
  const sourceKey = profile.sourceKey || profile.cluster || 'default';
  const confidence = profile.confidence ?? 0.88;
  const phaseLabel = profile.phaseLabel || 'Phase 15B Wave 1 Batch 1';
  const record = {
    name,
    meaning: makeDomainField('meaning', profile.meaning, confidence, sourceKey, phaseLabel),
    pronunciation: makeDomainField(
      'pronunciation',
      profile.pronunciation,
      confidence,
      sourceKey,
      phaseLabel,
    ),
    etymology: makeDomainField('etymology', profile.etymology, confidence, sourceKey, phaseLabel),
    history: makeDomainField('history', profile.history, confidence, sourceKey, phaseLabel),
  };

  if (profile.origin_cluster || profile.origin_country || profile.language) {
    record.origin = makeDomainField(
      'origin',
      {
        origin_country: profile.origin_country ?? null,
        origin_cluster: profile.origin_cluster ?? null,
        language: profile.language ?? null,
      },
      confidence,
      sourceKey,
      phaseLabel,
    );
  }

  return record;
}

module.exports = {
  ALL_EDITORIAL_OVERRIDE_DOMAINS,
  COMPLETION_DOMAINS,
  confidenceLevel,
  makeDomainField,
  makeCompletionRecord,
};
