/**
 * Phase 15B Wave 2A Batch 20 — curated editorial profiles for 100 new Knowledge Records.
 * Selection: Phase 16A creationOrder ranks 1,901–2,000.
 */
const { makeCreationRecord } = require('./phase15b-wave2-lib.js');
const { PHASE15B_WAVE2_BATCH20_PROFILES: RAW_PROFILES } = require('./phase15b-wave2-batch20-profile-data.js');

const PHASE_LABEL = 'Phase 15B Wave 2A Batch 20';

const PHASE15B_WAVE2_BATCH20_PROFILES = RAW_PROFILES.map((profile) => ({
  ...profile,
  phaseLabel: PHASE_LABEL,
}));

const PHASE15B_WAVE2_BATCH20_RECORDS = PHASE15B_WAVE2_BATCH20_PROFILES.map((profile) =>
  makeCreationRecord(profile.name, profile),
);

module.exports = {
  PHASE15B_WAVE2_BATCH20_PROFILES,
  PHASE15B_WAVE2_BATCH20_RECORDS,
  BATCH20_SELECTION: {
    method: 'phase16a_creation_order',
    scope: 'create_knowledge_record_only',
    wave: 2,
    subwave: '2A',
    batch: 20,
    rankStart: 1901,
    rankEnd: 2000,
    batchesCompleteBeforeSelection: 19,
    profilePattern: 'full_six_domain_creation',
    sourceArtifact: 'audit/phase16a-expansion-intelligence.json',
    governanceReference: 'audit/phase16b-governance-check.json',
    cumulativeBaselineReference: 'audit/phase15b-wave2-batch19-baseline.json',
    expectedKrCountAfter: 3150,
    milestone: 'Majority coverage',
  },
};
