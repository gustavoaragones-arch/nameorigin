#!/usr/bin/env node
/**
 * delete-flat-name-pages.js — Phase 2.25A Step 2.
 * Deletes all name/<slug>.html flat files. Keeps only name/<slug>/index.html.
 * Run after updating the generator and before or after regenerating name pages.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = process.env.OUT_DIR ? path.join(ROOT, process.env.OUT_DIR) : ROOT;
const NAME_DIR = path.join(OUT_DIR, 'name');

function run() {
  if (!fs.existsSync(NAME_DIR)) {
    console.log('No name/ directory at', NAME_DIR);
    process.exit(0);
    return;
  }
  const entries = fs.readdirSync(NAME_DIR, { withFileTypes: true });
  let deleted = 0;
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (!e.name.endsWith('.html')) continue;
    const full = path.join(NAME_DIR, e.name);
    fs.unlinkSync(full);
    deleted++;
  }
  console.log('Deleted', deleted, 'flat name/*.html files. Kept name/<slug>/index.html only.');
  process.exit(0);
}

run();
