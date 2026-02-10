#!/usr/bin/env node
/**
 * Step 7 — Export to static data.
 * Produces the four JSON files consumed by programmatic SEO pages:
 *   data/names.json
 *   data/popularity.json
 *   data/variants.json
 *   data/categories.json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const NORMALIZED_PATH = path.join(DATA_DIR, 'normalized-names.json');

const FILES = ['names', 'popularity', 'variants', 'categories'];

function loadJson(name) {
  const p = path.join(DATA_DIR, name + '.json');
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.warn('Could not load', p, e.message);
    return null;
  }
}

function writeJson(name, data) {
  const p = path.join(DATA_DIR, name + '.json');
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  console.log('Wrote', p);
}

function run() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const names = loadJson('names');
  if (!names || !Array.isArray(names)) {
    console.error('data/names.json missing or invalid. Run normalize-names and earlier steps first.');
    process.exit(1);
  }

  const schemaNames = names.map((n) => ({
    id: n.id,
    name: n.name,
    gender: n.gender,
    origin_country: n.origin_country ?? null,
    language: n.language ?? null,
    meaning: n.meaning ?? null,
    phonetic: n.phonetic ?? null,
    syllables: n.syllables ?? null,
    first_letter: n.first_letter ?? null,
    is_traditional: n.is_traditional ?? 0,
    is_modern: n.is_modern ?? 0,
  }));
  writeJson('names', schemaNames);

  let popularity = loadJson('popularity');
  if (popularity && Array.isArray(popularity)) {
    writeJson('popularity', popularity);
  } else {
    writeJson('popularity', []);
    console.warn('data/popularity.json missing or invalid; wrote empty array.');
  }

  const variants = [];
  for (const n of schemaNames) {
    variants.push({ name_id: n.id, variant: n.name, language: 'English' });
  }
  let normalized = null;
  try {
    if (fs.existsSync(NORMALIZED_PATH)) {
      normalized = JSON.parse(fs.readFileSync(NORMALIZED_PATH, 'utf8'));
    }
  } catch (_) {}
  if (normalized && Array.isArray(normalized)) {
    const byId = new Map(schemaNames.map((n) => [n.id, n]));
    for (const r of normalized) {
      if (!r.id || !byId.has(r.id)) continue;
      const spelling_variants = r.spelling_variants;
      if (spelling_variants && Array.isArray(spelling_variants)) {
        for (const v of spelling_variants) {
          if (v && v !== r.name) {
            variants.push({ name_id: r.id, variant: v, language: 'English' });
          }
        }
      }
    }
  }
  writeJson('variants', variants);

  let categories = loadJson('categories');
  if (categories && Array.isArray(categories)) {
    writeJson('categories', categories);
  } else {
    writeJson('categories', []);
    console.warn('data/categories.json missing or invalid; wrote empty array.');
  }

  console.log('Export complete. Programmatic SEO pages consume: data/names.json, data/popularity.json, data/variants.json, data/categories.json');
}

run();
