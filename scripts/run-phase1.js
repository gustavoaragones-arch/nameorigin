#!/usr/bin/env node
/**
 * Run full Phase 1 — Curated Data Acquisition Engine.
 * Order: import (raw-data) → normalize → enrich → classify → popularity → compatibility → export → seed → validate.
 * Final output: /data/names.json, popularity.json, variants.json, categories.json
 */

const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCRIPTS = [
  { name: 'Import SSA (USA)', script: 'import-ssa.js' },
  { name: 'Import Canada', script: 'import-canada.js' },
  { name: 'Import UK', script: 'import-uk.js' },
  { name: 'Import Australia', script: 'import-australia.js' },
  { name: 'Import Wikidata', script: 'import-wikidata-names.js' },
  { name: 'Normalize names', script: 'normalize-names.js' },
  { name: 'Enrich meanings', script: 'enrich-meanings.js' },
  { name: 'Classify categories', script: 'classify-categories.js' },
  { name: 'Build popularity', script: 'build-popularity.js' },
  { name: 'Build compatibility', script: 'build-compatibility.js' },
  { name: 'Export JSON data', script: 'export-json-data.js' },
  { name: 'Seed D1', script: 'seed-d1.js' },
  { name: 'Validate data', script: 'validate-data.js' },
];

console.log('Phase 1 — Curated Data Acquisition Engine\n');

for (const { name, script } of SCRIPTS) {
  console.log('---', name, '---');
  try {
    execSync(`node "${path.join(__dirname, script)}"`, { stdio: 'inherit', cwd: ROOT });
  } catch (e) {
    if (script.startsWith('import-')) {
      console.warn('Import step failed (network or missing file). Continue or add raw data and re-run.');
    } else {
      throw e;
    }
  }
}

console.log('\nPhase 1 complete. Output: data/names.json, data/popularity.json, data/variants.json, data/categories.json');
