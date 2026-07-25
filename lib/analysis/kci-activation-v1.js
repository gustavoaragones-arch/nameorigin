/**
 * lib/analysis/kci-activation-v1.js — Phase 10A KCI activation helpers.
 *
 * Loads Citation Records and Popularity Records for deterministic KCI scoring.
 * Does not modify editorial data or record payloads.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');

const ACTIVATION_PATHS = {
  citationRecords: path.join(DATA_DIR, 'citation-records.json'),
  popularityRecords: path.join(DATA_DIR, 'popularity-records.json'),
};

function loadJson(absPath, fallback = null) {
  if (!fs.existsSync(absPath)) return fallback;
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

function normalizeKey(name) {
  return String(name || '').trim().toLowerCase();
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function loadCitationRecordsPayload() {
  return loadJson(ACTIVATION_PATHS.citationRecords, null);
}

function loadPopularityRecordsPayload() {
  return loadJson(ACTIVATION_PATHS.popularityRecords, null);
}

function buildCitationRecordIndex(payload) {
  const index = new Map();
  for (const record of payload?.records || []) {
    index.set(normalizeKey(record.name), record);
  }
  return index;
}

function buildPopularityRecordIndex(payload) {
  const index = new Map();
  for (const record of payload?.records || []) {
    index.set(normalizeKey(record.name), record);
  }
  return index;
}

function hasValidCitationRecord(name, index) {
  const record = index.get(normalizeKey(name));
  if (!record) return false;
  const citations = record.citations || {};
  return Object.values(citations).some((ids) => Array.isArray(ids) && ids.length > 0);
}

function hasValidPopularityRecord(name, index) {
  const record = index.get(normalizeKey(name));
  if (!record) return false;
  const sources = record.popularity?.sources || [];
  return sources.length > 0;
}

function createKciActivationContext(options = {}) {
  const citationPayload = options.citationRecords ?? loadCitationRecordsPayload();
  const popularityPayload = options.popularityRecords ?? loadPopularityRecordsPayload();

  if (!citationPayload) {
    throw new Error('Missing data/citation-records.json — required for KCI activation.');
  }
  if (!popularityPayload) {
    throw new Error('Missing data/popularity-records.json — required for KCI activation.');
  }

  return {
    enabled: true,
    phase: '10A',
    baselineReference: 'kci-activation-v1',
    citationRecords: citationPayload,
    popularityRecords: popularityPayload,
    citationByName: buildCitationRecordIndex(citationPayload),
    popularityByName: buildPopularityRecordIndex(popularityPayload),
  };
}

function hashKciReportSemantic(report) {
  return stableHash({
    entityCount: report.entityCount,
    maxScore: report.maxScore,
    weights: report.weights,
    summary: report.summary,
    distribution: report.distribution,
    domainCoverage: report.domainCoverage,
    entities: report.entities,
    activation: report.activation,
  });
}

module.exports = {
  ACTIVATION_PATHS,
  normalizeKey,
  stableHash,
  loadCitationRecordsPayload,
  loadPopularityRecordsPayload,
  buildCitationRecordIndex,
  buildPopularityRecordIndex,
  hasValidCitationRecord,
  hasValidPopularityRecord,
  createKciActivationContext,
  hashKciReportSemantic,
};
