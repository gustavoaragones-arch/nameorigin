/**
 * Phase 15B Wave 2A Batch 14 — curated editorial profiles for 100 new Knowledge Records.
 * Selection: Phase 16A creationOrder ranks 1,301–1,400.
 */
const { makeCreationRecord } = require('./phase15b-wave2-lib.js');
const { PHASE15B_WAVE2_BATCH14_PROFILES: RAW_PROFILES } = require('./phase15b-wave2-batch14-profile-data.js');

const PHASE_LABEL = 'Phase 15B Wave 2A Batch 14';

const PHASE15B_WAVE2_BATCH14_PROFILES = RAW_PROFILES.map((profile) => ({
  ...profile,
  phaseLabel: PHASE_LABEL,
}));

const PHASE15B_WAVE2_BATCH14_RECORDS = PHASE15B_WAVE2_BATCH14_PROFILES.map((profile) =>
  makeCreationRecord(profile.name, profile),
);

module.exports = {
  PHASE15B_WAVE2_BATCH14_PROFILES,
  PHASE15B_WAVE2_BATCH14_RECORDS,
  BATCH14_SELECTION: {
    method: 'phase16a_creation_order',
    scope: 'create_knowledge_record_only',
    wave: 2,
    subwave: '2A',
    batch: 14,
    rankStart: 1301,
    rankEnd: 1400,
    batchesCompleteBeforeSelection: 13,
    profilePattern: 'full_six_domain_creation',
    sourceArtifact: 'audit/phase16a-expansion-intelligence.json',
    governanceReference: 'audit/phase16b-governance-check.json',
    cumulativeBaselineReference: 'audit/phase15b-wave2-batch13-baseline.json',
    halfwayReviewReference: 'audit/phase15b-wave2-halfway-review.json',
    expectedKrCountAfter: 2550,
    milestone: 'Wave 2 second half entry',
  },
};
