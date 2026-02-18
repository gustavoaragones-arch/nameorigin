#!/usr/bin/env node
/**
 * MODULE C — Popularity Differential Engine (DATA LAYER).
 * For each name-country pair: rank_2025, rank_2015, delta, volatility_score.
 * Dominance: for each (name, countryA, countryB), signal when rank_A <= 3 AND rank_B > 7 → strong.
 * Output: data/country-differentials.json for template rendering.
 *
 * Usage: node scripts/generate-country-differentials.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const OUT_PATH = path.join(DATA_DIR, 'country-differentials.json');

const YEAR_NOW = 2025;
const YEAR_PAST = 2015;
const COUNTRY_PAIRS = [
  { codeA: 'USA', codeB: 'UK' },
  { codeA: 'USA', codeB: 'CAN' },
  { codeA: 'UK', codeB: 'AUS' },
  { codeA: 'FRA', codeB: 'ESP' },
  { codeA: 'GER', codeB: 'USA' },
];

function loadJson(name) {
  const p = path.join(DATA_DIR, name + '.json');
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function getRank(popularity, nameId, countryCode, year) {
  const r = (popularity || []).find((p) => p.name_id === nameId && p.country === countryCode && p.year === year);
  return r && r.rank != null ? r.rank : null;
}

/** Volatility: std of rank over last 10 years. Output 0–100 scale. */
function volatilityScore(popularity, nameId, countryCode, yearLatest) {
  const ranks = [];
  for (let y = yearLatest - 9; y <= yearLatest; y++) {
    const r = getRank(popularity, nameId, countryCode, y);
    if (r != null) ranks.push(r);
  }
  if (ranks.length < 2) return null;
  const mean = ranks.reduce((a, b) => a + b, 0) / ranks.length;
  const variance = ranks.reduce((s, r) => s + (r - mean) ** 2, 0) / ranks.length;
  const std = Math.sqrt(variance);
  return Math.round(Math.min(100, std * 2));
}

/** Dominance: strong when rank_A <= 3 AND rank_B > 7. */
function dominanceSignal(rankA, rankB) {
  if (rankA == null || rankB == null) return null;
  if (rankA <= 3 && rankB > 7) return 'strong';
  if (rankA <= 5 && rankB > 5) return 'moderate';
  return 'none';
}

function run() {
  const names = loadJson('names');
  const popularity = loadJson('popularity');
  if (!names.length || !popularity.length) {
    console.warn('Need data/names.json and data/popularity.json.');
    return;
  }

  const years = [...new Set(popularity.map((p) => p.year).filter(Boolean))].sort((a, b) => b - a);
  const yearLatest = years[0] || YEAR_NOW;
  const yearPast = years.includes(YEAR_PAST) ? YEAR_PAST : years.filter((y) => y <= YEAR_PAST).sort((a, b) => b - a)[0] || yearLatest - 10;

  const nameById = new Map(names.map((n) => [n.id, n]));

  const byNameCountry = new Map();
  popularity.forEach((p) => {
    if (p.country == null || p.name_id == null) return;
    const key = `${p.name_id}\t${p.country}`;
    if (!byNameCountry.has(key)) byNameCountry.set(key, []);
    byNameCountry.get(key).push(p);
  });

  const entries = [];
  const seen = new Set();

  for (const [key, rows] of byNameCountry) {
    const [nameIdStr, country] = key.split('\t');
    const nameId = parseInt(nameIdStr, 10);
    const rank2025 = getRank(popularity, nameId, country, yearLatest);
    const rank2015 = getRank(popularity, nameId, country, yearPast);
    if (rank2025 == null && rank2015 == null) continue;

    const delta = rank2015 != null && rank2025 != null ? rank2015 - rank2025 : null;
    const vol = volatilityScore(popularity, nameId, country, yearLatest);
    const rec = nameById.get(nameId);
    entries.push({
      name_id: nameId,
      name: rec ? rec.name : null,
      country,
      rank_2025: rank2025,
      rank_2015: rank2015,
      delta,
      volatility_score: vol,
    });
    seen.add(key);
  }

  const dominance = [];
  COUNTRY_PAIRS.forEach(({ codeA, codeB }) => {
    const inA = new Set(popularity.filter((p) => p.country === codeA && p.year === yearLatest).map((p) => p.name_id));
    const inB = new Set(popularity.filter((p) => p.country === codeB && p.year === yearLatest).map((p) => p.name_id));
    const nameIdsInBoth = [...inA].filter((id) => inB.has(id));
    nameIdsInBoth.forEach((nameId) => {
      const rankA = getRank(popularity, nameId, codeA, yearLatest);
      const rankB = getRank(popularity, nameId, codeB, yearLatest);
      const signal = dominanceSignal(rankA, rankB);
      if (signal == null) return;
      const rec = nameById.get(nameId);
      dominance.push({
        name_id: nameId,
        name: rec ? rec.name : null,
        countryA: codeA,
        countryB: codeB,
        rank_A: rankA,
        rank_B: rankB,
        dominance_signal: signal,
      });
    });
  });

  const out = {
    meta: { generated: new Date().toISOString(), yearLatest, yearPast },
    entries,
    dominance,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), 'utf8');
  console.log('MODULE C: wrote', entries.length, 'name-country differentials,', dominance.length, 'dominance records to', OUT_PATH);
}

run();
