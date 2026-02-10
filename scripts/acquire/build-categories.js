#!/usr/bin/env node
/**
 * Phase 1 — Build data/categories.json from data/names.json.
 * Rule-based: traditional for all; optional biblical/nature from known lists (open/curated).
 */

const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('./config.js');

const NAMES_PATH = path.join(DATA_DIR, 'names.json');
const OUT_PATH = path.join(DATA_DIR, 'categories.json');

const BIBLICAL = new Set(['noah', 'james', 'john', 'david', 'daniel', 'michael', 'matthew', 'samuel', 'joseph', 'benjamin', 'elijah', 'isaac', 'adam', 'luke', 'aaron', 'mary', 'sarah', 'hannah', 'elizabeth', 'rachel', 'rebecca', 'ruth', 'esther', 'abigail', 'deborah', 'miriam', 'lea', 'anna', 'eva', 'eva', 'maria'].map((s) => s.toLowerCase()));
const NATURE = new Set(['river', 'brook', 'sierra', 'willow', 'ivy', 'jade', 'flora', 'rose', 'lily', 'violet', 'jasmine', 'hazel', 'olive', 'aspen', 'sage', 'sky', 'storm', 'rain', 'summer', 'autumn', 'daisy', 'iris', 'laurel'].map((s) => s.toLowerCase()));

function run() {
  const names = fs.existsSync(NAMES_PATH) ? JSON.parse(fs.readFileSync(NAMES_PATH, 'utf8')) : [];
  const categories = [];
  for (const n of names) {
    categories.push({ name_id: n.id, category: 'traditional' });
    const lower = n.name.toLowerCase();
    if (BIBLICAL.has(lower)) categories.push({ name_id: n.id, category: 'biblical' });
    if (NATURE.has(lower)) categories.push({ name_id: n.id, category: 'nature' });
  }
  fs.writeFileSync(OUT_PATH, JSON.stringify(categories, null, 2), 'utf8');
  console.log('Wrote', categories.length, 'category rows to', OUT_PATH);
}

run();
