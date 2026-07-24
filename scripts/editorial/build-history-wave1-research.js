#!/usr/bin/env node
/**
 * Phase 5E — Build editorial history research file for Wave 1.
 * Writes data/sources/history-wave1-research.json only.
 * Does not modify history-overrides.json directly.
 */

const fs = require('fs');
const path = require('path');
const { HISTORY_TUPLES } = require('./history-wave1-curated-data.js');
const { ACCEPTED_SOURCE_TYPES, confidenceLevel, sourcesForCluster } = require('./history-wave1-sources.js');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const SOURCES_DIR = path.join(DATA_DIR, 'sources');
const NAMES_PATH = path.join(DATA_DIR, 'names.json');
const OUT_PATH = path.join(SOURCES_DIR, 'history-wave1-research.json');

function loadJson(absPath, fallback) {
  if (!fs.existsSync(absPath)) return fallback;
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

function makeEntry(name, history, confidence, sourceKey) {
  return {
    name,
    history,
    confidence,
    confidenceLevel: confidenceLevel(confidence),
    sources: sourcesForCluster(sourceKey, sourceKey),
    researchNotes: `Wave 1 explicit editorial assignment (${sourceKey}; documented historical usage).`,
  };
}

function main() {
  const names = loadJson(NAMES_PATH, []);
  const nameSet = new Set(names.map((n) => String(n.name || '').trim().toLowerCase()));

  const entries = [];
  const seen = new Set();

  for (const tuple of HISTORY_TUPLES) {
    const [name, history, confidence, sourceKey] = tuple;
    const key = String(name || '').trim().toLowerCase();
    if (!key || !nameSet.has(key) || seen.has(key)) continue;
    if (!history || typeof history !== 'string' || !history.trim()) continue;
    if (confidence == null) continue;

    entries.push(makeEntry(String(name).trim(), history.trim(), confidence, sourceKey || 'default'));
    seen.add(key);
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));

  const payload = {
    phase: '5E-1',
    title: 'History Expansion Wave 1',
    generatedAt: new Date().toISOString(),
    acceptedSourceTypes: ACCEPTED_SOURCE_TYPES,
    entries,
  };

  fs.mkdirSync(SOURCES_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2));

  console.log('Phase 5E Wave 1 history research file written.');
  console.log('  Entries:', entries.length);
  console.log('  Output:', OUT_PATH);
}

main();
