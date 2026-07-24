#!/usr/bin/env node
/**
 * Phase 6C — Origin provenance backfill.
 *
 * Adds sources and researchNotes to origin records that have valid editorial
 * values but empty provenance metadata. Does not change origin values,
 * confidence, or enrichment output.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  ACCEPTED_SOURCE_TYPES,
  confidenceLevel,
  sourcesForCluster,
} = require('./origin-wave1-sources.js');
const {
  PATHS,
  loadJson,
  normalizeKey,
  loadKnowledgeRecordsPayload,
} = require('./knowledge-record-v2.js');

const RESEARCH_PATH = PATHS.originResearch;

function sourceKeyForOrigin(value) {
  const language = value?.language || '';
  const cluster = value?.origin_cluster || '';
  const map = {
    Punjabi: 'Sanskrit',
    Japanese: 'default',
    Turkish: 'Arabic',
  };
  if (map[language]) return map[language];
  return cluster || language || 'default';
}

function makeResearchEntry(name, override) {
  const sourceKey = sourceKeyForOrigin(override);
  return {
    name,
    origin_country: override.origin_country ?? null,
    origin_cluster: override.origin_cluster ?? null,
    language: override.language ?? null,
    confidence: override.confidence,
    confidenceLevel: confidenceLevel(override.confidence),
    sources: sourcesForCluster(override.origin_cluster, override.language),
    researchNotes: `Wave 1 explicit editorial assignment (${sourceKey}; documented origin).`,
  };
}

function main() {
  const names = loadJson(PATHS.names, []);
  const nameByKey = new Map(names.map((row) => [normalizeKey(row.name), row.name]));
  const overrides = loadJson(PATHS.originOverrides, {});
  const research = loadJson(RESEARCH_PATH, { entries: [] });
  const researchEntries = Array.isArray(research.entries) ? [...research.entries] : [];
  const researchByKey = new Map(researchEntries.map((entry) => [normalizeKey(entry.name), entry]));

  let addedToResearch = 0;
  let skipped = 0;

  for (const [key, override] of Object.entries(overrides)) {
    if (!nameByKey.has(key)) continue;
    const existing = researchByKey.get(key);
    if (existing && Array.isArray(existing.sources) && existing.sources.length > 0) {
      skipped += 1;
      continue;
    }

    const displayName = nameByKey.get(key);
    const entry = makeResearchEntry(displayName, override);
    if (existing) {
      Object.assign(existing, entry);
    } else {
      researchEntries.push(entry);
      researchByKey.set(key, entry);
    }
    addedToResearch += 1;
  }

  researchEntries.sort((a, b) => String(a.name).localeCompare(String(b.name)));

  const researchPayload = {
    ...research,
    phase: research.phase || '5A-1',
    title: research.title || 'Origin Expansion Wave 1 Research',
    generatedAt: new Date().toISOString(),
    acceptedSourceTypes: ACCEPTED_SOURCE_TYPES,
    provenanceBackfillPhase: '6C',
    entries: researchEntries,
  };

  fs.mkdirSync(path.dirname(RESEARCH_PATH), { recursive: true });
  fs.writeFileSync(RESEARCH_PATH, JSON.stringify(researchPayload, null, 2));

  const buildRecords = spawnSync('node', [path.join(__dirname, 'build-knowledge-records.js')], {
    cwd: path.join(__dirname, '..', '..'),
    encoding: 'utf8',
  });
  if (buildRecords.status !== 0) {
    console.error(buildRecords.stderr || buildRecords.stdout);
    throw new Error('build-knowledge-records.js failed');
  }

  const payload = loadKnowledgeRecordsPayload();
  const withSources = payload.records.filter(
    (row) => row.origin && Array.isArray(row.origin.sources) && row.origin.sources.length > 0,
  ).length;
  const withNotes = payload.records.filter(
    (row) => row.origin && row.origin.notes != null && String(row.origin.notes).trim(),
  ).length;
  const emptySources = payload.records.filter(
    (row) => row.origin && Array.isArray(row.origin.sources) && row.origin.sources.length === 0,
  ).length;

  console.log('Phase 6C origin provenance backfill complete.');
  console.log('  Research entries added/updated:', addedToResearch);
  console.log('  Research entries skipped (already sourced):', skipped);
  console.log('  Total research entries:', researchEntries.length);
  console.log('  Origin records with sources:', withSources);
  console.log('  Origin records with notes:', withNotes);
  console.log('  Origin records with empty sources:', emptySources);
}

main();
