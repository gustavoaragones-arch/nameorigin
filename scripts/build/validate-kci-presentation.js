#!/usr/bin/env node
/**
 * Phase 11A — Validate KCI presentation layer.
 */

const fs = require('fs');
const path = require('path');
const { loadLegacyCollection } = require('../../lib/adapters/legacy-dataset-runtime.js');
const {
  createKciPresentationContext,
  buildExplainabilityForName,
  loadJson,
  PRESENTATION_PATHS,
} = require('../../lib/presentation/kci-explainability.js');
const { renderKciExplainabilitySection } = require('../../lib/presentation/kci-explainability-html.js');

const ROOT = path.join(__dirname, '..', '..');

function slug(str) {
  return String(str).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function collectInternalIds(ctx) {
  const ids = new Set();
  for (const row of ctx.citationTitleIndex.keys()) ids.add(row);
  const registry = loadJson(PRESENTATION_PATHS.citationRegistry, { citations: [] });
  for (const row of registry.citations || []) ids.add(row.id);
  const popularityRegistry = loadJson(path.join(ROOT, 'data', 'popularity-registry.json'), { sources: [] });
  for (const row of popularityRegistry.sources || []) ids.add(row.id);
  const popularityRecords = loadJson(PRESENTATION_PATHS.popularityRecords, { records: [] });
  for (const record of popularityRecords.records || []) {
    for (const sourceId of record.popularity?.sources || []) ids.add(sourceId);
    for (const region of Object.values(record.popularity?.regions || {})) {
      if (region.sourceId) ids.add(region.sourceId);
    }
  }
  return ids;
}

function validateNoInternalIds(html, internalIds) {
  const leaks = [];
  for (const id of internalIds) {
    if (html.includes(id)) leaks.push(id);
  }
  return leaks;
}

function validateDeterministicPresentation(names, ctx) {
  const first = names[0];
  const nameSlug = slug(first.name);
  const modelA = buildExplainabilityForName(first.name, nameSlug, ctx);
  const htmlA = renderKciExplainabilitySection(modelA);
  const modelB = buildExplainabilityForName(first.name, nameSlug, ctx);
  const htmlB = renderKciExplainabilitySection(modelB);
  if (htmlA !== htmlB) {
    return ['Deterministic presentation produced different HTML for the same entity.'];
  }
  return [];
}

function main() {
  const ctx = createKciPresentationContext();
  const names = loadLegacyCollection('namesEnriched');
  const internalIds = collectInternalIds(ctx);
  const errors = [];
  let renderedPages = 0;
  let citationRendered = 0;
  let popularityRendered = 0;
  let missingCitationHandled = 0;
  let missingPopularityHandled = 0;
  let unresolvedHandled = 0;

  for (const record of names) {
    const nameSlug = slug(record.name);
    const model = buildExplainabilityForName(record.name, nameSlug, ctx);
    const html = renderKciExplainabilitySection(model);

    if (!html || !html.includes('kci-explainability')) {
      errors.push(`Missing KCI section for ${record.name}.`);
      continue;
    }

    renderedPages += 1;
    if (model.components.citation.available) citationRendered += 1;
    else if (html.includes('No citation data is currently available.')) missingCitationHandled += 1;

    if (model.components.popularity.available) popularityRendered += 1;
    else if (html.includes('No popularity data is currently available.')) missingPopularityHandled += 1;

    if (record.name === 'Aakriti') {
      if (model.components.popularity.score !== 0) {
        errors.push('Aakriti unresolved popularity authority must score zero in presentation.');
      }
      if (!html.includes('No popularity data is currently available.')) {
        errors.push('Aakriti must display missing popularity explanation.');
      } else {
        unresolvedHandled += 1;
      }
    }

    const leaks = validateNoInternalIds(html, internalIds);
    if (leaks.length) {
      errors.push(`${record.name} exposed internal IDs: ${leaks.slice(0, 3).join(', ')}`);
    }

    if (html.match(/\b(origin|meaning|pronunciation|etymology|history|variants|citations|popularity):\s*\d+/)) {
      errors.push(`${record.name} may expose internal KCI weight keys.`);
    }
  }

  errors.push(...validateDeterministicPresentation(names, ctx));

  console.log('KCI presentation validation:', errors.length === 0 ? 'PASS' : 'FAIL');
  console.log('  Pages rendered:', renderedPages);
  console.log('  Citation sections with data:', citationRendered);
  console.log('  Popularity sections with data:', popularityRendered);
  console.log('  Missing citation handled:', missingCitationHandled);
  console.log('  Missing popularity handled:', missingPopularityHandled);

  if (errors.length) {
    errors.slice(0, 20).forEach((msg) => console.error('  -', msg));
    process.exitCode = 1;
    throw new Error('KCI presentation validation failed.');
  }
}

main();
