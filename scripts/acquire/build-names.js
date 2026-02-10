#!/usr/bin/env node
/**
 * Phase 1 — Build data/names.json from raw SSA and StatCan data.
 * Unique names by (name, gender); unisex if name appears as both boy and girl.
 * Derives: first_letter, syllables. Leaves origin_country, language, meaning for enrichment.
 */

const fs = require('fs');
const path = require('path');
const { RAW_DIR, DATA_DIR, SOURCES } = require('./config.js');

const SSA_RAW = path.join(RAW_DIR, SOURCES.SSA_USA.rawFile);
const STATCAN_RAW = path.join(RAW_DIR, SOURCES.STATCAN_CANADA.rawFile);
const OUT_PATH = path.join(DATA_DIR, 'names.json');

function loadRaw(path) {
  if (!fs.existsSync(path)) return [];
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function firstLetter(name) {
  const m = (name || '').trim().match(/[A-Za-z]/);
  return m ? m[0].toUpperCase() : '';
}

function syllableHint(name) {
  const s = (name || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!s) return 1;
  const vowels = s.match(/[aeiouy]+/g);
  return vowels ? Math.max(1, vowels.length) : 1;
}

function run() {
  const ssa = loadRaw(SSA_RAW);
  const statcan = loadRaw(STATCAN_RAW);

  const byKey = new Map();
  const add = (name, gender) => {
    const key = `${name.trim().toLowerCase()}\t${gender}`;
    if (!byKey.has(key)) byKey.set(key, { name: name.trim(), gender });
  };

  for (const r of ssa) add(r.name, r.gender);
  for (const r of statcan) {
    if (r.gender && r.gender !== 'unisex') add(r.name, r.gender);
    else add(r.name, 'boy'), add(r.name, 'girl');
  }

  const byName = new Map();
  for (const { name, gender } of byKey.values()) {
    const k = name.toLowerCase();
    if (!byName.has(k)) byName.set(k, { name, genders: new Set() });
    byName.get(k).genders.add(gender);
  }

  const names = [];
  let id = 1;
  for (const { name, genders } of byName.values()) {
    const gender = genders.has('boy') && genders.has('girl') ? 'unisex' : genders.has('girl') ? 'girl' : 'boy';
    names.push({
      id,
      name,
      gender,
      origin_country: null,
      language: null,
      meaning: null,
      phonetic: null,
      syllables: syllableHint(name),
      first_letter: firstLetter(name),
      is_traditional: 1,
      is_modern: 0,
    });
    id++;
  }

  if (names.length === 0) {
    console.error('No raw data found. Run fetch-ssa.js and/or fetch-statcan.js first (or place data/raw/ssa-usa.json and data/raw/statcan-canada.json).');
    process.exit(1);
  }

  names.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  names.forEach((n, i) => { n.id = i + 1; });

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(names, null, 2), 'utf8');
  console.log('Wrote', names.length, 'names to', OUT_PATH);
}

run();
