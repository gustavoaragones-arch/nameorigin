/**
 * Phase 7A — shared helpers for Wave 2 Batch 1 editorial expansion.
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

function makeFullRecord(name, profile) {
  const sourceKey = profile.sourceKey || profile.cluster || 'default';
  const confidence = profile.confidence ?? 0.88;
  const phaseLabel = 'Wave 2 Batch 1';
  return {
    name,
    origin: makeDomainField(
      'origin',
      {
        origin_country: profile.origin_country,
        origin_cluster: profile.origin_cluster,
        language: profile.language,
      },
      confidence,
      sourceKey,
      phaseLabel,
    ),
    meaning: makeDomainField('meaning', profile.meaning, confidence, sourceKey, phaseLabel),
    pronunciation: makeDomainField('pronunciation', profile.pronunciation, confidence, sourceKey, phaseLabel),
    etymology: makeDomainField('etymology', profile.etymology, confidence, sourceKey, phaseLabel),
    history: makeDomainField('history', profile.history, confidence, sourceKey, phaseLabel),
  };
}

module.exports = {
  confidenceLevel,
  makeDomainField,
  makeFullRecord,
};
