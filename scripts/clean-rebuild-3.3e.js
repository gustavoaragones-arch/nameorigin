#!/usr/bin/env node
/**
 * Phase 3.3E — Clean rebuild order (structural stabilization).
 * Run after FIX 1–3: compare in sequence, sibling links guarded, baby-names-with linked from hub.
 *
 * 1. Delete generated output
 * 2. apply-origin-enrichment.js
 * 3. generate-programmatic-pages.js
 * 4. generate-sibling-pages.js --batch=150
 * 5. generate-lastname-pages.js --batch=75
 * 6. generate-compare-pages.js   ← FIX 1: /compare/index.html, /compare/us-vs-uk/index.html
 * 7. build-sitemap.js
 * 8. index-integrity-audit.js
 * 9. post-2.25a-audit.js
 *
 * Usage: node scripts/clean-rebuild-3.3e.js
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const STEPS = [
  { name: 'apply-origin-enrichment.js', args: [] },
  { name: 'topic-cluster-map.js', args: [] },
  { name: 'generate-programmatic-pages.js', args: [] },
  { name: 'generate-sibling-pages.js', args: ['--batch=150'] },
  { name: 'generate-lastname-pages.js', args: ['--batch=75'] },
  { name: 'generate-compare-pages.js', args: [] },
  { name: 'generate-trends-page.js', args: [] },
  { name: 'generate-legal-pages.js', args: [] },
  { name: 'generate-popularity-year-pages.js', args: [] },
  { name: 'build-sitemap.js', args: [] },
  { name: 'index-integrity-audit.js', args: [] },
  { name: 'phase-3.5-validate-audit.js', args: [] },
  { name: 'post-2.25a-audit.js', args: [] },
];

function run(step) {
  const scriptPath = path.join(__dirname, step.name);
  console.log('\n▶', step.name, step.args.length ? step.args.join(' ') : '');
  const result = spawnSync('node', [scriptPath, ...step.args], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env },
  });
  if (result.status !== 0) {
    console.error('Build failed at', step.name);
    process.exit(result.status);
  }
}

// Delete generated output (Phase 3.3E order)
const dirsToRemove = ['build', 'name', 'names', 'compare', 'popularity'];
console.log('Removing generated output: build, name, names, compare, baby-names-with-*');
dirsToRemove.forEach((d) => {
  const full = path.join(ROOT, d);
  if (fs.existsSync(full)) {
    fs.rmSync(full, { recursive: true });
    console.log('  removed', d);
  }
});
try {
  const entries = fs.readdirSync(ROOT, { withFileTypes: true });
  entries.forEach((e) => {
    if (e.isDirectory() && e.name.startsWith('baby-names-with-')) {
      fs.rmSync(path.join(ROOT, e.name), { recursive: true });
      console.log('  removed', e.name);
    }
  });
} catch (_) {}

console.log('\n--- Phase 3.3E clean rebuild ---');
STEPS.forEach(run);
console.log('\n✓ Clean rebuild and audits complete. Check build/index-integrity-report.json for targets.');
