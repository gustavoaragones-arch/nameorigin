/**
 * scripts/audit/_lib.js
 * Shared, READ-ONLY helpers for the Project Intelligence Engine (Phase 1A).
 *
 * Hard rule: every function in this file only reads from disk. Nothing here
 * writes, deletes, or modifies any file outside of /audit/*.json and
 * /audit/PROJECT_INTELLIGENCE_REPORT.md. Do not add fs.writeFileSync,
 * fs.rmSync, fs.unlinkSync, etc. targeting any other path.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const AUDIT_DIR = path.join(ROOT, 'audit');
const SCRIPTS_DIR = path.join(ROOT, 'scripts');

// Directories we never want to walk into when inventorying the repo.
const IGNORE_DIRS = new Set(['.git', 'node_modules', 'audit', '.wrangler', '.vscode']);

/** Recursively list all files under dir (relative to ROOT), skipping IGNORE_DIRS. */
function walk(dir, base = dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return out;
  }
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, base, out);
    } else if (entry.isFile()) {
      out.push(path.relative(base, full));
    }
  }
  return out;
}

/** Cached full-repo file listing (relative paths, posix separators). */
let _allFilesCache = null;
function allFiles() {
  if (_allFilesCache) return _allFilesCache;
  _allFilesCache = walk(ROOT).map((p) => p.split(path.sep).join('/'));
  return _allFilesCache;
}

function allHtmlFiles() {
  return allFiles().filter((p) => p.endsWith('.html'));
}

function fileSize(relPath) {
  try {
    return fs.statSync(path.join(ROOT, relPath)).size;
  } catch (e) {
    return 0;
  }
}

function readJsonSafe(absPath) {
  try {
    return JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function loadDataJson(name) {
  return readJsonSafe(path.join(DATA_DIR, name + '.json'));
}

function listDataJsonFiles() {
  let entries;
  try {
    entries = fs.readdirSync(DATA_DIR, { withFileTypes: true });
  } catch (e) {
    return [];
  }
  return entries.filter((e) => e.isFile() && e.name.endsWith('.json')).map((e) => e.name);
}

function readFileSafe(absPath) {
  try {
    return fs.readFileSync(absPath, 'utf8');
  } catch (e) {
    return null;
  }
}

/** Extract the /** ... *\/ or leading // header comment block from a JS source file. */
function extractHeaderComment(absPath) {
  const src = readFileSafe(absPath);
  if (!src) return null;
  const blockMatch = src.match(/\/\*\*?([\s\S]*?)\*\//);
  if (blockMatch) {
    return blockMatch[1]
      .split('\n')
      .map((l) => l.replace(/^\s*\*\s?/, '').trim())
      .filter((l) => l.length)
      .join(' ');
  }
  const lineComments = [];
  for (const line of src.split('\n')) {
    const t = line.trim();
    if (t.startsWith('//')) lineComments.push(t.replace(/^\/\/\s?/, ''));
    else if (t === '') continue;
    else break;
  }
  return lineComments.length ? lineComments.join(' ') : null;
}

function listScriptFiles(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return [];
  }
  return entries.filter((e) => e.isFile() && e.name.endsWith('.js')).map((e) => e.name).sort();
}

function ensureAuditDir() {
  if (!fs.existsSync(AUDIT_DIR)) fs.mkdirSync(AUDIT_DIR, { recursive: true });
}

/** The ONLY write function in the audit subsystem. Writes exclusively under /audit/. */
function writeAuditJson(filename, data) {
  ensureAuditDir();
  if (path.isAbsolute(filename) || filename.includes('..')) {
    throw new Error('writeAuditJson: refusing unsafe filename ' + filename);
  }
  const outPath = path.join(AUDIT_DIR, filename);
  if (path.dirname(outPath) !== AUDIT_DIR) {
    throw new Error('writeAuditJson: refusing to write outside /audit/: ' + outPath);
  }
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log('  wrote audit/' + filename);
}

function writeAuditText(filename, text) {
  ensureAuditDir();
  if (path.isAbsolute(filename) || filename.includes('..')) {
    throw new Error('writeAuditText: refusing unsafe filename ' + filename);
  }
  const outPath = path.join(AUDIT_DIR, filename);
  if (path.dirname(outPath) !== AUDIT_DIR) {
    throw new Error('writeAuditText: refusing to write outside /audit/: ' + outPath);
  }
  fs.writeFileSync(outPath, text, 'utf8');
  console.log('  wrote audit/' + filename);
}

function bytesToHuman(bytes) {
  if (bytes < 1024) return bytes + ' B';
  const units = ['KB', 'MB', 'GB'];
  let val = bytes;
  let u = -1;
  do {
    val /= 1024;
    u += 1;
  } while (val >= 1024 && u < units.length - 1);
  return val.toFixed(1) + ' ' + units[u];
}

module.exports = {
  ROOT,
  DATA_DIR,
  AUDIT_DIR,
  SCRIPTS_DIR,
  walk,
  allFiles,
  allHtmlFiles,
  fileSize,
  readJsonSafe,
  loadDataJson,
  listDataJsonFiles,
  readFileSafe,
  extractHeaderComment,
  listScriptFiles,
  ensureAuditDir,
  writeAuditJson,
  writeAuditText,
  bytesToHuman,
};
