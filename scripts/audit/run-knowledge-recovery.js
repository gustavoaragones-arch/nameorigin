#!/usr/bin/env node
/**
 * scripts/audit/run-knowledge-recovery.js — Phase 1D: runs the full
 * Knowledge Recovery Intelligence pipeline in dependency order.
 *
 * Depends on Phase 1A (audit/project-inventory.json), Phase 1B
 * (audit/knowledge-coverage.json), and Phase 1C
 * (audit/truthfulness-matrix.json, audit/knowledge-dependencies.json)
 * already existing on disk.
 *
 * READ-ONLY: every step below only writes into /audit/.
 *
 * Usage: node scripts/audit/run-knowledge-recovery.js
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPTS_DIR = __dirname;
const ROOT = path.join(__dirname, '..', '..');
const AUDIT_DIR = path.join(ROOT, 'audit');

const PREREQS = ['project-inventory.json', 'knowledge-coverage.json', 'knowledge-dependencies.json', 'truthfulness-matrix.json'];
const missing = PREREQS.filter((f) => !fs.existsSync(path.join(AUDIT_DIR, f)));
if (missing.length) {
  console.error('Missing prerequisite reports:', missing.join(', '));
  console.error('Run run-all.js, run-knowledge.js, and run-truthfulness.js first.');
  process.exit(1);
}

const STEPS = [
  'knowledge-roi.js',
  'knowledge-impact-graph.js',
  'editorial-priority-queue.js',
  'research-workload.js',
  'recovery-scenarios.js',
  'knowledge-recovery-report.js',
];

function run(name) {
  const scriptPath = path.join(SCRIPTS_DIR, name);
  console.log('\n▶', name);
  const result = spawnSync('node', [scriptPath], { cwd: ROOT, stdio: 'inherit' });
  if (result.status !== 0) {
    console.error('Knowledge recovery step failed at', name);
    process.exit(result.status);
  }
}

console.log('Knowledge Recovery Intelligence — Phase 1D —', STEPS.length, 'read-only steps');
STEPS.forEach(run);
console.log('\n✓ All Phase 1D knowledge recovery reports regenerated under /audit/.');
