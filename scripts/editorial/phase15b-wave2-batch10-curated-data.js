/**
 * Phase 15B Wave 2A Batch 10 — curated editorial profiles for 100 new Knowledge Records.
 * Selection: Phase 16A creationOrder ranks 901–1,000.
 */
const { makeCreationRecord } = require('./phase15b-wave2-lib.js');
const { PHASE15B_WAVE2_BATCH10_PROFILES: RAW_PROFILES } = require('./phase15b-wave2-batch10-profile-data.js');

const PHASE_LABEL = 'Phase 15B Wave 2A Batch 10';

const PHASE15B_WAVE2_BATCH10_PROFILES = RAW_PROFILES.map((profile) => ({
  ...profile,
  phaseLabel: PHASE_LABEL,
}));

const PHASE15B_WAVE2_BATCH10_RECORDS = PHASE15B_WAVE2_BATCH10_PROFILES.map((profile) =>
  makeCreationRecord(profile.name, profile),
);

module.exports = {
  PHASE15B_WAVE2_BATCH10_PROFILES,
  PHASE15B_WAVE2_BATCH10_RECORDS,
  BATCH10_SELECTION: {
    method: 'phase16a_creation_order',
    scope: 'create_knowledge_record_only',
    wave: 2,
    subwave: '2A',
    batch: 10,
    rankStart: 901,
    rankEnd: 1000,
    batchesCompleteBeforeSelection: 9,
    profilePattern: 'full_six_domain_creation',
    sourceArtifact: 'audit/phase16a-expansion-intelligence.json',
    governanceReference: 'audit/phase16b-governance-check.json',
    cumulativeBaselineReference: 'audit/phase15b-wave2-batch9-baseline.json',
    expectedKrCountAfter: 2150,
    milestone: 'Early majority coverage',
  },
};
