#!/usr/bin/env node
/**
 * Phase 1 — Build data/variants.json from data/names.json.
 * At least one variant per name (canonical form in English). Expand later via Wikidata/open data.
 */

const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('./config.js');

const NAMES_PATH = path.join(DATA_DIR, 'names.json');
const OUT_PATH = path.join(DATA_DIR, 'variants.json');

function run() {
  const names = fs.existsSync(NAMES_PATH) ? JSON.parse(fs.readFileSync(NAMES_PATH, 'utf8')) : [];
  const variants = [];
  for (const n of names) {
    variants.push({ name_id: n.id, variant: n.name, language: 'English' });
  }
  fs.writeFileSync(OUT_PATH, JSON.stringify(variants, null, 2), 'utf8');
  console.log('Wrote', variants.length, 'variant rows to', OUT_PATH);
}

run();
