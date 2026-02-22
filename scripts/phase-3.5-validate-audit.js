#!/usr/bin/env node
/**
 * Phase 3.5 STEP 7 — Validate index-integrity-audit report.
 * Run after: node scripts/clean-rebuild-3.3e.js (which runs index-integrity-audit.js).
 * Reads build/index-integrity-report.json and checks:
 *   broken_internal_links: 0
 *   orphan_pages: 0
 *   authority_coverage_score: 1
 *   max_hops_from_home: 3
 * Exits 0 only if all pass; otherwise prints failures and exits 1.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REPORT_PATH = path.join(ROOT, 'build', 'index-integrity-report.json');

const EXPECTED = {
  broken_internal_links: 0,
  orphan_pages: 0,
  authority_coverage_score: 1,
  max_hops_from_home: 3,
};

function run() {
  if (!fs.existsSync(REPORT_PATH)) {
    console.error('Phase 3.5 validation: Report not found. Run index-integrity-audit.js first.');
    console.error('  Expected:', REPORT_PATH);
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
  const integrity = report.integritySummary || {};
  const failures = [];

  if (integrity.broken_internal_links !== EXPECTED.broken_internal_links) {
    failures.push(`broken_internal_links: expected ${EXPECTED.broken_internal_links}, got ${integrity.broken_internal_links}`);
  }
  if (integrity.orphan_pages !== EXPECTED.orphan_pages) {
    failures.push(`orphan_pages: expected ${EXPECTED.orphan_pages}, got ${integrity.orphan_pages}`);
  }
  if (integrity.authority_coverage_score !== EXPECTED.authority_coverage_score) {
    failures.push(`authority_coverage_score: expected ${EXPECTED.authority_coverage_score}, got ${integrity.authority_coverage_score}`);
  }
  if (integrity.max_hops_from_home !== EXPECTED.max_hops_from_home) {
    failures.push(`max_hops_from_home: expected ${EXPECTED.max_hops_from_home}, got ${integrity.max_hops_from_home}`);
  }

  if (failures.length === 0) {
    console.log('Phase 3.5 STEP 7 validation passed.');
    console.log('  broken_internal_links:', integrity.broken_internal_links);
    console.log('  orphan_pages:', integrity.orphan_pages);
    console.log('  authority_coverage_score:', integrity.authority_coverage_score);
    console.log('  max_hops_from_home:', integrity.max_hops_from_home);
    process.exit(0);
  }

  console.error('Phase 3.5 STEP 7 validation failed:');
  failures.forEach((f) => console.error('  -', f));
  process.exit(1);
}

run();
