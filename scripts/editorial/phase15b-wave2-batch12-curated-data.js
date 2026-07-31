/**
 * Phase 15B Wave 2A Batch 12 — curated editorial profiles for 100 new Knowledge Records.
 * Selection: Phase 16A creationOrder ranks 1,101–1,200.
 */
const { makeCreationRecord } = require('./phase15b-wave2-lib.js');
const { PHASE15B_WAVE2_BATCH12_PROFILES: RAW_PROFILES } = require('./phase15b-wave2-batch12-profile-data.js');

const PHASE_LABEL = 'Phase 15B Wave 2A Batch 12';

const PHASE15B_WAVE2_BATCH12_PROFILES = RAW_PROFILES.map((profile) => ({
  ...profile,
  phaseLabel: PHASE_LABEL,
}));

const PHASE15B_WAVE2_BATCH12_RECORDS = PHASE15B_WAVE2_BATCH12_PROFILES.map((profile) =>
  makeCreationRecord(profile.name, profile),
);

module.exports = {
  PHASE15B_WAVE2_BATCH12_PROFILES,
  PHASE15B_WAVE2_BATCH12_RECORDS,
  BATCH12_SELECTION: {
    method: 'phase16a_creation_order',
    scope: 'create_knowledge_record_only',
    wave: 2,
    subwave: '2A',
    batch: 12,
    rankStart: 1101,
    rankEnd: 1200,
    batchesCompleteBeforeSelection: 11,
    profilePattern: 'full_six_domain_creation',
    sourceArtifact: 'audit/phase16a-expansion-intelligence.json',
    governanceReference: 'audit/phase16b-governance-check.json',
    cumulativeBaselineReference: 'audit/phase15b-wave2-batch11-baseline.json',
    expectedKrCountAfter: 2350,
  },
};
