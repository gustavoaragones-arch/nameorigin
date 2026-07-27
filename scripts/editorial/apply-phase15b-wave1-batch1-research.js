#!/usr/bin/env node
/**
 * Phase 15B Wave 1 Batch 1 — complete missing editorial domains for partial Knowledge Records.
 * Preserves existing origin overrides. Does not overwrite populated domains.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { COMPLETION_DOMAINS } = require('./phase15b-wave1-lib.js');
const { PHASE15B_WAVE1_BATCH1_RECORDS } = require('./phase15b-wave1-batch1-curated-data.js');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const SOURCES_DIR = path.join(DATA_DIR, 'sources');
const NAMES_PATH = path.join(DATA_DIR, 'names.json');

const OVERRIDE_PATHS = {
  meaning: path.join(DATA_DIR, 'meaning-overrides.json'),
  pronunciation: path.join(DATA_DIR, 'pronunciation-overrides.json'),
  etymology: path.join(DATA_DIR, 'etymology-overrides.json'),
  history: path.join(DATA_DIR, 'history-overrides.json'),
};

const RESEARCH_PATHS = {
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

function hasOverride(overrides, domain, key) {
  const entry = overrides[domain][key];
  if (!entry) return false;
  if (domain === 'meaning') return Boolean(String(entry.meaning || '').trim());
  if (domain === 'pronunciation') return Boolean(String(entry.phonetic || entry.pronunciation || '').trim());
  if (domain === 'etymology') return Boolean(String(entry.etymology || '').trim());
  if (domain === 'history') return Boolean(String(entry.history || '').trim());
  return false;
}

function appendResearchEntry(researchPayload, entry) {
  const key = normalizeKey(entry.name);
  const existing = researchPayload.entries.find((row) => normalizeKey(row.name) === key);
  if (existing) return false;
  researchPayload.entries.push(entry);
  return true;
}

function runNodeScript(relPath) {
  const result = spawnSync('node', [path.join(ROOT, relPath)], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    throw new Error(`${relPath} failed`);
  }
}

function main() {
  const names = loadJson(NAMES_PATH, []);
  const nameByKey = new Map(names.map((n) => [normalizeKey(n.name), n.name]));

  const overrides = {
    meaning: loadJson(OVERRIDE_PATHS.meaning, {}),
    pronunciation: loadJson(OVERRIDE_PATHS.pronunciation, {}),
    etymology: loadJson(OVERRIDE_PATHS.etymology, {}),
    history: loadJson(OVERRIDE_PATHS.history, {}),
  };

  const researchFiles = {
    meaning: loadJson(RESEARCH_PATHS.meaning, { entries: [] }),
    pronunciation: loadJson(RESEARCH_PATHS.pronunciation, { entries: [] }),
    etymology: loadJson(RESEARCH_PATHS.etymology, { entries: [] }),
    history: loadJson(RESEARCH_PATHS.history, { entries: [] }),
  };

  let completed = 0;
  let skipped = 0;
  let domainsAdded = 0;

  for (const record of PHASE15B_WAVE1_BATCH1_RECORDS) {
    const key = normalizeKey(record.name);
    if (!nameByKey.has(key)) continue;

    const missingDomains = COMPLETION_DOMAINS.filter((domain) => !hasOverride(overrides, domain, key));
    if (!missingDomains.length) {
      skipped += 1;
      continue;
    }

    if (missingDomains.includes('meaning')) {
      overrides.meaning[key] = {
        meaning: record.meaning.value,
        confidence: record.meaning.confidence,
      };
      appendResearchEntry(researchFiles.meaning, {
        name: record.name,
        meaning: record.meaning.value,
        confidence: record.meaning.confidence,
        confidenceLevel: record.meaning.confidenceLevel,
        sources: record.meaning.sources,
        researchNotes: record.meaning.notes,
      });
      domainsAdded += 1;
    }

    if (missingDomains.includes('pronunciation')) {
      overrides.pronunciation[key] = {
        phonetic: record.pronunciation.value,
        confidence: record.pronunciation.confidence,
      };
      appendResearchEntry(researchFiles.pronunciation, {
        name: record.name,
        pronunciation: record.pronunciation.value,
        confidence: record.pronunciation.confidence,
        confidenceLevel: record.pronunciation.confidenceLevel,
        sources: record.pronunciation.sources,
        researchNotes: record.pronunciation.notes,
      });
      domainsAdded += 1;
    }

    if (missingDomains.includes('etymology')) {
      overrides.etymology[key] = {
        etymology: record.etymology.value,
        confidence: record.etymology.confidence,
      };
      appendResearchEntry(researchFiles.etymology, {
        name: record.name,
        etymology: record.etymology.value,
        confidence: record.etymology.confidence,
        confidenceLevel: record.etymology.confidenceLevel,
        sources: record.etymology.sources,
        researchNotes: record.etymology.notes,
      });
      domainsAdded += 1;
    }

    if (missingDomains.includes('history')) {
      overrides.history[key] = {
        history: record.history.value,
        confidence: record.history.confidence,
      };
      appendResearchEntry(researchFiles.history, {
        name: record.name,
        history: record.history.value,
        confidence: record.history.confidence,
        confidenceLevel: record.history.confidenceLevel,
        sources: record.history.sources,
        researchNotes: record.history.notes,
      });
      domainsAdded += 1;
    }

    completed += 1;
  }

  Object.entries(OVERRIDE_PATHS).forEach(([domain, absPath]) => {
    fs.writeFileSync(absPath, JSON.stringify(overrides[domain], null, 2));
  });

  Object.entries(RESEARCH_PATHS).forEach(([domain, absPath]) => {
    researchFiles[domain].entries.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    fs.writeFileSync(absPath, JSON.stringify(researchFiles[domain], null, 2));
  });

  runNodeScript('scripts/editorial/build-knowledge-records.js');
  runNodeScript('scripts/editorial/rebuild-names-enriched.js');
  runNodeScript('scripts/editorial/resolve-citations.js');
  runNodeScript('scripts/editorial/build-citation-records.js');

  console.log('Phase 15B Wave 1 Batch 1 applied.');
  console.log('  Records completed:', completed);
  console.log('  Domains added:', domainsAdded);
  console.log('  Skipped (already complete):', skipped);
}

main();
