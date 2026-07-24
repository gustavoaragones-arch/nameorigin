/**
 * lib/canonical/util.js — tiny shared helpers for the domain builders.
 * Deliberately minimal: domain-specific logic stays in each domain's own
 * module (see lib/canonical/domains/README below each file's header) so
 * that "no module may populate another domain" stays easy to audit.
 */

/** True for null/undefined/''/whitespace-only/empty-array/empty-object. 0 and false are real values, not blank. */
function isBlank(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

/** Returns v unless it's blank, in which case returns null — never a fallback string. */
function nullIfBlank(v) {
  return isBlank(v) ? null : v;
}

/** Returns null if every value in obj is null/undefined, else obj. Used so a domain is `null` as a whole rather than `{ allFieldsNull: true }`. */
function nullIfAllFieldsBlank(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const hasAny = Object.values(obj).some((v) => !isBlank(v));
  return hasAny ? obj : null;
}

module.exports = { isBlank, nullIfBlank, nullIfAllFieldsBlank };
