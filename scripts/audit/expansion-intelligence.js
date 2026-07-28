#!/usr/bin/env node
/**
 * Phase 16A — Knowledge Record expansion intelligence (read-only).
 *
 * Produces audit/phase16a-expansion-intelligence.json
 */

const {
  buildExpansionIntelligenceReport,
} = require('../../lib/analysis/expansion-intelligence.js');
const { writeAuditJson } = require('./_lib.js');

function main() {
  console.log('Phase 16A — Knowledge Record Expansion Intelligence');

  const report = buildExpansionIntelligenceReport();
  writeAuditJson('phase16a-expansion-intelligence.json', report);

  console.log('  Unresearched entities:', report.summary.unresearchedEntities);
  console.log('  Recommended wave size:', report.summary.recommendedWaveSize);
  console.log('  Recommended waves:', report.summary.recommendedWaveCount);
  console.log('  Top priority:', report.top100CreationCandidates[0]?.slug || 'none');
  console.log('  Creation readiness — ready:', report.creationReadiness.distribution.ready);
}

main();
