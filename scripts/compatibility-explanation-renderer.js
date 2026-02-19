/**
 * Phase 3.0B — Compatibility Explanation Renderer
 * Deterministic variant selection and block ordering.
 * No random(). Uses hash(firstName + surname) for rotation.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

let _variants = null;
function loadVariants() {
  if (_variants) return _variants;
  const p = path.join(DATA_DIR, 'compatibility-explanation-variants.json');
  if (!fs.existsSync(p)) return {};
  _variants = JSON.parse(fs.readFileSync(p, 'utf8'));
  return _variants;
}

/** Deterministic hash from string. Returns non-negative integer. */
function hash(str) {
  if (!str || typeof str !== 'string') return 0;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}

/** Pick variant by index. variantIndex = hash(key) % arr.length. */
function pickVariant(arr, key) {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  const idx = hash(key) % arr.length;
  return arr[idx] || arr[0];
}

/** Replace placeholders in template. */
function render(template, ctx) {
  if (!template) return '';
  let s = String(template);
  Object.keys(ctx || {}).forEach((k) => {
    s = s.split('{' + k + '}').join(ctx[k] || '');
  });
  return s;
}

/**
 * Get tier block paragraph. Uses tier_block_variants.
 * key: surname (or firstName + surname for per-pair)
 */
function getTierBlockParagraph(surname) {
  const v = loadVariants();
  const arr = v.tier_block_variants || [];
  return pickVariant(arr, surname) || 'Tiers: Excellent Flow (85–100), Strong Flow (70–84), Neutral (50–69), Slight Friction (30–49), High Friction (0–29). Higher scores indicate smoother phonetic flow when the first and last names are said together.';
}

/**
 * Get transition paragraph (vowel-consonant or consonant-vowel at boundary).
 * surname: the surname (used in ctx as SURNAME).
 * lastStartsVowel: boolean.
 * escapeFn: optional (s) => string to escape surname for HTML.
 * hashKey: optional. If provided, used for variant selection; else surname.
 */
function getTransitionParagraph(surname, lastStartsVowel, escapeFn, hashKey) {
  const v = loadVariants();
  const arr = lastStartsVowel
    ? (v.consonant_vowel_transition_variants || [])
    : (v.vowel_consonant_transition_variants || []);
  const t = pickVariant(arr, hashKey != null ? hashKey : surname);
  const s = escapeFn ? escapeFn(surname) : surname;
  return render(t, { SURNAME: s });
}

/**
 * Get syllable analysis paragraph.
 * hashKey: optional. If provided, used for variant selection; else surname + 'syl'.
 */
function getSyllableParagraph(surname, sylCount, escapeFn, hashKey) {
  const v = loadVariants();
  const arr = v.syllable_analysis_variants || [];
  const key = hashKey != null ? hashKey + 'syl' : surname + 'syl';
  const t = pickVariant(arr, key);
  const s = escapeFn ? escapeFn(surname) : surname;
  const sylAdj = sylCount === 1 ? 2 : sylCount - 1;
  return render(t, {
    SURNAME: s,
    SYL: String(sylCount),
    SYL_PLURAL: sylCount !== 1 ? 's' : '',
    SYL_ADJ: String(sylAdj),
  });
}

/**
 * Get rhythm explanation paragraph.
 * hashKey: optional. If provided, used for variant selection; else surname + 'r'.
 */
function getRhythmParagraph(surname, escapeFn, hashKey) {
  const v = loadVariants();
  const arr = v.rhythm_explanation_variants || [];
  const key = hashKey != null ? hashKey + 'r' : surname + 'r';
  const t = pickVariant(arr, key);
  const s = escapeFn ? escapeFn(surname) : surname;
  return render(t, { SURNAME: s });
}

/**
 * Get consonant collision paragraph.
 * hashKey: optional. If provided, used for variant selection; else surname + 'c'.
 */
function getConsonantCollisionParagraph(surname, escapeFn, hashKey) {
  const v = loadVariants();
  const arr = v.consonant_collision_variants || [];
  const key = hashKey != null ? hashKey + 'c' : surname + 'c';
  const t = pickVariant(arr, key);
  const s = escapeFn ? escapeFn(surname) : surname;
  return render(t, { SURNAME: s });
}

/**
 * Get scoring logic paragraph (combined explanation).
 */
function getScoringLogicParagraph(surname) {
  const v = loadVariants();
  const arr = v.scoring_logic_variants || [];
  return pickVariant(arr, surname);
}

/**
 * Get "why it matters" paragraph.
 */
function getWhyItMattersParagraph(surname, escapeFn) {
  const v = loadVariants();
  const arr = v.why_it_matters_variants || [];
  const t = pickVariant(arr, surname);
  const s = escapeFn ? escapeFn(surname) : surname;
  return render(t, { SURNAME: s });
}

/**
 * Get block order for main sections. Returns 'A' or 'B'.
 * order A: score, scoring_logic, phonetic, why
 * order B: score, phonetic, scoring_logic, why
 */
function getBlockOrder(surname) {
  return hash(surname) % 2 === 0 ? 'A' : 'B';
}

/**
 * Get phonetic breakdown paragraph order. Returns array of block keys.
 * Order 1: ['transition', 'syllable', 'rhythm', 'consonant']
 * Order 2: ['syllable', 'transition', 'consonant', 'rhythm']
 */
function getPhoneticBlockOrder(surname) {
  return (hash(surname + 'p') % 2 === 0)
    ? ['transition', 'syllable', 'rhythm', 'consonant']
    : ['syllable', 'transition', 'consonant', 'rhythm'];
}

module.exports = {
  loadVariants,
  hash,
  pickVariant,
  render,
  getTierBlockParagraph,
  getScoringLogicParagraph,
  getTransitionParagraph,
  getSyllableParagraph,
  getRhythmParagraph,
  getConsonantCollisionParagraph,
  getWhyItMattersParagraph,
  getBlockOrder,
  getPhoneticBlockOrder,
};
