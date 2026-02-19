#!/usr/bin/env node
/**
 * Phase 3.0 — Surname Compatibility Smoothness Score™
 *
 * Deterministic scoring: how smoothly a first name flows with a surname.
 * No AI, no randomness. Structured phonetic and linguistic modeling.
 *
 * Factors: syllable balance, phonetic transition, stress/rhythm proxy,
 * ending–beginning consonant clash, length symmetry, total length penalty.
 *
 * Output: { score: 0–100, tier, explanation_components }.
 * Tiers: Excellent Flow (85–100), Strong Flow (70–84), Neutral (50–69),
 * Slight Friction (30–49), High Friction (0–29).
 */

function syllableCount(word) {
  if (!word) return 1;
  const s = String(word).toLowerCase();
  const v = s.match(/[aeiouy]+/g);
  return v ? Math.max(1, v.length) : 1;
}

function endsWithVowel(name) {
  return /[aeiouy]$/i.test(String(name || '').trim());
}

function startsWithVowel(name) {
  return /^[aeiouy]/i.test(String(name || '').trim());
}

function lastChar(name) {
  const s = String(name || '').trim().toLowerCase();
  return s[s.length - 1] || '';
}

function firstChar(name) {
  const s = String(name || '').trim().toLowerCase();
  return s[0] || '';
}

/** Is the character a consonant (a-z except a,e,i,o,u,y)? */
function isConsonant(c) {
  return /^[a-z]$/.test(c) && !/[aeiouy]/.test(c);
}

/**
 * Compute Surname Compatibility Smoothness Score for (firstName, lastName).
 * firstName / lastName can be string or { name, syllables }.
 * Returns { score: 0–100, tier, explanation_components }.
 */
function computeSmoothness(firstName, lastName) {
  const first = typeof firstName === 'string' ? firstName : (firstName && firstName.name) || '';
  const last = typeof lastName === 'string' ? lastName : (lastName && lastName.name) || '';
  const firstTrim = first.trim();
  const lastTrim = last.trim();
  if (!firstTrim || !lastTrim) {
    return { score: 50, tier: 'Neutral', explanation_components: [{ id: 'missing', label: 'Missing name', effect: 0 }] };
  }

  const firstSyl = (firstName && typeof firstName === 'object' && firstName.syllables != null)
    ? firstName.syllables
    : syllableCount(firstTrim);
  const lastSyl = (lastName && typeof lastName === 'object' && lastName.syllables != null)
    ? lastName.syllables
    : syllableCount(lastTrim);

  const firstEndsV = endsWithVowel(firstTrim);
  const lastStartsV = startsWithVowel(lastTrim);
  const firstLastC = lastChar(firstTrim);
  const lastFirstC = firstChar(lastTrim);
  const totalSyl = firstSyl + lastSyl;
  const ratio = firstTrim.length / Math.max(lastTrim.length, 1);

  const components = [];
  let score = 50; // start neutral

  // — Syllable balance: difference 0–1 = good; 2 = ok; 3+ = penalize
  const sylDiff = Math.abs(firstSyl - lastSyl);
  if (sylDiff <= 1) {
    score += 12;
    components.push({ id: 'syllable_balance', label: 'Syllable balance (within one)', effect: 12 });
  } else if (sylDiff === 2) {
    score += 4;
    components.push({ id: 'syllable_moderate', label: 'Moderate syllable difference', effect: 4 });
  } else {
    score -= 8;
    components.push({ id: 'syllable_imbalance', label: 'Large syllable difference', effect: -8 });
  }

  // — Phonetic transition: vowel–consonant or consonant–vowel at boundary = good; same type = slight penalty
  if (firstEndsV && !lastStartsV) {
    score += 14;
    components.push({ id: 'vowel_consonant', label: 'Vowel–consonant transition (smooth)', effect: 14 });
  } else if (!firstEndsV && lastStartsV) {
    score += 14;
    components.push({ id: 'consonant_vowel', label: 'Consonant–vowel transition (smooth)', effect: 14 });
  } else if (firstEndsV && lastStartsV) {
    score -= 6;
    components.push({ id: 'vowel_vowel', label: 'Vowel–vowel run-together risk', effect: -6 });
  } else {
    score -= 4;
    components.push({ id: 'consonant_consonant', label: 'Consonant–consonant boundary', effect: -4 });
  }

  // — Ending–beginning consonant clash: same consonant at boundary = penalize
  if (firstLastC && lastFirstC && firstLastC === lastFirstC && isConsonant(firstLastC)) {
    score -= 15;
    components.push({ id: 'consonant_clash', label: 'Same consonant at boundary (clash)', effect: -15 });
  }

  // — Alternating rhythm proxy: combined 2–5 syllables often sounds balanced; 6–7 ok; >7 penalize
  if (totalSyl >= 2 && totalSyl <= 5) {
    score += 8;
    components.push({ id: 'rhythm_balanced', label: 'Total syllable count in balanced range', effect: 8 });
  } else if (totalSyl > 7) {
    score -= 10;
    components.push({ id: 'rhythm_long', label: 'Combined name very long (>7 syllables)', effect: -10 });
  } else if (totalSyl > 5 && totalSyl <= 7) {
    score += 2;
    components.push({ id: 'rhythm_moderate', label: 'Moderate total length', effect: 2 });
  }

  // — Length symmetry: first/last character ratio in [0.5, 2] = good; extreme = penalize
  if (ratio >= 0.5 && ratio <= 2) {
    score += 8;
    components.push({ id: 'length_symmetry', label: 'Length symmetry (balanced)', effect: 8 });
  } else if (ratio > 3 || ratio < 0.33) {
    score -= 8;
    components.push({ id: 'length_asymmetry', label: 'Length asymmetry', effect: -8 });
  }

  score = Math.round(Math.max(0, Math.min(100, score)));
  const tier = score >= 85 ? 'Excellent Flow' : score >= 70 ? 'Strong Flow' : score >= 50 ? 'Neutral' : score >= 30 ? 'Slight Friction' : 'High Friction';

  return { score, tier, explanation_components: components };
}

// CLI: output sample scores for a few pairs
if (require.main === module) {
  const path = require('path');
  const fs = require('fs');
  const DATA_DIR = path.join(__dirname, '..', 'data');
  let names = [];
  let lastNames = [];
  try {
    names = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'names.json'), 'utf8')).slice(0, 5);
  } catch (_) {}
  try {
    lastNames = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'last-names.json'), 'utf8')).slice(0, 3);
  } catch (_) {}

  const out = {};
  lastNames.forEach((ln) => {
    out[ln.name] = {};
    names.forEach((n) => {
      out[ln.name][n.name] = computeSmoothness(n, ln);
    });
  });
  console.log(JSON.stringify(out, null, 2));
}

module.exports = { computeSmoothness, syllableCount, endsWithVowel, startsWithVowel };
