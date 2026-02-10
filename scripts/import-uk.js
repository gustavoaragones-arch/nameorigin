#!/usr/bin/env node
/**
 * Step 2 — Raw data pipeline: UK (England and Wales) — ONS.
 * ONS provides Excel (.xlsx); no direct CSV. This script:
 * - Looks for raw-data/uk/*.csv (if you export CSV from ONS or use a pre-built CSV).
 * - Or looks for raw-data/uk/boys.csv and raw-data/uk/girls.csv (manual export).
 * Parses CSV and outputs normalized temp data to raw-data/uk/normalized.json.
 * Manual: download from https://www.ons.gov.uk/.../babynamesenglandandwalesbabynamesstatisticsgirls (and boys), export as CSV into raw-data/uk/.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RAW_UK = path.join(ROOT, 'raw-data', 'uk');
const NORMALIZED_PATH = path.join(RAW_UK, 'normalized.json');

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
  const nameIdx = header.findIndex((h) => /name|first_name|babyname/i.test(h));
  const rankIdx = header.findIndex((h) => /rank/i.test(h));
  const countIdx = header.findIndex((h) => /count|number|frequency/i.test(h));
  const yearIdx = header.findIndex((h) => /year/i.test(h));
  if (nameIdx < 0) return [];

  const rows = [];
  const gender = filePath.toLowerCase().includes('girl') ? 'girl' : 'boy';
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const name = cells[nameIdx] && cells[nameIdx].replace(/^"|"$/g, '').trim();
    if (!name) continue;
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
  ensureDir(RAW_UK);

  const rows = [];
  const files = fs.existsSync(RAW_UK) ? fs.readdirSync(RAW_UK) : [];
  const csvFiles = files.filter((f) => f.endsWith('.csv'));
  if (csvFiles.length === 0) {
    fs.writeFileSync(NORMALIZED_PATH, '[]', 'utf8');
    console.log('No CSV in raw-data/uk/. Wrote empty', NORMALIZED_PATH);
    console.log('Add boys.csv and girls.csv (export from ONS Excel) to raw-data/uk/ and re-run.');
    return;
  }
  for (const f of csvFiles) {
    const full = path.join(RAW_UK, f);
    if (!fs.statSync(full).isFile()) continue;
    rows.push(...parseCsvFile(full));
  }
  fs.writeFileSync(NORMALIZED_PATH, JSON.stringify(rows, null, 0), 'utf8');
  console.log('Wrote', rows.length, 'rows to', NORMALIZED_PATH);
}

main();
