#!/usr/bin/env node
/**
 * scripts/build/build-canonical-entities.js — Phase 3A Canonical Build Script.
 *
 * Iterates every name in data/names.json, assembles one canonical Name
 * Entity per name via lib/canonical/entity-builder.js, validates each
 * against schemas/name-entity.schema.json, and writes the full set to
 * data/canonical/names.json.
 *
 * ADDITIVE ONLY: this script never reads from or writes to any existing
 * generator, dataset, HTML file, or build output. It writes to exactly one
 * new path (data/canonical/names.json) plus two audit reports. Nothing in
 * production consumes data/canonical/names.json yet.
 *
 * Usage: node scripts/build/build-canonical-entities.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const loaders = require(path.join(ROOT, 'lib', 'canonical', 'loaders.js'));
const { buildAllEntities, DOMAIN_BUILDERS } = require(path.join(ROOT, 'lib', 'canonical', 'entity-builder.js'));
const { validateEntity } = require(path.join(ROOT, 'lib', 'canonical', 'schema-check.js'));

const SCHEMA = require(path.join(ROOT, 'schemas', 'name-entity.schema.json'));
const OUT_PATH = path.join(ROOT, 'data', 'canonical', 'names.json');
const AUDIT_DIR = path.join(ROOT, 'audit');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function bytesToHuman(bytes) {
  if (bytes < 1024) return bytes + ' B';
  const units = ['KB', 'MB', 'GB'];
  let val = bytes;
  let u = -1;
  do { val /= 1024; u += 1; } while (val >= 1024 && u < units.length - 1);
  return val.toFixed(2) + ' ' + units[u];
}

function fileSizeOf(absPath) {
  try { return fs.statSync(absPath).size; } catch (e) { return 0; }
}

function run() {
  console.log('Phase 3A — Canonical Entity Builder');
  const buildTimestamp = new Date().toISOString();

  // --- Load datasets (timed) ---
  const loadStart = process.hrtime.bigint();
  const ctx = loaders.loadAll();
  const loadEnd = process.hrtime.bigint();
  const loadTimeMs = Number(loadEnd - loadStart) / 1e6;
  console.log(`Loaded ${ctx.names.length} names + supporting datasets in ${loadTimeMs.toFixed(1)}ms`);

  // --- Build entities (timed) ---
  const memBefore = process.memoryUsage().heapUsed;
  const buildStart = process.hrtime.bigint();
  const entities = buildAllEntities(ctx, buildTimestamp);
  const buildEnd = process.hrtime.bigint();
  const memAfter = process.memoryUsage().heapUsed;
  const buildTimeMs = Number(buildEnd - buildStart) / 1e6;
  console.log(`Built ${entities.length} canonical entities in ${buildTimeMs.toFixed(1)}ms (${(buildTimeMs / entities.length).toFixed(3)}ms/entity avg)`);

  // --- Validate each entity against the schema (fast inline pass; the full
  // audit pass lives in scripts/build/validate-canonical.js) ---
  const validationStart = process.hrtime.bigint();
  let validCount = 0;
  const invalidSamples = [];
  entities.forEach((e, i) => {
    const result = validateEntity(e, SCHEMA);
    if (result.valid) validCount += 1;
    else if (invalidSamples.length < 10) invalidSamples.push({ index: i, id: e.identity ? e.identity.id : null, errors: result.errors });
  });
  const validationEnd = process.hrtime.bigint();
  const validationTimeMs = Number(validationEnd - validationStart) / 1e6;
  console.log(`Schema-validated ${entities.length} entities in ${validationTimeMs.toFixed(1)}ms: ${validCount} valid, ${entities.length - validCount} invalid`);

  if (validCount !== entities.length) {
    console.error('ERROR: not all entities are schema-valid. Sample failures:');
    console.error(JSON.stringify(invalidSamples, null, 2));
    process.exit(1);
  }

  // --- Duplicate identifier check (fail-fast; also re-verified independently in validate-canonical.js) ---
  const ids = entities.map((e) => e.identity.id);
  const slugs = entities.map((e) => e.identity.slug);
  const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i);
  const dupSlugs = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  if (dupIds.length || dupSlugs.length) {
    console.error('ERROR: duplicate identifiers found.', { dupIds, dupSlugs });
    process.exit(1);
  }

  // --- Write output (the one new file this script produces) ---
  ensureDir(path.dirname(OUT_PATH));
  const writeStart = process.hrtime.bigint();
  fs.writeFileSync(OUT_PATH, JSON.stringify(entities, null, 2) + '\n', 'utf8');
  const writeEnd = process.hrtime.bigint();
  const writeTimeMs = Number(writeEnd - writeStart) / 1e6;
  console.log(`Wrote ${entities.length} entities to data/canonical/names.json in ${writeTimeMs.toFixed(1)}ms`);

  // --- Build statistics ---
  const domainNames = DOMAIN_BUILDERS.map(([name]) => name).concat(['metadata']);
  const populatedCounts = {};
  const nullCounts = {};
  domainNames.forEach((d) => { populatedCounts[d] = 0; nullCounts[d] = 0; });
  entities.forEach((e) => {
    domainNames.forEach((d) => {
      if (e[d] === null) nullCounts[d] += 1;
      else populatedCounts[d] += 1;
    });
  });

  const provenanceMap = {};
  function collectProvenance(schemaNode, prefix) {
    if (!schemaNode || !schemaNode.properties) return;
    for (const [domainKey, domainSchema] of Object.entries(schemaNode.properties)) {
      if (!domainSchema.properties) continue;
      for (const [leafKey, leafSchema] of Object.entries(domainSchema.properties)) {
        if (leafSchema['x-provenance']) provenanceMap[`${domainKey}.${leafKey}`] = leafSchema['x-provenance'];
      }
    }
  }
  collectProvenance(SCHEMA, '');
  const provenanceCounts = { researched: 0, computed: 0 };
  Object.values(provenanceMap).forEach((p) => { if (provenanceCounts[p] != null) provenanceCounts[p] += 1; });

  const buildReport = {
    generatedAt: buildTimestamp,
    readOnly: false,
    additiveOnly: true,
    note: 'This script writes exactly one new file outside of /audit/ (data/canonical/names.json). No existing dataset, generator, or HTML file is read for writing, or modified.',
    entitiesBuilt: entities.length,
    schemaValidEntities: validCount,
    outputPath: 'data/canonical/names.json',
    outputSizeBytes: fileSizeOf(OUT_PATH),
    outputSizeHuman: bytesToHuman(fileSizeOf(OUT_PATH)),
    timings: {
      datasetLoadMs: Number(loadTimeMs.toFixed(2)),
      entityAssemblyMs: Number(buildTimeMs.toFixed(2)),
      assemblyMsPerEntity: Number((buildTimeMs / entities.length).toFixed(4)),
      schemaValidationMs: Number(validationTimeMs.toFixed(2)),
      fileWriteMs: Number(writeTimeMs.toFixed(2)),
      totalMs: Number((loadTimeMs + buildTimeMs + validationTimeMs + writeTimeMs).toFixed(2)),
    },
    populatedDomainCounts: populatedCounts,
    nullDomainCounts: nullCounts,
    provenanceFieldCounts: provenanceCounts,
    computedVsResearchedNote: `${provenanceCounts.computed} leaf fields are x-provenance:computed (no possible missing-data state), ${provenanceCounts.researched} are x-provenance:researched (can be legitimately null) — counted directly from schemas/name-entity.schema.json's own annotations, not estimated.`,
    validationSummary: { allEntitiesSchemaValid: validCount === entities.length, duplicateIds: dupIds.length, duplicateSlugs: dupSlugs.length },
  };
  ensureDir(AUDIT_DIR);
  fs.writeFileSync(path.join(AUDIT_DIR, 'canonical-build-report.json'), JSON.stringify(buildReport, null, 2) + '\n', 'utf8');
  console.log('Wrote audit/canonical-build-report.json');

  const performanceReport = {
    generatedAt: buildTimestamp,
    readOnly: true,
    measurementMethod: 'process.hrtime.bigint() around each phase; process.memoryUsage().heapUsed sampled immediately before and after entity assembly. Single-run measurement, not averaged across multiple runs — see limitations in docs/CANONICAL_BUILDER.md.',
    datasetSizes: {
      'data/names.json': ctx.names.length + ' rows',
      'data/names-enriched.json': ctx.namesEnriched.rows.length + ' rows',
      'data/normalized-names.json': ctx.normalizedNames.rows.length + ' rows',
      'data/categories.json': ctx.categories.rows.length + ' rows',
      'data/variants.json': ctx.variants.rows.length + ' rows',
      'data/popularity.json': ctx.popularity.rows.length + ' rows',
      'data/name-equivalents.json': Object.keys(ctx.nameEquivalents).length + ' anchors',
      'data/country-differentials.json': ctx.countryDifferentials.entries.length + ' entries',
      'data/countries.json': ctx.countries.length + ' rows',
      'build/topic-clusters.json': Object.keys(ctx.topicClusters.byName).length + ' names',
    },
    timings: buildReport.timings,
    memory: {
      heapUsedBeforeAssemblyBytes: memBefore,
      heapUsedAfterAssemblyBytes: memAfter,
      heapUsedAfterAssemblyHuman: bytesToHuman(memAfter),
      deltaDuringAssemblyBytes: memAfter - memBefore,
      deltaDuringAssemblyHuman: bytesToHuman(Math.max(memAfter - memBefore, 0)),
    },
    outputSize: { bytes: fileSizeOf(OUT_PATH), human: bytesToHuman(fileSizeOf(OUT_PATH)) },
  };
  fs.writeFileSync(path.join(AUDIT_DIR, 'canonical-performance.json'), JSON.stringify(performanceReport, null, 2) + '\n', 'utf8');
  console.log('Wrote audit/canonical-performance.json');

  console.log('\n✓ Canonical build complete. data/canonical/names.json is additive — no existing file was read for writing, or modified.');
}

run();
