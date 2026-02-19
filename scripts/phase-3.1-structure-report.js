#!/usr/bin/env node
/**
 * Phase 3.1 — Structure Metrics Report
 *
 * Runs crawl-depth-distribution, internal-link-density, sitemap-hygiene,
 * and optionally compatibility audit (expansion mode). Reports success criteria.
 *
 * Usage: node scripts/phase-3.1-structure-report.js
 * Or: BUILD_REPORT=1 node scripts/phase-3.1-structure-report.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function run(script, env = {}) {
  const scriptPath = path.join(__dirname, script);
  try {
    execSync(process.execPath, [scriptPath], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...env } });
  } catch (e) {
    if (e.status !== undefined) process.exit(e.status);
    throw e;
  }
}

console.log('Phase 3.1 — Structure Metrics Report\n');

run('crawl-depth-distribution.js', { BUILD_REPORT: '1' });
console.log('');

run('internal-link-density-report.js', { BUILD_REPORT: '1' });
console.log('');

run('sitemap-hygiene-report.js');
console.log('');

console.log('--- Success criteria (Phase 3.1) ---');
const buildDir = path.join(ROOT, 'build');
const depthReport = path.join(buildDir, 'crawl-depth-distribution.json');
const densityReport = path.join(buildDir, 'internal-link-density-report.json');

let depthOk = false;
let densityOk = false;
if (fs.existsSync(depthReport)) {
  const d = JSON.parse(fs.readFileSync(depthReport, 'utf8'));
  depthOk = d.passed && d.depth_5_plus.count === 0;
  console.log('Crawl depth ≤ 4 for 100%% pages:', depthOk ? '✅' : '❌');
}
if (fs.existsSync(densityReport)) {
  const r = JSON.parse(fs.readFileSync(densityReport, 'utf8'));
  densityOk = r.all_goals_met;
  console.log('Average inbound ≥ 10 per page type (goal met):', densityOk ? '✅' : '❌ (see report for under-linked types)');
}

console.log('');
console.log('Next: node scripts/post-2.25a-audit.js (confirm authority_coverage_score ≥ 0.99).');
console.log('To apply mesh reinforcement on name pages (Sibling block): run node scripts/generate-programmatic-pages.js');
console.log('To apply hub→baby-names-with links: run node scripts/generate-programmatic-pages.js (updates last name hub).');
