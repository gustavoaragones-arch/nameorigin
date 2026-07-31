#!/usr/bin/env node
/**
 * Phase 15B Wave 2A Batch 16 — build editorial research artifact.
 */

const fs = require('fs');
const path = require('path');
const {
  PHASE15B_WAVE2_BATCH16_RECORDS,
  BATCH16_SELECTION,
} = require('./phase15b-wave2-batch16-curated-data.js');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const SOURCES_DIR = path.join(DATA_DIR, 'sources');
const OUT_PATH = path.join(SOURCES_DIR, 'phase15b-wave2-batch16-research.json');

function main() {
  const entries = PHASE15B_WAVE2_BATCH16_RECORDS.map((record) => ({
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
    wave: 2,
    subwave: '2A',
    batch: 16,
    title: 'Knowledge Record Expansion Wave 2A Batch 16 — Record Creation',
    generatedAt: new Date().toISOString(),
    baselineReference: 'editorial-architecture-v2',
    selection: BATCH16_SELECTION,
    methodology:
      'Full six-domain editorial assignment for new Knowledge Records. Existing Wave 1 and prior Wave 2 batches preserved.',
    entries,
  };

  fs.mkdirSync(SOURCES_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2));

  console.log('Phase 15B Wave 2A Batch 16 research file written.');
  console.log('  Entries:', entries.length);
  console.log('  Output:', OUT_PATH);
}

main();
