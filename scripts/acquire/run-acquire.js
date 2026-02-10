#!/usr/bin/env node
/**
 * Phase 1 — Run full acquisition pipeline: fetch raw data, then build data/*.json.
 * Requires: Node 18+ (fetch not used; https used), unzip on PATH for SSA/StatCan.
 */

const { execSync } = require('child_process');
const path = require('path');

const ACQUIRE_DIR = path.join(__dirname);

const steps = [
  { name: 'Fetch SSA (USA)', script: 'fetch-ssa.js' },
  { name: 'Fetch StatCan (Canada)', script: 'fetch-statcan.js' },
  { name: 'Fetch ONS UK placeholder', script: 'fetch-ons-uk.js' },
  { name: 'Build names', script: 'build-names.js' },
  { name: 'Build popularity', script: 'build-popularity.js' },
  { name: 'Build variants', script: 'build-variants.js' },
  { name: 'Build categories', script: 'build-categories.js' },
];

for (const step of steps) {
  console.log('\n---', step.name, '---');
  try {
    execSync(`node "${path.join(ACQUIRE_DIR, step.script)}"`, { stdio: 'inherit', cwd: ACQUIRE_DIR });
  } catch (e) {
    if (step.script.startsWith('fetch-')) {
      console.warn('Fetch failed (network or 403). Use manual fallback; see PHASE-1.md. Continuing...');
    } else {
      throw e;
    }
  }
}

console.log('\nDone. Output: data/names.json, data/popularity.json, data/variants.json, data/categories.json');
