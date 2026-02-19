/**
 * Sibling Engine De-Templating — deterministic variant selection and data-driven rendering.
 * No random(). Uses hash(baseName) for rotation. Injects computed elements (syllable count, origin, pop band).
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

let _variants = null;
function loadVariants() {
  if (_variants) return _variants;
  const p = path.join(DATA_DIR, 'sibling-explanation-variants.json');
  if (!fs.existsSync(p)) return {};
  _variants = JSON.parse(fs.readFileSync(p, 'utf8'));
  return _variants;
}

function hash(str) {
  if (!str || typeof str !== 'string') return 0;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}

function pickVariant(arr, key) {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  const idx = hash(key) % arr.length;
  return arr[idx] || arr[0];
}

function render(template, ctx) {
  if (!template) return '';
  let s = String(template);
  Object.keys(ctx || {}).forEach((k) => {
    s = s.split('{' + k + '}').join(ctx[k] != null ? String(ctx[k]) : '');
  });
  return s;
}

/**
 * Build context for sibling page from base record and optional popularity/categories.
 * Provides: BASE_NAME, BASE_SYL, BASE_SYL_PLURAL, BASE_SYL_ADJ, BASE_ORIGIN, BASE_POP_BAND, BASE_FIRST_LETTER.
 */
function buildContext(baseRecord, popularity, categories) {
  const name = baseRecord.name || '';
  const syl = baseRecord.syllables != null
    ? baseRecord.syllables
    : (name.match(/[aeiouy]+/gi) || []).length || 1;
  const sylCount = Math.max(1, syl);
  const sylAdj = sylCount === 1 ? 2 : sylCount - 1;
  const origin = (baseRecord.origin_country || baseRecord.language || 'various origins').trim() || 'various origins';
  let popBand = 'other';
  if (popularity && baseRecord.id != null) {
    const rows = popularity.filter((p) => p.name_id === baseRecord.id && p.rank != null);
    if (rows.length > 0) {
      const bestRank = Math.min(...rows.map((r) => r.rank || 9999));
      if (bestRank < 100) popBand = 'top 100';
      else if (bestRank < 500) popBand = 'top 500';
      else if (bestRank < 1000) popBand = 'top 1000';
    }
  }
  const firstLetter = (baseRecord.first_letter || name.charAt(0) || '').toUpperCase();
  return {
    BASE_NAME: name,
    BASE_SYL: String(sylCount),
    BASE_SYL_PLURAL: sylCount !== 1 ? 's' : '',
    BASE_SYL_ADJ: String(sylAdj),
    BASE_ORIGIN: origin,
    BASE_POP_BAND: popBand,
    BASE_FIRST_LETTER: firstLetter,
  };
}

function getSummaryIntro(baseName, ctx) {
  const v = loadVariants();
  const arr = v.summary_intro_variants || [];
  return render(pickVariant(arr, baseName), ctx);
}

function getOriginExplanation(baseName, ctx) {
  const v = loadVariants();
  const arr = v.origin_based_explanation_variants || [];
  return render(pickVariant(arr, baseName + 'o'), ctx);
}

function getPopularityExplanation(baseName, ctx) {
  const v = loadVariants();
  const arr = v.popularity_parity_variants || [];
  return render(pickVariant(arr, baseName + 'p'), ctx);
}

function getRhythmExplanation(baseName, ctx) {
  const v = loadVariants();
  const arr = v.rhythm_similarity_variants || [];
  return render(pickVariant(arr, baseName + 'r'), ctx);
}

function getLengthStyleExplanation(baseName, ctx) {
  const v = loadVariants();
  const arr = v.length_style_variants || [];
  return render(pickVariant(arr, baseName + 'l'), ctx);
}

function getContrastExplanation(baseName, ctx) {
  const v = loadVariants();
  const arr = v.contrast_explanation_variants || [];
  return render(pickVariant(arr, baseName + 'c'), ctx);
}

function getWhyHarmony(baseName, ctx) {
  const v = loadVariants();
  const arr = v.why_harmony_variants || [];
  return render(pickVariant(arr, baseName + 'w'), ctx);
}

function getHowHarmonyIntro(baseName, ctx) {
  const v = loadVariants();
  const arr = v.how_harmony_intro_variants || [];
  return render(pickVariant(arr, baseName + 'h'), ctx);
}

function getDeterministicClose(baseName, ctx) {
  const v = loadVariants();
  const arr = v.deterministic_close_variants || [];
  return render(pickVariant(arr, baseName + 'd'), ctx);
}

module.exports = {
  loadVariants,
  hash,
  pickVariant,
  render,
  buildContext,
  getSummaryIntro,
  getOriginExplanation,
  getPopularityExplanation,
  getRhythmExplanation,
  getLengthStyleExplanation,
  getContrastExplanation,
  getWhyHarmony,
  getHowHarmonyIntro,
  getDeterministicClose,
};
