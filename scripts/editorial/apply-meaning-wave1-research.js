#!/usr/bin/env node
/**
 * Phase 5B — Apply Wave 1 meaning research to data/meaning-overrides.json
 * and regenerate data/names-enriched.json via rebuild-names-enriched.js.
 *
 * Preserves all Knowledge Baseline 1.0 meaning entries unchanged (Emma, Noah, Olivia).
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const RESEARCH_PATH = path.join(DATA_DIR, 'sources', 'meaning-wave1-research.json');
const OVERRIDES_PATH = path.join(DATA_DIR, 'meaning-overrides.json');
const NAMES_PATH = path.join(DATA_DIR, 'names.json');

const BASELINE_MEANING_KEYS = new Set(['emma', 'noah', 'olivia']);

function loadJson(absPath, fallback) {
  if (!fs.existsSync(absPath)) return fallback;
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

function main() {
  const research = loadJson(RESEARCH_PATH, null);
  if (!research || !Array.isArray(research.entries)) {
    throw new Error('Missing or invalid meaning-wave1-research.json');
  }

  const names = loadJson(NAMES_PATH, []);
  const nameByKey = new Map(names.map((n) => [String(n.name).trim().toLowerCase(), n.name]));
  const overrides = loadJson(OVERRIDES_PATH, {}) || {};

  let added = 0;
  let skippedBaseline = 0;
  let skippedExisting = 0;
  let skippedMissing = 0;

  for (const entry of research.entries) {
    const key = String(entry.name || '').trim().toLowerCase();
    if (!key) continue;
    if (BASELINE_MEANING_KEYS.has(key)) {
      skippedBaseline += 1;
      continue;
    }
    if (!nameByKey.has(key)) {
      skippedMissing += 1;
      continue;
    }
    if (overrides[key]) {
      skippedExisting += 1;
      continue;
    }
    if (!Array.isArray(entry.sources) || entry.sources.length === 0) {
      throw new Error(`Entry ${entry.name} missing supporting sources.`);
    }
    if (entry.confidence == null) {
      throw new Error(`Entry ${entry.name} missing confidence.`);
    }
    if (!entry.meaning || !String(entry.meaning).trim()) {
      throw new Error(`Entry ${entry.name} has no meaning populated.`);
    }

    overrides[key] = {
      meaning: String(entry.meaning).trim(),
      confidence: entry.confidence,
    };
    added += 1;
  }

  fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(overrides, null, 2));

  const rebuild = spawnSync('node', [path.join(__dirname, 'rebuild-names-enriched.js')], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (rebuild.status !== 0) {
    console.error(rebuild.stderr || rebuild.stdout);
    throw new Error('rebuild-names-enriched.js failed');
  }

  console.log('Phase 5B Wave 1 meaning research applied.');
  console.log('  Baseline meanings preserved:', BASELINE_MEANING_KEYS.size);
  console.log('  New meanings added:', added);
  console.log('  Skipped (baseline):', skippedBaseline);
  console.log('  Skipped (already researched):', skippedExisting);
  console.log('  Skipped (not in names.json):', skippedMissing);
  console.log('  Total meaning overrides now:', Object.keys(overrides).length);
}

main();
