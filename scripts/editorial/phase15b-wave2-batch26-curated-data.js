/**
 * Phase 15B Wave 2A Batch 26 — curated editorial profiles for 47 new Knowledge Records.
 * Selection: Phase 16A creationOrder ranks 2,501–2,547 (final Wave 2 batch).
 */
const { makeCreationRecord } = require('./phase15b-wave2-lib.js');
const { PHASE15B_WAVE2_BATCH26_PROFILES: RAW_PROFILES } = require('./phase15b-wave2-batch26-profile-data.js');

const PHASE_LABEL = 'Phase 15B Wave 2A Batch 26';

const PHASE15B_WAVE2_BATCH26_PROFILES = RAW_PROFILES.map((profile) => ({
  ...profile,
  phaseLabel: PHASE_LABEL,
}));

const PHASE15B_WAVE2_BATCH26_RECORDS = PHASE15B_WAVE2_BATCH26_PROFILES.map((profile) =>
  makeCreationRecord(profile.name, profile),
);

module.exports = {
  PHASE15B_WAVE2_BATCH26_PROFILES,
  PHASE15B_WAVE2_BATCH26_RECORDS,
  BATCH26_SELECTION: {
    method: 'phase16a_creation_order',
    scope: 'create_knowledge_record_only',
    wave: 2,
    subwave: '2A',
    batch: 26,
    rankStart: 2501,
    rankEnd: 2547,
    batchesCompleteBeforeSelection: 25,
    profilePattern: 'full_six_domain_creation',
    sourceArtifact: 'audit/phase16a-expansion-intelligence.json',
    governanceReference: 'audit/phase16b-governance-check.json',
    cumulativeBaselineReference: 'audit/phase15b-wave2-batch25-baseline.json',
    expectedKrCountAfter: 3697,
    milestone: 'Full corpus',
    finalBatch: true,
    recordCount: 47,
  },
};
