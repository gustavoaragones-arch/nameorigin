#!/usr/bin/env node
/**
 * Step 5 — Category classifier (curated rule engine).
 * Categories assigned via: origin, linguistic tags, meaning keywords, popularity, curated rule list.
 * Output: data/categories.json [{ name_id, category }, ...]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const NAMES_PATH = path.join(DATA_DIR, 'names.json');
const POPULARITY_PATH = path.join(DATA_DIR, 'popularity.json');
const RULES_PATH = path.join(DATA_DIR, 'sources', 'category-rules.json');
const OUT_PATH = path.join(DATA_DIR, 'categories.json');

// --- Origin → category (curated; expand as needed) ---
const ORIGIN_CATEGORIES = {
  hebrew: 'biblical',
  biblical: 'biblical',
  greek: 'classical',
  latin: 'classical',
  roman: 'classical',
  irish: 'traditional',
  welsh: 'traditional',
  scottish: 'traditional',
  celtic: 'traditional',
  sanskrit: 'traditional',
  arabic: 'traditional',
  persian: 'traditional',
  norse: 'traditional',
  german: 'traditional',
  french: 'traditional',
  italian: 'traditional',
  spanish: 'traditional',
  english: 'traditional',
};

// --- Meaning keywords → category (curated) ---
const MEANING_KEYWORDS = [
  { keywords: ['flower', 'rose', 'lily', 'violet', 'bloom', 'blossom', 'daisy', 'iris', 'jasmine', 'flora', 'plant'], category: 'nature' },
  { keywords: ['tree', 'olive', 'willow', 'laurel', 'oak', 'forest', 'wood'], category: 'nature' },
  { keywords: ['star', 'sky', 'sun', 'moon', 'rain', 'storm', 'river', 'sea', 'water', 'wind', 'cloud'], category: 'nature' },
  { keywords: ['bird', 'animal', 'lion', 'eagle', 'bear', 'wolf', 'deer'], category: 'nature' },
  { keywords: ['gem', 'jewel', 'stone', 'crystal', 'gold', 'pearl', 'jade'], category: 'nature' },
  { keywords: ['warrior', 'strength', 'brave', 'battle', 'victory', 'noble', 'ruler', 'king', 'queen'], category: 'royal' },
  { keywords: ['peace', 'peaceful', 'calm', 'wise', 'wisdom', 'light', 'blessed', 'gift'], category: 'literary' },
];

// --- Popularity thresholds (curated) ---
const POPULAR_TOP_N = 50;
const RARE_RANK_ABOVE = 1000;

function loadJson(p, fallback = []) {
  if (!fs.existsSync(p)) return fallback;
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    return Array.isArray(data) ? data : data;
  } catch (e) {
    console.warn('Skip', p, e.message);
    return fallback;
  }
}

function getBestRankPerName(popularityRows) {
  const byNameId = new Map();
  for (const r of popularityRows) {
    const rank = r.rank != null ? r.rank : (r.count != null && r.count > 0 ? 999999 : null);
    if (rank == null) continue;
    if (!byNameId.has(r.name_id)) byNameId.set(r.name_id, rank);
    else byNameId.set(r.name_id, Math.min(byNameId.get(r.name_id), rank));
  }
  return byNameId;
}

function run() {
  const names = loadJson(NAMES_PATH);
  if (names.length === 0) {
    console.warn('No names at', NAMES_PATH);
    return;
  }

  const popularity = loadJson(POPULARITY_PATH);
  const bestRank = getBestRankPerName(popularity);

  let curatedRules = { byOrigin: {}, byName: {}, byMeaningKeyword: [] };
  if (fs.existsSync(RULES_PATH)) {
    try {
      curatedRules = { ...curatedRules, ...JSON.parse(fs.readFileSync(RULES_PATH, 'utf8')) };
    } catch (e) {
      console.warn('Could not load category-rules.json:', e.message);
    }
  }

  const categories = [];
  const seen = new Set();

  for (const n of names) {
    const nameId = n.id;
    const nameLower = (n.name || '').toLowerCase();
    const origin = (n.origin_country || n.language || '').toLowerCase().replace(/\s+/g, '');
    const meaning = (n.meaning || '').toLowerCase();

    const add = (cat) => {
      const key = `${nameId}\t${cat}`;
      if (seen.has(key)) return;
      seen.add(key);
      categories.push({ name_id: nameId, category: cat });
    };

    add('traditional');

    // 1) Curated rule: explicit name
    if (curatedRules.byName && curatedRules.byName[nameLower]) {
      const list = Array.isArray(curatedRules.byName[nameLower]) ? curatedRules.byName[nameLower] : [curatedRules.byName[nameLower]];
      list.forEach((c) => add(c));
    }

    // 2) Origin → category
    const originCat = curatedRules.byOrigin[origin] || ORIGIN_CATEGORIES[origin];
    if (originCat) add(originCat);
    if (n.language) {
      const lang = String(n.language).toLowerCase().replace(/\s+/g, '');
      const langCat = curatedRules.byOrigin[lang] || ORIGIN_CATEGORIES[lang];
      if (langCat) add(langCat);
    }

    // 3) Meaning keywords
    for (const { keywords, category } of MEANING_KEYWORDS) {
      if (keywords.some((kw) => meaning.includes(kw))) {
        add(category);
        break;
      }
    }
    if (curatedRules.byMeaningKeyword && curatedRules.byMeaningKeyword.length) {
      for (const { keywords, category } of curatedRules.byMeaningKeyword) {
        const kws = Array.isArray(keywords) ? keywords : [keywords];
        if (kws.some((kw) => meaning.includes(String(kw).toLowerCase()))) add(category);
      }
    }

    // 4) Popularity: top 50 → popular; rank > 1000 → rare
    const rank = bestRank.get(nameId);
    if (rank != null) {
      if (rank <= POPULAR_TOP_N) add('popular');
      else if (rank > RARE_RANK_ABOVE) add('rare');
    }
  }

  categories.sort((a, b) => a.name_id - b.name_id || (a.category || '').localeCompare(b.category || ''));

  fs.writeFileSync(OUT_PATH, JSON.stringify(categories, null, 2), 'utf8');
  console.log('Wrote', categories.length, 'category rows to', OUT_PATH);
}

run();
