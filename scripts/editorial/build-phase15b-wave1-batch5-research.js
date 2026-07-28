#!/usr/bin/env node
/**
 * Phase 15B Wave 1 Batch 5 — build editorial research artifact.
 */

const fs = require('fs');
const path = require('path');
const {
  PHASE15B_WAVE1_BATCH5_RECORDS,
  BATCH5_SELECTION,
} = require('./phase15b-wave1-batch5-curated-data.js');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const SOURCES_DIR = path.join(DATA_DIR, 'sources');
const OUT_PATH = path.join(SOURCES_DIR, 'phase15b-wave1-batch5-research.json');

function main() {
  const entries = PHASE15B_WAVE1_BATCH5_RECORDS.map((record) => ({
    name: record.name,
    origin: record.origin?.value ?? null,
    meaning: record.meaning.value,
    pronunciation: record.pronunciation.value,
    etymology: record.etymology.value,
    history: record.history.value,
    confidence: record.meaning.confidence,
    originMeta: record.origin ?? null,
    meaningMeta: record.meaning,
    pronunciationMeta: record.pronunciation,
    etymologyMeta: record.etymology,
    historyMeta: record.history,
  }));

  entries.sort((a, b) => a.name.localeCompare(b.name));

  const payload = {
    phase: '15B',
    wave: 1,
    batch: 5,
    title: 'Knowledge Record Expansion Wave 1 Batch 5 — Domain Completion',
    generatedAt: new Date().toISOString(),
    baselineReference: 'editorial-architecture-v2',
    selection: BATCH5_SELECTION,
    methodology:
      'Explicit editorial assignments for missing domains only. Existing populated fields and origin overrides preserved.',
    entries,
  };

  fs.mkdirSync(SOURCES_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2));

  console.log('Phase 15B Wave 1 Batch 5 research file written.');
  console.log('  Entries:', entries.length);
  console.log('  Output:', OUT_PATH);
}

main();
