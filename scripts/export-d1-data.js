#!/usr/bin/env node
/**
 * export-d1-data.js
 * Exports Cloudflare D1 tables to /data/*.json for static page generation.
 * Run via: npx wrangler d1 execute DB --remote --command "SELECT * FROM names" (or use this script with wrangler bindings).
 *
 * For local/build without D1: copy existing /data/*.json or run after seeding D1.
 * With D1: use wrangler d1 export or query and write JSON (see Cloudflare docs).
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

const tables = [
  { file: 'names.json', query: 'names', orderBy: 'name' },
  { file: 'popularity.json', query: 'name_popularity', orderBy: 'name_id, country, year' },
  { file: 'categories.json', query: 'name_categories', orderBy: 'name_id' },
  { file: 'variants.json', query: 'name_variants', orderBy: 'name_id' },
  { file: 'countries.json', query: 'countries', orderBy: 'code' },
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * When run with D1 (e.g. in CI with wrangler):
 * - Use wrangler d1 execute to dump to JSON, or
 * - Use a Worker that reads D1 and writes to KV/R2, or
 * - Use wrangler d1 export for backup then parse.
 *
 * This stub writes existing /data files if present, or placeholder arrays.
 * Replace the actual fetch from D1 with your preferred method.
 */
function exportTable(tableName, orderBy) {
  const filePath = path.join(DATA_DIR, tableName + '.json');
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf8');
    try {
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }
  return [];
}

function run() {
  ensureDir(DATA_DIR);
  tables.forEach(({ file, query }) => {
    const filePath = path.join(DATA_DIR, file);
    const baseName = path.basename(file, '.json');
    const data = exportTable(baseName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log('Written:', filePath);
  });
  console.log('Export complete. With D1: run wrangler d1 execute / export and overwrite these files.');
}

run();
