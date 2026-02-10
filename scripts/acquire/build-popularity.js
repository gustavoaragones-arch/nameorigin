#!/usr/bin/env node
/**
 * Phase 1 — Build data/popularity.json from raw SSA + StatCan and data/names.json.
 * Resolves name+gender to name_id; computes rank per country/year when missing.
 */

const fs = require('fs');
const path = require('path');
const { RAW_DIR, DATA_DIR, SOURCES } = require('./config.js');

const NAMES_PATH = path.join(DATA_DIR, 'names.json');
const SSA_RAW = path.join(RAW_DIR, SOURCES.SSA_USA.rawFile);
const STATCAN_RAW = path.join(RAW_DIR, SOURCES.STATCAN_CANADA.rawFile);
const OUT_PATH = path.join(DATA_DIR, 'popularity.json');

function loadJson(p) {
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function buildNameIdMap(names) {
  const byKey = new Map();
  for (const n of names) {
    const k = `${n.name.toLowerCase()}\t${n.gender}`;
    byKey.set(k, n.id);
    if (n.gender === 'unisex') {
      byKey.set(`${n.name.toLowerCase()}\tboy`, n.id);
      byKey.set(`${n.name.toLowerCase()}\tgirl`, n.id);
    }
  }
  return byKey;
}

function computeRank(rows, getCount) {
  const byYear = new Map();
  for (const r of rows) {
    const y = r.year;
    if (!y) continue;
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(r);
  }
  const out = [];
  for (const [year, list] of byYear) {
    list.sort((a, b) => (getCount(b) || 0) - (getCount(a) || 0));
    list.forEach((r, i) => { r.rank = i + 1; out.push(r); });
  }
  return out;
}

function run() {
  const names = loadJson(NAMES_PATH);
  const nameIdMap = buildNameIdMap(names);

  const ssa = loadJson(SSA_RAW);
  const statcan = loadJson(STATCAN_RAW);

  const popularity = [];

  const usaByYear = new Map();
  for (const r of ssa) {
    const nameId = nameIdMap.get(`${r.name.toLowerCase()}\t${r.gender}`);
    if (!nameId) continue;
    const y = r.year;
    if (!usaByYear.has(y)) usaByYear.set(y, []);
    usaByYear.get(y).push({ name_id: nameId, country: 'USA', year: y, rank: null, count: r.count });
  }
  for (const [, list] of usaByYear) {
    list.sort((a, b) => (b.count || 0) - (a.count || 0));
    list.forEach((row, i) => { row.rank = i + 1; popularity.push(row); });
  }

  for (const r of statcan) {
    if (r.year == null) continue;
    const gender = r.gender === 'unisex' ? 'boy' : r.gender;
    let nameId = nameIdMap.get(`${r.name.toLowerCase()}\t${gender}`);
    if (!nameId) nameId = nameIdMap.get(`${r.name.toLowerCase()}\tgirl`);
    if (!nameId) continue;
    popularity.push({
      name_id: nameId,
      country: 'CAN',
      year: r.year,
      rank: r.rank || null,
      count: r.count,
    });
  }

  popularity.sort((a, b) => a.name_id - b.name_id || (a.country || '').localeCompare(b.country || '') || a.year - b.year);
  fs.writeFileSync(OUT_PATH, JSON.stringify(popularity, null, 2), 'utf8');
  console.log('Wrote', popularity.length, 'popularity rows to', OUT_PATH);
}

run();
