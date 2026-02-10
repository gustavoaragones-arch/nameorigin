#!/usr/bin/env node
/**
 * build-all.js — Master build script.
 * Runs in order:
 *   1. generate-name-pages.js
 *   2. generate-filter-pages.js
 *   3. generate-lastname-pages.js
 *   4. generate-hubs.js
 *   5. build-sitemap.js
 *
 * Env: OUT_DIR, SITE_URL (and others) are passed through to child scripts.
 *
 * Recommended (unified generator): To generate all programmatic pages (name, filter,
 * country, style, letter, last-name, hub) with verification (total count, sample URLs,
 * fail if zero pages), run:
 *   node scripts/generate-programmatic-pages.js && node scripts/build-sitemap.js
 * The generator exits with code 1 if zero pages are generated.
 */

const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCRIPTS_DIR = __dirname;

const STEPS = [
  'generate-name-pages.js',
  'generate-filter-pages.js',
  'generate-lastname-pages.js',
  'generate-hubs.js',
  'build-sitemap.js',
];

function run(name) {
  const scriptPath = path.join(SCRIPTS_DIR, name);
  console.log('\n▶', name);
  const result = spawnSync('node', [scriptPath], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env },
  });
  if (result.status !== 0) {
    console.error('Build failed at', name, '(exit code', result.status + ')');
    process.exit(result.status);
  }
}

console.log('Build all —', STEPS.length, 'steps');
STEPS.forEach(run);
console.log('\n✓ Build complete.');
