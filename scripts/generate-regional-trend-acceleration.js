#!/usr/bin/env node
/**
 * Phase 2.9 MODULE C — Regional Trend Acceleration Index.
 * trend_acceleration = (rank_2015 - rank_2025) / years (positive = rising).
 * Output: data/regional-trend-acceleration.json for build-time consumption.
 * Fastest rising names per country (per state when regional data exists).
 *
 * Data: official civil registry / government open data only.
 *
 * Usage: node scripts/generate-regional-trend-acceleration.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const OUT_PATH = path.join(DATA_DIR, 'regional-trend-acceleration.json');

const YEAR_LATEST = 2025;
const YEAR_PAST = 2015;
const YEARS_SPAN = Math.max(1, YEAR_LATEST - YEAR_PAST);

function loadJson(name) {
  const p = path.join(DATA_DIR, name + '.json');
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function getRank(popularity, nameId, countryCode, year) {
  const r = (popularity || []).find((p) => p.name_id === nameId && p.country === countryCode && p.year === year);
  return r && r.rank != null ? r.rank : null;
}

function run() {
  const names = loadJson('names');
  const popularity = loadJson('popularity');
  if (!names.length || !popularity.length) {
    console.warn('Need data/names.json and data/popularity.json.');
    return;
  }

  const nameById = new Map(names.map((n) => [n.id, n]));
  const years = [...new Set(popularity.map((p) => p.year).filter(Boolean))].sort((a, b) => b - a);
  const yearLatest = years[0] || YEAR_LATEST;
  const yearPast = years.includes(YEAR_PAST) ? YEAR_PAST : years.filter((y) => y <= YEAR_PAST).sort((a, b) => b - a)[0] || yearLatest - 10;
  const yearsSpan = Math.max(1, yearLatest - yearPast);

  const byCountry = { USA: [], CAN: [] };

  for (const code of ['USA', 'CAN']) {
    const seen = new Set();
    (popularity || []).filter((p) => p.country === code).forEach((p) => {
      if (seen.has(p.name_id)) return;
      const rPast = getRank(popularity, p.name_id, code, yearPast);
      const rLatest = getRank(popularity, p.name_id, code, yearLatest);
      if (rPast == null || rLatest == null) return;
      const trend_acceleration = (rPast - rLatest) / yearsSpan;
      const rec = nameById.get(p.name_id);
      seen.add(p.name_id);
      byCountry[code].push({
        name_id: p.name_id,
        name: rec ? rec.name : null,
        rank_2015: rPast,
        rank_2025: rLatest,
        trend_acceleration: Math.round(trend_acceleration * 100) / 100,
      });
    });
    byCountry[code].sort((a, b) => (b.trend_acceleration || 0) - (a.trend_acceleration || 0));
  }

  const output = {
    meta: {
      generated: new Date().toISOString(),
      yearLatest,
      yearPast,
      yearsSpan,
      description: 'Regional Trend Acceleration Index. trend_acceleration = (rank_2015 - rank_2025) / years. Positive = rising.',
      data_source: 'Official civil registry and government open data (e.g. U.S. SSA, Statistics Canada).',
    },
    by_country: byCountry,
    fastest_rising_per_country: {
      USA: (byCountry.USA || []).slice(0, 20),
      CAN: (byCountry.CAN || []).slice(0, 20),
    },
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  console.log('MODULE C: wrote regional-trend-acceleration.json (fastest rising per country). USA:', (byCountry.USA || []).length, 'CAN:', (byCountry.CAN || []).length);
}

run();
