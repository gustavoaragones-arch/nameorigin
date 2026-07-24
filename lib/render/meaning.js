/**
 * lib/render/meaning.js — Phase 4B Meaning Activation.
 *
 * Single truthfulness policy for meaning assertions in page output.
 * Every meaning statement is exactly one of:
 *   - researched  (non-empty record.meaning that is not a known fallback marker)
 *   - disclosed-unknown (explicit missing-information — never fallback prose)
 *   - computed (reserved — only when deterministically derived from researched data;
 *               none implemented yet)
 *
 * Does not read datasets or adapters — callers pass legacy/enriched name records.
 */

const FALLBACK_MARKERS = [
  'documented given name',
  'a documented given name',
  'meaning varies',
  'meaning uncertain',
  'meaning has evolved',
  'traditionally interpreted',
  'often interpreted as',
  'commonly believed',
  'is thought to mean',
  'traditionally associated',
];

const DISCLOSED_UNKNOWN_TABLE = '—';
const DISCLOSED_UNKNOWN_SENTENCE = 'A documented meaning is not currently available in our sources.';
const DISCLOSED_UNKNOWN_SHORT = 'meaning not recorded in our sources';

function disclosedUnknown() {
  return {
    kind: 'disclosed-unknown',
    hasMeaning: false,
    text: '',
    displayText: DISCLOSED_UNKNOWN_SENTENCE,
    tableLabel: DISCLOSED_UNKNOWN_TABLE,
    metaPhrase: DISCLOSED_UNKNOWN_SHORT,
    quoted: '',
  };
}

function isFallbackMarker(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase().trim();
  return FALLBACK_MARKERS.some((m) => lower.includes(m));
}

/** @param {object} record - legacy or enriched flat name record */
function resolveMeaning(record) {
  if (!record) return disclosedUnknown();
  const raw = (record.meaning != null ? String(record.meaning) : '').trim();
  if (!raw || isFallbackMarker(raw)) return disclosedUnknown();
  return {
    kind: 'researched',
    hasMeaning: true,
    text: raw,
    displayText: raw,
    tableLabel: raw,
    metaPhrase: raw.replace(/"/g, "'"),
    quoted: raw,
  };
}

function recordHasMeaning(record) {
  return resolveMeaning(record).hasMeaning;
}

function meaningTableLabel(record) {
  return resolveMeaning(record).tableLabel;
}

function meaningSnippet(record, maxLen = 80) {
  const m = resolveMeaning(record);
  if (!m.hasMeaning) return '';
  if (m.text.length <= maxLen) return m.text;
  return m.text.slice(0, maxLen).trim() + '…';
}

module.exports = {
  FALLBACK_MARKERS,
  DISCLOSED_UNKNOWN_TABLE,
  DISCLOSED_UNKNOWN_SENTENCE,
  DISCLOSED_UNKNOWN_SHORT,
  resolveMeaning,
  recordHasMeaning,
  meaningTableLabel,
  meaningSnippet,
  isFallbackMarker,
};
