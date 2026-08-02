/**
 * Phase 15B Wave 2A Batch 24 — curated editorial profiles for 100 new Knowledge Records.
 * Selection: Phase 16A creationOrder ranks 2,301–2,400.
 */
const { makeCreationRecord } = require('./phase15b-wave2-lib.js');
const { PHASE15B_WAVE2_BATCH24_PROFILES: RAW_PROFILES } = require('./phase15b-wave2-batch24-profile-data.js');

const PHASE_LABEL = 'Phase 15B Wave 2A Batch 24';

const PHASE15B_WAVE2_BATCH24_PROFILES = RAW_PROFILES.map((profile) => ({
  ...profile,
  phaseLabel: PHASE_LABEL,
}));

const PHASE15B_WAVE2_BATCH24_RECORDS = PHASE15B_WAVE2_BATCH24_PROFILES.map((profile) =>
  makeCreationRecord(profile.name, profile),
);

module.exports = {
  PHASE15B_WAVE2_BATCH24_PROFILES,
  PHASE15B_WAVE2_BATCH24_RECORDS,
  BATCH24_SELECTION: {
    method: 'phase16a_creation_order',
    scope: 'create_knowledge_record_only',
    wave: 2,
    subwave: '2A',
    batch: 24,
    rankStart: 2301,
    rankEnd: 2400,
    batchesCompleteBeforeSelection: 23,
    profilePattern: 'full_six_domain_creation',
    sourceArtifact: 'audit/phase16a-expansion-intelligence.json',
    governanceReference: 'audit/phase16b-governance-check.json',
    cumulativeBaselineReference: 'audit/phase15b-wave2-batch23-baseline.json',
    expectedKrCountAfter: 3550,
  },
};
