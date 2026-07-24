#!/usr/bin/env node
/**
 * scripts/audit/run-truthfulness.js — Phase 1C / PART 7: Runs the full
 * Truthfulness Intelligence Audit in dependency order.
 *
 * Depends on Phase 1A (audit/templates.json, audit/build-pipeline.json,
 * audit/project-inventory.json) and Phase 1B (audit/knowledge-coverage.json)
 * already existing on disk — this phase extends, not duplicates, that
 * work per the Phase 1C brief.
 *
 * READ-ONLY: every step below only writes into /audit/.
 *
 * Usage: node scripts/audit/run-truthfulness.js
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPTS_DIR = __dirname;
const ROOT = path.join(__dirname, '..', '..');
const AUDIT_DIR = path.join(ROOT, 'audit');

const PREREQS = ['templates.json', 'build-pipeline.json', 'project-inventory.json', 'knowledge-coverage.json'];
const missing = PREREQS.filter((f) => !fs.existsSync(path.join(AUDIT_DIR, f)));
if (missing.length) {
  console.error('Missing prerequisite reports:', missing.join(', '));
  console.error('Run `node scripts/audit/run-all.js` and `node scripts/audit/run-knowledge.js` first.');
  process.exit(1);
}

const STEPS = [
  'truthfulness-matrix.js', // PART 1
  'page-truthfulness.js', // PART 2
  'fallback-taxonomy.js', // PART 3
  'assertion-catalog.js', // PART 4
  'truthfulness-hotspots.js', // PART 5
  'truthfulness-report.js', // PART 6
];

function run(name) {
  const scriptPath = path.join(SCRIPTS_DIR, name);
  console.log('\n▶', name);
  const result = spawnSync('node', [scriptPath], { cwd: ROOT, stdio: 'inherit' });
  if (result.status !== 0) {
    console.error('Truthfulness audit step failed at', name);
    process.exit(result.status);
  }
}

console.log('Truthfulness Intelligence Audit — Phase 1C —', STEPS.length, 'read-only steps');
STEPS.forEach(run);
console.log('\n✓ All Phase 1C truthfulness reports regenerated under /audit/.');
