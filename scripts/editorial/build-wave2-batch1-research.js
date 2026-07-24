#!/usr/bin/env node
/**
 * Phase 7A — Build Wave 2 Batch 1 editorial research file.
 * Writes data/sources/wave2-batch1-research.json only.
 */

const fs = require('fs');
const path = require('path');
const { WAVE2_BATCH1_RECORDS } = require('./wave2-batch1-curated-data.js');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const SOURCES_DIR = path.join(DATA_DIR, 'sources');
const OUT_PATH = path.join(SOURCES_DIR, 'wave2-batch1-research.json');

function main() {
  const entries = WAVE2_BATCH1_RECORDS.map((record) => ({
    name: record.name,
    origin: record.origin.value,
    meaning: record.meaning.value,
    pronunciation: record.pronunciation.value,
    etymology: record.etymology.value,
    history: record.history.value,
    confidence: record.origin.confidence,
    originMeta: record.origin,
    meaningMeta: record.meaning,
    pronunciationMeta: record.pronunciation,
    etymologyMeta: record.etymology,
    historyMeta: record.history,
  }));

  entries.sort((a, b) => a.name.localeCompare(b.name));

  const payload = {
    phase: '7A',
    title: 'Editorial Expansion Wave 2 Batch 1',
    generatedAt: new Date().toISOString(),
    baselineReference: 'editorial-architecture-v2',
    methodology:
      'Explicit editorial assignments only. Every record includes all five domains with full provenance metadata. No inference, no AI generation.',
    entries,
  };

  fs.mkdirSync(SOURCES_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2));

  console.log('Phase 7A Wave 2 Batch 1 research file written.');
  console.log('  Entries:', entries.length);
  console.log('  Output:', OUT_PATH);
}

main();
