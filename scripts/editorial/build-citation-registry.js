#!/usr/bin/env node
/**
 * Phase 8A — Build canonical citation registry from editorial source references.
 */

const {
  CITATION_PATHS,
  discoverAllSources,
  buildCitationRegistry,
  writeJson,
} = require('./citation-infrastructure-v1.js');

function main() {
  const discovered = discoverAllSources();
  const registry = buildCitationRegistry(discovered);
  writeJson(CITATION_PATHS.registry, registry);

  console.log('Citation registry built.');
  console.log('  Raw source entries:', registry.stats.rawSourceEntries);
  console.log('  Unique raw references:', registry.stats.uniqueRawReferences);
  console.log('  Unique publications:', registry.stats.uniquePublications);
  console.log('  Duplicate publications removed:', registry.stats.duplicatePublicationsRemoved);
  console.log('  Output:', CITATION_PATHS.registry);
}

main();
