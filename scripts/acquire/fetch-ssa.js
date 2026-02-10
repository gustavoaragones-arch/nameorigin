#!/usr/bin/env node
/**
 * Phase 1 — Fetch USA baby names from SSA (public data).
 * Downloads names.zip, extracts yob*.txt, outputs data/raw/ssa-usa.json.
 * Format: [ { name, gender, year, count }, ... ]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { DATA_DIR, RAW_DIR, SOURCES } = require('./config.js');

const SSA_URL = SOURCES.SSA_USA.url;
const ZIP_PATH = path.join(RAW_DIR, 'ssa-names.zip');
const EXTRACT_DIR = path.join(RAW_DIR, 'ssa');
const OUT_PATH = path.join(RAW_DIR, SOURCES.SSA_USA.rawFile);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function download(url, destPath) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const file = fs.createWriteStream(destPath);
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    https.get(url, { headers: { 'User-Agent': ua, Accept: 'application/zip,*/*' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const loc = res.headers.location;
        if (loc) return download(loc.startsWith('http') ? loc : new URL(loc, url).href, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        return reject(new Error(`HTTP ${res.statusCode} ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => { fs.unlinkSync(destPath); reject(err); });
  });
}

async function main() {
  ensureDir(RAW_DIR);
  ensureDir(EXTRACT_DIR);

  if (fs.existsSync(ZIP_PATH)) {
    console.log('Using existing', ZIP_PATH);
  } else {
    console.log('Downloading SSA names.zip...');
    try {
      await download(SSA_URL, ZIP_PATH);
    } catch (e) {
      console.error(e.message);
      console.error('Manual fallback: download from https://www.ssa.gov/oact/babynames/names.zip and save as', ZIP_PATH);
      process.exit(1);
    }
  }

  console.log('Extracting zip...');
  execSync(`unzip -o -q "${ZIP_PATH}" -d "${EXTRACT_DIR}"`, { stdio: 'inherit' });

  const rows = [];
  const files = fs.readdirSync(EXTRACT_DIR).filter((f) => f.startsWith('yob') && f.endsWith('.txt'));
  for (const f of files) {
    const year = parseInt(f.replace(/^yob|\.txt$/g, ''), 10);
    if (Number.isNaN(year)) continue;
    const content = fs.readFileSync(path.join(EXTRACT_DIR, f), 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const [name, sex, countStr] = trimmed.split(',');
      if (!name || !sex) continue;
      const count = parseInt(countStr, 10);
      if (Number.isNaN(count)) continue;
      const gender = sex.toUpperCase() === 'M' ? 'boy' : 'girl';
      rows.push({ name: name.trim(), gender, year, count });
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(rows, null, 0), 'utf8');
  console.log('Wrote', rows.length, 'rows to', OUT_PATH);
}

main().catch((err) => { console.error(err); process.exit(1); });
