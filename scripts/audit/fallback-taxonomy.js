#!/usr/bin/env node
/**
 * scripts/audit/fallback-taxonomy.js — Phase 1C / PART 3: Fallback
 * Taxonomy (READ-ONLY).
 *
 * This is the PERMANENT catalog. It reports scripts/audit/knowledge-lib.js
 * FALLBACK_MARKERS directly (extended, not duplicated) — every fallback
 * mechanism discovered in Phase 1B or Phase 1C lives in that one array.
 * Adding a newly-discovered fallback in the future means adding one entry
 * to FALLBACK_MARKERS; this script and audit/empty-knowledge.json (Phase
 * 1B) will both pick it up automatically on their next run, with no
 * duplicate literal strings maintained anywhere else.
 */

const { allHtmlFiles, writeAuditJson } = require('./_lib.js');
const { FALLBACK_MARKERS, countFilesContainingMarker } = require('./knowledge-lib.js');
const { classify } = require('./classify.js');

function run() {
  console.log('PART 3 — Fallback Taxonomy (permanent catalog)');
  const htmlFiles = allHtmlFiles();

  // De-duplication check: no two markers may share an id.
  const ids = FALLBACK_MARKERS.map((m) => m.id);
  const dupeIds = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupeIds.length) throw new Error('Duplicate fallback marker ids found: ' + dupeIds.join(', '));

  const taxonomy = FALLBACK_MARKERS.map((m) => {
    const pool = htmlFiles.filter((f) => m.appliesTo.includes(classify(f).category));
    const matches = countFilesContainingMarker(pool, m.marker);
    return {
      id: m.id,
      kind: m.kind,
      generator: m.sourceFunction.split('::')[0].trim().split('(')[0].trim(),
      function: m.sourceFunction,
      lines: m.sourceLines,
      literalFallback: m.marker,
      datasetField: m.attribute,
      templates: m.appliesTo,
      pagesScanned: pool.length,
      pagesAffected: matches,
      fallbackRatePct: Number(((100 * matches) / pool.length).toFixed(2)),
      description: m.description,
    };
  });

  const byKind = { fallback: taxonomy.filter((t) => t.kind === 'fallback').length, 'disclosed-missing': taxonomy.filter((t) => t.kind === 'disclosed-missing').length };

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    permanentCatalogSource: 'scripts/audit/knowledge-lib.js :: FALLBACK_MARKERS',
    howToExtend: 'Add a new entry to FALLBACK_MARKERS in scripts/audit/knowledge-lib.js (id, attribute, marker, kind, appliesTo, sourceFunction, sourceLines, description). Every script that imports it — this one, audit/empty-knowledge.json (Phase 1B), and scripts/audit/truthfulness-lib.js (Phase 1C) — picks up the new entry automatically on next run.',
    mechanismCount: taxonomy.length,
    mechanismsByKind: byKind,
    mechanisms: taxonomy,
    duplicateCheck: { duplicateIdsFound: dupeIds, pass: dupeIds.length === 0 },
    notes: [
      '"fallback" mechanisms substitute a generic phrase that reads as a specific claim about the entity; "disclosed-missing" mechanisms substitute an honest placeholder or silently omit the section. Both are "fallback mechanisms" in the general sense (something renders when data is absent) but only the former is truthfulness-negative.',
      'pagesAffected/fallbackRatePct are computed fresh against the currently-generated HTML on every run, so this file never goes stale relative to what is actually on disk.',
    ],
  };

  writeAuditJson('fallback-taxonomy.json', report);
  console.log('Mechanisms cataloged:', taxonomy.length, '(', byKind.fallback, 'fallback /', byKind['disclosed-missing'], 'disclosed-missing )');
}

run();
