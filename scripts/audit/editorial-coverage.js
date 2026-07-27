#!/usr/bin/env node
/**
 * Phase 15A — Editorial coverage snapshot (read-only).
 *
 * Produces audit/editorial-coverage.json
 */

const { buildEntityIndex, buildCoverageReport } = require('../../lib/analysis/editorial-coverage-intelligence.js');
const { writeAuditJson } = require('./_lib.js');

function main() {
  console.log('Phase 15A — Editorial Coverage Snapshot');
  const ctx = buildEntityIndex();
  const report = buildCoverageReport(ctx);
  writeAuditJson('editorial-coverage.json', report);

  console.log('  Total entities:', report.overall.totalEntities);
  console.log('  Knowledge record coverage %:', report.overall.knowledgeRecordCoveragePct);
  console.log('  Integrity:', report.integrity.status);
}

main();
