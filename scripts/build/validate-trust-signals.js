#!/usr/bin/env node
/**
 * Phase 12A — Validate trust signal presentation.
 */

const fs = require('fs');
const path = require('path');
const { createTrustSignalsContext, buildTrustPageModel } = require('../../lib/presentation/trust-signals.js');
const { renderTrustPageBody } = require('../../lib/presentation/trust-signals-html.js');
const { loadJson } = require('../../lib/presentation/kci-explainability.js');
const { buildCitationRegistryIndex } = require('../../lib/presentation/citation-presentation.js');

const ROOT = path.join(__dirname, '..', '..');
const TRUST_PAGES = ['methodology', 'editorial-policy', 'architecture', 'quality-assurance'];

function collectInternalIds() {
  const ids = new Set();
  const citationRegistry = loadJson(path.join(ROOT, 'data', 'citation-registry.json'), { citations: [] });
  for (const id of buildCitationRegistryIndex(citationRegistry).keys()) ids.add(id);
  const popularityRegistry = loadJson(path.join(ROOT, 'data', 'popularity-registry.json'), { sources: [] });
  for (const row of popularityRegistry.sources || []) ids.add(row.id);
  return ids;
}

function containsSemanticHash(text) {
  return /\b[a-f0-9]{64}\b/i.test(text);
}

function main() {
  const ctx = createTrustSignalsContext();
  const internalIds = collectInternalIds();
  const errors = [];
  const renderedPages = [];

  for (const pageKey of TRUST_PAGES) {
    const model = buildTrustPageModel(pageKey, ctx);
    const htmlA = renderTrustPageBody(model);
    const htmlB = renderTrustPageBody(model);
    if (htmlA !== htmlB) {
      errors.push(`Deterministic rendering failed for ${pageKey}.`);
    }

    const outPath = path.join(ROOT, 'about', pageKey, 'index.html');
    if (!fs.existsSync(outPath)) {
      errors.push(`Missing generated page: about/${pageKey}/index.html`);
      continue;
    }
    const fileHtml = fs.readFileSync(outPath, 'utf8');
    renderedPages.push(pageKey);

    for (const id of internalIds) {
      if (fileHtml.includes(id)) errors.push(`${pageKey} exposes internal ID: ${id}`);
    }
    if (containsSemanticHash(fileHtml)) errors.push(`${pageKey} exposes semantic hash.`);
    if (!fileHtml.includes('trust-badge')) errors.push(`${pageKey} missing validation badges.`);
    if (!fileHtml.includes('Architecture Versions') && pageKey === 'architecture') {
      errors.push('Architecture page missing version table.');
    }
  }

  const milestones = ctx.architectureMilestones;
  const milestoneKeys = milestones.map((row) => row.key || row.name);
  if (new Set(milestoneKeys).size !== milestoneKeys.length) {
    errors.push('Duplicate architecture milestone keys detected.');
  }

  console.log('Trust signals validation:', errors.length === 0 ? 'PASS' : 'FAIL');
  console.log('  Trust pages rendered:', renderedPages.length);
  console.log('  Architecture milestones:', milestones.length);

  if (errors.length) {
    errors.slice(0, 20).forEach((msg) => console.error('  -', msg));
    process.exitCode = 1;
    throw new Error('Trust signals validation failed.');
  }
}

main();
