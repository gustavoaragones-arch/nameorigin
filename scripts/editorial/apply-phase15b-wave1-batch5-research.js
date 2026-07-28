#!/usr/bin/env node
/**
 * Phase 15B Wave 1 Batch 5 — complete missing editorial domains for partial Knowledge Records.
 * Preserves existing origin and populated domain overrides.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { ALL_EDITORIAL_OVERRIDE_DOMAINS } = require('./phase15b-wave1-lib.js');
const { PHASE15B_WAVE1_BATCH5_RECORDS } = require('./phase15b-wave1-batch5-curated-data.js');

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

function hasOverride(overrides, domain, key) {
  const entry = overrides[domain][key];
  if (!entry) return false;
  if (domain === 'origin') {
    return Boolean(entry.origin_cluster || entry.language || entry.origin_country);
  }
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

function applyDomain(record, domain, overrides, researchFiles, key) {
  const field = record[domain];
  if (!field) return false;

  if (domain === 'origin') {
    const o = field;
    overrides.origin[key] = {
      origin_country: o.value.origin_country,
      origin_cluster: o.value.origin_cluster,
      language: o.value.language,
      confidence: o.confidence,
    };
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
    return true;
  }

  if (domain === 'meaning') {
    overrides.meaning[key] = { meaning: field.value, confidence: field.confidence };
    appendResearchEntry(researchFiles.meaning, {
      name: record.name,
      meaning: field.value,
      confidence: field.confidence,
      confidenceLevel: field.confidenceLevel,
      sources: field.sources,
      researchNotes: field.notes,
    });
    return true;
  }

  if (domain === 'pronunciation') {
    overrides.pronunciation[key] = { phonetic: field.value, confidence: field.confidence };
    appendResearchEntry(researchFiles.pronunciation, {
      name: record.name,
      pronunciation: field.value,
      confidence: field.confidence,
      confidenceLevel: field.confidenceLevel,
      sources: field.sources,
      researchNotes: field.notes,
    });
    return true;
  }

  if (domain === 'etymology') {
    overrides.etymology[key] = { etymology: field.value, confidence: field.confidence };
    appendResearchEntry(researchFiles.etymology, {
      name: record.name,
      etymology: field.value,
      confidence: field.confidence,
      confidenceLevel: field.confidenceLevel,
      sources: field.sources,
      researchNotes: field.notes,
    });
    return true;
  }

  if (domain === 'history') {
    overrides.history[key] = { history: field.value, confidence: field.confidence };
    appendResearchEntry(researchFiles.history, {
      name: record.name,
      history: field.value,
      confidence: field.confidence,
      confidenceLevel: field.confidenceLevel,
      sources: field.sources,
      researchNotes: field.notes,
    });
    return true;
  }

  return false;
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

  let completed = 0;
  let skipped = 0;
  let domainsAdded = 0;

  for (const record of PHASE15B_WAVE1_BATCH5_RECORDS) {
    const key = normalizeKey(record.name);
    if (!nameByKey.has(key)) continue;

    const missingDomains = ALL_EDITORIAL_OVERRIDE_DOMAINS.filter(
      (domain) => !hasOverride(overrides, domain, key),
    );
    if (!missingDomains.length) {
      skipped += 1;
      continue;
    }

    missingDomains.forEach((domain) => {
      if (applyDomain(record, domain, overrides, researchFiles, key)) {
        domainsAdded += 1;
      }
    });

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

  console.log('Phase 15B Wave 1 Batch 5 applied.');
  console.log('  Records completed:', completed);
  console.log('  Domains added:', domainsAdded);
  console.log('  Skipped (already complete):', skipped);
}

main();
