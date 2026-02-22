#!/usr/bin/env node
/**
 * Phase 3.5 — Topic cluster map for Topical Authority Mesh.
 * Builds cluster relationships: origin_cluster, gender, first_letter, syllable_count,
 * popularity_band (high/medium/low), style_cluster (classic, modern, vintage, etc.).
 * Output: build/topic-clusters.json
 * Each name belongs to exactly 1 origin, 1 gender, 1 letter, 1 style, 1 popularity band.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const BUILD_DIR = path.join(ROOT, 'build');
const OUT_PATH = path.join(BUILD_DIR, 'topic-clusters.json');

function loadJson(name) {
  const p = path.join(DATA_DIR, name + '.json');
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadNames() {
  const enrichedPath = path.join(DATA_DIR, 'names-enriched.json');
  const basePath = path.join(DATA_DIR, 'names.json');
  if (fs.existsSync(enrichedPath)) {
    return JSON.parse(fs.readFileSync(enrichedPath, 'utf8'));
  }
  return JSON.parse(fs.readFileSync(basePath, 'utf8'));
}

/** Best rank per name_id from popularity rows (lower = more popular). */
function getBestRankPerName(popularity) {
  const byNameId = new Map();
  for (const r of popularity || []) {
    const rank = r.rank != null ? r.rank : 999999;
    if (!byNameId.has(r.name_id)) byNameId.set(r.name_id, rank);
    else byNameId.set(r.name_id, Math.min(byNameId.get(r.name_id), rank));
  }
  return byNameId;
}

/** popularity_band: high (rank < 100), medium (100–500), low (> 500 or no data). */
function popularityBand(bestRank) {
  if (bestRank == null || bestRank >= 999999) return 'low';
  if (bestRank < 100) return 'high';
  if (bestRank < 500) return 'medium';
  return 'low';
}

/** Map category from classify-categories to style_cluster (classic, modern, vintage, nature, etc.). */
const CATEGORY_TO_STYLE = {
  biblical: 'classic',
  classical: 'classic',
  traditional: 'classic',
  nature: 'nature',
  royal: 'classic',
  literary: 'classic',
  popular: 'modern',
  rare: 'vintage',
  modern: 'modern',
};

function styleCluster(categoriesForName) {
  if (!categoriesForName || categoriesForName.length === 0) return 'classic';
  const first = (categoriesForName[0] || {}).category;
  return CATEGORY_TO_STYLE[first] || first || 'classic';
}

function run() {
  const names = loadNames();
  const popularity = loadJson('popularity');
  const categories = loadJson('categories');
  const bestRank = getBestRankPerName(popularity);

  const categoriesByNameId = new Map();
  for (const c of categories || []) {
    if (!categoriesByNameId.has(c.name_id)) categoriesByNameId.set(c.name_id, []);
    categoriesByNameId.get(c.name_id).push(c);
  }

  const nameSlug = (n) => String(n.name || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const namesList = [];
  const byOrigin = new Map();
  const byGender = new Map();
  const byLetter = new Map();
  const byStyle = new Map();
  const byPopularity = new Map();

  for (const n of names) {
    const originCluster = (n.origin_cluster || n.origin_country || n.language || 'general').toString().trim() || 'general';
    const gender = (n.gender || 'unisex').toLowerCase().trim();
    const firstLetter = (n.first_letter || (n.name || '').charAt(0) || '').toLowerCase() || '?';
    const syllableCount = n.syllables != null ? n.syllables : (n.syllable_count != null ? n.syllable_count : 2);
    const rank = bestRank.get(n.id);
    const band = popularityBand(rank);
    const cats = categoriesByNameId.get(n.id) || [];
    const styleClusterName = styleCluster(cats);

    namesList.push({
      id: n.id,
      name: n.name,
      slug: nameSlug(n),
      origin_cluster: originCluster,
      gender,
      first_letter: firstLetter,
      syllable_count: syllableCount,
      popularity_band: band,
      style_cluster: styleClusterName,
    });

    if (!byOrigin.has(originCluster)) byOrigin.set(originCluster, []);
    byOrigin.get(originCluster).push(n.id);
    if (!byGender.has(gender)) byGender.set(gender, []);
    byGender.get(gender).push(n.id);
    if (!byLetter.has(firstLetter)) byLetter.set(firstLetter, []);
    byLetter.get(firstLetter).push(n.id);
    if (!byStyle.has(styleClusterName)) byStyle.set(styleClusterName, []);
    byStyle.get(styleClusterName).push(n.id);
    if (!byPopularity.has(band)) byPopularity.set(band, []);
    byPopularity.get(band).push(n.id);
  }

  const byNameSlug = {};
  for (const row of namesList) {
    byNameSlug[row.slug] = row;
  }

  const out = {
    names: namesList,
    by_name: byNameSlug,
    by_origin_cluster: Object.fromEntries(byOrigin),
    by_gender: Object.fromEntries(byGender),
    by_first_letter: Object.fromEntries(byLetter),
    by_style_cluster: Object.fromEntries(byStyle),
    by_popularity_band: Object.fromEntries(byPopularity),
  };

  if (!fs.existsSync(BUILD_DIR)) fs.mkdirSync(BUILD_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), 'utf8');
  console.log('Wrote', namesList.length, 'names to', OUT_PATH);
}

run();
