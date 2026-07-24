/**
 * lib/render/origin.js — Phase 4A Origin Activation.
 *
 * Single truthfulness policy for origin assertions in page output.
 * Every origin statement is exactly one of:
 *   - researched  (origin_country, language, or origin_cluster on the record)
 *   - disclosed-unknown (explicit missing-information — never fallback prose)
 *
 * Computed derivations (e.g. Indo-European from "Greek") are built in section
 * helpers only when a researched origin string is present.
 *
 * Does not read datasets or adapters — callers pass legacy/enriched name records.
 */

const FALLBACK_MARKERS = [
  'various origins',
  'multiple traditions',
  'various linguistic traditions',
  'various cultural traditions',
  'multiple naming traditions',
  'diverse cultural',
  'multiple cultures',
  'drawn from diverse cultural traditions',
  'multicultural appeal',
  'broad cultural appeal',
  'multiple cultural sources',
  'diverse cultural influences',
  'roots in multiple cultures',
];

const DISCLOSED_UNKNOWN_TABLE = '—';
const DISCLOSED_UNKNOWN_SENTENCE = 'Origin is not recorded in our sources.';
const DISCLOSED_UNKNOWN_SHORT = 'origin not recorded in our sources';

function disclosedUnknown() {
  return {
    kind: 'disclosed-unknown',
    hasOrigin: false,
    country: '',
    cluster: '',
    language: '',
    primary: DISCLOSED_UNKNOWN_SENTENCE,
    label: DISCLOSED_UNKNOWN_TABLE,
    combinedLabel: DISCLOSED_UNKNOWN_SENTENCE,
    displayLabel: DISCLOSED_UNKNOWN_SENTENCE,
    tableLabel: DISCLOSED_UNKNOWN_TABLE,
    metaPhrase: DISCLOSED_UNKNOWN_SHORT,
    originKey: '',
    languageKey: '',
  };
}

/** @param {object} record - legacy or enriched flat name record */
function resolveOrigin(record) {
  if (!record) return disclosedUnknown();
  const country = (record.origin_country || '').trim();
  const cluster = (record.origin_cluster || '').trim();
  const language = (record.language || '').trim();

  if (country || language) {
    const label = [country, language].filter(Boolean).join(' · ');
    const combined = [country, language].filter(Boolean).join(' and ');
    const primary = country || language;
    return {
      kind: 'researched',
      hasOrigin: true,
      country,
      cluster,
      language,
      primary,
      label,
      combinedLabel: combined,
      displayLabel: primary,
      tableLabel: label,
      metaPhrase: primary,
      originKey: (country || language).toLowerCase().replace(/\s+/g, ''),
      languageKey: (language || country || '').toLowerCase().replace(/\s+/g, ''),
    };
  }
  if (cluster) {
    return {
      kind: 'researched',
      hasOrigin: true,
      country: '',
      cluster,
      language: '',
      primary: cluster,
      label: cluster,
      combinedLabel: cluster,
      displayLabel: cluster,
      tableLabel: cluster,
      metaPhrase: cluster,
      originKey: cluster.toLowerCase().replace(/\s+/g, ''),
      languageKey: cluster.toLowerCase().replace(/\s+/g, ''),
    };
  }
  return disclosedUnknown();
}

function matchesRecordOrigin(record, otherRecord) {
  const a = resolveOrigin(record);
  const b = resolveOrigin(otherRecord);
  if (!a.hasOrigin || !b.hasOrigin) return false;
  if (a.originKey && (a.originKey === b.originKey || a.originKey === b.languageKey)) return true;
  if (a.languageKey && (a.languageKey === b.originKey || a.languageKey === b.languageKey)) return true;
  return false;
}

function recordHasOriginKey(record) {
  return resolveOrigin(record).hasOrigin;
}

function originKeyForMatching(record) {
  const o = resolveOrigin(record);
  return o.hasOrigin ? o.originKey || o.languageKey : '';
}

function isFallbackMarker(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase();
  return FALLBACK_MARKERS.some((m) => lower.includes(m));
}

function introOriginDisplay(record) {
  const o = resolveOrigin(record);
  return o.hasOrigin ? o.displayLabel : null;
}

function faqOriginRootsPhrase(record) {
  const o = resolveOrigin(record);
  if (o.hasOrigin) return `${o.combinedLabel} naming roots`;
  return DISCLOSED_UNKNOWN_SHORT;
}

function whereFromPhrase(record) {
  const o = resolveOrigin(record);
  if (o.hasOrigin) return o.combinedLabel;
  return DISCLOSED_UNKNOWN_SHORT;
}

module.exports = {
  FALLBACK_MARKERS,
  DISCLOSED_UNKNOWN_TABLE,
  DISCLOSED_UNKNOWN_SENTENCE,
  DISCLOSED_UNKNOWN_SHORT,
  resolveOrigin,
  matchesRecordOrigin,
  recordHasOriginKey,
  originKeyForMatching,
  isFallbackMarker,
  introOriginDisplay,
  faqOriginRootsPhrase,
  whereFromPhrase,
};
