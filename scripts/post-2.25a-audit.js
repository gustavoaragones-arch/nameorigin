#!/usr/bin/env node
/**
 * post-2.25a-audit.js — After Phase 2.25A fix: re-run sitemap, internal link audit, canonical audit.
 * Then print 5 name URLs for Search Console spot-check (manual step).
 *
 * Usage: node scripts/post-2.25a-audit.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE_URL = process.env.SITE_URL || 'https://nameorigin.io';
const REPORT_PATH = path.join(ROOT, 'build', 'index-integrity-report.json');

const FIVE_NAMES = ['liam', 'olivia', 'noah', 'emma', 'oliver'];

function run(name, script) {
  console.log('\n---', name, '---\n');
  const scriptPath = path.join(__dirname, script);
  try {
    execSync(process.execPath, [scriptPath], { cwd: ROOT, stdio: 'inherit' });
  } catch (e) {
    if (e.status !== undefined) process.exit(e.status);
    throw e;
  }
}

console.log('Post–Phase 2.25A audit: sitemap, internal link audit, canonical audit.\n');

run('1. Sitemap generation', 'build-sitemap.js');
run('2. Internal link + canonical (verify-phase2)', 'verify-phase2.js');
run('3. Index integrity / canonical audit', 'index-integrity-audit.js');

console.log('\n--- 4. Authority score check (Phase 2.5 expansion) ---\n');
if (fs.existsSync(REPORT_PATH)) {
  try {
    const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
    const integrity = report.integritySummary || {};
    const authorityScore = integrity.authority_coverage_score || 0;
    console.log('Authority coverage score:', authorityScore);
    if (authorityScore >= 0.99) {
      console.log('✅ Authority score ≥ 0.99 — ready to expand.');
      console.log('   Names Like: node scripts/generate-names-like.js --batch=200');
      console.log('   Baby names with [surname] (Phase 2.6): node scripts/generate-lastname-pages.js --batch=50');
    } else {
      console.log('⚠️  Authority score < 0.99 — review integrity issues before expanding.');
      console.log('   Check build/index-integrity-report.json for details.');
    }
  } catch (e) {
    console.log('Could not read integrity report:', e.message);
  }
} else {
  console.log('Integrity report not found. Run index-integrity-audit.js first.');
}

console.log('\n--- 5. Search Console inspection (manual) ---\n');
console.log('Spot-check these 5 name URLs in Google Search Console (URL Inspection):');
console.log('  Confirm indexable and canonical is /name/<slug>/\n');
FIVE_NAMES.forEach((slug) => {
  console.log('  ' + SITE_URL + '/name/' + slug + '/');
});
console.log('\nDone. Review build/index-integrity-report.json for canonical and link counts.\n');
