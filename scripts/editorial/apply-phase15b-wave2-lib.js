/**
 * Phase 15B Wave 2 — shared apply helpers for Knowledge Record creation.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { ALL_CREATION_OVERRIDE_DOMAINS } = require('./phase15b-wave2-lib.js');

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

function hasAnyOverride(overrides, key) {
  return ALL_CREATION_OVERRIDE_DOMAINS.some((domain) => {
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
  });
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

function applyCreationDomain(record, domain, overrides, researchFiles, key) {
  const field = record[domain];
  if (!field) return false;

  if (domain === 'origin') {
    overrides.origin[key] = {
      origin_country: field.value.origin_country,
      origin_cluster: field.value.origin_cluster,
      language: field.value.language,
      confidence: field.confidence,
    };
    appendResearchEntry(researchFiles.origin, {
      name: record.name,
      origin_country: field.value.origin_country,
      origin_cluster: field.value.origin_cluster,
      language: field.value.language,
      confidence: field.confidence,
      confidenceLevel: field.confidenceLevel,
      sources: field.sources,
      researchNotes: field.notes,
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

function applyCreationRecords(records, options = {}) {
  const phaseLabel = options.phaseLabel || 'Phase 15B Wave 2';
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

  let created = 0;
  let skipped = 0;
  let domainsAdded = 0;

  for (const record of records) {
    const key = normalizeKey(record.name);
    if (!nameByKey.has(key)) continue;

    if (hasAnyOverride(overrides, key)) {
      skipped += 1;
      continue;
    }

    ALL_CREATION_OVERRIDE_DOMAINS.forEach((domain) => {
      if (applyCreationDomain(record, domain, overrides, researchFiles, key)) {
        domainsAdded += 1;
      }
    });

    created += 1;
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

  return { created, skipped, domainsAdded, phaseLabel };
}

module.exports = {
  ALL_CREATION_OVERRIDE_DOMAINS,
  OVERRIDE_PATHS,
  RESEARCH_PATHS,
  applyCreationRecords,
  hasAnyOverride,
  loadJson,
  normalizeKey,
  runNodeScript,
};
