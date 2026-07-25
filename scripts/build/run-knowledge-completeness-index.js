#!/usr/bin/env node
/**
 * Phase 10A — Knowledge Completeness Index (KCI) audit runner.
 *
 * Builds canonical entities in memory (no dataset or schema changes),
 * scores each entity deterministically using Citation Records and
 * Popularity Records, and writes internal audit artifacts.
 *
 * Usage: node scripts/build/run-knowledge-completeness-index.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const AUDIT_DIR = path.join(ROOT, 'audit');

const loaders = require('../../lib/canonical/loaders.js');
const { buildAllEntities } = require('../../lib/canonical/entity-builder.js');
const {
  scoreEntity,
  buildKnowledgeCompletenessReport,
  buildLeaderboard,
  computeDomainCoverage,
  MAX_SCORE,
} = require('../../lib/analysis/knowledge-completeness.js');
const { createKciActivationContext } = require('../../lib/analysis/kci-activation-v1.js');

function main() {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });

  const buildTimestamp = new Date().toISOString();
  const activationCtx = createKciActivationContext();
  const ctx = loaders.loadAll();
  const entities = buildAllEntities(ctx, buildTimestamp);
  const scoredEntities = entities.map((entity) => scoreEntity(entity, activationCtx));

  if (scoredEntities.length !== entities.length) {
    throw new Error('KCI validation failed: entity count mismatch after scoring.');
  }

  for (const entry of scoredEntities) {
    if (entry.score < 0 || entry.score > MAX_SCORE) {
      throw new Error(`KCI validation failed: score out of range for ${entry.slug} (${entry.score}).`);
    }
  }

  const report = buildKnowledgeCompletenessReport(entities, buildTimestamp, activationCtx);
  const top100 = buildLeaderboard(scoredEntities, 'top', 100);
  const bottom100 = buildLeaderboard(scoredEntities, 'bottom', 100);
  const domainCoverage = {
    generatedAt: buildTimestamp,
    phase: '10A',
    baselineReference: 'kci-activation-v1',
    phase5AOriginExpansionStarted: false,
    activation: report.activation,
    ...computeDomainCoverage(scoredEntities, scoredEntities.length),
  };

  fs.writeFileSync(path.join(AUDIT_DIR, 'knowledge-completeness.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(AUDIT_DIR, 'kci-top-100.json'), JSON.stringify(top100, null, 2));
  fs.writeFileSync(path.join(AUDIT_DIR, 'kci-bottom-100.json'), JSON.stringify(bottom100, null, 2));
  fs.writeFileSync(path.join(AUDIT_DIR, 'domain-coverage.json'), JSON.stringify(domainCoverage, null, 2));

  console.log('Phase 10A Knowledge Completeness Index complete.');
  console.log('  Entities processed:', report.entityCount);
  console.log('  Average KCI:', report.summary.average);
  console.log('  Median KCI:', report.summary.median);
  console.log('  Score range:', report.summary.min, '-', report.summary.max);
  console.log('  Citation coverage:', domainCoverage.citationCoverage.count, `(${domainCoverage.citationCoverage.pct}%)`);
  console.log('  Popularity coverage:', domainCoverage.popularityCoverage.count, `(${domainCoverage.popularityCoverage.pct}%)`);
  console.log('  Citation scoring active: true');
  console.log('  Popularity scoring active: true');
}

main();
