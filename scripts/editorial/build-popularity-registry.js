#!/usr/bin/env node
/**
 * Phase 9A — Build canonical popularity source registry.
 */

const {
  POPULARITY_PATHS,
  buildPopularityRegistry,
  writeJson,
} = require('./popularity-infrastructure-v1.js');

function main() {
  const registry = buildPopularityRegistry();
  writeJson(POPULARITY_PATHS.registry, registry);

  console.log('Popularity registry built.');
  console.log('  Registry sources:', registry.stats.registrySources);
  console.log('  Raw authority entries:', registry.stats.rawAuthorityEntries);
  console.log('  Duplicate authorities removed:', registry.stats.duplicateAuthoritiesRemoved);
  console.log('  Authority classes in registry:', registry.stats.authorityClassesRepresented.join(', '));
  console.log('  Output:', POPULARITY_PATHS.registry);
}

main();
