/**
 * Phase 15B Wave 2A Batch 19 — curated editorial profiles for 100 new Knowledge Records.
 * Selection: Phase 16A creationOrder ranks 1,801–1,900.
 */
const { makeCreationRecord } = require('./phase15b-wave2-lib.js');
const { PHASE15B_WAVE2_BATCH19_PROFILES: RAW_PROFILES } = require('./phase15b-wave2-batch19-profile-data.js');

const PHASE_LABEL = 'Phase 15B Wave 2A Batch 19';

const PHASE15B_WAVE2_BATCH19_PROFILES = RAW_PROFILES.map((profile) => ({
  ...profile,
  phaseLabel: PHASE_LABEL,
}));

const PHASE15B_WAVE2_BATCH19_RECORDS = PHASE15B_WAVE2_BATCH19_PROFILES.map((profile) =>
  makeCreationRecord(profile.name, profile),
);

module.exports = {
  PHASE15B_WAVE2_BATCH19_PROFILES,
  PHASE15B_WAVE2_BATCH19_RECORDS,
  BATCH19_SELECTION: {
    method: 'phase16a_creation_order',
    scope: 'create_knowledge_record_only',
    wave: 2,
    subwave: '2A',
    batch: 19,
    rankStart: 1801,
    rankEnd: 1900,
    batchesCompleteBeforeSelection: 18,
    profilePattern: 'full_six_domain_creation',
    sourceArtifact: 'audit/phase16a-expansion-intelligence.json',
    governanceReference: 'audit/phase16b-governance-check.json',
    cumulativeBaselineReference: 'audit/phase15b-wave2-batch18-baseline.json',
    expectedKrCountAfter: 3050,
  },
};
