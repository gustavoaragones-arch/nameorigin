#!/usr/bin/env node
/**
 * Step 8 — Last name compatibility engine (rule-based scoring).
 * Builds data/compatibility_patterns.json from curated rules.
 * Score factors: syllable balance, vowel/consonant endings, phonetic flow, length harmony.
 * Not per last name — rules apply to any first+last pair.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const OUT_PATH = path.join(DATA_DIR, 'compatibility_patterns.json');

const COMPATIBILITY = {
  factors: [
    {
      id: 'syllable_balance',
      label: 'Syllable balance',
      hint: 'Similar syllable count between first and last name tends to sound balanced.',
      weight: 1.0,
      rule: 'score = max(0, 1 - |first_syllables - last_syllables|); best when difference <= 1',
    },
    {
      id: 'vowel_consonant_endings',
      label: 'Vowel/consonant endings',
      hint: 'First name ending in vowel often flows into a last name starting with consonant, and vice versa.',
      weight: 1.0,
      rule: 'first_ends_vowel + last_starts_consonant => +1; first_ends_consonant + last_starts_vowel => +1',
    },
    {
      id: 'phonetic_flow',
      label: 'Phonetic flow',
      hint: 'Avoid harsh consonant clusters or repeated sounds at the boundary between first and last.',
      weight: 1.0,
      rule: 'no double consonant at boundary (e.g. nn, tt); different final/initial sound => better',
    },
    {
      id: 'length_harmony',
      label: 'Length harmony',
      hint: 'First and last names of similar length or with a balanced ratio often sound harmonious.',
      weight: 0.8,
      rule: 'score = max(0, 1 - |first_len - last_len| / max(first_len, last_len)); balanced ratio preferred',
    },
  ],
  patterns: [
    {
      pattern: 'vowel_ending',
      factor: 'vowel_consonant_endings',
      label: 'First name ends in vowel',
      hint: 'Pairs well with last names starting with a consonant.',
      score_weight: 1,
      when: 'first_ends_vowel',
    },
    {
      pattern: 'consonant_ending',
      factor: 'vowel_consonant_endings',
      label: 'First name ends in consonant',
      hint: 'Often flows into last names starting with a vowel.',
      score_weight: 1,
      when: 'first_ends_consonant',
    },
    {
      pattern: 'last_starts_vowel',
      factor: 'vowel_consonant_endings',
      label: 'Last name starts with vowel',
      hint: 'Pairs well with first names ending in a consonant.',
      score_weight: 1,
      when: 'last_starts_vowel',
    },
    {
      pattern: 'last_starts_consonant',
      factor: 'vowel_consonant_endings',
      label: 'Last name starts with consonant',
      hint: 'Pairs well with first names ending in a vowel.',
      score_weight: 1,
      when: 'last_starts_consonant',
    },
    {
      pattern: 'syllable_balance',
      factor: 'syllable_balance',
      label: 'Syllable balance',
      hint: 'Similar syllable count between first and last name.',
      score_weight: 1,
      when: '|first_syllables - last_syllables| <= 1',
    },
    {
      pattern: 'syllable_mismatch',
      factor: 'syllable_balance',
      label: 'Syllable mismatch',
      hint: 'Very different syllable counts can feel uneven.',
      score_weight: -0.5,
      when: '|first_syllables - last_syllables| >= 3',
    },
    {
      pattern: 'phonetic_flow_good',
      factor: 'phonetic_flow',
      label: 'Smooth phonetic transition',
      hint: 'Different sounds at the first-last boundary avoid tongue-twister effect.',
      score_weight: 1,
      when: 'first_last_boundary_sounds_differ',
    },
    {
      pattern: 'phonetic_flow_clash',
      factor: 'phonetic_flow',
      label: 'Consonant cluster at boundary',
      hint: 'Same or repeated consonant at the boundary can sound awkward.',
      score_weight: -0.5,
      when: 'double_consonant_at_boundary',
    },
    {
      pattern: 'length_harmony',
      factor: 'length_harmony',
      label: 'Length harmony',
      hint: 'First and last names of similar character length often sound balanced.',
      score_weight: 1,
      when: 'length_ratio between 0.5 and 2',
    },
    {
      pattern: 'length_imbalance',
      factor: 'length_harmony',
      label: 'Length imbalance',
      hint: 'Very long first with very short last (or vice versa) can feel uneven.',
      score_weight: -0.3,
      when: 'length_ratio > 3 or < 0.33',
    },
  ],
};

function run() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(COMPATIBILITY, null, 2), 'utf8');
  console.log('Wrote', OUT_PATH, '—', COMPATIBILITY.factors.length, 'factors,', COMPATIBILITY.patterns.length, 'patterns.');
}

run();
