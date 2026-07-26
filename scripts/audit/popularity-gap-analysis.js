#!/usr/bin/env node
/**
 * Phase 14A — Popularity gap analysis and prioritization (read-only).
 *
 * Produces audit/popularity-gap-analysis.json
 */

const fs = require('fs');
const path = require('path');
const {
  buildEntityIndex,
  buildCoverageReport,
  buildGapAnalysisReport,
  AUDIT_DIR,
} = require('../../lib/analysis/popularity-coverage-intelligence.js');
const { writeAuditJson } = require('./_lib.js');

function main() {
  console.log('Phase 14A — Popularity Gap Analysis');

  const coveragePath = path.join(AUDIT_DIR, 'popularity-coverage.json');
  const ctx = buildEntityIndex();
  const coverageReport = fs.existsSync(coveragePath)
    ? JSON.parse(fs.readFileSync(coveragePath, 'utf8'))
    : buildCoverageReport(ctx);

  const report = buildGapAnalysisReport(ctx, coverageReport);
  writeAuditJson('popularity-gap-analysis.json', report);

  console.log('  Entities ranked:', report.totals.entitiesRanked);
  console.log('  Zero-source entities:', report.totals.zeroSourceEntities);
  console.log('  Top priority:', report.top100HighestPriority[0]?.slug || 'none');
}

main();
