#!/usr/bin/env node
/**
 * Phase 13A — Citation coverage snapshot (read-only).
 *
 * Produces audit/citation-coverage.json
 */

const {
  buildEntityIndex,
  buildCoverageReport,
  AUDIT_DIR,
} = require('../../lib/analysis/citation-coverage-intelligence.js');
const { writeAuditJson } = require('./_lib.js');

function main() {
  console.log('Phase 13A — Citation Coverage Snapshot');
  const ctx = buildEntityIndex();
  const report = buildCoverageReport(ctx);
  writeAuditJson('citation-coverage.json', report);

  console.log('  Total entities:', report.overall.totalEntities);
  console.log('  Citation coverage %:', report.overall.citationCoveragePct);
  console.log('  Integrity:', report.integrity.status);
}

main();
