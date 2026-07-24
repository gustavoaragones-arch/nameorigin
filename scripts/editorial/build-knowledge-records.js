#!/usr/bin/env node
/**
 * Phase 6A — Build unified Knowledge Record v2 from legacy editorial override files.
 *
 * Merges origin/meaning/pronunciation/etymology/history overrides plus wave-1
 * research metadata into data/knowledge-records.json.
 *
 * Does not modify names-enriched.json directly.
 */

const fs = require('fs');
const path = require('path');
const {
  PATHS,
  buildKnowledgeRecordsFromLegacy,
  loadLegacyOverrideBundle,
  loadResearchIndexes,
} = require('./knowledge-record-v2.js');

function main() {
  const legacy = loadLegacyOverrideBundle();
  const research = loadResearchIndexes();
  const payload = buildKnowledgeRecordsFromLegacy(legacy, research);

  fs.mkdirSync(path.dirname(PATHS.knowledgeRecords), { recursive: true });
  fs.writeFileSync(PATHS.knowledgeRecords, JSON.stringify(payload, null, 2));

  const domainCounts = {
    origin: payload.records.filter((row) => row.origin).length,
    meaning: payload.records.filter((row) => row.meaning).length,
    pronunciation: payload.records.filter((row) => row.pronunciation).length,
    etymology: payload.records.filter((row) => row.etymology).length,
    history: payload.records.filter((row) => row.history).length,
  };

  console.log('Knowledge Record v2 build complete.');
  console.log('  Records:', payload.records.length);
  console.log('  Origin domains:', domainCounts.origin);
  console.log('  Meaning domains:', domainCounts.meaning);
  console.log('  Pronunciation domains:', domainCounts.pronunciation);
  console.log('  Etymology domains:', domainCounts.etymology);
  console.log('  History domains:', domainCounts.history);
  console.log('  Output:', PATHS.knowledgeRecords);
}

main();
