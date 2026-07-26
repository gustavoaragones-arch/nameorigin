#!/usr/bin/env node
/**
 * Phase 14A — Popularity coverage snapshot (read-only).
 *
 * Produces audit/popularity-coverage.json
 */

const { buildEntityIndex, buildCoverageReport } = require('../../lib/analysis/popularity-coverage-intelligence.js');
const { writeAuditJson } = require('./_lib.js');

function main() {
  console.log('Phase 14A — Popularity Coverage Snapshot');
  const ctx = buildEntityIndex();
  const report = buildCoverageReport(ctx);
  writeAuditJson('popularity-coverage.json', report);

  console.log('  Total entities:', report.overall.totalEntities);
  console.log('  Popularity record coverage %:', report.overall.popularityRecordCoveragePct);
  console.log('  Integrity:', report.integrity.status);
}

main();
