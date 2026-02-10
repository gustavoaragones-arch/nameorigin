#!/usr/bin/env node
/**
 * Step 2 — Raw data pipeline: Australia (ABS / data.gov.au).
 * ABS and state sources often provide Excel or CSV. This script:
 * - Looks for raw-data/australia/*.csv (or a single CSV you place there).
 * - Parses CSV and outputs normalized temp data to raw-data/australia/normalized.json.
 * Manual: download from https://data.gov.au/data/dataset/popular-baby-names1 or ABS, export CSV to raw-data/australia/.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RAW_AU = path.join(ROOT, 'raw-data', 'australia');
const NORMALIZED_PATH = path.join(RAW_AU, 'normalized.json');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; continue; }
    if (!inQuotes && (c === ',' || c === '\t')) { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

function parseCsvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
  const nameIdx = header.findIndex((h) => /name|first_name|given/i.test(h));
  const rankIdx = header.findIndex((h) => /rank/i.test(h));
  const countIdx = header.findIndex((h) => /count|number|frequency/i.test(h));
  const yearIdx = header.findIndex((h) => /year/i.test(h));
  const sexIdx = header.findIndex((h) => /sex|gender/i.test(h));
  if (nameIdx < 0) return [];

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const name = cells[nameIdx] && cells[nameIdx].replace(/^"|"$/g, '').trim();
    if (!name) continue;
    let gender = 'unisex';
    if (sexIdx >= 0 && cells[sexIdx]) {
      const s = String(cells[sexIdx]).toLowerCase();
      if (s.includes('male') && !s.includes('female')) gender = 'boy';
      else if (s.includes('female') || s === 'f') gender = 'girl';
    }
    const year = yearIdx >= 0 && cells[yearIdx] ? parseInt(String(cells[yearIdx]).slice(0, 4), 10) : null;
    const count = countIdx >= 0 && cells[countIdx] ? parseInt(String(cells[countIdx]).replace(/,/g, ''), 10) : null;
    const rank = rankIdx >= 0 && cells[rankIdx] ? parseInt(String(cells[rankIdx]).replace(/,/g, ''), 10) : null;
    rows.push({
      name,
      gender,
      year: Number.isNaN(year) ? null : year,
      count: Number.isNaN(count) ? null : count,
      rank: Number.isNaN(rank) ? null : rank,
    });
  }
  return rows;
}

function main() {
  ensureDir(RAW_AU);

  const rows = [];
  const files = fs.existsSync(RAW_AU) ? fs.readdirSync(RAW_AU) : [];
  const csvFiles = files.filter((f) => f.endsWith('.csv'));
  if (csvFiles.length === 0) {
    fs.writeFileSync(NORMALIZED_PATH, '[]', 'utf8');
    console.log('No CSV in raw-data/australia/. Wrote empty', NORMALIZED_PATH);
    console.log('Add CSV from data.gov.au or ABS to raw-data/australia/ and re-run.');
    return;
  }
  for (const f of csvFiles) {
    const full = path.join(RAW_AU, f);
    if (!fs.statSync(full).isFile()) continue;
    rows.push(...parseCsvFile(full));
  }
  fs.writeFileSync(NORMALIZED_PATH, JSON.stringify(rows, null, 0), 'utf8');
  console.log('Wrote', rows.length, 'rows to', NORMALIZED_PATH);
}

main();
