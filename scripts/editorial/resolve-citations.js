#!/usr/bin/env node
/**
 * Phase 8A — Resolve Knowledge Record sources to canonical Citation IDs.
 * Does not modify Knowledge Record v2 or enrichment output.
 */

const {
  CITATION_PATHS,
  discoverAllSources,
  buildCitationRegistry,
  resolveKnowledgeRecordCitations,
  loadJson,
  writeJson,
} = require('./citation-infrastructure-v1.js');

function main() {
  if (!require('fs').existsSync(CITATION_PATHS.registry)) {
    throw new Error('Missing citation registry — run build-citation-registry.js first.');
  }

  const registry = loadJson(CITATION_PATHS.registry);
  const discovered = discoverAllSources();
  const resolutions = resolveKnowledgeRecordCitations(registry, discovered);

  if (resolutions.stats.unresolvedReferences > 0) {
    console.error('Unresolved source references:', resolutions.stats.unresolvedReferences);
    console.error(resolutions.unresolved.slice(0, 10));
    throw new Error('Citation resolution failed — unresolved references remain.');
  }

  writeJson(CITATION_PATHS.resolutions, resolutions);

  console.log('Citation resolution complete.');
  console.log('  Records with citations:', resolutions.stats.recordsWithCitations);
  console.log('  Total source references:', resolutions.stats.totalSourceReferences);
  console.log('  Resolved references:', resolutions.stats.resolvedReferences);
  console.log('  Resolution rate:', resolutions.stats.resolutionRatePct + '%');
  console.log('  Output:', CITATION_PATHS.resolutions);
}

main();
