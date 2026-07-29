/**
 * Phase 15B Wave 2A Batch 6 — curated editorial profiles for 100 new Knowledge Records.
 * Selection: Phase 16A creationOrder ranks 501–600.
 */
const { makeCreationRecord } = require('./phase15b-wave2-lib.js');
const { PHASE15B_WAVE2_BATCH6_PROFILES: RAW_PROFILES } = require('./phase15b-wave2-batch6-profile-data.js');

const PHASE_LABEL = 'Phase 15B Wave 2A Batch 6';

const PHASE15B_WAVE2_BATCH6_PROFILES = RAW_PROFILES.map((profile) => ({
  ...profile,
  phaseLabel: PHASE_LABEL,
}));

const PHASE15B_WAVE2_BATCH6_RECORDS = PHASE15B_WAVE2_BATCH6_PROFILES.map((profile) =>
  makeCreationRecord(profile.name, profile),
);

module.exports = {
  PHASE15B_WAVE2_BATCH6_PROFILES,
  PHASE15B_WAVE2_BATCH6_RECORDS,
  BATCH6_SELECTION: {
    method: 'phase16a_creation_order',
    scope: 'create_knowledge_record_only',
    wave: 2,
    subwave: '2A',
    batch: 6,
    rankStart: 501,
    rankEnd: 600,
    batchesCompleteBeforeSelection: 5,
    profilePattern: 'full_six_domain_creation',
    sourceArtifact: 'audit/phase16a-expansion-intelligence.json',
    governanceReference: 'audit/phase16b-governance-check.json',
    cumulativeBaselineReference: 'audit/phase15b-wave2-batch5-baseline.json',
    expectedKrCountAfter: 1750,
  },
};
