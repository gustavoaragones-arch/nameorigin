#!/usr/bin/env node
/**
 * Phase 15B Wave 2A Batch 9 — apply Knowledge Record creation.
 */

const { applyCreationRecords } = require('./apply-phase15b-wave2-lib.js');
const { PHASE15B_WAVE2_BATCH9_RECORDS } = require('./phase15b-wave2-batch9-curated-data.js');

function main() {
  const result = applyCreationRecords(PHASE15B_WAVE2_BATCH9_RECORDS, {
    phaseLabel: 'Phase 15B Wave 2A Batch 9',
  });

  console.log('Phase 15B Wave 2A Batch 9 applied.');
  console.log('  New records created:', result.created);
  console.log('  Domains added:', result.domainsAdded);
  console.log('  Skipped (already present):', result.skipped);
}

main();
