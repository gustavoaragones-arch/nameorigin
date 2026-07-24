#!/usr/bin/env node
/**
 * Phase 5C — Build editorial pronunciation research file for Wave 1.
 * Writes data/sources/pronunciation-wave1-research.json only.
 * Does not modify pronunciation-overrides.json directly.
 */

const fs = require('fs');
const path = require('path');
const { PRONUNCIATION_TUPLES } = require('./pronunciation-wave1-curated-data.js');
const { ACCEPTED_SOURCE_TYPES, confidenceLevel, sourcesForCluster } = require('./pronunciation-wave1-sources.js');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const SOURCES_DIR = path.join(DATA_DIR, 'sources');
const NAMES_PATH = path.join(DATA_DIR, 'names.json');
const OUT_PATH = path.join(SOURCES_DIR, 'pronunciation-wave1-research.json');

function loadJson(absPath, fallback) {
  if (!fs.existsSync(absPath)) return fallback;
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

function makeEntry(name, pronunciation, confidence, sourceKey) {
  return {
    name,
    pronunciation,
    confidence,
    confidenceLevel: confidenceLevel(confidence),
    sources: sourcesForCluster(sourceKey, sourceKey),
    researchNotes: `Wave 1 explicit editorial assignment (${sourceKey}; documented pronunciation respelling).`,
  };
}

function main() {
  const names = loadJson(NAMES_PATH, []);
  const nameSet = new Set(names.map((n) => String(n.name || '').trim().toLowerCase()));

  const entries = [];
  const seen = new Set();

  for (const tuple of PRONUNCIATION_TUPLES) {
    const [name, pronunciation, confidence, sourceKey] = tuple;
    const key = String(name || '').trim().toLowerCase();
    if (!key || !nameSet.has(key) || seen.has(key)) continue;
    if (!pronunciation || typeof pronunciation !== 'string' || !pronunciation.trim()) continue;
    if (confidence == null) continue;

    entries.push(makeEntry(String(name).trim(), pronunciation.trim(), confidence, sourceKey || 'default'));
    seen.add(key);
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));

  const payload = {
    phase: '5C-1',
    title: 'Pronunciation Expansion Wave 1',
    generatedAt: new Date().toISOString(),
    acceptedSourceTypes: ACCEPTED_SOURCE_TYPES,
    pronunciationFormat: 'hyphenated respelling (project canonical format; not IPA)',
    entries,
  };

  fs.mkdirSync(SOURCES_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2));

  console.log('Phase 5C Wave 1 pronunciation research file written.');
  console.log('  Entries:', entries.length);
  console.log('  Output:', OUT_PATH);
}

main();
