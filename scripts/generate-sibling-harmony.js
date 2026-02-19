#!/usr/bin/env node
/**
 * Phase 3.0 — Sibling Harmony Compatibility Engine™
 *
 * Deterministic scoring: how well two names work as sibling names.
 * Based on: shared origin cluster, phonetic rhythm similarity, popularity parity,
 * length balance, style classification.
 *
 * Weights:
 *   origin_match_weight = 0.30
 *   phonetic_weight     = 0.25
 *   popularity_band_weight = 0.20
 *   length_balance_weight  = 0.15
 *   style_cluster_weight   = 0.10
 *
 * Score 0–100. Returns top 12 matches. Deterministic, reproducible.
 */

const ORIGIN_MATCH_WEIGHT = 0.30;
const PHONETIC_WEIGHT = 0.25;
const POPULARITY_BAND_WEIGHT = 0.20;
const LENGTH_BALANCE_WEIGHT = 0.15;
const STYLE_CLUSTER_WEIGHT = 0.10;

function syllableCount(word) {
  if (!word) return 1;
  const s = String(word).toLowerCase();
  const v = s.match(/[aeiouy]+/g);
  return v ? Math.max(1, v.length) : 1;
}

/** Normalize origin for comparison (lowercase, no spaces). */
function originKey(record) {
  const o = (record.origin_country || '').trim().toLowerCase().replace(/\s+/g, '');
  const l = (record.language || '').trim().toLowerCase().replace(/\s+/g, '');
  return o || l || '';
}

/** Get popularity band: top100, top500, top1000, other. */
function getPopularityBand(nameId, popularity) {
  const rows = (popularity || []).filter((p) => p.name_id === nameId && p.rank != null);
  if (rows.length === 0) return 'other';
  const bestRank = Math.min(...rows.map((r) => r.rank || 9999));
  if (bestRank < 100) return 'top100';
  if (bestRank < 500) return 'top500';
  if (bestRank < 1000) return 'top1000';
  return 'other';
}

/** Get primary style/category for a name. */
function getStyle(nameId, categories) {
  const catRows = (categories || []).filter((c) => c.name_id === nameId);
  if (catRows.length === 0) return '';
  return (catRows[0].category || '').toLowerCase();
}

/** Origin match score 0–100. Same origin = 100; partial = 50; else 0. */
function originMatchScore(base, candidate) {
  const baseKey = originKey(base);
  const candKey = originKey(candidate);
  if (!baseKey && !candKey) return 50; // both unknown: neutral
  if (!baseKey || !candKey) return 0;  // one known, one not: no match
  if (baseKey === candKey) return 100;
  // Partial: same first few chars (e.g. "hebrew" vs "hebrewish") — simplistic
  if (baseKey.includes(candKey) || candKey.includes(baseKey)) return 60;
  return 0;
}

/** Phonetic rhythm score 0–100. Syllable similarity + first letter match. */
function phoneticScore(base, candidate) {
  const baseSyl = base.syllables != null ? base.syllables : syllableCount(base.name || '');
  const candSyl = candidate.syllables != null ? candidate.syllables : syllableCount(candidate.name || '');
  const baseFirst = (base.first_letter || (base.name || '').charAt(0) || '').toLowerCase();
  const candFirst = (candidate.first_letter || (candidate.name || '').charAt(0) || '').toLowerCase();

  let sylScore = 0;
  const sylDiff = Math.abs(baseSyl - candSyl);
  if (sylDiff === 0) sylScore = 100;
  else if (sylDiff === 1) sylScore = 70;
  else if (sylDiff === 2) sylScore = 40;
  else sylScore = 10;

  const firstLetterBonus = baseFirst && candFirst && baseFirst === candFirst ? 20 : 0;
  return Math.min(100, sylScore + firstLetterBonus);
}

/** Popularity band score 0–100. Same band = 100; adjacent = 50; else 0. */
function popularityBandScore(baseBand, candBand) {
  if (baseBand === candBand) return 100;
  const bands = ['top100', 'top500', 'top1000', 'other'];
  const bi = bands.indexOf(baseBand);
  const ci = bands.indexOf(candBand);
  if (bi < 0 || ci < 0) return 0;
  if (Math.abs(bi - ci) === 1) return 50;
  return 0;
}

