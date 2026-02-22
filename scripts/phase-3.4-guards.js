#!/usr/bin/env node
/**
 * Phase 3.4 — Hard guards before writing any HTML.
 * Throws if wordCount < 400, internalLinks < 20, or meta description missing.
 * Use in all page generators before fs.writeFileSync of HTML.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = process.env.OUT_DIR ? path.join(ROOT, process.env.OUT_DIR) : ROOT;
const MIN_WORDS = 400;
const MIN_INTERNAL_LINKS = 20;

function getMainContentText(html) {
  if (!html || typeof html !== 'string') return '';
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const block = mainMatch ? mainMatch[1] : html;
  return block.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function countWords(text) {
  return (text || '').split(/\s+/).filter(Boolean).length;
}

function countInternalLinks(html, siteHost = 'nameorigin.io') {
  if (!html || typeof html !== 'string') return 0;
  let count = 0;
  const re = /<a\s+[^>]*href\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const href = (m[1] || '').trim();
    if (href.startsWith('/') || href.includes(siteHost)) count += 1;
  }
  return count;
}

function hasMetaDescription(html) {
  if (!html || typeof html !== 'string') return false;
  const descMatch = html.match(/<meta\s+name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
    html.match(/<meta\s+content=["']([^"']*)["'][^>]*name=["']description["']/i);
  return descMatch && descMatch[1] && descMatch[1].trim().length > 0;
}

/** Pathname (e.g. /names/boy or /name/liam/) to file path. Matches index-integrity-audit pathToFilePath. */
function pathToFilePath(pathname) {
  const p = (pathname || '').replace(/^\//, '').replace(/\/$/, '').trim();
  if (!p) return path.join(OUT_DIR, 'index.html');
  if (p === 'names') return path.join(OUT_DIR, 'names', 'index.html');
  if (p.includes('.html')) return path.join(OUT_DIR, p);
  const withIndex = path.join(OUT_DIR, p, 'index.html');
  if (fs.existsSync(withIndex)) return withIndex;
  const withHtml = path.join(OUT_DIR, p + '.html');
  if (fs.existsSync(withHtml)) return withHtml;
  return withIndex;
}

function pathExists(pathname) {
  return fs.existsSync(pathToFilePath(pathname));
}

/**
 * Throw if HTML violates Phase 3.4 thresholds.
 * @param {string} html - Full HTML
 * @param {string} fileRel - File path for error message (e.g. 'name/liam/index.html')
 */
function assertPageThresholds(html, fileRel = '') {
  const words = countWords(getMainContentText(html));
  const links = countInternalLinks(html);
  const hasDesc = hasMetaDescription(html);
  if (words < MIN_WORDS) {
    throw new Error(`Phase 3.4 guard: ${fileRel} has ${words} words (min ${MIN_WORDS})`);
  }
  if (links < MIN_INTERNAL_LINKS) {
    throw new Error(`Phase 3.4 guard: ${fileRel} has ${links} internal links (min ${MIN_INTERNAL_LINKS})`);
  }
  if (!hasDesc) {
    throw new Error(`Phase 3.4 guard: ${fileRel} missing meta description`);
  }
}

/**
 * Write HTML file only if it passes Phase 3.4 guards.
 * @param {string} fullPath - Absolute path to write
 * @param {string} html - HTML content
 * @param {string} relPath - Relative path for error messages
 */
function writeHtmlWithGuard(fullPath, html, relPath) {
  const rel = relPath || fullPath.replace(OUT_DIR, '').replace(/^[/\\]/, '').replace(/\\/g, '/');
  assertPageThresholds(html, rel);
  fs.writeFileSync(fullPath, html, 'utf8');
}

module.exports = {
  MIN_WORDS,
  MIN_INTERNAL_LINKS,
  getMainContentText,
  countWords,
  countInternalLinks,
  hasMetaDescription,
  pathToFilePath,
  pathExists,
  assertPageThresholds,
  writeHtmlWithGuard,
};
