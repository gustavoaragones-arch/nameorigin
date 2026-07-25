#!/usr/bin/env node
/**
 * Phase 9B — Build entity-level Popularity Records from legacy popularity data.
 */

const {
  buildPopularityRecordsPayload,
  writePopularityRecords,
  POPULARITY_RECORD_PATHS,
} = require('./popularity-records-v1.js');

function main() {
  const payload = buildPopularityRecordsPayload();
  writePopularityRecords(payload);

  console.log('Popularity records built.');
  console.log('  Popularity Records:', payload.stats.popularityRecords);
  console.log('  Legacy rows migrated:', payload.stats.legacyPopularityRows);
  console.log('  Source IDs assigned:', payload.stats.totalSourceIdsAssigned);
  console.log('  Source resolution rate:', `${payload.stats.sourceResolutionRatePct}%`);
  console.log('  Unresolved authorities:', payload.stats.unresolvedAuthorities.length);
  console.log('  Duplicate removals:', payload.stats.duplicateRemovals);
  console.log('  Output:', POPULARITY_RECORD_PATHS.records);
}

main();