/** Length balance score 0–100. Lengths within 2 chars = high; extreme diff = low. */
function lengthBalanceScore(base, candidate) {
  const baseLen = (base.name || '').length;
  const candLen = (candidate.name || '').length;
  const diff = Math.abs(baseLen - candLen);
  if (diff <= 1) return 100;
  if (diff <= 2) return 80;
  if (diff <= 3) return 60;
  if (diff <= 4) return 40;
  return 20;
}

/** Style cluster score 0–100. Same style = 100; else 0. */
function styleClusterScore(baseStyle, candStyle) {
  if (!baseStyle && !candStyle) return 50; // both unknown: neutral
  if (!baseStyle || !candStyle) return 0;
  return baseStyle === candStyle ? 100 : 0;
}

/**
 * Compute sibling harmony score for (baseName, candidateName).
 * baseName and candidateName are full record objects { id, name, origin_country, language, syllables, first_letter, ... }.
 * Returns { score: 0–100, sharedOrigin: string|null, styleMatch: string }.
 */
function computeSiblingHarmony(baseName, candidateName, popularity, categories) {
  const originSc = originMatchScore(baseName, candidateName);
  const phoneticSc = phoneticScore(baseName, candidateName);
  const baseBand = getPopularityBand(baseName.id, popularity);
  const candBand = getPopularityBand(candidateName.id, popularity);
  const popSc = popularityBandScore(baseBand, candBand);
  const lengthSc = lengthBalanceScore(baseName, candidateName);
  const baseStyle = getStyle(baseName.id, categories);
  const candStyle = getStyle(candidateName.id, categories);
  const styleSc = styleClusterScore(baseStyle, candStyle);

  const score = Math.round(
    originSc * ORIGIN_MATCH_WEIGHT +
    phoneticSc * PHONETIC_WEIGHT +
    popSc * POPULARITY_BAND_WEIGHT +
    lengthSc * LENGTH_BALANCE_WEIGHT +
    styleSc * STYLE_CLUSTER_WEIGHT
  );

  const sharedOrigin = originKey(baseName) && originKey(baseName) === originKey(candidateName)
    ? (baseName.origin_country || baseName.language || originKey(baseName))
    : null;
  const styleMatch = baseStyle && baseStyle === candStyle ? candStyle : '';

  return {
    score: Math.min(100, Math.max(0, score)),
    sharedOrigin,
    styleMatch,
  };
}

/**
 * Get top 12 sibling-compatible names for baseName, excluding baseName itself.
 * names: full names array; popularity: popularity array; categories: categories array.
 */
function getTopSiblingMatches(baseName, names, popularity, categories, limit = 12) {
  const nameById = new Map(names.map((n) => [n.id, n]));
  const scored = names
    .filter((n) => n.id !== baseName.id)
    .map((candidate) => {
      const result = computeSiblingHarmony(baseName, candidate, popularity, categories);
      return { name: candidate, ...result };
    });
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.name.name || '').localeCompare(b.name.name || '');
  });
  return scored.slice(0, limit);
}

// CLI: output sample for a few names
if (require.main === module) {
  const path = require('path');
  const fs = require('fs');
  const DATA_DIR = path.join(__dirname, '..', 'data');
  const names = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'names.json'), 'utf8'));
  const popularity = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'popularity.json'), 'utf8'));
  const categories = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'categories.json'), 'utf8'));

  const sample = names.slice(0, 3);
  sample.forEach((base) => {
    const matches = getTopSiblingMatches(base, names, popularity, categories, 5);
    console.log('\n' + base.name + ' → top 5 siblings:');
    matches.forEach((m) => console.log('  ', m.name.name, m.score, m.sharedOrigin || '-', m.styleMatch || '-'));
  });
}

module.exports = { computeSiblingHarmony, getTopSiblingMatches, getPopularityBand, getStyle };
