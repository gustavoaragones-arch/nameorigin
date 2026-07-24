#!/usr/bin/env node
/**
 * Phase 7B — Apply Wave 2 Batch 2 research to legacy overrides and domain research files,
 * then regenerate knowledge-records.json and names-enriched.json.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { WAVE2_BATCH2_RECORDS } = require('./wave2-batch2-curated-data.js');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const SOURCES_DIR = path.join(DATA_DIR, 'sources');
const NAMES_PATH = path.join(DATA_DIR, 'names.json');

const OVERRIDE_PATHS = {
  origin: path.join(DATA_DIR, 'origin-overrides.json'),
  meaning: path.join(DATA_DIR, 'meaning-overrides.json'),
  pronunciation: path.join(DATA_DIR, 'pronunciation-overrides.json'),
  etymology: path.join(DATA_DIR, 'etymology-overrides.json'),
  history: path.join(DATA_DIR, 'history-overrides.json'),
};

const RESEARCH_PATHS = {
  origin: path.join(SOURCES_DIR, 'origin-wave1-research.json'),
  meaning: path.join(SOURCES_DIR, 'meaning-wave1-research.json'),
  pronunciation: path.join(SOURCES_DIR, 'pronunciation-wave1-research.json'),
  etymology: path.join(SOURCES_DIR, 'etymology-wave1-research.json'),
  history: path.join(SOURCES_DIR, 'history-wave1-research.json'),
};

function loadJson(absPath, fallback) {
  if (!fs.existsSync(absPath)) return fallback;
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

function normalizeKey(name) {
  return String(name || '').trim().toLowerCase();
}

function appendResearchEntry(researchPayload, entry) {
  const key = normalizeKey(entry.name);
  const existing = researchPayload.entries.find((row) => normalizeKey(row.name) === key);
  if (existing) return false;
  researchPayload.entries.push(entry);
  return true;
}

function main() {
  const names = loadJson(NAMES_PATH, []);
  const nameByKey = new Map(names.map((n) => [normalizeKey(n.name), n.name]));

  const overrides = {
    origin: loadJson(OVERRIDE_PATHS.origin, {}),
    meaning: loadJson(OVERRIDE_PATHS.meaning, {}),
    pronunciation: loadJson(OVERRIDE_PATHS.pronunciation, {}),
    etymology: loadJson(OVERRIDE_PATHS.etymology, {}),
    history: loadJson(OVERRIDE_PATHS.history, {}),
  };

  const researchFiles = {
    origin: loadJson(RESEARCH_PATHS.origin, { entries: [] }),
    meaning: loadJson(RESEARCH_PATHS.meaning, { entries: [] }),
    pronunciation: loadJson(RESEARCH_PATHS.pronunciation, { entries: [] }),
    etymology: loadJson(RESEARCH_PATHS.etymology, { entries: [] }),
    history: loadJson(RESEARCH_PATHS.history, { entries: [] }),
  };

  let added = 0;
  let skipped = 0;

  for (const record of WAVE2_BATCH2_RECORDS) {
    const key = normalizeKey(record.name);
    if (!nameByKey.has(key)) continue;
    if (overrides.origin[key] || overrides.meaning[key]) {
      skipped += 1;
      continue;
    }

    const o = record.origin;
    overrides.origin[key] = {
      origin_country: o.value.origin_country,
      origin_cluster: o.value.origin_cluster,
      language: o.value.language,
      confidence: o.confidence,
    };
    overrides.meaning[key] = { meaning: record.meaning.value, confidence: record.meaning.confidence };
    overrides.pronunciation[key] = {
      phonetic: record.pronunciation.value,
      confidence: record.pronunciation.confidence,
    };
    overrides.etymology[key] = { etymology: record.etymology.value, confidence: record.etymology.confidence };
    overrides.history[key] = { history: record.history.value, confidence: record.history.confidence };

    appendResearchEntry(researchFiles.origin, {
      name: record.name,
      origin_country: o.value.origin_country,
      origin_cluster: o.value.origin_cluster,
      language: o.value.language,
      confidence: o.confidence,
      confidenceLevel: o.confidenceLevel,
      sources: o.sources,
      researchNotes: o.notes,
    });
    appendResearchEntry(researchFiles.meaning, {
      name: record.name,
      meaning: record.meaning.value,
      confidence: record.meaning.confidence,
      confidenceLevel: record.meaning.confidenceLevel,
      sources: record.meaning.sources,
      researchNotes: record.meaning.notes,
    });
    appendResearchEntry(researchFiles.pronunciation, {
      name: record.name,
      pronunciation: record.pronunciation.value,
      confidence: record.pronunciation.confidence,
      confidenceLevel: record.pronunciation.confidenceLevel,
      sources: record.pronunciation.sources,
      researchNotes: record.pronunciation.notes,
    });
    appendResearchEntry(researchFiles.etymology, {
      name: record.name,
      etymology: record.etymology.value,
      confidence: record.etymology.confidence,
      confidenceLevel: record.etymology.confidenceLevel,
      sources: record.etymology.sources,
      researchNotes: record.etymology.notes,
    });
    appendResearchEntry(researchFiles.history, {
      name: record.name,
      history: record.history.value,
      confidence: record.history.confidence,
      confidenceLevel: record.history.confidenceLevel,
      sources: record.history.sources,
      researchNotes: record.history.notes,
    });

    added += 1;
  }

  Object.entries(OVERRIDE_PATHS).forEach(([domain, absPath]) => {
    fs.writeFileSync(absPath, JSON.stringify(overrides[domain], null, 2));
  });

  Object.entries(RESEARCH_PATHS).forEach(([domain, absPath]) => {
    researchFiles[domain].entries.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    fs.writeFileSync(absPath, JSON.stringify(researchFiles[domain], null, 2));
  });

  const buildKr = spawnSync('node', [path.join(__dirname, 'build-knowledge-records.js')], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (buildKr.status !== 0) {
    console.error(buildKr.stderr || buildKr.stdout);
    throw new Error('build-knowledge-records.js failed');
  }

  const rebuild = spawnSync('node', [path.join(__dirname, 'rebuild-names-enriched.js')], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (rebuild.status !== 0) {
    console.error(rebuild.stderr || rebuild.stdout);
    throw new Error('rebuild-names-enriched.js failed');
  }

  console.log('Phase 7B Wave 2 Batch 2 applied.');
  console.log('  New full records added:', added);
  console.log('  Skipped (already present):', skipped);
}

main();
