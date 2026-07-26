#!/usr/bin/env node
/**
 * Phase 13A — Validate citation coverage intelligence outputs.
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
} = require('../../lib/analysis/citation-coverage-intelligence.js');
const { CITATION_PATHS } = require('../editorial/citation-infrastructure-v1.js');
const { CITATION_RECORD_PATHS } = require('../editorial/citation-records-v1.js');
const { PATHS } = require('../editorial/knowledge-record-v2.js');

const COVERAGE_PATH = path.join(AUDIT_DIR, 'citation-coverage.json');
const GAP_PATH = path.join(AUDIT_DIR, 'citation-gap-analysis.json');

function hashFile(absPath) {
  return crypto.createHash('sha256').update(fs.readFileSync(absPath, 'utf8')).digest('hex');
}

function main() {
  const errors = [];
  const beforeHashes = hashFrozenArtifacts();
  const dataHashesBefore = {
    knowledgeRecords: hashFile(PATHS.knowledgeRecords),
    citationRegistry: hashFile(CITATION_PATHS.registry),
    citationRecords: hashFile(CITATION_RECORD_PATHS.records),
  };

  if (!fs.existsSync(COVERAGE_PATH)) errors.push('Missing audit/citation-coverage.json');
  if (!fs.existsSync(GAP_PATH)) errors.push('Missing audit/citation-gap-analysis.json');

  const ctx = buildEntityIndex();
  const coverageA = buildCoverageReport(ctx);
  const coverageB = buildCoverageReport(ctx);
  if (JSON.stringify(coverageA) !== JSON.stringify(coverageB)) {
    errors.push('Citation coverage report is not deterministically reproducible.');
  }

  const gapA = buildGapAnalysisReport(ctx, coverageA);
  const gapB = buildGapAnalysisReport(ctx, coverageA);
  if (JSON.stringify(gapA) !== JSON.stringify(gapB)) {
    errors.push('Citation gap analysis is not deterministically reproducible.');
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

  for (const key of Object.keys(dataHashesBefore)) {
    const absPath =
      key === 'knowledgeRecords'
        ? PATHS.knowledgeRecords
        : key === 'citationRegistry'
          ? CITATION_PATHS.registry
          : CITATION_RECORD_PATHS.records;
    if (hashFile(absPath) !== dataHashesBefore[key]) {
      errors.push(`Data file bytes changed during validation: ${key}`);
    }
  }

  const trustPages = [
    'about/methodology/index.html',
    'about/editorial-policy/index.html',
    'about/architecture/index.html',
    'about/quality-assurance/index.html',
  ];
  for (const rel of trustPages) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    // Trust pages should remain untouched by citation intelligence scripts.
  }

  console.log('Citation coverage validation:', errors.length === 0 ? 'PASS' : 'FAIL');
  if (errors.length) {
    errors.slice(0, 20).forEach((msg) => console.error('  -', msg));
    process.exitCode = 1;
    throw new Error('Citation coverage validation failed.');
  }
}

main();
