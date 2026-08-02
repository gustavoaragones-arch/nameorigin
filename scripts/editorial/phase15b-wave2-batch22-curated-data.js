/**
 * Phase 15B Wave 2A Batch 22 — curated editorial profiles for 100 new Knowledge Records.
 * Selection: Phase 16A creationOrder ranks 2,101–2,200.
 */
const { makeCreationRecord } = require('./phase15b-wave2-lib.js');
const { PHASE15B_WAVE2_BATCH22_PROFILES: RAW_PROFILES } = require('./phase15b-wave2-batch22-profile-data.js');

const PHASE_LABEL = 'Phase 15B Wave 2A Batch 22';

const PHASE15B_WAVE2_BATCH22_PROFILES = RAW_PROFILES.map((profile) => ({
  ...profile,
  phaseLabel: PHASE_LABEL,
}));

const PHASE15B_WAVE2_BATCH22_RECORDS = PHASE15B_WAVE2_BATCH22_PROFILES.map((profile) =>
  makeCreationRecord(profile.name, profile),
);

module.exports = {
  PHASE15B_WAVE2_BATCH22_PROFILES,
  PHASE15B_WAVE2_BATCH22_RECORDS,
  BATCH22_SELECTION: {
    method: 'phase16a_creation_order',
    scope: 'create_knowledge_record_only',
    wave: 2,
    subwave: '2A',
    batch: 22,
    rankStart: 2101,
    rankEnd: 2200,
    batchesCompleteBeforeSelection: 21,
    profilePattern: 'full_six_domain_creation',
    sourceArtifact: 'audit/phase16a-expansion-intelligence.json',
    governanceReference: 'audit/phase16b-governance-check.json',
    cumulativeBaselineReference: 'audit/phase15b-wave2-batch21-baseline.json',
    expectedKrCountAfter: 3350,
  },
};
