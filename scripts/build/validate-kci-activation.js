#!/usr/bin/env node
/**
 * Phase 10A — Validate KCI activation.
 */

const fs = require('fs');
const path = require('path');
const loaders = require('../../lib/canonical/loaders.js');
const { buildAllEntities } = require('../../lib/canonical/entity-builder.js');
const {
  scoreEntity,
  buildKnowledgeCompletenessReport,
  MAX_SCORE,
} = require('../../lib/analysis/knowledge-completeness.js');
const {
  createKciActivationContext,
  hasValidCitationRecord,
  hasValidPopularityRecord,
  hashKciReportSemantic,
  normalizeKey,
} = require('../../lib/analysis/kci-activation-v1.js');

const ROOT = path.join(__dirname, '..', '..');
const KCI_PATH = path.join(ROOT, 'audit', 'knowledge-completeness.json');

function validateScoreBounds(scoredEntities) {
  const errors = [];
  for (const entry of scoredEntities) {
    if (entry.score < 0) errors.push(`${entry.slug} has negative score ${entry.score}.`);
    if (entry.score > MAX_SCORE) errors.push(`${entry.slug} exceeds max score (${entry.score}).`);
    for (const [field, value] of Object.entries(entry.breakdown || {})) {
      if (value < 0) errors.push(`${entry.slug}.${field} has negative breakdown ${value}.`);
    }
  }
  return errors;
}

function validateMissingRecordsHandled(scoredEntities, activationCtx) {
  const errors = [];

  for (const entry of scoredEntities) {
    if (entry.breakdown.citations > 0 && !hasValidCitationRecord(entry.name, activationCtx.citationByName)) {
      errors.push(`${entry.name} scored citation points without a valid citation record.`);
    }
    if (entry.breakdown.popularity > 0 && !hasValidPopularityRecord(entry.name, activationCtx.popularityByName)) {
      errors.push(`${entry.name} scored popularity points without a valid popularity record.`);
    }
    if (
      entry.breakdown.citations === 0 &&
      hasValidCitationRecord(entry.name, activationCtx.citationByName)
    ) {
      errors.push(`${entry.name} has citation record but scored zero citation points.`);
    }
  }

  return errors;
}

function validateUnresolvedAuthorities(scoredEntities, activationCtx) {
  const errors = [];
  for (const record of activationCtx.popularityRecords.records || []) {
    const sources = record.popularity?.sources || [];
    if (sources.length === 0) {
      const entry = scoredEntities.find((row) => normalizeKey(row.name) === normalizeKey(record.name));
      if (entry && entry.breakdown.popularity !== 0) {
        errors.push(`${record.name} has unresolved authorities but scored popularity points.`);
      }
    }
  }
  return errors;
}

function validateDeterministicRebuild(report, activationCtx, entities) {
  const rebuilt = buildKnowledgeCompletenessReport(entities, report.generatedAt, activationCtx);
  if (hashKciReportSemantic(report) !== hashKciReportSemantic(rebuilt)) {
    return ['Deterministic rebuild produced different KCI report content.'];
  }
  return [];
}

function main() {
  const report = JSON.parse(fs.readFileSync(KCI_PATH, 'utf8'));
  const activationCtx = createKciActivationContext();
  const ctx = loaders.loadAll();
  const entities = buildAllEntities(ctx, report.generatedAt);
  const scoredEntities = entities.map((entity) => scoreEntity(entity, activationCtx));

  const errors = [
    ...(report.activation?.citationScoringActive ? [] : ['Citation scoring is not active.']),
    ...(report.activation?.popularityScoringActive ? [] : ['Popularity scoring is not active.']),
    ...(report.domainCoverage.citationCoverage.count > 0 ? [] : ['Citation coverage is zero after activation.']),
    ...(report.domainCoverage.popularityCoverage.count > 0 ? [] : ['Popularity coverage is zero after activation.']),
    ...(scoredEntities.length === report.entityCount ? [] : ['Entity count mismatch in KCI report.']),
    ...validateScoreBounds(scoredEntities),
    ...validateMissingRecordsHandled(scoredEntities, activationCtx),
    ...validateUnresolvedAuthorities(scoredEntities, activationCtx),
    ...validateDeterministicRebuild(report, activationCtx, entities),
  ];

  console.log('KCI activation validation:', errors.length === 0 ? 'PASS' : 'FAIL');
  console.log('  Entities scored:', report.entityCount);
  console.log('  Citation coverage:', report.domainCoverage.citationCoverage.count);
  console.log('  Popularity coverage:', report.domainCoverage.popularityCoverage.count);
  console.log('  Average KCI:', report.summary.average);
  console.log('  Citation scoring active:', report.activation?.citationScoringActive ?? false);
  console.log('  Popularity scoring active:', report.activation?.popularityScoringActive ?? false);

  if (errors.length) {
    errors.slice(0, 20).forEach((msg) => console.error('  -', msg));
    process.exitCode = 1;
    throw new Error('KCI activation validation failed.');
  }
}

main();
