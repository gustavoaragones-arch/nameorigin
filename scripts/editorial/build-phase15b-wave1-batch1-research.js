#!/usr/bin/env node
/**
 * Phase 15B Wave 1 Batch 1 — build editorial research artifact.
 * Writes data/sources/phase15b-wave1-batch1-research.json only.
 */

const fs = require('fs');
const path = require('path');
const { PHASE15B_WAVE1_BATCH1_RECORDS } = require('./phase15b-wave1-batch1-curated-data.js');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const SOURCES_DIR = path.join(DATA_DIR, 'sources');
const OUT_PATH = path.join(SOURCES_DIR, 'phase15b-wave1-batch1-research.json');

function main() {
  const entries = PHASE15B_WAVE1_BATCH1_RECORDS.map((record) => ({
    name: record.name,
    meaning: record.meaning.value,
    pronunciation: record.pronunciation.value,
    etymology: record.etymology.value,
    history: record.history.value,
    confidence: record.meaning.confidence,
    meaningMeta: record.meaning,
    pronunciationMeta: record.pronunciation,
    etymologyMeta: record.etymology,
    historyMeta: record.history,
  }));

  entries.sort((a, b) => a.name.localeCompare(b.name));

  const payload = {
    phase: '15B',
    wave: 1,
    batch: 1,
    title: 'Knowledge Record Expansion Wave 1 Batch 1 — Domain Completion',
    generatedAt: new Date().toISOString(),
    baselineReference: 'editorial-architecture-v2',
    methodology:
      'Explicit editorial assignments for missing domains only. Origin overrides preserved. No inference, no AI generation.',
    entries,
  };

  fs.mkdirSync(SOURCES_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2));

  console.log('Phase 15B Wave 1 Batch 1 research file written.');
  console.log('  Entries:', entries.length);
  console.log('  Output:', OUT_PATH);
}

main();
