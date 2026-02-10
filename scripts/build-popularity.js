#!/usr/bin/env node
/**
 * Step 6 — Popularity engine.
 * Combines all country datasets (raw-data/ssa, uk, canada, australia) into data/popularity.json.
 * Schema: name_id, country, year, rank, count, trend_direction.
 * Trend: compare last 3 years → rising / stable / falling.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const RAW_BASE = path.join(ROOT, 'raw-data');
const NAMES_PATH = path.join(DATA_DIR, 'names.json');
const OUT_PATH = path.join(DATA_DIR, 'popularity.json');

const SOURCES = [
  { dir: 'ssa', country: 'USA' },
  { dir: 'uk', country: 'UK' },
  { dir: 'canada', country: 'CAN' },
  { dir: 'australia', country: 'AUS' },
];

const TREND_YEARS = 3;

function loadJson(p, fallback = []) {
  if (!fs.existsSync(p)) return fallback;
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    return Array.isArray(data) ? data : fallback;
  } catch (e) {
    return fallback;
  }
}

function buildNameIdMap(names) {
  const byKey = new Map();
  for (const n of names) {
    const k = `${(n.name || '').toLowerCase().trim()}\t${n.gender || 'unisex'}`;
    byKey.set(k, n.id);
    if (n.gender === 'unisex') {
      byKey.set(`${(n.name || '').toLowerCase().trim()}\tboy`, n.id);
      byKey.set(`${(n.name || '').toLowerCase().trim()}\tgirl`, n.id);
    }
  }
  return byKey;
}

function resolveNameId(nameIdMap, name, gender) {
  const g = gender === 'unisex' ? 'boy' : gender;
  let id = nameIdMap.get(`${(name || '').toLowerCase().trim()}\t${g}`);
  if (id != null) return id;
  id = nameIdMap.get(`${(name || '').toLowerCase().trim()}\tgirl`);
  return id != null ? id : null;
}

function run() {
  const names = loadJson(NAMES_PATH);
  if (names.length === 0) {
    console.warn('No names at', NAMES_PATH);
    return;
  }
  const nameIdMap = buildNameIdMap(names);

  const rows = [];

  for (const { dir, country } of SOURCES) {
    const p = path.join(RAW_BASE, dir, 'normalized.json');
    const raw = loadJson(p);
    if (raw.length === 0) continue;

    const byYear = new Map();
    for (const r of raw) {
      const nameId = resolveNameId(nameIdMap, r.name, r.gender);
      if (nameId == null) continue;
      const year = r.year != null ? r.year : null;
      if (year == null) continue;
      if (!byYear.has(year)) byYear.set(year, []);
      byYear.get(year).push({
        name_id: nameId,
        country,
        year,
        rank: r.rank != null ? r.rank : null,
        count: r.count != null ? r.count : null,
      });
    }

    for (const [year, list] of byYear) {
      const hasRank = list.some((x) => x.rank != null);
      if (!hasRank && list.some((x) => x.count != null)) {
        list.sort((a, b) => (b.count || 0) - (a.count || 0));
        list.forEach((x, i) => { x.rank = i + 1; });
      }
      list.forEach((x) => rows.push({ ...x }));
    }
  }

  rows.sort((a, b) => a.name_id - b.name_id || (a.country || '').localeCompare(b.country || '') || a.year - b.year);

  const key = (nameId, country) => `${nameId}\t${country}`;
  const byNameCountry = new Map();
  for (const r of rows) {
    const k = key(r.name_id, r.country);
    if (!byNameCountry.has(k)) byNameCountry.set(k, []);
    byNameCountry.get(k).push(r);
  }

  function trendDirection(series) {
    const sorted = [...series].sort((a, b) => b.year - a.year);
    const last = sorted.slice(0, TREND_YEARS);
    if (last.length < 2) return 'stable';
    const newest = last[0];
    const oldest = last[last.length - 1];
    const rankNew = newest.rank != null ? newest.rank : Infinity;
    const rankOld = oldest.rank != null ? oldest.rank : Infinity;
    if (rankNew !== Infinity && rankOld !== Infinity) {
      if (rankNew < rankOld) return 'rising';
      if (rankNew > rankOld) return 'falling';
      return 'stable';
    }
    const countNew = newest.count != null ? newest.count : 0;
    const countOld = oldest.count != null ? oldest.count : 0;
    if (countNew > countOld) return 'rising';
    if (countNew < countOld) return 'falling';
    return 'stable';
  }

  const trendByKey = new Map();
  for (const [k, series] of byNameCountry) {
    trendByKey.set(k, trendDirection(series));
  }

  const output = rows.map((r) => ({
    name_id: r.name_id,
    country: r.country,
    year: r.year,
    rank: r.rank != null ? r.rank : null,
    count: r.count != null ? r.count : null,
    trend_direction: trendByKey.get(key(r.name_id, r.country)) || 'stable',
  }));

  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  console.log('Wrote', output.length, 'popularity rows to', OUT_PATH);
}

run();
