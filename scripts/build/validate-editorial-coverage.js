#!/usr/bin/env node
/**
 * Phase 15A — Validate editorial coverage intelligence outputs.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  buildEntityIndex,
  buildCoverageReport,
  buildGapAnalysisReport,
  hashFrozenArtifacts,
  ROOT,
  AUDIT_DIR,
  PATHS,
} = require('../../lib/analysis/editorial-coverage-intelligence.js');
const { CITATION_RECORD_PATHS } = require('../editorial/citation-records-v1.js');
const { POPULARITY_PATHS, POPULARITY_RECORD_PATHS } = require('../editorial/popularity-records-v1.js');

const COVERAGE_PATH = path.join(AUDIT_DIR, 'editorial-coverage.json');
const GAP_PATH = path.join(AUDIT_DIR, 'editorial-gap-analysis.json');

function hashFile(absPath) {
  return crypto.createHash('sha256').update(fs.readFileSync(absPath, 'utf8')).digest('hex');
}

function main() {
  const errors = [];
  const beforeHashes = hashFrozenArtifacts();
  const dataHashesBefore = {
    knowledgeRecords: hashFile(PATHS.knowledgeRecords),
    citationRecords: hashFile(CITATION_RECORD_PATHS.records),
    popularityRegistry: hashFile(POPULARITY_PATHS.registry),
    popularityRecords: hashFile(POPULARITY_RECORD_PATHS.records),
  };

  if (!fs.existsSync(COVERAGE_PATH)) errors.push('Missing audit/editorial-coverage.json');
  if (!fs.existsSync(GAP_PATH)) errors.push('Missing audit/editorial-gap-analysis.json');

  const ctx = buildEntityIndex();
  const coverageA = buildCoverageReport(ctx);
  const coverageB = buildCoverageReport(ctx);
  if (JSON.stringify(coverageA) !== JSON.stringify(coverageB)) {
    errors.push('Editorial coverage report is not deterministically reproducible.');
  }

  const gapA = buildGapAnalysisReport(ctx, coverageA);
  const gapB = buildGapAnalysisReport(ctx, coverageA);
  if (JSON.stringify(gapA) !== JSON.stringify(gapB)) {
    errors.push('Editorial gap analysis is not deterministically reproducible.');
  }

  if (fs.existsSync(GAP_PATH)) {
    const gapReport = JSON.parse(fs.readFileSync(GAP_PATH, 'utf8'));
    const ranks = (gapReport.top100HighestPriority || []).map((row) => row.rank);
    const slugs = (gapReport.top100HighestPriority || []).map((row) => row.slug);
    if (new Set(ranks).size !== ranks.length) errors.push('Duplicate ranks in top 100 list.');
    if (new Set(slugs).size !== slugs.length) errors.push('Duplicate slugs in top 100 list.');
    if (ranks.length && ranks[0] !== 1) errors.push('Top 100 rankings do not start at rank 1.');
  }

  const afterHashes = hashFrozenArtifacts();
  for (const key of Object.keys(beforeHashes)) {
    if (beforeHashes[key] !== afterHashes[key]) {
      errors.push(`Frozen artifact semantic hash changed during validation: ${key}`);
    }
  }

  for (const [key, absPath] of [
    ['knowledgeRecords', PATHS.knowledgeRecords],
    ['citationRecords', CITATION_RECORD_PATHS.records],
    ['popularityRegistry', POPULARITY_PATHS.registry],
    ['popularityRecords', POPULARITY_RECORD_PATHS.records],
  ]) {
    if (hashFile(absPath) !== dataHashesBefore[key]) {
      errors.push(`Data file bytes changed during validation: ${key}`);
    }
  }

  console.log('Editorial coverage validation:', errors.length === 0 ? 'PASS' : 'FAIL');
  if (errors.length) {
    errors.slice(0, 20).forEach((msg) => console.error('  -', msg));
    process.exitCode = 1;
    throw new Error('Editorial coverage validation failed.');
  }
}

main();
