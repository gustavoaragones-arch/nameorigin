#!/usr/bin/env node
/**
 * scripts/audit/datasets.js — Phase 1A / PART 5: Dataset Inventory (READ-ONLY).
 * For every data/*.json file, computes size/shape/rows directly, and finds
 * producer (writes it) / consumer (reads it) scripts by searching script
 * source text for the dataset's basename. This is a static-text search, not
 * an AST analysis, so results are a strong signal but should be spot-checked
 * for a script that references the same string for an unrelated reason.
 */

const fs = require('fs');
const path = require('path');
const { ROOT, DATA_DIR, SCRIPTS_DIR, fileSize, listDataJsonFiles, readJsonSafe, readFileSafe, bytesToHuman, writeAuditJson } = require('./_lib.js');

const DATASET_PURPOSES = {
  'names.json': 'Base name dataset (id, name, gender, syllables, first_letter) built from raw SSA/StatCan data.',
  'names-enriched.json': 'names.json with origin-overrides.json merged in (origin_country, language, origin_cluster, origin_confidence).',
  'normalized-names.json': 'names.json with slug, phonetic_code, spelling_variants[], length, syllable_estimate added.',
  'categories.json': 'name_id -> category assignments (traditional, popular, rare, biblical, classical, nature).',
  'popularity.json': 'name_id/country/year/rank/count popularity rows.',
  'variants.json': 'name_id -> spelling variant + language.',
  'countries.json': 'The 5 supported countries (code, name, primary_language, region_group).',
  'last-names.json': 'The 75 supported surnames (name, origin, syllables, compatibility note).',
  'name-equivalents.json': 'Curated cross-linguistic equivalent-name groups (closed dataset, 27 anchors).',
  'origin-overrides.json': 'Curated, deterministic per-name origin backfill (top-300-name scope per header comment).',
  'country-differentials.json': 'Per name/country rank_2025 vs rank_2015 delta + volatility_score, for comparison pages.',
  'regional-trend-acceleration.json': 'trend_acceleration = (rank_2015-rank_2025)/years, by country, for the trends page.',
  'compatibility_patterns.json': 'Rule-based first+last-name compatibility scoring factors and patterns.',
  'compatibility-explanation-variants.json': 'Prose variant bank for compatibility-explanation-renderer.js (deterministic rotation).',
  'sibling-explanation-variants.json': 'Prose variant bank for sibling-explanation-renderer.js (deterministic rotation).',
  'cultural-explanation-variants.json': 'Prose variant bank, presumed for cultural-context copy blocks.',
  'comparison-intro-variants.json': 'Prose variant bank, presumed for comparison-page intros.',
  'delta-interpretation-variants.json': 'Prose variant bank, presumed for rank-delta interpretation copy.',
  'heraldry.json': 'Per-surname heraldry availability flag + region/note (currently 2 surnames).',
};

function allScriptSources() {
  const files = [];
  const dirs = [SCRIPTS_DIR, path.join(SCRIPTS_DIR, 'acquire'), path.join(SCRIPTS_DIR, 'utils'), path.join(SCRIPTS_DIR, 'audit')];
  for (const d of dirs) {
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch (e) {
      continue;
    }
    for (const e of entries) {
      if (e.isFile() && e.name.endsWith('.js')) {
        const abs = path.join(d, e.name);
        files.push({ rel: path.relative(ROOT, abs), src: readFileSafe(abs) || '' });
      }
    }
  }
  return files;
}

function findReferencingScripts(basename, sources, excludeSelfDir) {
  const key = basename.replace(/\.json$/, '');
  const hits = [];
  for (const { rel, src } of sources) {
    if (excludeSelfDir && rel.startsWith('scripts/audit/')) continue;
    if (src.includes(key)) hits.push(rel);
  }
  return hits;
}

function findProducers(basename, sources) {
  const hits = [];
  for (const { rel, src } of sources) {
    if (rel.startsWith('scripts/audit/')) continue;
    const re = new RegExp('writeFileSync\\s*\\([^)]*' + basename.replace(/\./g, '\\.').replace(/-/g, '\\-'), 'i');
    if (re.test(src)) hits.push(rel);
  }
  return hits;
}

function run() {
  console.log('PART 5 — Dataset Inventory');
  const files = listDataJsonFiles();
  const sources = allScriptSources();

  const datasets = files.map((name) => {
    const abs = path.join(DATA_DIR, name);
    const data = readJsonSafe(abs);
    const rel = 'data/' + name;
    let rows = null;
    let shape = 'unknown';
    if (Array.isArray(data)) {
      rows = data.length;
      shape = 'array';
    } else if (data && typeof data === 'object') {
      rows = Object.keys(data).length;
      shape = 'object (keyed)';
    }
    const consumers = findReferencingScripts(name, sources, true).filter((s) => !findProducers(name, sources).includes(s) || true);
    const producers = findProducers(name, sources);
    const size = fileSize(rel);

    return {
      path: rel,
      purpose: DATASET_PURPOSES[name] || 'purpose not yet documented',
      sizeBytes: size,
      sizeHuman: bytesToHuman(size),
      shape,
      rows,
      producers,
      consumers,
      referencedByAnyScript: consumers.length > 0,
    };
  });

  datasets.sort((a, b) => b.sizeBytes - a.sizeBytes);

  const unreferenced = datasets.filter((d) => !d.referencedByAnyScript);

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    datasetCount: datasets.length,
    datasets,
    largestDatasets: [...datasets].sort((a, b) => b.sizeBytes - a.sizeBytes).slice(0, 5),
    mostRowsDatasets: [...datasets].filter((d) => d.rows != null).sort((a, b) => b.rows - a.rows).slice(0, 5),
    unreferencedDatasets: unreferenced.map((d) => d.path),
    notes: [
      'producers/consumers are found via static text search for the dataset basename inside every scripts/*.js, scripts/acquire/*.js, and scripts/utils/*.js file — a strong signal, not a guarantee (a script could reference the string for an unrelated reason, or load it via a variable built at runtime).',
      'unreferencedDatasets lists files with zero text-search hits in any script; this does not prove they are unused (e.g. a manual/ad hoc script or a future feature could reference them) but no current generator or renderer appears to read them.',
    ],
  };

  writeAuditJson('datasets.json', report);
  console.log('Datasets cataloged:', datasets.length, '| unreferenced:', unreferenced.length);
}

run();
