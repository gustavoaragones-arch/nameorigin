#!/usr/bin/env node
/**
 * Phase 15A — Editorial gap analysis and prioritization (read-only).
 *
 * Produces audit/editorial-gap-analysis.json
 */

const fs = require('fs');
const path = require('path');
const {
  buildEntityIndex,
  buildCoverageReport,
  buildGapAnalysisReport,
  AUDIT_DIR,
} = require('../../lib/analysis/editorial-coverage-intelligence.js');
const { writeAuditJson } = require('./_lib.js');

function main() {
  console.log('Phase 15A — Editorial Gap Analysis');

  const coveragePath = path.join(AUDIT_DIR, 'editorial-coverage.json');
  const ctx = buildEntityIndex();
  const coverageReport = fs.existsSync(coveragePath)
    ? JSON.parse(fs.readFileSync(coveragePath, 'utf8'))
    : buildCoverageReport(ctx);

  const report = buildGapAnalysisReport(ctx, coverageReport);
  writeAuditJson('editorial-gap-analysis.json', report);

  console.log('  Entities ranked:', report.totals.entitiesRanked);
  console.log('  Unresearched entities:', report.totals.unresearchedEntities);
  console.log('  Top priority:', report.top100HighestPriority[0]?.slug || 'none');
}

main();
