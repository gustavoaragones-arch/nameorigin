#!/usr/bin/env node
/**
 * Phase 6A — Rebuild data/names-enriched.json from base names + editorial knowledge.
 *
 * Primary source: data/knowledge-records.json (Knowledge Record v2)
 * Compatibility source: legacy per-domain override files
 *
 * Priority per field:
 *   origin fields         — editorial override > null (no base origin guessing)
 *   meaning field         — editorial override > base names.json meaning > null
 *   phonetic field        — editorial override > base names.json phonetic > null
 *   etymology field       — editorial override > base names.json etymology > null
 *   history field         — editorial override > base names.json history > null
 */

const fs = require('fs');
const {
  PATHS,
  loadJson,
  resolveEditorialOverrideBundle,
  buildEnrichedNames,
  summarizeEnriched,
} = require('./knowledge-record-v2.js');

const OUT_PATH = PATHS.names.replace('names.json', 'names-enriched.json');

function main() {
  const names = loadJson(PATHS.names, []);
  const { source, bundle } = resolveEditorialOverrideBundle({ preferKnowledgeRecords: true });
  const enriched = buildEnrichedNames(names, bundle);

  fs.writeFileSync(OUT_PATH, JSON.stringify(enriched, null, 0), 'utf8');

  const summary = summarizeEnriched(enriched);
  console.log('Wrote', summary.entityCount, 'names to', OUT_PATH);
  console.log('Editorial source:', source);
  console.log('Names with origin assigned (override only):', summary.withOrigin);
  console.log('Names with meaning assigned:', summary.withMeaning);
  console.log('Names with pronunciation assigned:', summary.withPronunciation);
  console.log('Names with etymology assigned:', summary.withEtymology);
  console.log('Names with history assigned:', summary.withHistory);
}

main();
