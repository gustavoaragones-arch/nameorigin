/**
 * Phase 15B Wave 2 — shared helpers for Knowledge Record creation.
 * Reference implementation for all Wave 2 batches.
 */

const { confidenceLevel, sourcesForCluster: originSources } = require('./origin-wave1-sources.js');
const { sourcesForCluster: meaningSources } = require('./meaning-wave1-sources.js');
const { sourcesForCluster: pronunciationSources } = require('./pronunciation-wave1-sources.js');
const { sourcesForCluster: etymologySources } = require('./etymology-wave1-sources.js');
const { sourcesForCluster: historySources } = require('./history-wave1-sources.js');

const CREATION_DOMAINS = ['origin', 'meaning', 'pronunciation', 'etymology', 'history'];
const ALL_CREATION_OVERRIDE_DOMAINS = [...CREATION_DOMAINS];

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

function makeCreationRecord(name, profile) {
  const sourceKey = profile.sourceKey || profile.cluster || 'default';
  const confidence = profile.confidence ?? 0.88;
  const phaseLabel = profile.phaseLabel || 'Phase 15B Wave 2 Batch 1';
  return {
    name,
    origin: makeDomainField(
      'origin',
      {
        origin_country: profile.origin_country ?? null,
        origin_cluster: profile.origin_cluster ?? null,
        language: profile.language ?? null,
      },
      confidence,
      sourceKey,
      phaseLabel,
    ),
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
  ALL_CREATION_OVERRIDE_DOMAINS,
  CREATION_DOMAINS,
  confidenceLevel,
  makeDomainField,
  makeCreationRecord,
};
