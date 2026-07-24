/**
 * lib/render/pronunciation.js — Phase 4C Pronunciation Activation.
 *
 * Single rendering policy for pronunciation assertions in page output.
 * Every pronunciation statement is exactly one of:
 *   - available  (non-empty record.phonetic that is not a known fallback marker)
 *   - empty      (explicit missing-information — never guessed or placeholder prose)
 *   - computed   (reserved — not implemented)
 *
 * Does not read datasets or adapters — callers pass legacy/enriched name records.
 * No rewriting, IPA generation, or phonetic inference.
 */

const FALLBACK_MARKERS = [
  'easy to pronounce',
  'easy pronunciation',
  'pronunciation varies',
  'commonly pronounced',
  'generally pronounced',
  'phonetic guide on file',
  'ask speakers you trust',
];

const DISCLOSED_UNKNOWN_TABLE = '—';
const DISCLOSED_UNKNOWN_SENTENCE = 'Pronunciation is not currently available in our sources.';
const DISCLOSED_UNKNOWN_SHORT = 'pronunciation not recorded in our sources';

function disclosedEmpty() {
  return {
    kind: 'empty',
    hasPronunciation: false,
    text: '',
    displayText: DISCLOSED_UNKNOWN_SENTENCE,
    tableLabel: DISCLOSED_UNKNOWN_TABLE,
    metaPhrase: DISCLOSED_UNKNOWN_SHORT,
  };
}

function isFallbackMarker(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase().trim();
  return FALLBACK_MARKERS.some((m) => lower.includes(m));
}

/** @param {object} record - legacy or enriched flat name record */
function resolvePronunciation(record) {
  if (!record) return disclosedEmpty();
  const raw = (record.phonetic != null ? String(record.phonetic) : '').trim();
  if (!raw || isFallbackMarker(raw)) return disclosedEmpty();
  return {
    kind: 'available',
    hasPronunciation: true,
    text: raw,
    displayText: raw,
    tableLabel: raw,
    metaPhrase: raw,
  };
}

function recordHasPronunciation(record) {
  return resolvePronunciation(record).hasPronunciation;
}

function pronunciationTableLabel(record) {
  return resolvePronunciation(record).tableLabel;
}

function paaPronunciationAnswer(name, record) {
  const p = resolvePronunciation(record);
  if (p.hasPronunciation) {
    return `We list the pronunciation as ${p.displayText}. Say it with your chosen middle and surname to hear the full rhythm.`;
  }
  return DISCLOSED_UNKNOWN_SENTENCE;
}

function snippetBulletText(record) {
  const p = resolvePronunciation(record);
  if (p.hasPronunciation) return `Documented pronunciation: ${p.displayText}`;
  return DISCLOSED_UNKNOWN_SENTENCE;
}

module.exports = {
  FALLBACK_MARKERS,
  DISCLOSED_UNKNOWN_TABLE,
  DISCLOSED_UNKNOWN_SENTENCE,
  DISCLOSED_UNKNOWN_SHORT,
  resolvePronunciation,
  recordHasPronunciation,
  pronunciationTableLabel,
  paaPronunciationAnswer,
  snippetBulletText,
  isFallbackMarker,
};
