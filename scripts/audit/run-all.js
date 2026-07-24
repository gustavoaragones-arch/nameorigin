#!/usr/bin/env node
/**
 * scripts/audit/run-all.js — Runs the full Phase 1A Project Intelligence
 * Engine in dependency order (project-health.js reads the other reports
 * back in, so it must run last) and then regenerates the executive report.
 *
 * READ-ONLY: every step below only writes into /audit/. Nothing here
 * touches HTML, generators, routing, or build output.
 *
 * Usage: node scripts/audit/run-all.js
 */

const { spawnSync } = require('child_process');
const path = require('path');

const SCRIPTS_DIR = __dirname;
const ROOT = path.join(__dirname, '..', '..');

const STEPS = [
  'inventory.js', // PART 1
  'site-structure.js', // PART 2
  'templates.js', // PART 3
  'entity-map.js', // PART 4
  'datasets.js', // PART 5
  'build-pipeline.js', // PART 6
  'project-health.js', // PART 7 (reads PARTS 1-6 back in)
  'report.js', // PART 8 (reads PARTS 1-7 back in)
];

function run(name) {
  const scriptPath = path.join(SCRIPTS_DIR, name);
  console.log('\n▶', name);
  const result = spawnSync('node', [scriptPath], { cwd: ROOT, stdio: 'inherit' });
  if (result.status !== 0) {
    console.error('Audit step failed at', name);
    process.exit(result.status);
  }
}

console.log('Project Intelligence Engine — Phase 1A —', STEPS.length, 'read-only steps');
STEPS.forEach(run);
console.log('\n✓ All audit reports regenerated under /audit/.');
