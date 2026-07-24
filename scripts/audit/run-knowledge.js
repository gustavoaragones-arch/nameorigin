#!/usr/bin/env node
/**
 * scripts/audit/run-knowledge.js — Runs the full Phase 1B Knowledge
 * Coverage Audit in dependency order. Several steps read prior /audit/*.json
 * reports back in (knowledge-dependencies.js, knowledge-report.js), so
 * order matters. Assumes Phase 1A (scripts/audit/run-all.js) has already
 * been run at least once, since it reads audit/templates.json and
 * audit/build-pipeline.json.
 *
 * READ-ONLY: every step below only writes into /audit/.
 *
 * Usage: node scripts/audit/run-knowledge.js
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPTS_DIR = __dirname;
const ROOT = path.join(__dirname, '..', '..');
const AUDIT_DIR = path.join(ROOT, 'audit');

const PHASE_1A_PREREQS = ['templates.json', 'build-pipeline.json'];
const missing = PHASE_1A_PREREQS.filter((f) => !fs.existsSync(path.join(AUDIT_DIR, f)));
if (missing.length) {
  console.error('Missing Phase 1A prerequisite reports:', missing.join(', '));
  console.error('Run `node scripts/audit/run-all.js` first.');
  process.exit(1);
}

const STEPS = [
  'knowledge-coverage.js', // PART 1
  'page-knowledge-matrix.js', // PART 2
  'entity-knowledge-graph.js', // PART 3
  'knowledge-dependencies.js', // PART 4
  'knowledge-density.js', // PART 5
  'empty-knowledge.js', // PART 6
  'knowledge-report.js', // PART 7
];

function run(name) {
  const scriptPath = path.join(SCRIPTS_DIR, name);
  console.log('\n▶', name);
  const result = spawnSync('node', [scriptPath], { cwd: ROOT, stdio: 'inherit' });
  if (result.status !== 0) {
    console.error('Knowledge audit step failed at', name);
    process.exit(result.status);
  }
}

console.log('Knowledge Coverage Audit — Phase 1B —', STEPS.length, 'read-only steps');
STEPS.forEach(run);
console.log('\n✓ All Phase 1B knowledge reports regenerated under /audit/.');
