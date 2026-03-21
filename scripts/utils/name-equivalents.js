/**
 * Phase 5.2 — Name equivalence (controlled dataset only).
 * Sync load, no async, no external deps. Never throws.
 *
 * Valid slugs are a closed set from data/names-enriched.json only (hard filter).
 * Logs one line when invalid equivalent slugs are dropped (dirty dataset signal).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

let equivData = {};
/** @type {Set<string>} */
let validNames = new Set();

function normSlug(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/** Record slug for names list: use explicit n.slug when present, else derive from n.name. */
function recordSlug(n) {
  if (!n) return '';
  if (n.slug != null && String(n.slug).trim() !== '') return normSlug(n.slug);
  return normSlug(n.name);
}

function loadEquivFile() {
  try {
    const p = path.join(ROOT, 'data', 'name-equivalents.json');
    if (!fs.existsSync(p)) return;
    equivData = JSON.parse(fs.readFileSync(p, 'utf8')) || {};
  } catch (_) {
    equivData = {};
  }
}

function loadValidNames() {
  try {
    const enrichedPath = path.join(ROOT, 'data', 'names-enriched.json');
    if (!fs.existsSync(enrichedPath)) {
      validNames = new Set();
      return;
    }
    const names = JSON.parse(fs.readFileSync(enrichedPath, 'utf8'));
    validNames = new Set((names || []).map((n) => recordSlug(n)).filter(Boolean));
  } catch (_) {
    validNames = new Set();
  }
}

loadEquivFile();
loadValidNames();

/**
 * @param {string} nameSlug
 * @returns {{ lang: string, slug: string }[]}
 */
function getEquivalents(nameSlug) {
  try {
    const key = normSlug(nameSlug);
    if (!key || !validNames.has(key)) return [];
    if (!equivData[key]) return [];

    const entry = equivData[key];
    const raw = Array.isArray(entry.equivalents) ? entry.equivalents : [];

    let hadInvalidEquivalent = false;
    for (const e of raw) {
      if (!e || e.slug == null || String(e.slug).trim() === '') continue;
      const s = normSlug(e.slug);
      if (s && !validNames.has(s)) hadInvalidEquivalent = true;
    }
    if (hadInvalidEquivalent) {
      console.log('Filtered invalid equivalents for:', key);
    }

    const seen = new Set();
    const out = [];
    for (const e of raw) {
      if (!e || e.slug == null || String(e.slug).trim() === '') continue;
      const s = normSlug(e.slug);
      if (!s || !validNames.has(s)) continue;
      if (seen.has(s)) continue;
      seen.add(s);
      const lang = String(e.lang || '').trim() || 'Other';
      out.push({ lang, slug: s });
      if (out.length >= 6) break;
    }

    return out.length === 0 ? [] : out;
  } catch (_) {
    return [];
  }
}

module.exports = { getEquivalents, normSlug };
