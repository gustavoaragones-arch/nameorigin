#!/usr/bin/env node
/**
 * Phase 8B — Build entity-level Citation Records from resolved editorial sources.
 */

const {
  buildCitationRecordsPayload,
  writeCitationRecords,
  CITATION_RECORD_PATHS,
} = require('./citation-records-v1.js');

function main() {
  const payload = buildCitationRecordsPayload();
  writeCitationRecords(payload);

  console.log('Citation records built.');
  console.log('  Citation Records:', payload.stats.citationRecords);
  console.log('  Citation IDs assigned:', payload.stats.totalCitationIdsAssigned);
  console.log('  Average citations per entity:', payload.stats.averageCitationsPerEntity);
  console.log('  Duplicate removals:', payload.stats.duplicateRemovals);
  console.log('  Output:', CITATION_RECORD_PATHS.records);
}

main();
