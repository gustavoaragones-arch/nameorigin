#!/usr/bin/env node
/**
 * Phase 5A — Apply Wave 1 origin research to data/origin-overrides.json
 * and regenerate data/names-enriched.json via existing merge script.
 *
 * Preserves all Knowledge Baseline 1.0 origin entries unchanged.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const RESEARCH_PATH = path.join(DATA_DIR, 'sources', 'origin-wave1-research.json');
const OVERRIDES_PATH = path.join(DATA_DIR, 'origin-overrides.json');
const NAMES_PATH = path.join(DATA_DIR, 'names.json');

function loadJson(absPath, fallback) {
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

function main() {
  const research = loadJson(RESEARCH_PATH, null);
  if (!research || !Array.isArray(research.entries)) {
    throw new Error('Missing or invalid origin-wave1-research.json');
  }

  const names = loadJson(NAMES_PATH, []);
  const nameByKey = new Map(names.map((n) => [String(n.name).trim().toLowerCase(), n.name]));
  const overrides = loadJson(OVERRIDES_PATH, {});
  const baselineKeys = new Set(Object.keys(overrides));

  let added = 0;
  let skippedExisting = 0;
  let skippedMissing = 0;

  for (const entry of research.entries) {
    const key = String(entry.name || '').trim().toLowerCase();
    if (!key) continue;
    if (!nameByKey.has(key)) {
      skippedMissing += 1;
      continue;
    }
    if (baselineKeys.has(key)) {
      skippedExisting += 1;
      continue;
    }
    if (!Array.isArray(entry.sources) || entry.sources.length === 0) {
      throw new Error(`Entry ${entry.name} missing supporting sources.`);
    }
    if (entry.confidence == null) {
      throw new Error(`Entry ${entry.name} missing confidence.`);
    }
    if (!entry.origin_cluster && !entry.origin_country && !entry.language) {
      throw new Error(`Entry ${entry.name} has no origin fields populated.`);
    }

    overrides[key] = {
      origin_country: entry.origin_country ?? null,
      origin_cluster: entry.origin_cluster ?? null,
      language: entry.language ?? null,
      confidence: entry.confidence,
    };
    added += 1;
  }

  fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(overrides, null, 2));

  const merge = spawnSync('node', [path.join(ROOT, 'scripts', 'apply-origin-enrichment.js')], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (merge.status !== 0) {
    console.error(merge.stderr || merge.stdout);
    throw new Error('apply-origin-enrichment.js failed');
  }

  console.log('Phase 5A Wave 1 origin research applied.');
  console.log('  Baseline origins preserved:', baselineKeys.size);
  console.log('  New origins added:', added);
  console.log('  Skipped (already researched):', skippedExisting);
  console.log('  Skipped (not in names.json):', skippedMissing);
  console.log('  Total overrides now:', Object.keys(overrides).length);
}

main();
