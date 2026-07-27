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
  return {
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
}

module.exports = {
  COMPLETION_DOMAINS,
  confidenceLevel,
  makeDomainField,
  makeCompletionRecord,
};
