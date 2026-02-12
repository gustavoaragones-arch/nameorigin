#!/usr/bin/env node
/**
 * minify-css.js — Step 8 Core Web Vitals: produce minified CSS.
 * Reads styles.css, strips comments and collapses whitespace, writes styles.min.css.
 * Run before deploy so pages load /styles.min.css (non-blocking, smaller).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const src = path.join(ROOT, 'styles.css');
const out = path.join(ROOT, 'styles.min.css');

if (!fs.existsSync(src)) {
  console.error('styles.css not found');
  process.exit(1);
}

let css = fs.readFileSync(src, 'utf8');
// Remove /* ... */ comments (including multi-line)
css = css.replace(/\/\*[\s\S]*?\*\//g, '');
// Collapse whitespace: newlines and multiple spaces to single space
css = css.replace(/\s+/g, ' ').trim();
fs.writeFileSync(out, css, 'utf8');
console.log('Written styles.min.css (' + Buffer.byteLength(css, 'utf8') + ' bytes)');
