#!/usr/bin/env node
/**
 * Step 3 — Data normalization engine.
 * Reads raw-data/<source>/normalized.json (all sources), then:
 * - Standardizes gender (M→boy, F→girl, U→unisex)
 * - Normalizes name format (capitalize, accent-stripped variant, slug)
 * - Deduplicates by lowercase name, phonetic similarity, origin match
 * - Adds derived fields: first_letter, length, syllable_estimate, phonetic_code
 * Outputs data/normalized-names.json (and optionally data/names.json).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RAW_BASE = path.join(ROOT, 'raw-data');
const DATA_DIR = path.join(ROOT, 'data');
const OUT_NORMALIZED = path.join(DATA_DIR, 'normalized-names.json');
const OUT_NAMES = path.join(DATA_DIR, 'names.json');

const SOURCES = ['ssa', 'uk', 'canada', 'australia', 'wikidata'];

// --- Gender standardization ---
function standardizeGender(val) {
  if (val == null) return 'unisex';
  const v = String(val).toUpperCase().trim();
  if (v === 'M' || v === 'MALE' || v === 'BOY') return 'boy';
  if (v === 'F' || v === 'FEMALE' || v === 'GIRL') return 'girl';
  if (v === 'U' || v === 'UNISEX') return 'unisex';
  return 'unisex';
}

// --- Name format: capitalize first letter (per token), remove accents, slug ---
function capitalizeFirst(str) {
  return String(str || '')
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function removeAccents(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function slug(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// --- Soundex for phonetic_code and dedupe ---
function soundex(s) {
  s = String(s || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (!s) return '';
  const codes = { B: 1, F: 1, P: 1, V: 1, C: 2, G: 2, J: 2, K: 2, Q: 2, S: 2, X: 2, Z: 2, D: 3, T: 3, L: 4, M: 5, N: 5, R: 6 };
  let out = s[0];
  let prev = codes[s[0]] ?? 0;
  for (let i = 1; i < s.length && out.length < 4; i++) {
    const c = s[i];
    const code = codes[c];
    if (code != null && code !== prev) {
      out += code;
      prev = code;
    } else if (code == null && c !== 'H' && c !== 'W') {
      prev = 0;
    }
  }
  return (out + '000').slice(0, 4);
}

// --- Syllable estimate (vowel groups) ---
function syllableEstimate(str) {
  const s = String(str || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!s) return 1;
  const vowels = s.match(/[aeiouy]+/g);
  return vowels ? Math.max(1, vowels.length) : 1;
}

// --- Load all raw normalized arrays ---
function loadRawSources() {
  const rows = [];
  for (const source of SOURCES) {
    const p = path.join(RAW_BASE, source, 'normalized.json');
    if (!fs.existsSync(p)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      const arr = Array.isArray(data) ? data : [];
      arr.forEach((r) => rows.push({ ...r, _source: source }));
    } catch (e) {
      console.warn('Skip', p, e.message);
    }
  }
  return rows;
}

// --- Build one canonical record from many raw rows (dedupe + merge) ---
function run() {
  const raw = loadRawSources();
  if (raw.length === 0) {
    console.warn('No raw normalized files found under raw-data/*/normalized.json. Run import-* scripts first.');
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(OUT_NORMALIZED, '[]', 'utf8');
    fs.writeFileSync(OUT_NAMES, '[]', 'utf8');
    return;
  }

  // Normalize each row: standardize gender, normalize name, add derived fields
  const normalized = raw
    .filter((r) => r.name != null && String(r.name).trim() !== '')
    .map((r) => {
      const nameRaw = String(r.name).trim();
      const name = capitalizeFirst(nameRaw);
      const nameLower = name.toLowerCase();
      const variantNoAccents = removeAccents(name) || name;
      const gender = standardizeGender(r.gender);
      const first_letter = (name.match(/[A-Za-z]/) || [])[0] ? (name.match(/[A-Za-z]/)[0].toUpperCase()) : '';
      const length = name.length;
      const syllable_estimate = syllableEstimate(name);
      const phonetic_code = soundex(name);
      return {
        name,
        name_lower: nameLower,
        variant_no_accents: variantNoAccents,
        slug: slug(name),
        gender,
        first_letter,
        length,
        syllable_estimate,
        phonetic_code,
        origin_country: r.origin_country || r.origin || null,
        language: r.language || null,
        meaning: r.meaning || null,
        _source: r._source,
        _year: r.year,
        _count: r.count,
        _rank: r.rank,
      };
    });

  // Deduplicate 1: merge by lowercase name (same spelling, different case/source)
  const byLower = new Map();
  for (const n of normalized) {
    const key = n.name_lower;
    if (!byLower.has(key)) byLower.set(key, []);
    byLower.get(key).push(n);
  }

  const mergedByName = [];
  for (const [, group] of byLower) {
    const first = group[0];
    const genders = new Set(group.map((g) => g.gender));
    const gender =
      genders.has('boy') && genders.has('girl') ? 'unisex' : genders.has('girl') ? 'girl' : genders.has('boy') ? 'boy' : first.gender;
    const totalCount = group.reduce((s, g) => s + (g._count || 0), 0);
    mergedByName.push({
      name: first.name,
      name_lower: first.name_lower,
      variant_no_accents: first.variant_no_accents,
      slug: first.slug,
      gender,
      first_letter: first.first_letter,
      length: first.length,
      syllable_estimate: first.syllable_estimate,
      phonetic_code: first.phonetic_code,
      origin_country: group.map((g) => g.origin_country).find(Boolean) || first.origin_country || null,
      language: group.map((g) => g.language).find(Boolean) || first.language || null,
      meaning: group.map((g) => g.meaning).find(Boolean) || first.meaning || null,
      _totalCount: totalCount,
    });
  }

  // Deduplicate 2: phonetic similarity — group by phonetic_code + gender; keep one canonical per group (prefer higher count or first by name)
  const byPhonetic = new Map();
  for (const m of mergedByName) {
    const key = `${m.phonetic_code}\t${m.gender}`;
    if (!byPhonetic.has(key)) byPhonetic.set(key, []);
    byPhonetic.get(key).push(m);
  }
  const mergedByPhonetic = [];
  for (const [, group] of byPhonetic) {
    const sorted = group.sort((a, b) => b._totalCount - a._totalCount || a.name_lower.localeCompare(b.name_lower));
    const canonical = sorted[0];
    const spelling_variants = sorted.slice(1).map((s) => s.name);
    mergedByPhonetic.push({ ...canonical, spelling_variants });
  }

  // Deduplicate 3: origin match — same name_lower + same origin_country already merged; same phonetic + same origin → keep one
  const byOrigin = new Map();
  for (const m of mergedByPhonetic) {
    const originKey = `${(m.origin_country || '').toLowerCase()}\t${(m.language || '').toLowerCase()}\t${m.phonetic_code}\t${m.gender}`;
    if (!byOrigin.has(originKey)) byOrigin.set(originKey, []);
    byOrigin.get(originKey).push(m);
  }
  const finalList = [];
  for (const [, group] of byOrigin) {
    const best = group.sort((a, b) => b._totalCount - a._totalCount || a.name_lower.localeCompare(b.name_lower))[0];
    const others = group.slice(1);
    const allVariants = [...(best.spelling_variants || []), ...others.flatMap((o) => [o.name, ...(o.spelling_variants || [])])];
    finalList.push({ ...best, spelling_variants: [...new Set(allVariants)].filter((v) => v !== best.name) });
  }

  // Sort by name, assign id; drop internal fields
  finalList.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  const withId = finalList.map((r, i) => {
    const { _totalCount, spelling_variants, ...rest } = r;
    return {
      id: i + 1,
      name: rest.name,
      gender: rest.gender,
      origin_country: rest.origin_country,
      language: rest.language,
      meaning: rest.meaning,
      phonetic: null,
      syllables: rest.syllable_estimate,
      first_letter: rest.first_letter,
      length: rest.length,
      syllable_estimate: rest.syllable_estimate,
      phonetic_code: rest.phonetic_code,
      slug: rest.slug,
      variant_no_accents: rest.variant_no_accents,
      spelling_variants: spelling_variants && spelling_variants.length ? spelling_variants : undefined,
      is_traditional: 1,
      is_modern: 0,
    };
  });

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUT_NORMALIZED, JSON.stringify(withId), 'utf8');
  console.log('Wrote', withId.length, 'normalized names to', OUT_NORMALIZED);

  // Also write names.json in schema expected by Phase 2 (subset of fields)
  const namesSchema = withId.map((r) => ({
    id: r.id,
    name: r.name,
    gender: r.gender,
    origin_country: r.origin_country,
    language: r.language,
    meaning: r.meaning,
    phonetic: r.phonetic,
    syllables: r.syllables,
    first_letter: r.first_letter,
    is_traditional: r.is_traditional,
    is_modern: r.is_modern,
  }));
  fs.writeFileSync(OUT_NAMES, JSON.stringify(namesSchema, null, 2), 'utf8');
  console.log('Wrote', namesSchema.length, 'names to', OUT_NAMES);
}

run();
