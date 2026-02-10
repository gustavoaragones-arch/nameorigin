#!/usr/bin/env node
/**
 * Phase 1 — Fetch Canada baby names from Statistics Canada (Open Government).
 * Downloads CSV zip, parses, outputs data/raw/statcan-canada.json.
 * Format: [ { name, gender, year, count, rank }, ... ]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { RAW_DIR, SOURCES } = require('./config.js');

const STATCAN_URL = SOURCES.STATCAN_CANADA.url;
const ZIP_PATH = path.join(RAW_DIR, '17100147-eng.zip');
const EXTRACT_DIR = path.join(RAW_DIR, 'statcan');
const OUT_PATH = path.join(RAW_DIR, SOURCES.STATCAN_CANADA.rawFile);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function download(url, destPath) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const file = fs.createWriteStream(destPath);
    https.get(url, { headers: { 'User-Agent': 'nameorigin-acquire/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const loc = res.headers.location;
        if (loc) return download(loc.startsWith('http') ? loc : new URL(loc, url).href, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        return reject(new Error(`HTTP ${res.statusCode} ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => { if (fs.existsSync(destPath)) fs.unlinkSync(destPath); reject(err); });
  });
}

function findCsv(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      const found = findCsv(full);
      if (found) return found;
    } else if (e.name.endsWith('.csv')) return full;
  }
  return null;
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; continue; }
    if (!inQuotes && c === ',') { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

async function main() {
  ensureDir(RAW_DIR);
  ensureDir(EXTRACT_DIR);

  if (fs.existsSync(ZIP_PATH)) {
    console.log('Using existing', ZIP_PATH);
  } else {
    console.log('Downloading Statistics Canada CSV zip...');
    try {
      await download(STATCAN_URL, ZIP_PATH);
    } catch (e) {
      console.error(e.message);
      console.error('Manual fallback: download', STATCAN_URL, 'and save as', ZIP_PATH);
      process.exit(1);
    }
  }

  console.log('Extracting zip...');
  execSync(`unzip -o -q "${ZIP_PATH}" -d "${EXTRACT_DIR}"`, { stdio: 'inherit' });

  const csvPath = findCsv(EXTRACT_DIR);
  if (!csvPath) throw new Error('No CSV found in zip');

  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
  const nameIdx = header.findIndex((h) => /first_name|name|prenom/i.test(h));
  const sexIdx = header.findIndex((h) => /sex|gender|sexe/i.test(h));
  const yearIdx = header.findIndex((h) => /year|annee|ref_date/i.test(h));
  const countIdx = header.findIndex((h) => /number|count|valeur|value/i.test(h));
  const rankIdx = header.findIndex((h) => /rank|rang/i.test(h));

  if (nameIdx < 0) throw new Error('CSV missing name column. Header: ' + JSON.stringify(header));

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const name = cells[nameIdx] && cells[nameIdx].replace(/^"|"$/g, '').trim();
    if (!name) continue;
    let year = yearIdx >= 0 && cells[yearIdx] ? parseInt(String(cells[yearIdx]).slice(0, 4), 10) : null;
    if (Number.isNaN(year) || !year) year = null;
    const count = countIdx >= 0 && cells[countIdx] ? parseInt(String(cells[countIdx]).replace(/,/g, ''), 10) : null;
    const rank = rankIdx >= 0 && cells[rankIdx] ? parseInt(String(cells[rankIdx]).replace(/,/g, ''), 10) : null;
    let gender = 'unisex';
    if (sexIdx >= 0 && cells[sexIdx]) {
      const s = String(cells[sexIdx]).toLowerCase();
      if (s.includes('male') && !s.includes('female')) gender = 'boy';
      else if (s.includes('female') || s.includes('fille')) gender = 'girl';
    }
    rows.push({ name, gender, year, count: Number.isNaN(count) ? null : count, rank: Number.isNaN(rank) ? null : rank });
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(rows, null, 0), 'utf8');
  console.log('Wrote', rows.length, 'rows to', OUT_PATH);
}

main().catch((err) => { console.error(err); process.exit(1); });
